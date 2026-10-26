/**
 * The celebration over the workout summary when you set a record or meet
 * your weekly goal, in the style you picked (lib/celebrations.ts):
 * confetti, fireworks, gold stars or emoji. It plays once, in about two and
 * a half seconds, and never blocks a tap. With Reduce Motion on there's
 * none: the summary says it in words.
 *
 * Decoration only, drawn over the page: never a stand-in for a picture.
 */

import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { SHOWER_EMOJI, type CelebrationStyle } from '@/lib/celebrations';
import { Emoji } from './Emoji';
import { PRISM } from '@/lib/rarity';

const DURATION = 2600;

/** A little seeded randomness, so a style looks the same each time it plays. */
function seeded(index: number, salt: number): number {
  const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const STAR_GOLD = ['#F5B700', '#FFD34D', '#FFC21A'];

export function Celebration({ style }: { style: CelebrationStyle }) {
  const still = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const t = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    t.value = 0;
    t.value = withTiming(1, { duration: DURATION, easing: Easing.linear });
    return () => cancelAnimation(t);
  }, [still, t, style]);
  if (still) return null;
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {style === 'fireworks' ? (
        <Fireworks t={t} width={width} height={height} />
      ) : style === 'stars' || style === 'emoji' ? (
        <Shower t={t} width={width} height={height} emoji={style === 'emoji'} />
      ) : (
        <Confetti t={t} width={width} height={height} />
      )}
    </View>
  );
}

type Field = { t: SharedValue<number>; width: number; height: number };

// --- Confetti: up from the top middle, then down ---------------------------

function Confetti({ t, width, height }: Field) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 42 }, (_, index) => ({
        color: PRISM[index % PRISM.length]!,
        x0: width / 2 + (seeded(index, 1) - 0.5) * 80,
        vx: (seeded(index, 2) - 0.5) * width * 1.3,
        vy: -(height * 0.35 + seeded(index, 3) * height * 0.35),
        spin: (seeded(index, 4) - 0.5) * 1440,
        size: 6 + seeded(index, 5) * 6,
        round: seeded(index, 6) > 0.6,
      })),
    [width, height],
  );
  return (
    <>
      {pieces.map((piece, index) => (
        <Bit key={index} t={t} gravity={height * 1.6} {...piece} />
      ))}
    </>
  );
}

function Bit({ t, color, x0, vx, vy, spin, size, round, gravity }: { t: SharedValue<number>; color: string; x0: number; vx: number; vy: number; spin: number; size: number; round: boolean; gravity: number }) {
  const look = useAnimatedStyle(() => {
    const s = t.value * (DURATION / 1000);
    return {
      opacity: t.value < 0.85 ? 1 : (1 - t.value) / 0.15,
      transform: [{ translateX: x0 + vx * s * 0.6 }, { translateY: 80 + vy * s + 0.5 * gravity * s * s }, { rotate: `${spin * t.value}deg` }],
    };
  });
  return <Animated.View style={[styles.piece, { width: size, height: round ? size : size * 0.45, borderRadius: round ? size / 2 : 1.5, backgroundColor: color }, look]} />;
}

// --- Fireworks: three bursts, one after another ----------------------------

const BURSTS = [
  { x: 0.28, y: 0.26, at: 0 },
  { x: 0.72, y: 0.2, at: 0.16 },
  { x: 0.5, y: 0.38, at: 0.32 },
];
const SPARKS = 18;

function Fireworks({ t, width, height }: Field) {
  const sparks = useMemo(() => {
    const reach = Math.min(width, height) * 0.3;
    return BURSTS.flatMap((burst, b) =>
      Array.from({ length: SPARKS }, (_, index) => {
        const angle = (index / SPARKS) * Math.PI * 2 + seeded(index, b + 7) * 0.3;
        const distance = reach * (0.7 + seeded(index, b + 11) * 0.4);
        return {
          x: burst.x * width,
          y: burst.y * height,
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance,
          at: burst.at,
          color: PRISM[(b * 3 + index) % PRISM.length]!,
          size: 4 + seeded(index, b + 13) * 3,
        };
      }),
    );
  }, [width, height]);
  return (
    <>
      {sparks.map((spark, index) => (
        <Spark key={index} t={t} {...spark} />
      ))}
    </>
  );
}

function Spark({ t, x, y, dx, dy, at, color, size }: { t: SharedValue<number>; x: number; y: number; dx: number; dy: number; at: number; color: string; size: number }) {
  const look = useAnimatedStyle(() => {
    // Each burst's own time, 0 to 1 over a little over half the whole.
    const u = Math.min(1, Math.max(0, (t.value - at) / 0.6));
    const out = 1 - (1 - u) * (1 - u) * (1 - u);
    return {
      opacity: u === 0 ? 0 : u < 0.55 ? 1 : (1 - u) / 0.45,
      transform: [{ translateX: x + dx * out }, { translateY: y + dy * out + 60 * u * u }, { scale: 1 - u * 0.4 }],
    };
  });
  return <Animated.View style={[styles.piece, { width: size, height: size, borderRadius: size / 2, backgroundColor: color, boxShadow: `0px 0px 6px ${color}` }, look]} />;
}

// --- Stars and emoji: drifting down from above -----------------------------

function Shower({ t, width, height, emoji }: Field & { emoji: boolean }) {
  const drops = useMemo(
    () =>
      Array.from({ length: emoji ? 22 : 26 }, (_, index) => ({
        glyph: emoji ? SHOWER_EMOJI[index % SHOWER_EMOJI.length]! : '★',
        picture: emoji,
        color: STAR_GOLD[index % STAR_GOLD.length]!,
        x: seeded(index, 21) * (width - 30),
        y0: -40 - seeded(index, 22) * height * 0.35,
        fall: height * (0.95 + seeded(index, 23) * 0.35),
        sway: 12 + seeded(index, 24) * 18,
        wave: 1 + seeded(index, 25) * 2,
        spin: emoji ? (seeded(index, 26) - 0.5) * 120 : (seeded(index, 26) - 0.5) * 300,
        size: emoji ? 22 + seeded(index, 27) * 12 : 14 + seeded(index, 27) * 14,
      })),
    [width, height, emoji],
  );
  return (
    <>
      {drops.map((drop, index) => (
        <Drop key={index} t={t} {...drop} />
      ))}
    </>
  );
}

function Drop({ t, glyph, picture, color, x, y0, fall, sway, wave, spin, size }: { t: SharedValue<number>; glyph: string; picture: boolean; color: string; x: number; y0: number; fall: number; sway: number; wave: number; spin: number; size: number }) {
  const look = useAnimatedStyle(() => {
    const twinkle = 0.75 + 0.25 * Math.sin(t.value * Math.PI * 2 * wave * 2);
    return {
      opacity: (t.value < 0.85 ? 1 : (1 - t.value) / 0.15) * twinkle,
      transform: [{ translateX: x + Math.sin(t.value * Math.PI * 2 * wave) * sway }, { translateY: y0 + fall * t.value }, { rotate: `${spin * t.value}deg` }],
    };
  });
  return (
    <Animated.View style={[styles.piece, look]}>
      {/* An emoji as its Noto 3D picture; a star in gold, as text. */}
      {picture ? <Emoji char={glyph} size={size * 1.15} /> : <Text style={{ fontSize: size, lineHeight: size * 1.15, color }}>{glyph}</Text>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  piece: { position: 'absolute', left: 0, top: 0 },
});
