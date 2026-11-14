import { describe, expect, it } from 'vitest';
import { chartScale } from './chartScale';

const gridlines = (values: number[]) => {
  const { base, span } = chartScale(values);
  return [base + span, base + span / 2, base];
};

describe('the range a progress chart draws', () => {
  it('runs from the lowest value to the highest', () => {
    expect(chartScale([80, 85, 90])).toEqual({ base: 80, span: 10 });
  });

  it('puts a flat line of whole numbers between whole gridlines', () => {
    expect(gridlines([10, 10, 10])).toEqual([11, 10, 9]);
    expect(gridlines([3])).toEqual([4, 3, 2]);
    expect(gridlines([100, 100])).toEqual([105, 100, 95]);
  });

  it('keeps a flat line of tenths in the middle of a band a tenth of its size', () => {
    expect(gridlines([82.5, 82.5])).toEqual([82.5 + 8.25 / 2, 82.5, 82.5 - 8.25 / 2]);
    expect(gridlines([0.5])).toEqual([1, 0.5, 0]);
  });
});
