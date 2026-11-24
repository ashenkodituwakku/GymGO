#!/usr/bin/env node
/**
 * The footage for GymGO's launch ads: screenshots of the real app at phone
 * size (390 x 844, three times over), where each tap lands, and where the
 * parts the ads enlarge sit on screen, for src/ads.ts. Nothing is drawn or
 * edited: every frame of app in an ad is one of these.
 *
 * Needs the app and its server running locally (`pnpm app`) and a session for
 * a FREE local test account with sample training in it (seed.mjs), so every
 * screen is what a new member sees, not Pro and not the dev account.
 *
 *   GYMGO_TOKEN=<session token> node capture.cjs [http://localhost:8081] [--only=walkin,build,collect,montage]
 *
 * The token is the value the app keeps in localStorage as gymgo.session.v1.
 * It isn't written anywhere. Writes public/shots/*.png and public/shots/marks.json.
 * It logs one workout and collects one gym in that account.
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const BASE = (args.find((arg) => !arg.startsWith('--')) || 'http://localhost:8081').replace(/\/+$/, '');
/** --only=walkin,build,collect,montage shoots just those parts (the marks of the rest are kept). */
const only = (args.find((arg) => arg.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const wanted = (part) => only.length === 0 || only.includes(part);
const TOKEN = process.env.GYMGO_TOKEN;
if (!TOKEN) {
  console.error('Set GYMGO_TOKEN to a signed-in session token (see the comment at the top).');
  process.exit(2);
}
const OUT = path.join(__dirname, 'public', 'shots');
fs.mkdirSync(OUT, { recursive: true });

/** Independent gyms with no logo. The first is opened in the walk-in ad. */
const GYM = 'prime-athletica-fitzroy';
/** Where the walk-in ad stands: Fitzroy, a street from GYM. */
const FITZROY = { latitude: -37.7985, longitude: 144.9782 };
/** Gyms the collect ad can check in at (the first not yet collected), each an independent with no chain logo. */
const CHECK_IN = ['quickfit-brunswick-east', 'fitness-xo-northcote', 'the-strong-zone-collingwood'];
/** Cards shown whole: the sample collection's Legendary foil and its Epic. */
const LEGENDARY = 'prime-athletica-fitzroy';
const EPIC = 'equilibrium-fitness-north-melbourne';

const MARKS = path.join(OUT, 'marks.json');
const marks = fs.existsSync(MARKS) && only.length ? JSON.parse(fs.readFileSync(MARKS, 'utf8')) : { taps: {}, boxes: {} };
/** Kept as it goes, so a run stopped part-way still leaves what it found. */
const save = () => fs.writeFileSync(MARKS, JSON.stringify(marks, null, 2) + '\n');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    colorScheme: 'light',
    reducedMotion: 'reduce',
    geolocation: FITZROY,
    permissions: ['geolocation'],
    timezoneId: 'Australia/Melbourne',
  });
  await context.addInitScript((token) => {
    localStorage.setItem('gymgo.session.v1', token);
    localStorage.setItem('gymgo.prefs.v1', JSON.stringify({ haptics: true, demo: false, country: 'AU' }));
    localStorage.setItem('gymgo.location-asked.v1', 'true');
    // Light, and GymPal's button out of the way: it isn't in these ads.
    localStorage.setItem('gymgo.theme.v1', JSON.stringify({ appearance: 'light', gymPalButton: 'hidden' }));
  }, TOKEN);
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', (error) => problems.push(error.message));

  const shot = async (name, wait = 400) => {
    await page.waitForTimeout(wait);
    await page.screenshot({ path: path.join(OUT, `${name}.png`) });
    console.log('  shot', name);
  };
  const boxOf = async (locator) => {
    const box = await locator.first().boundingBox();
    return box && { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.width), h: Math.round(box.height) };
  };
  /** Remember where something sits on the 390 x 844 screen, for a callout. */
  const mark = async (name, locator) => {
    const box = await boxOf(locator);
    if (!box) throw new Error(`Nothing to mark for ${name}`);
    marks.boxes[name] = box;
    save();
  };
  /** Remember where a tap lands (in the 390 x 844 screen), then tap it. */
  const tap = async (name, locator, options = {}) => {
    await locator.first().waitFor({ state: 'visible', timeout: 20000 });
    const box = await boxOf(locator);
    if (box) marks.taps[name] = { x: Math.round(box.x + box.w / 2), y: Math.round(box.y + box.h / 2) };
    save();
    await locator.first().click(options);
  };
  /** Tap a muscle on the body figures where a finger would: on the muscle itself, on the figure showing most of it. */
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
    marks.taps[`build-${name.toLowerCase()}`] = { x: Math.round(point.x), y: Math.round(point.y) };
    save();
    await page.mouse.click(point.x, point.y);
    await page.waitForTimeout(500);
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

  // --- 1. Walk in: gyms near you, a price with its source, what to ask ---------------
  if (wanted('walkin')) {
  console.log('Walk-in ad');
  await go('/explore', 10000);
  await shot('map');
  await mark('map-chips', page.getByRole('button', { name: /3 pm|Under A\$/ }).first().locator('xpath=..'));
  const search = page.getByPlaceholder('Suburb, city or gym').first();
  await tap('map-search', search);
  await search.fill('Fitzroy');
  // Not shot: the suggestions list chains' logos, and no gym is in these ads by its brand.
  await search.press('Enter');
  await page.waitForTimeout(5000);
  await shot('results');
  await go(`/gym/${GYM}`, 6000);
  await shot('gym');
  await scrollTo(page.getByText('When you call, ask', { exact: true }), 300);
  await mark('call', page.getByText('When you call, ask', { exact: true }).locator('xpath=../..'));
  await shot('call');
  await scrollTo(page.getByText('Prices', { exact: true }), 150);
  await shot('rows');
  await tap('prices', page.getByRole('button', { name: /^Prices/ }).first());
  await page.waitForTimeout(1500);
  await scrollTo(page.getByText('Prices', { exact: true }), 96);
  await mark('prices-box', page.getByText('Prices', { exact: true }).locator('xpath=../../..'));
  await shot('prices');
  }

  // --- 2. Build: tap muscles, get a plan, log a set, rest -----------------------------
  if (wanted('build')) {
  console.log('Build ad');
  if (!page.url().startsWith(BASE)) await go('/', 4000);
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
  await weight.fill('60');
  const reps = page.locator('input[aria-label$="set 1 reps"]').first();
  await reps.click();
  await reps.fill('8');
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
  }

  // --- 3. Collect: check in at a gym, get its card ------------------------------------
  if (wanted('collect')) {
  console.log('Collect ad');
  if (!page.url().startsWith(BASE)) await go('/', 4000);
  const collected = await page.evaluate(async (base) => {
    const token = localStorage.getItem('gymgo.session.v1');
    const response = await fetch(`${base}/_gymgo/api/collection`, { headers: { authorization: `Bearer ${token}` } });
    const body = await response.json();
    return (body.gyms || []).map((gym) => gym.id);
  }, BASE);
  const checkIn = CHECK_IN.find((id) => !collected.includes(id));
  if (!checkIn) throw new Error('Every check-in gym is already collected: reset the collection or add one to CHECK_IN');
  const position = await page.evaluate(async ({ base, id }) => {
    const token = localStorage.getItem('gymgo.session.v1');
    const response = await fetch(`${base}/_gymgo/api/gyms/${id}`, { headers: { authorization: `Bearer ${token}` } });
    const body = await response.json();
    return (body.gym || body).location.position;
  }, { base: BASE, id: checkIn });
  // Standing at the gym's door, as a member would be.
  await context.setGeolocation({ latitude: position.lat, longitude: position.lng });
  await go(`/gym/${checkIn}`, 6000);
  const here = page.getByRole('button', { name: /^I’m here$/ }).first();
  await scrollTo(here, 520);
  await mark('collect-card', page.getByText('Collect this gym', { exact: true }).locator('xpath=../../..'));
  await shot('collect-ready');
  await tap('collect-here', here);
  // The check takes about two seconds; shoot it as it goes, and keep the times.
  const burst = [];
  const t0 = Date.now();
  // Each frame's stage, read from the page just before and just after it's shot: still checking,
  // "You're at …", or the new card. A frame shot while the stage changed is "between", and left out.
  const stageNow = () =>
    page.evaluate(() => {
      const text = document.body.innerText;
      return /NEW CARD/i.test(text) ? 'card' : /You.re at /.test(text) ? 'here' : 'checking';
    });
  for (let i = 0; i < 40; i++) {
    const name = `collect-${String(i).padStart(2, '0')}`;
    const before = await stageNow();
    const ms = Date.now() - t0;
    await page.screenshot({ path: path.join(OUT, `${name}.png`) });
    const after = await stageNow();
    burst.push({ name, ms, stage: before === after ? before : 'between' });
    if (Date.now() - t0 > 6000) break;
  }
  // The card it pulled, for its sounds: "Uncommon card", then "Onyx · QuickFit".
  const pulled = await page.evaluate(() => {
    const found = document.body.innerText.match(/(Common|Uncommon|Rare|Epic|Legendary) card\s+([A-Z][a-z]+)/);
    return found ? { rarity: found[1].toLowerCase(), gem: found[2].toLowerCase() } : null;
  });
  if (!pulled) throw new Error('No new card showed after checking in');
  marks.pulled = pulled;
  marks.burst = burst;
  marks.checkIn = checkIn;
  save();
  await go('/collection', 5000);
  await shot('collection');
  await mark('collection-stats', page.getByText('Your collection', { exact: true }).locator('xpath=..'));
  const badges = page.getByText(/^badges/i).first();
  await scrollTo(badges, 96);
  await mark('badges', badges.locator('xpath=..'));
  await shot('collection-badges');
  // The cards themselves, rarest first.
  await scrollTo(page.getByText(/^your cards$/i).first(), 70);
  // The segmented control draws its labels twice (one for the sliding pill), so tap through.
  await tap('cards-rarest', page.getByText('Rarest', { exact: true }).first(), { force: true });
  await page.waitForTimeout(1200);
  await shot('cards');
  await go(`/card/${LEGENDARY}`, 5000);
  await shot('card-legendary');
  const legendary = await page.evaluate(() => document.body.innerText.match(/Legendary ([A-Z][a-z]+)( foil)?/));
  if (!legendary) throw new Error(`${LEGENDARY}'s card isn't Legendary: run seed.mjs first`);
  marks.legendary = { gem: legendary[1].toLowerCase(), foil: Boolean(legendary[2]) };
  save();
  await go(`/card/${EPIC}`, 5000);
  await shot('card-epic');
  }

  // --- 4. The rest of the launch montage -----------------------------------------------
  if (wanted('montage')) {
  console.log('Launch montage');
  await go('/', 6000);
  await shot('home');
  await go('/progress', 5000);
  await shot('progress');
  await go('/recap', 5000);
  await shot('week');
  }

  save();
  console.log(problems.length ? `Page errors: ${problems.join(' | ')}` : 'No page errors.');
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
