import {
  BottomSheetScrollView,
  INITIAL_LAYOUT_VALUE,
  KEYBOARD_STATUS,
  useBottomSheetInternal,
  type BottomSheetBackgroundProps,
  type BottomSheetScrollViewMethods,
} from '@gorhom/bottom-sheet';
import { createContext, forwardRef, useContext, type ComponentProps, type ReactNode } from 'react';
import { Platform, StyleSheet, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue } from 'react-native-reanimated';
import { color, radius, themed } from '@/lib/theme';
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
 * card and its content both stop at the layer's bottom edge (or the top of
 * the keyboard), so the card shows its rounded bottom corners and a list
 * inside can always scroll its last row into view.
 *
 * Both are measured the same way, from the sheet's top edge down to that
 * edge. They used to be the sheet's full height less the part below the
 * layer, worked out from the library's detents; on iPhone that came out
 * different for the card and for the list inside it, which ran on past the
 * card with its last rows out of reach.
 */
function useReach() {
  const { animatedPosition, animatedLayoutState, animatedKeyboardState } = useBottomSheetInternal();
  return useDerivedValue(() => {
    const { containerHeight } = animatedLayoutState.get();
    if (containerHeight === INITIAL_LAYOUT_VALUE) return 0;
    const keyboard = animatedKeyboardState.get();
    const floor = containerHeight - (keyboard.status === KEYBOARD_STATUS.SHOWN ? keyboard.heightWithinContainer : 0);
    return Math.max(0, floor - animatedPosition.get());
  });
}

function FloatingBackground({ solid }: BottomSheetBackgroundProps & { solid: boolean }) {
  const reach = useReach();
  const size = useAnimatedStyle(() => ({ height: reach.get() }));
  return (
    <Animated.View style={[styles.floating, solid && styles.solidFill, size, { pointerEvents: 'none' }]}>
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
  const { animatedLayoutState } = useBottomSheetInternal();
  const reach = useReach();
  // The content starts below the sheet's handle.
  const size = useAnimatedStyle(() => ({ height: Math.max(0, reach.get() - Math.max(0, animatedLayoutState.get().handleHeight)) }));
  return <Animated.View style={[styles.clip, size]}>{children}</Animated.View>;
}

/**
 * Whether a sheet's list only scrolls, and the sheet moves by its top edge:
 * on a phone, in the app or a browser. Letting the list drag the sheet too
 * hands every drag to the sheet library to share out between the two. On
 * iPhone that could lock the list part way down, and in a phone's browser
 * the browser's own touch scrolling cancels the library's drag, so a swipe
 * on a half-open sheet's list did nothing at all. A browser used with a
 * mouse keeps both: the wheel scrolls, and a drag moves the sheet.
 */
export const SHEET_SCROLL_ONLY =
  Platform.OS !== 'web' || (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true);

/** What opens the sheet a list is in all the way, where dragging the list doesn't move the sheet (SHEET_SCROLL_ONLY). */
export const SheetOpener = createContext<(() => void) | null>(null);

type ScrollHandler = (event: NativeSyntheticEvent<NativeScrollEvent>) => void;

/**
 * A sheet's scroll view that, on a phone, opens its sheet all the way as a
 * drag in it begins, as Maps does: the rows get the whole screen, rather
 * than scrolling in the strip a half-open sheet leaves under its header.
 */
export const SheetScrollView = forwardRef<BottomSheetScrollViewMethods, Omit<ComponentProps<typeof BottomSheetScrollView>, 'onScrollBeginDrag'>>(
  function SheetScrollView(props, ref) {
    const open = useContext(SheetOpener);
    if (open && Platform.OS === 'web') {
      // The library's list in a browser doesn't say when a drag begins; its first scroll does instead.
      const onScroll = props.onScroll as ScrollHandler | undefined;
      return (
        <BottomSheetScrollView
          ref={ref}
          {...props}
          onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
            open();
            onScroll?.(event);
          }}
        />
      );
    }
    return <BottomSheetScrollView ref={ref} {...props} onScrollBeginDrag={open ?? undefined} />;
  },
);

const styles = themed(() => StyleSheet.create({
  floating: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderRadius: radius.sheet,
    borderCurve: 'continuous',
    // Real Liquid Glass casts its own soft shadow; the imitation needs one.
    // A box shadow, not Android's elevation: the background sits behind the
    // sheet's rows as their sibling, and on Android an elevated view is
    // drawn over its siblings, which would cover the list it's meant to hold.
    boxShadow: `0px 4px 24px rgba(0, 0, 0, ${HAS_LIQUID_GLASS ? 0.08 : 0.16})`,
  },
  glass: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.sheet,
  },
  solidFill: { backgroundColor: color.groupedBackground },
  clip: {
    overflow: 'hidden',
    borderBottomLeftRadius: radius.sheet,
    borderBottomRightRadius: radius.sheet,
    borderCurve: 'continuous',
  },
}));
