/**
 * An exercise's icon (lib/exerciseGlyphs.ts): the figure in the label
 * colour, what it lifts in the accent, the bench or cable it uses in a
 * lighter accent. `ExerciseTile` sets it on a rounded tile of the accent,
 * lit from its top corner in the standard look; a finished exercise's tile
 * turns green.
 *
 * A `moving` icon goes through its rep on a loop, at the move's own tempo
 * (exerciseTempo): a lift a touch quicker than the lowering, with a beat at
 * the top; a run or a ride round and round; a hold just breathing. The
 * figure eases between the rep's drawings on the UI thread, so it never
 * holds up a scroll or a keystroke. With Reduce Motion on it stays still.
 *
 * Shapes of one see-through tone in a row (the far arm and leg, a bench's
 * pad and legs) are drawn solid inside one faded group, so where they
 * overlap, at a knee or a bench's corner, isn't darker.
 */

import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
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
import Svg, { Circle, G, Path } from 'react-native-svg';
import { GLYPH_SIZE, exerciseFrames, exerciseMoves, exerciseTempo, type Pt, type Shape, type Tempo, type Tone } from '@/lib/exerciseGlyphs';
import { alpha } from '@/lib/looks';
import { LOOKS, NO_TOUCH, backgroundImage, color, currentLook, currentTheme, radius } from '@/lib/theme';
import { useGlassRedraw } from './Redrawn';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Each tempo's rep, as [there, beat, back, beat] in milliseconds, frame 0
 * to the rep's other end and home. A lift: up in 0.8 s, a beat at the top,
 * down in 1.3 s, a breath. Lowering first: down slowly, a beat at the
 * bottom, up quicker. A run, a row or a twist goes there and back with no
 * stops; a ride turns one way, evenly, for good; a hold only breathes.
 */
const TEMPO: Record<Tempo, readonly [number, number, number, number]> = {
  lift: [820, 300, 1300, 520],
  lower: [1300, 260, 820, 560],
  cycle: [640, 0, 640, 0],
  spin: [1250, 0, 0, 0],
  hold: [1700, 0, 1700, 0],
};
/** A rep's pull: smooth to start, smooth to stop, and quickest through the middle. */
const STRONG = Easing.bezier(0.42, 0, 0.3, 1);
/** A run's or a breath's: as even as a swing. */
const SWING = Easing.inOut(Easing.sin);

type Paint = Record<Tone, { fill: string; opacity: number }>;

/**
 * A shape as path points: a line's own, or the corners of a box drawn
 * smaller by its corner radius, then stroked that wide with round joins,
 * which gives the same rounded box and can move like a line.
 */
function pointsOf(shape: Shape): Pt[] {
  if (shape.k === 'line' || shape.k === 'poly') return shape.pts;
  if (shape.k !== 'box') return [shape.c];
  const half = [Math.max(0, shape.w / 2 - shape.r), Math.max(0, shape.h / 2 - shape.r)] as const;
  const rad = (shape.a * Math.PI) / 180;
  const turn = ([x, y]: Pt): Pt => [shape.c[0] + x * Math.cos(rad) - y * Math.sin(rad), shape.c[1] + x * Math.sin(rad) + y * Math.cos(rad)];
  return [turn([-half[0], -half[1]]), turn([half[0], -half[1]]), turn([half[0], half[1]]), turn([-half[0], half[1]])];
}

function pathOf(points: Pt[], closed: boolean): string {
  return points.map(([x, y], at) => `${at === 0 ? 'M' : 'L'}${x} ${y}`).join(' ') + (closed ? ' Z' : '');
}

