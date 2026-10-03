/**
 * A personal record's celebration: confetti over the workout summary, and
 * a card to share the record as a picture.
 *
 * The confetti bursts up from the top and drifts down once, in about two
 * seconds, and never blocks a tap. With Reduce Motion on there's none: the
 * summary says it in words, and the card still shows.
 */

import { forwardRef, useEffect, useId, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { PRISM } from '@/lib/rarity';
import { RECORD_WORD } from '@/lib/records';
import type { NewRecord } from '@/lib/training';
import { face, radius, space, themed } from '@/lib/theme';
import { Icon } from './Icon';
import { Txt } from './ui';

const PIECES = 42;
const DURATION = 2400;

/** A little seeded randomness, so the burst is the same each time it's drawn. */
function seeded(index: number, salt: number): number {
  const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function Confetti() {
  const still = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const t = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    t.value = withTiming(1, { duration: DURATION, easing: Easing.linear });
    return () => cancelAnimation(t);
  }, [still, t]);
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, index) => ({
        color: PRISM[index % PRISM.length]!,
        // Out from the middle of the top, up then down.
        x0: width / 2 + (seeded(index, 1) - 0.5) * 80,
        vx: (seeded(index, 2) - 0.5) * width * 1.3,
        vy: -(height * 0.35 + seeded(index, 3) * height * 0.35),
        spin: (seeded(index, 4) - 0.5) * 1440,
        size: 6 + seeded(index, 5) * 6,
        round: seeded(index, 6) > 0.6,
      })),
    [width, height],
  );
  if (still) return null;
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]} aria-hidden>
      {pieces.map((piece, index) => (
        <Piece key={index} t={t} gravity={height * 1.6} {...piece} />
      ))}
    </View>
  );
}

function Piece({ t, color, x0, vx, vy, spin, size, round, gravity }: { t: SharedValue<number>; color: string; x0: number; vx: number; vy: number; spin: number; size: number; round: boolean; gravity: number }) {
  const style = useAnimatedStyle(() => {
    const s = t.value * (DURATION / 1000);
    return {
      opacity: t.value < 0.85 ? 1 : (1 - t.value) / 0.15,
      transform: [{ translateX: x0 + vx * s * 0.6 }, { translateY: 80 + vy * s + 0.5 * gravity * s * s }, { rotate: `${spin * t.value}deg` }],
    };
  });
  return <Animated.View style={[styles.piece, { width: size, height: round ? size : size * 0.45, borderRadius: round ? size / 2 : 1.5, backgroundColor: color }, style]} />;
}

/** The record as a card to share: the exercise, the set and the day. */
export const RecordCard = forwardRef<View, { exercise: string; line: string; kind: NewRecord['kind']; date: string; more: number }>(function RecordCard(
  { exercise, line, kind, date, more },
  ref,
) {
  const id = useId().replace(/:/g, '');
  return (
    <View ref={ref} collapsable={false} style={styles.card} accessible accessibilityLabel={`New personal record: ${exercise}, ${line}. ${RECORD_WORD[kind]}`}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={`rec${id}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#2B1B5E" />
            <Stop offset="1" stopColor="#0E0A22" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#rec${id})`} />
      </Svg>
      <View style={styles.cardHead}>
        <View style={styles.medal}>
          <Icon name="trophy" size={18} color="#FFFFFF" />
        </View>
        <Txt variant="caption" color="#FFE7A3" style={[face('bold'), styles.eyebrow]}>
          NEW PERSONAL RECORD
        </Txt>
      </View>
      <Txt variant="title2" color="#FFFFFF" numberOfLines={2}>
        {exercise}
      </Txt>
      <Txt variant="largeTitle" color="#FFFFFF" style={face('bold')}>
        {line}
      </Txt>
      <Txt variant="footnote" color="rgba(255, 255, 255, 0.75)">
        {`${RECORD_WORD[kind]}${more > 0 ? ` · and ${more} more record${more === 1 ? '' : 's'}` : ''}`}
      </Txt>
      <View style={styles.cardFoot}>
        <Txt variant="caption" color="rgba(255, 255, 255, 0.6)">
          {new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
        </Txt>
        <Txt variant="caption" color="rgba(255, 255, 255, 0.6)" style={face('semibold')}>
          GymGO
        </Txt>
      </View>
    </View>
  );
});

const styles = themed(() =>
  StyleSheet.create({
    piece: { position: 'absolute', left: 0, top: 0 },
    card: { overflow: 'hidden', gap: space[2], padding: space[5], borderRadius: radius.xl, borderCurve: 'continuous', borderWidth: 2, borderColor: '#E2B33C' },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    medal: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E2B33C' },
    eyebrow: { letterSpacing: 1.2 },
    cardFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space[2] },
  }),
);
