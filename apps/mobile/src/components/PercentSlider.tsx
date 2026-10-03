/**
 * A percentage you set by sliding: drag the thumb, or tap along the track,
 * in whole steps, with a light tick at each one and a firmer one at the
 * detents (0, the middle, 100). `onChange` follows the finger (for a live
 * preview); `onCommit` comes once, when it's let go.
 *
 * Made the way iOS 26's sliders are: a white capsule that, under your
 * finger, swells into a lens of glass, clear, rimmed with light, and
 * magnifying the track beneath it. It stretches as you move it fast and
 * wobbles back into shape when you let go. The fill catches the light
 * towards the thumb, and a special accent (Rainbow, Camo) paints it.
 *
 * A vertical swipe that starts on it still scrolls the page. Screen readers
 * get an adjustable control: swipe up or down to step it. In a browser it
 * takes the keyboard's focus, and the arrow keys, Home and End move it.
 * With Reduce Motion the lens and stretch still show, without the springs.
 */

import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { haptic } from '@/lib/haptics';
import { NO_TOUCH, color, themed } from '@/lib/theme';
import { BrandFill } from './BrandFill';

const HEIGHT = 44;
const THUMB_W = 38;
const THUMB_H = 24;
const TRACK = 8;
const DOT = 4;
/** Marks along the track; a firmer tick when the thumb reaches one. */
const DETENTS = [0, 25, 50, 75, 100];
const FIRM = [0, 50, 100];

const SNAP = { duration: 160, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System };
/** Swelling into the lens: quick, a little bouncy. */
const SWELL = { damping: 14, stiffness: 320, mass: 0.6, reduceMotion: ReduceMotion.System };
/** Back to a capsule: looser, so it wobbles like a drop settling. */
const WOBBLE = { damping: 9, stiffness: 260, mass: 0.6, reduceMotion: ReduceMotion.System };
const STRETCH = { damping: 18, stiffness: 300, mass: 0.5, reduceMotion: ReduceMotion.System };

// Web takes CSS `backgroundImage`; React Native's own renderer takes `experimental_backgroundImage`.
const gradient = (value: string): ViewStyle =>
  (Platform.OS === 'web' ? { backgroundImage: value } : { experimental_backgroundImage: value }) as ViewStyle;

