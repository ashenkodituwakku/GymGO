/**
 * The value range a progress chart draws (components/ProgressChart.tsx):
 * from the lowest value to the highest, or for a flat line, a band with
 * the line in the middle. No React Native here, so it is unit-tested in Node.
 */

export function chartScale(values: readonly number[]): { base: number; span: number } {
  const low = Math.min(...values);
  const high = Math.max(...values);
  if (high > low) return { base: low, span: high - low };
  // A flat line sits in the middle rather than on an edge. Whole numbers (reps, or 100 kg) get a band
  // an even number wide, so the gridlines above and below land on whole numbers too: 9, 10 and 11 reps, not 9.5 and 10.5.
  const whole = values.every((value) => Number.isInteger(value));
  const span = whole ? Math.max(2, 2 * Math.round(Math.abs(high) * 0.05)) : Math.max(1, Math.abs(high) * 0.1);
  return { base: low - span / 2, span };
}
