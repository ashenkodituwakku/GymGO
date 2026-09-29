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
 */

import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Platform, Pressable, type GestureResponderEvent, type PressableProps, type PressableStateCallbackType, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type WithSpringConfig,
} from 'react-native-reanimated';

/** A press going down: quick and firm. */
export const PRESS_IN: WithSpringConfig = { damping: 22, stiffness: 520, mass: 0.6, reduceMotion: ReduceMotion.System };
/** Letting go: a touch of overshoot, so it feels springy rather than mechanical. */
export const PRESS_OUT: WithSpringConfig = { damping: 14, stiffness: 320, mass: 0.6, reduceMotion: ReduceMotion.System };
/** Things settling into place (a chevron turning, a pill sliding). */
export const SETTLE: WithSpringConfig = { damping: 20, stiffness: 260, mass: 0.8, reduceMotion: ReduceMotion.System };

/** Rows and sections making room for each other. */
export const GLIDE = LinearTransition.springify().damping(26).stiffness(260).reduceMotion(ReduceMotion.System);
/** A notice or small element arriving and leaving. */
export const FADE_IN = FadeIn.duration(180).reduceMotion(ReduceMotion.System);
export const FADE_OUT = FadeOut.duration(140).reduceMotion(ReduceMotion.System);

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
      opacity: withTiming(1, { duration: 160, reduceMotion: ReduceMotion.System }),
      transform: [{ scale: withSpring(1, { damping: 18, stiffness: 320, mass: 0.7, reduceMotion: ReduceMotion.System }) }],
    },
  };
}

/** Something small appearing over the map, as "Search this area" does. */
export const DROP_IN = Platform.OS === 'web' ? FadeIn.duration(180).reduceMotion(ReduceMotion.System) : growIn;

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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
