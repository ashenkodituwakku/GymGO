/**
 * How things move, in one place, so the whole app has one feel.
 *
 * Springs, not timed curves, as iOS uses: a press sinks quickly and comes back
 * with a little give; things that switch on (Save, Compare) pop once; rows
 * make room for each other; notices fade. What's on a screen arrives with the
 * screen (its push, or its sheet rising) and never flies in piece by piece:
 * a staggered entrance is a slideshow's move, not an app's.
 *
 * Every animation here follows the device's Reduce Motion setting
 * (`ReduceMotion.System`): with it on, things simply appear in their final
 * state.
 *
 * The springs are tuned by how much they settle (their damping against
 * their stiffness, the "damping ratio": 1 arrives exactly, with no
 * overshoot; lower bounces): things moving into place (sheets, lists, a
 * sliding pill) are critically damped, so they glide in and stop; a press
 * goes down crisply and comes back with only a hint of give; something
 * switching on pops once; glass (the tab bar's lens, the Liquid Glass
 * slider) is a touch liquid. Fades ease out coming in, on a long, soft
 * decelerating curve, and ease in going away, so nothing starts or stops
 * with a jolt.
 *
 * Press highlights fade rather than snap: see `Pressable` below, which every
 * screen uses in place of React Native's.
 */

import { clearOf } from '@/lib/looks';
import { motionReducedHere, useThemeChoice } from '@/lib/themePrefs';
import { forwardRef, useEffect, useLayoutEffect, useRef, useState, type ComponentProps, type ForwardedRef, type ReactNode, type Ref } from 'react';
import {
  Platform,
  Pressable as NativePressable,
  StyleSheet,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
  type ViewInstance,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  Keyframe,
  LinearTransition,
  ReduceMotion,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
  type WithSpringConfig,
  type WithTimingConfig,
} from 'react-native-reanimated';

/**
 * Whether to keep still: the phone's (or browser's) Reduce Motion, or
 * Appearance's own Reduce motion, which does the same in GymGO alone. Use it
 * wherever the phone's setting was read; the shared animations below follow
 * both by themselves (the root layout sets Reanimated's global setting).
 */
export function useCalm(): boolean {
  const system = useReducedMotion();
  const { reduceMotion } = useThemeChoice();
  return system || reduceMotion;
}

/**
 * An icon that changes in place (Save to Saved, a tick coming on, a tab's
 * outline filling) blurs in from a little smaller, rather than swapping in
 * one frame. Attach the ref to the view around the icon; `key` is what
 * changes. In a browser only, where the browser runs it (the Web Animations
 * API) at no cost until it plays; a phone's icons swap as they always have.
 * Not with Reduce Motion, the system's or GymGO's.
 */
