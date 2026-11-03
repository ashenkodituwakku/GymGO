/**
 * Kinds of set and RPE, for logging a workout (app/train.tsx) and changing
 * one after (app/session-edit.tsx): the choices for a set's kind (an
 * ordinary set, a warm-up, a drop set, one to failure), each kind's ink, and
 * the row of chips asking how hard a set was.
 */

import { ActionSheetIOS, Platform, StyleSheet, View } from 'react-native';
import { RPE_VALUES, SET_KIND_WORDS, rpeMeaning, type SetKind } from '@/lib/training';
import { color, space, themed } from '@/lib/theme';
import { Chip, Txt } from './ui';

/** The kinds of set, as the picker lists them. */
export const KIND_OPTIONS: ReadonlyArray<{ key: SetKind | 'normal'; label: string }> = [
  { key: 'normal', label: 'Ordinary set' },
  { key: 'warmup', label: `${SET_KIND_WORDS.warmup.letter} · ${SET_KIND_WORDS.warmup.label}` },
  { key: 'drop', label: `${SET_KIND_WORDS.drop.letter} · ${SET_KIND_WORDS.drop.label}` },
  { key: 'failure', label: `${SET_KIND_WORDS.failure.letter} · ${SET_KIND_WORDS.failure.label}` },
];

export const KIND_MESSAGE = 'Warm-ups are left out of records and totals. A drop set follows the set before with no rest.';

/** Each kind's letter in an ink that reads on the card. */
export const KIND_INK: Record<SetKind, () => string> = { warmup: () => color.maybeInk, drop: () => color.brand, failure: () => color.dangerInk };

/**
 * On iPhone, Apple's action sheet for a set's kind: true once it's shown.
 * Elsewhere false, and the caller shows GymGO's own (ChoiceSheet).
 */
export function askSetKindNatively(title: string, onPick: (kind: SetKind | 'normal') => void): boolean {
  if (Platform.OS !== 'ios') return false;
  ActionSheetIOS.showActionSheetWithOptions(
    { title, message: KIND_MESSAGE, options: [...KIND_OPTIONS.map((option) => option.label), 'Cancel'], cancelButtonIndex: KIND_OPTIONS.length, tintColor: color.brand },
    (chosen) => {
      const option = KIND_OPTIONS[chosen];
      if (option) onPick(option.key);
    },
  );
  return true;
}

/** How hard a set was, 6 to 10, in a row of chips under it: one tap picks, and closes it. */
export function RpePicker({ label, value, onPick, onClose }: { label: string; value: number | null; onPick: (rpe: number | null) => void; onClose: () => void }) {
  return (
    <View style={styles.picker} accessibilityLabel={`${label}: how hard was it?`} role="group">
      <Txt variant="caption" color={color.labelSecondary}>
        {value !== null ? `RPE ${value}: ${rpeMeaning(value)}` : 'How hard was it? 10 is nothing left, 8 two more reps'}
      </Txt>
      <View style={styles.chips}>
        {RPE_VALUES.map((rpe) => (
          <Chip key={rpe} label={String(rpe)} selected={value === rpe} accessibilityLabel={`RPE ${rpe}: ${rpeMeaning(rpe)}`} onPress={() => onPick(rpe)} />
        ))}
        {value !== null ? <Chip label="Clear" action selected={false} onPress={() => onPick(null)} /> : <Chip label="Skip" action selected={false} onPress={onClose} />}
      </View>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    // In line with the set's numbers, under its number column.
    picker: { gap: space[2], paddingVertical: space[2], paddingLeft: 36 + space[2] },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  }),
);
