/**
 * The mark at the head of an empty page: its icon on a tile of the accent,
 * lit from the corner and glowing, inside two faint rings of the accent, so
 * a page with nothing on it yet still has somewhere for the eye to land.
 * In the solid looks it's the plain tile and rings (no glow or sheen).
 */

import { StyleSheet, View } from 'react-native';
import { color, radius, themed } from '@/lib/theme';
import { alpha } from '@/lib/looks';
import { BrandFill, Sheen, accentGlow } from './BrandFill';
import { Icon, type IconName } from './Icon';

const RING = 12;

export function HeroMark({ icon, size = 64 }: { icon: IconName; size?: number }) {
  // The look's own corners, kept in proportion to the tile (none in 8-bit).
  const round = Math.min(size * 0.3, radius.xl * 1.25);
  return (
    <View
      style={[styles.outer, { padding: RING, borderRadius: round + RING * 2 }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
    >
      <View style={[styles.inner, { padding: RING / 2, borderRadius: round + RING }]}>
        <View style={[styles.tile, { width: size, height: size, borderRadius: round }, accentGlow(color.brandFill)]}>
          <BrandFill round={round} />
          <Sheen round={round} />
          <Icon name={icon} size={Math.round(size * 0.46)} color={color.onBrand} />
        </View>
      </View>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    outer: { alignSelf: 'center', borderCurve: 'continuous', backgroundColor: alpha(color.brand, 0.05) },
    inner: { borderCurve: 'continuous', backgroundColor: alpha(color.brand, 0.09) },
    tile: { alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous', backgroundColor: color.brandFill },
  }),
);
