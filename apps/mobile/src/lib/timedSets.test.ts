import { describe, expect, it } from 'vitest';
import { bestSetLine } from './feed';
import { previousSet } from './previous';
import { recordLine } from './records';
import { checkEdits, draftsOf } from './sessionEdit';
import {
  bestSoFar,
  draftToLogged,
  exerciseSeries,
  parseDistance,
  parseTime,
  personalRecords,
  recordsBroken,
  setCount,
  setLine,
  setsSummary,
  tidyDistance,
  tidyTime,
  volumeKg,
  type LoggedSet,
  type TrainingSession,
} from './training';
import { setMeasure } from './workout';

let next = 0;
function session(finishedAt: string, exercises: Record<string, LoggedSet[]>): TrainingSession {
  next += 1;
  return {
    id: `t${next}`,
    name: 'Core',
    unit: 'kg',
    startedAt: finishedAt,
    finishedAt,
    workoutId: null,
    gymId: null,
    exercises: Object.entries(exercises).map(([exerciseId, sets]) => ({ exerciseId, sets })),
  };
}

const hold = (seconds: number, weight: number | null = null): LoggedSet => ({ weight, reps: 0, seconds });
const carry = (metres: number, weight: number | null = null): LoggedSet => ({ weight, reps: 0, metres });

describe('typing a time or a distance', () => {
  it('reads a time as people type it, in whole seconds', () => {
    expect(parseTime('90')).toBe(90);
    expect(parseTime('1:30')).toBe(90);
    expect(parseTime('0:45')).toBe(45);
    expect(parseTime('1:05:00')).toBe(3900);
    expect(parseTime('2 min')).toBe(120);
    expect(parseTime('1.5 min')).toBe(90);
    expect(parseTime('45 s')).toBe(45);
    expect(parseTime('1m 30s')).toBe(90);
    // Blank, nonsense, a clock with 75 seconds in it, nothing and over six hours: not a time.
    for (const typed of ['', 'soon', '1:75', '0', '7:00:00']) expect(parseTime(typed)).toBeUndefined();
    expect(tidyTime('90')).toBe('1:30');
    expect(tidyTime('45')).toBe('0:45');
    expect(tidyTime('soon')).toBe('soon');
  });

  it('reads a distance in metres, or kilometres', () => {
    expect(parseDistance('40')).toBe(40);
    expect(parseDistance('40 m')).toBe(40);
    expect(parseDistance('1.2 km')).toBe(1200);
    expect(parseDistance('0,4km')).toBe(400);
    for (const typed of ['', 'far', '0', '200 km']) expect(parseDistance(typed)).toBeUndefined();
    expect(tidyDistance('1.2 km')).toBe('1200');
  });

  it('knows which exercises are done by the clock or the tape', () => {
    expect(setMeasure('plank')).toBe('time');
    expect(setMeasure('bike-intervals')).toBe('time');
    expect(setMeasure('farmer-carry')).toBe('distance');
    expect(setMeasure('bench-press')).toBe('reps');
    // One GymGO doesn't know, by its plan.
    expect(setMeasure('mine-handstand', '30–45 s')).toBe('time');
    expect(setMeasure('mine-sled', '20 m')).toBe('distance');
    expect(setMeasure('mine-curl', '8–10')).toBe('reps');
  });
});

