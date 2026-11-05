import { describe, expect, it, vi } from 'vitest';

vi.mock('./fonts', () => ({ BUNDLED_FACES: {} }));
import { mix, readable } from './looks';
import { ACCENT_IDS, paletteFor } from './theme';

const channel = (value: number) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((at) => channel(parseInt(hex.slice(at, at + 2), 16) / 255));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: string, b: string) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
};

describe('the limited version’s banner', () => {
  it('reads at 4.5 : 1 in every accent, light and dark (as components/LimitedBanner.tsx draws it)', () => {
    for (const scheme of ['light', 'dark'] as const) {
      for (const accent of ACCENT_IDS) {
        const palette = paletteFor(scheme, accent);
        const ground = mix(palette.background, palette.brand, scheme === 'dark' ? 0.2 : 0.12);
        expect(contrast(readable(palette.brand, [ground], scheme), ground), `${scheme} ${accent}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
