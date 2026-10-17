/**
 * An exercise's icon (lib/exerciseGlyphs.ts): the figure in the label
 * colour, what it lifts in the accent, the bench or cable it uses in a
 * lighter accent. `ExerciseTile` sets it on a rounded tile of the accent,
 * lit from its top corner in the standard look; a finished exercise's tile
 * turns green.
 *
 * A `moving` icon goes through its rep, slowly and on a loop: the figure
 * eases between the rep's drawings on the UI thread, so it never holds up a
 * scroll or a keystroke. With Reduce Motion on it stays still.
 */

import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { GLYPH_SIZE, exerciseFrames, exerciseMoves, type Pt, type Shape, type Tone } from '@/lib/exerciseGlyphs';
import { alpha } from '@/lib/looks';
import { LOOKS, NO_TOUCH, backgroundImage, color, currentLook, currentTheme, radius } from '@/lib/theme';
import { EASE_IN_OUT } from './motion';
import { useGlassRedraw } from './Redrawn';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** One rep: down (or up), a beat, back, a longer beat. */
const HALF_REP = 1100;

type Paint = Record<Tone, { fill: string; opacity: number }>;

/**
 * A shape as path points: a line's own, or the corners of a box drawn
 * smaller by its corner radius, then stroked that wide with round joins,
 * which gives the same rounded box and can move like a line.
 */
function pointsOf(shape: Shape): Pt[] {
  if (shape.k === 'line') return shape.pts;
  if (shape.k !== 'box') return [shape.c];
  const half = [Math.max(0, shape.w / 2 - shape.r), Math.max(0, shape.h / 2 - shape.r)] as const;
  const rad = (shape.a * Math.PI) / 180;
  const turn = ([x, y]: Pt): Pt => [shape.c[0] + x * Math.cos(rad) - y * Math.sin(rad), shape.c[1] + x * Math.sin(rad) + y * Math.cos(rad)];
  return [turn([-half[0], -half[1]]), turn([half[0], -half[1]]), turn([half[0], half[1]]), turn([-half[0], half[1]])];
}

function pathOf(points: Pt[], closed: boolean): string {
  return points.map(([x, y], at) => `${at === 0 ? 'M' : 'L'}${x} ${y}`).join(' ') + (closed ? ' Z' : '');
}

