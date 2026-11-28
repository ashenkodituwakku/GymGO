#!/usr/bin/env node
/**
 * The footage for GymGO's shorts: screenshots of the real, full app at phone
 * size (390 x 844, three times over), and where each tap lands, for
 * src/script.ts. Nothing is drawn or edited: every frame of app in a short is
 * one of these.
 *
 * Needs the app running in a browser with its server (the usual development
 * setup: `pnpm app`, or the server plus `expo start --web`), and a signed-in
 * session for an account with some training in it (the local test account).
 *
 *   GYMGO_TOKEN=<session token> node capture.cjs [http://localhost:8081]
 *
 * The token is the value the app keeps in localStorage as gymgo.session.v1.
 * It isn't written anywhere. Writes public/shots/*.png and public/shots/taps.json.
 * It logs a workout to that account (the one the second short builds).
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE = (process.argv[2] || 'http://localhost:8081').replace(/\/+$/, '');
const TOKEN = process.env.GYMGO_TOKEN;
if (!TOKEN) {
  console.error('Set GYMGO_TOKEN to a signed-in session token (see the comment at the top).');
  process.exit(2);
}
const OUT = path.join(__dirname, 'public', 'shots');
fs.mkdirSync(OUT, { recursive: true });

/** The gym the first short opens: independent, no logo, with a visit price on its own website. */
const GYM = 'prime-athletica-fitzroy';
/** A collected gym for the card shot: independent, no logo. */
const CARD = '101fitness-melbourne';

