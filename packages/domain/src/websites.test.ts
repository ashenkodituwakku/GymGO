import { describe, expect, it } from 'vitest';
import { GYM_WEBSITE_ROWS, chainWebsite, researchedWebsite } from './websites';

describe('gyms’ own websites, looked up by hand', () => {
  it('finds a gym’s site by its id, and nothing for a gym it doesn’t list', () => {
    expect(researchedWebsite('franks-gym-teddington-road-perth')).toBe('https://www.franksgymperth.com/');
    expect(researchedWebsite('no-such-gym')).toBeNull();
  });

  it('keeps only real web addresses', () => {
    for (const url of Object.values(GYM_WEBSITE_ROWS)) expect(url).toMatch(/^https?:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i);
  });
});

describe('a chain’s site, for a branch with none', () => {
  it('matches by the brand’s Wikidata item, the brand, or a name starting with the chain’s', () => {
    expect(chainWebsite({ name: 'Somewhere', wikidataBrand: 'Q24185346', countryCode: 'AU' })).toBe('https://www.jetts.com.au/');
    expect(chainWebsite({ name: 'Gym', brand: 'Anytime Fitness', countryCode: 'AU' })).toBe('https://www.anytimefitness.com.au/');
    expect(chainWebsite({ name: 'Anytime Fitness Docklands', countryCode: 'AU' })).toBe('https://www.anytimefitness.com.au/');
    expect(chainWebsite({ name: 'Barry’s', countryCode: 'AU' })).toBe('https://www.barrys.com/');
  });

  it('picks the country’s own site, and never lends a chain name to a lookalike', () => {
    expect(chainWebsite({ name: 'Anytime Fitness', countryCode: 'US' })).toBe('https://www.anytimefitness.com/');
    expect(chainWebsite({ name: 'PureGym', countryCode: 'DK' })).toBe('https://www.puregym.dk/');
    expect(chainWebsite({ name: 'Revolution Gym', countryCode: 'AU' })).toBeNull();
    expect(chainWebsite({ name: 'Flex', countryCode: 'US' })).toBeNull();
    // A chain with no site in that country and no site for everywhere else.
    expect(chainWebsite({ name: 'Club Lime', countryCode: 'US' })).toBeNull();
    expect(chainWebsite({ name: 'Barry’s Gym Emporium', countryCode: 'AU' })).toBeNull();
    expect(chainWebsite({ name: 'GoodLife Fitness', countryCode: 'CA' })).toBeNull();
    // Planet Fitness in Australia is a different business from the American chain.
    expect(chainWebsite({ name: 'Planet Fitness', countryCode: 'AU' })).toBe('https://planetfitnessaustralia.com.au/');
    expect(chainWebsite({ name: 'Planet Fitness', countryCode: 'US' })).toBe('https://www.planetfitness.com/');
  });

  it('falls back to the chains matched by pattern', () => {
    expect(chainWebsite({ name: 'Derrimut 24:7 Gym Keysborough', countryCode: 'AU' })).toBe('https://www.derrimut247.com.au/');
    expect(chainWebsite({ name: '12RND Fitness', countryCode: 'AU' })).toBe('https://12rnd.com.au/');
  });
});
