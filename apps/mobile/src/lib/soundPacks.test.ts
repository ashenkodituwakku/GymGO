import { describe, expect, it } from 'vitest';
import { cleanSoundPack, soundPackFor, voiced } from './soundPacks';

describe('sound packs', () => {
  it('keeps a known pack and falls back to Marimba', () => {
    expect(cleanSoundPack('arcade')).toBe('arcade');
    expect(cleanSoundPack('kazoo')).toBe('marimba');
    expect(cleanSoundPack(undefined)).toBe('marimba');
  });

  it('plays your pick with Pro, Marimba without', () => {
    expect(soundPackFor('arcade', true)).toBe('arcade');
    expect(soundPackFor('arcade', false)).toBe('marimba');
  });

  it('voices the workout and check-in sounds in Arcade, and leaves the cards’ alone', () => {
    expect(voiced('record', 'arcade')).toBe('arcade-record');
    expect(voiced('timer-count', 'arcade')).toBe('arcade-timer-count');
    expect(voiced('card-rare', 'arcade')).toBe('card-rare');
    expect(voiced('record', 'marimba')).toBe('record');
  });
});