export function PercentSlider({
  value,
  step = 5,
  onChange,
  onCommit,
  disabled = false,
  label,
  valueText,
}: {
  value: number;
  step?: number;
  /** While the finger moves: each new step. */
  onChange: (value: number) => void;
  /** Once it's let go (or stepped by a screen reader). */
  onCommit: (value: number) => void;
  disabled?: boolean;
  /** What it sets, for a screen reader. */
  label: string;
  /** The value in words, for a screen reader ("50%, Balanced"). */
  valueText?: string;
}) {
  // How far the thumb can travel, and where it is along that.
  const [travel, setTravel] = useState(0);
  const width = useSharedValue(0);
  const x = useSharedValue(0);
  const last = useSharedValue(value);
  const held = useSharedValue(false);
  /** 0 a capsule, 1 a lens. */
  const press = useSharedValue(0);
  /** How far it's stretched by speed. */
  const stretch = useSharedValue(0);

  // Follow the value from outside (the step buttons, a reset), unless a finger is on it.
  useEffect(() => {
    if (held.value) return;
    last.value = value;
    x.value = travel > 0 ? withTiming((value / 100) * travel, SNAP) : 0;
  }, [value, travel, held, last, x]);

  const onLayout = (event: LayoutChangeEvent) => {
    const next = Math.max(0, event.nativeEvent.layout.width - THUMB_W);
    width.value = next;
    if (Math.round(next) !== Math.round(travel)) setTravel(next);
  };

  const stepped = (next: number) => {
    if (FIRM.includes(next)) haptic.tap();
    else haptic.select();
    onChange(next);
  };

  /** Put the thumb under the finger, and say so when that's a new step. */
  const follow = (at: number) => {
    'worklet';
    const w = width.value;
    if (w <= 0) return;
    const left = Math.min(Math.max(at - THUMB_W / 2, 0), w);
    x.value = left;
    const next = Math.round(((left / w) * 100) / step) * step;
    if (next !== last.value) {
      last.value = next;
      runOnJS(stepped)(next);
    }
  };

  /** Let go: settle on the step, and keep it. */
  const settle = () => {
    'worklet';
    x.value = withTiming((last.value / 100) * width.value, SNAP);
    runOnJS(onCommit)(last.value);
  };

  /** Back to a capsule, with a wobble. */
  const release = () => {
    'worklet';
    press.value = withSpring(0, WOBBLE);
    stretch.value = withSpring(0, WOBBLE);
  };

  const drag = Gesture.Pan()
    .enabled(!disabled)
    .activeOffsetX([-3, 3])
    .failOffsetY([-12, 12])
    .onBegin(() => {
      held.value = true;
    })
    // Swell only once it's really a drag, so a scroll that starts here doesn't flash a lens.
    .onStart(() => {
      press.value = withSpring(1, SWELL);
    })
    .onUpdate((event) => {
      follow(event.x);
      stretch.value = withSpring(Math.min(Math.abs(event.velocityX) / 2600, 0.32), STRETCH);
    })
    .onEnd(() => settle())
    .onFinalize(() => {
      held.value = false;
      release();
    });
  const tap = Gesture.Tap()
    .enabled(!disabled)
    .onEnd((event) => {
      follow(event.x);
      settle();
      // A tap gets a quick pulse of the lens.
      press.value = withSequence(withTiming(1, { duration: 110, reduceMotion: ReduceMotion.System }), withSpring(0, WOBBLE));
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { scaleX: (1 + press.value * 0.5) * (1 + stretch.value) },
      { scaleY: (1 + press.value * 0.34) * (1 - stretch.value * 0.45) },
    ],
  }));
  const trackStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: 1 + press.value * 0.25 }] }));
  const solidStyle = useAnimatedStyle(() => ({ opacity: 1 - press.value * 0.92 }));
  const lensStyle = useAnimatedStyle(() => ({ opacity: press.value }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: press.value * 0.55, transform: [{ scale: 0.8 + press.value * 0.5 }] }));
  // Inside the lens, the track lined up with the real one: the lens's swell magnifies it.
  const lensTrackStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -x.value }] }));

  const nudge = (by: number) => {
    const next = Math.min(100, Math.max(0, value + by));
    if (next === value) return;
    if (FIRM.includes(next)) haptic.tap();
    else haptic.select();
    onChange(next);
    onCommit(next);
  };

  // The keys a browser's slider answers to.
  const keys =
    Platform.OS === 'web' && !disabled
      ? {
          focusable: true,
          onKeyDown: (event: { key: string; preventDefault: () => void }) => {
            const by = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step, PageUp: step * 4, PageDown: -step * 4, Home: -100, End: 100 }[event.key];
            if (by === undefined) return;
            event.preventDefault();
            nudge(by);
          },
        }
      : {};

  return (
    <GestureDetector gesture={Gesture.Race(drag, tap)}>
      <View
        {...keys}
        onLayout={onLayout}
        style={[styles.wrap, disabled && styles.disabled]}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        accessibilityValue={{ min: 0, max: 100, now: value, text: valueText ?? `${value}%` }}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={valueText ?? `${value}%`}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => {
          if (disabled) return;
          if (event.nativeEvent.actionName === 'increment') nudge(step * 2);
          if (event.nativeEvent.actionName === 'decrement') nudge(-step * 2);
        }}
      >
        <Animated.View style={[styles.track, trackStyle]}>
          <TrackBody x={x} value={value} travel={travel} />
        </Animated.View>

        {/* A soft glow of the accent round the lens. */}
        <Animated.View style={[styles.thumbBox, styles.halo, thumbStyle, { pointerEvents: 'none' }]}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.haloGlow, haloStyle]} />
        </Animated.View>

        <Animated.View style={[styles.thumbBox, styles.thumbShadow, thumbStyle, { pointerEvents: 'none' }]}>
          <View style={styles.thumbClip}>
            {/* What the lens shows: the track, magnified by the swell, on the card it sits on (so the real one doesn't show through twice). */}
            <View style={[StyleSheet.absoluteFill, styles.lensBack]} />
            <Animated.View style={[styles.lensTrack, { width: travel }, lensTrackStyle]}>
              <TrackBody x={x} value={value} travel={travel} />
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, styles.solid, solidStyle]} />
            <Animated.View style={[StyleSheet.absoluteFill, styles.glass, lensStyle]} />
          </View>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