/** The props a shape draws with, apart from where it is; solid when its group fades it. */
function looks(shape: Shape, paint: Paint, grouped = false) {
  const { fill } = paint[shape.tone];
  const opacity = grouped ? 1 : paint[shape.tone].opacity;
  switch (shape.k) {
    case 'line':
      return { fill: 'none', stroke: fill, strokeOpacity: opacity, strokeWidth: shape.w, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
    case 'box':
    case 'poly':
      // One opacity for the whole box: a see-through fill and stroke each faded on their own made a darker band where they overlap.
      return { fill, stroke: fill, opacity, strokeWidth: shape.r * 2, strokeLinejoin: 'round' as const };
    case 'dot':
      return { r: shape.r, fill, fillOpacity: opacity };
    case 'ring':
      return { r: shape.r, fill: 'none', stroke: fill, strokeOpacity: opacity, strokeWidth: shape.w };
  }
}

const closedShape = (shape: Shape) => shape.k === 'box' || shape.k === 'poly';

function StillShape({ shape, paint, grouped }: { shape: Shape; paint: Paint; grouped: boolean }) {
  if (shape.k === 'dot' || shape.k === 'ring') return <Circle cx={shape.c[0]} cy={shape.c[1]} {...looks(shape, paint, grouped)} />;
  return <Path d={pathOf(pointsOf(shape), closedShape(shape))} {...looks(shape, paint, grouped)} />;
}

/**
 * Shapes in drawing order, in runs: each run of one see-through tone is one
 * faded group (`fade`), its shapes solid inside; anything else stands alone.
 */
function runsOf<T>(items: T[], toneOf: (item: T) => Tone, paint: Paint): Array<{ fade: number | null; items: Array<[T, number]> }> {
  const runs: Array<{ fade: number | null; tone: Tone | null; items: Array<[T, number]> }> = [];
  items.forEach((item, index) => {
    const tone = toneOf(item);
    const fade = paint[tone].opacity < 1 ? paint[tone].opacity : null;
    const last = runs[runs.length - 1];
    if (fade !== null && last && last.tone === tone) last.items.push([item, index]);
    else runs.push({ fade, tone: fade !== null ? tone : null, items: [[item, index]] });
  });
  return runs;
}

/** Where between two of the rep's drawings `progress` falls: which pair, and how far. */
function between(progress: number, count: number): [number, number] {
  'worklet';
  const along = Math.min(1, Math.max(0, progress)) * (count - 1);
  const at = Math.min(count - 2, Math.floor(along));
  return [at, along - at];
}

/** A shape eased between its place in each drawing of the rep. */
function MovingCircle({ first, centres, progress, paint, grouped }: { first: Shape; centres: Pt[]; progress: SharedValue<number>; paint: Paint; grouped: boolean }) {
  const animatedProps = useAnimatedProps(() => {
    const [at, t] = between(progress.value, centres.length);
    const a = centres[at]!;
    const b = centres[at + 1]!;
    return { cx: a[0] + (b[0] - a[0]) * t, cy: a[1] + (b[1] - a[1]) * t };
  });
  const [cx, cy] = centres[0]!;
  return <AnimatedCircle cx={cx} cy={cy} {...looks(first, paint, grouped)} animatedProps={animatedProps} />;
}

function MovingPath({ first, steps, progress, paint, grouped }: { first: Shape; steps: number[][]; progress: SharedValue<number>; paint: Paint; grouped: boolean }) {
  const closed = closedShape(first);
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
  return <AnimatedPath d={pathOf(pointsOf(first), closed)} {...looks(first, paint, grouped)} animatedProps={animatedProps} />;
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
        runsOf(exerciseFrames(exerciseId)[0]!, (shape) => shape.tone, paint).map((run) =>
          run.fade === null ? (
            <StillShape key={run.items[0]![1]} shape={run.items[0]![0]} paint={paint} grouped={false} />
          ) : (
            <G key={run.items[0]![1]} opacity={run.fade}>
              {run.items.map(([shape, index]) => (
                <StillShape key={index} shape={shape} paint={paint} grouped />
              ))}
            </G>
          ),
        )
      )}
    </Svg>
  );
}

function Moving({ exerciseId, paint, delay, reps }: { exerciseId: string; paint: Paint; delay: number; reps?: number }) {
  const progress = useSharedValue(0);
  const tempo = exerciseTempo(exerciseId);
  useEffect(() => {
    const [there, top, back, rest] = TEMPO[tempo];
    const easing = tempo === 'cycle' || tempo === 'hold' ? SWING : STRONG;
    // Each rep ends back at the first pose, so a set number of them rests there.
    const one =
      tempo === 'spin'
        ? // Round and round: the last drawing is the first, so the jump back to it doesn't show.
          withSequence(withTiming(1, { duration: there, easing: Easing.linear }), withTiming(0, { duration: 0 }))
        : withSequence(withTiming(1, { duration: there, easing }), withDelay(top, withTiming(0, { duration: back, easing })), withDelay(rest, withTiming(0, { duration: 0 })));
    progress.value = withDelay(delay, withRepeat(one, reps ?? -1));
    return () => cancelAnimation(progress);
  }, [progress, delay, reps, tempo]);
  const draw = (part: Part, index: number, grouped: boolean) =>
    part.kind === 'still' ? (
      <StillShape key={index} shape={part.shape} paint={paint} grouped={grouped} />
    ) : part.kind === 'circle' ? (
      <MovingCircle key={index} first={part.shape} centres={part.centres} progress={progress} paint={paint} grouped={grouped} />
    ) : (
      <MovingPath key={index} first={part.shape} steps={part.steps} progress={progress} paint={paint} grouped={grouped} />
    );
  return (
    <>
      {runsOf(partsOf(exerciseId), (part) => part.shape.tone, paint).map((run) =>
        run.fade === null ? (
          draw(run.items[0]![0], run.items[0]![1], false)
        ) : (
          <G key={run.items[0]![1]} opacity={run.fade}>
            {run.items.map(([part, index]) => draw(part, index, true))}
          </G>
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
