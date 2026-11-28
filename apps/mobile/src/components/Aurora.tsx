/**
 * A soft background of light: four wide pools of colour (GymGO's violet, a
 * sky blue, a rose and a mint) that drift slowly behind a page, for the
 * welcome tour and the sign-in page. Each pool is a radial gradient fading
 * to nothing at its edge, so there's no blur to pay for. Pale in light mode,
 * deep and quiet in dark. With `scroll`, the pools also slide a little as
 * the page scrolls, behind it, for depth. With Reduce Motion they stay put.
 * Decoration only: hidden from screen readers and from touches.
 */

import { useEffect, useId } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { EASE_IN_OUT, useCalm } from './motion';
import { color, currentTheme } from '@/lib/theme';

/** Where each pool sits (as shares of the screen), how big (of its longer side), and how it drifts. */
const POOLS: Array<{ x: number; y: number; size: number; hue: 'brand' | 'sky' | 'rose' | 'mint'; drift: [number, number]; seconds: number; depth: number }> = [
  { x: 0.1, y: 0.05, size: 0.95, hue: 'brand', drift: [40, 30], seconds: 18, depth: 0.35 },
  { x: 0.9, y: 0.2, size: 0.8, hue: 'sky', drift: [-36, 44], seconds: 22, depth: 0.2 },
  { x: 0.15, y: 0.75, size: 0.85, hue: 'rose', drift: [44, -28], seconds: 20, depth: 0.5 },
  { x: 0.85, y: 0.9, size: 0.75, hue: 'mint', drift: [-30, -36], seconds: 24, depth: 0.28 },
];

const HUES = { sky: '#4DA3FF', rose: '#FF7AB6', mint: '#3FD0B6' } as const;

export function Aurora({ scroll, span = 1 }: { /** The page's scroll, for the pools to slide with. */ scroll?: SharedValue<number>; /** How far the page scrolls, for `scroll`. */ span?: number }) {
  const { width, height } = useWindowDimensions();
  const dark = currentTheme().scheme === 'dark';
  const longest = Math.max(width, height);
  return (
    <View style={[StyleSheet.absoluteFill, styles.clip]} pointerEvents="none" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {POOLS.map((pool, index) => (
        <Pool
          key={pool.hue}
          index={index}
          left={pool.x * width - (pool.size * longest) / 2}
          top={pool.y * height - (pool.size * longest) / 2}
          size={pool.size * longest}
          tint={pool.hue === 'brand' ? color.brand : HUES[pool.hue]}
          strength={dark ? 0.3 : 0.32}
          drift={pool.drift}
          seconds={pool.seconds}
          depth={pool.depth}
          scroll={scroll}
          span={span}
          height={height}
        />
      ))}
    </View>
  );
}

function Pool({
  index,
  left,
  top,
  size,
  tint,
  strength,
  drift,
  seconds,
  depth,
  scroll,
  span,
  height,
}: {
  index: number;
  left: number;
  top: number;
  size: number;
  tint: string;
  strength: number;
  drift: [number, number];
  seconds: number;
  depth: number;
  scroll?: SharedValue<number>;
  span: number;
  height: number;
}) {
  const calm = useCalm();
  const id = `pool${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const wander = useSharedValue(0);
  useEffect(() => {
    if (calm) return;
    wander.value = withDelay(index * 900, withRepeat(withTiming(1, { duration: seconds * 1000, easing: EASE_IN_OUT }), -1, true));
  }, [calm, index, seconds, wander]);
  const style = useAnimatedStyle(() => {
    // Behind the page as it scrolls: each pool slides up by a part of a screen, the nearer ones more.
    const slide = scroll ? interpolate(scroll.value, [0, Math.max(1, span)], [0, -height * depth], Extrapolation.CLAMP) : 0;
    return {
      transform: [{ translateX: wander.value * drift[0] }, { translateY: wander.value * drift[1] + slide }, { scale: 1 + wander.value * 0.08 }],
    };
  });
  return (
    <Animated.View style={[styles.pool, { left, top, width: size, height: size }, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={tint} stopOpacity={strength} />
            <Stop offset="0.55" stopColor={tint} stopOpacity={strength * 0.45} />
            <Stop offset="1" stopColor={tint} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  pool: { position: 'absolute' },
});
