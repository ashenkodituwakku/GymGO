/**
 * Big numbers shortened for a small tile. No React Native here, so it is
 * unit-tested in Node.
 */

/**
 * A count that fits a narrow tile: as written up to 9,999 ("9,250"), then
 * thousands ("35.8k", "135k") and millions ("1.2M"). A screen reader is
 * given the whole number by the tile's own label.
 */
export function compactNumber(value: number): string {
  const whole = Math.round(value);
  if (Math.abs(whole) < 10_000) return whole.toLocaleString('en-AU');
  if (Math.abs(whole) < 1_000_000) {
    const thousands = whole / 1000;
    return `${Math.abs(thousands) < 100 ? trim(thousands.toFixed(1)) : Math.round(thousands)}k`;
  }
  return `${trim((whole / 1_000_000).toFixed(1))}M`;
}

const trim = (text: string) => text.replace(/\.0$/, '');
