/**
 * The moment between tapping Build my workout and the plan: a bar that fills
 * over three seconds, a light sweeping along it, the workout icon breathing
 * in its accent tile, and the steps of the plan named as the bar passes them.
 * The plan itself is made at once; this is a beat to make its arrival feel
 * like something, then `onDone` shows it. With Reduce Motion the bar still
 * fills, as plain progress, but the light and the breathing stay still.
 */

import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';
import { BrandFill, accentGlow } from './BrandFill';
import { Icon } from './Icon';
import { Txt } from './ui';

/** How long the bar takes to fill. */
export const BUILD_MS = 3000;
const BAR_H = 10;

/** What each stretch of the bar stands for, in order: short enough for one line on a phone. */
const STEPS = ['Picking exercises', 'Fitting them to the machines', 'Setting sets, reps and rest'];

export function BuildingBar({ onDone }: { onDone: () => void }) {
  const calm = useReducedMotion();
  const progress = useSharedValue(0);
  const sweep = useSharedValue(0);
  const breath = useSharedValue(0);
  const [percent, setPercent] = useState(0);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    // Eased in and out, so it starts and lands softly; never cut short by Reduce Motion (it is the progress itself).
    progress.value = withTiming(1, { duration: BUILD_MS, easing: Easing.bezier(0.45, 0, 0.25, 1), reduceMotion: ReduceMotion.Never }, (finished) => {
      if (finished) runOnJS(onDone)();
    });
    if (!calm) {
      sweep.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), -1, false);
      breath.value = withRepeat(withSequence(withTiming(1, { duration: 600, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 600, easing: Easing.inOut(Easing.sin) })), -1, false);
    }
    return () => {
      cancelAnimation(progress);
      cancelAnimation(sweep);
      cancelAnimation(breath);
    };
    // Once, as it appears: a new tap mounts a new bar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The figure under the bar, told to React only when it changes.
  useAnimatedReaction(
    () => Math.round(progress.value * 100),
    (now, before) => {
      if (now !== before) runOnJS(setPercent)(now);
    },
  );

  const fill = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  // A light a third of the bar wide, crossing the filled part from left to right.
  const light = useAnimatedStyle(() => ({ transform: [{ translateX: -width * 0.35 + sweep.value * width * 1.35 }] }));
  const tile = useAnimatedStyle(() => ({ transform: [{ scale: 1 + breath.value * 0.08 }, { rotate: `${(breath.value - 0.5) * 10}deg` }] }));

  const at = Math.min(STEPS.length - 1, Math.floor((percent / 100) * STEPS.length));

  return (
    // The aria- values, as a browser reads them too (accessibilityValue reached only phones).
    <View
      style={styles.card}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Building your workout. ${STEPS[at]}`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <View style={styles.head}>
        <Animated.View style={[styles.tile, accentGlow(color.brandFill, true), tile]}>
          <BrandFill round={radius.md} />
          <Icon name="workout" size={22} color={color.onBrand} />
        </Animated.View>
        <View style={styles.flex}>
          <Txt variant="headline">Building your workout</Txt>
          <Txt variant="footnote" color={color.labelSecondary} numberOfLines={1}>
            {`${STEPS[at]}…`}
          </Txt>
        </View>
        <Txt variant="headline" color={color.brand} style={styles.percent}>
          {`${percent}%`}
        </Txt>
      </View>
      <View style={styles.track} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        <Animated.View style={[styles.fill, fill]}>
          <BrandFill round={BAR_H / 2} />
          {!calm && <Animated.View style={[styles.light, { width: width * 0.35 }, light]} />}
        </Animated.View>
      </View>
      {/* A dot a step: filled once the bar has passed it. */}
      <View style={styles.dots}>
        {STEPS.map((step, index) => (
          <View key={step} style={[styles.dot, index <= at && styles.dotOn]} />
        ))}
      </View>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    card: {
      gap: space[3],
      padding: space[4],
      borderRadius: radius.lg,
      borderCurve: 'continuous',
      backgroundColor: color.plate,
      ...shadow.plate,
    },
    head: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
    flex: { flex: 1, minWidth: 0 },
    tile: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      borderCurve: 'continuous',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: color.brandFill,
    },
    // Digits that don't shift the bar's label as they change.
    percent: { minWidth: 48, textAlign: 'right', fontVariant: ['tabular-nums'], ...face('bold') },
    track: { height: BAR_H, borderRadius: BAR_H / 2, backgroundColor: color.fill, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: BAR_H / 2, backgroundColor: color.brandFill, overflow: 'hidden' },
    light: { position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: 'rgba(255, 255, 255, 0.45)', borderRadius: BAR_H / 2 },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: space[2] },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.fill },
    dotOn: { backgroundColor: color.brand },
  }),
);