/** The track's insides: the groove, the fill up to the thumb, and the detent marks. */
function TrackBody({ x, value, travel }: { x: SharedValue<number>; value: number; travel: number }) {
  const fillStyle = useAnimatedStyle(() => ({ width: x.value }));
  return (
    <View style={styles.groove}>
      <Animated.View style={[styles.fill, fillStyle]}>
        <BrandFill />
        <View style={[NO_TOUCH, StyleSheet.absoluteFill, styles.fillLight]} />
        <View style={[NO_TOUCH, StyleSheet.absoluteFill, styles.fillGloss]} />
      </Animated.View>
      {travel > 0 &&
        DETENTS.map((mark) => (
          <View
            key={mark}
            style={[
              styles.dot,
              mark === 50 && styles.dotMiddle,
              { left: (mark / 100) * travel - (mark === 50 ? DOT + 2 : DOT) / 2 },
              mark <= value ? styles.dotOn : styles.dotOff,
              // The ends sit under the rounded caps; keep them inside.
              mark === 0 && { left: 3 },
              mark === 100 && { left: travel - DOT - 3 },
            ]}
          />
        ))}
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    // Round, so a keyboard's focus ring is a pill.
    wrap: { flex: 1, height: HEIGHT, justifyContent: 'center', borderRadius: HEIGHT / 2 },
    disabled: { opacity: 0.4 },
    track: { position: 'absolute', left: THUMB_W / 2, right: THUMB_W / 2, top: (HEIGHT - TRACK) / 2, height: TRACK },
    groove: {
      flex: 1,
      borderRadius: TRACK / 2,
      backgroundColor: color.fillStrong,
      overflow: 'hidden',
      boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.14)',
    },
    fill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: color.brandFill, overflow: 'hidden' },
    // Brighter towards the thumb, and a gloss along the top: liquid catching the light.
    fillLight: gradient('linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 55%, rgba(255,255,255,0.32) 100%)'),
    fillGloss: gradient('linear-gradient(180deg, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0) 60%)'),
    dot: { position: 'absolute', top: (TRACK - DOT) / 2, width: DOT, height: DOT, borderRadius: DOT / 2 },
    dotMiddle: { top: (TRACK - DOT - 2) / 2, width: DOT + 2, height: DOT + 2, borderRadius: (DOT + 2) / 2 },
    dotOn: { backgroundColor: 'rgba(255, 255, 255, 0.75)' },
    dotOff: { backgroundColor: color.labelTertiary, opacity: 0.55 },

    thumbBox: { position: 'absolute', left: 0, top: (HEIGHT - THUMB_H) / 2, width: THUMB_W, height: THUMB_H, borderRadius: THUMB_H / 2 },
    halo: { borderCurve: 'continuous' },
    haloGlow: { borderRadius: THUMB_H / 2, backgroundColor: color.brandTint, boxShadow: `0 0 16px 4px ${color.brandBorder}` },
    thumbShadow: { boxShadow: '0 2px 7px rgba(0, 0, 0, 0.2), 0 0.5px 1.5px rgba(0, 0, 0, 0.14)' },
    thumbClip: { flex: 1, borderRadius: THUMB_H / 2, borderCurve: 'continuous', overflow: 'hidden' },
    lensBack: { backgroundColor: color.card },
    lensTrack: { position: 'absolute', left: THUMB_W / 2, top: (THUMB_H - TRACK) / 2, height: TRACK },
    solid: { backgroundColor: '#FFFFFF', borderRadius: THUMB_H / 2 },
    // The lens: barely tinted, a bright rim, light along the top edge and a little shade below.
    glass: {
      borderRadius: THUMB_H / 2,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.95)',
      backgroundColor: 'rgba(255, 255, 255, 0.12)',
      boxShadow: 'inset 0 1.5px 1px rgba(255, 255, 255, 0.9), inset 0 -1px 2px rgba(0, 0, 0, 0.12), inset 0 0 8px rgba(255, 255, 255, 0.35)',
      ...gradient('linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.05) 45%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.18) 100%)'),
    },
  }),
);
