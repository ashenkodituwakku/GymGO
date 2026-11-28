import { describe, expect, it } from 'vitest';
import { give } from '../components/rubberBand.web';
import { FIRST_DELAY_MS, WARM_FOR_MS, waitFor } from '../components/tooltips.web';

describe('a row giving at its ends', () => {
  it('follows less the further it is pulled, and never past its own width', () => {
    const width = 360;
    const steps = [20, 80, 200, 600, 5000].map((raw) => give(raw, width));
    for (let at = 1; at < steps.length; at++) {
      expect(steps[at]).toBeGreaterThan(steps[at - 1]!);
      // Each extra point pulled shows less than the one before.
      expect(steps[at]! / [20, 80, 200, 600, 5000][at]!).toBeLessThan(steps[at - 1]! / [20, 80, 200, 600, 5000][at - 1]!);
    }
    expect(give(5000, width)).toBeLessThan(width);
    expect(give(-80, width)).toBeCloseTo(-give(80, width));
    expect(give(0, width)).toBe(0);
  });
});

describe('icon buttons naming themselves under a mouse', () => {
  it('waits before the first, then shows the next at once while you move along', () => {
    expect(waitFor(10_000, 0, false)).toBe(FIRST_DELAY_MS);
    expect(waitFor(10_000, 10_000 - (WARM_FOR_MS - 1), false)).toBe(0);
    expect(waitFor(10_000, 10_000 - WARM_FOR_MS - 1, false)).toBe(FIRST_DELAY_MS);
    expect(waitFor(10_000, 0, true)).toBe(0);
  });
});
