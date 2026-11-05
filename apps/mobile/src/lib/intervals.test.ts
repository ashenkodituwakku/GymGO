import { describe, expect, it } from 'vitest';
import { STANDARD_TIMERS, cleanTimers, describePlan, phaseAt, totalSeconds } from './intervals';

const tabata = STANDARD_TIMERS[0]!;
const emom = STANDARD_TIMERS[1]!;

describe('the interval timer', () => {
  it('runs a lead-in, then work and rest, with no rest after the last round', () => {
    expect(totalSeconds(tabata)).toBe(5 + 8 * 20 + 7 * 10);
    expect(phaseAt(tabata, 0)).toEqual({ kind: 'ready', round: 0, remaining: 5, length: 5 });
    expect(phaseAt(tabata, 5)).toEqual({ kind: 'work', round: 1, remaining: 20, length: 20 });
    expect(phaseAt(tabata, 24.5)).toMatchObject({ kind: 'work', round: 1, remaining: 0.5 });
    expect(phaseAt(tabata, 25)).toEqual({ kind: 'rest', round: 1, remaining: 10, length: 10 });
    expect(phaseAt(tabata, 35)).toMatchObject({ kind: 'work', round: 2 });
    // The last round's work ends the timer.
    expect(phaseAt(tabata, totalSeconds(tabata) - 1)).toMatchObject({ kind: 'work', round: 8, remaining: 1 });
    expect(phaseAt(tabata, totalSeconds(tabata))).toEqual({ kind: 'done', round: 8, remaining: 0, length: 0 });
  });

  it('runs EMOM as back-to-back minutes', () => {
    expect(totalSeconds(emom, 0)).toBe(600);
    expect(phaseAt(emom, 5 + 60)).toMatchObject({ kind: 'work', round: 2, remaining: 60 });
    expect(describePlan(emom)).toBe('1 min work, 10 rounds · 10:00');
    expect(describePlan(tabata)).toBe('20 s work, 10 s rest, 8 rounds · 3:50');
  });

  it('keeps only well-formed timers of your own, within limits, ten at most', () => {
    const stored = [
      { id: 'a', name: '  Hill sprints ', work: 30, rest: 90, rounds: 6 },
      { id: 'b', name: 'Too much', work: 5000, rest: -3, rounds: 0 },
      { id: 'c', name: 'Broken', work: 'lots', rest: 10, rounds: 3 },
      null,
      ...Array.from({ length: 20 }, (_, i) => ({ id: `x${i}`, name: '', work: 20, rest: 10, rounds: 8 })),
    ];
    const clean = cleanTimers(stored);
    expect(clean).toHaveLength(10);
    expect(clean[0]).toEqual({ id: 'a', name: 'Hill sprints', work: 30, rest: 90, rounds: 6 });
    expect(clean[1]).toEqual({ id: 'b', name: 'Too much', work: 600, rest: 0, rounds: 1 });
    expect(clean[2]!.name).toBe('My timer');
    expect(cleanTimers('nope')).toEqual([]);
  });
});
