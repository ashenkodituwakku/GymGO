/**
 * The tour's later parts (app/welcome.tsx).
 *
 * The reel: six more things GymGO does, on tiles in a row that slides
 * sideways as you scroll down, the one in the middle forward and the rest
 * turned a little away, as a shelf seen from the front.
 *
 * Collect: three cards fly in face down, fan out, and turn over one after
 * another (the Legendary one last), as a pack opened; a band of light
 * crosses it, and the visit tiers follow.
 *
 * Numbers: how much is in GymGO, counted up as they come into view, from
 * the app's own lists (never made up): its exercises, its built-in cities,
 * the countries you can pick, and the rarities a visit can roll.
 *
 * The end: the three things, together, and on to the questions.
 */

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, runOnJS, useAnimatedReaction, useAnimatedStyle, useDerivedValue, useSharedValue, type SharedValue } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { RARITIES } from '@gymgo/domain';
import { AppBadge } from '../BrandMark';
import { CountUp } from '../CountUp';
import { TIER_METAL } from '../GemCard';
import { Icon, type IconName } from '../Icon';
import { SAMPLE_CARDS, SampleCard } from '../SampleCard';
import { Txt } from '../ui';
import { PartStage, PartWords, roomFor } from './FindTrain';
import { Pinned, eased, rise, smooth, type Play } from './kit';
import { COUNTRIES } from '@/lib/country';
import { CITY_LIST } from '@/lib/places';
import { color, face, radius, space, themed } from '@/lib/theme';
import { EXERCISES } from '@/lib/workout';

interface PartProps {
  screen: number;
  scrollY: SharedValue<number>;
  calm: boolean;
  width: number;
  wide: boolean;
  onPlace: (top: number, height: number) => void;
}

// --- The reel ----------------------------------------------------------------------

const TILES: Array<{ icon: IconName; title: string; line: string; colors: [string, string] }> = [
  { icon: 'timer', title: 'Rest timer', line: 'Starts as you tick a set, with −15, +15 and Skip.', colors: ['#7C6CFF', '#4B3BD6'] },
  { icon: 'plates', title: 'Plate maths', line: 'What to load on each side of the bar.', colors: ['#4DA3FF', '#2563EB'] },
  { icon: 'trophy', title: 'Your records', line: 'Heaviest, strongest and longest, with a trophy the moment you beat one.', colors: ['#FFC94D', '#D98200'] },
  { icon: 'clock', title: 'Timed sets', line: 'Planks by time, with a stopwatch on the set; carries by distance.', colors: ['#3FD0B6', '#0E8F7A'] },
  { icon: 'people', title: 'Friends’ feed', line: 'Your friends’ workouts: like them, comment, or do theirs.', colors: ['#FF8AB8', '#D63B7A'] },
  { icon: 'calendar', title: 'Monthly report', line: 'Your month against the last: workouts, time and weight lifted.', colors: ['#8E7BFF', '#3A2A8C'] },
];

export function ReelPart(props: PartProps) {
  const tileW = props.wide ? 300 : Math.min(250, props.width * 0.66);
  const tileH = Math.round(tileW * 1.12);
  const gap = space[4];
  const words = (enter: SharedValue<number>) => <PartWords eyebrow="AND MORE" title="Everything else, built in" line="The small things that make a workout go smoothly." enter={enter} wide={false} />;
  if (props.calm) {
    // Still: the tiles in a grid, all at once.
    return (
      <Pinned screen={props.screen} scrollY={props.scrollY} calm length={1} onPlace={props.onPlace}>
        {(play) => (
          <View style={styles.reelStage}>
            {words(play.enter)}
            <View style={styles.grid}>
              {TILES.map((tile) => (
                <TileFace key={tile.title} tile={tile} width={Math.min(tileW, (props.width - space[6] * 2 - gap) / 2)} height={tileH * 0.8} />
              ))}
            </View>
          </View>
        )}
      </Pinned>
    );
  }
  return (
    <Pinned screen={props.screen} scrollY={props.scrollY} calm={false} length={2.4} onPlace={props.onPlace}>
      {(play) => (
        <View style={styles.reelStage}>
          {words(play.enter)}
          <Shelf play={play} width={props.width} tileW={tileW} tileH={tileH} gap={gap} />
        </View>
      )}
    </Pinned>
  );
}

