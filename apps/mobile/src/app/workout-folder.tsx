/**
 * Folders for My workouts. Two jobs, by what it's opened with:
 *
 * - `id`: move that saved workout into one of your folders, a new one, or
 *   out of any folder.
 * - `rename`: rename that folder for all its workouts, or remove it (its
 *   workouts stay, in no folder).
 *
 * Moving and renaming are tidying, so they work on Free too, as deleting
 * does (PATCH /api/workouts/:id with only a folder; PATCH
 * /api/workouts/folders). Folders exist while a workout is in one
 * (lib/workoutFolders.ts).
 */

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Pressable } from '@/components/motion';
import { PageScroll } from '@/components/PageScroll';
import { useGlassRedraw } from '@/components/Redrawn';
import { ScreenOptions } from '@/components/ScreenOptions';
import { ListSkeleton } from '@/components/Skeleton';
import { LiveLine, PrimaryButton, TextField, Txt } from '@/components/ui';
import { api, failureText, type SavedWorkout } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { usePageTitle } from '@/lib/pageTitle';
import { libraryTitle } from '@/lib/savedWorkouts';
import { color, face, radius, space, themed } from '@/lib/theme';
import { folderNames, tidyFolder } from '@/lib/workoutFolders';

export default function WorkoutFolderScreen() {
  useGlassRedraw();
  const { id, rename } = useLocalSearchParams<{ id?: string; rename?: string }>();
  const renaming = typeof rename === 'string' && rename.length > 0;
  usePageTitle(renaming ? 'Rename folder' : 'Move to folder');
  const router = useRouter();
  const { account } = useApp();
  const token = account.token;
  const [workouts, setWorkouts] = useState<SavedWorkout[] | null>(null);
  const [name, setName] = useState(renaming ? rename : '');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    api
      .workouts(token)
      .then((result) => setWorkouts(result.workouts))
      .catch((error: unknown) => setProblem(failureText(error, 'Couldn’t load your workouts. Try again.')));
  }, [token]);
  useFocusEffect(load);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/workouts'));
  const run = async (job: () => Promise<unknown>) => {
    if (!token || busy) return;
    setBusy(true);
    setProblem(null);
    try {
      await job();
      haptic.success();
      close();
    } catch (error) {
      setProblem(failureText(error, 'Couldn’t save that. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  const workout = workouts?.find((item) => item.id === id) ?? null;
  const folders = workouts ? folderNames(workouts) : [];
  const countIn = (folder: string) => workouts?.filter((item) => item.folder === folder).length ?? 0;
  const typed = tidyFolder(name);

  if (!token) {
    return (
      <PageScroll style={styles.page} contentContainerStyle={styles.content}>
        <ScreenOptions options={{ title: '' }} />
        <Txt variant="subhead" color={color.labelSecondary}>
          Sign in to sort your workouts into folders.
        </Txt>
        <PrimaryButton label="Sign in" onPress={() => router.push('/sign-in')} />
      </PageScroll>
    );
  }

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content}>
      <ScreenOptions options={{ title: '' }} />
      <View style={styles.intro}>
        <Txt variant="largeTitle" accessibilityRole="header" level={1}>
          {renaming ? 'Rename folder' : 'Move to folder'}
        </Txt>
        {!renaming && workout && (
          <Txt variant="subhead" color={color.labelSecondary} numberOfLines={2}>
            {libraryTitle(workout.name, workout.plan.gymName)}
          </Txt>
        )}
      </View>

      {workouts === null && !problem && <ListSkeleton rows={3} label="Loading your folders" />}

      {renaming && workouts !== null && (
        <>
          <View style={styles.card}>
            <TextField label="Folder name" inSheet={false} value={name} onChangeText={setName} maxLength={40} autoFocus />
            <PrimaryButton
              label={busy ? 'Saving…' : 'Save name'}
              icon="check"
              disabled={busy || !typed || typed === rename}
              onPress={() => void run(() => api.renameWorkoutFolder(token, rename, typed))}
            />
          </View>
          <View style={styles.card}>
            <Txt variant="footnote" color={color.labelSecondary}>
              {`Its ${countIn(rename) === 1 ? 'workout stays' : `${countIn(rename)} workouts stay`}, just not in a folder.`}
            </Txt>
            <PrimaryButton label="Remove folder" icon="trash" tone="danger" disabled={busy} onPress={() => void run(() => api.renameWorkoutFolder(token, rename, null))} />
          </View>
        </>
      )}

      {!renaming && workouts !== null && !workout && (
        <Txt variant="subhead" color={color.labelSecondary}>
          That workout isn’t in My workouts any more.
        </Txt>
      )}

      {!renaming && workout && (
        <>
          {(folders.length > 0 || workout.folder) && (
            <View style={styles.group}>
              {folders.map((folder, index) => (
                <Choice
                  key={folder}
                  label={folder}
                  note={`${countIn(folder)} ${countIn(folder) === 1 ? 'workout' : 'workouts'}`}
                  icon="folder"
                  selected={workout.folder === folder}
                  first={index === 0}
                  disabled={busy}
                  onPress={() => (workout.folder === folder ? close() : void run(() => api.moveWorkout(token, workout.id, folder)))}
                />
              ))}
              {workout.folder && <Choice label="No folder" icon="list" selected={false} first={folders.length === 0} disabled={busy} onPress={() => void run(() => api.moveWorkout(token, workout.id, null))} />}
            </View>
          )}
          <View style={styles.card}>
            <TextField label="New folder" inSheet={false} value={name} onChangeText={setName} placeholder="Folder name" maxLength={40} />
            <PrimaryButton
              label={busy ? 'Moving…' : 'Create and move'}
              icon="plus"
              disabled={busy || !typed}
              onPress={() => typed && void run(() => api.moveWorkout(token, workout.id, typed))}
            />
          </View>
        </>
      )}

      <LiveLine>
        {problem && (
          <Txt variant="footnote" color={color.dangerInk}>
            {problem}
          </Txt>
        )}
      </LiveLine>
    </PageScroll>
  );
}

function Choice({ label, note, icon, selected, first, disabled, onPress }: { label: string; note?: string; icon: 'folder' | 'list'; selected: boolean; first: boolean; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={note ? `${label}, ${note}` : label}
      style={({ pressed }) => [styles.row, !first && styles.rowLine, pressed && styles.pressed]}
    >
      <View style={styles.badge}>
        <Icon name={icon} size={15} color={color.brand} />
      </View>
      <View style={styles.flex}>
        <Txt variant="body" numberOfLines={1} style={selected ? face('semibold') : undefined}>
          {label}
        </Txt>
        {note && (
          <Txt variant="footnote" color={color.labelSecondary}>
            {note}
          </Txt>
        )}
      </View>
      {selected && <Icon name="check" size={18} color={color.brand} />}
    </Pressable>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], gap: space[4], paddingBottom: space[8], width: '100%', maxWidth: 560, alignSelf: 'center' },
    intro: { gap: space[1] },
    card: { gap: space[3], padding: space[4], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.plate },
    group: { backgroundColor: color.plate, borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 52, paddingHorizontal: space[4], paddingVertical: space[2] },
    rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.separator },
    pressed: { backgroundColor: color.pressed },
    badge: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: color.brandTint },
    flex: { flex: 1, minWidth: 0 },
  }),
);
