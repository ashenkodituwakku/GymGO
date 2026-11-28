import { describe, expect, it } from 'vitest';
import { cardPalette, hexRgb, logoColour, rgbHex } from './cardColour';

/** A logo: `n` pixels of each colour, RGBA. */
const logo = (...parts: Array<[[number, number, number, number], number]>) => {
  const out: number[] = [];
  for (const [[r, g, b, a], n] of parts) for (let at = 0; at < n; at += 1) out.push(r, g, b, a);
  return Uint8Array.from(out);
};

describe('a card in its brand’s colour', () => {
  it('reads hex both ways', () => {
    expect(rgbHex(224, 35, 78)).toBe('#E0234E');
    expect(hexRgb('#e0234e')).toEqual([224, 35, 78]);
    expect(hexRgb('red')).toBeNull();
    expect(rgbHex(300, -4, 15.6)).toBe('#FF0010');
  });

  it('takes a logo’s own colour, not its white ground or black lettering', () => {
    // Anytime-ish purple on white with black words.
    const purple = logoColour(logo([[255, 255, 255, 255], 600], [[20, 20, 20, 255], 200], [[106, 43, 160, 255], 200]), 4)!;
    const [r, g, b] = hexRgb(purple)!;
    expect(b).toBeGreaterThan(g);
    expect(r).toBeGreaterThan(g);
    expect(purple).toBe('#6A2BA0');
  });

  it('picks the colour most of the logo is, by how vivid it is', () => {
    const colour = logoColour(logo([[230, 40, 40, 255], 300], [[40, 90, 220, 255], 100]), 4)!;
    expect(hexRgb(colour)![0]).toBeGreaterThan(200);
  });

  it('leaves out see-through pixels', () => {
    expect(logoColour(logo([[230, 40, 40, 0], 500], [[30, 160, 90, 255], 50]), 4)).toBe('#1EA05A');
  });

  it('has no colour for a black, white or grey logo, or an empty one', () => {
    expect(logoColour(logo([[0, 0, 0, 255], 500], [[255, 255, 255, 255], 500], [[128, 128, 128, 255], 300]), 4)).toBeNull();
    // A speck of colour isn't the brand's.
    expect(logoColour(logo([[0, 0, 0, 255], 990], [[230, 40, 40, 255], 10]), 4)).toBeNull();
    expect(logoColour(new Uint8Array(0), 4)).toBeNull();
    expect(logoColour(Uint8Array.from([230, 40, 40, 230, 40, 40]), 3)).toBe('#E62828');
  });

  it('makes three shades of the brand’s hue, light to deep, strong enough for a card', () => {
    const [light, base, deep] = cardPalette('#6A2BA0')!;
    const lum = (hex: string) => {
      const [r, g, b] = hexRgb(hex)!;
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    expect(lum(light)).toBeGreaterThan(lum(base));
    expect(lum(base)).toBeGreaterThan(lum(deep));
    // A pale brand colour still makes a card deep enough for white on it.
    const [, paleBase] = cardPalette('#FFE6F0')!;
    expect(lum(paleBase)).toBeLessThan(150);
    expect(cardPalette('nope')).toBeNull();
  });
});
