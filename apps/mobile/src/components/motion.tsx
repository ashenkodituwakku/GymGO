/**
 * How things move, in one place, so the whole app has one feel.
 *
 * Springs, not timed curves, as iOS uses: a press sinks quickly and comes back
 * with a little give; things that switch on (Save, Compare) pop once; cards
 * and sections rise into place in a short stagger; notices fade.
 *
 * Every animation here follows the device's Reduce Motion setting
 * (`ReduceMotion.System`): with it on, things simply appear in their final
 * state.
 */

import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Platform, Pressable, type GestureResponderEvent, type PressableProps, type PressableStateCallbackType, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
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
export const FADE_IN = FadeIn.duration(220).reduceMotion(ReduceMotion.System);
export const FADE_OUT = FadeOut.duration(140).reduceMotion(ReduceMotion.System);

/*
 * Entrances are springs on the phone. In the browser they're timed instead:
 * Reanimated's web version pins a spring-entered view in place
 * (position: absolute) when its container later moves, as a sheet does,
 * which collapses the layout around it.
 */

/** Something small dropping in from above, as "Search this area" does under the top bar. */
export const DROP_IN =
  Platform.OS === 'web'
    ? FadeInUp.duration(260).reduceMotion(ReduceMotion.System)
    : FadeInUp.springify().damping(18).stiffness(220).reduceMotion(ReduceMotion.System);

/** Rising into place, the `index`-th of a group a beat after the one before (capped, so long lists don't wait). */
export function rise(index = 0) {
  if (Platform.OS === 'web') return FadeInDown.duration(320).delay(Math.min(index, 6) * 45).reduceMotion(ReduceMotion.System);
  return FadeInDown.springify()
    .damping(20)
    .stiffness(200)
    .delay(Math.min(index, 6) * 45)
    .withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] })
    .reduceMotion(ReduceMotion.System);
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
