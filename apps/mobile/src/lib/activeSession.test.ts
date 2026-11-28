import { describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({ default: { getItem: async () => null, setItem: async () => undefined, removeItem: async () => undefined } }));

const { sessionGlance } = await import('./activeSession');
type Session = Parameters<typeof sessionGlance>[0] & object;

const session = (sets: Array<{ weight: string; reps: string; done: boolean }>, name = 'Push day'): Session => ({
  name,
  workoutId: null,
  gymId: null,
  gymName: null,
  unit: 'kg',
  startedAt: '2026-10-17T08:00:00.000Z',
  items: [{ exerciseId: 'bench', sets }],
  restEndsAt: null,
  restTotal: 0,
}) as unknown as Session;

describe('the glance at a workout in progress, for the screens that point back to it', () => {
  it('stays the same object while numbers are typed, so those screens are not drawn again', () => {
    const a = sessionGlance(session([{ weight: '', reps: '', done: false }]));
    const b = sessionGlance(session([{ weight: '62.5', reps: '5', done: false }]));
    expect(b).toBe(a);
    expect(a).toEqual({ name: 'Push day', setsDone: 0 });
  });

  it('changes when a set is ticked, the workout is renamed, or it ends', () => {
    const a = sessionGlance(session([{ weight: '60', reps: '5', done: false }]));
    const ticked = sessionGlance(session([{ weight: '60', reps: '5', done: true }]));
    expect(ticked).not.toBe(a);
    expect(ticked?.setsDone).toBe(1);
    const renamed = sessionGlance(session([{ weight: '60', reps: '5', done: true }], 'Legs'));
    expect(renamed?.name).toBe('Legs');
    expect(sessionGlance(null)).toBeNull();
  });
});
