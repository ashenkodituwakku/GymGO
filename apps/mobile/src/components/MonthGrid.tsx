/**
 * A month as a grid of days, Monday first (lib/calendar.ts). Used by the
 * workout calendar, where the days you trained are filled in, and by the
 * day picker when changing a workout's day.
 *
 * A day you can pick is a button named in words ("Tuesday 24 November,
 * 2 workouts"); the rest are only drawn, so a screen reader moves from one
 * day that matters to the next.
 */

import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Pressable } from '@/components/motion';
import { useGlassRedraw } from '@/components/Redrawn';
import { Txt } from '@/components/ui';
import { WEEKDAY_INITIALS, dayWords, type CalendarDay, type CalendarMonth } from '@/lib/calendar';
import { haptic } from '@/lib/haptics';
import { color, face, themed } from '@/lib/theme';

export const MonthGrid = memo(function MonthGrid({
  month,
  selected = null,
  canPick,
  onPick,
  size = 40,
}: {
  month: CalendarMonth;
  /** The chosen day's key, ringed. */
  selected?: string | null;
  canPick: (day: CalendarDay) => boolean;
  onPick: (day: CalendarDay) => void;
  /** Each day's circle, in points. */
  size?: number;
}) {
  useGlassRedraw();
  return (
    <View style={styles.grid}>
      <View style={styles.row} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {WEEKDAY_INITIALS.map((initial, index) => (
          <View key={index} style={styles.cell}>
            <Txt variant="caption" color={color.labelTertiary} style={face('semibold')}>
              {initial}
            </Txt>
          </View>
        ))}
      </View>
      {month.weeks.map((week) => (
        <View key={week[0]!.key} style={styles.row}>
          {week.map((day) => (
            <Day key={day.key} day={day} size={size} chosen={selected === day.key} pickable={day.inMonth && canPick(day)} onPick={onPick} />
          ))}
        </View>
      ))}
    </View>
  );
});

function Day({ day, size, chosen, pickable, onPick }: { day: CalendarDay; size: number; chosen: boolean; pickable: boolean; onPick: (day: CalendarDay) => void }) {
  if (!day.inMonth) return <View style={styles.cell} />;
  const count = day.sessions.length;
  const trained = count > 0;
  const ink = trained ? color.onBrand : day.future ? color.labelTertiary : color.label;
  const circle = (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
        trained && { backgroundColor: color.brandFill },
        day.today && !trained && styles.today,
      ]}
    >
      <Txt variant="subhead" color={ink} style={[styles.number, (trained || day.today) && face('semibold')]}>
        {day.day}
      </Txt>
      {/* Two or more that day: a dot for each, up to three. */}
      {count > 1 && (
        <View style={styles.dots}>
          {Array.from({ length: Math.min(3, count) }, (_, index) => (
            <View key={index} style={styles.dot} />
          ))}
        </View>
      )}
    </View>
  );
  const ring = <View style={[styles.ring, { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2 }, chosen && styles.ringOn]}>{circle}</View>;
  if (!pickable) return <View style={styles.cell}>{ring}</View>;
  const words = `${dayWords(new Date(day.date))}${day.today ? ', today' : ''}${trained ? `, ${count} ${count === 1 ? 'workout' : 'workouts'}` : ''}`;
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onPick(day);
      }}
      accessibilityRole="button"
      accessibilityLabel={words}
      accessibilityState={{ selected: chosen }}
      style={({ pressed }) => [styles.cell, pressed && { opacity: 0.7 }]}
    >
      {ring}
    </Pressable>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    grid: { gap: 2 },
    row: { flexDirection: 'row' },
    cell: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 30 },
    ring: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
    ringOn: { borderColor: color.label },
    circle: { alignItems: 'center', justifyContent: 'center' },
    today: { borderWidth: 1.5, borderColor: color.brand },
    number: { fontVariant: ['tabular-nums'] },
    dots: { position: 'absolute', bottom: 5, flexDirection: 'row', gap: 2 },
    dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: color.onBrand },
  }),
);