export function useSwapIn(key: string) {
  const ref = useRef<ViewInstance>(null);
  const shown = useRef(key);
  useLayoutEffect(() => {
    if (shown.current === key) return;
    shown.current = key;
    if (Platform.OS !== 'web') return;
    const element = ref.current as unknown as HTMLElement | null;
    if (!element || typeof element.animate !== 'function') return;
    if (motionReducedHere() || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    element.animate(
      [
        { opacity: 0.25, filter: 'blur(3px)', transform: 'scale(0.8)' },
        { opacity: 1, filter: 'blur(0px)', transform: 'scale(1)' },
      ],
      { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    );
  }, [key]);
  return ref;
}

/** A spring's damping for a damping ratio: 1 arrives without overshooting. */
export const damp = (ratio: number, stiffness: number, mass: number) => Math.round(ratio * 2 * Math.sqrt(stiffness * mass) * 10) / 10;

/** A press going down: crisp, straight there. */
export const PRESS_IN: WithSpringConfig = { damping: damp(0.9, 520, 0.6), stiffness: 520, mass: 0.6, reduceMotion: ReduceMotion.System };
/** Letting go: back with only a hint of give, so it feels alive rather than mechanical. */
export const PRESS_OUT: WithSpringConfig = { damping: damp(0.72, 340, 0.6), stiffness: 340, mass: 0.6, reduceMotion: ReduceMotion.System };
/** Things settling into place (a chevron turning, a pill sliding): quick (in place in about 300ms), and no bounce at all. */
export const SETTLE: WithSpringConfig = { damping: damp(1, 360, 0.8), stiffness: 360, mass: 0.8, reduceMotion: ReduceMotion.System };
/** Something arriving to be noticed (a medal, a new record): one lively pop that settles fast. */
export const POP: WithSpringConfig = { damping: damp(0.6, 260, 0.8), stiffness: 260, mass: 0.8, reduceMotion: ReduceMotion.System };
/**
 * A pane sliding open or shut, and what moves aside for it (the sidebar
 * unfolding from its capsule on the map, the map's panels making room): an
 * even glide that settles without a bounce, in place in about 300ms (UI
 * motion past that starts to feel slow; it was 450).
 */
export const SLIDE: WithSpringConfig = { damping: damp(1, 420, 1), stiffness: 420, mass: 1, reduceMotion: ReduceMotion.System };
/** Glass moving (the tab bar's lens, the slider's thumb): smooth, with a liquid trace of overshoot. */
export const LIQUID: WithSpringConfig = { damping: damp(0.78, 300, 0.7), stiffness: 300, mass: 0.7, reduceMotion: ReduceMotion.System };

/**
 * A curve that only ever sees 0 to 1: a timer's first frame can land a hair
 * before its start, and a curve that leaves steeply would turn that into a
 * visible dip (an opacity below where it began).
 */
function clamped(x1: number, y1: number, x2: number, y2: number) {
  const curve = Easing.bezierFn(x1, y1, x2, y2);
  return (t: number) => {
    'worklet';
    return curve(Math.min(1, Math.max(0, t)));
  };
}

/** Coming in: quick off the mark, then a long soft glide to a stop (an "expo out"). */
export const EASE_OUT = clamped(0.22, 1, 0.36, 1);
/** Going away: gathering pace as it leaves. */
export const EASE_IN = clamped(0.4, 0, 1, 1);
/** Moving from one place to another on a timer: eased at both ends. */
export const EASE_IN_OUT = clamped(0.65, 0, 0.35, 1);
/** A highlight melting away: the web's own "ease", gentler at the start than EASE_OUT. */
export const EASE_SOFT = clamped(0.25, 0.1, 0.25, 1);
/**
 * A whole screen arriving: it leaves gently, picks up, then glides to a stop.
 * EASE_OUT is too steep for this: a screen fading on it is two-thirds there by
 * its first frame, so it reads as popping up rather than fading in.
 */
export const EASE_SCREEN = clamped(0.2, 0, 0, 1);
/** EASE_SCREEN, for a browser's own animations. */
export const EASE_SCREEN_CSS = 'cubic-bezier(0.2, 0, 0, 1)';

/** A fade or slide coming in. */
export const ARRIVE: WithTimingConfig = { duration: 260, easing: EASE_OUT, reduceMotion: ReduceMotion.System };
/** A fade or slide going away: quicker than it came. */
export const LEAVE: WithTimingConfig = { duration: 170, easing: EASE_IN, reduceMotion: ReduceMotion.System };

/**
 * Whether an entering or exiting animation can take one of the curves
 * above. A browser runs those animations itself, and takes only a
 * cubic-bézier: handed one of these, Reanimated ran it at one constant
 * speed. So the browser gets the same curves as béziers (below).
 */
export const CURVES = Platform.OS !== 'web';

/*
 * The curves for an entering, exiting or layout animation, in the form each
 * platform runs: the clamped curves above on a phone, the same curves as
 * béziers in a browser. Before, every fade and glide in the browser ran at a
 * constant speed, starting and stopping with a jolt.
 */
/** Coming in (EASE_OUT). */
export const ARRIVE_CURVE = CURVES ? EASE_OUT : Easing.bezier(0.22, 1, 0.36, 1);
/** Going away (EASE_IN). */
export const LEAVE_CURVE = CURVES ? EASE_IN : Easing.bezier(0.4, 0, 1, 1);
/** Moving from one place to another (EASE_SCREEN). */
export const MOVE_CURVE = CURVES ? EASE_SCREEN : Easing.bezier(0.2, 0, 0, 1);

/**
 * Rows and sections making room for each other: a glide that stops dead, no
 * wobble. A browser ignores a layout spring (it ran at a constant speed), so
 * there it's timed on MOVE_CURVE.
 */
export const GLIDE = (CURVES ? LinearTransition.springify().damping(damp(1, 380, 1)).stiffness(380) : LinearTransition.duration(260).easing(MOVE_CURVE)).reduceMotion(ReduceMotion.System);

/** A notice or small element arriving and leaving. */
export const FADE_IN = FadeIn.duration(CURVES ? 240 : 220).easing(ARRIVE_CURVE).reduceMotion(ReduceMotion.System);
export const FADE_OUT_MS = CURVES ? 160 : 150;
export const FADE_OUT = FadeOut.duration(FADE_OUT_MS).easing(LEAVE_CURVE).reduceMotion(ReduceMotion.System);

/*
 * Entrances are springs on the phone. In the browser they're timed instead:
 * Reanimated's web version pins a spring-entered view in place
 * (position: absolute) when its container later moves, as a sheet does,
 * which collapses the layout around it.
 */

/** growIn's spring, worked out here: growIn runs on the UI thread, where calling damp (not a worklet) stopped the app on a phone. */
const GROW: WithSpringConfig = { damping: damp(0.82, 320, 0.7), stiffness: 320, mass: 0.7, reduceMotion: ReduceMotion.System };

/**
 * Where every entrance starts: transparent and only a touch smaller, never
 * from nothing (scale 0), which reads as a cartoon and makes the eye chase it.
 */
export const ENTER_SCALE = 0.97;

/** Grows in from a touch smaller as it fades up, the way a button or popover appears on iOS. */
function growIn() {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ scale: ENTER_SCALE }] },
    animations: {
      opacity: withTiming(1, { duration: 180, easing: EASE_OUT, reduceMotion: ReduceMotion.System }),
      transform: [{ scale: withSpring(1, GROW) }],
    },
  };
}

