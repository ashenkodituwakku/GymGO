/**
 * The welcome tour, once, straight after making an account: what GymGO is
 * for, told as one page you scroll, as a product page plays as you scroll
 * (components/tour/). In order:
 *
 *   - The opening: the badge and name, with three tokens round it, that you
 *     fly through as you start to scroll.
 *   - The statement: what GymGO does, its words lighting up as you go.
 *   - Find: a map lands flat, pins drop, the view closes in on one gym and
 *     what it publishes rises up.
 *   - Train: a lift's sets tick off as the weight lifted counts up, a record
 *     glints, and the rest timer's ring fills.
 *   - And more: six tiles on a shelf that slides sideways as you scroll.
 *   - Collect: three cards fly in face down, fan out and turn over.
 *   - In GymGO today: its exercises, cities, countries and rarities, counted
 *     up from the app's own lists.
 *   - Then "Let's set you up", and a few quick questions
 *     (components/WelcomeSetup.tsx), each skippable, and on to wherever you
 *     were going (a link opened before signing up), or Home.
 *
 * Each part holds still while your scrolling plays it. A strip at the top
 * names the chapters (Find, Train, Collect) and fills as you go; tap one to
 * go there. Next plays the next part; Skip goes straight to the questions.
 * Behind it all, pools of soft colour (components/Aurora.tsx), washed in
 * each chapter's own light. With Reduce Motion (the phone's or
 * Appearance's) nothing holds, moves or counts: each part is shown finished.
 *
 * Nothing drawn here stands in for a real gym: no names, prices or photos.
 */

import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, ReduceMotion, interpolate, runOnJS, useAnimatedReaction, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Aurora } from '@/components/Aurora';
import { AppBadge, Wordmark } from '@/components/BrandMark';
import { Pressable, useCalm } from '@/components/motion';
import { useGlassRedraw } from '@/components/Redrawn';
import { ScreenOptions } from '@/components/ScreenOptions';
import { CollectPart, Finale, Numbers, ReelPart } from '@/components/tour/CollectMore';
import { FindPart, TrainPart } from '@/components/tour/FindTrain';
import { ChapterLight } from '@/components/tour/kit';
import { Opening, Statement } from '@/components/tour/Opening';
import { PrimaryButton, Txt } from '@/components/ui';
import { WelcomeSetup } from '@/components/WelcomeSetup';
import { haptic } from '@/lib/haptics';
import { usePageTitle } from '@/lib/pageTitle';
import { color, face, radius, space, themed } from '@/lib/theme';

/** A browser's scroll, smoothed: settling in a quarter of a second or so, never overshooting. */
const SCROLL_SPRING = { damping: 28, stiffness: 240, mass: 0.55, overshootClamping: true };

/** The parts in order, by name, for Next and the chapters. */
const ORDER = ['opening', 'statement', 'find', 'train', 'reel', 'collect', 'numbers'] as const;
type PartName = (typeof ORDER)[number];
/** The chapters the strip names, and the parts each takes in. */
const CHAPTERS: Array<{ label: string; parts: PartName[] }> = [
  { label: 'Find', parts: ['find'] },
  { label: 'Train', parts: ['train', 'reel'] },
  { label: 'Collect', parts: ['collect', 'numbers'] },
];

