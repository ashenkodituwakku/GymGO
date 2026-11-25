/**
 * One workout from the friends' feed: who and when, the numbers, every
 * exercise with every set (and the records it broke), who liked it, and the
 * comments, with a box to add one. On your own: whether your friends can
 * see it, and a way to change it.
 *
 * A comment can be deleted by whoever wrote it and by whoever's workout
 * it's on; anyone else can report it to the team (apps/server/src/feed.ts).
 */

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View, type TextInputInstance } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { ExerciseGlyph } from '@/components/ExerciseGlyph';
import { FeedByline, FeedStats } from '@/components/FeedCard';
import { Icon } from '@/components/Icon';
import { Group, Row, TILE } from '@/components/ios';
import { Pressy } from '@/components/motion';
import { PageScroll } from '@/components/PageScroll';
import { PIcon } from '@/components/PIcon';
import { useGlassRedraw } from '@/components/Redrawn';
import { ScreenOptions } from '@/components/ScreenOptions';
import { ListSkeleton } from '@/components/Skeleton';
import { Card, Input, LiveLine, PrimaryButton, Txt } from '@/components/ui';
import { ApiError, api, problemText, type FeedComment, type FeedItem } from '@/lib/api';
import { startSession, useActiveSession } from '@/lib/activeSession';
import { againPlan } from '@/lib/again';
import { useApp } from '@/lib/app-state';
import { feedExerciseName, feedWhen, firstName, friendWorkoutPlan, likedLine, muscleSplit, recordsFor } from '@/lib/feed';
import { haptic } from '@/lib/haptics';
import { usePageTitle } from '@/lib/pageTitle';
import { RECORD_WORD, recordSet } from '@/lib/records';
import { formatWeight, isDoneSet, isTimedSet, setLine, setTags, unitFor, type LoggedSet, type NewRecord, type WeightUnit } from '@/lib/training';
import { color, face, radius, space, themed } from '@/lib/theme';
import { MaxBadge } from '@/components/MaxBadge';

const MAX_COMMENT = 300;

