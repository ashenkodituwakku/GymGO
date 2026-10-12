import { describe, expect, it } from 'vitest';
import { DROP_DRAWN, DROP_PATH, PICKED_ANCHOR_Y, PICKED_CENTER_OFFSET, PICKED_HEIGHT, PICKED_TIP, dropTipY } from './pinShape';

describe('the picked pin', () => {
  it('describes the path it draws', () => {
    // The tip's numbers in pinShape.ts are read off this path: change one, change the other.
    expect(DROP_PATH).toContain('16.3 28.3a2.3 2.3 0 0 0 3.4 0');
    expect(DROP_PATH).toMatch(/^M20 2C10\.06 2 2 10\.06 2 20/);
  });

  it('has its tip where the maps stand it', () => {
    const tip = dropTipY();
    // The iPhone marker's tip, within a point of the drawn point.
    expect(Math.abs(PICKED_TIP - tip)).toBeLessThan(1);
    // The browser and Android stand the drawing on its bottom edge: within a point and a half.
    expect(Math.abs(DROP_DRAWN.height - tip)).toBeLessThan(1.5);
  });

  it('puts the tip on the gym on both iPhone maps', () => {
    // Google's maps: the anchor is the tip's share of the height.
    expect(PICKED_ANCHOR_Y * PICKED_HEIGHT).toBeCloseTo(PICKED_TIP, 6);
    // Apple Maps centres the marker, then moves it by the offset: the tip lands on the spot.
    expect(PICKED_HEIGHT / 2 + PICKED_CENTER_OFFSET.y).toBe(PICKED_HEIGHT / 2 - (PICKED_TIP - PICKED_HEIGHT / 2));
    expect(PICKED_HEIGHT / 2 - PICKED_TIP - PICKED_CENTER_OFFSET.y).toBeCloseTo(0, 6);
    expect(PICKED_CENTER_OFFSET.x).toBe(0);
    // Up, not down: a positive offset moved the tip further below the gym.
    expect(PICKED_CENTER_OFFSET.y).toBeLessThan(0);
  });
});
