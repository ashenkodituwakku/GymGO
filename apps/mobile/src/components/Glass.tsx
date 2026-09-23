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
 * One component, so every glass surface changes together.
 */

import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

/** True when the device draws Apple's real Liquid Glass. */
export const HAS_LIQUID_GLASS =
  Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

export type GlassKind = 'control' | 'sheet' | 'bar';

export function Glass({
  kind = 'control',
  style,
  children,
  tint,
  interactive = false,
  clear = false,
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
}) {
  if (HAS_LIQUID_GLASS && kind !== 'bar') {
    return (
      <GlassView
        style={[styles.continuous, style]}
        glassEffectStyle={clear ? 'clear' : 'regular'}
        tintColor={tint}
        isInteractive={interactive}
        colorScheme="light"
      >
        {children}
      </GlassView>
    );
  }

  const shape = cornerShape(style);
  const thick = kind !== 'control';

  return (
    <View style={[styles.clip, styles.continuous, style]}>
      <Backdrop thick={thick} bar={kind === 'bar'} />
      {tint ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tint, opacity: 0.92 }]} /> : null}
      {kind !== 'bar' ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, shape, tint ? styles.sheenOnTint : styles.sheen]} /> : null}
      {kind !== 'bar' ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, shape, styles.rim]} /> : null}
      {children}
    </View>
  );
}

function Backdrop({ thick, bar }: { thick: boolean; bar: boolean }) {
  if (Platform.OS === 'ios') {
    return (
      <BlurView
        pointerEvents="none"
        intensity={100}
        tint={thick ? 'systemThickMaterialLight' : 'systemUltraThinMaterialLight'}
        style={StyleSheet.absoluteFill}
      />
    );
  }
  if (Platform.OS === 'web') {
    return (
      <BlurView pointerEvents="none" intensity={thick ? 70 : 45} tint="light" style={StyleSheet.absoluteFill}>
        <View style={[StyleSheet.absoluteFill, bar ? styles.webBar : thick ? styles.webThick : styles.webThin]} />
      </BlurView>
    );
  }
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, bar ? styles.washBar : thick ? styles.washThick : styles.washThin]} />;
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

const SHEEN = 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.12) 38%, rgba(255,255,255,0) 60%)';
const SHEEN_ON_TINT = 'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 55%)';

// Web takes CSS `backgroundImage`; React Native's own renderer takes
// `experimental_backgroundImage`. Same gradient either way.
const gradient = (value: string): ViewStyle =>
  (Platform.OS === 'web' ? { backgroundImage: value } : { experimental_backgroundImage: value }) as ViewStyle;

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  // Apple's squircle corners, rather than circular arcs. iOS only; ignored
  // elsewhere.
  continuous: { borderCurve: 'continuous' },

  webThin: { backgroundColor: 'rgba(255, 255, 255, 0.42)' },
  webThick: { backgroundColor: 'rgba(250, 250, 253, 0.66)' },
  washThin: { backgroundColor: 'rgba(255, 255, 255, 0.8)' },
  washThick: { backgroundColor: 'rgba(248, 248, 251, 0.94)' },
  webBar: { backgroundColor: 'rgba(250, 250, 253, 0.93)' },
  washBar: { backgroundColor: 'rgba(248, 248, 251, 0.98)' },

  sheen: gradient(SHEEN),
  sheenOnTint: gradient(SHEEN_ON_TINT),

  // The specular rim: a bright inner edge along the top, a faint one below,
  // and a hairline all round.
  rim: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.9), inset 0 -1px 1px rgba(0, 0, 0, 0.05)',
  },
});
