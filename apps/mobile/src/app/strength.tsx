/**
 * 1-rep max: from any set you've done (weight × reps), about the most you
 * could lift once, and the weights to train at from it. Free: the estimate,
 * and 90%, 80% and 70% of it. Pro: every step from 100% to 50%, each with
 * the plates to load it, and what you could do for 2 to 12 reps.
 *
 * It's an estimate (Epley's formula, the one Progress uses), and says so;
 * past 12 reps there's none rather than a poor one.
 */

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Pressable } from '@/components/motion';
import { Icon } from '@/components/Icon';
import { PageScroll } from '@/components/PageScroll';
import { Input, Segmented, Txt } from '@/components/ui';
import { useApp } from '@/lib/app-state';
import { usePageTitle } from '@/lib/pageTitle';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';
import {
  BAR,
  FREE_PERCENTS,
  PERCENT_STEPS,
  PLATES,
  formatWeight,
  oneRepMax,
  parseReps,
  parseWeight,
  plateLoad,
  repMax,
  unitFor,
  type WeightUnit,
} from '@/lib/training';

/** Near enough to load: 2.5 kg or 5 lb, the smallest step the usual plates make. */
const STEP: Record<WeightUnit, number> = { kg: 2.5, lb: 5 };
const nearest = (value: number, unit: WeightUnit) => Math.round(value / STEP[unit]) * STEP[unit];

