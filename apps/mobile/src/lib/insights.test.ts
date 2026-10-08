import { describe, expect, it } from 'vitest';
import { bestWeekStreak, goalStreak, logToCsv, milestones, muscleBalance, recordsEver, trainingCalendar, weekRange, weekRecap, workoutShareText } from './insights';
import type { Collection, CollectedGym } from '@gymgo/domain';
import type { LoggedExercise, TrainingSession } from './training';

let next = 0;
const session = (finishedAt: string, exercises: LoggedExercise[] = [{ exerciseId: 'back-squat', sets: [{ weight: 60, reps: 8 }] }]): TrainingSession => ({
  id: `s${(next += 1)}`,
  name: 'Legs',
  unit: 'kg',
  startedAt: finishedAt,
  finishedAt,
  workoutId: null,
  gymId: null,
  exercises,
});

// Wednesday 15 May 2024, noon local time.
const NOW = new Date(2024, 4, 15, 12);
const at = (month: number, day: number, hour = 18) => new Date(2024, month, day, hour).toISOString();

describe('trainingCalendar', () => {
  it('lays out the last weeks Monday first, with this week last and its later days marked future', () => {
    const weeks = trainingCalendar([session(at(4, 13)), session(at(4, 13, 7)), session(at(4, 6))], 3, NOW);
    expect(weeks).toHaveLength(3);
    const thisWeek = weeks[2]!;
    expect(new Date(thisWeek.start).getDay()).toBe(1);
    expect(new Date(thisWeek.start).getDate()).toBe(13);
    expect(thisWeek.days[0]!.sessions).toBe(2);
    expect(thisWeek.sessions).toBe(2);
    expect(thisWeek.days[2]!.future).toBe(false); // today
    expect(thisWeek.days[3]!.future).toBe(true);
    expect(weeks[1]!.days[0]!.sessions).toBe(1);
    expect(weeks[0]!.sessions).toBe(0);
  });
});

describe('streaks', () => {
  it('counts weeks in a row that met the goal, not waiting on this week until it is met', () => {
    const log = [session(at(4, 13)), session(at(4, 6)), session(at(4, 8)), session(at(3, 29)), session(at(4, 1))];
    // This week has 1 of 2 so far; the two weeks before met 2.
    expect(goalStreak(log, 2, NOW)).toBe(2);
    expect(goalStreak(log, 1, NOW)).toBe(3);
    expect(goalStreak(log, 3, NOW)).toBe(0);
  });

  it('finds the longest run of weeks ever trained, across a gap', () => {
    const log = [at(0, 2), at(0, 9), at(0, 16), at(1, 20), at(1, 27)].map((iso) => session(iso));
    expect(bestWeekStreak(log)).toBe(3);
    expect(bestWeekStreak([])).toBe(0);
  });
});

describe('milestones', () => {
  it('counts records the way the finish screen does: the first time sets a baseline', () => {
    const squat = (weight: number): LoggedExercise[] => [{ exerciseId: 'back-squat', sets: [{ weight, reps: 5 }] }];
    const log = [session(at(4, 1), squat(60)), session(at(4, 3), squat(70)), session(at(4, 5), squat(65)), session(at(4, 7), squat(75))];
    expect(recordsEver(log)).toBe(2);
  });

  it('reports each ladder with what is reached and what is next', () => {
    const log = Array.from({ length: 12 }, (_, index) => session(at(4, 1 + index)));
    const byKind = Object.fromEntries(milestones(log).map((ladder) => [ladder.kind, ladder]));
    expect(byKind.workouts!.reached).toEqual([1, 10]);
    expect(byKind.workouts!.next).toBe(25);
    expect(byKind.workouts!.label).toBe('12 workouts');
    expect(byKind.sets!.have).toBe(12);
    expect(byKind.sets!.reached).toEqual([]);
    expect(byKind.streak!.have).toBe(2);
    expect(byKind.streak!.label).toBe('Longest run: 2 weeks');
  });

  it('says "1 workout", not "1 workouts"', () => {
    expect(milestones([session(at(4, 1))])[0]!.label).toBe('1 workout');
  });
});

describe('muscleBalance', () => {
  it('counts a set for main muscles and half for helpers, over the window only', () => {
    const recent = session(at(4, 14), [
      { exerciseId: 'back-squat', sets: [{ weight: 60, reps: 8 }, { weight: 60, reps: 8 }] },
      { exerciseId: 'my-own-thing', sets: [{ weight: 10, reps: 10 }] },
    ]);
    const old = session(at(2, 1));
    const balance = muscleBalance([recent, old], 28, NOW);
    expect(balance.sessions).toBe(1);
    expect(balance.unknownSets).toBe(1);
    const quads = balance.muscles.find((item) => item.muscle === 'quadriceps')!;
    expect(quads.sets).toBe(2);
    expect(balance.muscles[0]!.sets).toBeGreaterThanOrEqual(balance.muscles[1]!.sets);
    expect(balance.muscles.find((item) => item.muscle === 'biceps')!.sets).toBe(0);
  });
});

