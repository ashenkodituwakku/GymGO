/**
 * The mark at the head of an empty page: its icon on a tile of the accent,
 * lit from the corner and glowing, in a soft pool of the accent that fades
 * out smoothly, so a page with nothing on it yet still has somewhere for the
 * eye to land. In the solid looks it's the plain tile (no glow or sheen);
 * the square ones (8-bit, Classic) keep two flat steps of the accent round
 * it instead, as suits them.
 */

import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { color, currentTheme, radius, themed } from '@/lib/theme';
import { alpha } from '@/lib/looks';
import { BrandFill, Sheen, accentGlow } from './BrandFill';
import { Icon, type IconName } from './Icon';

const RING = 12;
/** How far the pool reaches past the tile on each side: what the two steps took, so nothing round it moves. */
const REACH = RING * 1.5;
/** Points along the way out, 0 at the tile's edge to 1 at the pool's. */
const FADE = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1];
/** How strong the pool is at each point: eased in and out (smoothstep), so it has no edge to see. */
const left = (along: number) => 1 - along * along * (3 - 2 * along);

export function HeroMark({ icon, size = 64, tint }: { icon: IconName; size?: number; /** Another colour than the accent (a finished workout's green). */ tint?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  // The look's own corners, kept in proportion to the tile (none in 8-bit).
  const round = Math.min(size * 0.3, radius.xl * 1.25);
  const hue = tint ?? color.brand;
  const tile = (
    <View style={[styles.tile, { width: size, height: size, borderRadius: round }, accentGlow(tint ?? color.brandFill), tint && { backgroundColor: tint }]}>
      {!tint && <BrandFill round={round} />}
      <Sheen round={round} />
      <Icon name={icon} size={Math.round(size * 0.46)} color={color.onBrand} />
    </View>
  );

  if (round === 0) {
    return (
      <View
        style={[styles.outer, { padding: RING }, tint && { backgroundColor: alpha(hue, 0.07) }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        aria-hidden
      >
        <View style={[styles.inner, { padding: RING / 2 }, tint && { backgroundColor: alpha(hue, 0.12) }]}>{tile}</View>
      </View>
    );
  }

  const box = size + REACH * 2;
  // The tile's edge, as a share of the pool's radius: full strength under it, fading from there.
  const edge = size / box;
  // Stronger in dark, where a faint one would be lost.
  const peak = currentTheme().scheme === 'dark' ? 0.3 : 0.2;
  return (
    <View
      style={[styles.pool, { width: box, height: box }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
    >
      <Svg width={box} height={box} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={`hm${id}`} cx="50%" cy="50%" r="50%">
            {[-1, ...FADE].map((along) =>
              along < 0 ? (
                <Stop key="centre" offset={0} stopColor={hue} stopOpacity={peak} />
              ) : (
                <Stop key={along} offset={edge + (1 - edge) * along} stopColor={hue} stopOpacity={peak * left(along)} />
              ),
            )}
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={box} height={box} fill={`url(#hm${id})`} />
      </Svg>
      {tile}
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    outer: { alignSelf: 'center', backgroundColor: alpha(color.brand, 0.05) },
    inner: { backgroundColor: alpha(color.brand, 0.09) },
    pool: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
    tile: { alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous', backgroundColor: color.brandFill },
  }),
);
