import { describe, expect, it } from 'vitest';
import { depositLine, priceLine } from './present';
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