export default function FeedWorkoutScreen() {
  useGlassRedraw();
  const router = useRouter();
  const { id = '', comment: wantsComment } = useLocalSearchParams<{ id: string; comment?: string }>();
  const { account, prefs, billing } = useApp();
  const token = account.token;
  const active = useActiveSession();
  const [item, setItem] = useState<FeedItem | null>(null);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [gone, setGone] = useState(false);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  // Kept as one of yours (Pro: My workouts), as it was done. Declared with the others, before the early return for a workout that's gone.
  const [kept, setKept] = useState<'idle' | 'saving' | 'saved'>('idle');
  const box = useRef<TextInputInstance>(null);
  usePageTitle(item ? item.name : 'Workout');

  const load = useCallback(() => {
    if (!token || !id) return;
    api
      .feedItem(token, id)
      .then((answer) => {
        setItem(answer.item);
        setComments(answer.comments);
        setProblem(null);
        if (wantsComment) setTimeout(() => box.current?.focus(), 350);
      })
      .catch((error) => {
        if (error && typeof error === 'object' && 'status' in error && (error as { status: number }).status === 404) setGone(true);
        else setProblem(problemText(error, 'Couldn’t reach GymGO. Try again in a moment.'));
      });
  }, [token, id, wantsComment]);
  useFocusEffect(load);

  if (gone) {
    return (
      <View style={styles.gone}>
        <ScreenOptions options={{ title: 'Workout' }} />
        <Txt variant="title2" style={styles.centre}>
          This workout isn’t shared with you
        </Txt>
        <Txt variant="subhead" color={color.labelSecondary} style={styles.centre}>
          It may have been deleted or hidden, or you’re no longer friends.
        </Txt>
        <PrimaryButton label="Back to the feed" tone="quiet" onPress={() => (router.canGoBack() ? router.back() : router.replace('/feed'))} />
      </View>
    );
  }

  const like = async () => {
    if (!token || !item) return;
    const want = !item.liked;
    haptic.tap();
    const before = item;
    setItem({ ...item, liked: want, likes: item.likes + (want ? 1 : -1) });
    try {
      const answer = await api.likeWorkout(token, item.id, want);
      // Who liked it changes too: read it again.
      setItem((now) => (now ? { ...now, ...answer } : now));
      load();
    } catch (error) {
      haptic.warn();
      setItem(before);
      setProblem(problemText(error));
    }
  };

  const post = async () => {
    if (!token || !item || !draft.trim()) return;
    setPosting(true);
    setNote(null);
    try {
      const answer = await api.commentOnWorkout(token, item.id, draft);
      haptic.success();
      setComments((shown) => [...shown, answer.comment]);
      setItem((now) => (now ? { ...now, comments: now.comments + 1 } : now));
      setDraft('');
    } catch (error) {
      haptic.warn();
      setNote(problemText(error));
    } finally {
      setPosting(false);
    }
  };

  const remove = async (comment: FeedComment) => {
    if (!token) return;
    try {
      await api.deleteComment(token, comment.id);
      haptic.tap();
      setComments((shown) => shown.filter((each) => each.id !== comment.id));
      setItem((now) => (now ? { ...now, comments: Math.max(0, now.comments - 1) } : now));
      setNote('Comment deleted.');
    } catch (error) {
      setNote(problemText(error));
    }
  };

  const report = async (comment: FeedComment) => {
    if (!token) return;
    try {
      await api.reportComment(token, comment.id);
      haptic.success();
      setNote(`Reported ${firstName(comment.person)}’s comment to the GymGO team. Thanks for telling us.`);
    } catch (error) {
      setNote(problemText(error));
    }
  };

  const hide = async (hidden: boolean) => {
    if (!token || !item) return;
    try {
      await api.hideTraining(token, item.id, hidden);
      haptic.tap();
      setItem({ ...item, hidden });
    } catch (error) {
      setProblem(problemText(error));
    }
  };

  const liked = item ? likedLine(item) : '';
  const split = item ? muscleSplit(item.exercises) : [];
  // A friend's workout, to do yourself: the same exercises, sets and reps (theirs that they made themselves left out); your weights come from your own log.
  const plan = item && !item.you ? againPlan({ ...item, workoutId: null, gymId: null, exercises: item.exercises.filter((exercise) => !exercise.exerciseId.startsWith('mine-')) }) : null;
  const keep = async () => {
    if (!item || !token) return;
    if (!billing.isPro) {
      router.push({ pathname: '/pro', params: { reason: 'workouts' } });
      return;
    }
    const saving = friendWorkoutPlan(item);
    if (!saving) return;
    setKept('saving');
    try {
      await api.saveWorkout(token, { name: saving.name, gymId: null, plan: saving.plan });
      haptic.success();
      setKept('saved');
    } catch (error) {
      haptic.warn();
      setKept('idle');
      if (error instanceof ApiError && error.code === 'pro_required') router.push({ pathname: '/pro', params: { reason: 'workouts' } });
      else setProblem(problemText(error));
    }
  };
  const doIt = () => {
    if (!plan || !item) return;
    haptic.success();
    startSession({ ...plan, name: item.name, workoutId: null, gymId: null, gymName: null, unit: unitFor(prefs.country) });
    router.push('/train');
  };

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScreenOptions options={{ title: item?.name ?? 'Workout' }} />
      <LiveLine>
        {problem && (
          <Txt variant="footnote" color={color.noInk}>
            {problem}
          </Txt>
        )}
      </LiveLine>

      {!item && !problem && <ListSkeleton rows={4} card label="Loading the workout" />}

      {item && (
        <>
          <Card style={styles.card}>
            <FeedByline item={item} gym={false} />
            <Txt variant="title" accessibilityRole="header">
              {item.name}
            </Txt>
            {/* The gym it was at, when tagged: opens the gym. */}
            {item.gym && (
              <Pressy
                onPress={() => router.push({ pathname: '/gym/[id]', params: { id: item.gym!.id } })}
                accessibilityRole="link"
                accessibilityLabel={`At ${item.gym.name}. Open the gym`}
                style={styles.gymLink}
              >
                <Icon name="pin" size={14} color={color.brand} />
                <Txt variant="subhead" color={color.brand} style={face('semibold')} numberOfLines={1}>
                  {item.gym.name}
                </Txt>
              </Pressy>
            )}
            <FeedStats item={item} />
            <View style={styles.likeRow}>
              <Pressy
                onPress={() => void like()}
                accessibilityRole="button"
                accessibilityState={{ selected: item.liked }}
                accessibilityLabel={item.liked ? 'Liked. Take your like back' : item.you ? 'Like your workout' : `Like ${firstName(item.person)}’s workout`}
                style={[styles.likeButton, item.liked && styles.likeButtonOn]}
              >
                <PIcon name="heart" size={20} weight={item.liked ? 'fill' : 'regular'} color={item.liked ? color.danger : color.labelSecondary} />
                <Txt variant="subhead" color={item.liked ? color.dangerInk : color.label} style={face('semibold')}>
                  {item.liked ? 'Liked' : 'Like'}
                </Txt>
              </Pressy>
              {!!liked && (
                <Txt variant="footnote" color={color.labelSecondary} style={styles.flex}>
                  {liked}
                </Txt>
              )}
            </View>
          </Card>

          {/* Which muscles it worked, as shares of its sets. */}
          {split.length > 0 && (
            <Card style={styles.split}>
              <Txt variant="headline" accessibilityRole="header">
                Muscle split
              </Txt>
              {split.slice(0, 6).map((part) => (
                <View key={part.muscle} style={styles.splitRow} accessible accessibilityLabel={`${part.label}: ${Math.round(part.share * 100)}% of the sets`}>
                  <Txt variant="subhead" style={styles.splitLabel} numberOfLines={1}>
                    {part.label}
                  </Txt>
                  <View style={styles.splitTrack}>
                    <View style={[styles.splitFill, { width: `${Math.max(4, Math.round(part.share * 100))}%` }]} />
                  </View>
                  <Txt variant="footnote" color={color.labelSecondary} style={styles.splitShare}>
                    {`${Math.round(part.share * 100)}%`}
                  </Txt>
                </View>
              ))}
            </Card>
          )}

          {/* Do it yourself, or see how you stack up. */}
          {!item.you && (
            <Group footer={active ? 'Finish the workout you’re doing first, then you can start this one.' : 'The same exercises, sets and reps. Your weights come from your own log.'}>
              {plan && !active && <Row icon="play" tile={TILE.green} title="Do this workout" subtitle={`${plan.items.length} exercise${plan.items.length === 1 ? '' : 's'}, as ${firstName(item.person)} did it`} onPress={doIt} />}
              {plan && (
                <Row
                  icon={kept === 'saved' ? 'check' : 'save'}
                  tile={TILE.orange}
                  title={kept === 'saved' ? 'Saved to My workouts' : kept === 'saving' ? 'Saving…' : 'Save to my workouts'}
                  subtitle={kept === 'saved' ? 'Start it any time from My workouts' : billing.isPro ? 'Keep it, to do again' : 'Keep it, to do again (Pro)'}
                  onPress={kept === 'idle' ? () => void keep() : undefined}
                  chevron={kept === 'idle'}
                />
              )}
              <Row icon="compare" tile={TILE.indigo} title={`Head to head with ${firstName(item.person)}`} subtitle="Your best lifts beside theirs" onPress={() => router.push({ pathname: '/friends/[id]', params: { id: item.person.id, name: item.person.displayName } })} />
            </Group>
          )}

          {/* Every exercise, every set. */}
          {item.exercises.map((exercise, index) => {
            const records = recordsFor(item.records, exercise.exerciseId);
            return (
              <Card key={`${exercise.exerciseId}-${index}`} style={styles.exercise}>
                <View style={styles.exerciseHead}>
                  <View style={styles.glyph}>
                    <ExerciseGlyph exerciseId={exercise.name ? 'custom' : exercise.exerciseId} size={38} ink={color.label} accent={color.brand} />
                  </View>
                  <View style={styles.flex}>
                    <Txt variant="headline">{feedExerciseName(exercise)}</Txt>
                    {!!records && (
                      <View style={styles.records}>
                        <Icon name="trophy" size={13} color={color.maybeInk} />
                        <Txt variant="footnote" color={color.maybeInk} style={face('semibold')}>
                          {records}
                        </Txt>
                      </View>
                    )}
                  </View>
                </View>
                <SetTable sets={exercise.sets} unit={item.unit} records={item.records.filter((record) => record.exerciseId === exercise.exerciseId)} />
              </Card>
            );
          })}

          {/* Your own: whether your friends see it. */}
          {item.you && (
            <Group footer={item.hidden ? 'Only you can see this workout.' : 'While you share your workouts, your friends see this one, and its gym if you tagged one. Your notes stay private.'}>
              <Row icon="eyeOff" tile={TILE.indigo} title="Hide from friends" toggle={{ value: item.hidden === true, onChange: (on) => void hide(on) }} />
              <Row icon="photo" tile={TILE.green} title="Share as a picture" subtitle="Its numbers and exercises, on one card" onPress={() => router.push({ pathname: '/share-workout', params: { id: item.id } })} />
              <Row icon="note" tile={TILE.orange} title="Change this workout" subtitle="Its name, sets or times" onPress={() => router.push({ pathname: '/session-edit', params: { id: item.id } })} />
            </Group>
          )}

          {/* Comments, oldest first, and the box for yours. */}
          <View style={styles.comments}>
            <Txt variant="headline" accessibilityRole="header">
              {comments.length === 0 ? 'Comments' : `Comments (${comments.length})`}
            </Txt>
            {comments.length === 0 && (
              <Txt variant="subhead" color={color.labelSecondary}>
                {item.you ? 'No comments yet.' : `Be the first to say something to ${firstName(item.person)}.`}
              </Txt>
            )}
            {comments.map((comment) => (
              <View key={comment.id} style={styles.comment}>
                <Avatar account={{ displayName: comment.person.displayName, avatarUrl: comment.person.avatarUrl }} size={32} variant="subhead" person={comment.you ? undefined : comment.person.displayName} />
                <View style={styles.flex}>
                  <View style={styles.commentHead}>
                    <Txt variant="footnote" style={[styles.commentName, face('semibold')]} numberOfLines={1}>
                      {comment.you ? 'You' : comment.person.displayName}
                    </Txt>
                    {comment.person.max && <MaxBadge />}
                    <Txt variant="footnote" color={color.labelSecondary}>
                      {feedWhen(comment.createdAt)}
                    </Txt>
                  </View>
                  <Txt variant="subhead">
                    {comment.body}
                  </Txt>
                  <View style={styles.commentActions}>
                    {comment.canDelete && <SmallLink label="Delete" onPress={() => void remove(comment)} spoken={`Delete ${comment.you ? 'your' : `${firstName(comment.person)}’s`} comment`} />}
                    {!comment.you && <SmallLink label="Report" onPress={() => void report(comment)} spoken={`Report ${firstName(comment.person)}’s comment`} />}
                  </View>
                </View>
              </View>
            ))}
            <Card style={styles.composer}>
              <Input
                ref={box}
                value={draft}
                onChangeText={(text) => {
                  setDraft(text);
                  setNote(null);
                }}
                placeholder={item.you ? 'Reply to your friends' : `Say something to ${firstName(item.person)}`}
                multiline
                maxLength={MAX_COMMENT}
                accessibilityLabel="Your comment"
                style={styles.input}
              />
              <PrimaryButton label="Post" busy={posting} disabled={!draft.trim()} onPress={() => void post()} />
            </Card>
            <LiveLine>
              {note && (
                <Txt variant="footnote" color={color.labelSecondary}>
                  {note}
                </Txt>
              )}
            </LiveLine>
          </View>
        </>
      )}
    </PageScroll>
  );
}

