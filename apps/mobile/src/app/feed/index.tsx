/**
 * The friends' feed: the workouts your friends log, newest first, and yours
 * while you share them. Each card says what it was and how it went (time,
 * volume, sets, records, the best set of each exercise), and can be liked or
 * commented on; open one for every set and the comments.
 *
 * Sharing your own workouts is your choice and off until you turn it on
 * here. Friends then see the exercises, sets, times and records; never your
 * notes, and the gym only when they tag one (apps/server/src/feed.ts).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { FeedCard } from '@/components/FeedCard';
import { WeeklyChart } from '@/components/WeeklyChart';
import { Pressable } from '@/components/motion';
import { HeroMark } from '@/components/HeroMark';
import { Group, Row, TILE } from '@/components/ios';
import { PageScroll } from '@/components/PageScroll';
import { useGlassRedraw } from '@/components/Redrawn';
import { ScreenOptions } from '@/components/ScreenOptions';
import { ServerAwayCard } from '@/components/ServerAwayCard';
import { ListSkeleton } from '@/components/Skeleton';
import { Card, LiveLine, PrimaryButton, Txt } from '@/components/ui';
import { api, problemText, type FeedActivity, type FeedItem } from '@/lib/api';
import { feedWhen } from '@/lib/feed';
import { unitFor } from '@/lib/training';
import { useTrainingLog } from '@/lib/useTraining';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { LIMITED } from '@/lib/limited';
import { usePageTitle } from '@/lib/pageTitle';
import { color, face, radius, space, themed } from '@/lib/theme';

/** When you last saw the activity on your workouts, so what's come since is marked new. */
const SEEN_KEY = 'gymgo.feed-activity-seen.v1';
/** Activity listed before "Show all". */
const ACTIVITY_FIRST = 3;

