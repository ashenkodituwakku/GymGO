/**
 * Where an advertisement will go, once there's an ad partner. For now it only
 * marks the space, so the layout can be judged with it in place.
 *
 * Pro members pay, so they never see one. Nothing here loads or tracks
 * anything: it's a box with words in it.
 */

import { StyleSheet, View } from 'react-native';
import { useApp } from '@/lib/app-state';
import { color, face, radius, space, themed } from '@/lib/theme';
import { Txt } from './ui';

export function AdSlot({ style }: { style?: object }) {
  const { billing } = useApp();
  if (billing.isPro) return null;
  return (
    <View style={[styles.slot, style]} accessibilityRole="none" accessibilityLabel="Ad placeholder">
      <Txt variant="caption" color={color.labelTertiary} style={styles.text}>
        AD PLACEHOLDER
      </Txt>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    slot: {
      height: 64,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: color.separator,
      backgroundColor: color.fill,
    },
    text: { ...face('semibold'), letterSpacing: 1 },
  }),
);
