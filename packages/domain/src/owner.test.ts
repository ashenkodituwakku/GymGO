import { describe, expect, it } from 'vitest';
import { OwnerUpdateError, applyOwnerUpdates, cleanOwnerUpdate } from './owner';
import { search, defaultQuery } from './search';
import { everyDayWindows, record, schedule, offer, location } from './testing';

const APPROVED = '2026-10-01T09:00:00.000Z';

describe('verified owners’ updates', () => {
  it('take visitor hours of up to two windows a day, or round the clock', () => {
    const hours = cleanOwnerUpdate({ kind: 'visitor_hours', windows: [{ day: 1, openMinute: 360, closeMinute: 720 }, { day: 1, openMinute: 960, closeMinute: 1260 }] }, 'AU');
    expect(hours).toEqual({ kind: 'visitor_hours', alwaysOpen: false, windows: [{ day: 1, openMinute: 360, closeMinute: 720 }, { day: 1, openMinute: 960, closeMinute: 1260 }] });
    expect(cleanOwnerUpdate({ kind: 'visitor_hours', alwaysOpen: true, windows: [{ day: 1, openMinute: 0, closeMinute: 60 }] }, 'AU')).toEqual({ kind: 'visitor_hours', alwaysOpen: true, windows: [] });
    expect(() => cleanOwnerUpdate({ kind: 'visitor_hours', windows: [] }, 'AU')).toThrow(OwnerUpdateError);
    expect(() => cleanOwnerUpdate({ kind: 'visitor_hours', windows: [{ day: 7, openMinute: 0, closeMinute: 60 }] }, 'AU')).toThrow(OwnerUpdateError);
    expect(() => cleanOwnerUpdate({ kind: 'visitor_hours', windows: [{ day: 2, openMinute: 600, closeMinute: 500 }] }, 'AU')).toThrow(OwnerUpdateError);
    expect(() =>
      cleanOwnerUpdate({ kind: 'visitor_hours', windows: [{ day: 2, openMinute: 360, closeMinute: 720 }, { day: 2, openMinute: 700, closeMinute: 900 }] }, 'AU'),
    ).toThrow(/overlap/);
  });

  it('take a casual price in the gym country’s own currency, within reason', () => {
    expect(cleanOwnerUpdate({ kind: 'casual_price', amountMinor: 2500, anyoneCanBuy: 'yes', photoIdRequired: 'no' }, 'AU')).toEqual({
      kind: 'casual_price',
      amountMinor: 2500,
      currency: 'AUD',
      anyoneCanBuy: 'yes',
      photoIdRequired: 'no',
    });
    expect(() => cleanOwnerUpdate({ kind: 'casual_price', amountMinor: 5 }, 'AU')).toThrow(OwnerUpdateError);
    expect(() => cleanOwnerUpdate({ kind: 'colour' }, 'AU')).toThrow(OwnerUpdateError);
  });

  it('once approved, become the record’s facts, from the gym, the newest of each kind', () => {
    const gym = record({
      location: location({ id: 'g' }),
      schedules: [schedule('visitor', { windows: everyDayWindows(9 * 60, 17 * 60) }), schedule('member', { alwaysOpen: true })],
      offers: [offer({ baseAmountMinor: 3000 })],
    });
    const older = { id: 'u1', gymId: 'g', approvedAt: '2026-09-01T00:00:00.000Z', payload: cleanOwnerUpdate({ kind: 'casual_price', amountMinor: 1800, anyoneCanBuy: 'yes', photoIdRequired: 'no' }, 'AU') };
    const newer = { id: 'u2', gymId: 'g', approvedAt: APPROVED, payload: cleanOwnerUpdate({ kind: 'casual_price', amountMinor: 2200, anyoneCanBuy: 'yes', photoIdRequired: 'no' }, 'AU') };
    const hours = { id: 'u3', gymId: 'g', approvedAt: APPROVED, payload: cleanOwnerUpdate({ kind: 'visitor_hours', windows: [1, 2, 3, 4, 5].map((day) => ({ day, openMinute: 360, closeMinute: 1320 })) }, 'AU') };
    const other = { ...newer, id: 'u4', gymId: 'someone-else' };
    const updated = applyOwnerUpdates(gym, [newer, hours, older, other]);
    const casual = updated.offers.filter((item) => item.productType === 'casual_gym_visit');
    expect(casual).toHaveLength(1);
    expect(casual[0]).toMatchObject({ baseAmountMinor: 2200, currency: 'AUD', provenance: { status: 'owner_confirmed' } });
    expect(casual[0]!.provenance.sources[0]).toMatchObject({ sourceType: 'owner_submission', checkedAt: APPROVED });
    const visitor = updated.schedules.filter((item) => item.audience === 'visitor');
    expect(visitor).toHaveLength(1);
    expect(visitor[0]!.windows).toHaveLength(5);
    expect(updated.schedules.some((item) => item.audience === 'member')).toBe(true);
    // Nothing for this gym: the very same record.
    expect(applyOwnerUpdates(gym, [other])).toBe(gym);
    // And search reads them like any other confirmed fact.
    const outcome = search({ records: [updated], reviewsByGymId: {}, query: defaultQuery({ visitDate: '2026-10-01', visitMinuteOfDay: 19 * 60 }), asOf: new Date(APPROVED) });
    expect(outcome.results[0]!.offers.confirmed?.cost.totalNonRefundableMinor).toBe(2200);
  });
});
