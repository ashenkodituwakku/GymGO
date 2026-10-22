/**
 * A personal record's celebration: confetti over the workout summary (or,
 * with Pro, the style you picked: Celebration.tsx), and a card to share the
 * record as a picture.
 */

import { forwardRef, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { RECORD_WORD } from '@/lib/records';
import type { NewRecord } from '@/lib/training';
import { face, radius, space, themed } from '@/lib/theme';
import { Celebration } from './Celebration';
import { Icon } from './Icon';
import { Txt } from './ui';

/** Confetti, as before: the free celebration (see Celebration.tsx for the others). */
export function Confetti() {
  return <Celebration style="confetti" />;
}

/** The record as a card to share: the exercise, the set and the day. */
export const RecordCard = forwardRef<View, { exercise: string; line: string; kind: NewRecord['kind']; date: string; more: number }>(function RecordCard(
  { exercise, line, kind, date, more },
  ref,
) {
  const id = useId().replace(/:/g, '');
  return (
    <View ref={ref} collapsable={false} style={styles.card} accessible accessibilityLabel={`New personal record: ${exercise}, ${line}. ${RECORD_WORD[kind]}`}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={`rec${id}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#2B1B5E" />
            <Stop offset="1" stopColor="#0E0A22" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#rec${id})`} />
      </Svg>
      <View style={styles.cardHead}>
        <View style={styles.medal}>
          <Icon name="trophy" size={18} color="#FFFFFF" />
        </View>
        <Txt variant="caption" color="#FFE7A3" style={[face('bold'), styles.eyebrow]}>
          NEW PERSONAL RECORD
        </Txt>
      </View>
      <Txt variant="title2" color="#FFFFFF" numberOfLines={2}>
        {exercise}
      </Txt>
      <Txt variant="largeTitle" color="#FFFFFF" style={face('bold')}>
        {line}
      </Txt>
      <Txt variant="footnote" color="rgba(255, 255, 255, 0.75)">
        {`${RECORD_WORD[kind]}${more > 0 ? ` · and ${more} more record${more === 1 ? '' : 's'}` : ''}`}
      </Txt>
      <View style={styles.cardFoot}>
        <Txt variant="caption" color="rgba(255, 255, 255, 0.6)">
          {new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
        </Txt>
        <Txt variant="caption" color="rgba(255, 255, 255, 0.6)" style={face('semibold')}>
          GymGO
        </Txt>
      </View>
    </View>
  );
});

const styles = themed(() =>
  StyleSheet.create({
    card: { overflow: 'hidden', gap: space[2], padding: space[5], borderRadius: radius.xl, borderCurve: 'continuous', borderWidth: 2, borderColor: '#E2B33C' },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    medal: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E2B33C' },
    eyebrow: { letterSpacing: 1.2 },
    cardFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space[2] },
  }),
);