/** Each set: its tag (W, 1, 2, D), the weight and reps (or a time or distance), how hard it was, and a trophy on the set that made a record. */
function SetTable({ sets, unit, records }: { sets: LoggedSet[]; unit: WeightUnit; records: NewRecord[] }) {
  const tags = setTags(sets);
  const done = sets.map((set, at) => ({ set, tag: tags[at]! })).filter(({ set }) => isDoneSet(set));
  // The set each record came from (the same set object, so it can be found among them).
  const made = new Map<LoggedSet, string>();
  const alone = { id: '', name: '', unit, startedAt: '', finishedAt: '', workoutId: null, gymId: null, exercises: [{ exerciseId: 'this', sets }] };
  for (const record of records) {
    const set = recordSet(alone, { ...record, exerciseId: 'this' });
    if (set && !made.has(set)) made.set(set, RECORD_WORD[record.kind]);
  }
  return (
    <View style={styles.sets}>
      {done.map(({ set, tag }, at) => (
        <View key={at} style={[styles.set, at % 2 === 0 && styles.setShaded]} accessible accessibilityLabel={`${tag.spoken}: ${isTimedSet(set) ? setLine(set, unit) : `${set.weight ? `${formatWeight(set.weight, unit)}, ` : ''}${set.reps} reps`}${set.rpe ? `, RPE ${set.rpe}` : ''}${made.has(set) ? `. ${made.get(set)}` : ''}`}>
          <Txt variant="subhead" color={set.kind ? color.maybeInk : color.labelSecondary} style={[styles.setTag, face('semibold')]}>
            {tag.tag}
          </Txt>
          <Txt variant="subhead" style={styles.flex}>
            {setLine(set, unit)}
          </Txt>
          {set.rpe !== undefined && (
            <Txt variant="footnote" color={color.labelSecondary}>
              {`RPE ${set.rpe}`}
            </Txt>
          )}
          {made.has(set) && <Icon name="trophy" size={15} color={color.maybeInk} />}
        </View>
      ))}
    </View>
  );
}

