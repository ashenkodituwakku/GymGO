import { describe, expect, it } from 'vitest';
import { CELEBRATIONS, SHOWER_EMOJI } from './celebrations';
import { GROUP_EMOJI } from './cityGroups';
import { COUNTRIES } from './countries';
import { emojiKey, flagEmoji } from './emoji';
import { EMOJI_IMAGES, FLAG_IMAGES } from './emojiImages';
import { SOUND_PACKS } from './soundPacks';

describe('Noto 3D emoji', () => {
  it("names an emoji as Noto's files do", () => {
    expect(emojiKey('💪')).toBe('1f4aa');
    expect(emojiKey('⭐')).toBe('2b50');
    expect(emojiKey('🕹️')).toBe('1f579');
    expect(emojiKey('©')).toBe('00a9');
    expect(emojiKey('🏋️‍♂️')).toBe('1f3cb_200d_2642');
    expect(emojiKey('🇦🇺')).toBe('1f1e6_1f1fa');
  });

  it('makes a flag from a country code, and nothing from anything else', () => {
    expect(flagEmoji('AU')).toBe('🇦🇺');
    expect(flagEmoji('gb')).toBe('🇬🇧');
    expect(flagEmoji('')).toBe('');
    expect(flagEmoji('USA')).toBe('');
  });

  it('has a picture for every emoji the app shows', () => {
    const shown = [...SHOWER_EMOJI, ...CELEBRATIONS.map((item) => item.sample), ...SOUND_PACKS.map((item) => item.sample), ...GROUP_EMOJI];
    expect(shown.filter((emoji) => !EMOJI_IMAGES[emojiKey(emoji)])).toEqual([]);
  });

  it('has a flag for every country you can choose', () => {
    expect(COUNTRIES.filter((country) => !FLAG_IMAGES[country.code]).map((country) => country.code)).toEqual([]);
  });

  it('names each picture for what it shows', () => {
    // In Node each picture is its path (vitest.config.mts); the bundler fails on a missing file.
    for (const [key, source] of Object.entries(EMOJI_IMAGES)) expect(source).toBe(`../../assets/emoji/${key}.webp`);
    for (const [code, source] of Object.entries(FLAG_IMAGES)) expect(source).toBe(`../../assets/flags/${code.toLowerCase()}.webp`);
  });
});
