import { describe, expect, it } from 'vitest';
import { CELEBRATIONS, celebrationFor, cleanCelebration } from './celebrations';

describe('celebrations', () => {
  it('keeps a known style and turns anything else into confetti', () => {
    expect(cleanCelebration('fireworks')).toBe('fireworks');
    expect(cleanCelebration('lasers')).toBe('confetti');
    expect(cleanCelebration(undefined)).toBe('confetti');
    expect(new Set(CELEBRATIONS.map((item) => item.id)).size).toBe(CELEBRATIONS.length);
  });

  it('plays your pick with Pro, and confetti without', () => {
    expect(celebrationFor('stars', true)).toBe('stars');
    expect(celebrationFor('stars', false)).toBe('confetti');
  });
});
