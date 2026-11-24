/**
 * The tour's Find and Train parts (app/welcome.tsx).
 *
 * Find: a map tilted back in 3D lands flat as you scroll; pins drop onto
 * it; the view zooms in on one gym while the rest dim, and what it
 * publishes (or "Call first") rises up from below.
 *
 * Train: a lift's card swings up into place; its sets tick off one by one
 * as the weight lifted counts up; the last set is your heaviest yet, with a
 * glint; then the rest timer's ring of dots fills.
 *
 * Nothing here is a real gym: no names, prices or photos.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, runOnJS, useAnimatedReaction, useAnimatedStyle, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { CountUp } from '../CountUp';
import { ExerciseGlyph } from '../ExerciseGlyph';
import { Icon, type IconName } from '../Icon';
import { EASE_OUT, useCalm } from '../motion';
import { TIER_COLOUR, Txt } from '../ui';
import { Pinned, eased, rise, smooth, type Play } from './kit';
import { color, dropShadow, face, radius, space, themed } from '@/lib/theme';

/** A part's words: what it is (eyebrow), its headline and a line, rising in as it comes up. */
export function PartWords({ eyebrow, title, line, enter, wide }: { eyebrow: string; title: string; line: string; enter: SharedValue<number>; wide: boolean }) {
  const style = useAnimatedStyle(() => rise(enter.value, 0, 1, 36));
  return (
    <Animated.View style={[styles.words, wide && styles.wordsWide, style]} accessible accessibilityLabel={`${title}. ${line}`}>
      <Txt variant="eyebrow" color={color.brand} style={[styles.eyebrow, !wide && styles.center]}>
        {eyebrow}
      </Txt>
      <Txt variant="largeTitle" fluid style={[styles.title, !wide && styles.center]}>
        {title}
      </Txt>
      <Txt variant="body" color={color.labelSecondary} style={[styles.line, !wide && styles.center]}>
        {line}
      </Txt>
    </Animated.View>
  );
}

/** A part's stage: its words and its picture, one above the other, or side by side on a wide screen. */
export function PartStage({ wide, words, children }: { wide: boolean; words: ReactNode; children: ReactNode }) {
  return (
    <View style={[styles.stage, wide && styles.stageWide]}>
      {words}
      <View style={styles.visual} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
        {children}
      </View>
    </View>
  );
}

interface PartProps {
  screen: number;
  scrollY: SharedValue<number>;
  calm: boolean;
  width: number;
  wide: boolean;
  onPlace: (top: number, height: number) => void;
}

/** The picture's room: the screen's width less margins, or its half on a wide screen. */
export const roomFor = (width: number, wide: boolean) => (wide ? Math.min(480, width / 2 - space[8]) : Math.min(380, width - space[6] * 2));

// --- Find ------------------------------------------------------------------------

const MAP_W = 320;
const MAP_H = 250;
const PINS: Array<{ x: number; y: number; tier: keyof typeof TIER_COLOUR }> = [
  { x: 64, y: 58, tier: 'confirmed' },
  { x: 214, y: 46, tier: 'needs_confirmation' },
  { x: 112, y: 150, tier: 'ruled_out' },
  { x: 246, y: 128, tier: 'confirmed' },
];
/** The pin the view zooms in on. */
const PICKED = 3;

export function FindPart(props: PartProps) {
  return (
    <Pinned screen={props.screen} scrollY={props.scrollY} calm={props.calm} length={2.3} onPlace={props.onPlace}>
      {(play) => (
        <PartStage
          wide={props.wide}
          words={
            <PartWords
              eyebrow="FIND"
              title="Find a gym that lets you in"
              line="Visit prices, guest hours and what to bring. If a gym doesn’t say, GymGO tells you what to ask."
              enter={play.enter}
              wide={props.wide}
            />
          }
        >
          <MapScene play={play} width={roomFor(props.width, props.wide)} />
        </PartStage>
      )}
    </Pinned>
  );
}

