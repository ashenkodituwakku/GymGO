import { describe, expect, it } from 'vitest';
import { minutesLabel, planMinutes, planSets } from './workoutStats';

describe('a plan’s summary', () => {
  it('estimates the time from the sets, the rests and the changes between exercises', () => {
    // 3 sets: 120 s work + 2 × 90 s rest = 300 s; twice, plus 90 s between = 690 s, about 11.5 min.
    expect(planMinutes([{ sets: 3, restSeconds: 90 }, { sets: 3, restSeconds: 90 }])).toBe(10);
    // Six exercises of 4 × 2 min rest: 6 × (160 + 360) + 5 × 90 = 3570 s, about an hour.
    expect(planMinutes(Array.from({ length: 6 }, () => ({ sets: 4, restSeconds: 120 })))).toBe(60);
  });

  it('gives a finisher ten minutes and counts none of its sets', () => {
    const lines = [{ sets: 3, restSeconds: 60 }, { sets: 1, restSeconds: 0, cardio: true }];
    expect(planMinutes(lines)).toBe(15);
    expect(planSets(lines)).toBe(3);
  });

  it('is nothing for an empty plan and never under five minutes otherwise', () => {
    expect(planMinutes([])).toBe(0);
    expect(planMinutes([{ sets: 1, restSeconds: 0 }])).toBe(5);
  });

  it('reads as minutes, then hours and minutes', () => {
    expect(minutesLabel(45)).toBe('about 45 min');
    expect(minutesLabel(60)).toBe('about 1 h');
    expect(minutesLabel(75)).toBe('about 1 h 15 min');
  });
});
