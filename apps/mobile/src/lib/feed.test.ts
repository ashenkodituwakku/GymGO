import { describe, expect, it } from 'vitest';
import type { FeedItem } from './api';
import { ahead, bestLine, friendWorkoutPlan, muscleSplit, bestSetLine, feedCardLabel, feedExerciseName, feedWhen, likedLine, recordsFor, volumeLine } from './feed';

describe('when a workout was, in the feed', () => {
  const now = new Date(2026, 10, 23, 18, 0); // 23 Nov 2026, 6 pm, this device's time
  it('says minutes and hours today', () => {
    expect(feedWhen(new Date(2026, 10, 23, 17, 59, 30).toISOString(), now)).toBe('Just now');
    expect(feedWhen(new Date(2026, 10, 23, 17, 48).toISOString(), now)).toBe('12 min ago');
    expect(feedWhen(new Date(2026, 10, 23, 14, 30).toISOString(), now)).toBe('3 h ago');
  });
  it('says yesterday, the weekday, then the date', () => {
    expect(feedWhen(new Date(2026, 10, 22, 21, 0).toISOString(), now)).toBe('Yesterday');
    expect(feedWhen(new Date(2026, 10, 19, 9, 0).toISOString(), now)).toBe('Thursday');
    expect(feedWhen(new Date(2026, 10, 12, 9, 0).toISOString(), now)).toBe('12 Nov');
    expect(feedWhen(new Date(2025, 11, 30, 9, 0).toISOString(), now)).toBe('30 Dec 2025');
  });
});

describe('who liked it', () => {
  const max = { id: 'm', displayName: 'Max', avatarUrl: null };
  const ana = { id: 'a', displayName: 'Ana', avatarUrl: null };
  const you = { id: 'y', displayName: 'Me', avatarUrl: null };
  it('names you first, then friends, then how many more', () => {
    expect(likedLine({ likes: 0, liked: false, likedBy: [] })).toBe('');
    expect(likedLine({ likes: 1, liked: false, likedBy: [max] })).toBe('Max likes this');
    expect(likedLine({ likes: 1, liked: true, likedBy: [you] })).toBe('You like this');
    expect(likedLine({ likes: 2, liked: true, likedBy: [you, max] })).toBe('You and Max like this');
    expect(likedLine({ likes: 2, liked: false, likedBy: [max, ana] })).toBe('Max and Ana like this');
    expect(likedLine({ likes: 5, liked: false, likedBy: [max, ana] })).toBe('Max and 4 others like this');
    expect(likedLine({ likes: 2, liked: false, likedBy: [] })).toBe('2 people like this');
  });
});

describe('a workout’s numbers', () => {
  it('picks the heaviest working set, or the most reps at body weight', () => {
    expect(bestSetLine([{ weight: 60, reps: 10, kind: 'warmup' }, { weight: 100, reps: 5 }, { weight: 100, reps: 6 }, { weight: 90, reps: 8 }], 'kg')).toBe('100 kg × 6');
    expect(bestSetLine([{ weight: null, reps: 12 }, { weight: null, reps: 15 }], 'lb')).toBe('15 reps');
    expect(bestSetLine([{ weight: 20, reps: 0 }], 'kg')).toBe('');
  });
  it('gives the volume in the lifter’s unit', () => {
    expect(volumeLine(4320.4, 'kg')).toBe('4,320 kg');
    expect(volumeLine(100, 'lb')).toBe('220 lb');
  });
  it('names the exercise its owner made, or GymGO’s', () => {
    expect(feedExerciseName({ exerciseId: 'mine-abcdefghij', name: 'Landmine twist' })).toBe('Landmine twist');
    expect(feedExerciseName({ exerciseId: 'romanian-deadlift-xyz' })).toBe('Romanian deadlift xyz');
  });
  it('says the records an exercise broke', () => {
    expect(recordsFor([{ exerciseId: 'a', kind: 'heaviest' }, { exerciseId: 'a', kind: 'reps' }, { exerciseId: 'b', kind: 'e1rm' }], 'a')).toBe('Heaviest yet · Most reps yet');
  });
});

