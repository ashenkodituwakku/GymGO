import { describe, expect, it } from 'vitest';
import { MELBOURNE_GYMS } from '@gymgo/melbourne-data';
import { WHEN_CHOICES, addressLines, depositLine, googleMapsEmbedUrl, googleMapsSearchUrl, googleStreetViewEmbedUrl, localDateDaysAgo, parseAmount, priceLine } from './present';
import { atPlace, initialFilters, runSearch } from './query';
import { geocodePlace } from './places';

const SURRY_HILLS = atPlace(geocodePlace('Surry Hills').place!);

const ASOF = new Date('2026-09-22T00:00:00.000Z');

function resultFor(name: string, budgetMinor: number | null = null) {
  const outcome = runSearch(
    { ...initialFilters(ASOF), ...SURRY_HILLS, visitDate: '2026-09-23', visitMinuteOfDay: 19 * 60, budgetMinor, radiusKm: 10 },
    {},
    ASOF,
  );
  const result = outcome.results.find((candidate) => candidate.record.location.name === name);
  if (!result) throw new Error(`No result for ${name}`);
  return result;
}

describe('priceLine', () => {
  it('says "Ask" rather than a number when a mandatory fee is unknown', () => {
    const line = priceLine(resultFor('Tallow Street Gym').offers);
    expect(line.headline).toBe('Ask');
    expect(line.confirmed).toBe(false);
  });

  it('shows a confirmed price as a price per visit', () => {
    expect(priceLine(resultFor('Quarry Lane Barbell').offers)).toEqual({
      headline: 'A$25',
      caption: 'per visit',
      confirmed: true,
    });
  });

  it('still shows the price when it is over budget, and says so', () => {
    const line = priceLine(resultFor('Marrow & Co', 3000).offers);
    expect(line.headline).toBe('A$32');
    expect(line.caption).toBe('over budget');
  });

  it('never turns a week pass into a visit price', () => {
    expect(priceLine(resultFor('Paddington Hill Fitness').offers)).toEqual({
      headline: '—',
      caption: 'price unknown',
      confirmed: false,
    });
  });
});

describe('depositLine', () => {
  it('shows the deposit and the cash needed on the day', () => {
    expect(depositLine(resultFor('Quarry Lane Barbell').offers)).toBe(
      'Plus a A$20 refundable deposit — A$45 on the day.',
    );
  });

  it('is absent when there is no deposit', () => {
    expect(depositLine(resultFor('Ironbark Strength Co.').offers)).toBeNull();
  });
});

describe('googleMapsSearchUrl', () => {
  it('searches Google Maps by name and address, with no key in the link', () => {
    const gym = MELBOURNE_GYMS.find((record) => record.location.id === 'dohertys-gym-city')!;
    const url = googleMapsSearchUrl(gym);
    expect(url.startsWith('https://www.google.com/maps/search/?api=1&query=')).toBe(true);
    const query = decodeURIComponent(url.split('query=')[1]!);
    expect(query).toContain(gym.location.name);
    expect(query).toContain(gym.location.address.line1);
    expect(url).not.toMatch(/key=/i);
  });
});

describe('googleMapsEmbedUrl', () => {
  it('asks Google for its free embeddable map of this gym, with no key', () => {
    const gym = MELBOURNE_GYMS.find((record) => record.location.id === 'dohertys-gym-city')!;
    const url = new URL(googleMapsEmbedUrl(gym));
    expect(url.origin).toBe('https://maps.google.com');
    expect(url.searchParams.get('output')).toBe('embed');
    expect(url.searchParams.get('q')).toContain(gym.location.name);
    expect(url.searchParams.get('q')).toContain(gym.location.address.line1);
    expect(url.searchParams.has('key')).toBe(false);
  });
});

