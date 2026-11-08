/**
 * Monthly challenge (server challenges.ts, domain challenges.ts): pick how
 * many days you'll train this month, and see how far you've got against
 * friends who joined too (their count and target only). Reaching it earns
 * the month's card, kept below. Nobody is in it, or seen in it, until they
 * join.
 */

import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { monthLabel } from '@gymgo/domain';
import { BrandFill } from '@/components/BrandFill';
import { Icon } from '@/components/Icon';
import { Pressable } from '@/components/motion';
import { PageScroll } from '@/components/PageScroll';
import { useGlassRedraw } from '@/components/Redrawn';
import { ScreenOptions } from '@/components/ScreenOptions';
import { ListSkeleton } from '@/components/Skeleton';
import { Card, PrimaryButton, Segmented, Txt } from '@/components/ui';
import { ApiError, api, type ChallengeView } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { usePageTitle } from '@/lib/pageTitle';
import { color, face, radius, space, themed } from '@/lib/theme';
import { useTapAgain } from '@/lib/tapAgain';

const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

/** Days left in the month, today included. */
function daysLeft(month: string, now = new Date()): number {
  const [year, number] = month.split('-').map(Number);
  const last = new Date(year!, number!, 0).getDate();
  return Math.max(0, last - now.getDate() + 1);
}

export default function ChallengesScreen() {
  useGlassRedraw();
  usePageTitle('Monthly challenge');
  const router = useRouter();
  const { account } = useApp();
  const token = account.state === 'signed_in' ? account.token : null;
  const [view, setView] = useState<ChallengeView | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [target, setTarget] = useState(12);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useTapAgain();

  const load = useCallback(() => {
    if (!token) return;
    api
      .challenges(token, timeZone())
      .then((next) => {
        setView(next);
        if (next.mine) setTarget(next.mine.target);
      })
      .catch((error: unknown) => setProblem(error instanceof ApiError ? error.message : 'Can’t reach GymGO right now.'));
  }, [token]);
  useEffect(load, [load]);

  const join = async () => {
    if (!token || !view) return;
    setBusy(true);
    setProblem(null);
    try {
      setView(await api.joinChallenge(token, view.month, target, timeZone()));
      haptic.success();
    } catch (error) {
      setProblem(error instanceof ApiError ? error.message : 'Can’t reach GymGO right now.');
    } finally {
      setBusy(false);
    }
  };
  const leave = async () => {
    if (!token || !view) return;
    if (!leaving) return setLeaving(true);
    await api.leaveChallenge(token, view.month).catch(() => undefined);
    setLeaving(false);
    load();
  };

  if (!token) {
    return (
      <PageScroll style={styles.page} contentContainerStyle={styles.content}>
        <ScreenOptions options={{ title: 'Monthly challenge' }} />
        <Txt variant="subhead" color={color.labelSecondary}>
          Sign in to take on a monthly challenge with your friends.
        </Txt>
        <PrimaryButton label="Sign in" onPress={() => router.push('/sign-in')} />
      </PageScroll>
    );
  }

  const label = view ? monthLabel(view.month) : '';
  const mine = view?.mine ?? null;
  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content}>
      <ScreenOptions options={{ title: 'Monthly challenge' }} />
      <View style={styles.intro}>
        <Txt variant="largeTitle" accessibilityRole="header" level={1}>
          {view ? label : 'Monthly challenge'}
        </Txt>
        <Txt variant="subhead" color={color.labelSecondary}>
          Pick how many days you’ll train this month. A day counts once you log a workout on it. Friends who join see your count and target, nothing more.
        </Txt>
      </View>
      {!view && !problem && <ListSkeleton rows={3} label="Loading this month’s challenge" />}
      {problem && (
        <Txt variant="footnote" color={color.dangerInk}>
          {problem}
        </Txt>
      )}
      {view && mine?.finished && <ChallengeCard month={view.month} target={mine.target} />}
      {view && mine && !mine.finished && (
        <Card style={styles.card}>
          <Txt variant="headline">{`${mine.days} of ${mine.target} days`}</Txt>
          <Bar value={mine.days} of={mine.target} />
          <Txt variant="subhead" color={color.labelSecondary}>
            {mine.target - mine.days > daysLeft(view.month)
              ? `${daysLeft(view.month)} days left: out of reach this month, but every day still counts.`
              : `${mine.target - mine.days} to go, with ${daysLeft(view.month)} days left in ${label.split(' ')[0]}.`}
          </Txt>
        </Card>
      )}
      {view && !mine?.finished && (
        <Card style={styles.card}>
          <Txt variant="headline">{mine ? 'Change your target' : `Train on how many days in ${label.split(' ')[0]}?`}</Txt>
          {/* One row of equal choices, as the programme's days a week (as chips, 20 days sat alone on a second line). */}
          <Segmented options={view.targets.map((option) => ({ value: option, label: `${option} days` }))} value={target} onChange={setTarget} />
          <PrimaryButton label={mine ? (mine.target === target ? 'Keep it' : `Make it ${target} days`) : `Join: ${target} days`} icon="target" busy={busy} disabled={mine?.target === target} onPress={() => void join()} />
        </Card>
      )}
      {view && view.friends.length > 0 && (
        <Card style={styles.card}>
          <Txt variant="headline">With your friends</Txt>
          {view.friends.map((friend) => (
            <View key={`${friend.displayName}-${friend.you}`} style={styles.friend} accessible accessibilityLabel={`${friend.you ? 'You' : friend.displayName}: ${friend.days} of ${friend.target} days${friend.finished ? ', done' : ''}`}>
              <View style={styles.friendHead}>
                <Txt variant="subhead" style={[styles.flex, friend.you && face('semibold')]}>
                  {friend.you ? 'You' : friend.displayName}
                </Txt>
                <Txt variant="footnote" color={friend.finished ? color.goodInk : color.labelSecondary}>
                  {friend.finished ? `Done: ${friend.days} days` : `${friend.days} of ${friend.target}`}
                </Txt>
              </View>
              <Bar value={friend.days} of={friend.target} />
            </View>
          ))}
        </Card>
      )}
      {view && view.friends.length === 0 && (
        <Txt variant="footnote" color={color.labelSecondary}>
          None of your friends has joined this month yet. Add friends with your code (Profile → Friends), and they can join too.
        </Txt>
      )}
      {view && view.cards.filter((card) => card.month !== view.month || !mine?.finished).length > 0 && (
        <>
          <Txt variant="eyebrow" color={color.labelSecondary}>
            YOUR CARDS
          </Txt>
          {view.cards
            .filter((card) => card.month !== view.month || !mine?.finished)
            .map((card) => (
              <ChallengeCard key={card.month} month={card.month} target={card.target} small />
            ))}
        </>
      )}
      {view && mine && (
        <PrimaryButton label={leaving ? 'Tap again to leave' : mine.finished ? 'Leave (the card goes too)' : 'Leave this month’s challenge'} tone="danger" onPress={() => void leave()} />
      )}
    </PageScroll>
  );
}

