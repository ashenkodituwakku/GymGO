/**
 * Plates: what to load on each side of the bar for the weight you want,
 * and, with Pro, the warm-up sets that lead up to it. Opened from a barbell
 * exercise while you train, or from Progress.
 */

import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BarDiagram } from '@/components/BarDiagram';
import { Icon } from '@/components/Icon';
import { Input, Segmented, Txt } from '@/components/ui';
import { useApp } from '@/lib/app-state';
import { color, face, radius, space, themed } from '@/lib/theme';
import { BAR, PLATES, PLATE_CHOICES, formatWeight, parseWeight, plateLoad, unitFor, warmUpSets, type WeightUnit } from '@/lib/training';
import { usePageTitle } from '@/lib/pageTitle';
import { PageScroll } from '@/components/PageScroll';

/** The bars most gyms have: a men's Olympic bar, and the lighter women's bar. */
const BARS: Record<WeightUnit, number[]> = { kg: [20, 15], lb: [45, 35] };

export default function PlatesScreen() {
  usePageTitle('Plates');
  const params = useLocalSearchParams<{ weight?: string; unit?: string }>();
  const { prefs, setPref, billing, openPro } = useApp();
  // Your country's unit (read once your settings have loaded), until you pick one.
  const [picked, setPicked] = useState<WeightUnit | null>(params.unit === 'kg' || params.unit === 'lb' ? params.unit : null);
  const unit = picked ?? unitFor(prefs.country);
  const [text, setText] = useState(params.weight ?? '');
  const [pickedBar, setBar] = useState<number | null>(null);
  const bar = pickedBar ?? BAR[unit];
  const weight = parseWeight(text);
  // Your gym's plates with Pro, else the usual set.
  const custom = billing.isPro ? (prefs.plates[unit] ?? null) : null;
  const plates = custom ?? PLATES[unit];
  const [editing, setEditing] = useState(false);
  const togglePlate = (plate: number) => {
    const next = plates.includes(plate) ? plates.filter((item) => item !== plate) : [...plates, plate].sort((a, b) => b - a);
    if (next.length === 0) return; // A bar needs at least one size of plate.
    const standard = next.length === PLATES[unit].length && next.every((item) => PLATES[unit].includes(item));
    const { [unit]: _dropped, ...others } = prefs.plates;
    setPref('plates', standard ? others : { ...prefs.plates, [unit]: next });
  };
  const load = typeof weight === 'number' ? plateLoad(weight, unit, bar, plates) : null;
  // Worked out to what the plates actually make, so the ramp ends below the real load.
  const ramp = load && load.total > bar ? warmUpSets(load.total, unit, bar, plates) : [];
  const perSide = (plates: number[]) => (plates.length ? `${plates.map((plate) => Number(plate.toFixed(2))).join(' + ')} each side` : 'just the bar');

  const switchUnit = (next: WeightUnit) => {
    setPicked(next);
    setBar(null);
  };

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Plates' }} />
      <Txt variant="subhead" color={color.labelSecondary}>
        Type the total you want on the bar, bar included.
      </Txt>
      <View style={styles.row}>
        <Input
          value={text}
          onChangeText={setText}
          placeholder={unit === 'kg' ? '100' : '225'}
          placeholderTextColor={color.labelTertiary}
          keyboardType="decimal-pad"
          inputMode="decimal"
          autoFocus={!params.weight}
          style={styles.input}
          accessibilityLabel={`Total weight in ${unit}`}
        />
        <View style={styles.flex}>
          <Segmented
            options={[
              { value: 'lb', label: 'lb' },
              { value: 'kg', label: 'kg' },
            ]}
            value={unit}
            onChange={switchUnit}
          />
        </View>
      </View>
      <View style={styles.row}>
        <Txt variant="footnote" color={color.labelSecondary}>
          Bar
        </Txt>
        <View style={styles.flex}>
          <Segmented options={BARS[unit].map((value) => ({ value, label: formatWeight(value, unit) }))} value={bar} onChange={setBar} />
        </View>
      </View>

      {weight === undefined && (
        <Txt variant="footnote" color={color.maybeInk}>
          That doesn’t read as a weight.
        </Txt>
      )}

      {load && (
        <View style={styles.card} accessible accessibilityLabel={`Each side: ${load.perSide.length ? load.perSide.map((plate) => formatWeight(plate, unit)).join(', ') : 'nothing, just the bar'}`}>
          <Txt variant="eyebrow" color={color.labelSecondary}>
            EACH SIDE
          </Txt>
          <BarDiagram plates={load.perSide} unit={unit} />
          {load.perSide.length === 0 ? (
            <Txt variant="title2">Just the bar</Txt>
          ) : (
            <View style={styles.plates}>
              {load.perSide.map((plate, index) => (
                <View key={index} style={styles.plate}>
                  <Txt variant="headline" style={face('bold')}>
                    {Number(plate.toFixed(2))}
                  </Txt>
                  <Txt variant="caption" color={color.labelSecondary}>
                    {unit}
                  </Txt>
                </View>
              ))}
            </View>
          )}
          <Txt variant="subhead" color={color.labelSecondary}>
            {formatWeight(load.bar, unit)} bar + {formatWeight(load.total - load.bar, unit)} of plates = {formatWeight(load.total, unit)}
          </Txt>
          {load.short > 0 && (
            <Txt variant="footnote" color={color.maybeInk}>
              {custom
                ? `Your plates get to ${formatWeight(load.total, unit)}, ${formatWeight(load.short, unit)} short of what you typed.`
                : `Standard plates get to ${formatWeight(load.total, unit)}, ${formatWeight(load.short, unit)} short of what you typed. Some gyms have smaller change plates.`}
            </Txt>
          )}
          {weight !== null && weight !== undefined && weight < bar && (
            <Txt variant="footnote" color={color.maybeInk}>
              That’s less than the bar itself.
            </Txt>
          )}
        </View>
      )}

      {ramp.length > 0 &&
        (billing.isPro ? (
          <View style={styles.card}>
            <Txt variant="eyebrow" color={color.labelSecondary}>
              WARM-UP
            </Txt>
            <View>
              {ramp.map((set, index) => (
                <View
                  key={set.weight}
                  style={[styles.rampRow, index > 0 && styles.rampLine]}
                  accessible
                  accessibilityLabel={`${formatWeight(set.weight, unit)} for ${set.reps}: ${perSide(set.load.perSide)}`}
                >
                  <Txt variant="headline" style={styles.rampWeight}>
                    {formatWeight(set.weight, unit)}
                  </Txt>
                  <Txt variant="subhead" color={color.labelSecondary} style={styles.rampReps}>
                    × {set.reps}
                  </Txt>
                  <Txt variant="subhead" color={color.labelSecondary} style={styles.flex} numberOfLines={2}>
                    {perSide(set.load.perSide)}
                  </Txt>
                </View>
              ))}
            </View>
            <Txt variant="footnote" color={color.labelSecondary}>
              {`The empty bar, then about 40%, 60% and 80% of ${formatWeight(load!.total, unit)}, each rounded down to what the plates make. Then your working sets.`}
            </Txt>
          </View>
        ) : (
          <Pressable onPress={() => openPro('warmup')} accessibilityRole="button" style={({ pressed }) => [styles.card, styles.pro, pressed && { opacity: 0.8 }]}>
            <Icon name="flame" size={22} color={color.brand} />
            <View style={styles.flex}>
              <Txt variant="headline">Warm-up sets</Txt>
              <Txt variant="footnote" color={color.labelSecondary}>
                {`GymGO Pro works out a warm-up to ${formatWeight(load!.total, unit)}, with the plates for each set.`}
              </Txt>
            </View>
            <Icon name="chevron" size={13} color={color.labelTertiary} />
          </Pressable>
        ))}

      {/* Nothing typed yet: the bare bar, and what will show here. */}
      {text.trim() === '' && (
        <View style={styles.card}>
          <Txt variant="eyebrow" color={color.labelSecondary}>
            EACH SIDE
          </Txt>
          <BarDiagram plates={[]} unit={unit} />
          <Txt variant="subhead" color={color.labelSecondary}>
            Type a total above, like {unit === 'kg' ? '100' : '225'}, and the plates for each side of a {formatWeight(bar, unit)} bar show here.
          </Txt>
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.platesHead}>
          <View style={styles.flex}>
            <Txt variant="headline">{custom ? 'Your gym’s plates' : 'Plates on hand'}</Txt>
            <Txt variant="footnote" color={color.labelSecondary}>
              {`${plates.map((plate) => Number(plate.toFixed(2))).join(', ')} ${unit}${custom ? '' : ', the usual set'}`}
            </Txt>
          </View>
          <Pressable
            onPress={() => (billing.isPro ? setEditing(!editing) : openPro('plates'))}
            accessibilityRole="button"
            accessibilityLabel={billing.isPro ? (editing ? 'Done choosing plates' : 'Choose your gym’s plates') : 'Choose your gym’s plates, with GymGO Pro'}
            hitSlop={8}
            style={({ pressed }) => [styles.editPlates, pressed && { opacity: 0.7 }]}
          >
            <Txt variant="footnote" color={color.brand} style={face('semibold')}>
              {billing.isPro ? (editing ? 'Done' : 'Change') : 'Change with Pro'}
            </Txt>
          </Pressable>
        </View>
        {editing && billing.isPro && (
          <>
            <View style={styles.choices}>
              {PLATE_CHOICES[unit].map((plate) => {
                const on = plates.includes(plate);
                return (
                  <Pressable
                    key={plate}
                    onPress={() => togglePlate(plate)}
                    accessibilityRole="checkbox"
                    aria-checked={on}
                    accessibilityLabel={`${formatWeight(plate, unit)} plates`}
                    style={({ pressed }) => [styles.choice, on && styles.choiceOn, pressed && { opacity: 0.7 }]}
                  >
                    <Txt variant="subhead" color={on ? color.onBrand : color.label} style={face('semibold')}>
                      {Number(plate.toFixed(2))}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
            <Txt variant="caption" color={color.labelSecondary}>
              {`Tick the ${unit} plates your gym has, pairs of each. Kept on this device; the sums and warm-ups above use them.`}
            </Txt>
          </>
        )}
      </View>
    </PageScroll>
  );
}

const styles = themed(() => StyleSheet.create({
  page: { flex: 1, backgroundColor: color.groupedBackground },
  content: { padding: space[4], gap: space[3], width: '100%', maxWidth: 560, alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  flex: { flex: 1 },
  input: {
    width: 120,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: color.card,
    textAlign: 'center',
    fontSize: 26,
    color: color.label,
    ...face('bold'),
  },
  card: { backgroundColor: color.card, borderRadius: radius.lg, borderCurve: 'continuous', padding: space[4], gap: space[3] },
  pro: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  platesHead: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  editPlates: { paddingHorizontal: space[3], paddingVertical: 6, borderRadius: radius.pill, backgroundColor: color.brandTint },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  choice: { minWidth: 52, alignItems: 'center', paddingHorizontal: space[3], paddingVertical: space[2], borderRadius: radius.md, backgroundColor: color.fill },
  choiceOn: { backgroundColor: color.brandFill },
  rampRow: { flexDirection: 'row', alignItems: 'baseline', gap: space[2], paddingVertical: space[2] },
  rampLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.separator },
  rampWeight: { minWidth: 76 },
  rampReps: { minWidth: 34 },
  plates: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  plate: {
    minWidth: 64,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.md,
    backgroundColor: color.brandTint,
    alignItems: 'center',
  },
}));
