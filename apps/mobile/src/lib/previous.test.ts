import { describe, expect, it } from 'vitest';
import { previousSet } from './previous';

describe('previous, beside each set', () => {
  const last = {
    unit: 'kg' as const,
    sets: [
      { weight: 60, reps: 8, kind: 'warmup' as const },
      { weight: 100, reps: 5 },
      { weight: 100, reps: 4 },
      { weight: 80, reps: 0 },
    ],
  };
  it('matches a warm-up with a warm-up, the second working set with the second', () => {
    expect(previousSet(last, [{ kind: 'warmup' }, {}, {}], 0, 'kg')).toEqual({ weight: '60', reps: '8', label: '60 × 8' });
    expect(previousSet(last, [{ kind: 'warmup' }, {}, {}], 2, 'kg')).toEqual({ weight: '100', reps: '4', label: '100 × 4' });
    // No warm-up this time: the first set is the first working set.
    expect(previousSet(last, [{}, {}], 0, 'kg')?.label).toBe('100 × 5');
  });
  it('leaves out sets not done, and says nothing past the last one', () => {
    expect(previousSet(last, [{}, {}, {}], 2, 'kg')).toBeNull();
    expect(previousSet(null, [{}], 0, 'kg')).toBeNull();
  });
  it('converts to this workout’s unit, as a gym loads it', () => {
    expect(previousSet(last, [{}], 0, 'lb')?.label).toBe('220 × 5');
    expect(previousSet({ unit: 'lb', sets: [{ weight: 135, reps: 10 }] }, [{}], 0, 'kg')?.label).toBe('61 × 10');
  });
  it('says reps for body weight, with no weight to copy', () => {
    expect(previousSet({ unit: 'kg', sets: [{ weight: null, reps: 12 }] }, [{}], 0, 'kg')).toEqual({ weight: '', reps: '12', label: '12 reps' });
  });
});