export default function WelcomeScreen() {
  useGlassRedraw();
  usePageTitle('Welcome');
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const calm = useCalm();
  const wide = width >= 900;
  const scroller = useAnimatedRef<Animated.ScrollView>();
  // The scrolling part's own height: a part holds for this long.
  const [screen, setScreen] = useState(0);
  const scrollY = useSharedValue(0);
  // What the animations follow: the scroll itself on a phone (already smooth to the finger); in a browser, eased
  // after it on a spring, so a mouse wheel's steps of a hundred points glide rather than jump.
  const motionY = useSharedValue(0);
  useAnimatedReaction(
    () => scrollY.value,
    (y) => {
      motionY.value = Platform.OS === 'web' ? withSpring(y, SCROLL_SPRING) : y;
    },
  );
  // How far it scrolls: from the content's size too, so Next's first tap knows.
  const room = useSharedValue(1);
  const contentHeight = useRef(0);
  const measure = (content: number, view: number) => {
    if (content > 0 && view > 0) room.value = Math.max(1, content - view);
  };
  // Where each part is, for Next; each chapter's span, for its strip and its light.
  const places = useRef<Partial<Record<PartName, { top: number; height: number }>>>({});
  const chapterRanges = useSharedValue<number[][]>([]);
  const place = (name: PartName) => (top: number, partHeight: number) => {
    places.current[name] = { top, height: partHeight };
    chapterRanges.value = CHAPTERS.map((chapter) => {
      const spans = chapter.parts.map((part) => places.current[part]).filter((span): span is { top: number; height: number } => Boolean(span));
      return spans.length ? [Math.min(...spans.map((span) => span.top)), Math.max(...spans.map((span) => span.top + span.height))] : [0, 0];
    });
  };
  const [atEnd, setAtEnd] = useState(false);
  const endShared = useSharedValue(false);
  // The story, then the questions, then away.
  const [phase, setPhase] = useState<'story' | 'setup'>('story');

  const finish = () => {
    haptic.success();
    router.replace((next && next.startsWith('/') && !next.startsWith('//') ? next : '/') as Href);
  };
  const toSetup = () => {
    haptic.select();
    setPhase('setup');
  };

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
    room.value = Math.max(1, event.contentSize.height - event.layoutMeasurement.height);
    const end = event.contentOffset.y >= room.value - event.layoutMeasurement.height * 0.25;
    if (end !== endShared.value) {
      endShared.value = end;
      runOnJS(setAtEnd)(end);
    }
  });

  /** On to where the next part has played through (or the end): the scroll there plays it. */
  const goNext = () => {
    haptic.select();
    const now = scrollY.value;
    const stops = ORDER.map((name) => places.current[name])
      .filter((span): span is { top: number; height: number } => Boolean(span))
      .map((span) => span.top + Math.max(0, span.height - screen) * (calm ? 0 : 0.92));
    const to = stops.find((stop) => stop > now + 8) ?? room.value;
    scroller.current?.scrollTo({ y: Math.min(to, room.value), animated: true });
  };
  const goChapter = (index: number) => {
    haptic.select();
    const first = places.current[CHAPTERS[index]!.parts[0]!];
    if (first) scroller.current?.scrollTo({ y: Math.min(first.top + 2, room.value), animated: true });
  };

  return (
    <View style={[styles.page, { paddingTop: insets.top, paddingBottom: insets.bottom + space[3] }]}>
      {/* Pools of soft colour, then each chapter's own light, behind it all. */}
      <Aurora scroll={phase === 'story' ? motionY : undefined} span={Math.max(1, contentHeight.current - screen)} />
      {phase === 'story' && !calm && screen > 0 && <ChapterLight scrollY={motionY} ranges={chapterRanges} screen={screen} width={width} height={height} />}
      <ScreenOptions options={{ headerShown: false }} />
      <Txt variant="body" accessibilityRole="header" level={1} style={styles.unseen}>
        Welcome to GymGO
      </Txt>
      {phase === 'setup' ? (
        <Animated.View entering={FadeIn.duration(280).reduceMotion(ReduceMotion.System)} style={styles.scroller}>
          <WelcomeSetup onDone={finish} />
        </Animated.View>
      ) : (
        <>
          <View style={styles.top}>
            {/* On a narrow phone, the badge alone, so the chapters fit beside it. */}
            {width >= 400 ? <Wordmark height={22} /> : <AppBadge size={26} />}
            <Chapters scrollY={motionY} ranges={chapterRanges} onPick={goChapter} />
            {!atEnd ? (
              <Pressable onPress={toSetup} accessibilityRole="button" accessibilityLabel="Skip the tour, on to a few quick questions" hitSlop={10} style={({ pressed }) => [styles.skip, pressed && { opacity: 0.6 }]}>
                <Txt variant="body" color={color.brand} style={face('semibold')}>
                  Skip
                </Txt>
              </Pressable>
            ) : (
              <View style={styles.skip} />
            )}
          </View>

          <Animated.ScrollView
            ref={scroller}
            onScroll={onScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            onLayout={(event) => {
              setScreen(event.nativeEvent.layout.height);
              measure(contentHeight.current, event.nativeEvent.layout.height);
            }}
            onContentSizeChange={(_, contentH) => {
              contentHeight.current = contentH;
              measure(contentH, screen);
            }}
            style={styles.scroller}
          >
            {screen > 0 && (
              <>
                <Opening screen={screen} scrollY={motionY} calm={calm} width={width} onPlace={place('opening')} />
                <Statement screen={screen} scrollY={motionY} calm={calm} width={width} onPlace={place('statement')} />
                <FindPart screen={screen} scrollY={motionY} calm={calm} width={width} wide={wide} onPlace={place('find')} />
                <TrainPart screen={screen} scrollY={motionY} calm={calm} width={width} wide={wide} onPlace={place('train')} />
                <ReelPart screen={screen} scrollY={motionY} calm={calm} width={width} wide={wide} onPlace={place('reel')} />
                <CollectPart screen={screen} scrollY={motionY} calm={calm} width={width} wide={wide} onPlace={place('collect')} />
                <Numbers screen={screen} scrollY={motionY} calm={calm} wide={wide} onPlace={place('numbers')} />
                <Finale screen={screen} scrollY={motionY} calm={calm} />
              </>
            )}
          </Animated.ScrollView>

          <View style={styles.actions}>
            <PrimaryButton label={atEnd ? 'Set up GymGO' : 'Next'} onPress={() => (atEnd ? toSetup() : goNext())} />
          </View>
        </>
      )}
    </View>
  );
}

