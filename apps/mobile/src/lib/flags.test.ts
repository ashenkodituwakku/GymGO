import { describe, expect, it } from 'vitest';
import { COUNTRIES } from './countries';
import { FLAG_IMAGES } from './flagImages';

describe('Noto 3D flags', () => {
  it('has a flag for every country you can choose', () => {
    expect(COUNTRIES.filter((country) => !FLAG_IMAGES[country.code]).map((country) => country.code)).toEqual([]);
  });

  it('names each picture for its country', () => {
    // In Node each picture is its path (vitest.config.mts); the bundler fails on a missing file.
    for (const [code, source] of Object.entries(FLAG_IMAGES)) expect(source).toBe(`../../assets/flags/${code.toLowerCase()}.webp`);
  });
});
