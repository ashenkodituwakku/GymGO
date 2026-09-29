/**
 * A full page's scroll view (not a tab's, which is `TabScreen`).
 *
 * Under the last row it leaves a gap, clear of the home indicator or
 * Android's navigation bar, plus however much of the page the phone has laid
 * out below the bottom of the screen (see `useOverhang`), so the last row can
 * always be scrolled into view. On iPhone it also takes the system's
 * automatic insets, which keep the content clear of a see-through header.
 */

import { forwardRef, useCallback, type ForwardedRef } from 'react';
import { ScrollView, type LayoutChangeEvent, type ScrollViewProps } from 'react-native';
import { useOverhang, useScreenBottom, type Measurable } from '@/lib/layout';

type Props = ScrollViewProps & {
  /** Room under the last row, before the phone's own bottom edge is added. */
  gap?: number;
  /** More room still, for something pinned over the bottom of the page (the rest timer). */
  extraBottom?: number;
};

export const PageScroll = forwardRef(function PageScroll(
  { gap = 32, extraBottom = 0, contentContainerStyle, onLayout, ...props }: Props,
  forwarded: ForwardedRef<ScrollView>,
) {
  const screenBottom = useScreenBottom(gap);
  const { measureRef, onLayout: measure, overhang } = useOverhang();
  const setRef = useCallback(
    (node: ScrollView | null) => {
      measureRef(node as unknown as Measurable | null);
      if (typeof forwarded === 'function') forwarded(node);
      else if (forwarded) forwarded.current = node;
    },
    [measureRef, forwarded],
  );
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      {...props}
      ref={setRef}
      onLayout={(event: LayoutChangeEvent) => {
        measure();
        onLayout?.(event);
      }}
      contentContainerStyle={[contentContainerStyle, { paddingBottom: screenBottom + overhang + extraBottom }]}
      // The scroll bar stops where the screen does, not below it.
      scrollIndicatorInsets={overhang > 0 ? { bottom: overhang } : undefined}
    />
  );
});