function Shelf({ play, width, tileW, tileH, gap }: { play: Play; width: number; tileW: number; tileH: number; gap: number }) {
  const step = tileW + gap;
  const start = width / 2 - tileW / 2;
  const end = start - (TILES.length - 1) * step;
  // Where the row is, the first tile in the middle to start and the last at the end.
  const x = useDerivedValue(() => start + (end - start) * smooth(play.progress.value, 0.06, 0.94));
  const row = useAnimatedStyle(() => ({ opacity: eased(play.progress.value, 0, 0.08), transform: [{ translateX: x.value }] }));
  return (
    <View style={[styles.shelf, { height: tileH + 40 }]} accessible accessibilityLabel={TILES.map((tile) => `${tile.title}: ${tile.line}`).join(' ')}>
      <Animated.View style={[styles.row, { width: TILES.length * step, gap }, row]}>
        {TILES.map((tile, index) => (
          <Tile key={tile.title} tile={tile} index={index} x={x} step={step} width={width} tileW={tileW} tileH={tileH} />
        ))}
      </Animated.View>
    </View>
  );
}

/** One tile on the shelf: forward in the middle, turned a little away and dimmer to either side. */
function Tile({ tile, index, x, step, width, tileW, tileH }: { tile: (typeof TILES)[number]; index: number; x: SharedValue<number>; step: number; width: number; tileW: number; tileH: number }) {
  const style = useAnimatedStyle(() => {
    const centre = x.value + index * step + tileW / 2;
    const off = (centre - width / 2) / step;
    const away = Math.min(1.6, Math.abs(off));
    return {
      opacity: 1 - Math.min(1, away / 1.6) * 0.55,
      transform: [{ perspective: 1000 }, { rotateY: `${Math.max(-1, Math.min(1, off)) * -16}deg` }, { scale: 1 - away * 0.09 }],
    };
  });
  return (
    <Animated.View aria-hidden style={style}>
      <TileFace tile={tile} width={tileW} height={tileH} />
    </Animated.View>
  );
}

function TileFace({ tile, width, height }: { tile: (typeof TILES)[number]; width: number; height: number }) {
  const id = `tile${tile.icon}`;
  return (
    <View style={[styles.tile, { width, height }]}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={tile.colors[0]} />
            <Stop offset="1" stopColor={tile.colors[1]} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
      <View style={styles.tileIcon}>
        <Icon name={tile.icon} size={28} color="#FFFFFF" />
      </View>
      <View style={styles.flex} />
      <Txt variant="title2" color="#FFFFFF" style={face('bold')}>
        {tile.title}
      </Txt>
      <Txt variant="subhead" color="rgba(255, 255, 255, 0.82)">
        {tile.line}
      </Txt>
    </View>
  );
}

// --- Collect ----------------------------------------------------------------------

/** The order the three turn over: Common, then Rare, then Legendary (the middle) last. */
const TURN_ORDER = [0, 2, 1];

export function CollectPart(props: PartProps) {
  return (
    <Pinned screen={props.screen} scrollY={props.scrollY} calm={props.calm} length={2.4} onPlace={props.onPlace}>
      {(play) => (
        <PartStage
          wide={props.wide}
          words={
            <PartWords
              eyebrow="COLLECT"
              title="Collect every gym you visit"
              line="Check in at a gym for its card. Every visit rolls a rarity, cards climb from Bronze to Platinum, and every gym in a suburb completes a set."
              enter={play.enter}
              wide={props.wide}
            />
          }
        >
          <PackScene play={play} width={roomFor(props.width, props.wide)} />
        </PartStage>
      )}
    </Pinned>
  );
}

