/**
 * A full page's scroll view (not a tab's, which is `TabScreen`).
 *
 * Under the last row it leaves a gap, clear of the home indicator or
 * Android's navigation bar, plus however much of the page the phone has laid
 * out below the bottom of the screen (see `useOverhang`), so the last row can
 * always be scrolled into view. On iPhone it also takes the system's
 * automatic insets, which keep the content clear of a see-through header.
 *
 * When the colours change and the screen is drawn again (Redrawn), the page
 * goes back to where it was scrolled, rather than to the top.
 *
 * On iPhone the keyboard makes room for itself: the page can scroll a box
 * being typed in clear of it, rather than leaving it underneath (a note on a
 * gym's page, a friend's code). A tap on a button while typing works first
 * time, rather than only putting the keyboard away.
 */

import { forwardRef, useCallback, useContext, useRef, type ForwardedRef } from 'react';
import { ScrollView, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewProps } from 'react-native';
import { ScrollMemory } from '@/components/Redrawn';
import { useOverhang, useScreenBottom, type Measurable } from '@/lib/layout';

type Props = ScrollViewProps & {
  /** Room under the last row, before the phone's own bottom edge is added. */
  gap?: number;
  /** More room still, for something pinned over the bottom of the page (the rest timer). */
  extraBottom?: number;
};

export const PageScroll = forwardRef(function PageScroll(
  { gap = 32, extraBottom = 0, contentContainerStyle, onLayout, onScroll, onContentSizeChange, scrollEventThrottle, ...props }: Props,
  forwarded: ForwardedRef<ScrollView>,
) {
  const screenBottom = useScreenBottom(gap);
  const { measureRef, onLayout: measure, overhang } = useOverhang();
  const memory = useContext(ScrollMemory);
  const node = useRef<ScrollView | null>(null);
  // Only the first time the content is laid out: back to where the page was before a redraw.
  const placed = useRef(false);
  const setRef = useCallback(
    (next: ScrollView | null) => {
      node.current = next;
      measureRef(next as unknown as Measurable | null);
      if (typeof forwarded === 'function') forwarded(next);
      else if (forwarded) forwarded.current = next;
    },
    [measureRef, forwarded],
  );
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      {...props}
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
        if (!placed.current) {
          placed.current = true;
          if (memory && memory.y > 0) node.current?.scrollTo({ y: memory.y, animated: false });
        }
        onContentSizeChange?.(width, height);
      }}
      contentContainerStyle={[contentContainerStyle, { paddingBottom: screenBottom + overhang + extraBottom }]}
      // The scroll bar stops where the screen does, not below it.
      scrollIndicatorInsets={overhang > 0 ? { bottom: overhang } : undefined}
    />
  );
});
