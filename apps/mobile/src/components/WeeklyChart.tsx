/**
 * Your last twelve weeks as bars, as a training app's profile shows them:
 * how long you trained, how much you lifted or how many reps, a bar a week,
 * this week's in the accent and its total above. Tap a bar to read that
 * week. From your own log (lib/weekly.ts).
 */

import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Pressable } from './motion';
import { Card, Segmented, Txt } from './ui';
import { fromKg, type TrainingSession, type WeightUnit } from '@/lib/training';
import { weekTotalLabel, weeklyTotals, type WeeklyMetric } from '@/lib/weekly';
import { color, face, radius, space, themed } from '@/lib/theme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const HEIGHT = 120;

export function WeeklyChart({ sessions, unit }: { sessions: readonly TrainingSession[]; unit: WeightUnit }) {
  const [metric, setMetric] = useState<WeeklyMetric>('duration');
  const bars = useMemo(() => weeklyTotals(sessions, metric), [sessions, metric]);
  const [picked, setPicked] = useState<number | null>(null);
  const shownAt = picked ?? bars.length - 1;
  const value = (raw: number) => (metric === 'volume' ? fromKg(raw, unit) : raw);
  const top = Math.max(1, ...bars.map((bar) => value(bar.value)));
  const shown = bars[shownAt]!;
  const when = shownAt === bars.length - 1 ? 'This week' : shownAt === bars.length - 2 ? 'Last week' : `Week of ${shown.start.getDate()} ${MONTHS[shown.start.getMonth()]}`;

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <View style={styles.flex}>
          <Txt variant="footnote" color={color.labelSecondary}>
            {when}
          </Txt>
          <Txt variant="title2" style={face('bold')}>
            {weekTotalLabel(value(shown.value), metric, unit)}
          </Txt>
          <Txt variant="footnote" color={color.labelSecondary}>
            {`${shown.workouts} workout${shown.workouts === 1 ? '' : 's'}`}
          </Txt>
        </View>
      </View>
      <View style={styles.bars} accessible accessibilityLabel={`Your last 12 weeks, ${metric === 'duration' ? 'time trained' : metric === 'volume' ? `${unit} lifted` : 'reps'}. ${when}: ${weekTotalLabel(value(shown.value), metric, unit)}`}>
        {bars.map((bar, at) => {
          const height = bar.value > 0 ? Math.max(4, Math.round((value(bar.value) / top) * HEIGHT)) : 2;
          const on = at === shownAt;
          // A month's name under its first week.
          const label = at === 0 || bar.start.getMonth() !== bars[at - 1]!.start.getMonth() ? MONTHS[bar.start.getMonth()] : '';
          return (
            <Pressable key={bar.start.toISOString()} onPress={() => setPicked(at === bars.length - 1 ? null : at)} style={styles.column} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <View style={styles.track}>
                <View style={[styles.bar, { height }, bar.value > 0 ? (on ? styles.barOn : styles.barOff) : styles.barEmpty]} />
              </View>
              {/* The month's name may run on under the next weeks' bars, which have none of their own. */}
              <View style={styles.monthSlot}>
                {!!label && (
                  <Txt variant="caption" color={color.labelTertiary} style={styles.month}>
                    {label}
                  </Txt>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
      <Segmented
        options={[
          { value: 'duration', label: 'Time' },
          { value: 'volume', label: 'Volume' },
          { value: 'reps', label: 'Reps' },
        ]}
        value={metric}
        onChange={(next: WeeklyMetric) => setMetric(next)}
      />
    </Card>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    card: { gap: space[4] },
    head: { flexDirection: 'row', alignItems: 'flex-end' },
    flex: { flex: 1, minWidth: 0 },
    bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: HEIGHT + 22 },
    column: { flex: 1, alignItems: 'center', gap: 6 },
    track: { height: HEIGHT, width: '100%', justifyContent: 'flex-end' },
    bar: { width: '100%', borderRadius: radius.sm, borderCurve: 'continuous' },
    barOn: { backgroundColor: color.brand },
    barOff: { backgroundColor: color.brandTint },
    barEmpty: { backgroundColor: color.fill },
    monthSlot: { height: 16, alignSelf: 'stretch' },
    month: { position: 'absolute', left: 0, width: 48 },
  }),
);
