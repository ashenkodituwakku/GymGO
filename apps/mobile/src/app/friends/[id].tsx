/**
 * A friend: their cards (drawn as their phone draws them, from the look the
 * server worked out: no days), their totals, and an invite to train at a
 * gym at a time. The gyms offered are your saved ones, then gyms you've
 * both collected, then theirs.
 */

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import type { CollectionTotals, FriendCard } from '@gymgo/domain';
import { GemCard } from '@/components/GemCard';
import { PageScroll } from '@/components/PageScroll';
import { GymCardsSkeleton } from '@/components/Skeleton';
import { Chip, Input, PrimaryButton, Txt } from '@/components/ui';
import { api, problemText } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { timeLabel } from '@/lib/copy';
import { INVITE_MINUTES, friendCardProps, inviteAt, inviteWhen } from '@/lib/friends';
import { haptic } from '@/lib/haptics';
import { usePageTitle } from '@/lib/pageTitle';
import { color, face, radius, space, themed } from '@/lib/theme';
import { useCollection } from '@/lib/useCollection';

const COLUMN = 640;
const DAYS = 7;

export default function FriendScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const { account, data } = useApp();
  const mine = useCollection().gyms;
  const token = account.token;
  const { width } = useWindowDimensions();
  const cardWidth = (Math.min(width, COLUMN) - space[4] * 2 - space[3]) / 2;
  const [friend, setFriend] = useState<{ name: string; totals: CollectionTotals; cards: FriendCard[] } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  usePageTitle(friend?.name ?? name ?? 'Friend');

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
      <Stack.Screen options={{ title: friend?.name ?? name ?? 'Friend' }} />
      {problem && (
        <Txt variant="footnote" color={color.noInk}>
          {problem}
        </Txt>
      )}
      {friend && (
        <View style={styles.stats}>
          <Stat value={friend.totals.gyms} label={friend.totals.gyms === 1 ? 'gym' : 'gyms'} />
          <Stat value={friend.totals.cities} label={friend.totals.cities === 1 ? 'city' : 'cities'} />
          <Stat value={friend.totals.countries} label={friend.totals.countries === 1 ? 'country' : 'countries'} />
          <Stat value={friend.totals.visits} label={friend.totals.visits === 1 ? 'visit' : 'visits'} />
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
          {past && (
            <Txt variant="footnote" color={color.maybeInk}>
              That time has passed today. Pick a later one, or another day.
            </Txt>
          )}
          <PrimaryButton label={picked ? `Invite them: ${inviteWhen(when.toISOString())}` : 'Pick a gym'} icon="calendar" busy={sending} disabled={!picked || past} onPress={() => void send()} />
          <PrimaryButton label="Cancel" tone="quiet" onPress={() => setInviting(false)} />
        </View>
      ) : (
        <PrimaryButton label="Invite to train" icon="calendar" onPress={() => setInviting(true)} />
      )}
      {sent && (
        <Txt variant="footnote" color={color.labelSecondary}>
          {sent}
        </Txt>
      )}

      <Txt variant="eyebrow" color={color.labelSecondary} style={styles.section}>
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

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${value} ${label}`}>
      <Txt variant="title" style={face('bold')}>
        {value}
      </Txt>
      <Txt variant="caption" color={color.labelSecondary}>
        {label}
      </Txt>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], paddingBottom: space[8], gap: space[3], width: '100%', maxWidth: COLUMN, alignSelf: 'center' },
    stats: { flexDirection: 'row', gap: space[2] },
    stat: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: space[3], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.card },
    invite: { gap: space[3], padding: space[4], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.card },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    input: { height: 44, paddingHorizontal: space[3], borderRadius: radius.md, backgroundColor: color.fill, color: color.label, fontSize: 16 },
    section: { marginTop: space[2], marginLeft: space[4] },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
    note: { paddingHorizontal: space[4], textAlign: 'center' },
  }),
);
