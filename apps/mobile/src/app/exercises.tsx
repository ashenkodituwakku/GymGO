/**
 * Exercises: every move GymGO plans, found by name or muscle and by the kit
 * you have (lib/exerciseLibrary.ts). Each opens its own page: how to do it,
 * what it works, what it needs, swaps for the same muscle, and your sets.
 * Your own exercises (Pro) head the list, with a way to make one; a search
 * or filter finds them among GymGO's.
 */

import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ExerciseTile } from '@/components/ExerciseGlyph';
import { Icon } from '@/components/Icon';
import { Pressable, Pressy } from '@/components/motion';
import { PageScroll } from '@/components/PageScroll';
import { useGlassRedraw } from '@/components/Redrawn';
import { Chip, Input, Txt } from '@/components/ui';
import { ScreenOptions } from '@/components/ScreenOptions';
import { useApp } from '@/lib/app-state';
import { KIT_FILTERS, groupLabel, kitText, libraryGroups, type KitFilter } from '@/lib/exerciseLibrary';
import { usePageTitle } from '@/lib/pageTitle';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';
import { personalRecords } from '@/lib/training';
import { useTrainingLog } from '@/lib/useTraining';
import { useOwnTraining } from '@/lib/ownTraining';
import { EXERCISES, MUSCLES, exerciseById, exerciseName, ownExercises, type Muscle } from '@/lib/workout';