function SmallLink({ label, onPress, spoken }: { label: string; onPress: () => void; spoken: string }) {
  return (
    <Pressy onPress={onPress} accessibilityRole="button" accessibilityLabel={spoken} hitSlop={8} style={styles.smallLink}>
      <Txt variant="footnote" color={color.labelSecondary} style={face('semibold')}>
        {label}
      </Txt>
    </Pressy>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    // Room at the foot for GymPal's button, so it never sits over Post.
    content: { padding: space[4], gap: space[3], paddingBottom: space[8] * 3, width: '100%', maxWidth: 640, alignSelf: 'center' },
    gone: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3], padding: space[6], backgroundColor: color.groupedBackground },
    centre: { textAlign: 'center' },
    card: { gap: space[3] },
    flex: { flex: 1, minWidth: 0 },
    gymLink: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, marginTop: -space[2], minHeight: 28 },
    likeRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingTop: space[1] },
    likeButton: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: space[3], borderRadius: radius.pill, backgroundColor: color.fill },
    likeButtonOn: { backgroundColor: color.dangerTint },
    exercise: { gap: space[3] },
    split: { gap: space[2] },
    splitRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
    splitLabel: { width: 92 },
    splitTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: color.fill, overflow: 'hidden' },
    splitFill: { height: '100%', borderRadius: 4, backgroundColor: color.brand },
    splitShare: { width: 40, textAlign: 'right', fontVariant: ['tabular-nums'] },
    exerciseHead: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
    glyph: { width: 48, height: 48, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: color.fill, alignItems: 'center', justifyContent: 'center' },
    records: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    sets: { borderRadius: radius.md, overflow: 'hidden' },
    set: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[3], minHeight: 36 },
    setShaded: { backgroundColor: color.fill },
    setTag: { width: 24, textAlign: 'center' },
    comments: { gap: space[3], paddingTop: space[2] },
    comment: { flexDirection: 'row', gap: space[3], alignItems: 'flex-start' },
    // Who, a Max badge when they're on Max, and when.
    commentHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    commentName: { flexShrink: 1 },
    commentActions: { flexDirection: 'row', gap: space[4], marginTop: 2 },
    smallLink: { minHeight: 28, justifyContent: 'center' },
    composer: { flexDirection: 'row', alignItems: 'flex-end', gap: space[2], padding: space[3] },
    input: { flex: 1, minHeight: 44, maxHeight: 140 },
  }),
);