export default function StrengthScreen() {
  usePageTitle('1-rep max');
  const params = useLocalSearchParams<{ weight?: string; reps?: string; unit?: string }>();
  const router = useRouter();
  const { prefs, billing, openPro } = useApp();
  const pro = billing.isPro;
  const [picked, setPicked] = useState<WeightUnit | null>(params.unit === 'kg' || params.unit === 'lb' ? params.unit : null);
  const unit = picked ?? unitFor(prefs.country);
  const [weightText, setWeightText] = useState(params.weight ?? '');
  const [repsText, setRepsText] = useState(params.reps ?? '');
  const weight = parseWeight(weightText);
  // Nothing typed yet isn't a mistake.
  const reps = repsText.trim() ? parseReps(repsText) : null;
  const max = typeof weight === 'number' && typeof reps === 'number' ? oneRepMax(weight, reps) : null;
  const plates = (pro ? prefs.plates[unit] : null) ?? PLATES[unit];
  const percents = pro ? [...PERCENT_STEPS] : FREE_PERCENTS;

  const openPlates = (total: number) => router.push({ pathname: '/plates', params: { weight: String(total), unit } });

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: '1-rep max' }} />
      <Txt variant="subhead" color={color.labelSecondary}>
        Type a set you’ve done: the weight, and how many reps you got.
      </Txt>
      <View style={styles.row}>
        <Input
          value={weightText}
          onChangeText={setWeightText}
          placeholder={unit === 'kg' ? '100' : '225'}
          placeholderTextColor={color.labelTertiary}
          keyboardType="decimal-pad"
          inputMode="decimal"
          autoFocus={!params.weight}
          style={styles.input}
          accessibilityLabel={`Weight in ${unit}`}
        />
        <Txt variant="headline" color={color.labelSecondary}>
          ×
        </Txt>
        <Input
          value={repsText}
          onChangeText={setRepsText}
          placeholder="5"
          placeholderTextColor={color.labelTertiary}
          keyboardType="number-pad"
          inputMode="numeric"
          style={styles.reps}
          accessibilityLabel="Reps"
        />
        <View style={styles.flex}>
          <Segmented
            options={[
              { value: 'lb', label: 'lb' },
              { value: 'kg', label: 'kg' },
            ]}
            value={unit}
            onChange={setPicked}
          />
        </View>
      </View>

      {(weight === undefined || reps === undefined) && (
        <Txt variant="footnote" color={color.maybeInk}>
          {weight === undefined ? 'That doesn’t read as a weight.' : 'Reps are a whole number, like 5.'}
        </Txt>
      )}
      {typeof reps === 'number' && reps > 12 && (
        <Txt variant="footnote" color={color.maybeInk}>
          Past 12 reps the estimate isn’t worth much, so there isn’t one. Try a heavier set.
        </Txt>
      )}

      {max !== null && (
        <View style={styles.card} accessible accessibilityLabel={`Estimated 1-rep max: about ${formatWeight(nearest(max, unit), unit)}`}>
          <Txt variant="eyebrow" color={color.labelSecondary}>
            ESTIMATED 1-REP MAX
          </Txt>
          <Txt variant="largeTitle">≈ {formatWeight(nearest(max, unit), unit)}</Txt>
          <Txt variant="footnote" color={color.labelSecondary}>
            {reps === 1
              ? 'A single is your 1-rep max already.'
              : `From ${formatWeight(weight as number, unit)} × ${reps}, by Epley’s formula. An estimate: most accurate from sets of 10 reps or fewer.`}
          </Txt>
        </View>
      )}

      {max !== null && (
        <View style={styles.card}>
          <Txt variant="eyebrow" color={color.labelSecondary}>
            PERCENT OF YOUR MAX
          </Txt>
          <View>
            {percents.map((percent, index) => {
              const target = nearest((max * percent) / 100, unit);
              const load = target > BAR[unit] ? plateLoad(target, unit, BAR[unit], plates) : null;
              const side = load && load.perSide.length ? `${load.perSide.map((plate) => Number(plate.toFixed(2))).join(' + ')} each side` : null;
              return (
                <Pressable
                  key={percent}
                  onPress={() => openPlates(target)}
                  accessibilityRole="button"
                  accessibilityLabel={`${percent} percent: ${formatWeight(target, unit)}. Open the plate calculator`}
                  style={({ pressed }) => [styles.percentRow, index > 0 && styles.line, pressed && { opacity: 0.6 }]}
                >
                  <Txt variant="subhead" color={color.labelSecondary} style={styles.percent}>
                    {percent}%
                  </Txt>
                  <Txt variant="headline" style={styles.weight}>
                    {formatWeight(target, unit)}
                  </Txt>
                  <Txt variant="footnote" color={color.labelSecondary} style={styles.flex} numberOfLines={2}>
                    {pro ? (side ?? (target <= BAR[unit] ? 'The bar, or lighter' : '')) : ''}
                  </Txt>
                  <Icon name="chevron" size={13} color={color.labelTertiary} />
                </Pressable>
              );
            })}
          </View>
          {pro && (
            <Txt variant="footnote" color={color.labelSecondary}>
              {`Rounded to the nearest ${formatWeight(STEP[unit], unit)}. Plates are for a ${formatWeight(BAR[unit], unit)} bar${prefs.plates[unit] ? ', from your gym’s plates' : ''}; tap a row for the plate calculator.`}
            </Txt>
          )}
        </View>
      )}

      {max !== null && pro && (
        <View style={styles.card}>
          <Txt variant="eyebrow" color={color.labelSecondary}>
            WHAT YOU COULD DO FOR
          </Txt>
          <View style={styles.grid}>
            {[2, 3, 4, 5, 6, 8, 10, 12].map((count) => (
              <View key={count} style={styles.cell}>
                <Txt variant="caption" color={color.labelSecondary}>
                  {count} reps
                </Txt>
                <Txt variant="headline">{formatWeight(nearest(repMax(max, count)!, unit), unit)}</Txt>
              </View>
            ))}
          </View>
        </View>
      )}

      {max !== null && !pro && (
        <Pressable onPress={() => openPro('strength')} accessibilityRole="button" style={({ pressed }) => [styles.card, styles.pro, pressed && { opacity: 0.8 }]}>
          <Icon name="crown" size={22} color={color.brand} />
          <View style={styles.flex}>
            <Txt variant="headline">Every percentage, with plates</Txt>
            <Txt variant="footnote" color={color.labelSecondary}>
              GymGO Pro lists 100% down to 50%, the plates for each, and what you could lift for 2 to 12 reps.
            </Txt>
          </View>
          <Icon name="chevron" size={13} color={color.labelTertiary} />
        </Pressable>
      )}

      {weightText.trim() === '' && (
        <View style={styles.card}>
          <Txt variant="eyebrow" color={color.labelSecondary}>
            HOW IT WORKS
          </Txt>
          <Txt variant="subhead" color={color.labelSecondary}>
            {`Say you got ${unit === 'kg' ? '100 kg' : '225 lb'} for 5. That puts your 1-rep max near ${formatWeight(nearest((unit === 'kg' ? 100 : 225) * (1 + 5 / 30), unit), unit)}, without having to test it. Programs often ask for a share of it, like 5 sets at 80%.`}
          </Txt>
        </View>
      )}
    </PageScroll>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], paddingBottom: space[8], gap: space[3], width: '100%', maxWidth: 560, alignSelf: 'center' },
    flex: { flex: 1 },
    row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    // Big, like the plate calculator's: typed at the gym, between sets.
    input: { width: 104, height: 52, borderRadius: radius.md, backgroundColor: color.card, textAlign: 'center', fontSize: 24, color: color.label, ...face('bold') },
    reps: { width: 64, height: 52, borderRadius: radius.md, backgroundColor: color.card, textAlign: 'center', fontSize: 24, color: color.label, ...face('bold') },
    card: { gap: space[2], padding: space[4], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.card, ...shadow.plate },
    percentRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 44, paddingVertical: space[1] },
    line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.separator },
    percent: { width: 44, fontVariant: ['tabular-nums'] },
    weight: { minWidth: 84, fontVariant: ['tabular-nums'] },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    cell: { flexBasis: '22%', flexGrow: 1, alignItems: 'center', gap: 2, paddingVertical: space[2], borderRadius: radius.md, backgroundColor: color.fill },
    pro: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  }),
);
