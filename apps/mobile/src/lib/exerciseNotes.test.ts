import { describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => {
  const kept = new Map<string, string>();
  return {
    default: {
      getItem: async (key: string) => kept.get(key) ?? null,
      setItem: async (key: string, value: string) => void kept.set(key, value),
      removeItem: async (key: string) => void kept.delete(key),
    },
  };
});

const { EXERCISE_NOTE_LIMIT, cleanExerciseNotes, exerciseNotes, setExerciseNote, tidyNote } = await import('./exerciseNotes');

describe('notes on exercises', () => {
  it('keeps what was stored only if it’s a note on an exercise id', () => {
    expect(cleanExerciseNotes({ 'bench-press': '  Seat on 4  ', 'Bad Id!': 'x', squat: 42, 'leg-press': '   ' })).toEqual({ 'bench-press': 'Seat on 4' });
    expect(cleanExerciseNotes(null)).toEqual({});
    expect(cleanExerciseNotes(['bench-press'])).toEqual({});
  });

  it('tidies a note: spaces folded, a blank line at most, cut to the limit', () => {
    expect(tidyNote('Grip   just\toutside\r\n\r\n\r\n\r\nthe rings ')).toBe('Grip just outside\n\nthe rings');
    expect(tidyNote('x'.repeat(EXERCISE_NOTE_LIMIT + 50))).toHaveLength(EXERCISE_NOTE_LIMIT);
  });

  it('keeps a note, changes it, and removes a blank one', () => {
    setExerciseNote('bench-press', ' Seat on 4 ');
    setExerciseNote('back-squat', 'Belt on from 100 kg');
    expect(exerciseNotes.get()).toEqual({ 'bench-press': 'Seat on 4', 'back-squat': 'Belt on from 100 kg' });
    setExerciseNote('bench-press', '   ');
    expect(exerciseNotes.get()).toEqual({ 'back-squat': 'Belt on from 100 kg' });
  });
});
