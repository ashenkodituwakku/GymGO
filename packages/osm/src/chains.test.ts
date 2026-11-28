import { describe, expect, it } from 'vitest';
import { CHAINS_READ, chainFactsFor } from './chains';
import { mapOnlyRecord, type MapOnlyGym } from './record';

const gym = (name: string, extra: Partial<MapOnlyGym> = {}): MapOnlyGym => ({
  id: `g-${name.toLowerCase().replace(/\W+/g, '-')}`,
  osm: 'node/1',
  name,
  line1: '',
  locality: 'Somewhere',
  state: '',
  postcode: '',
  lat: 0,
  lng: 0,
  type: 'full_gym',
  ...extra,
});

describe('franchise facts at every branch', () => {
  it('opens every Anytime Fitness to members round the clock, in any country, over the map’s hours', () => {
    for (const country of ['AU', 'US', 'GB', 'JP']) {
      const record = mapOnlyRecord(gym('Anytime Fitness', { hours: [[1, 360, 1200]] }), { countryCode: country, timezone: 'UTC', fetchedAt: CHAINS_READ });
      expect(record.schedules).toHaveLength(1);
      expect(record.schedules[0]!.alwaysOpen).toBe(true);
      expect(record.schedules[0]!.provenance.status).toBe('owner_confirmed');
      expect(record.schedules[0]!.provenance.sources[0]!.evidenceRef).toMatch(/^https:\/\/www\.anytimefitness\.com\//);
    }
  });

  it('prices a chain only in the country its own pages cover', () => {
    expect(chainFactsFor({ id: 'a', name: 'Anytime Fitness' }, 'AU', 'Australia/Sydney').offers).toHaveLength(1);
    expect(chainFactsFor({ id: 'a', name: 'Anytime Fitness' }, 'US', 'America/New_York').offers).toHaveLength(0);
    expect(chainFactsFor({ id: 'p', name: 'Planet Fitness' }, 'US', 'America/New_York').offers.map((offer) => offer.label)).toEqual(['Classic', 'PF Black Card']);
    expect(chainFactsFor({ id: 'p', name: 'Planet Fitness' }, 'CA', 'America/Toronto').offers).toEqual([]);
    expect(chainFactsFor({ id: 'c', name: 'Crunch Fitness' }, 'AU', 'Australia/Sydney').offers).toEqual([]);
  });

  it('says a club may charge more, where the chain lets each club set its price', () => {
    const [anytime] = chainFactsFor({ id: 'a', name: 'Anytime Fitness' }, 'AU', 'Australia/Sydney').offers;
    expect(anytime!.priceBasis).toBe('recommended');
    const [jetts] = chainFactsFor({ id: 'j', name: 'Jetts Fitness' }, 'AU', 'Australia/Sydney').offers;
    expect(jetts!.priceBasis).toBe('from');
    expect(jetts!.baseAmountMinor).toBe(1695);
    // McFit publishes one table for every studio.
    for (const offer of chainFactsFor({ id: 'm', name: 'McFIT' }, 'DE', 'Europe/Berlin').offers) expect(offer.priceBasis).toBeUndefined();
  });

  it('matches by brand tag as well as by name, and not on a word in the middle of a name', () => {
    expect(chainFactsFor({ id: 's', name: 'Snap 24/7', brand: 'Snap Fitness' }, 'AU', 'Australia/Perth').open247).not.toBeNull();
    expect(chainFactsFor({ id: 'x', name: 'Bob’s Anytime Fitness Studio' }, 'AU', 'Australia/Perth').open247).toBeNull();
    expect(chainFactsFor({ id: 'y', name: 'Local Gym' }, 'AU', 'Australia/Perth')).toEqual({ offers: [], open247: null });
  });

  it('keeps the Barangaroo club’s own visitor price out of the chain’s', () => {
    expect(chainFactsFor({ id: 'f', name: 'Fitness First', branch: 'Barangaroo' }, 'AU', 'Australia/Sydney').offers).toEqual([]);
    const [visit] = chainFactsFor({ id: 'f', name: 'Fitness First', branch: 'Bondi Junction' }, 'AU', 'Australia/Sydney').offers;
    expect(visit!.baseAmountMinor).toBe(2500);
    expect(visit!.eligibility.memberGuestOnly).toBe('yes');
  });

  it('cites the chain’s own page, dated, for every fact, and never a $0 price', () => {
    for (const [name, country] of [['Anytime Fitness', 'AU'], ['Jetts', 'AU'], ['Planet Fitness', 'US'], ['McFit', 'DE'], ['Fitness24Seven', 'SE'], ['PureGym', 'GB'], ['Basic-Fit', 'FR'], ['Activ Fitness', 'CH']] as const) {
      const facts = chainFactsFor({ id: 'z', name }, country, 'UTC');
      expect(facts.offers.length + (facts.open247 ? 1 : 0)).toBeGreaterThan(0);
      for (const offer of facts.offers) {
        expect(offer.baseAmountMinor).toBeGreaterThan(0);
        expect(offer.provenance.sources[0]!.sourceType).toBe('operator_website');
        expect(offer.provenance.sources[0]!.checkedAt).toBe(CHAINS_READ);
      }
    }
  });
});
