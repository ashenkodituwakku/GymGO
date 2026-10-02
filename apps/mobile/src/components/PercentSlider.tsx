/**
 * A percentage you set by sliding: drag the thumb, or tap along the track,
 * in whole steps, with a light tick at each one. `onChange` follows the
 * finger (for a live preview); `onCommit` comes once, when it's let go.
 *
 * A vertical swipe that starts on it still scrolls the page. Screen readers
 * get an adjustable control: swipe up or down to step it. In a browser it
 * takes the keyboard's focus, and the arrow keys, Home and End move it.
 */

import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, ReduceMotion, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { haptic } from '@/lib/haptics';
import { color, themed } from '@/lib/theme';

const THUMB = 28;
const TRACK = 6;
const SNAP = { duration: 140, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System };

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

  // Follow the value from outside (the step buttons, a reset), unless a finger is on it.
  useEffect(() => {
    if (held.value) return;
    last.value = value;
    x.value = travel > 0 ? withTiming((value / 100) * travel, SNAP) : 0;
  }, [value, travel, held, last, x]);

  const onLayout = (event: LayoutChangeEvent) => {
    const next = Math.max(0, event.nativeEvent.layout.width - THUMB);
    width.value = next;
    if (Math.round(next) !== Math.round(travel)) setTravel(next);
  };

  const stepped = (next: number) => {
    haptic.select();
    onChange(next);
  };

  /** Put the thumb under the finger, and say so when that's a new step. */
  const follow = (at: number) => {
    'worklet';
    const w = width.value;
    if (w <= 0) return;
    const left = Math.min(Math.max(at - THUMB / 2, 0), w);
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

  const drag = Gesture.Pan()
    .enabled(!disabled)
    .activeOffsetX([-3, 3])
    .failOffsetY([-12, 12])
    .onBegin(() => {
      held.value = true;
    })
    .onUpdate((event) => follow(event.x))
    .onEnd(() => settle())
    .onFinalize(() => {
      held.value = false;
    });
  const tap = Gesture.Tap()
    .enabled(!disabled)
    .onEnd((event) => {
      follow(event.x);
      settle();
    });

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const fillStyle = useAnimatedStyle(() => ({ width: x.value }));

  const nudge = (by: number) => {
    const next = Math.min(100, Math.max(0, value + by));
    if (next === value) return;
    haptic.select();
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
        <View style={styles.track}>
          <Animated.View style={[styles.fill, fillStyle]} />
        </View>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </View>
    </GestureDetector>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    // Round, so a keyboard's focus ring is a pill.
    wrap: { flex: 1, height: 44, justifyContent: 'center', borderRadius: 22 },
    disabled: { opacity: 0.4 },
    track: { marginHorizontal: THUMB / 2, height: TRACK, borderRadius: TRACK / 2, backgroundColor: color.fillStrong, overflow: 'hidden' },
    fill: { height: TRACK, backgroundColor: color.brandFill },
    thumb: {
      position: 'absolute',
      left: 0,
      width: THUMB,
      height: THUMB,
      borderRadius: THUMB / 2,
      backgroundColor: '#FFFFFF',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(0, 0, 0, 0.08)',
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2), 0 0.5px 1.5px rgba(0, 0, 0, 0.12)',
    },
  }),
);