describe('workoutShareText', () => {
  it('says what, how long and how much, the records, then each exercise, and nothing about where', () => {
    const done = { ...session(at(4, 14, 19), [
      { exerciseId: 'back-squat', sets: [{ weight: 100, reps: 5 }, { weight: 100, reps: 5 }] },
      { exerciseId: 'my-own-thing', sets: [{ weight: null, reps: 12 }] },
    ]), startedAt: new Date(2024, 4, 14, 18, 10).toISOString(), gymId: 'dohertys-gym-city' };
    const text = workoutShareText(done, [{ exerciseId: 'back-squat', kind: 'heaviest' }]);
    expect(text.split('\n')[0]).toBe('Legs · 50 min · 3 sets · 1,000 kg lifted');
    expect(text).toContain('New record: Barbell back squat (heaviest yet)');
    expect(text).toContain('Barbell back squat: 100');
    expect(text).toContain('My own thing: × 12');
    expect(text).not.toContain('doherty');
    expect(text.endsWith('Logged with GymGO')).toBe(true);
  });
});

describe('logToCsv', () => {
  it('writes a row a set, oldest first, blank weight for body weight, quoting what needs it', () => {
    const later = session(at(4, 14, 19), [{ exerciseId: 'push-up', sets: [{ weight: null, reps: 12 }] }]);
    const earlier = { ...session(at(4, 10, 7), [{ exerciseId: 'back-squat', sets: [{ weight: 100, reps: 5 }, { weight: 102.5, reps: 3 }] }]), name: 'Legs, heavy' };
    const lines = logToCsv([later, earlier]).trim().split('\n');
    expect(lines[0]).toBe('date,time,workout,exercise,set,weight,unit,reps');
    expect(lines[1]).toBe('2024-05-10,07:00,"Legs, heavy",Barbell back squat,1,100,kg,5');
    expect(lines[2]).toBe('2024-05-10,07:00,"Legs, heavy",Barbell back squat,2,102.5,kg,3');
    expect(lines[3]).toBe('2024-05-14,19:00,Legs,Push-up,1,,,12');
  });
});

describe('weekRecap', () => {
  const gym = (id: string, days: string[], seed = id): CollectedGym => ({
    id, name: id, suburb: 'Carlton', city: 'Melbourne', countryCode: 'AU', brand: null, days, firstAt: `${days[0]}T08:00:00Z`, lastAt: `${days.at(-1)}T08:00:00Z`, seed,
  });

  it('adds up this week: workouts, sets, kilos, records, gyms (and which were new) and the best card', () => {
    const sessions = [
      session(at(4, 6), [{ exerciseId: 'back-squat', sets: [{ weight: 60, reps: 8 }] }]), // last week
      session(at(4, 13), [{ exerciseId: 'back-squat', sets: [{ weight: 70, reps: 8 }, { weight: 70, reps: 8 }] }]), // Monday: a record
      session(at(4, 14), [{ exerciseId: 'back-squat', sets: [{ weight: 60, reps: 8 }] }]),
    ];
    const collection: Collection = {
      a: gym('a', ['2024-05-01', '2024-05-14']), // collected before, visited again this week
      b: gym('b', ['2024-05-13']), // new this week
      c: gym('c', ['2024-05-02']), // not this week
    };
    const recap = weekRecap(sessions, collection, NOW)!;
    expect(recap.which).toBe('this');
    expect(recap.start).toBe(new Date(2024, 4, 13).getTime());
    expect(recap.workouts).toBe(2);
    expect(recap.sets).toBe(3);
    expect(recap.volumeKg).toBe(70 * 8 * 2 + 60 * 8);
    expect(recap.records).toBeGreaterThan(0);
    expect(recap.gymsVisited).toBe(2);
    expect(recap.newGyms).toBe(1);
    expect(['a', 'b']).toContain(recap.bestCard!.id);
    expect(recap.streakWeeks).toBe(2);
  });

  it('shows last week on a Monday morning before anything happens, and nothing when both are empty', () => {
    const monday = new Date(2024, 4, 20, 7);
    const last = weekRecap([session(at(4, 15))], {}, monday)!;
    expect(last.which).toBe('last');
    expect(last.workouts).toBe(1);
    expect(weekRecap([session(at(3, 1))], {}, monday)).toBeNull();
  });

  it('writes the week as a short range', () => {
    expect(weekRange(new Date(2024, 4, 13).getTime())).toBe('13–19 May');
    expect(weekRange(new Date(2024, 3, 29).getTime())).toBe('29 Apr – 5 May');
  });
});
