import type { GymLocation } from '@gymgo/domain';
import { describe, expect, it } from 'vitest';
import { BRAND_LOGOS as LOGOS } from './brandLogos';
import { matchLogo } from './logoMatch';
import { BUNDLED_GYMS } from './query';

const real = BUNDLED_GYMS.filter((record) => !record.location.isDemoData).map((record) => record.location);
const named = (name: string, extra: Partial<GymLocation> = {}): GymLocation => ({ ...real[0]!, brand: null, externalRefs: {}, name, ...extra });
const logoOf = (location: GymLocation) => matchLogo(location, LOGOS)?.brand ?? null;

describe('brand logos', () => {
  it('reads the generated list', () => {
    expect(LOGOS.length).toBeGreaterThanOrEqual(8);
    expect(LOGOS.map((logo) => logo.brand)).toContain('Snap Fitness');
  });

  it('matches by the brand’s Wikidata ID, even when the names differ', () => {
    const equinox = real.find((location) => location.name === 'Equinox')!;
    expect(equinox.externalRefs.wikidataBrand).toBe('Q5384535');
    expect(logoOf(equinox)).toBe('Equinox Fitness');
  });

  it('matches an exact brand or name, and a name that starts with the whole brand', () => {
    expect(logoOf(named('Fitzroy gym', { brand: 'Snap Fitness' }))).toBe('Snap Fitness');
    expect(logoOf(named('Snap Fitness'))).toBe('Snap Fitness');
    expect(logoOf(named('Snap Fitness Mt Lawley'))).toBe('Snap Fitness');
    expect(logoOf(named("Gold's Gym Venice"))).toBe("Gold's Gym");
  });

  it('never matches loosely', () => {
    expect(logoOf(named('Snapper Fitness'))).toBeNull();
    expect(logoOf(named('LA Fit'))).toBeNull();
    expect(logoOf(named('Gold Fitness 24/7'))).toBeNull();
    expect(logoOf(named('The CrossFit Box'))).toBeNull();
    expect(logoOf(named('Planet Fitness', { brand: 'Planet Fitness' }))).toBeNull();
  });

  it('never gives an invented demo gym a real brand’s logo', () => {
    const demo = BUNDLED_GYMS.find((record) => record.location.isDemoData)!.location;
    expect(logoOf({ ...demo, brand: 'Snap Fitness', name: 'Snap Fitness' })).toBeNull();
  });

  it('finds logos for real gyms across the data, and only for their own brand', () => {
    const matched = real.filter((location) => logoOf(location) !== null);
    expect(matched.length).toBeGreaterThanOrEqual(40);
    for (const location of matched) {
      const logo = matchLogo(location, LOGOS)!;
      const text = `${location.brand ?? ''} ${location.name}`.toLowerCase().replace(/['’]/g, '');
      const brandWord = logo.brand.toLowerCase().replace(/['’]/g, '').split(' ')[0]!;
      expect(location.externalRefs.wikidataBrand === logo.qid || text.includes(brandWord)).toBe(true);
    }
  });
});
