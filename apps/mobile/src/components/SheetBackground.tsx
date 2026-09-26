import { useBottomSheetInternal, type BottomSheetBackgroundProps } from '@gorhom/bottom-sheet';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { NO_TOUCH, color, dropShadow, radius, themed } from '@/lib/theme';
import { Glass, HAS_LIQUID_GLASS } from './Glass';

/** The gap between a floating sheet and the tab bar below it. */
export const SHEET_GAP = 8;

/**
 * How far a floating sheet sits in from the sides of the screen: the same as
 * the tab bar and the controls over the map, so everything lines up.
 */
export const SHEET_SIDE = 16;

/**
 * Sheets float, the way they do on iOS 26: inset from the sides (the sheet's
 * own `style` carries the side margins) and ending a gap above the tab bar,
 * with every corner rounded.
 *
 * A sheet is as tall as its tallest detent and slides down to show less, so
 * at a lower detent part of it is out of sight below the sheet layer. The
 * background and the content both stop where the layer does, so the card
 * shows its rounded bottom corners and nothing inside runs past them.
 */
function FloatingBackground({ style, solid }: BottomSheetBackgroundProps & { solid: boolean }) {
  const { animatedPosition, animatedDetentsState } = useBottomSheetInternal();
  const bottom = useAnimatedStyle(() => {
    const highest = animatedDetentsState.value.highestDetentPosition ?? animatedPosition.value;
    return { bottom: Math.max(0, animatedPosition.value - highest) };
  });
  return (
    <Animated.View style={[NO_TOUCH, style, styles.floating, solid && styles.solidFill, bottom]}>
      {!solid && <Glass kind="sheet" style={styles.glass} />}
    </Animated.View>
  );
}

/** Glass, for sheets over the map. */
export function FloatingGlassBackground(props: BottomSheetBackgroundProps) {
  return <FloatingBackground {...props} solid={false} />;
}

/** Opaque, for a sheet of controls (Filters) that shouldn't show the map through it. */
export function FloatingSolidBackground(props: BottomSheetBackgroundProps) {
  return <FloatingBackground {...props} solid />;
}

/**
 * A floating sheet's content, clipped to the card: it ends where the card's
 * background does, with the same rounded bottom corners, so rows never run
 * past the corners or show below the card. Put the sheet's scroll view in it.
 */
export function SheetClip({ children }: { children: ReactNode }) {
  const { animatedPosition, animatedDetentsState } = useBottomSheetInternal();
  const bottom = useAnimatedStyle(() => {
    const highest = animatedDetentsState.value.highestDetentPosition ?? animatedPosition.value;
    return { marginBottom: Math.max(0, animatedPosition.value - highest) };
  });
  return <Animated.View style={[styles.clip, bottom]}>{children}</Animated.View>;
}

const styles = themed(() => StyleSheet.create({
  floating: {
    borderRadius: radius.sheet,
    borderCurve: 'continuous',
    // Real Liquid Glass casts its own soft shadow; the imitation needs one.
    ...dropShadow(HAS_LIQUID_GLASS ? 0.08 : 0.16, 24, 4, 12),
  },
  glass: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.sheet,
  },
  solidFill: { backgroundColor: color.groupedBackground },
  clip: {
    flex: 1,
    overflow: 'hidden',
    borderBottomLeftRadius: radius.sheet,
    borderBottomRightRadius: radius.sheet,
    borderCurve: 'continuous',
  },
}));
