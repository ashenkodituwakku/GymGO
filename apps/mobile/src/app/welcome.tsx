/**
 * The welcome tour, once, straight after making an account: what GymGO is
 * for, in three pages (find a gym that lets you in, know what to do there,
 * collect it). Swipe or tap Next; Skip at any time. Then on to wherever you
 * were going (a link opened before signing up), or Home, which asks for
 * your country the first time as before.
 *
 * Each page is an icon, a headline and a line: nothing drawn stands in for
 * a picture of a gym, on the plain page. The marks drift and settle as the
 * pages are swiped (just swap with Reduce Motion).
 */

import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { interpolate, runOnJS, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useReducedMotion, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Wordmark } from '@/components/BrandMark';
import { HeroMark } from '@/components/HeroMark';
import type { IconName } from '@/components/Icon';
import { Pressable } from '@/components/motion';
import { useGlassRedraw } from '@/components/Redrawn';
import { PrimaryButton, Txt } from '@/components/ui';
import { ScreenOptions } from '@/components/ScreenOptions';
import { haptic } from '@/lib/haptics';
import { usePageTitle } from '@/lib/pageTitle';
import { color, face, radius, space, themed, webFocusRing } from '@/lib/theme';

const PAGES: Array<{ icon: IconName; title: string; line: string }> = [
  {
    icon: 'door',
    title: 'Find a gym that lets you in',
    line: 'See what each gym publishes: the price of a visit, guest hours and what to bring. Where a gym doesn’t say, GymGO says call first, and what to ask.',
  },
  {
    icon: 'workout',
    title: 'Know what to do when you get there',
    line: 'Tap the muscles you want to train for a plan that fits the kit, then tick off your sets. The rest timer, plate maths and your records come free.',
  },
  {
    icon: 'cards',
    title: 'Collect every gym you visit',
    line: 'Check in at a gym for its card. Every visit rolls a rarity, cards climb from Bronze to Platinum, and every gym in a suburb completes a set.',
  },
];

export default function WelcomeScreen() {
  useGlassRedraw();
  usePageTitle('Welcome');
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pager = useAnimatedRef<Animated.ScrollView>();
  const [page, setPage] = useState(0);
  // Where Next or a dot last sent the pager, and when: a second tap while
  // it's still on its way counts on from there, not from the page shown.
  const aim = useRef({ page: 0, at: 0 });
  const last = page === PAGES.length - 1;
  const scrollX = useSharedValue(0);
  // The page is wherever the pager is scrolled to, and nothing else (Next
  // only scrolls): kept on the UI thread, React hears only when it changes,
  // not on every frame of a swipe, and a swipe back part-way through Next's
  // own scroll reports the page it lands on.
  const lastPage = useSharedValue(0);

  const finish = () => {
    haptic.success();
    router.replace((next && next.startsWith('/') && !next.startsWith('//') ? next : '/') as Href);
  };
  const go = (to: number) => {
    const target = Math.min(PAGES.length - 1, Math.max(0, to));
    haptic.select();
    aim.current = { page: target, at: Date.now() };
    pager.current?.scrollTo({ x: target * width, animated: true });
  };
  /** The page a Next counts on from: the one a scroll is still heading for, else the one shown. */
  const from = () => (Date.now() - aim.current.at < 700 ? aim.current.page : page);
  const settle = (at: number) => {
    if (at >= 0 && at < PAGES.length) setPage(at);
  };
  // In a browser the pager takes keyboard focus: a ring shows it, and the arrow keys turn a page
  // (a scroll of a few points would only snap back to the page it's on).
  const [ringed, setRinged] = useState(false);
  const onKeyDown = (event: { key: string; preventDefault: () => void }) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    go(from() + (event.key === 'ArrowRight' ? 1 : -1));
  };
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
    const at = Math.round(event.contentOffset.x / Math.max(1, width));
    if (at !== lastPage.value) {
      lastPage.value = at;
      runOnJS(settle)(at);
    }
  });

  return (
    <View style={[styles.page, { paddingTop: insets.top + space[2], paddingBottom: insets.bottom + space[4] }]}>
      <ScreenOptions options={{ headerShown: false }} />
      {/* The page's heading for a screen reader, which moves by headings: each page of the tour is one
          labelled group (said whole), so its title can't be the heading. Not drawn: the wordmark says it. */}
      <Txt variant="body" accessibilityRole="header" level={1} style={styles.unseen}>
        Welcome to GymGO
      </Txt>
      <View style={styles.top}>
        <Wordmark height={22} />
        {!last && (
          <Pressable onPress={finish} accessibilityRole="button" accessibilityLabel="Skip the tour" hitSlop={10} style={({ pressed }) => [styles.skip, pressed && { opacity: 0.6 }]}>
            <Txt variant="body" color={color.brand} style={face('semibold')}>
              Skip
            </Txt>
          </Pressable>
        )}
      </View>

      <Animated.ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        // Reachable by the keyboard in a browser, where the arrow keys turn its pages
        // (Next and the dots do too); a scrolling part nothing inside can focus is otherwise out of reach.
        tabIndex={0}
        role="region"
        aria-label="The tour, three pages: the arrow keys turn them"
        // Only for the keyboard (the browser's own :focus-visible): a tap or a swipe also focuses it.
        onFocus={(event) => setRinged(Boolean((event.target as unknown as { matches?: (selector: string) => boolean }).matches?.(':focus-visible')))}
        onBlur={() => setRinged(false)}
        // Its own ring, not the app's overlay (app/_layout.tsx), which would scroll away with the first page.
        {...({ onKeyDown, dataSet: { quietFocus: '' } } as object)}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={[styles.pager, webFocusRing(ringed), ringed && styles.ringInside]}
      >
        {PAGES.map((item, index) => (
          <View key={item.title} style={[styles.slide, { width }]} accessible accessibilityLabel={`${index + 1} of ${PAGES.length}. ${item.title}. ${item.line}`}>
            <Drift index={index} width={width} scrollX={scrollX} depth={0.45}>
              <HeroMark icon={item.icon} size={88} tint={color.brand} />
            </Drift>
            <Drift index={index} width={width} scrollX={scrollX} depth={0.12}>
              <Txt variant="largeTitle" style={styles.title} fluid>
                {item.title}
              </Txt>
            </Drift>
            <Txt variant="body" color={color.labelSecondary} style={styles.line}>
              {item.line}
            </Txt>
          </View>
        ))}
      </Animated.ScrollView>

      <View style={styles.dots} accessibilityRole="tablist">
        {PAGES.map((item, index) => (
          <Pressable
            key={item.title}
            onPress={() => go(index)}
            accessibilityRole="tab"
            accessibilityState={{ selected: index === page }}
            // A browser reads only the aria form.
            aria-selected={index === page}
            accessibilityLabel={`Page ${index + 1} of ${PAGES.length}`}
            // The target is the box, the dot is drawn in it: a browser has no hitSlop, so an 8-point dot
            // was an 8-pixel target there (WCAG 2.2 asks for 24).
            style={styles.dotTarget}
          >
            <View style={[styles.dot, index === page && styles.dotOn]} />
          </Pressable>
        ))}
      </View>

      <View style={styles.actions}>
        <PrimaryButton label={last ? 'Get started' : 'Next'} icon={last ? 'check' : undefined} onPress={() => (last ? finish() : go(from() + 1))} />
      </View>
    </View>
  );
}

