/**
 * Body measurements (lib/bodyMeasures.ts), from Progress: type what you
 * measured today (any of them; the latest of each shows as a guide), see
 * the latest of each with how it's changed over about a month, a chart of
 * any one, and every day you measured, to delete one. Kept on this device
 * only. Free.
 *
 * Changes are said as they are, never as better or worse: a smaller waist
 * or a bigger arm is only good if it's what you're after.
 */

import { useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Pressable } from '@/components/motion';
import { PageScroll } from '@/components/PageScroll';
import { ProgressChart } from '@/components/ProgressChart';
import { useGlassRedraw } from '@/components/Redrawn';
import { ScreenOptions } from '@/components/ScreenOptions';
import { Input, PrimaryButton, Txt } from '@/components/ui';
import { useApp } from '@/lib/app-state';
import { localToday } from '@/lib/bodyWeight';
import { MEASURES, formMeasures, keptValue, latestOf, lengthUnitFor, measureDays, seriesOf, shownValue, unitOf, valueLabel, withMeasures, withoutDay, type MeasureId } from '@/lib/bodyMeasures';
import { dateLabel } from '@/lib/copy';
import { haptic } from '@/lib/haptics';
import { usePageTitle } from '@/lib/pageTitle';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';
import { unitFor } from '@/lib/training';
import { useTapAgainOn } from '@/lib/tapAgain';

