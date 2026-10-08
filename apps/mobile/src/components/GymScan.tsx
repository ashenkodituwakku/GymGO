/**
 * The scan while GymGO checks you're at a gym (CollectCard): rings ripple
 * out from a pin like a radar, a progress bar fills, and a line says what's
 * happening. Finding your position has no real progress to report, so the
 * bar eases most of the way while the phone looks (as long as that usually
 * takes), then fills as each step finishes.
 *
 * With Reduce Motion on (an iPhone setting, or "Animation effects" off in
 * Windows, which the browser passes on), nothing grows or moves: the rings
 * stay put and light up in turn from the pin outwards, a fade rather than
 * motion. The bar still fills, since it's information, not decoration.
 */

import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { color, face, radius, space, themed } from '@/lib/theme';
import { Icon } from './Icon';
import { Txt } from './ui';

/** Finding where you are, then comparing it with the gym, then the answer. */
export type ScanPhase = 'locating' | 'checking' | 'done';

const RINGS = 3;
const RING_MS = 2100;
// Timing curves work everywhere (it's entering and leaving animations the web can't curve).
const easeOut = { easing: Easing.out(Easing.cubic) };
const motion = { reduceMotion: ReduceMotion.System };
/** For what still runs with Reduce Motion on: fades, and the bar filling. */
const always = { reduceMotion: ReduceMotion.Never };

/** How far the bar gets in each phase, and how long it takes to get there. */
const BAR: Record<ScanPhase, { to: number; ms: number }> = {
  // Most fixes come within a few seconds; the bar slows as it nears 70%.
  locating: { to: 0.7, ms: 5000 },
  checking: { to: 0.92, ms: 450 },
  done: { to: 1, ms: 300 },
};

export function GymScan({ phase, gymName }: { phase: ScanPhase; gymName: string }) {
  const still = useReducedMotion();
  const progress = useSharedValue(0);
  useEffect(() => {
    const { to, ms } = BAR[phase];
    progress.value = withTiming(to, { duration: ms, ...easeOut, ...always });
  }, [phase, progress]);
  useEffect(() => () => cancelAnimation(progress), [progress]);

  const bar = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  const line =
    phase === 'locating' ? 'Finding where you are…' : phase === 'checking' ? `Checking you’re at ${gymName}…` : 'You’re here!';

  return (
    <View style={styles.wrap} accessible accessibilityRole="progressbar" accessibilityLabel={line} accessibilityLiveRegion="polite">
      <View style={styles.radar}>
        {Array.from({ length: RINGS }, (_, index) =>
          still ? <StillRing key={index} index={index} done={phase === 'done'} /> : <Ring key={index} index={index} done={phase === 'done'} />,
        )}
        <Core done={phase === 'done'} />
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, phase === 'done' && styles.fillDone, bar]} />
      </View>
      <View style={styles.caption}>
        <Txt variant="footnote" color={phase === 'done' ? color.goodInk : color.labelSecondary} style={face('semibold')} numberOfLines={1}>
          {line}
        </Txt>
        <Percent progress={progress} />
      </View>
    </View>
  );
}

/** One ring: it grows from the pin and fades, again and again, a third of a beat after the last. */
function Ring({ index, done }: { index: number; done: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = 0;
    t.value = withDelay(
      (index * RING_MS) / RINGS,
      withRepeat(withTiming(1, { duration: done ? RING_MS / 2 : RING_MS, ...easeOut, ...motion }), done ? 1 : -1, false, undefined, ReduceMotion.System),
    );
    return () => cancelAnimation(t);
  }, [done, index, t]);
  // From the pin's edge out to the edge of the panel, fading as it goes.
  const style = useAnimatedStyle(() => ({
    opacity: (1 - t.value) * 0.85,
    transform: [{ scale: 0.95 + t.value * 1.95 }],
  }));
  return <Animated.View style={[styles.ring, done && styles.ringDone, style, { pointerEvents: 'none' }]} />;
}

/**
 * With Reduce Motion: one ring at a fixed size, lighting up and dimming in
 * turn with the others, from the pin outwards, so the scan still looks alive
 * without anything moving. When it's done, all three glow green together.
 */
function StillRing({ index, done }: { index: number; done: boolean }) {
  const glow = useSharedValue(0);
  useEffect(() => {
    glow.value = 0;
    glow.value = done
      ? withTiming(1, { duration: 250, ...always })
      : withDelay(
          (index * RING_MS) / RINGS / 2,
          withRepeat(
            withSequence(withTiming(1, { duration: RING_MS / 4, ...always }), withTiming(0, { duration: (RING_MS * 3) / 4, ...always })),
            -1,
            false,
            undefined,
            ReduceMotion.Never,
          ),
        );
    return () => cancelAnimation(glow);
  }, [done, index, glow]);
  const style = useAnimatedStyle(() => ({ opacity: 0.18 + glow.value * 0.67 }));
  return <Animated.View style={[styles.ring, done && styles.ringDone, { transform: [{ scale: 1.45 + index * 0.62 }] }, style, { pointerEvents: 'none' }]} />;
}

/** The pin in the middle: a slow breath while it looks, a pop when it's sure. */
function Core({ done }: { done: boolean }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = done
      ? withSequence(withTiming(1.22, { duration: 140, ...motion }), withTiming(1, { duration: 220, ...easeOut, ...motion }))
      : withRepeat(withTiming(1.08, { duration: 700, ...motion }), -1, true, undefined, ReduceMotion.System);
    return () => cancelAnimation(scale);
  }, [done, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[styles.core, done && styles.coreDone, style]}>
      <Icon name={done ? 'check' : 'pin'} size={22} color={color.onBrand} />
    </Animated.View>
  );
}

/** The bar's number, read from the animation ten times a second (it doesn't need every frame). */
function Percent({ progress }: { progress: SharedValue<number> }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setShown(Math.round(progress.value * 100)), 100);
    return () => clearInterval(id);
  }, [progress]);
  return (
    <Txt variant="caption" color={color.labelTertiary} style={face('semibold')}>
      {`${shown}%`}
    </Txt>
  );
}

const SIZE = 52;

const styles = themed(() =>
  StyleSheet.create({
    wrap: { gap: space[3] },
    radar: { height: 156, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: radius.md },
    ring: {
      position: 'absolute',
      width: SIZE,
      height: SIZE,
      borderRadius: SIZE / 2,
      borderWidth: 2.5,
      borderColor: color.brand,
      backgroundColor: color.brandTint,
    },
    ringDone: { borderColor: color.good, backgroundColor: color.goodTint },
    core: {
      width: SIZE,
      height: SIZE,
      borderRadius: SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: color.brandFill,
    },
    coreDone: { backgroundColor: color.good },
    track: { height: 8, borderRadius: 4, backgroundColor: color.fill, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 4, backgroundColor: color.brand },
    fillDone: { backgroundColor: color.good },
    caption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] },
  }),
);
