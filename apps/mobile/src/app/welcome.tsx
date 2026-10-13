/**
 * The welcome tour, once, straight after making an account: what GymGO is
 * for, in three pages (find a gym that lets you in, know what to do there,
 * collect it). Swipe or tap Next; Skip at any time. Then on to wherever you
 * were going (a link opened before signing up), or Home, which asks for
 * your country the first time as before.
 *
 * Each page is an icon, a headline and a line: nothing drawn stands in for
 * a picture of a gym. Behind them a glow of the accent; the marks drift and
 * settle as the pages are swiped (just swap with Reduce Motion).
 */

import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useId, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { interpolate, runOnJS, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useReducedMotion, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Wordmark } from '@/components/BrandMark';
import { HeroMark } from '@/components/HeroMark';
import type { IconName } from '@/components/Icon';
import { Pressable } from '@/components/motion';
import { PrimaryButton, Txt } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { usePageTitle } from '@/lib/pageTitle';
import { LOOKS, color, currentLook, currentTheme, face, radius, space, themed } from '@/lib/theme';

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
    icon: 'trophy',
    title: 'Collect every gym you visit',
    line: 'Check in at a gym for its card. Every visit rolls a rarity, cards climb from Bronze to Platinum, and every gym in a suburb completes a set.',
  },
];

export default function WelcomeScreen() {
  usePageTitle('Welcome');
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pager = useAnimatedRef<Animated.ScrollView>();
  const [page, setPage] = useState(0);
  const pageRef = useRef(0);
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
    haptic.select();
    pager.current?.scrollTo({ x: to * width, animated: true });
  };
  const settle = (at: number) => {
    if (at !== pageRef.current && at >= 0 && at < PAGES.length) {
      pageRef.current = at;
      setPage(at);
    }
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
      <Stack.Screen options={{ headerShown: false }} />
      {currentLook() === LOOKS.standard && <Backdrop />}
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
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.pager}
      >
        {PAGES.map((item, index) => (
          <View key={item.title} style={[styles.slide, { width }]} accessible accessibilityLabel={`${index + 1} of ${PAGES.length}. ${item.title}. ${item.line}`}>
            <Drift index={index} width={width} scrollX={scrollX} depth={0.45}>
              <HeroMark icon={item.icon} size={88} />
            </Drift>
            <Drift index={index} width={width} scrollX={scrollX} depth={0.12}>
              <Txt variant="largeTitle" style={styles.title}>
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
            accessibilityLabel={`Page ${index + 1} of ${PAGES.length}`}
            hitSlop={8}
            style={[styles.dot, index === page && styles.dotOn]}
          />
        ))}
      </View>

      <View style={styles.actions}>
        <PrimaryButton label={last ? 'Let’s go' : 'Next'} icon={last ? 'check' : undefined} onPress={() => (last ? finish() : go(page + 1))} />
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

/** A glow of the accent behind the tour: one pool high up behind the marks, a fainter one low at the side. */
function Backdrop() {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const dark = currentTheme().scheme === 'dark';
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]} aria-hidden>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id={`wa${id}`} cx="50%" cy="34%" r="58%">
            <Stop offset="0" stopColor={color.brand} stopOpacity={dark ? 0.36 : 0.2} />
            <Stop offset="0.5" stopColor={color.brand} stopOpacity={dark ? 0.12 : 0.07} />
            <Stop offset="1" stopColor={color.brand} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`wb${id}`} cx="100%" cy="96%" r="52%">
            <Stop offset="0" stopColor={color.brand} stopOpacity={dark ? 0.2 : 0.1} />
            <Stop offset="1" stopColor={color.brand} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#wa${id})`} />
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#wb${id})`} />
      </Svg>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    top: { height: 44, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space[4] },
    skip: { paddingHorizontal: space[2], paddingVertical: space[1], borderRadius: radius.pill },
    pager: { flex: 1 },
    slide: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[4], paddingHorizontal: space[6] },
    drift: { alignItems: 'center', alignSelf: 'stretch' },
    title: { textAlign: 'center', maxWidth: 440 },
    line: { textAlign: 'center', maxWidth: 440 },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: space[2], paddingVertical: space[4] },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.fill },
    dotOn: { width: 22, backgroundColor: color.brand },
    actions: { paddingHorizontal: space[4], width: '100%', maxWidth: 480, alignSelf: 'center' },
  }),
);
