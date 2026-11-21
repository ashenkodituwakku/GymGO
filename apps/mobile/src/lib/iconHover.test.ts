import { describe, expect, it } from 'vitest';
import { ART_CSS, ART_NAMES, MOST, MOTION_CSS, TALL, iconHoverCss, iconMotion, isArt, movingIcons, type IconMotion } from './iconHover';

describe('icon hover', () => {
  it('gives each icon a motion that says what it does, and the rest a lift', () => {
    expect(iconMotion('chevron')).toBe('forward');
    expect(iconMotion('back')).toBe('back');
    expect(iconMotion('share')).toBe('up');
    expect(iconMotion('bell')).toBe('ring');
    expect(iconMotion('settings')).toBe('turn');
    expect(iconMotion('gear-six')).toBe('turn');
    expect(iconMotion('save')).toBe('pop');
    expect(iconMotion('bookmark-simple')).toBe('pop');
    expect(iconMotion('eye')).toBe('blink');
    expect(iconMotion('house')).toBe('lift');
    expect(iconMotion('not-an-icon')).toBe('lift');
  });

  it('has a rule for every motion, and keyframes for every animation it names', () => {
    const css = iconHoverCss();
    for (const motion of Object.keys(MOTION_CSS) as IconMotion[]) {
      expect(css).toContain(`[data-gg-icon="${motion}"][data-gg-hover]`);
    }
    for (const [, name] of css.matchAll(/animation(?:-name)?: (gg-[a-z-]+)/g)) {
      expect(css).toContain(`@keyframes ${name} `);
    }
  });

  it('plays a scene of its own for each icon drawn in parts', () => {
    const css = iconHoverCss();
    expect(isArt('chart-line-up')).toBe(true);
    expect(isArt('barbell')).toBe(true);
    expect(isArt('magnifying-glass')).toBe(false);
    for (const art of ART_NAMES) {
      expect(ART_CSS[art]).toContain(`[data-gg-art="${art}"][data-gg-hover] [data-part=`);
      expect(css).toContain(ART_CSS[art]);
    }
    // Progress: the line draws out of the axis and the arrow comes after it; Workout: plates slide on, then the bar dips.
    expect(ART_CSS['chart-line-up']).toMatch(/\[data-part="line"\][^}]*gg-art-draw/);
    expect(ART_CSS['chart-line-up']).toMatch(/\[data-part="arrow"\][^}]*gg-chart-arrow/);
    expect(ART_CSS.barbell).toMatch(/\[data-part="outer-left"\][^}]*gg-plate-left[^}]*240ms/);
    expect(ART_CSS.barbell).toMatch(/\[data-part="all"\][^}]*gg-bar-dip/);
  });

  it('keeps still with Reduce motion, the app’s own or the system’s', () => {
    const css = iconHoverCss();
    expect(css).toMatch(/html\[data-gg-calm\] \[data-gg-icon\], html\[data-gg-calm\] \[data-gg-icon\] \* \{[^}]*animation: none !important/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\[data-gg-icon\], \[data-gg-icon\] \* \{[^}]*scale: none !important/);
  });

  it('moves a control’s icons, a tall card’s arrow only, and nothing with too many icons', () => {
    expect(movingIcons(['turn', 'forward'], 44)).toEqual([true, true]);
    expect(movingIcons(['pop', 'lift', 'forward'], TALL + 1)).toEqual([false, false, true]);
    expect(movingIcons(Array<IconMotion>(MOST + 1).fill('lift'), 44)).toEqual(Array(MOST + 1).fill(false));
  });
});
