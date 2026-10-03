import { expect, test } from '@playwright/test';
import { openFilters } from './helpers';

const REFERENCE =
  '/search?q=Surry+Hills&budget=30&date=2026-09-23&time=19%3A00&eq=squat_rack&r=5';

/**
 * Layout and keyboard checks at each viewport.
 *
 * These test the rendered product rather than the source: no horizontal
 * scroll at 390 px, touch targets large enough to hit, a skip link that works,
 * and a keyboard path from the top of the page into the results.
 */
test.describe('layout and keyboard', () => {
  test('does not scroll horizontally', async ({ page }, testInfo) => {
    for (const path of ['/', REFERENCE, '/gym/ironbark-strength-surry-hills', '/compare?ids=ironbark-strength-surry-hills']) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${path} at ${testInfo.project.name}`).toBeLessThanOrEqual(1);
    }
  });

  test('the skip link moves focus to the main content', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');

    const skip = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skip).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main$/);
  });

  test('the search form is operable by keyboard alone', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Suburb or postcode').focus();
    await page.keyboard.type('Newtown');
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/search\?q=Newtown/);
    await expect(page.getByRole('heading', { name: /Gyms near Newtown/ })).toBeVisible();
  });

  test('equipment filter chips are reachable and toggleable by keyboard', async ({ page }) => {
    await page.goto(REFERENCE);
    // On phones the panel is collapsed; opening it must itself work from the
    // keyboard, so this path never touches the mouse.
    await openFilters(page, 'keyboard');

    const chip = page.getByRole('checkbox', { name: 'Cable station' });
    await chip.focus();
    await expect(chip).toBeFocused();
    await page.keyboard.press('Space');

    await expect(page).toHaveURL(/eq=cable_station/);
  });

  test('on phones, results come before the filter controls', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone-390', 'phone layout only');
    await page.goto(REFERENCE);

    const toggle = page.locator('.filters__toggle');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    // The collapsed summary says what the search is, so nothing is hidden
    // without a trace.
    await expect(toggle).toContainText('Surry Hills');
    await expect(toggle).toContainText('A$30');

    // The first result is on the first screen, not below the controls.
    const firstCard = page.locator('article.card').first();
    const box = await firstCard.boundingBox();
    expect(box?.y ?? Infinity).toBeLessThan(844);
  });

  test('every interactive control has an accessible name', async ({ page }) => {
    await page.goto(REFERENCE);

    const unnamed = await page.evaluate(() => {
      const nodes = Array.from(
        document.querySelectorAll('main button, main a[href], main select, main input:not([type=hidden])'),
      );
      return nodes
        .filter((node) => {
          const element = node as HTMLElement;
          if (element.offsetParent === null && element.getAttribute('type') !== 'checkbox') return false;
          const label =
            element.getAttribute('aria-label') ??
            (element.getAttribute('id')
              ? document.querySelector(`label[for="${element.getAttribute('id')}"]`)?.textContent
              : null) ??
            element.closest('label')?.textContent ??
            element.textContent;
          return !label || label.trim() === '';
        })
        .map((node) => (node as HTMLElement).outerHTML.slice(0, 120));
    });

    expect(unnamed).toEqual([]);
  });

  test('touch targets on the results page are at least 34 px tall', async ({ page }) => {
    await page.goto(REFERENCE);

    const buttons = page.locator('main .button, main .chip span, main button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);

    for (let index = 0; index < Math.min(count, 25); index += 1) {
      const box = await buttons.nth(index).boundingBox();
      if (box === null) continue;
      expect(box.height).toBeGreaterThanOrEqual(33);
    }
  });

  test('phones get a list/map switch; the wide layout shows both at once', async ({ page }, testInfo) => {
    await page.goto(REFERENCE);
    const isWide = testInfo.project.name === 'desktop-1440';
    const listLink = page.getByRole('group', { name: 'Choose list or map' }).getByRole('link', { name: 'List' });

    if (isWide) {
      await expect(listLink).toBeHidden();
      await expect(page.getByText('Map tiles are not configured')).toBeVisible();
      await expect(page.getByRole('heading', { name: /Confirmed match|Needs confirmation/ }).first()).toBeVisible();
    } else {
      await expect(listLink).toBeVisible();
      await expect(page.getByText('Map tiles are not configured')).toBeHidden();
    }
  });
});
