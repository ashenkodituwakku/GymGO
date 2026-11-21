/**
 * "Your notes" on a gym's page: a few lines only you see, kept on this
 * device. With GymGO Pro; without it, the fold says what it's for and
 * where to get it.
 */

import { StyleSheet, View } from 'react-native';
import { NOTE_LIMIT, useGymNote } from '@/lib/gymNotes';
import { color, space, themed } from '@/lib/theme';
import { Fold, PrimaryButton, TextField, Txt } from './ui';

export function GymNotes({ gymId, isPro, inSheet, onPro }: { gymId: string; isPro: boolean; inSheet: boolean; onPro: () => void }) {
  const note = useGymNote(gymId);
  const first = note.text.trim().split('\n')[0] ?? '';
  const summary = !isPro ? 'With GymGO Pro' : first ? first : 'Only you see these';
  return (
    <Fold icon="list" title="Your notes" summary={summary}>
      {isPro ? (
        <View style={styles.body}>
          <TextField
            label="Just for you"
            inSheet={inSheet}
            value={note.text}
            onChangeText={note.setText}
            editable={note.loaded}
            multiline
            maxLength={NOTE_LIMIT}
            placeholder="The door code, your locker, who to ask for…"
            style={styles.input}
          />
          <Txt variant="caption" color={color.labelSecondary}>
            {`Kept on this device and never sent anywhere. ${note.text.length} of ${NOTE_LIMIT} characters.`}
          </Txt>
        </View>
      ) : (
        <View style={styles.body}>
          <Txt variant="subhead" color={color.labelSecondary}>
            Keep a few lines on each gym, like the door code or who to ask for at the desk. Only you see them.
          </Txt>
          <PrimaryButton label="See GymGO Pro" icon="crown" tone="quiet" onPress={onPro} />
        </View>
      )}
    </Fold>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    body: { gap: space[2] },
    input: { minHeight: 88, textAlignVertical: 'top', paddingTop: space[2] },
  }),
);
