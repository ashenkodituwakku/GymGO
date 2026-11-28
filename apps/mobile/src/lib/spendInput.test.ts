import { describe, expect, it } from 'vitest';
import { MOST_AMOUNT, isRealDay, readAmount } from './spendInput';

describe('reading what you pay', () => {
  it('reads amounts as people type them', () => {
    expect(readAmount('19.99')).toBe(19.99);
    expect(readAmount(' $19.99 ')).toBe(19.99);
    expect(readAmount('A$20')).toBe(20);
    expect(readAmount('1,200')).toBe(1200);
    expect(readAmount('1 200')).toBe(1200);
    expect(readAmount('19,99')).toBe(19.99);
    expect(readAmount('12,345.50')).toBe(12345.5);
  });

  it('turns down what isn’t an amount, rather than guessing', () => {
    for (const typed of ['', 'abc', '-5', '1e6', '12..5', '0', '0.00', '19.999', '1.2.3', String(MOST_AMOUNT + 1)]) expect(readAmount(typed), typed).toBeNull();
  });

  it('takes only real days', () => {
    expect(isRealDay('2026-10-01')).toBe(true);
    expect(isRealDay('2028-02-29')).toBe(true);
    for (const typed of ['2026-02-31', '2026-02-29', '2026-04-31', '2026-13-01', '2026-1-1', '01/10/2026', '']) expect(isRealDay(typed), typed).toBe(false);
  });
});
