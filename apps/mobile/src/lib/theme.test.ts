import { afterEach, describe, expect, it, vi } from 'vitest';

// The font files are for the app's bundler, not for Node.
vi.mock('./fonts', () => ({ BUNDLED_FACES: {} }));
import { StyleSheet } from 'react-native';
import { ACCENT_IDS, FREE_ACCENT, applyTheme, color, themed } from './theme';

const channel = (value: number) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((at) => channel(parseInt(hex.slice(at, at + 2), 16) / 255));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: string, b: string) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
};

afterEach(() => {
  applyTheme('light', FREE_ACCENT);
});

describe('the colours', () => {
  it('keep text readable (WCAG AA) in every mode and accent', () => {
    const failures: string[] = [];
    for (const scheme of ['light', 'dark'] as const) {
      for (const accent of ACCENT_IDS) {
        applyTheme(scheme, accent);
        for (const background of ['card', 'groupedBackground'] as const) {
          for (const text of ['label', 'labelSecondary', 'brand', 'goodInk', 'maybeInk', 'noInk', 'dangerInk'] as const) {
            const ratio = contrast(color[text], color[background]);
            if (ratio < 4.5) failures.push(`${scheme} ${accent}: ${text} on ${background} is ${ratio.toFixed(2)}`);
          }
        }
        const onFill = contrast(color.onBrand, color.brandFill);
        if (onFill < 4.5) failures.push(`${scheme} ${accent}: white on the brand fill is ${onFill.toFixed(2)}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('change in place, and style sheets follow on their next read', () => {
    const styles = themed(() => StyleSheet.create({ page: { backgroundColor: color.card } }));
    expect(StyleSheet.flatten(styles.page).backgroundColor).toBe('#FFFFFF');
    expect(applyTheme('dark', 'ocean')).toBe(true);
    expect(StyleSheet.flatten(styles.page).backgroundColor).toBe('#1C1C1E');
    expect(color.brand).toBe('#409CFF');
    expect(applyTheme('dark', 'ocean')).toBe(false);
    expect(Object.keys(styles)).toEqual(['page']);
  });
});
