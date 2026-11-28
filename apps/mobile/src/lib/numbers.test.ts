import { describe, expect, it } from 'vitest';
import { compactNumber } from './numbers';

describe('big numbers in a small tile', () => {
  it('writes counts out until they get long, then shortens them', () => {
    expect(compactNumber(0)).toBe('0');
    expect(compactNumber(9_999)).toBe('9,999');
    expect(compactNumber(10_000)).toBe('10k');
    expect(compactNumber(35_839)).toBe('35.8k');
    expect(compactNumber(99_960)).toBe('100k');
    expect(compactNumber(135_400)).toBe('135k');
    expect(compactNumber(999_499)).toBe('999k');
    expect(compactNumber(1_000_000)).toBe('1M');
    expect(compactNumber(1_249_000)).toBe('1.2M');
    expect(compactNumber(12_500_000)).toBe('12.5M');
  });
});
