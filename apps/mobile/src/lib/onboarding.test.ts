import { describe, expect, it } from 'vitest';
import { daysLine, spreadDays } from './onboarding';

const days = (count: number) => spreadDays(count).flatMap((on, index) => (on ? ['MTWTFSS'[index]] : [])).join('');

describe('the days a week question', () => {
  it('spreads the days through the week, Monday first', () => {
    expect(days(1)).toBe('M');
    // Monday and Thursday.
    expect(spreadDays(2)).toEqual([true, false, false, true, false, false, false]);
    expect(days(3)).toBe('MWF');
    // Monday, Tuesday, Thursday, Friday.
    expect(spreadDays(4)).toEqual([true, true, false, true, true, false, false]);
    expect(days(5)).toBe('MTWTF');
    expect(days(7)).toBe('MTWTFSS');
    // Every count gives that many days.
    for (let count = 1; count <= 7; count++) expect(spreadDays(count).filter(Boolean)).toHaveLength(count);
  });

  it('says a word on each', () => {
    expect(daysLine(2)).toMatch(/gentle/);
    expect(daysLine(4)).toMatch(/steady/);
    expect(daysLine(6)).toMatch(/rest day/);
    expect(daysLine(7)).toMatch(/easy/);
  });
});
