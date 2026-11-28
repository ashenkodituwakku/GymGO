/**
 * A full page's scroll view (not a tab's, which is `TabScreen`).
 *
 * Under the last row it leaves a gap, clear of the home indicator or
 * Android's navigation bar, plus however much of the page the phone has laid
 * out below the bottom of the screen (see `useOverhang`), so the last row can
 * always be scrolled into view. On iPhone it also takes the system's
 * automatic insets, which keep the content clear of a see-through header.
 *
 * Behind it, in the glass looks, something for their frosted cards to be
 * seen against (ambientGlow): Standard's glow of the accent, growing with your
 * Liquid Glass level, or Frost's blue-and-white page:
 * on a view of its own around the scroll view, which Android's scroll view
 * can't draw a gradient on. The page's style (its colour, under the glow)
 * goes there too.
 *
 * When the colours change and the screen is drawn again (Redrawn), the page
 * goes back to where it was scrolled, rather than to the top. A page that's
 * new to the screen (a workout's summary in place of the workout) starts at
 * its top.
 *
 * On iPhone the keyboard makes room for itself: the page can scroll a box
 * being typed in clear of it, rather than leaving it underneath (a note on a
 * gym's page, a friend's code). A tap on a button while typing works first
 * time, rather than only putting the keyboard away.
 */

import { forwardRef, useCallback, useContext, useRef, type ForwardedRef } from 'react';
import { ScrollView, StyleSheet, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewProps, type ScrollViewInstance } from 'react-native';
import { ScrollMemory, startingY } from '@/components/Redrawn';
import { useOverhang, useScreenBottom, type Measurable } from '@/lib/layout';
import { useThemeChoice } from '@/lib/themePrefs';
import { ambientGlow, color } from '@/lib/theme';
import { usePageGroundDrawn } from './pageGround';

/** Verity's button on a page (Verity.tsx: BUTTON 52, EDGE 16) and a little air over it. */
const PAL_ROOM = 52 + 16 + 12;

type Props = ScrollViewProps & {
  /** Room under the last row, before the phone's own bottom edge is added. */
  gap?: number;
  /** More room still, for something pinned over the bottom of the page (the rest timer). */
  extraBottom?: number;
};

export const PageScroll = forwardRef(function PageScroll(
  { gap = 32, extraBottom = 0, contentContainerStyle, onLayout, onScroll, onContentSizeChange, scrollEventThrottle, style, ...props }: Props,
  forwarded: ForwardedRef<ScrollViewInstance>,
) {
  // Verity's button (the tab on the edge, or the corner one) sits over a page's bottom corner,
  // 52 points tall and 16 up: the last row scrolls clear of it rather than ending under it.
  const palButton = useThemeChoice().verityButton !== 'hidden';
  const screenBottom = useScreenBottom(palButton ? Math.max(gap, PAL_ROOM) : gap);
  const { measureRef, onLayout: measure, overhang } = useOverhang();
  const memory = useContext(ScrollMemory);
  const groundDrawn = usePageGroundDrawn();
  const node = useRef<ScrollViewInstance | null>(null);
  // Only the first time the content is laid out: back to where the page was before a redraw.
  const placed = useRef(false);
  const setRef = useCallback(
    (next: ScrollViewInstance | null) => {
      node.current = next;
      measureRef(next as unknown as Measurable | null);
      if (typeof forwarded === 'function') forwarded(next);
      else if (forwarded) forwarded.current = next;
    },
    [measureRef, forwarded],
  );
  return (
    <View style={[styles.fill, groundDrawn ? clearOfGround(style) : [style, ambientGlow()]]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        {...props}
        // The page's own style (its colour, its size) is on the view around it.
        style={styles.inner}
        ref={setRef}
        onLayout={(event: LayoutChangeEvent) => {
          measure();
          onLayout?.(event);
        }}
        scrollEventThrottle={scrollEventThrottle ?? 32}
        onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
          if (memory) memory.y = event.nativeEvent.contentOffset.y;
          onScroll?.(event);
        }}
        onContentSizeChange={(width: number, height: number) => {
          // Once there's a page to scroll: one drawn again out of sight measures nothing at first.
          if (!placed.current && height > 0) {
            placed.current = true;
            const y = startingY(memory);
            if (y > 0) node.current?.scrollTo({ y, animated: false });
          }
          onContentSizeChange?.(width, height);
        }}
        contentContainerStyle={[contentContainerStyle, { paddingBottom: screenBottom + overhang + extraBottom }]}
        // The scroll bar stops where the screen does, not below it.
        scrollIndicatorInsets={overhang > 0 ? { bottom: overhang } : undefined}
      />
    </View>
  );
});

/** The page's style, without the plain ground colour, when the ground is drawn behind it already (a colour of its own stays). */
function clearOfGround(style: ScrollViewProps['style']): ScrollViewProps['style'] {
  const flat = StyleSheet.flatten(style);
  return flat?.backgroundColor === color.groupedBackground ? [style, { backgroundColor: 'transparent' }] : style;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  inner: { flex: 1, backgroundColor: 'transparent' },
});