export default function MeasurementsScreen() {
  useGlassRedraw();
  usePageTitle('Body measurements');
  const { prefs } = useApp();
  const length = lengthUnitFor(unitFor(prefs.country));
  const days = measureDays.use();
  const [typed, setTyped] = useState<Partial<Record<MeasureId, string>>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [kept, setKept] = useState(false);
  const [charted, setCharted] = useState<MeasureId | null>(null);
  const [deleting, setDeleting] = useTapAgainOn<string>();
  // The form: the measures you take (four common ones to start), and the rest a tap away.
  const [all, setAll] = useState(false);
  const usual = useMemo(() => formMeasures(days), [days]);
  const fields = all ? MEASURES : MEASURES.filter((measure) => usual.includes(measure.id) || !!typed[measure.id]?.trim());
  const more = MEASURES.length - fields.length;
  const today = localToday();
  const latest = useMemo(() => MEASURES.map((measure) => ({ measure, latest: latestOf(days, measure.id) })).filter((row) => row.latest !== null), [days]);
  const shownChart = charted ?? latest[0]?.measure.id ?? null;
  const series = useMemo(() => (shownChart ? seriesOf(days, shownChart) : []), [days, shownChart]);

  const save = () => {
    setKept(false);
    const values: Partial<Record<MeasureId, number>> = {};
    for (const measure of MEASURES) {
      const text = typed[measure.id]?.trim();
      if (!text) continue;
      const value = keptValue(measure.id, text, length);
      if (value === null) {
        haptic.warn();
        const unit = unitOf(measure.id, length);
        const low = shownValue(measure.id, measure.min, length);
        const high = shownValue(measure.id, measure.max, length);
        return setProblem(`${measure.label}: type it in ${unit === '%' ? 'percent' : unit}, from ${low} to ${high}.`);
      }
      values[measure.id] = value;
    }
    if (Object.keys(values).length === 0) return setProblem('Type at least one measurement.');
    measureDays.update((current) => withMeasures(current, today, values));
    haptic.success();
    setTyped({});
    setProblem(null);
    setKept(true);
  };

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content}>
      <ScreenOptions options={{ title: '' }} />
      <View style={styles.intro}>
        <Txt variant="largeTitle" accessibilityRole="header" level={1}>
          Body measurements
        </Txt>
        <Txt variant="subhead" color={color.labelSecondary}>
          Measure at the same time of day, relaxed, for numbers you can compare.
        </Txt>
      </View>

      {latest.length > 0 && (
        <>
          <Txt variant="eyebrow" color={color.labelSecondary} style={styles.section}>
            LATEST
          </Txt>
          <View style={styles.group} role="radiogroup" accessibilityLabel="Which measurement the chart shows">
            {latest.map(({ measure, latest: now }, index) => {
              const change = now!.change;
              const changeWords = change ? (change.by === 0 ? `No change since ${dateLabel(change.since)}` : `${change.by > 0 ? '+' : '−'}${valueLabel(measure.id, Math.abs(change.by), length)} since ${dateLabel(change.since)}`) : `Taken ${dateLabel(now!.date)}`;
              const on = shownChart === measure.id;
              return (
                <Pressable
                  key={measure.id}
                  onPress={() => {
                    haptic.select();
                    setCharted(measure.id);
                  }}
                  accessibilityRole="radio"
                  aria-checked={on}
                  accessibilityLabel={`${measure.label}: ${valueLabel(measure.id, now!.value, length)}. ${changeWords}`}
                  style={({ pressed }) => [styles.row, index > 0 && styles.rowLine, on && styles.rowOn, pressed && { backgroundColor: color.fill }]}
                >
                  <View style={styles.flex}>
                    <Txt variant="body" style={on && face('semibold')}>
                      {measure.label}
                    </Txt>
                    <Txt variant="footnote" color={color.labelSecondary}>
                      {changeWords}
                    </Txt>
                  </View>
                  <Txt variant="headline">{valueLabel(measure.id, now!.value, length)}</Txt>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {shownChart && series.length > 0 && (
        <View style={styles.card}>
          <ProgressChart
            points={series.map((point) => ({ date: point.date, kg: shownValue(shownChart, point.value, length) }))}
            unit="kg"
            count={unitOf(shownChart, length)}
            title={MEASURES.find((measure) => measure.id === shownChart)!.label}
          />
          {latest.length > 1 && (
            <Txt variant="caption" color={color.labelSecondary}>
              Tap another above to chart it.
            </Txt>
          )}
        </View>
      )}

      <Txt variant="eyebrow" color={color.labelSecondary} style={styles.section}>
        {`MEASURE TODAY · ${unitOf('waist', length).toUpperCase()}`}
      </Txt>
      <View style={styles.card}>
        {fields.map((measure, index) => {
          const now = latestOf(days, measure.id);
          return (
            <View key={measure.id} style={[styles.field, index > 0 && styles.fieldLine]}>
              <View style={styles.flex}>
                <Txt variant="body">{measure.label}</Txt>
                <Txt variant="caption" color={color.labelSecondary}>
                  {measure.how}
                </Txt>
              </View>
              <Input
                value={typed[measure.id] ?? ''}
                onChangeText={(text) => {
                  setKept(false);
                  setTyped((current) => ({ ...current, [measure.id]: text }));
                }}
                placeholder={now ? String(shownValue(measure.id, now.value, length)) : '—'}
                keyboardType="decimal-pad"
                inputMode="decimal"
                maxLength={6}
                style={styles.input}
                accessibilityLabel={`${measure.label} today, in ${unitOf(measure.id, length) === '%' ? 'percent' : unitOf(measure.id, length)}${now ? `; last ${valueLabel(measure.id, now.value, length)}` : ''}`}
              />
              <Txt variant="footnote" color={color.labelSecondary} style={styles.unit}>
                {unitOf(measure.id, length)}
              </Txt>
            </View>
          );
        })}
        {(more > 0 || (all && usual.length < MEASURES.length)) && (
          <Pressable
            onPress={() => {
              haptic.select();
              setAll(!all);
            }}
            accessibilityRole="button"
            aria-expanded={all}
            accessibilityLabel={all ? 'Show only the measurements you take' : `Show ${more} more measurements: ${MEASURES.filter((measure) => !fields.includes(measure)).map((measure) => measure.label.toLowerCase()).join(', ')}`}
            style={({ pressed }) => [styles.more, pressed && { opacity: 0.6 }]}
          >
            <Icon name={all ? 'collapse' : 'expand'} size={14} color={color.brand} />
            <Txt variant="footnote" color={color.brand} style={face('semibold')}>
              {all ? 'Fewer measurements' : `${more} more measurements`}
            </Txt>
          </Pressable>
        )}
        {problem && (
          <Txt variant="footnote" color={color.dangerInk}>
            {problem}
          </Txt>
        )}
        {kept && (
          <Txt variant="footnote" color={color.goodInk}>
            Kept for today. Measuring something again today replaces it.
          </Txt>
        )}
        <PrimaryButton label="Keep today’s" icon="check" onPress={save} />
        <View style={styles.privacy}>
          <Icon name="lock" size={12} color={color.labelTertiary} />
          <Txt variant="caption" color={color.labelSecondary} style={styles.flex}>
            {`Only ${Platform.OS === 'web' ? 'in this browser' : 'on this phone'}: never uploaded, not in your account.`}
          </Txt>
        </View>
      </View>

      {days.length > 0 && (
        <>
          <Txt variant="eyebrow" color={color.labelSecondary} style={styles.section}>
            EVERY DAY YOU MEASURED
          </Txt>
          <View style={styles.group}>
            {[...days].reverse().map((day, index) => (
              <View key={day.date} style={[styles.row, index > 0 && styles.rowLine]}>
                <View style={styles.flex}>
                  <Txt variant="body">{dateLabel(day.date)}</Txt>
                  <Txt variant="footnote" color={color.labelSecondary}>
                    {MEASURES.filter((measure) => day.values[measure.id] !== undefined)
                      .map((measure) => `${measure.label} ${valueLabel(measure.id, day.values[measure.id]!, length)}`)
                      .join(' · ')}
                  </Txt>
                </View>
                <Pressable
                  onPress={() => {
                    if (deleting !== day.date) return setDeleting(day.date);
                    haptic.select();
                    measureDays.update((current) => withoutDay(current, day.date));
                    setDeleting(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={deleting === day.date ? `Tap again to delete ${dateLabel(day.date)}’s measurements` : `Delete ${dateLabel(day.date)}’s measurements`}
                  hitSlop={8}
                >
                  <Txt variant="footnote" color={color.dangerInk} style={face('semibold')}>
                    {deleting === day.date ? 'Tap again' : 'Delete'}
                  </Txt>
                </Pressable>
              </View>
            ))}
          </View>
        </>
      )}
    </PageScroll>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], paddingBottom: space[8], gap: space[3], width: '100%', maxWidth: 560, alignSelf: 'center' },
    intro: { gap: space[2] },
    privacy: { flexDirection: 'row', alignItems: 'center', gap: space[1], justifyContent: 'center' },
    more: { flexDirection: 'row', alignItems: 'center', gap: space[1], alignSelf: 'flex-start', paddingVertical: space[2] },
    flex: { flex: 1, minWidth: 0 },
    section: { marginTop: space[3], marginLeft: space[4] },
    group: { backgroundColor: color.plate, borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', ...shadow.plate },
    card: { gap: space[2], padding: space[4], backgroundColor: color.plate, borderRadius: radius.lg, borderCurve: 'continuous', ...shadow.plate },
    row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3] },
    rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.separator },
    rowOn: { backgroundColor: color.brandTint },
    field: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingVertical: space[2] },
    fieldLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.separator },
    input: { width: 76, height: 42, borderRadius: radius.sm, backgroundColor: color.fill, textAlign: 'center', fontSize: 17, color: color.label, ...face('semibold') },
    unit: { width: 22 },
  }),
);
