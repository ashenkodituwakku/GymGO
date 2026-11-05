import { expect, test } from '@playwright/test';
import { openFilters } from './helpers';

/**
 * The core journey, at every viewport the product claims to support.
 *
 * The reference task from the brief: find a gym near Surry Hills with a squat
 * rack, cable station and dumbbells to at least 40 kg, admitting a visitor at
 * 7pm for under A$30.
 */

const REFERENCE =
  '/search?q=Surry+Hills&budget=30&date=2026-09-23&time=19%3A00&eq=squat_rack&eq=cable_station&eq=dumbbells&db=40&r=5';

test.describe('search', () => {
  test('a new visitor can search without an account or location permission', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Find a gym');
    // No sign-in wall, no location prompt on load.
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();

    await page.getByLabel('Suburb or postcode').fill('Surry Hills');
    await page.getByRole('button', { name: 'Search gyms' }).click();

    await expect(page).toHaveURL(/\/search\?q=Surry\+Hills/);
    await expect(page.getByRole('heading', { name: /Gyms near Surry Hills/ })).toBeVisible();
  });

  test('the reference task produces confirmed matches with the reasons shown', async ({ page }) => {
    await page.goto(REFERENCE);

    const confirmed = page.getByRole('heading', { name: /^Confirmed match/ });
    await expect(confirmed).toBeVisible();

    // The clean match leads.
    await expect(page.getByRole('link', { name: /Ironbark Strength Co/ }).first()).toBeVisible();

    // Its price is the total you do not get back.
    await expect(page.getByText('A$24').first()).toBeVisible();
  });

  test('a 24-hour member gym with daytime guest entry does not match a 7pm visit', async ({ page }) => {
    await page.goto(REFERENCE);

    const keystone = page.locator('article.card', { hasText: 'Keystone Fitness' });
    await expect(keystone).toBeVisible();
    await expect(keystone.getByText('Does not match')).toBeVisible();
    await expect(keystone.getByText('Visitors are not admitted at the time you asked about')).toBeVisible();
  });

  test('a refundable deposit is shown apart from the visit cost', async ({ page }) => {
    await page.goto(REFERENCE);

    const quarry = page.locator('article.card', { hasText: 'Quarry Lane Barbell' });
    await expect(quarry.getByText('A$25')).toBeVisible();
    await expect(quarry.getByText('A$45 needed on the day')).toBeVisible();
  });

  test('an unknown mandatory fee prevents a confirmed total', async ({ page }) => {
    await page.goto(REFERENCE);

    const tallow = page.locator('article.card', { hasText: 'Tallow Street Gym' });
    // The price headline and the reason both say it; either is enough.
    await expect(tallow.getByText('Total not confirmed').first()).toBeVisible();
    await expect(
      tallow.getByText(/access card fee applies but its amount is not confirmed/i),
    ).toBeVisible();
  });

  test('changing a filter updates the results and back restores the previous search', async ({ page }) => {
    await page.goto(REFERENCE);
    const counts = page.getByText(/confirmed matches?/).first();
    // Read the count rather than hard-coding it: other tests contribute data
    // to the same store, and this test is about the filter, not the dataset.
    const before = await counts.textContent();
    expect(before).not.toContain('0 confirmed');

    // Tightening the budget must change what is confirmed.
    await openFilters(page);
    await page.getByLabel('Visit budget (A$)').fill('15');
    await expect(page).toHaveURL(/budget=15/);
    await expect(counts).toContainText('0 confirmed matches');

    await page.goBack();
    await expect(page).toHaveURL(/budget=30/);
    await expect(counts).toHaveText(before ?? '');
    // The control must show the search that is actually running.
    await expect(page.getByLabel('Visit budget (A$)')).toHaveValue('30');
  });

  test('an impossible search explains itself and offers relaxations without applying them', async ({ page }) => {
    // A budget no gym in the dataset can meet.
    await page.goto('/search?q=Surry+Hills&budget=5&date=2026-09-23&time=19%3A00&r=5');

    await expect(
      page.getByRole('heading', { name: /Nothing matches everything you asked for/ }),
    ).toBeVisible();
    await expect(page.getByText('We have not removed any of your filters')).toBeVisible();

    // The budget is still 5: nothing was silently relaxed.
    await expect(page.getByLabel('Visit budget (A$)')).toHaveValue('5');
  });

  test('a place outside the pilot area says so rather than pretending', async ({ page }) => {
    await page.goto('/search?q=Perth');
    await expect(page.getByText(/We do not cover .Perth. yet/)).toBeVisible();
  });

  test('the map slot is honest about having no tile provider', async ({ page }, testInfo) => {
    await page.goto(
      testInfo.project.name === 'desktop-1440' ? REFERENCE : `${REFERENCE}&view=map`,
    );
    await expect(page.getByText('Map tiles are not configured')).toBeVisible();
    // And the list remains the full alternative.
    await expect(page.getByText(/results are listed beside this panel|Nothing to plot/)).toBeVisible();
  });
});
