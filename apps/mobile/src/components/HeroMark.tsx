/**
 * The mark at the head of an empty page: its symbol, large and quiet, in a
 * muted grey, as iOS draws a page with nothing on it yet (no tile, no glow),
 * so the eye lands on the words under it. `tint` colours it for a page that
 * means something by its colour (a finished workout's green, the accent on
 * the welcome pages).
 */

import { StyleSheet, View } from 'react-native';
import { color } from '@/lib/theme';
import { Icon, type IconName } from './Icon';

export function HeroMark({ icon, size = 64, tint }: { icon: IconName; size?: number; /** Another colour than the muted grey. */ tint?: string }) {
  return (
    <View style={[styles.mark, { height: size }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
      <Icon name={icon} size={Math.round(size * 0.78)} color={tint ?? color.labelTertiary} weight="regular" />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
});