export default function FeedScreen() {
  useGlassRedraw();
  const router = useRouter();
  const { account, prefs } = useApp();
  // One person's workouts (from a friend's page, or your own), or everyone's.
  const { person: personId, name: personName } = useLocalSearchParams<{ person?: string; name?: string }>();
  const only = personId ?? null;
  const [who, setWho] = useState<{ name: string; workouts: number } | null>(null);
  // Your own: "Your workouts", with your weeks drawn from your log.
  const mine = only !== null && account.account?.id === only;
  const title = only ? (who?.name ?? personName ?? 'Workouts') : 'Feed';
  const heading = mine ? 'Your workouts' : only ? `${title}’s workouts` : 'Feed';
  usePageTitle(heading);
  const log = useTrainingLog(mine ? account.token : null);
  const token = account.token;
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [sharing, setSharing] = useState<boolean | null>(null);
  const [friends, setFriends] = useState<number | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [activity, setActivity] = useState<FeedActivity[]>([]);
  const [seenAt, setSeenAt] = useState<string | null>(null);
  const [allActivity, setAllActivity] = useState(false);
  // The newest answer wins: a slow first page can't land over a refresh.
  const asked = useRef(0);

  const load = useCallback(() => {
    if (!token) return;
    const ask = ++asked.current;
    Promise.all([api.feed(token, null, only), api.friends(token).catch(() => null)])
      .then(([page, overview]) => {
        if (ask !== asked.current) return;
        setItems(page.items);
        setNext(page.next);
        setSharing(page.sharing);
        if (page.person) setWho({ name: page.person.person.displayName, workouts: page.person.workouts });
        const lately = page.activity ?? [];
        setActivity(lately);
        // What's new since last time stays marked while you're here; next time it's seen.
        AsyncStorage.getItem(SEEN_KEY)
          .then((before) => {
            setSeenAt(before);
            if (lately[0]) void AsyncStorage.setItem(SEEN_KEY, lately[0].at).catch(() => undefined);
          })
          .catch(() => undefined);
        if (overview) setFriends(overview.friends.length);
        setProblem(null);
      })
      .catch((error) => ask === asked.current && setProblem(problemText(error, 'Couldn’t reach GymGO. Try again in a moment.')));
  }, [token, only]);
  useFocusEffect(load);

  const older = async () => {
    if (!token || !next) return;
    setMore(true);
    try {
      const page = await api.feed(token, next, only);
      setItems((shown) => [...(shown ?? []), ...page.items.filter((item) => !(shown ?? []).some((had) => had.id === item.id))]);
      setNext(page.next);
    } catch (error) {
      setProblem(problemText(error));
    } finally {
      setMore(false);
    }
  };

  /** Like or take it back at once; put it back if the server says no. */
  const like = async (item: FeedItem) => {
    if (!token) return;
    const want = !item.liked;
    haptic.tap();
    const change = (liked: boolean, likes: number) => setItems((shown) => shown?.map((each) => (each.id === item.id ? { ...each, liked, likes } : each)) ?? shown);
    change(want, item.likes + (want ? 1 : -1));
    try {
      const answer = await api.likeWorkout(token, item.id, want);
      change(answer.liked, answer.likes);
    } catch (error) {
      haptic.warn();
      change(item.liked, item.likes);
      setProblem(problemText(error));
    }
  };

  const share = async (on: boolean) => {
    if (!token) return;
    setSwitching(true);
    try {
      await api.shareWorkouts(token, on);
      haptic.success();
      setSharing(on);
      load();
    } catch (error) {
      haptic.warn();
      setProblem(problemText(error));
    } finally {
      setSwitching(false);
    }
  };

  if (account.state === 'unreachable' || account.state === 'loading') {
    return (
      <PageScroll style={styles.page} contentContainerStyle={styles.content}>
        <ScreenOptions options={{ title: 'Feed' }} />
        {account.state === 'unreachable' ? <ServerAwayCard /> : <ListSkeleton rows={3} card label="Loading your friends’ workouts" />}
      </PageScroll>
    );
  }

  if (!token || !account.account) {
    return (
      <View style={styles.signedOut}>
        <ScreenOptions options={{ title: 'Feed' }} />
        <HeroMark icon="people" />
        <Txt variant="title2" style={styles.centre}>
          Train with your friends
        </Txt>
        <Txt variant="subhead" color={color.labelSecondary} style={styles.centre}>
          {LIMITED ? 'The feed comes with the full version of GymGO.' : 'Sign in to see your friends’ workouts, cheer them on, and share yours.'}
        </Txt>
        {!LIMITED && <PrimaryButton label="Sign in" onPress={() => router.push('/sign-in')} />}
      </View>
    );
  }

  const open = (item: FeedItem, comment = false) => {
    haptic.tap();
    router.push({ pathname: '/feed/[id]', params: { id: item.id, ...(comment ? { comment: '1' } : {}) } });
  };

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content}>
      <ScreenOptions options={{ title: heading }} />
      <LiveLine>
        {problem && (
          <Txt variant="footnote" color={color.noInk}>
            {problem}
          </Txt>
        )}
      </LiveLine>

      {/* Yours: your last 12 weeks, as bars. */}
      {mine && log.sessions.length > 0 && <WeeklyChart sessions={log.sessions} unit={unitFor(prefs.country)} />}

      {/* One person's: who, and how many. */}
      {only && who && (
        <Txt variant="subhead" color={color.labelSecondary}>
          {`${who.workouts} workout${who.workouts === 1 ? '' : 's'}`}
        </Txt>
      )}

      {/* Asked once, plainly, until you choose: what friends would see, and what they never do. */}
      {sharing === false && !only && (
        <Card style={styles.invite}>
          <Txt variant="headline">Share your workouts with friends</Txt>
          <Txt variant="subhead" color={color.labelSecondary}>
            Your friends see the workouts you log here, ones already logged included: the exercises, sets, time and records, and the gym when you tag one. Never your notes. Hide any one from its page, or stop sharing, whenever you like.
          </Txt>
          <PrimaryButton label="Share my workouts" busy={switching} onPress={() => void share(true)} />
        </Card>
      )}

      {/* Who liked or commented on yours lately. */}
      {activity.length > 0 && !only && (
        <Card style={styles.activity}>
          <Txt variant="headline" accessibilityRole="header">
            On your workouts
          </Txt>
          {(allActivity ? activity : activity.slice(0, ACTIVITY_FIRST)).map((entry) => {
            const fresh = seenAt === null || entry.at > seenAt;
            const what = entry.kind === 'like' ? `liked ${entry.workoutName}` : `commented on ${entry.workoutName}`;
            return (
              <Pressable
                key={`${entry.kind}-${entry.workoutId}-${entry.at}-${entry.person.id}`}
                onPress={() => router.push({ pathname: '/feed/[id]', params: { id: entry.workoutId } })}
                accessibilityRole="button"
                accessibilityLabel={`${fresh ? 'New: ' : ''}${entry.person.displayName} ${what}${entry.body ? `: ${entry.body}` : ''}, ${feedWhen(entry.at).toLowerCase()}`}
                style={({ pressed }) => [styles.activityRow, pressed && { backgroundColor: color.pressed }]}
              >
                <Avatar account={{ displayName: entry.person.displayName, avatarUrl: entry.person.avatarUrl }} size={32} variant="subhead" person={entry.person.displayName} />
                <View style={styles.flex}>
                  <Txt variant="subhead" numberOfLines={2}>
                    <Txt variant="subhead" style={face('semibold')}>
                      {entry.person.displayName}
                    </Txt>
                    {` ${what}`}
                  </Txt>
                  {entry.body && (
                    <Txt variant="footnote" color={color.labelSecondary} numberOfLines={2}>
                      {`“${entry.body}”`}
                    </Txt>
                  )}
                  <Txt variant="caption" color={color.labelSecondary}>
                    {feedWhen(entry.at)}
                  </Txt>
                </View>
                {fresh && <View style={styles.dot} />}
              </Pressable>
            );
          })}
          {activity.length > ACTIVITY_FIRST && !allActivity && <PrimaryButton label={`Show all ${activity.length}`} tone="quiet" onPress={() => setAllActivity(true)} />}
        </Card>
      )}

      {items === null && !problem && <ListSkeleton rows={3} card label="Loading your friends’ workouts" />}

      {items !== null && items.length === 0 && (
        <View style={styles.empty}>
          <HeroMark icon="workout" />
          <Txt variant="title2" style={styles.centre}>
            {friends === 0 ? 'Add a friend to start your feed' : 'No workouts here yet'}
          </Txt>
          <Txt variant="subhead" color={color.labelSecondary} style={styles.centre}>
            {friends === 0
              ? 'Their workouts show up here once they share them, and yours do for them.'
              : 'When your friends share their workouts, they show up here, newest first.'}
          </Txt>
          <PrimaryButton label={friends === 0 ? 'Add friends' : 'Your friends'} tone={friends === 0 ? undefined : 'quiet'} onPress={() => router.push('/friends')} />
        </View>
      )}

      {items?.map((item) => (
        <FeedCard key={item.id} item={item} onOpen={() => open(item)} onLike={() => void like(item)} onComment={() => open(item, true)} />
      ))}

      {next && <PrimaryButton label="Show older workouts" icon="history" tone="quiet" busy={more} onPress={() => void older()} />}

      {sharing === true && !only && (
        <Group footer="Friends see the exercises, sets, time and records of the workouts you log, and the gym when you tag one; never your notes. Hide one from its page.">
          <Row icon="people" tile={TILE.indigo} title="Share my workouts with friends" toggle={{ value: true, onChange: (on) => void share(on) }} />
        </Group>
      )}
    </PageScroll>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], gap: space[4], paddingBottom: space[8] * 2, width: '100%', maxWidth: 640, alignSelf: 'center' },
    signedOut: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3], padding: space[6], backgroundColor: color.groupedBackground },
    centre: { textAlign: 'center' },
    invite: { gap: space[3] },
    empty: { alignItems: 'center', gap: space[3], paddingVertical: space[6] },
    activity: { gap: space[1] },
    activityRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[2], marginHorizontal: -space[2], paddingHorizontal: space[2], borderRadius: radius.md },
    flex: { flex: 1, minWidth: 0 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.brand },
  }),
);
