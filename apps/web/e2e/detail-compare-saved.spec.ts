import { expect, test } from '@playwright/test';

const REFERENCE =
  '/search?q=Surry+Hills&budget=30&date=2026-09-23&time=19%3A00&eq=squat_rack&eq=cable_station&eq=dumbbells&db=40&r=5';

test.describe('gym detail', () => {
  test('leads with cost, access and equipment, each showing its evidence', async ({ page }) => {
    await page.goto('/gym/quarry-lane-barbell-alexandria');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Quarry Lane Barbell');
    await expect(page.getByRole('heading', { name: 'What a visit costs' })).toBeVisible();
    await expect(page.getByText('A$45 needed on the day')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Getting in as a visitor' })).toBeVisible();

    // Evidence labelling is present, not implied.
    await expect(page.getByText('Checked by us').first()).toBeVisible();
    await expect(page.getByText(/Checked \d+ days? ago|Checked today|Checked yesterday/).first()).toBeVisible();
  });

  test('keeps member, staffed and visitor hours apart', async ({ page }) => {
    await page.goto('/gym/keystone-fitness-ultimo');

    await expect(page.getByRole('heading', { name: 'Member access' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Reception staffed' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Visitor entry' })).toBeVisible();
    await expect(page.getByText('Every day, 24 hours')).toBeVisible();
    await expect(page.getByText('This does not establish guest entry')).toBeVisible();
  });

  test('shows Needs confirmation when an induction is unresolved', async ({ page }) => {
    await page.goto('/gym/foundry-lane-erskineville?date=2026-09-23&time=19%3A00');

    await expect(page.getByText('Needs confirmation').first()).toBeVisible();
    await expect(page.getByText(/First-time visitors need an induction/)).toBeVisible();
  });

  test('does not offer a pool-only admission as a way onto the gym floor', async ({ page }) => {
    await page.goto('/gym/waterloo-aquatic-fitness');

    const pool = page.locator('.card', { hasText: 'Adult pool admission' });
    await expect(pool.getByText('No gym floor access')).toBeVisible();
  });

  test('surfaces a conflict instead of choosing a side', async ({ page }) => {
    await page.goto('/gym/vellum-strength-newtown');

    await expect(page.getByText('Sources disagree').first()).toBeVisible();
    await expect(page.getByText(/We have not chosen between them/).first()).toBeVisible();
  });

  test('says there are no reviews rather than showing zero stars', async ({ page }) => {
    await page.goto('/gym/oakline-fitness-zetland');
    await expect(page.getByText('No reviews yet').first()).toBeVisible();
    await expect(page.getByText('0 out of 5')).toHaveCount(0);
  });

  test('declares live crowd information unavailable', async ({ page }) => {
    await page.goto('/gym/ironbark-strength-surry-hills');
    await expect(page.getByText('Live crowd information unavailable')).toBeVisible();
  });

  test('says no photo is supplied instead of showing a fake one', async ({ page }) => {
    await page.goto('/gym/ironbark-strength-surry-hills');
    await expect(page.getByText('No photo supplied')).toBeVisible();
    // No image is rendered at all for a venue we have no photograph of.
    await expect(page.locator('main img')).toHaveCount(0);
  });

  test('a demo listing does not send you to a real destination', async ({ page }) => {
    await page.goto('/gym/ironbark-strength-surry-hills');
    await page.getByRole('button', { name: 'Directions' }).click();
    await expect(page.getByText(/Demo listing. There is no real destination/)).toBeVisible();
  });
});

test.describe('comparison', () => {
  test('compares three gyms and keeps gaps visible', async ({ page }) => {
    await page.goto(
      '/compare?ids=ironbark-strength-surry-hills,keystone-fitness-ultimo,saltwater-strength-pyrmont' +
        '&budget=30&date=2026-09-23&time=19%3A00&eq=squat_rack&eq=dumbbells&db=40',
    );

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Comparing 3 gyms');

    const table = page.getByRole('table');
    await expect(table.getByRole('rowheader', { name: 'Visit cost' })).toBeVisible();
    await expect(table.getByRole('rowheader', { name: 'Visitor access at your time' })).toBeVisible();

    // The gym with no established visitor hours says so; it is not blank.
    await expect(table.getByText('Not established').first()).toBeVisible();
    await expect(page.getByText('A blank cell here means we hold no record')).toBeVisible();
  });

  test('adds a gym to the comparison from a search result', async ({ page }) => {
    await page.goto(REFERENCE);

    const card = page.locator('article.card', { hasText: 'Ironbark Strength Co.' });
    await card.getByRole('button', { name: /^Compare/ }).click();

    await expect(page.getByRole('region', { name: 'Comparison' })).toContainText('Comparing 1 of 3');
    await expect(page).toHaveURL(/cmp=ironbark-strength-surry-hills/);
  });
});

test.describe('saved gyms', () => {
  test('saves without an account and survives a reload', async ({ page }) => {
    await page.goto('/gym/ironbark-strength-surry-hills');

    const save = page.getByRole('button', { name: 'Save' });
    await expect(save).toBeEnabled();
    await save.click();
    await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible();

    await page.goto('/saved');
    await expect(page.getByRole('link', { name: 'Ironbark Strength Co.' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('link', { name: 'Ironbark Strength Co.' })).toBeVisible();
  });

  test('an empty saved list explains where the list lives', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/saved');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    await expect(page.getByText('Nothing saved yet')).toBeVisible();
    await expect(page.getByText(/stay in this browser/)).toBeVisible();
  });
});
