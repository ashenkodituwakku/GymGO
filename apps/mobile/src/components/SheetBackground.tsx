import type { BottomSheetBackgroundProps } from '@gorhom/bottom-sheet';
import type { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { color, radius } from '@/lib/theme';
import { Glass, HAS_LIQUID_GLASS } from './Glass';

/** How far a floating sheet sits in from the screen's edges. */
export const SHEET_GAP = 8;

/**
 * A glass sheet that floats, the way sheets do on iOS 26: inset from the
 * sides and bottom, with every corner rounded concentrically with the
 * display's own. At its tallest detent it grows out to the screen's edges.
 *
 * Pair with `detached` and `bottomInset={SHEET_GAP}` on the sheet, which lift
 * the sheet off the bottom edge. This background then reaches back down to
 * the edge as it opens fully.
 *
 * `fullIndex` is the snap-point index at which the sheet goes edge to edge.
 */
export function floatingGlassBackground(fullIndex: number): FC<BottomSheetBackgroundProps> {
  function FloatingGlassBackground({ style, animatedIndex }: BottomSheetBackgroundProps) {
    const inset = useAnimatedStyle(() => {
      const gap = interpolate(animatedIndex.value, [fullIndex - 1, fullIndex], [SHEET_GAP, 0], Extrapolation.CLAMP);
      return { left: gap, right: gap, bottom: gap - SHEET_GAP };
    });

    return (
      <Animated.View pointerEvents="none" style={[style, styles.floating, inset]}>
        <Glass kind="sheet" style={styles.glass} />
      </Animated.View>
    );
  }
  return FloatingGlassBackground;
}

/** The opaque variant, for a modal that covers most of the screen. */
export function SolidSheetBackground({ style }: BottomSheetBackgroundProps) {
  return <View style={[style, styles.solid]} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  floating: {
    borderRadius: radius.sheet,
    borderCurve: 'continuous',
    // Real Liquid Glass casts its own soft shadow; the imitation needs one.
    shadowColor: color.shadow,
    shadowOpacity: HAS_LIQUID_GLASS ? 0.08 : 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
  glass: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.sheet,
  },
  solid: {
    backgroundColor: color.groupedBackground,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderCurve: 'continuous',
    shadowColor: color.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -2 },
    elevation: 16,
  },
});
