import { describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: async () => null, setItem: async () => undefined, removeItem: async () => undefined },
}));

const { STARTER_MEASURES, cleanMeasureDays, formMeasures, keptValue, latestOf, lengthUnitFor, seriesOf, shownValue, valueLabel, withMeasures, withoutDay } = await import('./bodyMeasures');

describe('body measurements', () => {
  it('reads what’s typed in cm, inches or %, and refuses what no body measures', () => {
    expect(keptValue('waist', '82,5', 'cm')).toBe(82.5);
    expect(keptValue('waist', '32.5', 'in')).toBe(82.55);
    expect(keptValue('bodyFat', '18', 'in')).toBe(18);
    expect(keptValue('waist', '8', 'cm')).toBeNull();
    expect(keptValue('upperArm', '150', 'cm')).toBeNull();
    expect(keptValue('chest', 'big', 'cm')).toBeNull();
    expect(lengthUnitFor('lb')).toBe('in');
  });

  it('shows a value in your unit, to a tenth', () => {
    expect(shownValue('waist', 82.55, 'in')).toBe(32.5);
    expect(valueLabel('waist', 82.5, 'cm')).toBe('82.5 cm');
    expect(valueLabel('bodyFat', 18.25, 'in')).toBe('18.3 %');
  });

  it('keeps a day once: measuring again replaces, anything else that day stays', () => {
    let days = withMeasures([], '2026-10-01', { waist: 84, chest: 100 });
    days = withMeasures(days, '2026-10-01', { waist: 83.5, upperArm: 36 });
    days = withMeasures(days, '2026-09-01', { waist: 86 });
    expect(days).toEqual([
      { date: '2026-09-01', values: { waist: 86 } },
      { date: '2026-10-01', values: { waist: 83.5, chest: 100, upperArm: 36 } },
    ]);
    // Something implausible isn't kept; a day with nothing left goes.
    expect(withMeasures([], '2026-10-02', { waist: 9 })).toEqual([]);
    expect(withoutDay(days, '2026-09-01').map((day) => day.date)).toEqual(['2026-10-01']);
  });

  it('cleans what was stored', () => {
    expect(cleanMeasureDays([{ date: '2026-10-01', values: { waist: 84, chest: 'x', calf: 500, made: 3 } }, { date: 'soon', values: { waist: 80 } }, null])).toEqual([{ date: '2026-10-01', values: { waist: 84 } }]);
    expect(cleanMeasureDays({})).toEqual([]);
  });

  it('gives the latest and the change over about a month, and the line to draw', () => {
    const days = [
      { date: '2026-08-01', values: { waist: 88 } },
      { date: '2026-09-20', values: { waist: 86, chest: 101 } },
      { date: '2026-10-25', values: { waist: 84.5 } },
      { date: '2026-10-28', values: { chest: 102 } },
    ];
    expect(latestOf(days, 'waist')).toEqual({ value: 84.5, date: '2026-10-25', change: { by: -1.5, since: '2026-09-20' } });
    expect(latestOf(days, 'chest')).toEqual({ value: 102, date: '2026-10-28', change: { by: 1, since: '2026-09-20' } });
    expect(latestOf(days, 'calf')).toBeNull();
    // Less than a week apart: nothing to say yet.
    expect(latestOf([{ date: '2026-10-25', values: { neck: 38 } }, { date: '2026-10-28', values: { neck: 38.5 } }], 'neck')!.change).toBeNull();
    expect(seriesOf(days, 'chest')).toEqual([{ date: '2026-09-20', value: 101 }, { date: '2026-10-28', value: 102 }]);
  });

  it('starts the form with four common measures, then shows the ones you measure, in the usual order', () => {
    expect(formMeasures([])).toEqual(['waist', 'chest', 'upperArm', 'bodyFat']);
    expect(STARTER_MEASURES).toHaveLength(4);
    const days = [
      { date: '2026-09-20', values: { calf: 38, waist: 86 } },
      { date: '2026-10-20', values: { neck: 39, waist: 85 } },
    ];
    expect(formMeasures(days)).toEqual(['waist', 'neck', 'calf']);
  });
});
