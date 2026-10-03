import { expect, type Page } from '@playwright/test';

/** Matches the breakpoint in globals.css below which the panel collapses. */
const COLLAPSE_BELOW = 768;

/**
 * On phones the filter panel collapses behind a "Filters" summary button so
 * results come first. Expand it there; on wider screens the toggle is hidden
 * and the panel is always open.
 *
 * Branches on viewport width rather than on whether the toggle happens to be
 * visible yet: the panel streams in behind a Suspense boundary, and an
 * instantaneous visibility check can run before it arrives and wrongly
 * conclude there is nothing to open.
 */
export async function openFilters(page: Page, via: 'click' | 'keyboard' = 'click'): Promise<void> {
  const body = page.locator('.filters__body');
  const width = page.viewportSize()?.width ?? Infinity;

  if (width >= COLLAPSE_BELOW) {
    await expect(body).toBeVisible();
    return;
  }

  const toggle = page.locator('.filters__toggle');
  await expect(toggle).toBeVisible();

  if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
    if (via === 'keyboard') {
      await toggle.focus();
      await page.keyboard.press('Enter');
    } else {
      await toggle.click();
    }
  }

  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(body).toBeVisible();
}