describe('a card, to a screen reader', () => {
  it('says who, what, when and how it went', () => {
    const item: FeedItem = {
      id: 'w',
      person: { id: 'p', displayName: 'Sam', avatarUrl: null },
      you: false,
      name: 'Push day',
      unit: 'kg',
      startedAt: '2026-11-23T16:00:00.000Z',
      finishedAt: '2026-11-23T16:48:00.000Z',
      exercises: [],
      volumeKg: 3200,
      sets: 12,
      records: [{ exerciseId: 'x', kind: 'heaviest' }],
      likes: 2,
      liked: false,
      likedBy: [],
      comments: 1,
    };
    expect(feedCardLabel(item, new Date('2026-11-23T17:00:00.000Z'))).toBe('Sam: Push day, 12 min ago. 48 min. 3,200 kg lifted. 12 sets. 1 record. 2 likes. 1 comment');
  });
});

describe('head to head', () => {
  it('says each side’s best in your unit', () => {
    expect(bestLine({ heaviestKg: 100, e1rmKg: 113.3, mostReps: null }, 'kg')).toEqual({ main: '100\u00a0kg', under: '1-rep max 113.5\u00a0kg' });
    expect(bestLine({ heaviestKg: 100, e1rmKg: null, mostReps: null }, 'lb')).toEqual({ main: '220.5\u00a0lb', under: null });
    expect(bestLine({ heaviestKg: null, e1rmKg: null, mostReps: 15 }, 'kg')).toEqual({ main: '15 reps', under: null });
  });
  it('says who’s ahead: heavier, then stronger, then more reps', () => {
    expect(ahead({ heaviestKg: 100, e1rmKg: 110, mostReps: null }, { heaviestKg: 90, e1rmKg: 120, mostReps: null })).toBe('you');
    expect(ahead({ heaviestKg: 100, e1rmKg: 110, mostReps: null }, { heaviestKg: 100, e1rmKg: 120, mostReps: null })).toBe('them');
    expect(ahead({ heaviestKg: null, e1rmKg: null, mostReps: 12 }, { heaviestKg: null, e1rmKg: null, mostReps: 12 })).toBeNull();
  });
});

describe('muscle split', () => {
  it('shares a workout’s sets among the muscles it worked, biggest first', () => {
    const split = muscleSplit([
      { exerciseId: 'bench-press', sets: [{ weight: 60, reps: 8, kind: 'warmup' }, { weight: 80, reps: 5 }, { weight: 80, reps: 5 }] },
      { exerciseId: 'back-squat', sets: [{ weight: 100, reps: 5 }, { weight: 100, reps: 5 }] },
    ]);
    expect(split[0]!.share).toBeGreaterThan(0);
    expect(split.reduce((sum, item) => sum + item.share, 0)).toBeLessThanOrEqual(1.0001);
    expect(split.map((item) => item.label)).toEqual(expect.arrayContaining(['Chest', 'Quads']));
    for (let at = 1; at < split.length; at++) expect(split[at - 1]!.share).toBeGreaterThanOrEqual(split[at]!.share);
  });
  it('is empty for exercises it doesn’t know or sets not done', () => {
    expect(muscleSplit([{ exerciseId: 'mine-abcdefghij', sets: [{ weight: 10, reps: 10 }] }])).toEqual([]);
    expect(muscleSplit([{ exerciseId: 'bench-press', sets: [{ weight: 10, reps: 0 }] }])).toEqual([]);
  });
});

describe('a friend’s workout, to keep', () => {
  it('is the same exercises, sets and reps, without their own exercises, in a saved workout’s limits', () => {
    const many = Array.from({ length: 14 }, (_, at) => ({ exerciseId: at === 0 ? 'mine-abcdefghij' : 'bench-press', sets: Array.from({ length: at === 1 ? 12 : 3 }, () => ({ weight: 50, reps: 8 })) }));
    const kept = friendWorkoutPlan({ id: 'w', name: 'Their push day', unit: 'kg', startedAt: '2026-11-23T10:00:00Z', finishedAt: '2026-11-23T11:00:00Z', exercises: many })!;
    expect(kept.name).toBe('Their push day');
    expect(kept.plan.items).toHaveLength(12);
    expect(kept.plan.items.every((item) => !item.exerciseId.startsWith('mine-'))).toBe(true);
    expect(kept.plan.items[0]!.sets).toBe(10);
    expect(kept.plan.items[1]).toMatchObject({ sets: 3, reps: '8', uses: [], confirmed: false });
  });
  it('is nothing when only their own exercises are in it', () => {
    expect(friendWorkoutPlan({ id: 'w', name: 'Mine', unit: 'kg', startedAt: '2026-11-23T10:00:00Z', finishedAt: '2026-11-23T11:00:00Z', exercises: [{ exerciseId: 'mine-abcdefghij', sets: [{ weight: 10, reps: 10 }] }] })).toBeNull();
  });
});
