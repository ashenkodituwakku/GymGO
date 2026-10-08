/**
 * The welcome tour, once, straight after making an account: what GymGO is
 * for, in three pages (find a gym that lets you in, know what to do there,
 * collect it). Swipe or tap Next; Skip at any time. Then on to wherever you
 * were going (a link opened before signing up), or Home, which asks for
 * your country the first time as before.
 *
 * Each page is an icon, a headline and a line: nothing drawn stands in for
 * a picture of a gym.
 */

import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/Icon';
import { Pressable } from '@/components/motion';
import { PrimaryButton, Txt } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { usePageTitle } from '@/lib/pageTitle';
import { color, face, radius, space, themed } from '@/lib/theme';

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
  const pager = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const last = page === PAGES.length - 1;

  const finish = () => {
    haptic.success();
    router.replace((next && next.startsWith('/') && !next.startsWith('//') ? next : '/') as Href);
  };
  const go = (to: number) => {
    haptic.select();
    setPage(to);
    pager.current?.scrollTo({ x: to * width, animated: true });
  };
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const at = Math.round(event.nativeEvent.contentOffset.x / Math.max(1, width));
    if (at !== page && at >= 0 && at < PAGES.length) setPage(at);
  };

  return (
    <View style={[styles.page, { paddingTop: insets.top + space[2], paddingBottom: insets.bottom + space[4] }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.top}>
        {!last && (
          <Pressable onPress={finish} accessibilityRole="button" accessibilityLabel="Skip the tour" hitSlop={10} style={({ pressed }) => [styles.skip, pressed && { opacity: 0.6 }]}>
            <Txt variant="body" color={color.brand} style={face('semibold')}>
              Skip
            </Txt>
          </Pressable>
        )}
      </View>

      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
        style={styles.pager}
      >
        {PAGES.map((item, index) => (
          <View key={item.title} style={[styles.slide, { width }]} accessible accessibilityLabel={`${index + 1} of ${PAGES.length}. ${item.title}. ${item.line}`}>
            <View style={styles.badge}>
              <Icon name={item.icon} size={44} color={color.onBrand} />
            </View>
            <Txt variant="largeTitle" style={styles.title}>
              {item.title}
            </Txt>
            <Txt variant="body" color={color.labelSecondary} style={styles.line}>
              {item.line}
            </Txt>
          </View>
        ))}
      </ScrollView>

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

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    top: { height: 44, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: space[4] },
    skip: { paddingHorizontal: space[2], paddingVertical: space[1], borderRadius: radius.pill },
    pager: { flex: 1 },
    slide: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[4], paddingHorizontal: space[6] },
    badge: {
      width: 104,
      height: 104,
      borderRadius: 52,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: color.brandFill,
      marginBottom: space[3],
    },
    title: { textAlign: 'center', maxWidth: 440 },
    line: { textAlign: 'center', maxWidth: 440 },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: space[2], paddingVertical: space[4] },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.fill },
    dotOn: { width: 22, backgroundColor: color.brand },
    actions: { paddingHorizontal: space[4], width: '100%', maxWidth: 480, alignSelf: 'center' },
  }),
);
