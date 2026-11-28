/**
 * A workout as a picture to share: its name, the day and the gym, the time,
 * volume and sets, the exercises with their best set, and any records. The
 * record card's colours (Celebrate.tsx), so the two read as a set; the same
 * in light and dark, since it leaves the app as a picture.
 */

import { forwardRef, useId } from 'react';
import { StyleSheet, View, type ViewInstance } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { bestSetLine, feedExerciseName, timeLine, volumeLine } from '@/lib/feed';
import { volumeKg, workingSets, type NewRecord, type TrainingSession } from '@/lib/training';
import { face, radius, space, themed } from '@/lib/theme';
import { Icon } from './Icon';
import { Txt } from './ui';

/** Exercises on the picture; the rest are counted. */
const SHOWN = 6;
const SOFT = 'rgba(255, 255, 255, 0.72)';
const FAINT = 'rgba(255, 255, 255, 0.5)';

export const WorkoutShareCard = forwardRef<ViewInstance, { session: TrainingSession; records: NewRecord[] }>(function WorkoutShareCard({ session, records }, ref) {
  const id = useId().replace(/:/g, '');
  const done = session.exercises.filter((logged) => workingSets(logged.sets).length > 0);
  const day = new Date(session.finishedAt).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const volume = volumeKg(session);
  const sets = done.reduce((sum, logged) => sum + workingSets(logged.sets).length, 0);
  return (
    <View ref={ref} collapsable={false} style={styles.card} accessible accessibilityLabel={`${session.name}, ${day}. ${timeLine(session)}, ${sets} sets.`}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={`wk${id}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#3A2A8C" />
            <Stop offset="1" stopColor="#0E0A22" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#wk${id})`} />
      </Svg>

      <Txt variant="caption" color={FAINT} style={[face('bold'), styles.eyebrow]}>
        {day.toUpperCase()}
      </Txt>
      <Txt variant="largeTitle" color="#FFFFFF" style={face('bold')} numberOfLines={2}>
        {session.name}
      </Txt>
      {session.gymName && (
        <View style={styles.gym}>
          <Icon name="pin" size={13} color={SOFT} />
          <Txt variant="subhead" color={SOFT}>
            {session.gymName}
          </Txt>
        </View>
      )}

      <View style={styles.stats}>
        <Stat label="Time" value={timeLine(session)} />
        {volume > 0 && <Stat label="Volume" value={volumeLine(volume, session.unit)} />}
        <Stat label="Sets" value={String(sets)} />
        {records.length > 0 && <Stat label={records.length === 1 ? 'Record' : 'Records'} value={String(records.length)} gold />}
      </View>

      <View style={styles.list}>
        {done.slice(0, SHOWN).map((logged, index) => (
          <View key={`${logged.exerciseId}-${index}`} style={styles.row}>
            <Txt variant="subhead" color="#FFFFFF" numberOfLines={2} style={styles.flex}>
              {`${workingSets(logged.sets).length} × ${feedExerciseName(logged)}`}
            </Txt>
            {records.some((record) => record.exerciseId === logged.exerciseId) && <Icon name="trophy" size={13} color="#FFD46B" />}
            <Txt variant="subhead" color={SOFT} style={styles.best}>
              {bestSetLine(logged.sets, session.unit)}
            </Txt>
          </View>
        ))}
        {done.length > SHOWN && (
          <Txt variant="footnote" color={FAINT}>
            {`and ${done.length - SHOWN} more`}
          </Txt>
        )}
      </View>

      <View style={styles.foot}>
        <Txt variant="caption" color={FAINT} style={face('semibold')}>
          Logged with GymGO
        </Txt>
      </View>
    </View>
  );
});

function Stat({ label, value, gold = false }: { label: string; value: string; gold?: boolean }) {
  return (
    <View style={styles.stat}>
      <Txt variant="caption" color={FAINT}>
        {label}
      </Txt>
      {/* No line limit: a picture's text can come out a touch wider than on screen, and a limit would cut it short. */}
      <Txt variant="title2" color={gold ? '#FFD46B' : '#FFFFFF'} style={face('bold')}>
        {value}
      </Txt>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    card: { overflow: 'hidden', gap: space[2], padding: space[6], borderRadius: radius.xl, borderCurve: 'continuous', width: '100%', maxWidth: 380, alignSelf: 'center' },
    eyebrow: { letterSpacing: 1.2 },
    gym: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    stats: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space[5], rowGap: space[2], marginTop: space[3] },
    stat: { gap: 2 },
    list: { gap: space[2], marginTop: space[4], paddingTop: space[4], borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255, 255, 255, 0.2)' },
    row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    flex: { flex: 1, minWidth: 0 },
    best: { flexShrink: 0, textAlign: 'right' },
    foot: { marginTop: space[4], alignItems: 'flex-end' },
  }),
);
