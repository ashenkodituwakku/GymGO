/**
 * The welcome tour's moving parts (app/welcome.tsx): a part that holds
 * still while scrolling plays it, the easing its pieces move by, and the
 * colour that washes the page in each chapter's own light.
 *
 * Holding still: in a browser the part's stage is CSS `position: sticky`,
 * so the browser keeps it in place while it scrolls; on a phone it's moved
 * down with the scroll on the UI thread, so it never trails a frame. With
 * Reduce Motion nothing holds: each part is its own height, shown finished.
 */

import { type ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useDerivedValue, useSharedValue, type SharedValue } from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { currentTheme } from '@/lib/theme';

/** A browser keeps a stage still itself; a phone moves it with the scroll. */
export const STICKY = Platform.OS === 'web';

/** 0 to 1 between `from` and `to`, eased out (quick, then settling). */
export function eased(value: number, from: number, to: number): number {
  'worklet';
  const t = interpolate(value, [from, to], [0, 1], Extrapolation.CLAMP);
  return 1 - (1 - t) * (1 - t) * (1 - t);
}

/** 0 to 1, eased in and out (slow at both ends), for what travels. */
export function smooth(value: number, from: number, to: number): number {
  'worklet';
  const t = interpolate(value, [from, to], [0, 1], Extrapolation.CLAMP);
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** Fades and rises into place between `from` and `to`. */
export function rise(value: number, from: number, to: number, distance = 22) {
  'worklet';
  const t = eased(value, from, to);
  return { opacity: t, transform: [{ translateY: (1 - t) * distance }] };
}

export interface Play {
  /** How far scrolling has played the part, 0 to 1, while it holds still. */
  progress: SharedValue<number>;
  /** 0 to 1 as the part rises into view, before it holds: for its words. */
  enter: SharedValue<number>;
}

/**
 * A part `length` screens tall whose stage (one screen) holds still while
 * the rest scrolls past, playing it. `onPlace` hears where it is, for Next
 * and the chapter strip.
 */
export function Pinned({
  screen,
  scrollY,
  calm,
  length,
  overlap = 0,
  onPlace,
  stageStyle,
  children,
}: {
  screen: number;
  scrollY: SharedValue<number>;
  calm: boolean;
  length: number;
  /** Screens of the part before to slide up over (a crossfade rather than a gap between them). */
  overlap?: number;
  onPlace?: (top: number, height: number) => void;
  stageStyle?: StyleProp<ViewStyle>;
  children: (play: Play) => ReactNode;
}) {
  const top = useSharedValue(0);
  const span = Math.max(1, screen * (length - 1));
  const progress = useDerivedValue(() => (calm ? 1 : Math.min(1, Math.max(0, (scrollY.value - top.value) / span))));
  const enter = useDerivedValue(() => (calm ? 1 : Math.min(1, Math.max(0, (scrollY.value - (top.value - screen * 0.6)) / (screen * 0.55)))));
  // Held still while it plays (on a phone, moved down with the scroll); then, as it goes, it settles back and fades, so the next part comes on clean.
  const hold = useAnimatedStyle(() => {
    if (calm) return {};
    const leave = Math.min(1, Math.max(0, (scrollY.value - (top.value + span)) / (screen * 0.6)));
    const settle = { opacity: 1 - leave * 0.9, transform: [{ scale: 1 - leave * 0.06 }] };
    if (STICKY) return settle;
    return { opacity: settle.opacity, transform: [{ translateY: Math.min(span, Math.max(0, scrollY.value - top.value)) }, { scale: 1 - leave * 0.06 }] };
  });
  return (
    <View
      onLayout={(event) => {
        top.value = event.nativeEvent.layout.y;
        onPlace?.(event.nativeEvent.layout.y, event.nativeEvent.layout.height);
      }}
      style={{ height: calm ? undefined : screen * length, marginTop: calm ? 0 : -screen * overlap }}
    >
      <Animated.View style={[styles.stage, !calm && { height: screen }, !calm && STICKY && styles.sticky, calm && styles.calm, hold, stageStyle]}>{children({ progress, enter })}</Animated.View>
    </View>
  );
}

/** Each chapter's light: two pools of its colours. */
export const CHAPTER_LIGHT: Array<[string, string]> = [
  ['#2FBF71', '#3FD0B6'],
  ['#6B5CFF', '#4DA3FF'],
  ['#F0B323', '#FF7AB6'],
];

/**
 * The page washed in the chapter you're in: Find's greens, Train's violet
 * and blue, Collect's gold and rose, each fading in as its chapter comes up
 * and out as it goes. `ranges` are each chapter's [top, bottom] in the
 * scroll. Behind everything; still with Reduce Motion (no wash at all).
 */
export function ChapterLight({ scrollY, ranges, screen, width, height }: { scrollY: SharedValue<number>; ranges: SharedValue<number[][]>; screen: number; width: number; height: number }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {CHAPTER_LIGHT.map((colors, index) => (
        <Wash key={index} index={index} colors={colors} scrollY={scrollY} ranges={ranges} screen={screen} width={width} height={height} />
      ))}
    </View>
  );
}

function Wash({ index, colors, scrollY, ranges, screen, width, height }: { index: number; colors: [string, string]; scrollY: SharedValue<number>; ranges: SharedValue<number[][]>; screen: number; width: number; height: number }) {
  const strength = currentTheme().scheme === 'dark' ? 0.34 : 0.3;
  const style = useAnimatedStyle(() => {
    const range = ranges.value[index];
    const from = range?.[0] ?? 0;
    const to = range?.[1] ?? 0;
    if (to <= from) return { opacity: 0 };
    return { opacity: interpolate(scrollY.value, [from - screen * 0.7, from - screen * 0.1, to - screen * 0.6, to], [0, 1, 1, 0], Extrapolation.CLAMP) };
  });
  const size = Math.max(width, height) * 1.1;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      {colors.map((tint, at) => (
        <View key={tint} style={{ position: 'absolute', width: size, height: size, left: at === 0 ? width - size * 0.6 : -size * 0.4, top: at === 0 ? -size * 0.35 : height - size * 0.55 }}>
          <Svg width="100%" height="100%">
            <Defs>
              <RadialGradient id={`wash${index}${at}`} cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={tint} stopOpacity={strength} />
                <Stop offset="0.6" stopColor={tint} stopOpacity={strength * 0.35} />
                <Stop offset="1" stopColor={tint} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#wash${index}${at})`} />
          </Svg>
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: { overflow: 'visible' },
  sticky: { position: 'sticky', top: 0 } as object,
  calm: { paddingVertical: 48 },
});