describe('googleStreetViewEmbedUrl', () => {
  it('asks Google for Street View at the gym, with no key', () => {
    const gym = MELBOURNE_GYMS.find((record) => record.location.id === 'dohertys-gym-city')!;
    const url = new URL(googleStreetViewEmbedUrl(gym));
    expect(url.searchParams.get('output')).toBe('svembed');
    expect(url.searchParams.get('cbll')).toBe(`${gym.location.position.lat},${gym.location.position.lng}`);
    expect(url.searchParams.has('key')).toBe(false);
  });
});

describe('typed prices', () => {
  it('reads what people type as a price, in cents', () => {
    expect(parseAmount('25')).toBe(2500);
    expect(parseAmount(' 24.50 ')).toBe(2450);
    expect(parseAmount('24.5')).toBe(2450);
    expect(parseAmount('$19.99')).toBe(1999);
    expect(parseAmount('A$30')).toBe(3000);
    expect(parseAmount('0.10')).toBe(10);
  });

  it('refuses anything that isn’t plainly an amount', () => {
    for (const text of ['', 'free', '25 dollars', '1,000', '12.345', '-5', '1e3', '2500.00']) expect(parseAmount(text)).toBeNull();
  });
});

describe('members’ prices on a row', () => {
  const none = { bestAvailable: null } as unknown as Parameters<typeof priceLine>[0];

  it('shows what members typically paid, marked as theirs, only when the gym publishes no price', () => {
    expect(priceLine(none)).toEqual({ headline: '—', caption: 'price unknown', confirmed: false });
    expect(priceLine(none, { typicalMinor: 2245, country: 'AU' })).toEqual({ headline: '~A$22', caption: 'members say', confirmed: false });
    expect(priceLine(none, { typicalMinor: 1550, country: 'US' })).toMatchObject({ headline: '~$16', caption: 'members say' });
  });

  it('never lets members’ figure replace a price the gym publishes, even an unclear one', () => {
    for (const name of ['Quarry Lane Barbell', 'Tallow Street Gym']) {
      const published = resultFor(name).offers;
      expect(priceLine(published, { typicalMinor: 999, country: 'AU' })).toEqual(priceLine(published));
    }
  });
});

describe('roughly when', () => {
  it('turns a choice into the local calendar day it means', () => {
    const noon = new Date(2026, 8, 24, 12, 0);
    expect(localDateDaysAgo(0, noon)).toBe('2026-09-24');
    expect(localDateDaysAgo(1, noon)).toBe('2026-09-23');
    expect(localDateDaysAgo(30, noon)).toBe('2026-08-25');
    expect(WHEN_CHOICES.map((choice) => choice.days)).toEqual([0, 1, 7, 30, 90]);
  });
});

describe('a gym\'s address', () => {
  const at = (countryCode: string, parts: Partial<{ line1: string; suburb: string; state: string; postcode: string }>) =>
    addressLines({ line1: '', line2: null, suburb: '', state: '', postcode: '', countryCode, ...parts });

  it('is set out the way post is addressed there', () => {
    expect(at('US', { line1: '38 West 38th Street', suburb: 'New York', state: 'NY', postcode: '10018' })).toEqual(['38 West 38th Street', 'New York, NY 10018']);
    expect(at('AU', { line1: '12 Smith Street', suburb: 'Fitzroy', state: 'VIC', postcode: '3065' })).toEqual(['12 Smith Street', 'Fitzroy VIC 3065']);
    expect(at('GB', { line1: '1 Mare Street', suburb: 'London', postcode: 'E8 4RP' })).toEqual(['1 Mare Street', 'London E8 4RP']);
    expect(at('DE', { line1: 'Oranienstraße 5', suburb: 'Berlin', state: 'Berlin', postcode: '10997' })).toEqual(['Oranienstraße 5', '10997 Berlin']);
  });

  it('leaves out what the map doesn\'t give, without stray commas', () => {
    expect(at('US', { line1: '111 West 40th Street', suburb: 'New York', state: 'NY' })).toEqual(['111 West 40th Street', 'New York, NY']);
    expect(at('US', { suburb: 'Austin' })).toEqual(['Austin']);
    expect(at('FR', { suburb: 'Paris' })).toEqual(['Paris']);
  });
});