/** The chapters, named across the top: each fills as you go through it; tap one to go there. */
function Chapters({ scrollY, ranges, onPick }: { scrollY: SharedValue<number>; ranges: SharedValue<number[][]>; onPick: (index: number) => void }) {
  return (
    <View style={styles.chapters} role="tablist" accessibilityLabel="Chapters">
      {CHAPTERS.map((chapter, index) => (
        <Chapter key={chapter.label} label={chapter.label} index={index} scrollY={scrollY} ranges={ranges} onPick={onPick} />
      ))}
    </View>
  );
}

function Chapter({ label, index, scrollY, ranges, onPick }: { label: string; index: number; scrollY: SharedValue<number>; ranges: SharedValue<number[][]>; onPick: (index: number) => void }) {
  const muted = color.labelSecondary;
  const lit = color.label;
  const fill = useAnimatedStyle(() => {
    const range = ranges.value[index];
    const from = range?.[0] ?? 0;
    const to = range?.[1] ?? 0;
    return { transform: [{ scaleX: to > from ? interpolate(scrollY.value, [from, to], [0, 1], 'clamp') : 0 }] };
  });
  const word = useAnimatedStyle(() => {
    const range = ranges.value[index];
    const inside = range ? scrollY.value >= (range[0] ?? 0) - 40 && scrollY.value < (range[1] ?? 0) : false;
    return { color: inside ? lit : muted };
  });
  return (
    <Pressable onPress={() => onPick(index)} accessibilityRole="tab" accessibilityLabel={`${label}: go to this chapter`} hitSlop={6} style={styles.chapter}>
      <Animated.Text style={[styles.chapterWord, face('semibold'), word]}>{label}</Animated.Text>
      <View style={styles.chapterTrack}>
        <Animated.View style={[styles.chapterFill, fill]} />
      </View>
    </Pressable>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    // Read by a screen reader, never seen: the usual visually-hidden box (as components/RouteFocus.tsx).
    unseen: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', pointerEvents: 'none' } as object,
    page: { flex: 1, backgroundColor: color.groupedBackground },
    top: { height: 52, flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4] },
    skip: { minWidth: 44, paddingHorizontal: space[2], paddingVertical: space[1], borderRadius: radius.pill, alignItems: 'flex-end' },
    chapters: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: space[3] },
    chapter: { alignItems: 'center', gap: 5, minWidth: 48, paddingVertical: space[1] },
    chapterWord: { fontSize: 13 },
    chapterTrack: { width: 40, height: 3, borderRadius: 2, backgroundColor: color.fill, overflow: 'hidden' },
    chapterFill: { height: 3, borderRadius: 2, backgroundColor: color.brand, transformOrigin: 'left' } as object,
    scroller: { flex: 1 },
    actions: { paddingHorizontal: space[4], paddingTop: space[2], width: '100%', maxWidth: 480, alignSelf: 'center' },
  }),
);