/**
 * Something to be noticed arriving (a new card, a record, a medal): it fades
 * up from a touch smaller (ENTER_SCALE, never from nothing), goes a little
 * past full size and settles back, as a spring would. Keyframes, so the
 * phone and the browser play the same thing.
 */
export const POP_IN = new Keyframe({
  0: { opacity: 0, transform: [{ scale: ENTER_SCALE }] },
  55: { opacity: 1, transform: [{ scale: 1.03 }], easing: Easing.out(Easing.quad) },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: Easing.inOut(Easing.quad) },
})
  .duration(300)
  .reduceMotion(ReduceMotion.System);

/**
 * A stepper's next step (a later month, the next page) slides in from the
 * side you're heading to, so you can tell which way you went: from the
 * right going forward, from the left going back. Not a crossfade, which
 * says nothing about direction. Still with Reduce Motion.
 */
const stepFrom = (side: 1 | -1) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ translateX: side * 28 }] },
    100: { opacity: 1, transform: [{ translateX: 0 }], easing: Easing.bezier(0.22, 1, 0.36, 1) },
  })
    .duration(260)
    .reduceMotion(ReduceMotion.System);
const STEP_FORWARD = stepFrom(1);
const STEP_BACK = stepFrom(-1);
/** The entrance for a stepper's new step: `forward` for next or later, false for back or earlier; none before the first step. */
export function stepIn(forward: boolean | null) {
  return forward === null ? undefined : forward ? STEP_FORWARD : STEP_BACK;
}

/** Something small appearing over the map, as "Search this area" does. */
export const DROP_IN = Platform.OS === 'web' ? FadeIn.duration(200).easing(ARRIVE_CURVE).reduceMotion(ReduceMotion.System) : growIn;

/**
 * The entrance for content that takes the place of a loading placeholder:
 * a fade once it arrives after the screen first drew, and none if it was
 * there from the start (then it arrives with the screen, as all else does).
 */
export function useArrival(loading: boolean) {
  const waited = useRef(loading);
  if (loading) waited.current = true;
  return waited.current && !loading ? FADE_IN : undefined;
}

