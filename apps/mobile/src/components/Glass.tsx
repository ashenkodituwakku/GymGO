/**
 * The material things float on.
 *
 * `thin` is for small controls over the map: real Liquid Glass on iOS 26
 * (expo-glass-effect), the system chrome blur on earlier iOS and in the web
 * preview. `thick` is for sheets that carry a list: the thick system
 * material, because a list over a busy street map must stay readable, and
 * Liquid Glass at sheet size over a map is too see-through for body text.
 *
 * Android gets near-opaque surfaces: a heavy real-time blur over a live map
 * costs frames on mid-range phones, and Material's own surfaces are opaque.
 *
 * One component, so every floating surface changes together.
 */

import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { color } from '@/lib/theme';

const liquidGlass = Platform.OS === 'ios' && isLiquidGlassAvailable();

export function Glass({
  style,
  children,
  interactive = false,
  weight = 'thin',
}: {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  interactive?: boolean;
  weight?: 'thin' | 'thick';
}) {
  if (liquidGlass && weight === 'thin') {
    return (
      <GlassView style={style} glassEffectStyle="regular" isInteractive={interactive} colorScheme="light">
        {children}
      </GlassView>
    );
  }

  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={weight === 'thick' ? 100 : 80}
        tint={weight === 'thick' ? 'systemThickMaterialLight' : 'systemChromeMaterialLight'}
        style={[styles.clip, style]}
      >
        {children}
      </BlurView>
    );
  }

  if (Platform.OS === 'web') {
    // The browser's backdrop blur, with a white wash matching the system
    // materials' own tint.
    return (
      <BlurView intensity={weight === 'thick' ? 60 : 40} tint="light" style={[styles.clip, style]}>
        <View style={[StyleSheet.absoluteFill, weight === 'thick' ? styles.webThick : styles.webThin]} />
        {children}
      </BlurView>
    );
  }

  return <View style={[weight === 'thick' ? styles.solidThick : styles.solid, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  webThin: { backgroundColor: 'rgba(255, 255, 255, 0.62)' },
  webThick: { backgroundColor: 'rgba(250, 250, 252, 0.86)' },
  solid: { backgroundColor: color.glass },
  solidThick: { backgroundColor: '#F7F7F9' },
});
