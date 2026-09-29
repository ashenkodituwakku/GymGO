/**
 * A gym on the map: a disc in the colour of how well it fits, with a dumbbell
 * glyph, ringed in white the way Maps' own pins are. The selected pin grows
 * and grows a pointer, so it reads as "this one" at a glance.
 */

import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { ResultTier } from '@gymgo/domain';
import { color, dropShadow, face, themed } from '@/lib/theme';
import { Icon } from './Icon';
import { TIER_COLOUR, Txt } from './ui';

/** A pin's spring: lands quickly with a little give, as Maps' pins do. */
const LAND = { damping: 13, stiffness: 300, mass: 0.7, reduceMotion: ReduceMotion.System };

/** Scale that lands from `from` to full size whenever `key` changes (and on first draw from `first`). */
function useLanding(key: unknown, from: () => number, first: number) {
  const scale = useSharedValue(first);
  const drawn = useRef(false);
  useEffect(() => {
    if (drawn.current) scale.value = from();
    drawn.current = true;
    scale.value = withSpring(1, LAND);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
}

export function Pin({ tier, selected }: { tier: ResultTier; selected: boolean }) {
  const fill = TIER_COLOUR[tier].fill;
  const size = selected ? 44 : 30;
  // Picked, it grows from its small self; let go, it settles back down.
  const landing = useLanding(selected, () => (selected ? 30 / 44 : 44 / 30), 0.4);

  return (
    <Animated.View style={[styles.wrap, styles.fromBottom, landing]} pointerEvents="none">
      <View
        style={[
          styles.disc,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: fill,
            borderWidth: selected ? 3 : 2,
          },
        ]}
      >
        <Icon name="gym" size={selected ? 20 : 14} color={color.onBrand} weight="bold" />
      </View>
      {selected && <View style={[styles.pointer, { borderTopColor: fill }]} />}
    </Animated.View>
  );
}

/** Several gyms in one bubble, with how many: in the colour of the best fit among them. */
export function ClusterBubble({ tier, count }: { tier: ResultTier; count: number }) {
  const size = count < 10 ? 34 : count < 100 ? 40 : 46;
  const landing = useLanding(count, () => 0.85, 0.4);
  return (
    <Animated.View
      style={[styles.bubble, { minWidth: size, height: size, borderRadius: size / 2, backgroundColor: TIER_COLOUR[tier].fill }, landing]}
      pointerEvents="none"
    >
      <Txt variant={count < 100 ? 'subhead' : 'footnote'} color={color.onBrand} style={face('semibold')}>
        {count}
      </Txt>
    </Animated.View>
  );
}

const styles = themed(() => StyleSheet.create({
  bubble: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2.5,
    borderColor: color.pinBorder,
    ...dropShadow(0.26, 6, 2, 5),
  },
  wrap: { alignItems: 'center' },
  // A pin grows from its point, where it touches the map.
  fromBottom: { transformOrigin: 'bottom' },
  disc: {
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: color.pinBorder,
    ...dropShadow(0.22, 4, 2, 4),
  },
  pointer: {
    width: 0,
    height: 0,
    marginTop: -2,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
}));
