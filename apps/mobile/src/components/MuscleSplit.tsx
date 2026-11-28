/**
 * Which muscles a workout worked, as bars: each muscle's share of the sets
 * (lib/feed.ts muscleSplit). On a workout's page and its finish summary.
 */

import { StyleSheet, View } from 'react-native';
import type { muscleSplit } from '@/lib/feed';
import { color, space, themed } from '@/lib/theme';
import { Txt } from './ui';

export function MuscleBars({ split, limit = 6 }: { split: ReturnType<typeof muscleSplit>; limit?: number }) {
  return (
    <>
      {split.slice(0, limit).map((part) => {
        const percent = Math.round(part.share * 100);
        return (
          <View key={part.muscle} style={styles.row} accessible accessibilityLabel={`${part.label}: ${percent}% of the sets`}>
            <Txt variant="subhead" style={styles.label} numberOfLines={1}>
              {part.label}
            </Txt>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.max(4, percent)}%` }]} />
            </View>
            <Txt variant="footnote" color={color.labelSecondary} style={styles.share}>
              {`${percent}%`}
            </Txt>
          </View>
        );
      })}
    </>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
    label: { width: 92 },
    track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: color.fill, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 4, backgroundColor: color.brand },
    share: { width: 40, textAlign: 'right', fontVariant: ['tabular-nums'] },
  }),
);
