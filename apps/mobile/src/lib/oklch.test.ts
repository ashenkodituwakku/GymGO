import { describe, expect, it } from 'vitest';
import { contrast, hexToOklch, mix, mixOklch, oklchStops, oklchToHex } from './looks';

describe('OKLCH colour', () => {
  it('reads colours as the published OKLCH values', () => {
    const red = hexToOklch('#FF0000')!;
    expect(red[0]).toBeCloseTo(0.628, 2);
    expect(red[1]).toBeCloseTo(0.2577, 2);
    expect(red[2]).toBeCloseTo(29.23, 0);
    expect(hexToOklch('#FFFFFF')![0]).toBeCloseTo(1, 3);
    expect(hexToOklch('nope')).toBeNull();
  });

  it('comes back to the same colour', () => {
    for (const colour of ['#5856D6', '#2FA84F', '#D4A106', '#1C1C1E', '#FFFFFF', '#000000']) {
      const [l, c, h] = hexToOklch(colour)!;
      expect(oklchToHex(l, c, h)).toBe(colour);
    }
  });

  it('brings chroma down rather than clipping a colour no screen can show', () => {
    // Far more chroma than sRGB holds at this lightness: the result keeps its lightness and hue.
    const wild = oklchToHex(0.7, 0.5, 145);
    const [l, , h] = hexToOklch(wild)!;
    expect(l).toBeCloseTo(0.7, 2);
    expect(Math.abs(h - 145)).toBeLessThan(2);
  });

  it('keeps colour between two far-apart hues, where an sRGB blend goes grey', () => {
    const chroma = (value: string) => hexToOklch(value)![1];
    // Green to blue, halfway.
    expect(chroma(mixOklch('#2FA84F', '#1D7FD8', 0.5))).toBeGreaterThan(chroma(mix('#2FA84F', '#1D7FD8', 0.5)));
  });

  it('puts blended stops between a gradient’s own', () => {
    const stops = oklchStops(['#E0245E', '#2FA84F'], 3);
    expect(stops).toHaveLength(5);
    expect(stops[0]).toBe('#E0245E');
    expect(stops[4]).toBe('#2FA84F');
    expect(contrast(stops[2]!, '#FFFFFF')).toBeGreaterThan(1);
  });
});
