/**
 * Draws a screen again from scratch when the colours change (dark mode, an
 * accent), so every style and colour on it is read afresh.
 *
 * Only a screen's own content is drawn again, never the navigator: the
 * native screens, the stack you're in and the tab you're on stay exactly as
 * they were. (Rebuilding the whole navigator, as GymGO first did, threw the
 * native screens away and had to put the navigation back afterwards, which a
 * phone didn't always manage.)
 *
 * The page keeps its place: where it was scrolled to is held here, outside
 * what's drawn again, and PageScroll goes back there. (Choosing an accent at
 * the foot of Appearance used to land you back at its top.)
 *
 * Every screen also comes in smoothly (see ScreenIn): a tab fades up when
 * you switch to it; in a browser, whose stack has no slide of its own, a
 * page rises into place as it opens and fades back up when you return to
 * it. A phone's pages already slide in, natively, so there they're left be.
 * Outside what's drawn again, so a change of colours doesn't replay it.
 */

import { useFocusEffect } from 'expo-router';
import { Fragment, createContext, useCallback, useEffect, useLayoutEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { Platform, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { subscribeTheme, themeVersion } from '@/lib/theme';
import { ARRIVE } from './motion';

/** The theme's version, redrawing whoever reads it when the colours change. */
export function useThemeVersion(): number {
  return useSyncExternalStore(subscribeTheme, themeVersion, themeVersion);
}

/** How far a redrawn screen's page was scrolled, kept across the redraw. */
export const ScrollMemory = createContext<{ y: number } | null>(null);

/** How a screen comes in: a tab, or a page of the stack. */
export type ScreenKind = 'tab' | 'page';

export function Redrawn({ children, kind = 'page', focused }: { children: ReactNode; kind?: ScreenKind; focused?: boolean }) {
  const version = useThemeVersion();
  const memory = useRef({ y: 0 }).current;
  return (
    <ScrollMemory.Provider value={memory}>
      <ScreenIn kind={kind} focused={focused !== false}>
        <Fragment key={version}>{children}</Fragment>
      </ScreenIn>
    </ScrollMemory.Provider>
  );
}

/** How far a page rises as it opens in a browser, in points. */
const RISE = 18;
/** A page returned to starts this faded, and comes back up. */
const RETURN = 0.55;

function ScreenIn({ kind, focused, children }: { kind: ScreenKind; focused: boolean; children: ReactNode }) {
  // A phone's stack slides its pages in itself.
  const still = kind === 'page' && Platform.OS !== 'web';
  const shown = useSharedValue(still ? 1 : 0);
  const rise = useSharedValue(still || kind === 'tab' ? 0 : 1);
  const opened = useRef(false);

  // Opening: before the first frame is painted, so it never flashes up first.
  useLayoutEffect(() => {
    if (still) return;
    shown.value = withTiming(1, kind === 'tab' ? { ...ARRIVE, duration: 220 } : { ...ARRIVE, duration: 320 });
    rise.value = withTiming(0, { ...ARRIVE, duration: 380 });
  }, [still, kind, shown, rise]);

  // A tab you switch to: faded up from nothing (out of sight, it waits at nothing).
  useEffect(() => {
    if (kind !== 'tab') return;
    shown.value = focused ? withTiming(1, { ...ARRIVE, duration: 220 }) : 0;
  }, [kind, focused, shown]);

  // In a browser, coming back to a screen (Back from a page): it fades back
  // up. Not on a phone: there the screen underneath slides back into view
  // natively, and dimming it as the next one began to slide in would show.
  useFocusEffect(
    useCallback(() => {
      if (still || Platform.OS !== 'web') return;
      if (opened.current) shown.value = withTiming(1, { ...ARRIVE, duration: 220 });
      opened.current = true;
      // Left for another page: ready to come back in (it's out of sight meanwhile).
      return () => {
        shown.value = RETURN;
      };
    }, [still, shown]),
  );

  const style = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ translateY: rise.value * RISE }] }));
  if (still) return <>{children}</>;
  return <Animated.View style={[styles.fill, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
