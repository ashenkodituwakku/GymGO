/**
 * Your note on an exercise (lib/exerciseNotes.ts), pinned to it: in a
 * tinted box in every workout with it and on its page, a tap to change it;
 * while you're changing it, a field and Done. Kept on this device only.
 * Typed into a draft and kept when you're done, so the other exercises'
 * cards don't redraw with every key.
 */

import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { EXERCISE_NOTE_LIMIT, setExerciseNote, useExerciseNote } from '@/lib/exerciseNotes';
import { haptic } from '@/lib/haptics';
import { color, face, radius, space, themed } from '@/lib/theme';
import { Icon } from './Icon';
import { Pressable } from './motion';
import { Input, Txt } from './ui';

export function ExerciseNote({
  exerciseId,
  name,
  editing,
  onEditing,
  showAdd = false,
}: {
  exerciseId: string;
  name: string;
  editing: boolean;
  onEditing: (on: boolean) => void;
  /** With no note yet, a link to add one (on the exercise's page; the workout has its own Note button). */
  showAdd?: boolean;
}) {
  const note = useExerciseNote(exerciseId);
  const [draft, setDraft] = useState(note);
  // Opening starts from the note as it is.
  useEffect(() => {
    if (editing) setDraft(note);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);
  const keep = () => {
    setExerciseNote(exerciseId, draft);
    onEditing(false);
  };

  if (editing) {
    return (
      <View style={styles.edit}>
        <Input
          value={draft}
          onChangeText={setDraft}
          onBlur={keep}
          placeholder="Seat on 4, grip just outside the rings…"
          multiline
          maxLength={EXERCISE_NOTE_LIMIT}
          autoFocus
          accessibilityLabel={`Your note on ${name}`}
          style={styles.input}
        />
        <View style={styles.editFoot}>
          <Txt variant="caption" color={color.labelSecondary} style={styles.flex}>
            {/* Near the limit, how much room is left; clearing it removes the note. */}
            {`Shown each time you do it. Only on this device.${EXERCISE_NOTE_LIMIT - draft.length <= 50 ? ` ${EXERCISE_NOTE_LIMIT - draft.length} left.` : ''}`}
          </Txt>
          <Pressable onPress={keep} accessibilityRole="button" accessibilityLabel={`Done with the note on ${name}`} hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.6 }}>
            <Txt variant="footnote" color={color.brand} style={face('semibold')}>
              Done
            </Txt>
          </Pressable>
        </View>
      </View>
    );
  }
  if (!note) {
    if (!showAdd) return null;
    return (
      <Pressable
        onPress={() => {
          haptic.select();
          onEditing(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Add a note on ${name}`}
        style={({ pressed }) => [styles.add, pressed && { opacity: 0.6 }]}
      >
        <Icon name="note" size={13} color={color.brand} />
        <Txt variant="footnote" color={color.brand} style={face('semibold')}>
          Add a note
        </Txt>
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onEditing(true);
      }}
      accessibilityRole="button"
      accessibilityLabel={`Your note on ${name}: ${note}. Change it`}
      style={({ pressed }) => [styles.pinned, pressed && { opacity: 0.75 }]}
    >
      <Icon name="note" size={14} color={color.brand} />
      <Txt variant="footnote" style={styles.flex}>
        {note}
      </Txt>
    </Pressable>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    pinned: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2], padding: space[3], borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: color.brandTint },
    add: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: space[1] },
    edit: { gap: space[2] },
    input: { minHeight: 64, padding: space[3], borderRadius: radius.md, backgroundColor: color.fill, color: color.label, fontSize: 15, textAlignVertical: 'top' },
    editFoot: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  }),
);
