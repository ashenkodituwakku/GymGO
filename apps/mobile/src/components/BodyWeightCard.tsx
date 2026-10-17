/**
 * Body weight on Progress: the latest weigh-in, how it's moved over about a
 * month, the last ninety days drawn, and a box to log today's (lib/
 * bodyWeight.ts). Kept on this phone only, which the card says.
 */

import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { localToday, recentWeighIns, useBodyWeight, weightChange, type WeighIn } from '@/lib/bodyWeight';
import { haptic } from '@/lib/haptics';
import { color, face, radius, shadow, space, themed, webFocusRing } from '@/lib/theme';
import { formatWeight, fromKg, parseWeight, toKg, type WeightUnit } from '@/lib/training';
import { Icon } from './Icon';
import { ProgressChart } from './ProgressChart';
import { Txt } from './ui';

/** "10 Sep", for a weigh-in's date (a calendar date, so read at midday UTC: no time zone moves it a day). */
const dayLabel = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });

const shown = (kg: number, unit: WeightUnit) => formatWeight(Math.round(fromKg(kg, unit) * 10) / 10, unit);

export function BodyWeightCard({ unit }: { unit: WeightUnit }) {
  const { list, add, remove } = useBodyWeight();
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const today = localToday();
  if (list === null) return null;

  const latest: WeighIn | undefined = list[list.length - 1];
  const todays = list.find((entry) => entry.date === today) ?? null;
  const change = weightChange(list);
  const recent = recentWeighIns(list, today);

  const save = () => {
    const value = parseWeight(text);
    const kg = typeof value === 'number' ? toKg(value, unit) : null;
    if (kg === null || kg < 20 || kg > 400) {
      haptic.warn();
      setProblem(`Type your weight in ${unit}, like ${unit === 'kg' ? '72.5' : '160'}.`);
      return;
    }
    haptic.success();
    add(today, kg);
    setText('');
    setProblem(null);
  };

  const changeWords = change
    ? change.kg === 0
      ? `No change since ${dayLabel(change.since)}`
      : `${change.kg < 0 ? '−' : '+'}${shown(Math.abs(change.kg), unit)} since ${dayLabel(change.since)}`
    : null;

  return (
    <View style={styles.card}>
      <View style={styles.head} accessible accessibilityLabel={latest ? `Body weight: ${shown(latest.kg, unit)} on ${dayLabel(latest.date)}.${changeWords ? ` ${changeWords}.` : ''}` : 'Body weight: nothing logged yet.'}>
        <View style={styles.flex}>
          <Txt variant="headline">Body weight</Txt>
          <Txt variant="footnote" color={color.labelSecondary}>
            {latest ? (changeWords ?? `Logged ${latest.date === today ? 'today' : dayLabel(latest.date)}`) : 'Log it now and then to see the trend'}
          </Txt>
        </View>
        {latest && (
          <Txt variant="title" style={[face('bold'), styles.figure]}>
            {shown(latest.kg, unit)}
          </Txt>
        )}
      </View>

      {recent.length >= 2 && <ProgressChart points={recent.map((entry) => ({ date: entry.date, kg: entry.kg }))} unit={unit} title="Body weight" legend={false} />}

      <View style={styles.entry}>
        <TextInput
          value={text}
          onChangeText={(value) => {
            setText(value);
            setProblem(null);
          }}
          onSubmitEditing={save}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={todays ? `Today: ${shown(todays.kg, unit)}` : 'Today’s weight'}
          placeholderTextColor={color.labelTertiary}
          keyboardType="decimal-pad"
          returnKeyType="done"
          accessibilityLabel={`Today’s weight, in ${unit}`}
          maxLength={6}
          style={[styles.input, webFocusRing(focused)]}
        />
        <Txt variant="subhead" color={color.labelSecondary} style={styles.unit}>
          {unit}
        </Txt>
        <Pressable
          onPress={save}
          disabled={!text.trim()}
          accessibilityRole="button"
          accessibilityLabel={todays ? 'Update today’s weight' : 'Log today’s weight'}
          aria-disabled={!text.trim()}
          style={({ pressed }) => [styles.save, !text.trim() && { opacity: 0.4 }, pressed && { opacity: 0.7 }]}
        >
          <Txt variant="subhead" color={color.onBrand} style={face('semibold')}>
            {todays ? 'Update' : 'Log'}
          </Txt>
        </Pressable>
      </View>
      {problem && (
        <Txt variant="footnote" color={color.dangerInk}>
          {problem}
        </Txt>
      )}

      <View style={styles.foot}>
        <Icon name="lock" size={12} color={color.labelTertiary} />
        <Txt variant="caption" color={color.labelSecondary} style={styles.flex}>
          On this phone only: never sent to GymGO.
        </Txt>
        {todays && (
          <Pressable
            onPress={() => {
              haptic.tap();
              remove(today);
            }}
            accessibilityRole="button"
            hitSlop={8}
            style={({ pressed }) => pressed && { opacity: 0.6 }}
          >
            <Txt variant="caption" color={color.brand} style={face('semibold')}>
              Remove today’s
            </Txt>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    card: { gap: space[3], padding: space[4], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.plate, ...shadow.plate },
    head: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
    flex: { flex: 1, minWidth: 0 },
    figure: { fontVariant: ['tabular-nums'] },
    entry: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    input: {
      flex: 1,
      minWidth: 0,
      minHeight: 44,
      paddingHorizontal: space[3],
      borderRadius: radius.md,
      backgroundColor: color.fill,
      color: color.label,
      fontSize: 17,
      ...face('semibold'),
    },
    unit: { minWidth: 18 },
    save: { minHeight: 44, minWidth: 72, paddingHorizontal: space[4], borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: color.brandFill },
    foot: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  }),
);