/**
 * Moves its page's mark or headline a little faster than the page as it's
 * swiped (by `depth` of a page more), and fades and shrinks it as it
 * leaves, so the tour has some depth. Still with Reduce Motion.
 */
function Drift({ index, width, scrollX, depth, children }: { index: number; width: number; scrollX: SharedValue<number>; depth: number; children: ReactNode }) {
  const calm = useReducedMotion();
  const style = useAnimatedStyle(() => {
    if (calm) return {};
    const range = [(index - 1) * width, index * width, (index + 1) * width];
    return {
      opacity: interpolate(scrollX.value, range, [0.2, 1, 0.2], 'clamp'),
      transform: [
        // Ahead of the page: a neighbour's mark waits off the screen and sweeps in faster than its page.
        { translateX: interpolate(scrollX.value, range, [width * depth, 0, -width * depth], 'clamp') },
        { scale: interpolate(scrollX.value, range, [1 - depth * 0.5, 1, 1 - depth * 0.5], 'clamp') },
      ],
    };
  });
  return <Animated.View style={[styles.drift, style]}>{children}</Animated.View>;
}


const styles = themed(() =>
  StyleSheet.create({
    // Read by a screen reader, never seen: the usual visually-hidden box (as components/RouteFocus.tsx).
    unseen: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', pointerEvents: 'none' } as object,
    page: { flex: 1, backgroundColor: color.groupedBackground },
    top: { height: 44, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space[4] },
    skip: { paddingHorizontal: space[2], paddingVertical: space[1], borderRadius: radius.pill },
    pager: { flex: 1 },
    // Drawn just inside its edges, which meet the screen's.
    ringInside: { outlineOffset: -3 } as object,
    slide: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[4], paddingHorizontal: space[6] },
    drift: { alignItems: 'center', alignSelf: 'stretch' },
    // Room for the headline as it grows in a wide browser window (Txt's `fluid`).
    title: { textAlign: 'center', maxWidth: Platform.OS === 'web' ? 680 : 440 },
    line: { textAlign: 'center', maxWidth: 440 },
    // Each dot's target is 24 high and its dot's width plus 16: centres 24 apart, the row as tall as before.
    dots: { flexDirection: 'row', justifyContent: 'center', paddingVertical: space[2] },
    dotTarget: { height: 24, paddingHorizontal: space[2], alignItems: 'center', justifyContent: 'center' },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.fill },
    dotOn: { width: 22, backgroundColor: color.brand },
    actions: { paddingHorizontal: space[4], width: '100%', maxWidth: 480, alignSelf: 'center' },
  }),
);
