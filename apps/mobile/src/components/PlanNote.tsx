/**
 * Your notes on a saved workout (seat heights, cues, how to progress), on
 * its page and at the top of the workout while you train it.
 */

import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';
import { Icon } from './Icon';
import { Txt } from './ui';

export function PlanNote({ note, style }: { note: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.card, style]} accessible accessibilityLabel={`Your notes: ${note}`}>
      <View style={styles.head}>
        <Icon name="note" size={14} color={color.brand} />
        <Txt variant="footnote" color={color.brand} style={face('semibold')}>
          Your notes
        </Txt>
      </View>
      <Txt variant="subhead">{note}</Txt>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    card: { gap: space[1], paddingHorizontal: space[4], paddingVertical: space[3], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.plate, ...shadow.plate },
    head: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  }),
);
