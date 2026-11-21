import { describe, expect, it } from 'vitest';
import { MOST_TILT, tiltFor } from './tilt';

describe('tilting a card', () => {
  it('lies flat when held in the middle', () => {
    const flat = tiltFor(0.5, 0.5);
    expect(Math.abs(flat.rotateX)).toBe(0);
    expect(Math.abs(flat.rotateY)).toBe(0);
  });

  it('leans towards where it’s held, at most MOST_TILT degrees', () => {
    expect(tiltFor(1, 0.5)).toEqual({ rotateX: -0, rotateY: MOST_TILT });
    expect(tiltFor(0, 0.5).rotateY).toBe(-MOST_TILT);
    expect(tiltFor(0.5, 0).rotateX).toBe(MOST_TILT);
    expect(tiltFor(0.5, 1).rotateX).toBe(-MOST_TILT);
    // Past the card's edge counts as its edge.
    expect(tiltFor(3, -2)).toEqual(tiltFor(1, 0));
  });
});
