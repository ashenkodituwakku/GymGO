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

import { forwardRef, useEffect, useRef, useState, type ComponentProps, type ForwardedRef, type ReactNode } from 'react';
import {
  Platform,
  Pressable as NativePressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  ZoomIn,
  ReduceMotion,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type WithSpringConfig,
  type WithTimingConfig,
} from 'react-native-reanimated';

/** A spring's damping for a damping ratio: 1 arrives without overshooting. */
export const damp = (ratio: number, stiffness: number, mass: number) => Math.round(ratio * 2 * Math.sqrt(stiffness * mass) * 10) / 10;

/** A press going down: crisp, straight there. */
export const PRESS_IN: WithSpringConfig = { damping: damp(0.9, 520, 0.6), stiffness: 520, mass: 0.6, reduceMotion: ReduceMotion.System };
/** Letting go: back with only a hint of give, so it feels alive rather than mechanical. */
export const PRESS_OUT: WithSpringConfig = { damping: damp(0.72, 340, 0.6), stiffness: 340, mass: 0.6, reduceMotion: ReduceMotion.System };
/** Things settling into place (a chevron turning, a pill sliding): quick, and no bounce at all. */
export const SETTLE: WithSpringConfig = { damping: damp(1, 300, 0.8), stiffness: 300, mass: 0.8, reduceMotion: ReduceMotion.System };
/** Something arriving to be noticed (a medal, a new record): one lively pop that settles fast. */
export const POP: WithSpringConfig = { damping: damp(0.6, 260, 0.8), stiffness: 260, mass: 0.8, reduceMotion: ReduceMotion.System };
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

/** Rows and sections making room for each other: a glide that stops dead, no wobble. */
export const GLIDE = LinearTransition.springify().damping(damp(1, 300, 1)).stiffness(300).reduceMotion(ReduceMotion.System);
/**
 * Whether an entering or exiting animation can take one of these curves: a
 * browser's version of them can't (it warns and runs them linear), so
 * there they keep their own easing.
 */
export const CURVES = Platform.OS !== 'web';

/** A notice or small element arriving and leaving. */
export const FADE_IN = (CURVES ? FadeIn.duration(240).easing(EASE_OUT) : FadeIn.duration(200)).reduceMotion(ReduceMotion.System);
export const FADE_OUT = (CURVES ? FadeOut.duration(160).easing(EASE_IN) : FadeOut.duration(150)).reduceMotion(ReduceMotion.System);

/*
 * Entrances are springs on the phone. In the browser they're timed instead:
 * Reanimated's web version pins a spring-entered view in place
 * (position: absolute) when its container later moves, as a sheet does,
 * which collapses the layout around it.
 */

/** Grows in from a little smaller as it fades up, the way a button or popover appears on iOS. */
function growIn() {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.86 }] },
    animations: {
      opacity: withTiming(1, { duration: 180, easing: EASE_OUT, reduceMotion: ReduceMotion.System }),
      transform: [{ scale: withSpring(1, { damping: damp(0.82, 320, 0.7), stiffness: 320, mass: 0.7, reduceMotion: ReduceMotion.System }) }],
    },
  };
}

/** Something to be noticed arriving (a new card, a record, a medal): one pop, on the shared POP spring; timed in a browser. */
export const POP_IN = (Platform.OS === 'web' ? ZoomIn.duration(260) : ZoomIn.springify().damping(POP.damping!).stiffness(POP.stiffness!).mass(POP.mass!)).reduceMotion(ReduceMotion.System);

/** Something small appearing over the map, as "Search this area" does. */
export const DROP_IN = Platform.OS === 'web' ? FadeIn.duration(180).reduceMotion(ReduceMotion.System) : growIn;

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

/** A scale that sinks on press and springs back: spread its handlers onto a Pressable, its style onto what should move. */
export function usePressScale(to = 0.96) {
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
  scaleTo = 0.96,
  style,
  onPressIn,
  onPressOut,
  children,
  entering,
  exiting,
  layout,
  ...props
}: Omit<PressableProps, 'style'> & ViewMotion & { scaleTo?: number; style?: PressyStyle; children?: ReactNode }) {
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
  ref: ForwardedRef<View>,
) {
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const highlight = useSharedValue(0);
  const shrink = useSharedValue(0);

  const resolve = (down: boolean): ViewStyle =>
    StyleSheet.flatten(typeof style === 'function' ? style({ pressed: down, hovered } as PressableStateCallbackType) : style) ?? {};
  const rest = resolve(false);
  const down = typeof style === 'function' ? resolve(true) : rest;
  const restOpacity = typeof rest.opacity === 'number' ? rest.opacity : 1;
  const downOpacity = typeof down.opacity === 'number' ? down.opacity : 1;
  const restColor = typeof rest.backgroundColor === 'string' ? rest.backgroundColor : 'transparent';
  const downColor = typeof down.backgroundColor === 'string' ? down.backgroundColor : restColor;
  const restScale = scaleOf(rest.transform);
  const downScale = scaleOf(down.transform);
  const fadesOpacity = restOpacity !== downOpacity;
  const fadesColor = restColor !== downColor;
  const scales = restScale !== null && downScale !== null && restScale !== downScale;

  const feedback = useAnimatedStyle(() => {
    const out: ViewStyle = {};
    if (fadesOpacity) out.opacity = restOpacity + (downOpacity - restOpacity) * highlight.value;
    if (fadesColor) out.backgroundColor = interpolateColor(highlight.value, [0, 1], [restColor, downColor]) as string;
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
        onHoverIn?.(event);
      }}
      onHoverOut={(event) => {
        setHovered(false);
        onHoverOut?.(event);
      }}
      style={[pressed ? down : rest, feedback]}
    />
  );
});