function PackScene({ play, width }: { play: Play; width: number }) {
  const cardW = Math.min(150, width / 2.5);
  const cardH = Math.round(cardW * 1.42);
  const tiers = useAnimatedStyle(() => rise(play.progress.value, 0.8, 0.9, 16));
  return (
    <View style={styles.collect}>
      <View style={{ width, height: cardH + 70, alignItems: 'center', justifyContent: 'center' }}>
        {SAMPLE_CARDS.map((card, index) => (
          <PackCard key={card.label} progress={play.progress} side={index - 1} order={TURN_ORDER.indexOf(index)} width={cardW} height={cardH} label={card.label} colors={card.colors} shines={index === 1} />
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

/** One card: flies in face down, takes its place in the fan, then turns over to show its rarity. */
function PackCard({ progress, side, order, width, height, label, colors, shines }: { progress: SharedValue<number>; side: number; order: number; width: number; height: number; label: string; colors: [string, string, string]; shines: boolean }) {
  const place = useAnimatedStyle(() => {
    const arrive = smooth(progress.value, 0.02 + order * 0.04, 0.16 + order * 0.04);
    const fan = smooth(progress.value, 0.18, 0.36);
    return {
      opacity: eased(progress.value, 0.02 + order * 0.04, 0.1 + order * 0.04),
      zIndex: side === 0 ? 2 : 1,
      transform: [
        { translateX: side * fan * width * 0.66 },
        { translateY: (1 - arrive) * 220 + (side === 0 ? -fan * 18 : fan * 14) },
        { rotate: `${(1 - arrive) * (side === 0 ? 8 : side * -30) + side * fan * 13}deg` },
        { scale: 0.6 + arrive * 0.4 + (side === 0 ? fan * 0.06 : -fan * 0.04) },
      ],
    };
  });
  // Turning over: the back away, the face round (each hides once it's edge on).
  const turnAt = 0.42 + order * 0.1;
  const front = useAnimatedStyle(() => {
    const turn = smooth(progress.value, turnAt, turnAt + 0.09);
    return { opacity: turn >= 0.5 ? 1 : 0, transform: [{ perspective: 900 }, { rotateY: `${(1 - turn) * 180}deg` }] };
  });
  const back = useAnimatedStyle(() => {
    const turn = smooth(progress.value, turnAt, turnAt + 0.09);
    return { opacity: turn < 0.5 ? 1 : 0, transform: [{ perspective: 900 }, { rotateY: `${-turn * 180}deg` }] };
  });
  const sheen = useAnimatedStyle(() => ({ transform: [{ translateX: interpolate(progress.value, [0.72, 0.95], [-width * 1.3, width * 1.3], 'clamp') }, { rotate: '18deg' }] }));
  return (
    <Animated.View style={[styles.packCard, { width, height, marginLeft: -width / 2, marginTop: -height / 2 }, place]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.face, back]}>
        <CardBack width={width} height={height} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, styles.face, front]}>
        <SampleCard width={width} height={height} label={label} colors={colors}>
          {shines && (
            <Animated.View style={[styles.sheen, { width: width * 0.45, height: height * 1.6, top: -height * 0.3 }, sheen]}>
              <Svg width="100%" height="100%">
                <Defs>
                  <LinearGradient id={`packSheen${label}`} x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
                    <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.6} />
                    <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
                  </LinearGradient>
                </Defs>
                <Rect x="0" y="0" width="100%" height="100%" fill={`url(#packSheen${label})`} />
              </Svg>
            </Animated.View>
          )}
        </SampleCard>
      </Animated.View>
    </Animated.View>
  );
}

/** A card's back: GymGO's violet, its badge, and rings round it. */
function CardBack({ width, height }: { width: number; height: number }) {
  return (
    <View style={[styles.back, { width, height }]}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="cardBack" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#5B45D6" />
            <Stop offset="1" stopColor="#1A1248" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#cardBack)" />
      </Svg>
      <View style={[styles.backRing, { width: width * 0.8, height: width * 0.8, borderRadius: width * 0.4 }]} />
      <View style={[styles.backRing, { width: width * 0.55, height: width * 0.55, borderRadius: width * 0.275 }]} />
      <AppBadge size={width * 0.32} />
    </View>
  );
}

// --- Numbers ----------------------------------------------------------------------

export function Numbers({ screen, scrollY, calm, wide, onPlace }: { screen: number; scrollY: SharedValue<number>; calm: boolean; wide: boolean; onPlace: (top: number, height: number) => void }) {
  const top = useSharedValue(0);
  const enter = useDerivedValue(() => (calm ? 1 : Math.min(1, Math.max(0, (scrollY.value - (top.value - screen * 0.75)) / (screen * 0.45)))));
  // The figures count up once they're in view (not before, unseen).
  const [shown, setShown] = useState(calm);
  useAnimatedReaction(
    () => enter.value > 0.35,
    (now, before) => {
      if (now && !before) runOnJS(setShown)(true);
    },
  );
  const style = useAnimatedStyle(() => rise(enter.value, 0, 1, 40));
  const cities = CITY_LIST.filter((city) => !city.demo).length;
  const stats: Array<{ id: string; value: number; label: string }> = [
    { id: 'tour.exercises', value: EXERCISES.length, label: 'exercises to plan with' },
    { id: 'tour.cities', value: cities, label: 'cities built in' },
    { id: 'tour.countries', value: COUNTRIES.length, label: 'countries to choose from' },
    { id: 'tour.rarities', value: RARITIES.length, label: 'rarities a visit can roll' },
  ];
  return (
    <View
      onLayout={(event) => {
        top.value = event.nativeEvent.layout.y;
        onPlace(event.nativeEvent.layout.y, event.nativeEvent.layout.height);
      }}
      style={[styles.numbersWrap, { minHeight: calm ? undefined : screen * 0.95 }]}
    >
      <Animated.View style={[styles.numbers, style]}>
        <Txt variant="eyebrow" color={color.brand} style={[styles.eyebrow, styles.center]}>
          IN GYMGO TODAY
        </Txt>
        <View style={[styles.statGrid, wide && styles.statGridWide]}>
          {stats.map((stat) => (
            <View key={stat.id} style={[styles.stat, wide && styles.statWide]} accessible accessibilityLabel={`${stat.value} ${stat.label}`}>
              {shown ? (
                <CountUp id={stat.id} value={stat.value} variant="largeTitle" color={color.brand} style={[styles.statFigure, face('bold')]} />
              ) : (
                <Txt variant="largeTitle" color={color.brand} style={[styles.statFigure, face('bold')]}>
                  0
                </Txt>
              )}
              <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
                {stat.label}
              </Txt>
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

// --- The end ----------------------------------------------------------------------

export function Finale({ screen, scrollY, calm }: { screen: number; scrollY: SharedValue<number>; calm: boolean }) {
  const top = useSharedValue(0);
  const enter = useDerivedValue(() => (calm ? 1 : Math.min(1, Math.max(0, (scrollY.value - (top.value - screen * 0.75)) / (screen * 0.5)))));
  const style = useAnimatedStyle(() => (calm ? {} : { opacity: eased(enter.value, 0, 1), transform: [{ scale: 0.94 + eased(enter.value, 0, 1) * 0.06 }] }));
  const icons: IconName[] = ['door', 'workout', 'cards'];
  return (
    <View onLayout={(event) => (top.value = event.nativeEvent.layout.y)} style={[styles.finaleWrap, { minHeight: calm ? undefined : screen * 0.9 }]}>
      <Animated.View style={[styles.finale, style]} accessible accessibilityLabel="Let’s set you up. A few quick questions, so GymGO opens where you train and plans for what you want. Skip any you like.">
        <View style={styles.trio} aria-hidden>
          {icons.map((icon, index) => (
            <FinaleIcon key={icon} icon={icon} index={index} enter={enter} />
          ))}
        </View>
        <Txt variant="largeTitle" fluid style={styles.center}>
          Let’s set you up
        </Txt>
        <Txt variant="body" color={color.labelSecondary} style={[styles.center, styles.lineNarrow]}>
          A few quick questions, so GymGO opens where you train and plans for what you want. Skip any you like.
        </Txt>
      </Animated.View>
    </View>
  );
}

/** The three come together from either side and below. */
function FinaleIcon({ icon, index, enter }: { icon: IconName; index: number; enter: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const t = smooth(enter.value, 0.15 + index * 0.1, 0.7 + index * 0.1);
    return { opacity: t, transform: [{ translateX: (1 - t) * (index - 1) * 90 }, { translateY: (1 - t) * 40 }, { scale: 0.6 + t * 0.4 }] };
  });
  return (
    <Animated.View style={[styles.trioTile, style]}>
      <Icon name={icon} size={26} color={color.brand} />
    </Animated.View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    flex: { flex: 1 },
    center: { textAlign: 'center' },
    eyebrow: { letterSpacing: 1.6 },
    lineNarrow: { maxWidth: 460 },
    reelStage: { flex: 1, justifyContent: 'center', gap: space[6], alignItems: 'center', paddingHorizontal: space[6] },
    shelf: { alignSelf: 'stretch', marginHorizontal: -space[6], justifyContent: 'center', overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space[4] },
    tile: { padding: space[5], gap: space[2], borderRadius: radius.xl, borderCurve: 'continuous', overflow: 'hidden' },
    tileIcon: { width: 56, height: 56, borderRadius: 18, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.2)' },

    collect: { alignItems: 'center', gap: space[4] },
    packCard: { position: 'absolute', left: '50%', top: '50%' },
    face: { backfaceVisibility: 'hidden', borderRadius: radius.lg, shadowColor: '#000000', shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
    back: { borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    backRing: { position: 'absolute', borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.18)' },
    sheen: { position: 'absolute', left: '30%' },
    tiers: { flexDirection: 'row', gap: space[4] },
    tier: { alignItems: 'center', gap: 4 },
    medal: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

    numbersWrap: { justifyContent: 'center', paddingVertical: space[8], paddingHorizontal: space[6] },
    numbers: { alignItems: 'center', gap: space[6], alignSelf: 'center', width: '100%', maxWidth: 960 },
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', rowGap: space[6] },
    statGridWide: { flexWrap: 'nowrap' },
    stat: { width: '50%', alignItems: 'center', gap: 2, paddingHorizontal: space[2] },
    statWide: { width: '25%' },
    statFigure: { fontSize: 52, lineHeight: 58, letterSpacing: -1, fontVariant: ['tabular-nums'] },

    finaleWrap: { justifyContent: 'center', paddingVertical: space[8], paddingHorizontal: space[6] },
    finale: { alignItems: 'center', gap: space[3], alignSelf: 'center', maxWidth: 520 },
    trio: { flexDirection: 'row', gap: space[3], marginBottom: space[2] },
    trioTile: { width: 60, height: 60, borderRadius: 20, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: color.brandWash },
  }),
);
