/**
 * Plates: what to load on each side of the bar for the weight you want.
 * Opened from a barbell exercise while you train, or from Progress.
 */

import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Segmented, Txt } from '@/components/ui';
import { useApp } from '@/lib/app-state';
import { color, face, radius, space, themed } from '@/lib/theme';
import { BAR, formatWeight, parseWeight, plateLoad, unitFor, type WeightUnit } from '@/lib/training';

/** The bars most gyms have: a men's Olympic bar, and the lighter women's bar. */
const BARS: Record<WeightUnit, number[]> = { kg: [20, 15], lb: [45, 35] };

export default function PlatesScreen() {
  const params = useLocalSearchParams<{ weight?: string; unit?: string }>();
  const { prefs } = useApp();
  const [unit, setUnit] = useState<WeightUnit>(params.unit === 'kg' || params.unit === 'lb' ? params.unit : unitFor(prefs.country));
  const [text, setText] = useState(params.weight ?? '');
  const [bar, setBar] = useState<number>(BAR[unit]);
  const weight = parseWeight(text);
  const load = typeof weight === 'number' ? plateLoad(weight, unit, bar) : null;

  const switchUnit = (next: WeightUnit) => {
    setUnit(next);
    setBar(BAR[next]);
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Plates' }} />
      <Txt variant="subhead" color={color.labelSecondary}>
        Type the total you want on the bar, bar included.
      </Txt>
      <View style={styles.row}>
        <TextInput
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
              Standard plates get to {formatWeight(load.total, unit)}, {formatWeight(load.short, unit)} short of what you typed. Some gyms have smaller change plates.
            </Txt>
          )}
          {weight !== null && weight !== undefined && weight < bar && (
            <Txt variant="footnote" color={color.maybeInk}>
              That’s less than the bar itself.
            </Txt>
          )}
        </View>
      )}

      <Txt variant="footnote" color={color.labelTertiary}>
        Plates on hand: {unit === 'kg' ? '25, 20, 15, 10, 5, 2.5 and 1.25 kg' : '45, 35, 25, 10, 5 and 2.5 lb'}, the usual set. What your gym has may differ.
      </Txt>
    </ScrollView>
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