/**
 * How far anything pressed sinks: one size for every button and card, so a
 * press feels the same everywhere (a big card and a small button alike).
 */
export const PRESS_SCALE = 0.97;

/** A scale that sinks on press and springs back: spread its handlers onto a Pressable, its style onto what should move. */
export function usePressScale(to = PRESS_SCALE) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return {
    style,
    onPressIn: () => {
      scale.value = withSpring(to, PRESS_IN);
    },
    onPressOut: () => {
      scale.value = withSpring(1, PRESS_OUT);
    },
  };
}

/**
 * A progress bar's fill, moved by a transform rather than its width (a
 * width makes the page lay itself out again every frame): the fill is the
 * track's full size, slid left out of the track's clip by what isn't done.
 * Put `onLayout` on the track (which clips: overflow hidden) and `style` on
 * a fill that covers it. Hidden until the track is measured.
 */
export function useFillBar(progress: SharedValue<number>) {
  const width = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    opacity: width.value > 0 ? 1 : 0,
    transform: [{ translateX: (Math.min(1, Math.max(0, progress.value)) - 1) * width.value }],
  }));
  return {
    style,
    onLayout: (event: LayoutChangeEvent) => {
      width.value = event.nativeEvent.layout.width;
    },
  };
}

/** One pop when `on` turns true (not on first draw): Save, Compare. */
export function usePop(on: boolean) {
  const scale = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (on) scale.value = withSequence(withSpring(1.22, PRESS_IN), withSpring(1, PRESS_OUT));
  }, [on, scale]);
  return useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
}

const AnimatedPressable = Animated.createAnimatedComponent(NativePressable);

type PressyStyle = StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
type ViewMotion = Pick<ComponentProps<typeof Animated.View>, 'entering' | 'exiting' | 'layout'>;

/**
 * A Pressable that sinks under a finger and springs back. Takes the same
 * style as a Pressable, including the `({ pressed }) => …` form.
 */
export function Pressy({
  scaleTo = PRESS_SCALE,
  style,
  onPressIn,
  onPressOut,
  children,
  entering,
  exiting,
  layout,
  ...props
}: Omit<PressableProps, 'style'> & ViewMotion & { scaleTo?: number; style?: PressyStyle; children?: ReactNode; ref?: Ref<ViewInstance> }) {
  const press = usePressScale(scaleTo);
  const [pressed, setPressed] = useState(false);
  const resolved = typeof style === 'function' ? style({ pressed, hovered: false } as PressableStateCallbackType) : style;
  const pressable = (
    <AnimatedPressable
      {...props}
      onPressIn={(event: GestureResponderEvent) => {
        setPressed(true);
        press.onPressIn();
        onPressIn?.(event);
      }}
      onPressOut={(event: GestureResponderEvent) => {
        setPressed(false);
        press.onPressOut();
        onPressOut?.(event);
      }}
      style={[resolved, press.style]}
    >
      {children}
    </AnimatedPressable>
  );
  if (!entering && !exiting && !layout) return pressable;
  // An entrance (or exit) moves the view too: it gets a view of its own, so
  // neither animation overwrites the other's transform. Size and place come
  // from the style, on the Pressable, as before.
  return (
    <Animated.View entering={entering} exiting={exiting} layout={layout}>
      {pressable}
    </Animated.View>
  );
}

/** The scale in a style's transform, when that's all the transform is; null for anything else. */
function scaleOf(transform: ViewStyle['transform']): number | null {
  if (transform === undefined) return 1;
  if (!Array.isArray(transform) || transform.length !== 1) return null;
  const only = transform[0] as Record<string, unknown>;
  return Object.keys(only).length === 1 && typeof only.scale === 'number' ? only.scale : null;
}

/**
 * React Native's Pressable, with its press feedback faded rather than
 * snapped, as a row or a button does on iOS: what the style gives `pressed`
 * (a highlight behind it, a dim, a shrink) comes on at the touch and, let
 * go, eases away. Anything else in the style follows `pressed` as before.
 * The same props, including the `({ pressed, hovered }) => …` style, so
 * every screen imports this one in place of React Native's.
 */