function Bar({ value, of }: { value: number; of: number }) {
  const share = Math.min(1, of > 0 ? value / of : 0);
  return (
    <View style={styles.track} aria-hidden>
      <View style={[styles.fill, { width: `${Math.max(share > 0 ? 4 : 0, Math.round(share * 100))}%` }]} />
    </View>
  );
}

/** The card for a month you finished. */
function ChallengeCard({ month, target, small = false }: { month: string; target: number; small?: boolean }) {
  const label = monthLabel(month);
  return (
    <View style={[styles.prize, small && styles.prizeSmall]}>
      <BrandFill round={radius.xl} />
      {/* The words as one, read out together; the Share button stays its own. */}
      <View style={styles.prizeWords} accessible accessibilityLabel={`Challenge card: ${label}, trained on ${target} days`}>
        <View style={styles.prizeTop}>
          <Icon name="trophy" size={small ? 22 : 30} color={color.onBrand} />
          <Txt variant="label" color={color.onBrandSoft}>
            Monthly challenge
          </Txt>
        </View>
        <Txt variant={small ? 'title2' : 'largeTitle'} color={color.onBrand}>
          {label}
        </Txt>
        <Txt variant="headline" color={color.onBrand}>{`Trained on ${target} days`}</Txt>
      </View>
      {!small && (
        <Pressable
          onPress={() => void Share.share({ message: `I trained on ${target} days in ${label} with GymGO.` }).catch(() => undefined)}
          accessibilityRole="button"
          accessibilityLabel={`Share your ${label} card`}
          style={({ pressed }) => [styles.share, pressed && { opacity: 0.8 }]}
        >
          <Icon name="share" size={15} color={color.onBrand} />
          <Txt variant="subhead" color={color.onBrand} style={face('semibold')}>
            Share it
          </Txt>
        </Pressable>
      )}
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], paddingBottom: space[8], gap: space[3], width: '100%', maxWidth: 560, alignSelf: 'center' },
    intro: { gap: space[1] },
    card: { gap: space[3] },
    flex: { flex: 1, minWidth: 0 },
    friend: { gap: 6 },
    friendHead: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    track: { height: 8, borderRadius: 4, backgroundColor: color.fill, overflow: 'hidden' },
    fill: { height: 8, borderRadius: 4, backgroundColor: color.brandFill },
    prize: { gap: space[2], padding: space[5], borderRadius: radius.xl, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: color.brandFill },
    prizeSmall: { padding: space[4] },
    prizeWords: { gap: space[2] },
    prizeTop: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    share: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: space[2],
      minHeight: 40,
      paddingHorizontal: space[4],
      borderRadius: radius.pill,
      backgroundColor: color.onBrandFaint,
    },
  }),
);
