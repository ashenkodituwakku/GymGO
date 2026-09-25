/**
 * A gym on the map: a disc in the colour of how well it fits, with a dumbbell
 * glyph, ringed in white the way Maps' own pins are. The selected pin grows
 * and grows a pointer, so it reads as "this one" at a glance.
 */

import { StyleSheet, View } from 'react-native';
import type { ResultTier } from '@gymgo/domain';
import { color, themed } from '@/lib/theme';
import { Icon } from './Icon';
import { TIER_COLOUR } from './ui';

export function Pin({ tier, selected }: { tier: ResultTier; selected: boolean }) {
  const fill = TIER_COLOUR[tier].fill;
  const size = selected ? 44 : 30;

  return (
    <View style={styles.wrap} pointerEvents="none">
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
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  wrap: { alignItems: 'center' },
  disc: {
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: color.pinBorder,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
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
