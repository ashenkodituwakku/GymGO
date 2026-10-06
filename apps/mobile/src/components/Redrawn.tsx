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
 * Every screen also comes in smoothly (see ScreenIn): a tab fades up as it
 * lifts a little into place when you switch to it; in a browser, whose stack
 * has no slide of its own, a page rises into place as it opens and comes back
 * up from a little dimmed when you return to it. A phone's pages already
 * slide in, natively, so there they're left be. Outside what's drawn again,
 * so a change of colours doesn't replay it.
 */

import { useFocusEffect } from 'expo-router';
import { Fragment, createContext, useCallback, useLayoutEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { ReduceMotion, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { subscribeTheme, themeVersion } from '@/lib/theme';
import { EASE_SCREEN, EASE_SCREEN_CSS } from './motion';

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

/**
 * How a screen comes in: from how faded and how far below its place (in
 * points), over how long. Small distances: the screen glides into place, it
 * doesn't fly in.
 */
type Motion = { opacity: number; y: number; duration: number };
/** A tab you switch to. */
const TAB: Motion = { opacity: 0, y: 8, duration: 300 };
/** A page opening, in a browser. */
const PAGE: Motion = { opacity: 0, y: 14, duration: 380 };
/** A page you come back to, in a browser: it waited out of sight a little dimmed. */
const BACK: Motion = { opacity: 0.6, y: 0, duration: 240 };

function ScreenIn({ kind, focused, children }: { kind: ScreenKind; focused: boolean; children: ReactNode }) {
  if (Platform.OS === 'web') return <ScreenInBrowser kind={kind} focused={focused}>{children}</ScreenInBrowser>;
  // A phone's stack slides its pages in itself.
  if (kind === 'page') return <>{children}</>;
  return <TabIn focused={focused}>{children}</TabIn>;
}

/**
 * In a browser, the browser itself runs the fade and the lift (the Web
 * Animations API), off the page's own work: a screen that takes a moment to
 * draw the first time can't stall it halfway, and it starts from the
 * beginning on the first frame anyone sees. Nothing is left on the screen
 * afterwards (no lasting transform under its fixed parts).
 */
function ScreenInBrowser({ kind, focused, children }: { kind: ScreenKind; focused: boolean; children: ReactNode }) {
  const ref = useRef<View>(null);
  /** Set while the screen waits dimmed under a page opened over it. */
  const dimmed = useRef<Animation | null>(null);

  const play = useCallback((motion: Motion) => {
    const element = ref.current as unknown as HTMLElement | null;
    if (!element || typeof element.animate !== 'function') return;
    for (const running of element.getAnimations()) running.cancel();
    dimmed.current = null;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    element.animate(
      [
        { opacity: motion.opacity, transform: `translateY(${motion.y}px)` },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: motion.duration, easing: EASE_SCREEN_CSS },
    );
  }, []);

  // Opening, and a tab switched to: before the first frame is painted, so it never flashes up first.
  useLayoutEffect(() => {
    if (kind === 'page') play(PAGE);
    else if (focused) play(TAB);
  }, [kind, focused, play]);

  // Coming back from a page opened over this screen (a tab or a page): up from a little dimmed.
  // A tab switched to has just played its own arrival, which cleared the dimming.
  useFocusEffect(
    useCallback(() => {
      if (dimmed.current) play(BACK);
      // Left for a page over it, or another tab: it waits dimmed, out of sight, so it doesn't flash bright on the way back.
      return () => {
        const element = ref.current as unknown as HTMLElement | null;
        if (element && typeof element.animate === 'function') dimmed.current = element.animate([{ opacity: BACK.opacity }], { duration: 0, fill: 'forwards' });
      };
    }, [play]),
  );

  return (
    <View ref={ref} style={styles.fill}>
      {children}
    </View>
  );
}

/** A tab on a phone: faded up and lifted into place on the UI thread; out of sight, it waits at nothing. */
function TabIn({ focused, children }: { focused: boolean; children: ReactNode }) {
  const shown = useSharedValue(0);
  useLayoutEffect(() => {
    shown.value = focused ? withTiming(1, { duration: TAB.duration, easing: EASE_SCREEN, reduceMotion: ReduceMotion.System }) : 0;
  }, [focused, shown]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(shown.value, [0, 1], [TAB.opacity, 1]),
    transform: [{ translateY: (1 - shown.value) * TAB.y }],
  }));
  return <Animated.View style={[styles.fill, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
