import { describe, expect, it } from 'vitest';
import { accessLine, accessShort, checkedAgo, ratingShort, sessionGreeting, summaryLine, timeLabel, TIER } from './copy';
import { activeFilterCount, applyRelaxation, defaultVisit, initialFilters, runSearch, toQuery } from './query';
import { checkTimeZoneSupport } from './selfcheck';

describe('voice', () => {
  it('formats times the way people say them', () => {
    expect(timeLabel(19 * 60)).toBe('7 pm');
    expect(timeLabel(6 * 60 + 30)).toBe('6:30 am');
    expect(timeLabel(12 * 60)).toBe('12 pm');
    expect(timeLabel(0)).toBe('12 am');
  });

  it('greets by the planned session time, covering every hour', () => {
    expect(sessionGreeting(6 * 60)).toBe('Early one?');
    expect(sessionGreeting(12 * 60 + 30)).toBe('Lunch-break pump?');
    expect(sessionGreeting(18 * 60)).toBe('After-work session?');
    expect(sessionGreeting(21 * 60)).toBe('Late one?');
    for (let minute = 0; minute < 24 * 60; minute += 30) expect(sessionGreeting(minute).length).toBeGreaterThan(0);
  });

  it('gives every tier a label and a line', () => {
    for (const tier of ['confirmed', 'needs_confirmation', 'ruled_out'] as const) {
      expect(TIER[tier].label.length).toBeGreaterThan(0);
      expect(TIER[tier].line.length).toBeGreaterThan(0);
    }
  });

  it('never tells someone they can get in when the rules say they cannot', () => {
    expect(accessLine('not_admitted', 19 * 60)).toBe('No guests at 7 pm');
    expect(accessShort('not_admitted')).not.toMatch(/welcome/i);
    expect(accessLine('needs_confirmation', 19 * 60)).not.toMatch(/welcome/i);
    expect(accessLine('unknown', 19 * 60)).not.toMatch(/welcome/i);
  });

  it('only says welcome when the rules admit the visitor', () => {
    expect(accessLine('admits_visitor', 19 * 60)).toBe('Guests welcome at 7 pm');
    expect(accessShort('admits_visitor')).toBe('Welcome');
  });

  it('shows "New" rather than zero stars for a gym with no reviews', () => {
    expect(ratingShort(null)).toBe('New');
    expect(ratingShort(4)).toBe('★ 4.0');
  });

  it('does not claim a sure thing when nothing is confirmed', () => {
    expect(summaryLine(9, 0, 19 * 60)).toBe('9 gyms nearby · none a sure thing at 7 pm');
    expect(summaryLine(9, 3, 19 * 60)).toBe('9 gyms nearby · 3 good to go at 7 pm');
    expect(summaryLine(1, 1, 7 * 60)).toBe('1 gym nearby · 1 good to go at 7 am');
  });

  it('describes evidence age honestly', () => {
    expect(checkedAgo(null)).toBe('Never checked');
    expect(checkedAgo(0)).toBe('Checked today');
    expect(checkedAgo(9)).toBe('Checked 9 days ago');
    expect(checkedAgo(140)).toBe('Checked 5 months ago');
  });
});

describe('query', () => {
  const NOW = new Date('2026-09-22T05:20:00.000Z'); // 3:20 pm in Sydney

  it('defaults the visit to the next whole hour', () => {
    expect(defaultVisit(NOW)).toEqual({ date: '2026-09-22', minute: 16 * 60 });
  });

  it('rolls late-night opens to tomorrow morning, never a time already past', () => {
    // 11:40 pm Sydney on the 22nd → 7 am on the 23rd.
    expect(defaultVisit(new Date('2026-09-22T13:40:00.000Z'))).toEqual({ date: '2026-09-23', minute: 7 * 60 });
  });

  it('uses this morning for opens in the small hours', () => {
    // 3 am Sydney on the 22nd → 7 am the same day.
    expect(defaultVisit(new Date('2026-09-21T17:00:00.000Z'))).toEqual({ date: '2026-09-22', minute: 7 * 60 });
  });

  it('carries the dumbbell weight onto the dumbbell requirement only', () => {
    const query = toQuery({
      ...initialFilters(NOW),
      equipment: ['squat_rack', 'dumbbells'],
      dumbbellMinKg: 40,
    });
    expect(query.requiredEquipment).toEqual([
      { equipmentTypeId: 'squat_rack', minMaxWeightKg: null },
      { equipmentTypeId: 'dumbbells', minMaxWeightKg: 40 },
    ]);
  });

  it('runs the same search the website runs, on the device', () => {
    const outcome = runSearch(
      {
        ...initialFilters(NOW),
        visitDate: '2026-09-23',
        visitMinuteOfDay: 19 * 60,
        budgetMinor: 3000,
        equipment: ['squat_rack', 'cable_station', 'dumbbells'],
        dumbbellMinKg: 40,
      },
      {},
      new Date('2026-09-22T00:00:00.000Z'),
    );
    // The reference task: the same three confirmed matches the web shows.
    expect(outcome.counts.confirmed).toBe(3);
    expect(outcome.results[0]?.record.location.name).toBe('Ironbark Strength Co.');
  });

  it('turns a suggested relaxation into a filter change only when applied', () => {
    const filters = {
      ...initialFilters(NOW),
      budgetMinor: 3000,
      equipment: ['squat_rack', 'dumbbells'],
      dumbbellMinKg: 40,
    };

    const dropped = applyRelaxation(filters, {
      requiredEquipment: [{ equipmentTypeId: 'dumbbells', minMaxWeightKg: 40 }],
    });
    expect(dropped.equipment).toEqual(['dumbbells']);
    expect(dropped.dumbbellMinKg).toBe(40);

    expect(applyRelaxation(filters, { budgetMinor: null }).budgetMinor).toBeNull();
    expect(applyRelaxation(filters, { visitMinuteOfDay: 14 * 60 }).visitMinuteOfDay).toBe(14 * 60);
    // The original filters are untouched: nothing relaxes behind anyone's back.
    expect(filters.budgetMinor).toBe(3000);
    expect(filters.equipment).toEqual(['squat_rack', 'dumbbells']);
  });

  it('counts active filters for the badge', () => {
    const filters = initialFilters(NOW);
    expect(activeFilterCount(filters)).toBe(0);
    expect(activeFilterCount({ ...filters, equipment: ['bench'], budgetMinor: 3000 })).toBe(2);
  });
});

describe('startup self-check', () => {
  it('passes where full time-zone support exists', () => {
    expect(checkTimeZoneSupport()).toEqual({ ok: true, detail: 'Time-zone support verified.' });
  });
});
