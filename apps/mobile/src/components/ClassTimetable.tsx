/**
 * A gym's weekly classes, on its page: only ever from its verified owner
 * (domain owner.ts), said so, with the day a moderator approved it. Today
 * first. Whether a class needs booking, a membership or a fee isn't part of
 * it, so the page says to ask.
 */

import { StyleSheet, View } from 'react-native';
import type { ClassTimetable as Timetable } from '@gymgo/domain';
import { dateLabel, timeLabel } from '@/lib/copy';
import { DAY_NAMES } from '@/lib/ownerForm';
import { color, face, space, themed } from '@/lib/theme';
import { Txt } from './ui';

/** The days that have classes, starting from `today` (0 = Sunday). */
export function classDays(timetable: Timetable, today: number): Array<{ day: number; classes: Timetable['classes'] }> {
  return Array.from({ length: 7 }, (_, offset) => (today + offset) % 7)
    .map((day) => ({ day, classes: timetable.classes.filter((item) => item.day === day).sort((a, b) => a.startMinute - b.startMinute) }))
    .filter((entry) => entry.classes.length > 0);
}

export function ClassTimetable({ timetable, today }: { timetable: Timetable; today: number }) {
  const source = timetable.provenance.sources[0];
  return (
    <View style={styles.wrap}>
      {classDays(timetable, today).map((entry) => (
        <View key={entry.day} style={styles.day}>
          <Txt variant="subhead" style={face('semibold')}>
            {entry.day === today ? `Today (${DAY_NAMES[entry.day]})` : DAY_NAMES[entry.day]}
          </Txt>
          {entry.classes.map((item, index) => (
            <View key={`${item.name}-${index}`} style={styles.row} accessible accessibilityLabel={`${item.name}, ${timeLabel(item.startMinute)} to ${timeLabel(item.endMinute)}`}>
              <Txt variant="footnote" color={color.labelSecondary} style={styles.time}>
                {`${timeLabel(item.startMinute)}–${timeLabel(item.endMinute)}`}
              </Txt>
              <Txt variant="subhead" style={styles.flex}>
                {item.name}
              </Txt>
            </View>
          ))}
        </View>
      ))}
      <Txt variant="caption" color={color.labelSecondary}>
        {`${source?.label ?? 'From the gym (verified owner)'}${source?.checkedAt ? `, approved ${dateLabel(source.checkedAt, { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}. Whether a class needs booking, a membership or a fee isn’t listed: ask the gym.`}
      </Txt>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    wrap: { gap: space[3] },
    day: { gap: space[1] },
    row: { flexDirection: 'row', alignItems: 'baseline', gap: space[3] },
    time: { width: 120, fontVariant: ['tabular-nums'] },
    flex: { flex: 1, minWidth: 0 },
  }),
);