export default function ExercisesScreen() {
  useGlassRedraw();
  usePageTitle('Exercises');
  const router = useRouter();
  const { account, billing, openPro } = useApp();
  const log = useTrainingLog(account.token);
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const [kit, setKit] = useState<KitFilter>('any');
  const browsing = query.trim() === '' && muscle === null && kit === 'any';
  // Yours: listed at the top while browsing, found among GymGO's by a search or filter.
  const ownState = useOwnTraining();
  const mine = useMemo(() => ownExercises(), [ownState]);
  const groups = useMemo(() => libraryGroups({ query, muscle, kit }, browsing ? EXERCISES : [...mine, ...EXERCISES]), [query, muscle, kit, browsing, mine]);
  const count = groups.reduce((sum, group) => sum + group.exercises.length, 0);
  // How many times you've done each, for a quiet "Done 4 times".
  const done = useMemo(() => personalRecords(log.sessions), [log.sessions]);
  // Your most-done moves, first: a strip to jump straight back to them.
  const yours = useMemo(
    () =>
      [...done]
        // GymGO's exercises and yours (a deleted one of yours no longer offered).
        .filter(([id]) => { const exercise = exerciseById(id); return exercise !== undefined && !exercise.own?.archived; })
        .sort(([, a], [, b]) => b.sessions - a.sessions)
        .slice(0, 8)
        .map(([id, record]) => ({ id, name: exerciseName(id), sessions: record.sessions })),
    [done],
  );
  const open = (id: string) => router.push({ pathname: '/progress/[exercise]', params: { exercise: id } });
  const makeOwn = () => (billing.isPro ? router.push('/exercise-edit') : openPro('exercises'));

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScreenOptions options={{ title: 'Exercises' }} />
      <View style={styles.search}>
        <Icon name="search" size={16} color={color.labelSecondary} />
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or muscle"
          accessibilityLabel="Search exercises by name or muscle"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
          style={styles.input}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Clear the search" hitSlop={10}>
            <Icon name="close" size={14} color={color.labelSecondary} />
          </Pressable>
        )}
      </View>

      {browsing && yours.length > 0 && (
        <View style={styles.section}>
          <Txt variant="eyebrow" color={color.labelSecondary} accessibilityRole="header" level={2} style={styles.eyebrow}>
            DONE MOST
          </Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.yours}>
            {yours.map((item) => (
              <Pressy
                key={item.id}
                scaleTo={0.96}
                onPress={() => open(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, done ${item.sessions} time${item.sessions === 1 ? '' : 's'}`}
                style={styles.yourCard}
              >
                <ExerciseTile exerciseId={item.id} size={48} />
                {/* Three lines and a wider card: at two, "Incline dumbbell press" lost its "press". */}
                <Txt variant="footnote" style={face('semibold')} numberOfLines={3}>
                  {item.name}
                </Txt>
                <Txt variant="caption" color={color.labelSecondary}>
                  {`${item.sessions}×`}
                </Txt>
              </Pressy>
            ))}
          </ScrollView>
        </View>
      )}

      {browsing && (
        <View style={styles.section}>
          <Txt variant="eyebrow" color={color.labelSecondary} accessibilityRole="header" level={2} style={styles.eyebrow}>
            {mine.length > 0 ? `YOUR OWN · ${mine.length}` : 'YOUR OWN'}
          </Txt>
          <View style={styles.group}>
            {mine.map((exercise, index) => (
              <Pressable
                key={exercise.id}
                onPress={() => open(exercise.id)}
                accessibilityRole="button"
                accessibilityLabel={`${exercise.name}, your own. ${kitText(exercise)}`}
                style={({ pressed }) => [styles.row, index > 0 && styles.rowLine, pressed && { backgroundColor: color.fill }]}
              >
                <ExerciseTile exerciseId={exercise.id} size={44} />
                <View style={styles.flex}>
                  <Txt variant="body" style={face('medium')} numberOfLines={2}>
                    {exercise.name}
                  </Txt>
                  <Txt variant="footnote" color={color.labelSecondary} numberOfLines={2}>
                    {kitText(exercise)}
                  </Txt>
                </View>
                <Icon name="chevron" size={13} color={color.labelTertiary} />
              </Pressable>
            ))}
            <Pressable
              onPress={makeOwn}
              accessibilityRole="button"
              accessibilityLabel={billing.isPro ? 'Make an exercise of your own' : 'Making your own exercises is part of GymGO Pro'}
              style={({ pressed }) => [styles.row, mine.length > 0 && styles.rowLine, pressed && { backgroundColor: color.fill }]}
            >
              <View style={styles.plus}>
                <Icon name="plus" size={18} color={color.brand} />
              </View>
              <View style={styles.flex}>
                <Txt variant="body" color={color.brand} style={face('semibold')}>
                  {billing.isPro ? 'Make your own exercise' : 'Make your own exercise · Pro'}
                </Txt>
                <Txt variant="footnote" color={color.labelSecondary}>
                  For a move GymGO doesn’t list, with its own records and history
                </Txt>
              </View>
            </Pressable>
          </View>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} accessibilityLabel="Kit">
        {KIT_FILTERS.map((item) => (
          <Chip key={item.id} label={item.label} selected={kit === item.id} onPress={() => setKit(item.id)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} accessibilityLabel="Muscle">
        <Chip label="Every muscle" selected={muscle === null} onPress={() => setMuscle(null)} />
        {MUSCLES.map((item) => (
          <Chip key={item.id} label={item.label} selected={muscle === item.id} onPress={() => setMuscle(muscle === item.id ? null : item.id)} />
        ))}
      </ScrollView>

      <Txt variant="footnote" color={color.labelSecondary}>
        {count === 0 ? 'No exercises match.' : `${count} exercise${count === 1 ? '' : 's'}`}
      </Txt>

      {count === 0 && (
        <View style={styles.empty}>
          <Icon name="search" size={28} color={color.labelTertiary} />
          <Txt variant="subhead" color={color.labelSecondary} style={styles.centre}>
            Try fewer words, another muscle or Any kit.
          </Txt>
        </View>
      )}

      {groups.map((group) => (
        <View key={group.muscle} style={styles.section}>
          <Txt variant="eyebrow" color={color.labelSecondary} accessibilityRole="header" level={2} style={styles.eyebrow}>
            {`${groupLabel(group.muscle).toUpperCase()} · ${group.exercises.length}`}
          </Txt>
          <View style={styles.group}>
            {group.exercises.map((exercise, index) => {
              const times = done.get(exercise.id)?.sessions ?? 0;
              return (
                <Pressable
                  key={exercise.id}
                  onPress={() => open(exercise.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${exercise.name}. ${kitText(exercise)}${times ? `. Done ${times} time${times === 1 ? '' : 's'}` : ''}`}
                  style={({ pressed }) => [styles.row, index > 0 && styles.rowLine, pressed && { backgroundColor: color.fill }]}
                >
                  <ExerciseTile exerciseId={exercise.id} size={44} />
                  <View style={styles.flex}>
                    <Txt variant="body" style={face('medium')} numberOfLines={2}>
                      {exercise.name}
                    </Txt>
                    <Txt variant="footnote" color={color.labelSecondary} numberOfLines={2}>
                      {kitText(exercise)}
                    </Txt>
                  </View>
                  {times > 0 && (
                    <View style={styles.badge}>
                      <Txt variant="caption" color={color.brand} style={face('semibold')}>
                        {`${times}×`}
                      </Txt>
                    </View>
                  )}
                  <Icon name="chevron" size={13} color={color.labelTertiary} />
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </PageScroll>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], paddingBottom: space[8], gap: space[3], width: '100%', maxWidth: 640, alignSelf: 'center' },
    search: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
      paddingHorizontal: space[3],
      minHeight: 44,
      borderRadius: radius.pill,
      backgroundColor: color.fill,
    },
    input: { flex: 1, minWidth: 0, fontSize: 17, paddingVertical: space[2], color: color.label, borderWidth: 0 },
    chips: { gap: space[2], paddingRight: space[4] },
    yours: { gap: space[2], paddingRight: space[4], paddingBottom: space[1] },
    yourCard: {
      width: 148,
      gap: space[1],
      padding: space[3],
      borderRadius: radius.lg,
      borderCurve: 'continuous',
      backgroundColor: color.plate,
      ...shadow.plate,
    },
    badge: { paddingHorizontal: space[2], paddingVertical: 3, borderRadius: radius.pill, backgroundColor: color.brandTint },
    plus: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: color.brandTint },
    section: { gap: space[2] },
    eyebrow: { marginTop: space[2], marginLeft: space[4] },
    group: { backgroundColor: color.plate, borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', ...shadow.plate },
    row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], paddingVertical: space[2] + 2, minHeight: 60 },
    rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.separator },
    flex: { flex: 1, minWidth: 0, gap: 2 },
    empty: { alignItems: 'center', gap: space[2], paddingVertical: space[6] },
    centre: { textAlign: 'center' },
  }),
);
