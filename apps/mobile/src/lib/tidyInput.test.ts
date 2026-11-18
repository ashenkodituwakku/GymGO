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

  it('reads a comma before groups of three as a thousands comma, not a decimal one', () => {
    expect(tidyWeight('1,000', 'lb')).toBe('1000');
    expect(tidyWeight('1,000 lbs', 'lb')).toBe('1000');
    expect(tidyWeight('1,200.5 lb', 'lb')).toBe('1200.5');
    expect(parseWeight('1,000')).toBe(1000);
    // A decimal comma is still one.
    expect(tidyWeight('2,25 kg', 'kg')).toBe('2.25');
    expect(tidyWeight('100,0', 'kg')).toBe('100');
    expect(parseWeight('62,5')).toBe(62.5);
    // Three places after a comma is a thousand, never a silent 62.5: over the limit, so the box says so.
    expect(parseWeight(tidyWeight('62,500', 'kg'))).toBeUndefined();
  });

  it('drops the zeros in front of reps', () => {
    expect(tidyReps('08')).toBe('8');
    expect(tidyReps('0')).toBe('0');
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
