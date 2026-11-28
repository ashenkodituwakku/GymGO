/**
 * "MAX" by the name of someone on GymGO Max, where friends see it: the feed,
 * comments, friends and challenges. Small capitals on the accent's tint; a
 * screen reader hears "GymGO Max" after the name (the word GymGO is there
 * for it, unseen). Where a row is read as one label, that label says so
 * instead (`MAX_SPOKEN`).
 */

import { StyleSheet, View } from 'react-native';
import { color, radius, themed } from '@/lib/theme';
import { Txt } from './ui';

/** For a row read as one label: added after the name. */
export const MAX_SPOKEN = ', GymGO Max';

export function MaxBadge() {
  return (
    <View style={styles.badge}>
      <Txt variant="caption" style={styles.unseen}>
        GymGO{' '}
      </Txt>
      <Txt variant="caption" color={color.brandOnTint} style={styles.word}>
        MAX
      </Txt>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    badge: {
      flexDirection: 'row',
      alignSelf: 'center',
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: radius.pill,
      backgroundColor: color.brandTint,
    },
    word: { fontWeight: '700', letterSpacing: 0.6 },
    // Read, not seen: "GymGO" before "MAX" for a screen reader.
    unseen: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 } as object,
  }),
);