export const Pressable = forwardRef(function Pressable(
  { style, onPressIn, onPressOut, onHoverIn, onHoverOut, ...props }: PressableProps,
  ref: ForwardedRef<ViewInstance>,
) {
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const highlight = useSharedValue(0);
  // Under a mouse, a row's or button's hover shade fades in and out too, rather than snapping.
  const over = useSharedValue(0);
  const shrink = useSharedValue(0);

  const resolve = (down: boolean, hover: boolean): ViewStyle =>
    StyleSheet.flatten(typeof style === 'function' ? style({ pressed: down, hovered: hover } as PressableStateCallbackType) : style) ?? {};
  const plain = resolve(false, false);
  const lit = typeof style === 'function' ? resolve(false, true) : plain;
  const rest = hovered ? lit : plain;
  const down = typeof style === 'function' ? resolve(true, hovered) : rest;
  const opacityOf = (s: ViewStyle) => (typeof s.opacity === 'number' ? s.opacity : 1);
  const colourOf = (s: ViewStyle) => (typeof s.backgroundColor === 'string' ? s.backgroundColor : 'transparent');
  const plainOpacity = opacityOf(plain);
  const litOpacity = opacityOf(lit);
  const downOpacity = opacityOf(down);
  // "Transparent" is clear black: fading from it to a grey dimmed through a darker tint on the way.
  // A clear version of the colour it fades to doesn't.
  const solid = [colourOf(plain), colourOf(lit), colourOf(down)].find((c) => c !== 'transparent');
  const clean = (c: string) => (c === 'transparent' && solid ? clearOf(solid) : c);
  const plainColor = clean(colourOf(plain));
  const litColor = clean(colourOf(lit));
  const downColor = typeof down.backgroundColor === 'string' ? clean(down.backgroundColor) : hovered ? litColor : plainColor;
  const restScale = scaleOf(rest.transform);
  const downScale = scaleOf(down.transform);
  const fadesOpacity = plainOpacity !== litOpacity || opacityOf(rest) !== downOpacity;
  const fadesColor = plainColor !== litColor || (hovered ? litColor : plainColor) !== downColor;
  const scales = restScale !== null && downScale !== null && restScale !== downScale;

  const feedback = useAnimatedStyle(() => {
    // React Native's styles are read-only; this one is built up here.
    const out: { -readonly [K in keyof ViewStyle]: ViewStyle[K] } = {};
    if (fadesOpacity) {
      const resting = plainOpacity + (litOpacity - plainOpacity) * over.value;
      out.opacity = resting + (downOpacity - resting) * highlight.value;
    }
    if (fadesColor) {
      const resting = interpolateColor(over.value, [0, 1], [plainColor, litColor]) as string;
      out.backgroundColor = interpolateColor(highlight.value, [0, 1], [resting, downColor]) as string;
    }
    if (scales) out.transform = [{ scale: restScale! + (downScale! - restScale!) * shrink.value }];
    return out;
  });

  return (
    <AnimatedPressable
      {...props}
      // Reanimated's component takes its own ref type; the view underneath is the same.
      ref={ref as never}
      onPressIn={(event: GestureResponderEvent) => {
        setPressed(true);
        // On at the touch, as iOS does: a quick tap still shows.
        highlight.value = 1;
        shrink.value = withSpring(1, PRESS_IN);
        onPressIn?.(event);
      }}
      onPressOut={(event: GestureResponderEvent) => {
        setPressed(false);
        highlight.value = withTiming(0, { duration: 300, easing: EASE_SOFT, reduceMotion: ReduceMotion.System });
        shrink.value = withSpring(0, PRESS_OUT);
        onPressOut?.(event);
      }}
      onHoverIn={(event) => {
        setHovered(true);
        over.value = withTiming(1, { duration: 140, easing: EASE_OUT, reduceMotion: ReduceMotion.System });
        onHoverIn?.(event);
      }}
      onHoverOut={(event) => {
        setHovered(false);
        over.value = withTiming(0, { duration: 240, easing: EASE_SOFT, reduceMotion: ReduceMotion.System });
        onHoverOut?.(event);
      }}
      style={[pressed ? down : rest, feedback]}
    />
  );
});
