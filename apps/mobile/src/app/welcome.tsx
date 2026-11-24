/**
 * The welcome tour, once, straight after making an account: what GymGO is
 * for, told as one page you scroll, as a product page does. Each part holds
 * still on the screen while your scrolling plays it:
 *
 *   - Find a gym that lets you in: pins drop on a map, one opens, and what
 *     the gym publishes (or "Call first") rises up from below.
 *   - Know what to do when you get there: the sets of a lift tick off, a
 *     record lands and the rest timer fills.
 *   - Collect every gym you visit: three cards fan out, the rarest one
 *     catches the light, and the visit tiers follow.
 *
 * Then on to wherever you were going (a link opened before signing up), or
 * Home. Next scrolls on to the end of the next part (so it plays); Skip
 * leaves at any time.
 *
 * Nothing drawn here stands in for a real gym: no names, no prices, no
 * photos, only the shapes of what the app shows. With Reduce Motion (the
 * phone's or Appearance's) the parts don't hold or move: every one is
 * simply shown, finished, one after another.
 *
 * Holding still: in a browser the part's stage is CSS `position: sticky`,
 * so the browser keeps it in place while it scrolls; on a phone it's moved
 * down with the scroll on the UI thread (a transform from the scroll
 * handler), so it never trails a frame behind.
 */

import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Extrapolation,
  FadeInDown,
  ReduceMotion,
  interpolate,
  runOnJS,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { AppBadge, Wordmark } from '@/components/BrandMark';
import { ExerciseGlyph } from '@/components/ExerciseGlyph';
import { TIER_METAL } from '@/components/GemCard';
import { Icon, type IconName } from '@/components/Icon';
import { EASE_OUT, Pressable, useCalm } from '@/components/motion';
import { useGlassRedraw } from '@/components/Redrawn';
import { SAMPLE_CARDS, SampleCard } from '@/components/SampleCard';
import { ScreenOptions } from '@/components/ScreenOptions';
import { PrimaryButton, TIER_COLOUR, Txt } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { usePageTitle } from '@/lib/pageTitle';
import { color, dropShadow, face, radius, space, themed } from '@/lib/theme';

/** A part's height, in screens: one to see it, the rest is the scrolling that plays it. */
const SCENE = 2.1;
/** A browser keeps a part's stage still itself; a phone moves it with the scroll. */
const STICKY = Platform.OS === 'web';

type Part = { eyebrow: string; title: string; line: string; visual: (progress: SharedValue<number>, width: number) => ReactNode };

const PARTS: Part[] = [
  {
    eyebrow: 'FIND',
    title: 'Find a gym that lets you in',
    line: 'See what each gym publishes: the price of a visit, guest hours and what to bring. Where a gym doesn’t say, GymGO says call first, and what to ask.',
    visual: (progress, width) => <FindScene progress={progress} width={width} />,
  },
  {
    eyebrow: 'TRAIN',
    title: 'Know what to do when you get there',
    line: 'Tap the muscles you want to train for a plan that fits the kit, then tick off your sets. The rest timer, plate maths and your records come free.',
    visual: (progress, width) => <TrainScene progress={progress} width={width} />,
  },
  {
    eyebrow: 'COLLECT',
    title: 'Collect every gym you visit',
    line: 'Check in at a gym for its card. Every visit rolls a rarity, cards climb from Bronze to Platinum, and every gym in a suburb completes a set.',
    visual: (progress, width) => <CollectScene progress={progress} width={width} />,
  },
];

/** 0 to 1 between `from` and `to`, eased out (quick, then settling), as a part's progress passes. */
function eased(value: number, from: number, to: number): number {
  'worklet';
  const t = interpolate(value, [from, to], [0, 1], Extrapolation.CLAMP);
  return 1 - (1 - t) * (1 - t) * (1 - t);
}

/** Fades and rises into place between `from` and `to`. */
function rise(value: number, from: number, to: number, distance = 22) {
  'worklet';
  const t = eased(value, from, to);
  return { opacity: t, transform: [{ translateY: (1 - t) * distance }] };
}