const taps = {};

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    colorScheme: 'light',
    reducedMotion: 'reduce',
  });
  await context.addInitScript((token) => {
    localStorage.setItem('gymgo.session.v1', token);
    localStorage.setItem('gymgo.prefs.v1', JSON.stringify({ haptics: true, demo: false, country: 'AU' }));
    localStorage.setItem('gymgo.location-asked.v1', 'true');
    // Light, and GymPal's tab out of the way: it isn't in these shorts.
    localStorage.setItem('gymgo.theme.v1', JSON.stringify({ appearance: 'light', gymPalButton: 'hidden' }));
  }, TOKEN);
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', (error) => problems.push(error.message));

  const shot = async (name) => {
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, `${name}.png`) });
    console.log('  shot', name);
  };
  /** Remember where a tap lands (in the 390 x 844 screen), then tap it. */
  const tap = async (name, locator) => {
    await locator.waitFor({ state: 'visible', timeout: 20000 });
    const box = await locator.boundingBox();
    if (box) taps[name] = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
    await locator.click();
  };
  /**
   * Tap a muscle on the body figures as a finger would: on the muscle itself (the middle of
   * its outline can be the gap between two, the chest's say), and on whichever figure shows
   * most of it (triceps on the back).
   */
  const tapMuscle = async (name) => {
    const point = await page.evaluate((label) => {
      let best = null;
      for (const group of document.querySelectorAll(`[aria-label="${label}"]`)) {
        const box = group.getBoundingClientRect();
        const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
        let hits = 0, nearest = null;
        for (let gx = 0; gx <= 12; gx++) for (let gy = 0; gy <= 12; gy++) {
          const x = box.x + (box.width * gx) / 12, y = box.y + (box.height * gy) / 12;
          const hit = document.elementFromPoint(x, y);
          if (hit && hit.closest(`[aria-label="${label}"]`) === group) {
            hits += 1;
            const d = Math.hypot(x - cx, y - cy);
            if (!nearest || d < nearest.d) nearest = { x, y, d };
          }
        }
        if (nearest && (!best || hits > best.hits)) best = { x: nearest.x, y: nearest.y, hits };
      }
      return best;
    }, name);
    if (!point) throw new Error(`No ${name} on the figures`);
    const key = `build-${name.toLowerCase()}`;
    taps[key] = { x: Math.round(point.x), y: Math.round(point.y) };
    await page.mouse.click(point.x, point.y);
    await page.waitForTimeout(500);
    const picked = await page.evaluate((label) => [...document.querySelectorAll(`[aria-label="${label}"]`)].some((el) => el.getAttribute('aria-pressed') === 'true'), name);
    if (!picked) throw new Error(`Tapping ${name} didn't pick it`);
  };
  /** The page's own scroll view, scrolled so `locator` sits `top` points from the top. */
  const scrollTo = async (locator, top = 110) => {
    await locator.first().evaluate((el, top) => {
      let box = el.parentElement;
      while (box && !(box.scrollHeight > box.clientHeight + 20 && /(auto|scroll)/.test(getComputedStyle(box).overflowY))) box = box.parentElement;
      if (!box) return;
      box.scrollTop += el.getBoundingClientRect().top - box.getBoundingClientRect().top - top;
    }, top);
    await page.waitForTimeout(700);
  };
  const go = async (route, wait = 5000) => {
    await page.goto(BASE + route);
    await page.waitForTimeout(wait);
  };

  // --- 1. Find a gym you can walk into -------------------------------------------
  console.log('Short 1: finding a gym');
  await go('/explore', 9000);
  await shot('find-map');
  const search = page.getByPlaceholder('Suburb, city or gym').first();
  await tap('find-typed', search);
  await search.fill('Fitzroy');
  // Not shot: the suggestions list chains' logos, and no gym is in these shorts by its brand.
  await search.press('Enter');
  await page.waitForTimeout(4500);
  await shot('find-results');
  await go(`/gym/${GYM}`, 6000);
  await shot('find-gym');
  await scrollTo(page.getByText('When you call, ask', { exact: true }), 470);
  await shot('find-call');
  await scrollTo(page.getByText('Prices', { exact: true }), 150);
  await shot('find-rows');
  await tap('find-prices', page.getByRole('button', { name: /^Prices/ }).first());
  await page.waitForTimeout(1500);
  await scrollTo(page.getByText('Prices', { exact: true }), 96);
  await shot('find-prices');

  // --- 2. Build a workout, log it ------------------------------------------------
  console.log('Short 2: building and logging a workout');
  await page.evaluate(() => localStorage.removeItem('gymgo.training.active.v1'));
  await go('/workout/any', 5000);
  await shot('build-picker');
  await tapMuscle('Chest');
  await shot('build-chest');
  await tapMuscle('Triceps');
  await shot('build-triceps');
  const build = page.getByRole('button', { name: 'Build my workout' });
  await scrollTo(build, 520);
  await shot('build-options');
  await tap('build-go', build);
  await page.waitForTimeout(5500);
  await shot('build-plan');
  await tap('build-start', page.getByRole('button', { name: /^Start workout/ }).first());
  await page.waitForTimeout(4000);
  await shot('log-start');
  const weight = page.locator('input[aria-label$="set 1 weight in kg"]').first();
  await tap('log-weight', weight);
  await weight.fill('20');
  const reps = page.locator('input[aria-label$="set 1 reps"]').first();
  await reps.click();
  await reps.fill('10');
  await page.locator('body').click({ position: { x: 5, y: 300 } }).catch(() => {});
  await shot('log-typed');
  await tap('log-tick', page.getByRole('checkbox', { name: /set 1 done$/ }).first());
  await page.waitForTimeout(1500);
  await shot('log-ticked');
  const finish = page.getByRole('button', { name: /Finish workout/ }).first();
  await finish.scrollIntoViewIfNeeded();
  await finish.click();
  await page.waitForTimeout(1200);
  const anyway = page.getByRole('button', { name: /Finish anyway/ }).first();
  if (await anyway.count()) await anyway.click();
  await page.waitForTimeout(5000);
  await shot('log-done');

  // --- 3. Progress, recovery, collection -----------------------------------------
  console.log('Short 3: progress and collection');
  await go('/', 5000);
  await shot('home');
  await go('/progress', 5000);
  await shot('progress');
  await scrollTo(page.getByText('Recovery map', { exact: true }), 96);
  await shot('recovery');
  await go('/progress/bench-press', 5000);
  await scrollTo(page.getByText('Estimated 1-rep max', { exact: true }), 330);
  await shot('chart');
  await go('/collection', 5000);
  await shot('collection');
  await go(`/card/${CARD}`, 5000);
  await shot('card');

  fs.writeFileSync(path.join(OUT, 'taps.json'), JSON.stringify(taps, null, 2) + '\n');
  console.log(problems.length ? `Page errors: ${problems.join(' | ')}` : 'No page errors.');
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
