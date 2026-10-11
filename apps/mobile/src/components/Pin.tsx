/**
 * A gym on the map: a disc in the colour of how well it fits, lit from above,
 * with a dumbbell glyph, ringed in white the way Maps' own pins are. The
 * selected gym is a teardrop pointing at the spot, with its shadow on the
 * ground under the tip, so it reads as "this one" at a glance. The browser
 * and Android maps draw the same pins in HTML (GymMap.web.tsx, mapPage.ts).
 */

import { useEffect, useId, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import type { ResultTier } from '@gymgo/domain';
import { alpha, mix } from '@/lib/looks';
import { color, dropShadow, face, themed } from '@/lib/theme';
import { Icon } from './Icon';
import { damp } from './motion';
import { TIER_COLOUR, Txt } from './ui';

/** A pin's spring: lands quickly with a little give, as Maps' pins do. */
const LAND = { damping: damp(0.7, 320, 0.7), stiffness: 320, mass: 0.7, reduceMotion: ReduceMotion.System };

/** The teardrop, its tip at the foot of a 40 × 50 box (the map point). */
const DROP = 'M20 2C10.06 2 2 10.06 2 20c0 9.4 11.2 22.6 16.3 28.3a2.3 2.3 0 0 0 3.4 0C26.8 42.6 38 29.4 38 20 38 10.06 29.94 2 20 2z';

/** Small and picked sizes, for the landing spring between them. */
const DISC = 28;
const DROP_WIDTH = 44;

/**
 * Where the teardrop's tip sits down its marker, as a share of its height:
 * GymMap.tsx anchors the selected marker there.
 */
export const PICKED_ANCHOR_Y = 54.3 / 58;

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

/** Light from above over a filled shape: brighter at the top, a touch deeper at the foot. */
function Lit({ id, rounded }: { id: string; rounded: number }) {
  return (
    <View style={[StyleSheet.absoluteFill, { borderRadius: rounded, overflow: 'hidden' }]}>
      <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 10 10">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.3} />
            <Stop offset="0.62" stopColor="#FFFFFF" stopOpacity={0} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0.08} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="10" height="10" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

export function Pin({ tier, selected }: { tier: ResultTier; selected: boolean }) {
  const fill = TIER_COLOUR[tier].fill;
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  // Picked, it grows from its small self; let go, it settles back down.
  const landing = useLanding(selected, () => (selected ? DISC / DROP_WIDTH : DROP_WIDTH / DISC), 0.4);

  if (selected) {
    return (
      <Animated.View style={[styles.dropWrap, styles.fromTip, landing, { pointerEvents: 'none' }]}>
        <View style={styles.ground} />
        {/* An SVG's own shape casts the shadow on iPhone, so it follows the teardrop. */}
        <View style={styles.dropShape}>
          <Svg width={DROP_WIDTH} height={55} viewBox="0 0 40 50">
            <Defs>
              <LinearGradient id={`d${id}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={mix(fill, '#FFFFFF', 0.3)} />
                <Stop offset="0.55" stopColor={fill} />
                <Stop offset="1" stopColor={mix(fill, '#000000', 0.1)} />
              </LinearGradient>
            </Defs>
            <Path d={DROP} fill={`url(#d${id})`} stroke={color.pinBorder} strokeWidth={2.2} />
            <Circle cx={20} cy={20} r={12.5} fill="rgba(255, 255, 255, 0.14)" />
          </Svg>
          <View style={styles.dropGlyph}>
            <Icon name="gym" size={21} color={color.onBrand} weight="bold" />
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.disc, { backgroundColor: fill }, landing, { pointerEvents: 'none' }]}>
      <Lit id={`p${id}`} rounded={DISC / 2} />
      <Icon name="gym" size={15} color={color.onBrand} weight="bold" />
    </Animated.View>
  );
}

/** Several gyms in one bubble, with how many: a faint halo in its colour says there's more than one. */
export function ClusterBubble({ tier, count }: { tier: ResultTier; count: number }) {
  const fill = TIER_COLOUR[tier].fill;
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const size = count < 10 ? 32 : count < 100 ? 38 : 44;
  const landing = useLanding(count, () => 0.85, 0.4);
  return (
    <Animated.View style={[styles.halo, { borderRadius: size / 2 + 4, backgroundColor: alpha(fill, 0.22) }, landing, { pointerEvents: 'none' }]}>
      <View style={[styles.bubble, { minWidth: size, height: size, borderRadius: size / 2, backgroundColor: fill }]}>
        <Lit id={`c${id}`} rounded={size / 2} />
        <Txt variant={count < 100 ? 'subhead' : 'footnote'} color={color.onBrand} style={[face('semibold'), styles.count]}>
          {count}
        </Txt>
      </View>
    </Animated.View>
  );
}

const styles = themed(() => StyleSheet.create({
  disc: {
    width: DISC,
    height: DISC,
    borderRadius: DISC / 2,
    borderWidth: 2,
    borderColor: color.pinBorder,
    alignItems: 'center',
    justifyContent: 'center',
    ...dropShadow(0.24, 5, 2, 4),
  },
  // Room under the teardrop for its ground shadow; the tip is at PICKED_ANCHOR_Y.
  dropWrap: { width: DROP_WIDTH, height: 58, alignItems: 'center' },
  // A picked pin grows from its tip, where it touches the map.
  fromTip: { transformOrigin: `50% ${PICKED_ANCHOR_Y * 100}%` },
  dropShape: { width: DROP_WIDTH, height: 55, ...dropShadow(0.28, 5, 3, 0) },
  dropGlyph: { position: 'absolute', left: 0, right: 0, top: 0, height: DROP_WIDTH, alignItems: 'center', justifyContent: 'center' },
  ground: { position: 'absolute', bottom: 1, width: 16, height: 5, borderRadius: 3, backgroundColor: 'rgba(0, 0, 0, 0.14)' },
  halo: { padding: 4 },
  bubble: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
    borderWidth: 2,
    borderColor: color.pinBorder,
    ...dropShadow(0.26, 6, 2, 5),
  },
  count: { fontVariant: ['tabular-nums'] },
}));