describe('a set by the clock or the tape', () => {
  it('is logged with its time or distance, and reps of 0', () => {
    const drafts = [
      { exerciseId: 'plank', measure: 'time' as const, sets: [{ weight: '', reps: '', time: '1:15', done: true }, { weight: '', reps: '', time: '', done: true }, { weight: '', reps: '', time: '0:40', done: false }] },
      { exerciseId: 'farmer-carry', measure: 'distance' as const, sets: [{ weight: '24', reps: '', distance: '40', done: true }] },
    ];
    // A ticked set with no time isn't logged; one not ticked isn't either.
    expect(draftToLogged(drafts)).toEqual([
      { exerciseId: 'plank', sets: [{ weight: null, reps: 0, seconds: 75 }] },
      { exerciseId: 'farmer-carry', sets: [{ weight: 24, reps: 0, metres: 40 }] },
    ]);
  });

  it('counts as a set, adds nothing to the weight lifted, and reads as a time or distance', () => {
    const core = session('2026-11-20T08:00:00Z', { plank: [hold(75), hold(60)], 'farmer-carry': [carry(40, 24)], 'push-up': [{ weight: null, reps: 15 }] });
    expect(setCount(core)).toBe(4);
    expect(volumeKg(core)).toBe(0);
    expect(setsSummary(core.exercises[0]!.sets, 'kg')).toBe('1:15, 1:00');
    expect(setsSummary(core.exercises[1]!.sets, 'kg')).toBe('24\u00a0kg × 40\u00a0m');
    expect(setLine(hold(45, 10), 'kg')).toBe('10\u00a0kg · 45\u00a0s');
    expect(setLine({ weight: null, reps: 0, metres: 400, seconds: 105 }, 'kg')).toBe('400\u00a0m in 1:45');
    expect(bestSetLine(core.exercises[0]!.sets, 'kg')).toBe('1:15');
  });

  it('keeps its own records, never a weight’s, and breaks them', () => {
    const before = session('2026-11-10T08:00:00Z', { plank: [hold(60, 10)], 'farmer-carry': [carry(30, 24)] });
    const after = session('2026-11-17T08:00:00Z', { plank: [hold(50), hold(80)], 'farmer-carry': [carry(45, 20)] });
    const records = personalRecords([before, after]);
    expect(records.get('plank')).toMatchObject({ longestSeconds: 80, heaviestKg: null, e1rmKg: null, mostReps: null, sessions: 2 });
    expect(records.get('farmer-carry')).toMatchObject({ furthestMetres: 45, heaviestKg: null });
    const broken = recordsBroken(after, [before]);
    expect(broken).toEqual([
      { exerciseId: 'plank', kind: 'longest' },
      { exerciseId: 'farmer-carry', kind: 'furthest' },
    ]);
    expect(recordLine(after, broken[0]!)).toBe('1:20');
    expect(exerciseSeries([before, after], 'plank', 'longest').map((point) => point.kg)).toEqual([60, 80]);
    // A plank's plate isn't on the weight charts.
    expect(exerciseSeries([before, after], 'plank', 'heaviest')).toEqual([]);
  });

  it('marks a longer hold as you tick it', () => {
    const before = personalRecords([session('2026-11-10T08:00:00Z', { plank: [hold(60)] })]).get('plank');
    const sets = [
      { weight: '', reps: '', time: '0:50', done: true },
      { weight: '', reps: '', time: '1:10', done: true },
      { weight: '', reps: '', time: '1:05', done: true },
    ];
    expect(bestSoFar(sets, 'kg', before, 'time')).toEqual([null, 'longest', null]);
  });

  it('shows last time’s at the same place as Previous, to copy in', () => {
    const last = { sets: [hold(75), hold(60)], unit: 'kg' as const };
    expect(previousSet(last, [{}, {}], 1, 'kg')).toEqual({ weight: '', reps: '', time: '1:00', label: '1:00' });
    expect(previousSet({ sets: [carry(40, 24)], unit: 'kg' }, [{}], 0, 'kg')).toEqual({ weight: '24', reps: '', distance: '40', label: '24 × 40\u00a0m' });
  });

  it('can be changed after it’s logged, and isn’t dropped', () => {
    const logged = session('2026-11-20T08:00:00Z', { plank: [hold(75)], 'farmer-carry': [carry(40, 24)] });
    const drafts = draftsOf(logged);
    expect(drafts[0]).toMatchObject({ measure: 'time', sets: [{ time: '1:15', reps: '' }] });
    expect(drafts[1]).toMatchObject({ measure: 'distance', sets: [{ weight: '24', distance: '40' }] });
    expect(checkEdits(drafts, 'kg')).toEqual({ ok: true, exercises: logged.exercises });
    drafts[0]!.sets[0]!.time = '';
    expect(checkEdits(drafts, 'kg')).toMatchObject({ ok: false, problem: expect.stringMatching(/how long it took/) });
  });
});
