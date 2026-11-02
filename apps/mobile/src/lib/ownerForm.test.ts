import { describe, expect, it } from 'vitest';
import { parseClock, parsePrice, weekFrom, windowsFrom } from './ownerForm';

describe('the owner’s forms', () => {
  it('read times as people write them', () => {
    expect(parseClock('06:00')).toBe(360);
    expect(parseClock('6.30')).toBe(390);
    expect(parseClock('24:00')).toBe(1440);
    expect(parseClock('25:00')).toBeNull();
    expect(parseClock('6pm')).toBeNull();
  });

  it('turn a week into windows, a close before the open running past midnight', () => {
    const week = weekFrom(null).map((day, index) => (index === 0 ? { ...day, open: false } : index === 6 ? { open: true, from: '16:00', to: '02:00' } : day));
    const result = windowsFrom(week);
    expect('windows' in result && result.windows).toEqual([
      { day: 1, openMinute: 360, closeMinute: 1260 },
      { day: 2, openMinute: 360, closeMinute: 1260 },
      { day: 3, openMinute: 360, closeMinute: 1260 },
      { day: 4, openMinute: 360, closeMinute: 1260 },
      { day: 5, openMinute: 360, closeMinute: 1260 },
      { day: 6, openMinute: 960, closeMinute: 1560 },
    ]);
    expect(windowsFrom(week.map((day) => ({ ...day, open: false })))).toEqual({ problem: 'Open at least one day, or say it’s open round the clock.' });
    expect(windowsFrom([{ open: true, from: 'nine', to: '17:00' }])).toEqual({ problem: 'Sunday: write the times like 06:00 and 21:00.' });
  });

  it('start from the record’s visitor hours', () => {
    const week = weekFrom({ windows: [{ day: 1, openMinute: 420, closeMinute: 1200 }] } as never);
    expect(week[1]).toEqual({ open: true, from: '07:00', to: '20:00' });
    expect(week[0]!.open).toBe(false);
  });

  it('read prices in the currency’s own sizes', () => {
    expect(parsePrice('25')).toBe(2500);
    expect(parsePrice('A$12.50')).toBe(1250);
    expect(parsePrice('¥1,500')).toBe(150000);
    expect(parsePrice('24,50')).toBe(2450);
    expect(parsePrice('free')).toBeNull();
  });
});

describe('the class timetable form', () => {
  it('starts from the timetable showing, or one class to fill in', async () => {
    const { rowsFrom } = await import('./ownerForm');
    expect(rowsFrom(undefined)).toEqual([{ day: 1, from: '06:00', to: '06:45', name: '' }]);
    expect(rowsFrom({ classes: [{ day: 3, startMinute: 1080, endMinute: 1125, name: 'Spin' }], provenance: { status: 'owner_confirmed', sources: [] } })).toEqual([
      { day: 3, from: '18:00', to: '18:45', name: 'Spin' },
    ]);
  });

  it('turns rows into classes, or says which one is wrong', async () => {
    const { classesFrom } = await import('./ownerForm');
    expect(classesFrom([{ day: 3, from: '18:00', to: '18:45', name: ' Spin ' }])).toEqual({ classes: [{ day: 3, startMinute: 1080, endMinute: 1125, name: 'Spin' }] });
    expect(classesFrom([{ day: 3, from: '6pm', to: '18:45', name: 'Spin' }])).toEqual({ problem: 'Spin (Wednesday): write the times like 06:00 and 06:45.' });
    expect(classesFrom([{ day: 3, from: '18:00', to: '17:00', name: 'Spin' }])).toEqual({ problem: 'Spin (Wednesday): it has to end after it starts, the same day.' });
    expect(classesFrom([{ day: 1, from: '06:00', to: '07:00', name: '' }])).toEqual({ problem: 'Class 1: give it a name.' });
    expect(classesFrom([])).toEqual({ problem: 'Add at least one class.' });
  });
});