export default function WelcomeScreen() {
  useGlassRedraw();
  usePageTitle('Welcome');
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const calm = useCalm();
  const wide = width >= 900;
  const scroller = useAnimatedRef<Animated.ScrollView>();
  // The scrolling part's own height (the screen less the bars above and below it): a part holds for this long.
  const [screen, setScreen] = useState(0);
  const scrollY = useSharedValue(0);
  // How far it scrolls: known from the content's size (not only once it has scrolled, or Next's first tap went nowhere).
  const room = useSharedValue(1);
  const contentHeight = useRef(0);
  const measure = (content: number, view: number) => {
    if (content > 0 && view > 0) room.value = Math.max(1, content - view);
  };
  // Where each part (and the end) starts and how tall it is, for Next.
  const parts = useRef<Array<{ top: number; height: number }>>([]);
  const [atEnd, setAtEnd] = useState(false);
  const endShared = useSharedValue(false);

  const finish = () => {
    haptic.success();
    router.replace((next && next.startsWith('/') && !next.startsWith('//') ? next : '/') as Href);
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
    const stops = parts.current.map((part) => part.top + Math.max(0, part.height - screen) * (calm ? 0 : 0.9));
    const to = stops.find((stop) => stop > now + 8) ?? room.value;
    scroller.current?.scrollTo({ y: Math.min(to, room.value), animated: true });
  };

  // How far through the tour: a hairline under the top bar.
  const progressStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: Math.min(1, Math.max(0, scrollY.value / room.value)) }] }));

  return (
    <View style={[styles.page, { paddingTop: insets.top, paddingBottom: insets.bottom + space[3] }]}>
      <ScreenOptions options={{ headerShown: false }} />
      <Txt variant="body" accessibilityRole="header" level={1} style={styles.unseen}>
        Welcome to GymGO
      </Txt>
      <View style={styles.top}>
        <Wordmark height={22} />
        {!atEnd && (
          <Pressable onPress={finish} accessibilityRole="button" accessibilityLabel="Skip the tour" hitSlop={10} style={({ pressed }) => [styles.skip, pressed && { opacity: 0.6 }]}>
            <Txt variant="body" color={color.brand} style={face('semibold')}>
              Skip
            </Txt>
          </Pressable>
        )}
      </View>
      <View style={styles.track} aria-hidden>
        <Animated.View style={[styles.trackFill, progressStyle]} />
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
        onContentSizeChange={(_, height) => {
          contentHeight.current = height;
          measure(height, screen);
        }}
        style={styles.scroller}
      >
        {screen > 0 && (
          <>
            <Hero screen={screen} scrollY={scrollY} calm={calm} />
            {PARTS.map((part, index) => (
              <Scene
                key={part.eyebrow}
                part={part}
                screen={screen}
                width={width}
                wide={wide}
                scrollY={scrollY}
                calm={calm}
                onPlace={(top, height) => {
                  parts.current[index] = { top, height };
                }}
              />
            ))}
            <Finale screen={screen} scrollY={scrollY} calm={calm} />
          </>
        )}
      </Animated.ScrollView>

      <View style={styles.actions}>
        <PrimaryButton label={atEnd ? 'Get started' : 'Next'} icon={atEnd ? 'check' : undefined} onPress={() => (atEnd ? finish() : goNext())} />
      </View>
    </View>
  );
}

// --- The opening ------------------------------------------------------------

