/**
 * The material things float on.
 *
 * iOS 26 and later: Apple's own Liquid Glass (UIGlassEffect, through
 * expo-glass-effect). It is rendered by the system, so it bends the map
 * behind it, catches light at its edges and, when `interactive`, flexes
 * under a finger, exactly as system controls do.
 *
 * Everywhere else there is no real glass, so this builds the closest honest
 * imitation from parts:
 *  - a backdrop: the system blur material on older iPhones, the browser's
 *    backdrop blur in the web preview, and a bright wash on Android, where a
 *    live blur over a map costs frames and the map view often can't be
 *    sampled anyway;
 *  - an optional tint, for prominent buttons;
 *  - a sheen, light falling from the top edge;
 *  - a specular rim, the bright hairline edge that makes glass read as glass.
 *
 * `kind` picks what a surface is for:
 *  - `control`: buttons and pills over the map;
 *  - `sheet`: a sheet's surface, which uses a thicker backdrop in imitation;
 *  - `bar`: a frosted strip for content scrolling under a pinned header,
 *    which is always a blur, never glass on glass.
 *
 * Every surface is just as solid on every device: by default a control 80%
 * opaque, a sheet 94%, a bar 98% (the theme's `glassWash*` colours). Real
 * Liquid Glass takes that as its tint; the imitation lays it over its blur.
 * Without it, an iPhone before iOS 26 showed its thinnest blur material,
 * which over the map was almost completely clear, while Android and the
 * browser looked solid.
 *
 * How solid is yours to choose: the Liquid Glass percentage in Appearance
 * (GLASS_DEFAULT in theme.ts) moves all three together, and at 0% every
 * surface is a solid plate, as in the solid looks.
 *
 * One component, so every glass surface changes together.
 */

import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useState, useSyncExternalStore, type ReactNode } from 'react';
import { Platform, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { installLiquidGlass, refractionFor } from './liquidGlass';
import { NO_TOUCH, color, currentLook, currentTheme, glassLevel, glassWash, shadow, solidSurfaces, subscribeGlass, themed, type GlassLayer } from '@/lib/theme';

/** True when the device draws Apple's real Liquid Glass. */
export const HAS_LIQUID_GLASS =
  Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

export type GlassKind = 'control' | 'sheet' | 'bar';

/** Your Liquid Glass level, drawing whoever reads it again when it changes (without redrawing the screen). */
export function useGlassLevel(): number {
  return useSyncExternalStore(subscribeGlass, glassLevel, glassLevel);
}

const layerOf = (kind: GlassKind): GlassLayer => (kind === 'bar' ? 'bar' : kind === 'sheet' ? 'thick' : 'thin');

/** How solid a surface of each kind is, the same on every device: at your level, or at one being tried. */
const floor = (kind: GlassKind, level?: number): string =>
  level !== undefined ? glassWash(layerOf(kind), level, currentTheme().scheme) : kind === 'bar' ? color.glassWashBar : kind === 'sheet' ? color.glassWashThick : color.glassWashThin;

export function Glass({
  kind = 'control',
  style,
  children,
  tint,
  interactive = false,
  clear = false,
  level,
}: {
  kind?: GlassKind;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** Tinted glass, for a prominent button. */
  tint?: string;
  /** Let the glass flex and glint under a finger (iOS 26). */
  interactive?: boolean;
  /** The more transparent Liquid Glass variant, for controls over busy imagery. */
  clear?: boolean;
  /** A Liquid Glass level to draw instead of yours, for a preview while you choose. */
  level?: number;
}) {
  useGlassLevel();
  // A look drawn in solid plates (8-bit, Classic, Material, Neon), or Liquid
  // Glass at 0%: no glass at all, just the card colour, the look's shadow
  // and, for a tinted button, its tint.
  if (level === undefined ? solidSurfaces() : currentLook().solid || level === 0) {
    // A solid sheet in the glass look is the page's grey, like Filters', so the white cards on it still stand out.
    const plate = kind === 'bar' ? color.background : kind === 'sheet' && !currentLook().solid ? color.groupedBackground : color.card;
    return (
      <View
        style={[
          styles.continuous,
          { backgroundColor: tint ?? plate },
          kind === 'control' ? shadow.float : kind === 'sheet' ? shadow.card : null,
          style,
        ]}
      >
        {children}
      </View>
    );
  }
  if (HAS_LIQUID_GLASS && kind !== 'bar') {
    return (
      <GlassView
        style={[styles.continuous, style]}
        glassEffectStyle={clear ? 'clear' : 'regular'}
        // As solid as everywhere else; Apple's glass still bends and glints at the edges.
        tintColor={tint ?? floor(kind, level)}
        isInteractive={interactive}
        // GymGO's own light or dark, not the phone's: it was fixed to light,
        // which left pale glass under white text in dark mode.
        colorScheme={dark() ? 'dark' : 'light'}
      >
        {children}
      </GlassView>
    );
  }

  // In the browser, controls get the tab bar's own glass: a blur that also
  // bends the map near the edges (Chrome and Edge), sized to each control.
  if (Platform.OS === 'web' && kind === 'control' && !tint && level === undefined) {
    return (
      <WebGlassControl style={style} clear={clear}>
        {children}
      </WebGlassControl>
    );
  }

  const shape = cornerShape(style);
  const thick = kind !== 'control';

  return (
    <View style={[styles.clip, styles.continuous, style]}>
      <Backdrop thick={thick} wash={floor(kind, level)} />
      {tint ? <View style={[NO_TOUCH, StyleSheet.absoluteFill, { backgroundColor: tint, opacity: 0.92 }]} /> : null}
      {kind !== 'bar' ? <View style={[NO_TOUCH, StyleSheet.absoluteFill, shape, tint ? styles.sheenOnTint : styles.sheen]} /> : null}
      {kind !== 'bar' ? <View style={[NO_TOUCH, StyleSheet.absoluteFill, shape, styles.rim]} /> : null}
      {children}
    </View>
  );
}

function WebGlassControl({ style, clear, children }: { style?: StyleProp<ViewStyle>; clear: boolean; children?: ReactNode }) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  installLiquidGlass();
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (!size || Math.round(size.width) !== Math.round(width) || Math.round(size.height) !== Math.round(height)) setSize({ width, height });
  };
  const mark = size ? refractionFor(size.width, size.height) : { dataSet: { glass: 'control' } };
  return (
    <View {...mark} onLayout={onLayout} style={[styles.clip, style, clear && styles.webClear]}>
      <View style={[NO_TOUCH, StyleSheet.absoluteFill, cornerShape(style), styles.washThin]} />
      <View style={[NO_TOUCH, StyleSheet.absoluteFill, cornerShape(style), styles.sheen]} />
      {children}
    </View>
  );
}

