import { expect, test } from '@playwright/test';

/**
 * Contributions and moderation, end to end through the real build.
 *
 * These run on one project only: they write to a shared local store, so
 * running them in three viewports at once would have them trip over each
 * other. The layout of these pages is covered by the accessibility suite.
 */
test.describe('contributions', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440', 'shared store; runs on one project only');
  });

  async function signInAs(page: import('@playwright/test').Page, persona: string) {
    await page.goto('/account');
    await page
      .locator('form', { has: page.locator(`input[value="${persona}"]`) })
      .getByRole('button', { name: 'Use this account' })
      .click();
    await expect(page.locator('.notice--success')).toContainText('Signed in as');
  }

  test('browsing needs no account, but contributing does', async ({ page }) => {
    await page.goto('/gym/oakline-fitness-zetland');

    await expect(
      page.getByText('to suggest a correction, leave a review or claim this gym'),
    ).toBeVisible();
    await page.locator('summary', { hasText: 'Suggest a correction' }).click();
    await expect(page.getByText('You need an account to suggest a correction.')).toBeVisible();
  });

  test('a member can submit a correction, and it stays pending', async ({ page }) => {
    await signInAs(page, 'demo-member');
    await page.goto('/gym/copperfield-gym-camperdown');

    await page.locator('summary', { hasText: 'Suggest a correction' }).click();
    await page.getByLabel('What is wrong').selectOption('equipment');
    await page.getByLabel('Which item').selectOption('dumbbells');
    await page.getByLabel('Equipment: is it there?').selectOption('yes');
    await page.getByLabel('Equipment: heaviest dumbbell pair (kg)').fill('44');
    await page.getByLabel('What it should say').fill('The heaviest dumbbell pair is 44 kg.');
    await page.getByLabel('How do you know?').fill('Photographed the rack on 20 September.');
    await page.getByRole('button', { name: 'Send correction' }).click();

    await expect(page.getByText(/queued for review/)).toBeVisible();

    // Nothing has changed on the page yet.
    await page.reload();
    await expect(page.getByText('heaviest pair not recorded')).toBeVisible();
  });

  test('a member cannot reach the moderation queue', async ({ page }) => {
    await signInAs(page, 'demo-member');
    await page.goto('/admin');
    await expect(page.getByText('You do not have permission to see the moderation queue')).toBeVisible();
  });

  test('a moderator approves the correction and the gym page changes', async ({ page }) => {
    await signInAs(page, 'demo-moderator');
    await page.goto('/admin');

    const card = page.locator('.card', { hasText: 'The heaviest dumbbell pair is 44 kg.' });
    await expect(card).toBeVisible();
    await card.getByPlaceholder('Reason (published in the change history)').fill('Photo checked.');
    await card.getByRole('button', { name: 'Approve' }).click();

    await page.goto('/gym/copperfield-gym-camperdown');
    await expect(page.getByText('heaviest pair 44 kg').first()).toBeVisible();
    await expect(page.getByText('Reported by a user').first()).toBeVisible();

    // The decision and its reason are in the public change history.
    await expect(page.getByRole('heading', { name: 'Change history' })).toBeVisible();
    await expect(page.getByText('Photo checked.')).toBeVisible();
  });

  test('a moderator cannot see ownership claims', async ({ page }) => {
    await signInAs(page, 'demo-moderator');
    await page.goto('/admin');
    await expect(
      page.getByText('Ownership claims are not shown to moderators'),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Ownership claims/ })).toHaveCount(0);
  });

  test('a claim grants nothing until an administrator approves it', async ({ page }) => {
    await signInAs(page, 'demo-owner');
    await page.goto('/gym/marrow-and-co-darlinghurst');

    await page.locator('summary', { hasText: 'Do you run this gym?' }).click();
    await page.getByLabel('Your name').fill('Jo Meyers');
    await page.getByLabel('Your role at the gym').fill('Club manager');
    await page.getByLabel('How can we check?').selectOption('work_email_domain');
    await page.getByLabel('The detail we should use').fill('jo@marrow.example.invalid');
    await page.getByRole('button', { name: 'Submit claim' }).click();

    await expect(page.getByText(/It grants no access until it is approved/)).toBeVisible();

    await page.goto('/owner');
    await expect(page.getByText('None yet')).toBeVisible();
    await expect(page.getByText(/waiting for an administrator/)).toBeVisible();
  });

  test('an administrator approves the claim, and ownership is scoped to that branch', async ({ page }) => {
    await signInAs(page, 'demo-admin');
    await page.goto('/admin');

    const claim = page.locator('.card', { hasText: 'Jo Meyers' });
    await expect(claim).toBeVisible();
    // The evidence is visible to an administrator deciding the claim.
    await expect(claim.getByText('jo@marrow.example.invalid')).toBeVisible();
    await claim.getByPlaceholder('Reason (published in the change history)').fill('Replied from the club domain.');
    await claim.getByRole('button', { name: 'Approve' }).click();

    await signInAs(page, 'demo-owner');
    await page.goto('/owner');
    await expect(page.getByRole('link', { name: 'Marrow & Co' })).toBeVisible();

    // And nowhere else.
    await page.goto('/gym/ironbark-strength-surry-hills');
    await expect(page.locator('summary', { hasText: 'Do you run this gym?' })).toBeVisible();
    await expect(page.locator('summary', { hasText: 'You manage' })).toHaveCount(0);
  });

  test('the public change history carries the reason, never the evidence', async ({ page }) => {
    await page.goto('/gym/marrow-and-co-darlinghurst');
    await expect(page.getByText('Replied from the club domain.')).toBeVisible();
    await expect(page.getByText('jo@marrow.example.invalid')).toHaveCount(0);
  });

  test('a review is held for moderation and published with an honest count', async ({ page }) => {
    await signInAs(page, 'demo-member');
    await page.goto('/gym/greenway-community-gym-glebe');

    await page.locator('summary', { hasText: 'Write a review' }).click();
    await page.getByLabel('Overall').selectOption('4');
    await page.getByLabel('Cleanliness').selectOption('5');
    await page
      .getByLabel('What was it like to train there?')
      .fill('Quiet on a weekday morning and the staff were helpful about the rower being out of service.');
    await page.getByRole('button', { name: 'Submit review' }).click();
    await expect(page.getByText(/waiting for moderation/)).toBeVisible();

    // Not published yet.
    await page.goto('/gym/greenway-community-gym-glebe');
    await expect(page.getByText('No reviews yet').first()).toBeVisible();

    await signInAs(page, 'demo-moderator');
    await page.goto('/admin');
    const card = page.locator('.card', { hasText: 'Quiet on a weekday morning' });
    await card.getByPlaceholder('Reason (published in the change history)').fill('Meets the guidelines.');
    await card.getByRole('button', { name: 'Approve' }).click();

    await page.goto('/gym/greenway-community-gym-glebe');
    await expect(page.getByText('4.0 from 1 review').first()).toBeVisible();
    await expect(page.getByText(/Visit not independently verified/)).toBeVisible();
  });

  test('account deletion is available before public registration', async ({ page }) => {
    await signInAs(page, 'demo-member');
    await page.goto('/account');
    await expect(page.getByRole('button', { name: /Delete my account and evidence/ })).toBeVisible();
  });

  test('a production build running development sign-in says so on every page', async ({ page }) => {
    // The e2e server sets GYMGO_ALLOW_DEV_AUTH_IN_PROD deliberately, so the
    // warning banner must be present. If it ever is not, the opt-in has
    // stopped being visible.
    await page.goto('/');
    await expect(page.getByText('Development sign-in is enabled in a production build')).toBeVisible();
  });
});
