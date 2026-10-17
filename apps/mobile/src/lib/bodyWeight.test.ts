import { describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({ default: { getItem: vi.fn(), setItem: vi.fn() } }));

const { localToday, parseWeighIns, recentWeighIns, weightChange, withWeighIn, withoutWeighIn } = await import('./bodyWeight');

describe('body weight', () => {
  it('reads what was kept, oldest first, one a day, leaving out damage and slips of the finger', () => {
    const raw = JSON.stringify([
      { date: '2026-10-02', kg: 80 },
      { date: '2026-10-01', kg: 81 },
      { date: '2026-10-02', kg: 79.5 },
      { date: '2026-10-03', kg: 7 },
      { date: 'yesterday', kg: 80 },
      { date: '2026-10-04', kg: '80' },
      null,
    ]);
    expect(parseWeighIns(raw)).toEqual([
      { date: '2026-10-01', kg: 81 },
      { date: '2026-10-02', kg: 79.5 },
    ]);
    expect(parseWeighIns('nonsense')).toEqual([]);
    expect(parseWeighIns(JSON.stringify({ date: '2026-10-01', kg: 80 }))).toEqual([]);
  });

  it('keeps one weigh-in a day, the latest given, and refuses the implausible', () => {
    let list = withWeighIn([], '2026-10-02', 80.123);
    list = withWeighIn(list, '2026-10-01', 81);
    list = withWeighIn(list, '2026-10-02', 79.8);
    expect(list).toEqual([
      { date: '2026-10-01', kg: 81 },
      { date: '2026-10-02', kg: 79.8 },
    ]);
    expect(withWeighIn(list, '2026-10-03', 900)).toBe(list);
    expect(withoutWeighIn(list, '2026-10-01')).toEqual([{ date: '2026-10-02', kg: 79.8 }]);
  });

  it('compares the latest with about a month before, and says nothing within a week', () => {
    const list = [
      { date: '2026-08-20', kg: 84 },
      { date: '2026-09-10', kg: 82 },
      { date: '2026-09-20', kg: 81.5 },
      { date: '2026-10-15', kg: 80.2 },
    ];
    expect(weightChange(list)).toEqual({ kg: -1.8, since: '2026-09-10', days: 35 });
    // Under a month of weigh-ins: from the first, once it's a week back.
    expect(weightChange(list.slice(2))).toEqual({ kg: -1.3, since: '2026-09-20', days: 25 });
    expect(weightChange([{ date: '2026-10-10', kg: 80 }, { date: '2026-10-15', kg: 79 }])).toBeNull();
    expect(weightChange([])).toBeNull();
  });

  it('draws the last ninety days', () => {
    const list = [
      { date: '2026-06-01', kg: 85 },
      { date: '2026-08-01', kg: 83 },
      { date: '2026-10-17', kg: 80 },
    ];
    expect(recentWeighIns(list, '2026-10-17').map((entry) => entry.date)).toEqual(['2026-08-01', '2026-10-17']);
  });

  it('dates a weigh-in on the phone’s own calendar', () => {
    expect(localToday(new Date(2026, 9, 7, 23, 30))).toBe('2026-10-07');
  });
});