/** The imitation's backdrop: a blur where it's cheap (iPhone, browser), always under the same solid wash. */
function Backdrop({ thick, wash: colour }: { thick: boolean; wash: string }) {
  const wash = <View style={[NO_TOUCH, StyleSheet.absoluteFill, { backgroundColor: colour }]} />;
  if (Platform.OS === 'ios') {
    return (
      <>
        <BlurView intensity={100} tint={dark() ? 'systemThickMaterialDark' : 'systemThickMaterialLight'} style={[NO_TOUCH, StyleSheet.absoluteFill]} />
        {wash}
      </>
    );
  }
  if (Platform.OS === 'web') {
    return (
      <BlurView intensity={thick ? 70 : 45} tint={dark() ? 'dark' : 'light'} style={[NO_TOUCH, StyleSheet.absoluteFill]}>
        {wash}
      </BlurView>
    );
  }
  return wash;
}

/** The corner radii of the surface, so the overlays follow its shape. */
function cornerShape(style: StyleProp<ViewStyle>): ViewStyle {
  const flat = StyleSheet.flatten(style) ?? {};
  return {
    borderRadius: flat.borderRadius,
    borderTopLeftRadius: flat.borderTopLeftRadius,
    borderTopRightRadius: flat.borderTopRightRadius,
    borderBottomLeftRadius: flat.borderBottomLeftRadius,
    borderBottomRightRadius: flat.borderBottomRightRadius,
  };
}

const dark = () => currentTheme().scheme === 'dark';
// Light catches the top edge; on dark glass it's a fainter glint.
const sheen = () =>
  dark()
    ? 'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.04) 38%, rgba(255,255,255,0) 60%)'
    : 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.12) 38%, rgba(255,255,255,0) 60%)';
const SHEEN_ON_TINT = 'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 55%)';

// Web takes CSS `backgroundImage`; React Native's own renderer takes
// `experimental_backgroundImage`. Same gradient either way.
const gradient = (value: string): ViewStyle =>
  (Platform.OS === 'web' ? { backgroundImage: value } : { experimental_backgroundImage: value }) as ViewStyle;

const styles = themed(() => StyleSheet.create({
  clip: { overflow: 'hidden' },
  // Apple's squircle corners, rather than circular arcs. iOS only; ignored
  // elsewhere.
  continuous: { borderCurve: 'continuous' },

  webClear: { opacity: 0.96 },
  washThin: { backgroundColor: color.glassWashThin },

  sheen: gradient(sheen()),
  sheenOnTint: gradient(SHEEN_ON_TINT),

  // The specular rim: a bright inner edge along the top, a faint one below,
  // and a hairline all round.
  rim: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.glassEdge,
    boxShadow: dark()
      ? 'inset 0 1px 1px rgba(255, 255, 255, 0.18), inset 0 -1px 1px rgba(0, 0, 0, 0.3)'
      : 'inset 0 1px 1px rgba(255, 255, 255, 0.9), inset 0 -1px 1px rgba(0, 0, 0, 0.05)',
  },
}));