/** The badge, the name and three words; it drifts up and away as you start to scroll. */
function Hero({ screen, scrollY, calm }: { screen: number; scrollY: SharedValue<number>; calm: boolean }) {
  // The opening line, large: bigger again on a wide screen (its own size, not `fluid`'s, which caps a page title lower).
  const { width } = useWindowDimensions();
  const titleSize = width >= 700 ? 72 : width >= 380 ? 44 : 38;
  const leave = useAnimatedStyle(() => {
    if (calm) return {};
    return {
      opacity: interpolate(scrollY.value, [0, screen * 0.5], [1, 0], Extrapolation.CLAMP),
      transform: [{ translateY: interpolate(scrollY.value, [0, screen], [0, screen * 0.3], Extrapolation.CLAMP) }, { scale: interpolate(scrollY.value, [0, screen * 0.6], [1, 0.9], Extrapolation.CLAMP) }],
    };
  });
  // The badge settles in once, as the tour opens.
  const arrive = useSharedValue(calm ? 1 : 0);
  useEffect(() => {
    arrive.value = withTiming(1, { duration: 900, easing: EASE_OUT, reduceMotion: ReduceMotion.System });
  }, [arrive]);
  const badge = useAnimatedStyle(() => ({ opacity: arrive.value, transform: [{ scale: 0.7 + arrive.value * 0.3 }, { translateY: (1 - arrive.value) * 18 }] }));
  // "Scroll" nods downward until you do.
  const nod = useSharedValue(0);
  useEffect(() => {
    if (calm) return;
    nod.value = withDelay(1400, withRepeat(withSequence(withTiming(6, { duration: 650, easing: EASE_OUT }), withTiming(0, { duration: 650 })), -1));
  }, [calm, nod]);
  const hint = useAnimatedStyle(() => ({
    opacity: calm ? 1 : interpolate(scrollY.value, [0, screen * 0.15], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: nod.value }],
  }));
  const words = ['Find a gym.', 'Train.', 'Collect it.'];

  return (
    <View style={[styles.heroWrap, { height: calm ? undefined : screen }]}>
      <Animated.View style={[styles.hero, leave]}>
        <Animated.View style={[styles.badge, badge]}>
          <AppBadge size={88} />
        </Animated.View>
        <Txt variant="largeTitle" style={[styles.heroTitle, { fontSize: titleSize, lineHeight: Math.round(titleSize * 1.12) }]}>
          Welcome to GymGO
        </Txt>
        <View style={styles.heroWords} accessible accessibilityLabel={words.join(' ')}>
          {words.map((word, index) => (
            <Animated.View key={word} entering={FadeInDown.duration(520).delay(350 + index * 220).easing(EASE_OUT).reduceMotion(ReduceMotion.System)}>
              <Txt variant="title2" color={index === 2 ? color.brand : color.labelSecondary} style={face('semibold')}>
                {word}
              </Txt>
            </Animated.View>
          ))}
        </View>
      </Animated.View>
      {!calm && (
        <Animated.View style={[styles.hint, hint]} aria-hidden>
          <Txt variant="footnote" color={color.labelSecondary} style={face('medium')}>
            Scroll to explore
          </Txt>
          <View style={styles.down}>
            <Icon name="chevron" size={14} color={color.labelSecondary} />
          </View>
        </Animated.View>
      )}
    </View>
  );
}

// --- A part that holds while it plays -------------------------------------------

