/**
 * Room to leave at the bottom of a screen so nothing sits under the tab bar.
 *
 * The tab bar is GymGO's own floating glass capsule on every platform, so
 * the tabs layout says how much room it takes (including the home indicator)
 * through this context. Outside the tabs it's just the safe area.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Dimensions, Platform, type View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const TabBarInset = createContext(0);

export function useBottomClearance(): number {
  const bar = useContext(TabBarInset);
  const insets = useSafeAreaInsets();
  return bar > 0 ? bar : insets.bottom;
}

/**
 * Where the floating tab bar sits above the bottom of the screen.
 *
 * iPhone: just above the home indicator, overlapping its strip a little, as
 * iOS 26's own bars do. Android draws the app behind its navigation bar (the
 * three buttons, or the gesture handle), so there the bar sits wholly above
 * it: overlapping would put the bar's lower edge under the Back and Home
 * buttons.
 */
export function tabBarBottom(insetBottom: number): number {
  if (Platform.OS === 'android') return insetBottom + 8;
  return Math.max(insetBottom - 12, 14);
}

/**
 * Room under a full page's scrolling content (not a tab): its own gap, plus
 * the phone's home indicator or navigation bar, so the last row can always
 * scroll clear of it.
 *
 * On iPhone, a scroll view with contentInsetAdjustmentBehavior="automatic"
 * (every page's) already keeps clear of the home indicator. Android draws
 * pages edge to edge, behind its navigation bar, which the page must clear
 * itself; so must a browser on a phone with a home indicator.
 */
export function useScreenBottom(gap = 32): number {
  const insets = useSafeAreaInsets();
  return Platform.OS === 'ios' ? gap : gap + insets.bottom;
}

/**
 * More than any header, status bar or sheet offset pushes a page down. A
 * page measured further off the screen than this is still sliding in, so
 * that reading is ignored and taken again once it has settled.
 */
const MAX_OVERHANG = 240;

/** When to measure again after a layout: once an opening slide has finished. */
const SETTLE_CHECKS = [250, 700, 1500];

/** The bottom edge of what the phone shows, in the same units as layout. */
function visibleBottom(): number {
  // The app fills the screen on a phone (Android draws edge to edge, behind
  // its bars); in a browser the page is the window, not the monitor.
  return Platform.OS === 'web' ? Dimensions.get('window').height : Dimensions.get('screen').height;
}

/**
 * How far a view hangs below the bottom of the screen: normally nothing.
 *
 * A page, or a tab, is meant to end at the screen's bottom edge, and its
 * scroll view pads its last row clear of the home indicator, the navigation
 * bar or the tab bar. On a phone, though, a screen can be laid out taller
 * than what shows: pushed down by a header or a sheet's top edge, say, with
 * its full height kept. Then its last rows sit below the glass, where no
 * amount of scrolling brings them up, and anything pinned to its bottom
 * (the rest timer, the sheets over the map) sinks with them. The browser
 * preview never does this, which is how it went unnoticed there.
 *
 * So the view measures where it really ends, when it's laid out and again as
 * any opening animation settles, and reports how much of it is off the
 * screen. Add that to its bottom room.
 */
export function useOverhang(): { measureRef: (node: Measurable | null) => void; onLayout: () => void; overhang: number } {
  const node = useRef<Measurable | null>(null);
  const [overhang, setOverhang] = useState(0);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const measure = useCallback(() => {
    const view = node.current;
    if (!view || typeof view.measureInWindow !== 'function') return;
    view.measureInWindow((_x, y, _width, height) => {
      if (!Number.isFinite(y) || !Number.isFinite(height) || height <= 0) return;
      const below = Math.round(y + height - visibleBottom());
      if (below > MAX_OVERHANG) return;
      setOverhang((current) => {
        const next = Math.max(0, below);
        return next === current ? current : next;
      });
    });
  }, []);

  const measureRef = useCallback((next: Measurable | null) => {
    node.current = next;
  }, []);

  const onLayout = useCallback(() => {
    measure();
    for (const timer of timers.current) clearTimeout(timer);
    timers.current = SETTLE_CHECKS.map((delay) => setTimeout(measure, delay));
  }, [measure]);

  useEffect(
    () => () => {
      for (const timer of timers.current) clearTimeout(timer);
    },
    [],
  );

  return { measureRef, onLayout, overhang };
}

/** Anything on screen that can say where it is: a view, a scroll view. */
export type Measurable = Pick<View, 'measureInWindow'>;
