/**
 * A friend: their cards (drawn as their phone draws them, from the look the
 * server worked out: no days), their totals, and an invite to train at a
 * gym at a time. The gyms offered are your saved ones, then gyms you've
 * both collected, then theirs.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import type { CollectionTotals, FriendCard } from '@gymgo/domain';
import { BrandFill } from '@/components/BrandFill';
import { GemCard } from '@/components/GemCard';
import { FeedCard } from '@/components/FeedCard';
import { HeadToHead } from '@/components/HeadToHead';
import { Pressy } from '@/components/motion';
import { PageScroll } from '@/components/PageScroll';
import { useGlassRedraw } from '@/components/Redrawn';
import { GymCardsSkeleton } from '@/components/Skeleton';
import { Chip, Input, PrimaryButton, Txt, LiveLine } from '@/components/ui';
import { ScreenOptions } from '@/components/ScreenOptions';
import { ApiError, api, problemText, type FeedItem } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { timeLabel } from '@/lib/copy';
import { INVITE_MINUTES, friendCardProps, inviteAt, inviteWhen } from '@/lib/friends';
import { haptic } from '@/lib/haptics';
import { usePageTitle } from '@/lib/pageTitle';
import { color, face, radius, space, themed } from '@/lib/theme';
import { useCollection } from '@/lib/useCollection';
import { unitFor } from '@/lib/training';

const COLUMN = 640;
const DAYS = 7;

export default function FriendScreen() {
  useGlassRedraw();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const { account, data, billing, prefs } = useApp();
  const mine = useCollection().gyms;
  const token = account.token;
  const { width } = useWindowDimensions();
  // As in your own collection: two cards a row on a phone, three where the page is wide enough.
  const columns = Math.min(width, COLUMN) >= 560 ? 3 : 2;
  const cardWidth = (Math.min(width, COLUMN) - space[4] * 2 - space[3] * (columns - 1)) / columns;
  const [friend, setFriend] = useState<{ name: string; totals: CollectionTotals; cards: FriendCard[] } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  usePageTitle(friend?.name ?? name ?? 'Friend');
  // Their latest workouts, when they share them (null: not yet asked; 'private': they don't share).
  const [workouts, setWorkouts] = useState<{ items: FeedItem[]; count: number } | 'private' | null>(null);
  useEffect(() => {
    if (!token || !id) return;
    let live = true;
    api
      .feed(token, null, id)
      .then((page) => live && setWorkouts({ items: page.items.slice(0, 3), count: page.person?.workouts ?? page.items.length }))
      .catch((error) => live && setWorkouts(error instanceof ApiError && error.status === 404 ? 'private' : null));
    return () => {
      live = false;
    };
  }, [token, id]);
  const like = async (item: FeedItem) => {
    if (!token || workouts === null || workouts === 'private') return;
    const want = !item.liked;
    const change = (liked: boolean, likes: number) =>
      setWorkouts((now) => (now && now !== 'private' ? { ...now, items: now.items.map((each) => (each.id === item.id ? { ...each, liked, likes } : each)) } : now));
    change(want, item.likes + (want ? 1 : -1));
    try {
      const answer = await api.likeWorkout(token, item.id, want);
      change(answer.liked, answer.likes);
    } catch {
      change(item.liked, item.likes);
    }
  };

  useEffect(() => {
    if (!token || !id) return;
    let live = true;
    api
      .friendCollection(token, id)
      .then((answer) => live && setFriend({ name: answer.friend.displayName, totals: answer.totals, cards: answer.cards }))
      .catch((error) => live && setProblem(problemText(error, 'Couldn’t load their collection.')));
    return () => {
      live = false;
    };
  }, [token, id]);

  // The invite.
  const [inviting, setInviting] = useState(false);
  const [gymId, setGymId] = useState<string | null>(null);
  const [day, setDay] = useState(1);
  const [minute, setMinute] = useState<number>(INVITE_MINUTES[3]);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const gymChoices = useMemo(() => {
    const names = new Map<string, string>();
    const nameOf = (gym: string) => data.records.find((record) => record.location.id === gym)?.location.name ?? mine[gym]?.name;
    for (const gym of account.saved) {
      const found = nameOf(gym);
      if (found) names.set(gym, found);
    }
    for (const card of friend?.cards ?? []) if (mine[card.id]) names.set(card.id, card.name);
    for (const card of friend?.cards ?? []) names.set(card.id, card.name);
    for (const entry of Object.values(mine)) names.set(entry.id, entry.name);
    return [...names.entries()].slice(0, 16).map(([gym, gymName]) => ({ id: gym, name: gymName }));
  }, [account.saved, data.records, friend, mine]);
  const picked = gymChoices.find((gym) => gym.id === gymId) ?? null;
  const when = inviteAt(day, minute);
  const past = when.getTime() < Date.now();

  const send = async () => {
    if (!token || !id || !picked) return;
    setSending(true);
    setSent(null);
    try {
      const invite = await api.invite(token, id, { gymId: picked.id, gymName: picked.name, at: when.toISOString(), ...(note.trim() ? { note: note.trim() } : {}) });
      haptic.success();
      setSent(`Invite sent: ${invite.gymName}, ${inviteWhen(invite.at)}. Their answer shows on Friends.`);
      setInviting(false);
      setNote('');
    } catch (error) {
      haptic.warn();
      setSent(problemText(error));
    } finally {
      setSending(false);
    }
  };

  const dayLabel = (offset: number) => (offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : inviteAt(offset, 0).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }));

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content}>
      <ScreenOptions options={{ title: friend?.name ?? name ?? 'Friend' }} />
      <LiveLine>
        {problem && (
          <Txt variant="footnote" color={color.noInk}>
            {problem}
          </Txt>
        )}
      </LiveLine>
      {friend && (
        // Their totals on the accent, like a plan's head.
        <View style={styles.hero}>
          <BrandFill round={radius.xl} />
          <Txt variant="label" color={color.onBrandSoft} numberOfLines={1}>
            {`${friend.name}’s collection`}
          </Txt>
          <View style={styles.stats}>
            <Stat first value={friend.totals.gyms} label={friend.totals.gyms === 1 ? 'gym' : 'gyms'} />
            <Stat value={friend.totals.cities} label={friend.totals.cities === 1 ? 'city' : 'cities'} />
            <Stat value={friend.totals.countries} label={friend.totals.countries === 1 ? 'country' : 'countries'} />
            <Stat value={friend.totals.visits} label={friend.totals.visits === 1 ? 'visit' : 'visits'} />
          </View>
        </View>
      )}

      {inviting ? (
        <View style={styles.invite}>
          <Txt variant="headline">Where?</Txt>
          {gymChoices.length === 0 ? (
            <Txt variant="footnote" color={color.labelSecondary}>
              Save a gym first (or collect one), and it shows up here.
            </Txt>
          ) : (
            <View style={styles.chips}>
              {gymChoices.map((gym) => (
                <Chip key={gym.id} label={gym.name} selected={gymId === gym.id} onPress={() => setGymId(gym.id)} />
              ))}
            </View>
          )}
          <Txt variant="headline">When?</Txt>
          <View style={styles.chips}>
            {Array.from({ length: DAYS }, (_, offset) => (
              <Chip key={offset} label={dayLabel(offset)} selected={day === offset} onPress={() => setDay(offset)} />
            ))}
          </View>
          <View style={styles.chips}>
            {INVITE_MINUTES.map((value) => (
              <Chip key={value} label={timeLabel(value)} selected={minute === value} onPress={() => setMinute(value)} />
            ))}
          </View>
          <Input value={note} onChangeText={setNote} placeholder="A note (optional): “Leg day?”" maxLength={200} accessibilityLabel="A note with the invite" style={styles.input} />
          <LiveLine>
            {past && (
              <Txt variant="footnote" color={color.maybeInk}>
                That time has passed today. Pick a later one, or another day.
              </Txt>
            )}
          </LiveLine>
          <PrimaryButton label={picked ? `Invite them: ${inviteWhen(when.toISOString())}` : 'Pick a gym'} icon="calendar" busy={sending} disabled={!picked || past} onPress={() => void send()} />
          <PrimaryButton label="Cancel" tone="quiet" onPress={() => setInviting(false)} />
        </View>
      ) : (
        <PrimaryButton label="Invite to train" icon="calendar" onPress={() => setInviting(true)} />
      )}
      <LiveLine>
        {sent && (
          <Txt variant="footnote" color={color.labelSecondary}>
            {sent}
          </Txt>
        )}
      </LiveLine>

      {/* Their workouts, newest first, when they share them. */}
      {workouts && workouts !== 'private' && workouts.items.length > 0 && (
        <>
          <View style={styles.sectionHead}>
            <Txt variant="eyebrow" color={color.labelSecondary} accessibilityRole="header" level={2}>
              {`WORKOUTS · ${workouts.count}`}
            </Txt>
            {workouts.count > workouts.items.length && (
              <Pressy
                onPress={() => router.push({ pathname: '/feed', params: { person: id, name: friend?.name ?? name ?? '' } })}
                accessibilityRole="link"
                accessibilityLabel={`See all ${workouts.count} of their workouts`}
                hitSlop={8}
              >
                <Txt variant="subhead" color={color.brand}>
                  See all
                </Txt>
              </Pressy>
            )}
          </View>
          {workouts.items.map((item) => (
            <FeedCard
              key={item.id}
              item={item}
              onOpen={() => router.push({ pathname: '/feed/[id]', params: { id: item.id } })}
              onLike={() => void like(item)}
              onComment={() => router.push({ pathname: '/feed/[id]', params: { id: item.id, comment: '1' } })}
            />
          ))}
        </>
      )}

      {/* Your best lifts beside theirs (Pro), from the workouts they share. */}
      {token && id && <HeadToHead token={token} friendId={id} friendName={friend?.name ?? name ?? 'Your friend'} pro={billing.isPro} unit={unitFor(prefs.country)} />}

      <Txt variant="eyebrow" color={color.labelSecondary} accessibilityRole="header" level={2} style={styles.section}>
        THEIR CARDS
      </Txt>
      {!friend && !problem && <GymCardsSkeleton count={2} width={cardWidth} label="Loading their cards" />}
      {friend && friend.cards.length === 0 && (
        <Txt variant="subhead" color={color.labelSecondary}>
          No cards yet. Invite them to train, and they can collect their first.
        </Txt>
      )}
      <View style={styles.grid}>
        {friend?.cards.map((card) => {
          const props = friendCardProps(card);
          return (
            <View key={card.id} style={{ width: cardWidth }}>
              <GemCard
                {...props}
                record={data.records.find((record) => record.location.id === card.id) ?? null}
                cover={data.covers[card.id] ?? null}
                width={cardWidth}
                onPress={() => router.push({ pathname: '/gym/[id]', params: { id: card.id } })}
              />
            </View>
          );
        })}
      </View>
      <Txt variant="footnote" color={color.labelSecondary} style={styles.note}>
        You see their cards and visit counts, never the days they went. Unfriend from Friends whenever you like.
      </Txt>
      {friend && (
        <PrimaryButton
          label={`Unfriend ${friend.name}`}
          tone="danger"
          onPress={async () => {
            if (!token || !id) return;
            try {
              await api.removeFriend(token, id);
              router.back();
            } catch (error) {
              setProblem(problemText(error));
            }
          }}
        />
      )}
    </PageScroll>
  );
}

function Stat({ value, label, first = false }: { value: number; label: string; first?: boolean }) {
  return (
    <View style={[styles.stat, !first && styles.statLine]} accessible accessibilityLabel={`${value} ${label}`}>
      <Txt variant="title" color={color.onBrand} style={face('bold')}>
        {value}
      </Txt>
      <Txt variant="caption" color={color.onBrandSoft}>
        {label}
      </Txt>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], paddingBottom: space[8], gap: space[3], width: '100%', maxWidth: COLUMN, alignSelf: 'center' },
    hero: { gap: space[3], padding: space[4], paddingTop: space[4] + 2, borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: color.brandFill },
    stats: { flexDirection: 'row' },
    stat: { flex: 1, minWidth: 0, alignItems: 'center', gap: 2 },
    statLine: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: color.onBrandFaint },
    invite: { gap: space[3], padding: space[4], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.plate },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    input: { height: 44, paddingHorizontal: space[3], borderRadius: radius.md, backgroundColor: color.fill, color: color.label, fontSize: 16 },
    section: { marginTop: space[2], marginLeft: space[4] },
    sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space[2], marginHorizontal: space[4] },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
    note: { paddingHorizontal: space[4], textAlign: 'center' },
  }),
);