function MapScene({ play, width }: { play: Play; width: number }) {
  const { progress } = play;
  const height = (width * MAP_H) / MAP_W;
  // Tilted back like a map on a table, it lands flat and comes forward.
  const tilt = useAnimatedStyle(() => {
    const t = smooth(progress.value, 0, 0.26);
    return { opacity: 0.3 + eased(progress.value, 0, 0.12) * 0.7, transform: [{ perspective: 1100 }, { rotateX: `${(1 - t) * 58}deg` }, { scale: 0.8 + t * 0.2 }, { translateY: (1 - t) * 30 }] };
  });
  // Then the view zooms in on the picked gym.
  const camera = useAnimatedStyle(() => ({ transform: [{ scale: 1 + smooth(progress.value, 0.46, 0.62) * 0.6 }] }));
  const sheet = useAnimatedStyle(() => rise(progress.value, 0.6, 0.74, 80));
  const origin = `${(PINS[PICKED]!.x / MAP_W) * 100}% ${(PINS[PICKED]!.y / MAP_H) * 100}%`;
  return (
    <Animated.View style={[styles.mapShadow, { width, height }, tilt]}>
      <View style={styles.mapClip}>
        <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: origin } as object, camera]}>
          <Svg width="100%" height="100%" viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}>
            <Rect x={0} y={0} width={MAP_W} height={MAP_H} fill={color.card} />
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
            <MapPin key={index} progress={progress} at={0.2 + index * 0.05} picked={index === PICKED} x={(pin.x / MAP_W) * width} y={(pin.y / MAP_H) * height} tier={pin.tier} />
          ))}
        </Animated.View>
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
          <SheetRow progress={progress} at={0.7} icon="wallet" label="Price of a visit" value="Published" good />
          <SheetRow progress={progress} at={0.76} icon="clock" label="Guest hours" value="Published" good />
          <SheetRow progress={progress} at={0.82} icon="call" label="What to bring" value="Call first" />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

function You({ x, y }: { x: number; y: number }) {
  const calm = useCalm();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (!calm) pulse.value = withRepeat(withTiming(1, { duration: 1800, easing: EASE_OUT }), -1);
  }, [calm, pulse]);
  const ring = useAnimatedStyle(() => ({ opacity: 0.5 * (1 - pulse.value), transform: [{ scale: 1 + pulse.value * 1.8 }] }));
  return (
    <View style={[styles.you, { left: x - 9, top: y - 9 }]}>
      <Animated.View style={[styles.youRing, ring]} />
      <View style={styles.youDot} />
    </View>
  );
}

function MapPin({ progress, at, picked, x, y, tier }: { progress: SharedValue<number>; at: number; picked: boolean; x: number; y: number; tier: keyof typeof TIER_COLOUR }) {
  const style = useAnimatedStyle(() => {
    const drop = eased(progress.value, at, at + 0.08);
    const land = interpolate(progress.value, [at + 0.07, at + 0.095, at + 0.12], [0, -5, 0], 'clamp');
    // The others step back as the view closes in on the picked one.
    const dim = picked ? 1 : 1 - eased(progress.value, 0.46, 0.58) * 0.75;
    const grow = picked ? 1 + eased(progress.value, 0.4, 0.5) * 0.35 : 1;
    return { opacity: drop * dim, transform: [{ translateY: (1 - drop) * -60 + land }, { scale: grow }] };
  });
  return (
    <Animated.View style={[styles.pin, { left: x - 12, top: y - 32 }, style]}>
      <Svg width={24} height={32} viewBox="0 0 24 32">
        <Path d="M12 0C5.4 0 0 5.3 0 11.9 0 20.4 12 32 12 32s12-11.6 12-20.1C24 5.3 18.6 0 12 0z" fill={TIER_COLOUR[tier].fill} />
        <Circle cx={12} cy={12} r={4.6} fill="#FFFFFF" />
      </Svg>
    </Animated.View>
  );
}