function Scene({
  part,
  screen,
  width,
  wide,
  scrollY,
  calm,
  onPlace,
}: {
  part: Part;
  screen: number;
  width: number;
  wide: boolean;
  scrollY: SharedValue<number>;
  calm: boolean;
  onPlace: (top: number, height: number) => void;
}) {
  const top = useSharedValue(0);
  const span = screen * (SCENE - 1);
  // How far its scrolling has played it, 0 to 1, while it holds still.
  const progress = useDerivedValue(() => (calm ? 1 : Math.min(1, Math.max(0, (scrollY.value - top.value) / span))));
  // Its words come up as it rises into view, before it holds.
  const enter = useDerivedValue(() => (calm ? 1 : Math.min(1, Math.max(0, (scrollY.value - (top.value - screen * 0.6)) / (screen * 0.55)))));
  const hold = useAnimatedStyle(() => (calm || STICKY ? {} : { transform: [{ translateY: Math.min(span, Math.max(0, scrollY.value - top.value)) }] }));
  const words = useAnimatedStyle(() => (calm ? {} : rise(enter.value, 0, 1, 32)));
  // The visual's room: the screen's width, less margins, or its half on a wide screen.
  const room = wide ? Math.min(460, width / 2 - space[8]) : Math.min(380, width - space[6] * 2);

  return (
    <View
      onLayout={(event) => {
        top.value = event.nativeEvent.layout.y;
        onPlace(event.nativeEvent.layout.y, event.nativeEvent.layout.height);
      }}
      style={{ height: calm ? undefined : screen * SCENE }}
    >
      <Animated.View style={[styles.stage, wide && styles.stageWide, !calm && { height: screen }, !calm && STICKY && styles.sticky, calm && styles.stageCalm, hold]}>
        <Animated.View style={[styles.words, wide && styles.wordsWide, words]} accessible accessibilityLabel={`${part.title}. ${part.line}`}>
          <Txt variant="eyebrow" color={color.brand} style={[styles.eyebrow, !wide && styles.center]}>
            {part.eyebrow}
          </Txt>
          <Txt variant="largeTitle" fluid style={[styles.title, !wide && styles.center]}>
            {part.title}
          </Txt>
          <Txt variant="body" color={color.labelSecondary} style={[styles.line, !wide && styles.center]}>
            {part.line}
          </Txt>
        </Animated.View>
        <View style={[styles.visual, { width: room }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
          {part.visual(progress, room)}
        </View>
      </Animated.View>
    </View>
  );
}

// --- Find: pins drop, one opens --------------------------------------------------

const MAP_W = 320;
const MAP_H = 250;
/** Where the pins land (in the map's 320 × 250), and what each says: lets you in, call first, no. */
const PINS: Array<{ x: number; y: number; tier: keyof typeof TIER_COLOUR }> = [
  { x: 64, y: 58, tier: 'confirmed' },
  { x: 214, y: 46, tier: 'needs_confirmation' },
  { x: 112, y: 150, tier: 'ruled_out' },
  { x: 246, y: 128, tier: 'confirmed' },
];

function FindScene({ progress, width }: { progress: SharedValue<number>; width: number }) {
  const height = (width * MAP_H) / MAP_W;
  const sheet = useAnimatedStyle(() => rise(progress.value, 0.42, 0.58, 60));
  return (
    <View style={[styles.map, { width, height }]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={MAP_W} height={MAP_H} fill={color.card} />
        {/* A park, a river and the streets: shapes of a map, nowhere in particular. */}
        <Rect x={150} y={150} width={120} height={70} rx={16} fill={color.goodTint} />
        <Path d="M-10 205 C 60 185, 110 230, 180 210 S 290 190, 340 214" stroke={color.brandTint} strokeWidth={14} fill="none" />
        {[40, 110, 180, 260].map((x) => (
          <Path key={`v${x}`} d={`M${x} -10 L${x + 18} ${MAP_H + 10}`} stroke={color.fill} strokeWidth={x === 180 ? 9 : 5} />
        ))}
        {[34, 96, 168].map((y) => (
          <Path key={`h${y}`} d={`M-10 ${y} L${MAP_W + 10} ${y - 12}`} stroke={color.fill} strokeWidth={y === 96 ? 9 : 5} />
        ))}
      </Svg>
      <You x={(160 / MAP_W) * width} y={(112 / MAP_H) * height} />
      {PINS.map((pin, index) => (
        <MapPin key={`${pin.x}-${pin.y}`} progress={progress} at={0.04 + index * 0.07} picked={index === 3} x={(pin.x / MAP_W) * width} y={(pin.y / MAP_H) * height} tier={pin.tier} />
      ))}
      <Animated.View style={[styles.sheet, sheet]}>
        <View style={styles.sheetHead}>
          <View style={[styles.sheetDot, { backgroundColor: TIER_COLOUR.confirmed.fill }]} />
          <Txt variant="headline" style={styles.flex} numberOfLines={1}>
            Lets visitors in
          </Txt>
          <Txt variant="caption" color={color.labelSecondary}>
            A gym near you
          </Txt>
        </View>
        <SheetRow progress={progress} at={0.56} icon="wallet" label="Price of a visit" value="Published" good />
        <SheetRow progress={progress} at={0.64} icon="clock" label="Guest hours" value="Published" good />
        <SheetRow progress={progress} at={0.72} icon="call" label="What to bring" value="Call first" />
      </Animated.View>
    </View>
  );
}

/** You, on the map: a dot with a ring that breathes. */
function You({ x, y }: { x: number; y: number }) {
  const calm = useCalm();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (!calm) pulse.value = withRepeat(withTiming(1, { duration: 1800, easing: EASE_OUT }), -1);
  }, [calm, pulse]);
  const ring = useAnimatedStyle(() => ({ opacity: 0.5 * (1 - pulse.value), transform: [{ scale: 1 + pulse.value * 1.6 }] }));
  return (
    <View style={[styles.you, { left: x - 9, top: y - 9 }]}>
      <Animated.View style={[styles.youRing, ring]} />
      <View style={styles.youDot} />
    </View>
  );
}

/** A pin that drops in as the part plays, and one that grows when it's picked. */
function MapPin({ progress, at, picked, x, y, tier }: { progress: SharedValue<number>; at: number; picked: boolean; x: number; y: number; tier: keyof typeof TIER_COLOUR }) {
  const style = useAnimatedStyle(() => {
    const drop = eased(progress.value, at, at + 0.1);
    // A little give as it lands, as a map's pins do.
    const land = interpolate(progress.value, [at + 0.08, at + 0.11, at + 0.14], [0, -4, 0], Extrapolation.CLAMP);
    const grow = picked ? interpolate(eased(progress.value, 0.34, 0.44), [0, 1], [1, 1.4]) : 1;
    return { opacity: drop, transform: [{ translateY: (1 - drop) * -46 + land }, { scale: grow }] };
  });
  const fill = TIER_COLOUR[tier].fill;
  return (
    <Animated.View style={[styles.pin, { left: x - 12, top: y - 32 }, style]}>
      <Svg width={24} height={32} viewBox="0 0 24 32">
        <Path d="M12 0C5.4 0 0 5.3 0 11.9 0 20.4 12 32 12 32s12-11.6 12-20.1C24 5.3 18.6 0 12 0z" fill={fill} />
        <Circle cx={12} cy={12} r={4.6} fill="#FFFFFF" />
      </Svg>
    </Animated.View>
  );
}

function SheetRow({ progress, at, icon, label, value, good = false }: { progress: SharedValue<number>; at: number; icon: IconName; label: string; value: string; good?: boolean }) {
  const style = useAnimatedStyle(() => rise(progress.value, at, at + 0.08, 10));
  const tone = good ? TIER_COLOUR.confirmed : TIER_COLOUR.needs_confirmation;
  return (
    <Animated.View style={[styles.sheetRow, style]}>
      <Icon name={icon} size={15} color={color.labelSecondary} />
      <Txt variant="subhead" style={styles.flex} numberOfLines={1}>
        {label}
      </Txt>
      <View style={[styles.sheetTag, { backgroundColor: tone.tint }]}>
        <Txt variant="caption" color={tone.ink} style={face('semibold')}>
          {value}
        </Txt>
      </View>
    </Animated.View>
  );
}

// --- Train: sets tick off, a record, the rest -----------------------------------------

const SETS = [
  { weight: '60 kg', reps: 8, at: 0.18 },
  { weight: '60 kg', reps: 8, at: 0.32 },
  { weight: '62.5 kg', reps: 8, at: 0.46 },
];

function TrainScene({ progress, width }: { progress: SharedValue<number>; width: number }) {
  const rest = useAnimatedStyle(() => rise(progress.value, 0.6, 0.68, 14));
  const fill = useAnimatedStyle(() => ({ transform: [{ scaleX: eased(progress.value, 0.66, 0.96) }] }));
  const card = useAnimatedStyle(() => rise(progress.value, 0, 0.12, 30));
  return (
    <Animated.View style={[styles.workout, { width }, card]}>
      <View style={styles.workoutHead}>
        <View style={styles.glyph}>
          <ExerciseGlyph exerciseId="bench-press" size={58} ink={color.label} accent={color.brand} moving />
        </View>
        <View style={styles.flex}>
          <Txt variant="label" color={color.brand}>
            3 × 8–10 · 1½ min rest
          </Txt>
          <Txt variant="headline">Barbell bench press</Txt>
        </View>
      </View>
      {SETS.map((set, index) => (
        <SetRow key={index} progress={progress} index={index} weight={set.weight} reps={set.reps} at={set.at} record={index === 2} />
      ))}
      <Animated.View style={[styles.rest, rest]}>
        <Icon name="timer" size={16} color={color.brand} />
        <Txt variant="subhead" style={face('semibold')}>
          Rest
        </Txt>
        <View style={styles.restTrack}>
          <Animated.View style={[styles.restFill, fill]} />
        </View>
        <Txt variant="subhead" color={color.labelSecondary} style={styles.tabular}>
          1:30
        </Txt>
      </Animated.View>
    </Animated.View>
  );
}

function SetRow({ progress, index, weight, reps, at, record }: { progress: SharedValue<number>; index: number; weight: string; reps: number; at: number; record: boolean }) {
  // The colour read here, not in the worklet, so the worklet takes a string rather than the whole palette.
  const done = color.goodTint;
  const row = useAnimatedStyle(() => ({ backgroundColor: eased(progress.value, at, at + 0.06) > 0.5 ? done : 'transparent' }));
  const tick = useAnimatedStyle(() => {
    const t = eased(progress.value, at, at + 0.06);
    return { opacity: t, transform: [{ scale: 0.4 + t * 0.6 }] };
  });
  const trophy = useAnimatedStyle(() => {
    const t = eased(progress.value, at + 0.06, at + 0.14);
    return { opacity: t, transform: [{ scale: 0.6 + t * 0.4 }, { translateX: (1 - t) * -8 }] };
  });
  return (
    <Animated.View style={[styles.setRow, row]}>
      <Txt variant="subhead" color={color.labelSecondary} style={[styles.setNo, face('semibold')]}>
        {String(index + 1)}
      </Txt>
      <Txt variant="body" style={[styles.flex, face('semibold'), styles.tabular]}>
        {`${weight} × ${reps}`}
      </Txt>
      {record && (
        <Animated.View style={[styles.record, trophy]}>
          <Icon name="trophy" size={13} color={color.maybeInk} />
          <Txt variant="caption" color={color.maybeInk} style={face('semibold')}>
            Heaviest yet
          </Txt>
        </Animated.View>
      )}
      <View style={styles.tickBox}>
        <Animated.View style={[styles.tickOn, tick]}>
          <Icon name="check" size={14} color="#FFFFFF" />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

// --- Collect: cards fan out, the rare one shines ----------------------------------------

function CollectScene({ progress, width }: { progress: SharedValue<number>; width: number }) {
  const cardW = Math.min(150, width / 2.5);
  const cardH = cardW * 1.42;
  const tiers = useAnimatedStyle(() => rise(progress.value, 0.6, 0.72, 16));
  return (
    <View style={styles.collect}>
      <View style={{ width, height: cardH + 60, alignItems: 'center', justifyContent: 'center' }}>
        {SAMPLE_CARDS.map((card, index) => (
          <FanCard key={card.label} progress={progress} side={index - 1} width={cardW} height={cardH} label={card.label} colors={card.colors} shines={index === 1} />
        ))}
      </View>
      <Animated.View style={[styles.tiers, tiers]}>
        {(['bronze', 'silver', 'gold', 'platinum'] as const).map((tier, index) => (
          <View key={tier} style={styles.tier}>
            <View style={[styles.medal, { backgroundColor: TIER_METAL[tier] }]}>
              <Txt variant="caption" color="#FFFFFF" style={face('bold')}>
                {String(index + 1)}
              </Txt>
            </View>
            <Txt variant="caption" color={color.labelSecondary} style={face('medium')}>
              {tier[0]!.toUpperCase() + tier.slice(1)}
            </Txt>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

/** One card of the three: stacked to start, fanned out as the part plays; the middle one rises and catches the light. */
function FanCard({ progress, side, width, height, label, colors, shines }: { progress: SharedValue<number>; side: number; width: number; height: number; label: string; colors: [string, string, string]; shines: boolean }) {
  const style = useAnimatedStyle(() => {
    const fan = eased(progress.value, 0.06, 0.46);
    const show = eased(progress.value, 0, 0.1);
    return {
      opacity: show,
      zIndex: side === 0 ? 2 : 1,
      transform: [
        { translateX: side * fan * width * 0.62 },
        { translateY: side === 0 ? -fan * 18 + (1 - show) * 30 : fan * 14 + (1 - show) * 30 },
        { rotate: `${side * fan * 13}deg` },
        { scale: side === 0 ? 1 + fan * 0.06 : 1 - fan * 0.04 },
      ],
    };
  });
  // A band of light sweeps across the rare card, as its foil does in the collection.
  const sheen = useAnimatedStyle(() => ({ transform: [{ translateX: interpolate(progress.value, [0.44, 0.9], [-width * 1.3, width * 1.3], Extrapolation.CLAMP) }, { rotate: '18deg' }] }));
  return (
    <Animated.View style={[styles.fanCard, { width, height, marginLeft: -width / 2, marginTop: -height / 2 }, style]}>
      <SampleCard width={width} height={height} label={label} colors={colors}>
        {shines && (
          <Animated.View style={[styles.sheen, { width: width * 0.45, height: height * 1.6, top: -height * 0.3 }, sheen]}>
            <Svg width="100%" height="100%">
              <Defs>
                <LinearGradient id={`sheen${label}`} x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
                  <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.55} />
                  <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill={`url(#sheen${label})`} />
            </Svg>
          </Animated.View>
        )}
      </SampleCard>
    </Animated.View>
  );
}

// --- The end -------------------------------------------------------------------

/** The three things, together, and away you go (the button below says Get started). */
function Finale({ screen, scrollY, calm }: { screen: number; scrollY: SharedValue<number>; calm: boolean }) {
  const top = useSharedValue(0);
  const enter = useDerivedValue(() => (calm ? 1 : Math.min(1, Math.max(0, (scrollY.value - (top.value - screen * 0.75)) / (screen * 0.5)))));
  const style = useAnimatedStyle(() => (calm ? {} : { opacity: eased(enter.value, 0, 1), transform: [{ scale: 0.94 + eased(enter.value, 0, 1) * 0.06 }] }));
  const icons: IconName[] = ['door', 'workout', 'cards'];
  return (
    <View onLayout={(event) => (top.value = event.nativeEvent.layout.y)} style={[styles.finaleWrap, { minHeight: calm ? undefined : screen * 0.9 }]}>
      <Animated.View style={[styles.finale, style]} accessible accessibilityLabel="You’re all set. Find a gym near you, plan a workout, or just look around.">
        <View style={styles.trio} aria-hidden>
          {icons.map((icon, index) => (
            <FinaleIcon key={icon} icon={icon} index={index} enter={enter} />
          ))}
        </View>
        <Txt variant="largeTitle" fluid style={styles.center}>
          You’re all set
        </Txt>
        <Txt variant="body" color={color.labelSecondary} style={[styles.center, styles.line]}>
          Find a gym near you, plan a workout, or just look around.
        </Txt>
      </Animated.View>
    </View>
  );
}

function FinaleIcon({ icon, index, enter }: { icon: IconName; index: number; enter: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const t = eased(enter.value, 0.2 + index * 0.12, 0.6 + index * 0.12);
    return { opacity: t, transform: [{ translateY: (1 - t) * 24 }, { scale: 0.7 + t * 0.3 }] };
  });
  return (
    <Animated.View style={[styles.trioTile, style]}>
      <Icon name={icon} size={26} color={color.brand} />
    </Animated.View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    // Read by a screen reader, never seen: the usual visually-hidden box (as components/RouteFocus.tsx).
    unseen: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', pointerEvents: 'none' } as object,
    page: { flex: 1, backgroundColor: color.groupedBackground },
    top: { height: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space[4] },
    skip: { paddingHorizontal: space[2], paddingVertical: space[1], borderRadius: radius.pill },
    track: { height: 2, marginHorizontal: space[4], borderRadius: 1, backgroundColor: color.fill, overflow: 'hidden' },
    trackFill: { height: 2, backgroundColor: color.brand, transformOrigin: 'left' } as object,
    scroller: { flex: 1 },
    flex: { flex: 1, minWidth: 0 },
    center: { textAlign: 'center' },
    tabular: { fontVariant: ['tabular-nums'] },

    heroWrap: { justifyContent: 'center', paddingVertical: space[8] },
    hero: { alignItems: 'center', gap: space[3], paddingHorizontal: space[6] },
    badge: { borderRadius: 20, marginBottom: space[2], ...dropShadow(0.2, 18, 8, 8) },
    // Bigger than a page's title: the one line the tour opens on.
    heroTitle: { textAlign: 'center', letterSpacing: -0.8, ...face('bold') },
    heroWords: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: space[2] },
    hint: { position: 'absolute', bottom: space[6], alignSelf: 'center', alignItems: 'center', gap: 2 },
    down: { transform: [{ rotate: '90deg' }] },

    stage: { alignItems: 'center', justifyContent: 'center', gap: space[6], paddingHorizontal: space[6], overflow: 'visible' },
    stageWide: { flexDirection: 'row', gap: space[8], paddingHorizontal: space[8] },
    stageCalm: { paddingVertical: space[8] },
    sticky: { position: 'sticky', top: 0 } as object,
    words: { alignItems: 'center', gap: space[2], maxWidth: 520 },
    wordsWide: { alignItems: 'flex-start', flex: 1, maxWidth: 460 },
    eyebrow: { letterSpacing: 1.6 },
    title: { maxWidth: 520 },
    line: { maxWidth: 460 },
    visual: { alignItems: 'center', justifyContent: 'center' },

    map: { borderRadius: radius.xl, borderCurve: 'continuous', overflow: 'hidden', ...dropShadow(0.12, 24, 10, 6) },
    you: { position: 'absolute', width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
    youRing: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: color.brand },
    youDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: color.brand, borderWidth: 2.5, borderColor: '#FFFFFF' },
    pin: { position: 'absolute', width: 24, height: 32, transformOrigin: 'bottom' } as object,
    sheet: {
      position: 'absolute',
      left: space[3],
      right: space[3],
      bottom: space[3],
      gap: space[2],
      padding: space[3],
      borderRadius: radius.lg,
      borderCurve: 'continuous',
      backgroundColor: color.plate,
      ...dropShadow(0.18, 18, 8, 8),
    },
    sheetHead: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginBottom: 2 },
    sheetDot: { width: 10, height: 10, borderRadius: 5 },
    sheetRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    sheetTag: { paddingHorizontal: space[2], paddingVertical: 2, borderRadius: radius.pill },

    workout: { gap: space[2], padding: space[4], borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: color.plate, ...dropShadow(0.12, 24, 10, 6) },
    workoutHead: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginBottom: space[1] },
    glyph: { width: 64, height: 64, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: color.brandWash },
    setRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 44, paddingHorizontal: space[2], borderRadius: radius.md, borderCurve: 'continuous' },
    setNo: { width: 18, textAlign: 'center' },
    record: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space[2], paddingVertical: 2, borderRadius: radius.pill, backgroundColor: color.maybeTint },
    tickBox: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: color.separator, alignItems: 'center', justifyContent: 'center' },
    tickOn: { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: color.good, alignItems: 'center', justifyContent: 'center' },
    rest: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[1], padding: space[3], borderRadius: radius.md, backgroundColor: color.brandWash },
    restTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: color.fill, overflow: 'hidden' },
    restFill: { height: 6, borderRadius: 3, backgroundColor: color.brand, transformOrigin: 'left' } as object,

    collect: { alignItems: 'center', gap: space[4] },
    fanCard: { position: 'absolute', left: '50%', top: '50%', borderRadius: radius.lg, borderCurve: 'continuous', ...dropShadow(0.22, 16, 8, 8) },
    sheen: { position: 'absolute', left: '30%' },
    tiers: { flexDirection: 'row', gap: space[4] },
    tier: { alignItems: 'center', gap: 4 },
    medal: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

    finaleWrap: { justifyContent: 'center', paddingVertical: space[8], paddingHorizontal: space[6] },
    finale: { alignItems: 'center', gap: space[3], alignSelf: 'center', maxWidth: 520 },
    trio: { flexDirection: 'row', gap: space[3], marginBottom: space[2] },
    trioTile: { width: 56, height: 56, borderRadius: 18, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: color.brandWash },

    actions: { paddingHorizontal: space[4], paddingTop: space[2], width: '100%', maxWidth: 480, alignSelf: 'center' },
  }),
);
