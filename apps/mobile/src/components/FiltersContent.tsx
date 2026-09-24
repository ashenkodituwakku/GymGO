/**
 * Filters. Changes apply as you make them, and the button at the bottom says
 * how many gyms that leaves — so there is never a moment where the controls
 * and the results disagree.
 */

import { Pressable, StyleSheet, View } from 'react-native';
import { equipmentLabel, type Tri } from '@gymgo/domain';
import { timeLabel } from '@/lib/copy';
import {
  BUDGET_PRESETS,
  DUMBBELL_PRESETS,
  QUICK_EQUIPMENT,
  TIME_PRESETS,
  addDays,
  initialFilters,
  defaultVisit,
  nowIn,
  type Filters,
} from '@/lib/query';
import { color, face, radius, space } from '@/lib/theme';
import { haptic } from '@/lib/haptics';
import { cityAt, moneyLabel, radiusChoices } from '@/lib/places';
import { Chip, PrimaryButton, Txt } from './ui';

export function FiltersContent({
  filters,
  onChange,
  resultCount,
  onDone,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  resultCount: number;
  onDone: () => void;
}) {
  const today = nowIn(filters.timezone).date;
  const country = cityAt(filters.centre).country;
  const tomorrow = addDays(today, 1);
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  const toggleEquipment = (id: string) => {
    const has = filters.equipment.includes(id);
    set({
      equipment: has ? filters.equipment.filter((item) => item !== id) : [...filters.equipment, id],
      dumbbellMinKg: id === 'dumbbells' && has ? null : filters.dumbbellMinKg,
    });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Txt variant="title">Filters</Txt>
        <Pressable
          onPress={() => {
            haptic.select();
            const visit = defaultVisit(new Date(), filters.timezone);
            onChange({
              ...initialFilters(),
              centre: filters.centre,
              placeName: filters.placeName,
              timezone: filters.timezone,
              visitDate: visit.date,
              visitMinuteOfDay: visit.minute,
            });
          }}
          accessibilityRole="button"
          hitSlop={10}
        >
          <Txt variant="body" color={color.brand} style={styles.reset}>
            Reset
          </Txt>
        </Pressable>
      </View>

      <Group title="⏰ When are you training?">
        <Segmented
          options={[
            { label: 'Today', value: today },
            { label: 'Tomorrow', value: tomorrow },
          ]}
          value={filters.visitDate}
          onChange={(visitDate) => set({ visitDate })}
        />
        <View style={styles.chips}>
          {timeChoices(filters.visitMinuteOfDay).map((minute) => (
            <Chip
              key={minute}
              label={timeLabel(minute)}
              selected={filters.visitMinuteOfDay === minute}
              onPress={() => set({ visitMinuteOfDay: minute })}
            />
          ))}
        </View>
        <Hint>We check when visitors can walk in — not when members can.</Hint>
      </Group>

      <Group title="💵 Budget per visit">
        <View style={styles.chips}>
          {BUDGET_PRESETS.map((budget) => (
            <Chip
              key={String(budget)}
              label={budget === null ? 'Any' : `Under ${moneyLabel(budget, country)}`}
              selected={filters.budgetMinor === budget}
              onPress={() => set({ budgetMinor: budget })}
            />
          ))}
        </View>
        <Hint>What you don't get back: price, tax and any must-pay fee. Refundable deposits are shown separately.</Hint>
      </Group>

      <Group title="🏋️ Must have">
        <View style={styles.chips}>
          {QUICK_EQUIPMENT.map((id) => (
            <Chip key={id} label={equipmentLabel(id)} selected={filters.equipment.includes(id)} onPress={() => toggleEquipment(id)} />
          ))}
        </View>
        {filters.equipment.includes('dumbbells') && (
          <>
            <Txt variant="footnote" color={color.labelSecondary} style={styles.subLabel}>
              Heaviest dumbbells, at least
            </Txt>
            <View style={styles.chips}>
              {DUMBBELL_PRESETS.map((kg) => (
                <Chip
                  key={String(kg)}
                  label={kg === null ? 'Any' : `${kg} kg`}
                  selected={filters.dumbbellMinKg === kg}
                  onPress={() => set({ dumbbellMinKg: kg })}
                />
              ))}
            </View>
          </>
        )}
        <Hint>Every one has to be there. If we don't know, it doesn't count.</Hint>
      </Group>

      <Group title="🏠 Live or work nearby?">
        <Segmented<Tri>
          options={[
            { label: 'Yes', value: 'yes' },
            { label: 'No', value: 'no' },
            { label: 'Rather not say', value: 'unknown' },
          ]}
          value={filters.isLocalResident}
          onChange={(isLocalResident) => set({ isLocalResident })}
        />
        <Hint>Some free trials are for locals only. Telling us lets those count for or against.</Hint>
      </Group>

      <Group title="📏 How far">
        <View style={styles.chips}>
          {radiusChoices(country).map((choice) => (
            <Chip
              key={choice.label}
              label={choice.label}
              selected={Math.abs(filters.radiusKm - choice.km) < 0.01}
              onPress={() => set({ radiusKm: choice.km })}
            />
          ))}
        </View>
        <Hint>As the crow flies. We don't estimate travel time.</Hint>
      </Group>

      <View style={styles.footer}>
        <PrimaryButton
          label={resultCount === 0 ? 'No gyms — loosen something' : `Show ${resultCount} gym${resultCount === 1 ? '' : 's'}`}
          onPress={onDone}
        />
      </View>
    </View>
  );
}

/** The presets, plus the chosen time if it isn't one of them (e.g. 3 pm). */
function timeChoices(current: number): number[] {
  const presets: number[] = [...TIME_PRESETS];
  return presets.includes(current) ? presets : [...presets, current].sort((a, b) => a - b);
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Txt variant="headline">{title}</Txt>
      {children}
    </View>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <Txt variant="footnote" color={color.labelSecondary}>
      {children}
    </Txt>
  );
}

/** The iOS segmented control, drawn so it looks the same on every platform. */
function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ label: string; value: T }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented} accessibilityRole="radiogroup">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              haptic.select();
              onChange(option.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Txt variant="footnote" style={selected ? styles.segmentTextSelected : styles.segmentText}>
              {option.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space[4], paddingBottom: space[8] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: space[1] },
  reset: face('medium'),
  group: { marginTop: space[6], gap: space[3] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  subLabel: { marginTop: space[1] },
  footer: { marginTop: space[8] },

  segmented: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: 9,
    backgroundColor: color.fill,
  },
  segment: { flex: 1, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 7 },
  segmentSelected: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  segmentText: face('medium'),
  segmentTextSelected: face('bold'),
});