/** The props a shape draws with, apart from where it is. */
function looks(shape: Shape, paint: Paint) {
  const { fill, opacity } = paint[shape.tone];
  switch (shape.k) {
    case 'line':
      return { fill: 'none', stroke: fill, strokeOpacity: opacity, strokeWidth: shape.w, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
    case 'box':
      // One opacity for the whole box: a see-through fill and stroke each faded on their own made a darker band where they overlap.
      return { fill, stroke: fill, opacity, strokeWidth: shape.r * 2, strokeLinejoin: 'round' as const };
    case 'dot':
      return { r: shape.r, fill, fillOpacity: opacity };
    case 'ring':
      return { r: shape.r, fill: 'none', stroke: fill, strokeOpacity: opacity, strokeWidth: shape.w };
  }
}

function StillShape({ shape, paint }: { shape: Shape; paint: Paint }) {
  if (shape.k === 'dot' || shape.k === 'ring') return <Circle cx={shape.c[0]} cy={shape.c[1]} {...looks(shape, paint)} />;
  return <Path d={pathOf(pointsOf(shape), shape.k === 'box')} {...looks(shape, paint)} />;
}

/** Where between two of the rep's drawings `progress` falls: which pair, and how far. */
function between(progress: number, count: number): [number, number] {
  'worklet';
  const along = Math.min(1, Math.max(0, progress)) * (count - 1);
  const at = Math.min(count - 2, Math.floor(along));
  return [at, along - at];
}

/** A shape eased between its place in each drawing of the rep. */
function MovingCircle({ first, centres, progress, paint }: { first: Shape; centres: Pt[]; progress: SharedValue<number>; paint: Paint }) {
  const animatedProps = useAnimatedProps(() => {
    const [at, t] = between(progress.value, centres.length);
    const a = centres[at]!;
    const b = centres[at + 1]!;
    return { cx: a[0] + (b[0] - a[0]) * t, cy: a[1] + (b[1] - a[1]) * t };
  });
  const [cx, cy] = centres[0]!;
  return <AnimatedCircle cx={cx} cy={cy} {...looks(first, paint)} animatedProps={animatedProps} />;
}

function MovingPath({ first, steps, progress, paint }: { first: Shape; steps: number[][]; progress: SharedValue<number>; paint: Paint }) {
  const closed = first.k === 'box';
  const animatedProps = useAnimatedProps(() => {
    const [at, t] = between(progress.value, steps.length);
    const a = steps[at]!;
    const b = steps[at + 1]!;
    let d = '';
    for (let n = 0; n < a.length; n += 2) {
      const x = a[n]! + (b[n]! - a[n]!) * t;
      const y = a[n + 1]! + (b[n + 1]! - a[n + 1]!) * t;
      d += `${n === 0 ? 'M' : ' L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    return { d: closed ? `${d} Z` : d };
  });
  return <AnimatedPath d={pathOf(pointsOf(first), closed)} {...looks(first, paint)} animatedProps={animatedProps} />;
}

export function ExerciseGlyph({
  exerciseId,
  size,
  ink,
  accent,
  moving = false,
  delay = 0,
  reps,
}: {
  exerciseId: string;
  size: number;
  ink: string;
  accent: string;
  /** Go through the rep on a loop (still with Reduce Motion on). */
  moving?: boolean;
  /** Milliseconds before the first rep, so a list of them doesn't move in step. */
  delay?: number;
  /** How many reps before it rests in its first pose; on and on if not given. */
  reps?: number;
}) {
  const paint: Paint = {
    ink: { fill: ink, opacity: 1 },
    far: { fill: ink, opacity: 0.36 },
    kit: { fill: accent, opacity: 1 },
    frame: { fill: accent, opacity: 0.5 },
    floor: { fill: ink, opacity: 0.13 },
    motion: { fill: accent, opacity: 0.85 },
  };
  const calm = useReducedMotion();
  const animate = moving && !calm && exerciseMoves(exerciseId);
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${GLYPH_SIZE} ${GLYPH_SIZE}`} style={NO_TOUCH}>
      {/* Keyed by exercise, so a swapped-in one starts afresh with its own shapes. */}
      {animate ? (
        <Moving key={exerciseId} exerciseId={exerciseId} paint={paint} delay={delay} reps={reps} />
      ) : (
        exerciseFrames(exerciseId)[0]!.map((shape, index) => <StillShape key={index} shape={shape} paint={paint} />)
      )}
    </Svg>
  );
}

function Moving({ exerciseId, paint, delay, reps }: { exerciseId: string; paint: Paint; delay: number; reps?: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    const ease = { duration: HALF_REP, easing: EASE_IN_OUT };
    progress.value = withDelay(
      delay,
      // Each rep ends back at the first pose, so a set number of them rests there.
      withRepeat(withSequence(withTiming(1, ease), withDelay(260, withTiming(0, ease)), withDelay(700, withTiming(0, { duration: 0 }))), reps ?? -1),
    );
    return () => cancelAnimation(progress);
  }, [progress, delay, reps]);
  return (
    <>
      {partsOf(exerciseId).map((part, index) =>
        part.kind === 'still' ? (
          <StillShape key={index} shape={part.shape} paint={paint} />
        ) : part.kind === 'circle' ? (
          <MovingCircle key={index} first={part.shape} centres={part.centres} progress={progress} paint={paint} />
        ) : (
          <MovingPath key={index} first={part.shape} steps={part.steps} progress={progress} paint={paint} />
        ),
      )}
    </>
  );
}

/** Each shape of an exercise's icon, and how it moves through the rep. */
type Part = { kind: 'still'; shape: Shape } | { kind: 'circle'; shape: Shape; centres: Pt[] } | { kind: 'path'; shape: Shape; steps: number[][] };

/**
 * Worked out once per exercise, not on every draw: a card redraws with each
 * keystroke in its boxes, and building these afresh re-made every
 * animation and sent its points to the UI thread again each time.
 */
const parts = new Map<string, Part[]>();
function partsOf(exerciseId: string): Part[] {
  const known = parts.get(exerciseId);
  if (known) return known;
  const frames = exerciseFrames(exerciseId);
  const made = frames[0]!.map((shape, index): Part => {
    const own = frames.map((frame) => frame[index]!);
    if (own.every((other) => JSON.stringify(other) === JSON.stringify(shape))) return { kind: 'still', shape };
    if (shape.k === 'dot' || shape.k === 'ring') return { kind: 'circle', shape, centres: own.map((other) => pointsOf(other)[0]!) };
    // Each drawing's points, flat: [x0, y0, x1, y1, …].
    return { kind: 'path', shape, steps: own.map((other) => pointsOf(other).flat()) };
  });
  parts.set(exerciseId, made);
  return made;
}

/**
 * The icon on its tile. Decoration: the exercise's name is always written beside it.
 * Drawn again only when its own props change: in a workout, every number typed
 * in a card drew its exercise's picture again, path by path.
 */
export const ExerciseTile = memo(function ExerciseTile({
  exerciseId,
  size = 52,
  done = false,
  moving = false,
  delay = 0,
  reps,
}: {
  exerciseId: string;
  size?: number;
  done?: boolean;
  moving?: boolean;
  delay?: number;
  /** See ExerciseGlyph: a few reps, then still. */
  reps?: number;
}) {
  useGlassRedraw();
  const hue = done ? color.good : color.brand;
  const dark = currentTheme().scheme === 'dark';
  // The look's own corners, in proportion to the tile (none in 8-bit).
  const round = Math.min(size * 0.28, radius.lg * 1.4);
  const lit = currentLook() === LOOKS.standard;
  return (
    <View
      style={[styles.tile, { width: size, height: size, borderRadius: round, backgroundColor: alpha(hue, dark ? 0.2 : 0.11), borderColor: alpha(hue, dark ? 0.3 : 0.16) }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
    >
      {lit && (
        <View
          style={[
            NO_TOUCH,
            StyleSheet.absoluteFill,
            { borderRadius: round },
            backgroundImage(`linear-gradient(150deg, rgba(255, 255, 255, ${dark ? 0.1 : 0.55}) 0%, rgba(255, 255, 255, 0) 58%)`),
          ]}
        />
      )}
      <ExerciseGlyph
        exerciseId={exerciseId}
        size={size * 0.98}
        ink={color.label}
        accent={done ? color.goodInk : color.brand}
        moving={moving && !done}
        delay={delay}
        reps={reps}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
});