function SheetRow({ progress, at, icon, label, value, good = false }: { progress: SharedValue<number>; at: number; icon: IconName; label: string; value: string; good?: boolean }) {
  const style = useAnimatedStyle(() => rise(progress.value, at, at + 0.07, 12));
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

// --- Train -------------------------------------------------------------------------

const SETS = [
  { weight: 60, reps: 8, at: 0.24 },
  { weight: 60, reps: 8, at: 0.36 },
  { weight: 62.5, reps: 8, at: 0.48 },
];
/** The rest ring's dots. */
const DOTS = 24;

export function TrainPart(props: PartProps) {
  return (
    <Pinned screen={props.screen} scrollY={props.scrollY} calm={props.calm} length={2.3} onPlace={props.onPlace}>
      {(play) => (
        <PartStage
          wide={props.wide}
          words={
            <PartWords
              eyebrow="TRAIN"
              title="Know what to do when you get there"
              line="Pick the muscles to train and get a plan for the gym’s kit. Rest timer, plate maths and records are free."
              enter={play.enter}
              wide={props.wide}
            />
          }
        >
          <WorkoutScene play={play} width={roomFor(props.width, props.wide)} calm={props.calm} />
        </PartStage>
      )}
    </Pinned>
  );
}

function WorkoutScene({ play, width, calm }: { play: Play; width: number; calm: boolean }) {
  const { progress } = play;
  // Swung up from below, as if lifted onto the bench.
  const card = useAnimatedStyle(() => {
    const t = smooth(progress.value, 0, 0.22);
    return { opacity: eased(progress.value, 0, 0.1), transform: [{ perspective: 1100 }, { rotateX: `${(1 - t) * -40}deg` }, { translateY: (1 - t) * 90 }, { scale: 0.92 + t * 0.08 }] };
  });
  // How many sets are ticked, heard on this side to count the weight up (three changes, not one a frame).
  const [ticked, setTicked] = useState(calm ? SETS.length : 0);
  useAnimatedReaction(
    () => SETS.filter((set) => progress.value >= set.at + 0.03).length,
    (now, before) => {
      if (now !== before) runOnJS(setTicked)(now);
    },
  );
  const lifted = SETS.slice(0, ticked).reduce((sum, set) => sum + set.weight * set.reps, 0);
  const footer = useAnimatedStyle(() => rise(progress.value, 0.56, 0.66, 18));
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
        <SetRow key={index} progress={progress} index={index} weight={set.weight} reps={set.reps} at={set.at} record={index === SETS.length - 1} />
      ))}
      <Animated.View style={[styles.footer, footer]}>
        <RestRing progress={progress} />
        <View style={styles.flex}>
          <Txt variant="footnote" color={color.labelSecondary}>
            Weight lifted
          </Txt>
          <View style={styles.liftedRow}>
            <CountUp id="tour.lifted" value={lifted} variant="title" style={[face('bold'), styles.tabular]} />
            <Txt variant="headline" color={color.labelSecondary}>
              kg
            </Txt>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function SetRow({ progress, index, weight, reps, at, record }: { progress: SharedValue<number>; index: number; weight: number; reps: number; at: number; record: boolean }) {
  const done = color.goodTint;
  const row = useAnimatedStyle(() => ({ backgroundColor: eased(progress.value, at, at + 0.05) > 0.5 ? done : 'transparent' }));
  const tick = useAnimatedStyle(() => {
    const t = eased(progress.value, at, at + 0.05);
    return { opacity: t, transform: [{ scale: 0.3 + t * 0.7 + interpolate(progress.value, [at + 0.03, at + 0.05, at + 0.07], [0, 0.15, 0], 'clamp') }] };
  });
  const trophy = useAnimatedStyle(() => {
    const t = eased(progress.value, at + 0.05, at + 0.11);
    return { opacity: t, transform: [{ scale: 0.6 + t * 0.4 }, { translateX: (1 - t) * -10 }] };
  });
  // A glint across the row of the record, as it lands.
  const glint = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [at + 0.05, at + 0.08, at + 0.14], [0, 0.9, 0], 'clamp'), transform: [{ translateX: interpolate(progress.value, [at + 0.05, at + 0.14], [-80, 380], 'clamp') }, { rotate: '18deg' }] }));
  return (
    <Animated.View style={[styles.setRow, row]}>
      {record && (
        <Animated.View style={[styles.glint, glint]}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="tourGlint" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#FFD46B" stopOpacity={0} />
                <Stop offset="0.5" stopColor="#FFD46B" stopOpacity={0.55} />
                <Stop offset="1" stopColor="#FFD46B" stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#tourGlint)" />
          </Svg>
        </Animated.View>
      )}
      <Txt variant="subhead" color={color.labelSecondary} style={[styles.setNo, face('semibold')]}>
        {String(index + 1)}
      </Txt>
      <Txt variant="body" style={[styles.flex, face('semibold'), styles.tabular]}>
        {`${weight} kg × ${reps}`}
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

/** The rest timer as a ring of dots that light one after another as the rest runs. */
function RestRing({ progress }: { progress: SharedValue<number> }) {
  const size = 84;
  return (
    <View style={{ width: size, height: size }}>
      {Array.from({ length: DOTS }, (_, index) => (
        <RingDot key={index} index={index} progress={progress} size={size} />
      ))}
      <View style={styles.ringMiddle}>
        <Txt variant="caption" color={color.labelSecondary}>
          Rest
        </Txt>
        <Txt variant="headline" style={styles.tabular}>
          1:30
        </Txt>
      </View>
    </View>
  );
}

function RingDot({ index, progress, size }: { index: number; progress: SharedValue<number>; size: number }) {
  const angle = (index / DOTS) * Math.PI * 2 - Math.PI / 2;
  const r = size / 2 - 5;
  const at = 0.64 + (index / DOTS) * 0.3;
  const lit = color.brand;
  const unlit = color.fill;
  const style = useAnimatedStyle(() => {
    const on = progress.value >= at;
    return { backgroundColor: on ? lit : unlit, transform: [{ scale: on ? 1 : 0.7 }] };
  });
  return <Animated.View style={[styles.ringDot, { left: size / 2 + Math.cos(angle) * r - 3, top: size / 2 + Math.sin(angle) * r - 3 }, style]} />;
}

const styles = themed(() =>
  StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    center: { textAlign: 'center' },
    tabular: { fontVariant: ['tabular-nums'] },
    stage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[6], paddingHorizontal: space[6] },
    stageWide: { flexDirection: 'row', gap: space[8], paddingHorizontal: space[8] },
    words: { alignItems: 'center', gap: space[2], maxWidth: 520 },
    wordsWide: { alignItems: 'flex-start', flex: 1, maxWidth: 480 },
    eyebrow: { letterSpacing: 1.6 },
    title: { maxWidth: 520 },
    line: { maxWidth: 460 },
    visual: { alignItems: 'center', justifyContent: 'center' },

    mapShadow: { borderRadius: radius.xl, borderCurve: 'continuous', ...dropShadow(0.16, 30, 14, 8) },
    mapClip: { flex: 1, borderRadius: radius.xl, borderCurve: 'continuous', overflow: 'hidden' },
    you: { position: 'absolute', width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
    youRing: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: color.brand },
    youDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: color.brand, borderWidth: 2.5, borderColor: '#FFFFFF' },
    pin: { position: 'absolute', width: 24, height: 32, transformOrigin: 'bottom' } as object,
    sheet: { position: 'absolute', left: space[3], right: space[3], bottom: space[3], gap: space[2], padding: space[3], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.plate, ...dropShadow(0.2, 20, 8, 8) },
    sheetHead: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginBottom: 2 },
    sheetDot: { width: 10, height: 10, borderRadius: 5 },
    sheetRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    sheetTag: { paddingHorizontal: space[2], paddingVertical: 2, borderRadius: radius.pill },

    workout: { gap: space[2], padding: space[4], borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: color.plate, ...dropShadow(0.16, 30, 14, 8) },
    workoutHead: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginBottom: space[1] },
    glyph: { width: 64, height: 64, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: color.brandWash },
    setRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 44, paddingHorizontal: space[2], borderRadius: radius.md, borderCurve: 'continuous', overflow: 'hidden' },
    glint: { position: 'absolute', top: -20, bottom: -20, width: 70 },
    setNo: { width: 18, textAlign: 'center' },
    record: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space[2], paddingVertical: 2, borderRadius: radius.pill, backgroundColor: color.maybeTint },
    tickBox: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: color.separator, alignItems: 'center', justifyContent: 'center' },
    tickOn: { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: color.good, alignItems: 'center', justifyContent: 'center' },
    footer: { flexDirection: 'row', alignItems: 'center', gap: space[4], marginTop: space[2], paddingTop: space[3], borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.separator },
    liftedRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
    ringDot: { position: 'absolute', width: 6, height: 6, borderRadius: 3 },
    ringMiddle: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  }),
);
