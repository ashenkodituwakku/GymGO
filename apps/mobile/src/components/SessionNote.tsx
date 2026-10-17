/**
 * A note on a logged workout ("left knee a bit sore", "new shoes"): written
 * on the summary after Finish, or later from Progress. Saved to your
 * account (PATCH /api/training/:id), so it's in your log on every device,
 * in Download your data and in the CSV.
 */

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ApiError, api } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { color, face, radius, space, themed } from '@/lib/theme';
import type { TrainingSession } from '@/lib/training';
import { useTrainingLog } from '@/lib/useTraining';
import { Icon } from './Icon';
import { Pressable } from './motion';
import { Input, PrimaryButton, Txt } from './ui';

export const NOTE_LIMIT = 500;

export function SessionNote({ session, compact = false }: { session: TrainingSession; compact?: boolean }) {
  const { account } = useApp();
  const log = useTrainingLog(account.token);
  const [note, setNote] = useState(session.note ?? null);
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const save = async () => {
    if (draft === null || !account.token) return;
    setBusy(true);
    setProblem(null);
    try {
      const { session: saved } = await api.noteTraining(account.token, session.id, draft.trim() || null);
      setNote(saved.note ?? null);
      log.update(saved);
      setDraft(null);
      haptic.success();
    } catch (error) {
      setProblem(error instanceof ApiError ? error.message : 'Couldn’t save the note just now. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  if (draft !== null) {
    return (
      <View style={styles.editor}>
        <Input
          value={draft}
          onChangeText={setDraft}
          multiline
          autoFocus
          maxLength={NOTE_LIMIT}
          placeholder="How did it go? A niggle, new shoes, felt strong…"
          accessibilityLabel={`Note on ${session.name}`}
          style={styles.input}
        />
        <Txt variant="caption" color={draft.length > NOTE_LIMIT - 40 ? color.maybeInk : color.labelTertiary} style={styles.count}>
          {`${draft.length}/${NOTE_LIMIT}`}
        </Txt>
        {problem && (
          <Txt variant="footnote" color={color.dangerInk}>
            {problem}
          </Txt>
        )}
        <View style={styles.buttons}>
          <View style={styles.flex}>
            <PrimaryButton label="Cancel" tone="quiet" onPress={() => setDraft(null)} />
          </View>
          <View style={styles.flex}>
            <PrimaryButton label="Save note" busy={busy} onPress={() => void save()} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, compact && styles.compactWrap]}>
      {note && (
        <View style={styles.note} accessible accessibilityLabel={`Your note: ${note}`}>
          <Icon name="list" size={14} color={color.labelSecondary} />
          <Txt variant={compact ? 'footnote' : 'subhead'} style={styles.flex}>
            {note}
          </Txt>
        </View>
      )}
      <Pressable
        onPress={() => {
          haptic.select();
          setProblem(null);
          setDraft(note ?? '');
        }}
        accessibilityRole="button"
        hitSlop={8}
        style={({ pressed }) => [styles.link, pressed && { opacity: 0.6 }]}
      >
        <Txt variant="footnote" color={color.brand} style={face('semibold')}>
          {note ? 'Edit note' : 'Add a note'}
        </Txt>
      </Pressable>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    wrap: { gap: space[2], alignSelf: 'stretch' },
    compactWrap: { gap: space[1] },
    note: { flexDirection: 'row', gap: space[2], alignItems: 'flex-start', padding: space[3], borderRadius: radius.md, backgroundColor: color.fill },
    link: { alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' },
    editor: { gap: space[2], alignSelf: 'stretch' },
    input: {
      minHeight: 96,
      padding: space[3],
      borderRadius: radius.md,
      backgroundColor: color.fill,
      color: color.label,
      fontSize: 16,
      textAlignVertical: 'top',
    },
    count: { alignSelf: 'flex-end' },
    buttons: { flexDirection: 'row', gap: space[2] },
    flex: { flex: 1, minWidth: 0 },
  }),
);
