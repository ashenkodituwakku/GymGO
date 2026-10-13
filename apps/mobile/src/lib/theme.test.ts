import { afterEach, describe, expect, it, vi } from 'vitest';

// The font files are for the app's bundler, not for Node.
vi.mock('./fonts', () => ({ BUNDLED_FACES: {} }));
import { StyleSheet } from 'react-native';
import { ACCENT_IDS, FREE_ACCENT, FREE_LOOK, GLASS_DEFAULT, LOOKS, LOOK_IDS, applyTheme, color, glassAlpha, glassLevelName, glowPools, paletteFor, plateAlpha, radius, solidSurfaces, subscribeGlass, subscribeTheme, themed, type } from './theme';
import { mix } from './looks';

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
  applyTheme('light', FREE_ACCENT, FREE_LOOK, GLASS_DEFAULT);
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

  it('keep text readable on see-through cards, over the brightest of the glow', () => {
    const failures: string[] = [];
    for (const look of LOOK_IDS.filter((id) => !LOOKS[id].solid)) {
      for (const scheme of LOOKS[look].scheme ? [LOOKS[look].scheme!] : (['light', 'dark'] as const)) {
        for (const accent of ACCENT_IDS) {
          for (const level of [25, GLASS_DEFAULT, 75, 100]) {
            applyTheme(scheme, accent, look, level);
            const peak = Math.max(...glowPools(level, scheme).map((pool) => pool.opacity));
            const see = Number(/rgba\(\d+, \d+, \d+, ([\d.]+)\)/.exec(color.plate)?.[1] ?? 1);
            const behind = mix(mix(color.groupedBackground, color.brand, peak), color.card, see);
            for (const text of ['label', 'labelSecondary', 'brand', 'goodInk', 'maybeInk', 'noInk', 'dangerInk'] as const) {
              const ratio = contrast(color[text], behind);
              if (ratio < 4.5) failures.push(`${look} ${scheme} ${accent} ${level}%: ${text} on a card is ${ratio.toFixed(2)}`);
            }
          }
        }
      }
    }
    expect(failures).toEqual([]);
    // Still glass: as clear as asked wherever the text allows.
    applyTheme('light', FREE_ACCENT, FREE_LOOK, 75);
    expect(color.plate).toBe(`rgba(255, 255, 255, ${plateAlpha(75, 'light')})`);
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

describe('Liquid Glass', () => {
  it('is today’s balance at 50%, solid at 0% and clearer up to 100%', () => {
    expect(glassAlpha('thin', 50, 'light', 'ios')).toBe(0.8);
    expect(glassAlpha('thick', 50, 'dark', 'ios')).toBe(0.95);
    for (const layer of ['thin', 'thick', 'bar'] as const) {
      expect(glassAlpha(layer, 0, 'light', 'ios')).toBe(1);
      let last = 1;
      for (let level = 5; level <= 100; level += 5) {
        const alpha = glassAlpha(layer, level, 'light', 'ios');
        expect(alpha).toBeLessThan(last);
        last = alpha;
      }
    }
  });

  it('never goes as clear on Android, which draws no blur behind it', () => {
    for (const layer of ['thin', 'thick', 'bar'] as const) {
      expect(glassAlpha(layer, 100, 'light', 'android')).toBeGreaterThan(glassAlpha(layer, 100, 'light', 'ios'));
      expect(glassAlpha(layer, 50, 'light', 'android')).toBe(glassAlpha(layer, 50, 'light', 'ios'));
    }
  });

  it('changes the glass colours in place, and turns glass off at 0%', () => {
    expect(color.glassWashThin).toBe('rgba(255, 255, 255, 0.8)');
    expect(applyTheme('light', FREE_ACCENT, FREE_LOOK, 100)).toBe(true);
    expect(color.glassWashThin).not.toBe('rgba(255, 255, 255, 0.8)');
    expect(solidSurfaces()).toBe(false);
    applyTheme('light', FREE_ACCENT, FREE_LOOK, 0);
    expect(color.glassWashThin).toBe('rgba(255, 255, 255, 1)');
    expect(solidSurfaces()).toBe(true);
    // A solid look is solid whatever the level.
    applyTheme('light', FREE_ACCENT, 'pixel', 80);
    expect(solidSurfaces()).toBe(true);
  });

  it('redraws glass and cards in place when only the level changes, not screens from scratch', () => {
    const screens = vi.fn();
    const glass = vi.fn();
    const stopScreens = subscribeTheme(screens);
    const stopGlass = subscribeGlass(glass);
    const styles = themed(() => StyleSheet.create({ wash: { backgroundColor: color.glassWashThick }, card: { backgroundColor: color.plate } }));
    const before = StyleSheet.flatten(styles.wash).backgroundColor;
    const card = StyleSheet.flatten(styles.card).backgroundColor;
    applyTheme('light', FREE_ACCENT, FREE_LOOK, 90);
    // Starting each screen again would drop focus, scroll and what's picked:
    // they draw again in place instead (useGlassRedraw), with the new styles.
    expect(screens).not.toHaveBeenCalled();
    expect(glass).toHaveBeenCalledTimes(1);
    expect(StyleSheet.flatten(styles.wash).backgroundColor).not.toBe(before);
    expect(StyleSheet.flatten(styles.card).backgroundColor).not.toBe(card);
    applyTheme('light', FREE_ACCENT, FREE_LOOK, 90);
    expect(glass).toHaveBeenCalledTimes(1);
    // A change of colours does start them again.
    applyTheme('dark', FREE_ACCENT, FREE_LOOK, 90);
    expect(screens).toHaveBeenCalledTimes(1);
    stopScreens();
    stopGlass();
  });

  it('lets the glow through cards on the page with the level, and keeps them solid at 0% or in a solid look', () => {
    expect(paletteFor('light', FREE_ACCENT, FREE_LOOK, 0).plate).toBe(paletteFor('light', FREE_ACCENT, FREE_LOOK, 0).card);
    expect(plateAlpha(0, 'light')).toBe(1);
    expect(plateAlpha(GLASS_DEFAULT, 'light')).toBe(0.82);
    expect(plateAlpha(100, 'light')).toBe(0.58);
    expect(plateAlpha(100, 'dark')).toBe(0.62);
    expect(paletteFor('light', FREE_ACCENT, FREE_LOOK, 100).plate).not.toBe(paletteFor('light', FREE_ACCENT, FREE_LOOK, 100).card);
    for (const look of LOOK_IDS.filter((id) => LOOKS[id].solid)) {
      const palette = paletteFor('dark', FREE_ACCENT, look, 100);
      expect(palette.plate).toBe(palette.card);
    }
  });

  it('names each level', () => {
    expect([0, 20, 50, 70, 100].map(glassLevelName)).toEqual(['Solid', 'Frosted', 'Balanced', 'Clear', 'Clearest']);
  });
});
