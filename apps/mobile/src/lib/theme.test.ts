import { afterEach, describe, expect, it, vi } from 'vitest';

// The font files are for the app's bundler, not for Node.
vi.mock('./fonts', () => ({ BUNDLED_FACES: {} }));
import { StyleSheet } from 'react-native';
import { ACCENT_IDS, FREE_ACCENT, FREE_LOOK, LOOKS, LOOK_IDS, applyTheme, color, radius, themed, type } from './theme';

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
  applyTheme('light', FREE_ACCENT, FREE_LOOK);
});

describe('the colours', () => {
  it('keep text readable (WCAG AA) in every look, mode and accent', () => {
    const failures: string[] = [];
    for (const look of LOOK_IDS) {
    // A look that's only one way (Neon) is only checked that way.
    for (const scheme of LOOKS[look].scheme ? [LOOKS[look].scheme!] : (['light', 'dark'] as const)) {
      for (const accent of ACCENT_IDS) {
        applyTheme(scheme, accent, look);
        for (const background of ['card', 'groupedBackground'] as const) {
          for (const text of ['label', 'labelSecondary', 'brand', 'goodInk', 'maybeInk', 'noInk', 'dangerInk'] as const) {
            const ratio = contrast(color[text], color[background]);
            if (ratio < 4.5) failures.push(`${look} ${scheme} ${accent}: ${text} on ${background} is ${ratio.toFixed(2)}`);
          }
        }
        const onFill = contrast(color.onBrand, color.brandFill);
        if (onFill < 4.5) failures.push(`${look} ${scheme} ${accent}: white on the brand fill is ${onFill.toFixed(2)}`);
      }
    }
    }
    expect(failures).toEqual([]);
  });

  it('change corners and type in place with the look, and back', () => {
    const styles = themed(() => StyleSheet.create({ card: { borderRadius: radius.lg } }));
    applyTheme('light', FREE_ACCENT, 'pixel');
    expect(StyleSheet.flatten(styles.card).borderRadius).toBe(0);
    expect(type.largeTitle.fontFamily).toBe('PressStart2P_400Regular');
    expect(type.body.fontFamily).toBe('PixelifySans_400Regular');
    applyTheme('light', FREE_ACCENT, 'material');
    expect(StyleSheet.flatten(styles.card).borderRadius).toBe(16);
    expect(type.headline.fontFamily).toBe('Roboto_500Medium');
    applyTheme('light', FREE_ACCENT, FREE_LOOK);
    expect(StyleSheet.flatten(styles.card).borderRadius).toBe(18);
    expect(type.largeTitle.fontFamily).not.toBe('PressStart2P_400Regular');
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
