import { describe, expect, it } from 'vitest';
import { keptValue } from './bodyMeasures';
import { parseReps, parseWeight, tidyReps, tidyWeight } from './training';

describe('reading what people type (accept messy, keep clean)', () => {
  it('reads a weight with its unit, a comma or a trailing point', () => {
    expect(tidyWeight('62.5 kg', 'kg')).toBe('62.5');
    expect(tidyWeight('62,5kg', 'kg')).toBe('62.5');
    expect(tidyWeight('100.', 'kg')).toBe('100');
    expect(tidyWeight(' 225 lbs ', 'lb')).toBe('225');
    expect(parseWeight(tidyWeight('62.5 KG', 'kg'))).toBe(62.5);
  });

  it('converts a weight typed in the other unit, to a tenth', () => {
    expect(tidyWeight('135 lb', 'kg')).toBe('61.2');
    expect(tidyWeight('60 kg', 'lb')).toBe('132.3');
  });

  it('leaves what still isn’t a weight as typed, so the box can say so', () => {
    expect(tidyWeight('heavy', 'kg')).toBe('heavy');
    expect(tidyWeight('', 'kg')).toBe('');
    expect(parseWeight(tidyWeight('heavy', 'kg'))).toBeUndefined();
  });

  it('reads reps with a word or an x', () => {
    expect(tidyReps('8 reps')).toBe('8');
    expect(tidyReps('1 rep')).toBe('1');
    expect(tidyReps('8x')).toBe('8');
    expect(tidyReps('x 10')).toBe('10');
    expect(parseReps(tidyReps('12'))).toBe(12);
    expect(tidyReps('lots')).toBe('lots');
  });

  it('reads a measurement with its unit, converting the other length', () => {
    expect(keptValue('waist', '82.5 cm', 'cm')).toBe(82.5);
    expect(keptValue('waist', '82,5', 'cm')).toBe(82.5);
    // Inches typed while showing centimetres: kept in centimetres.
    expect(keptValue('waist', '32 in', 'cm')).toBeCloseTo(81.28, 2);
    expect(keptValue('waist', '32"', 'cm')).toBeCloseTo(81.28, 2);
    expect(keptValue('bodyFat', '18 %', 'cm')).toBe(18);
    expect(keptValue('waist', 'wide', 'cm')).toBeNull();
  });
});
