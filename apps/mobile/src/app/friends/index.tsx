/**
 * Friends: your friend code to send, a box for theirs, requests both ways,
 * invites to train, and your friends (open one for their cards, or to
 * invite them). Friends see your cards and totals, never the days you
 * trained; see apps/server/src/social.ts.
 */

import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { PageScroll } from '@/components/PageScroll';
import { ListSkeleton } from '@/components/Skeleton';
import { Card, Input, PrimaryButton, Txt } from '@/components/ui';
import { shareText } from '@/lib/actions';
import { api, problemText, type FriendsOverview, type Person, type TrainInvite } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { inviteWhen } from '@/lib/friends';
import { haptic } from '@/lib/haptics';
import { usePageTitle } from '@/lib/pageTitle';
import { color, face, radius, space, themed } from '@/lib/theme';

export default function FriendsScreen() {
  usePageTitle('Friends');
  const router = useRouter();
  const { account } = useApp();
  const token = account.token;
  const [view, setView] = useState<FriendsOverview | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    api
      .friends(token)
      .then((answer) => {
        setView(answer);
        setProblem(null);
      })
      .catch((error) => setProblem(problemText(error, 'Couldn’t reach GymGO. Try again in a moment.')));
  }, [token]);
  useFocusEffect(load);

  const act = async (work: () => Promise<unknown>, done?: string) => {
    try {
      await work();
      if (done) setNote(done);
      load();
    } catch (error) {
      haptic.warn();
      setNote(problemText(error));
    }
  };

  const add = async () => {
    if (!token || !code.trim()) return;
    setAdding(true);
    setNote(null);
    try {
      const answer = await api.addFriend(token, code);
      haptic.success();
      setCode('');
      setNote(answer.status === 'accepted' ? `You and ${answer.friend.displayName} are friends now.` : `Asked ${answer.friend.displayName}. You’ll be friends once they accept.`);
      load();
    } catch (error) {
      haptic.warn();
      setNote(problemText(error));
    } finally {
      setAdding(false);
    }
  };

  if (!token || !account.account) {
    return (
      <View style={styles.signedOut}>
        <Stack.Screen options={{ title: 'Friends' }} />
        <Icon name="people" size={40} color={color.brand} />
        <Txt variant="title2" style={styles.centre}>
          Collect with friends
        </Txt>
        <Txt variant="subhead" color={color.labelSecondary} style={styles.centre}>
          Sign in to add friends by code, see each other’s cards, and invite each other to train.
        </Txt>
        <PrimaryButton label="Sign in" onPress={() => router.push('/sign-in')} />
      </View>
    );
  }

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Friends' }} />
      {problem && (
        <Txt variant="footnote" color={color.noInk}>
          {problem}
        </Txt>
      )}

      <Card style={styles.card}>
        <Txt variant="headline">Your friend code</Txt>
        <View style={styles.codeRow}>
          <Txt variant="title" style={[face('bold'), styles.code]}>
            {view?.code ?? '····-····'}
          </Txt>
          <Pressable
            onPress={() => view && void shareText(`Add me on GymGO: my friend code is ${view.code}`, 'My GymGO friend code')}
            accessibilityRole="button"
            accessibilityLabel="Send your friend code"
            hitSlop={8}
            style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}
          >
            <Icon name="share" size={18} color={color.brand} />
          </Pressable>
        </View>
        <Txt variant="footnote" color={color.labelSecondary}>
          Send it to a friend. They add it, you accept, and you can see each other’s cards. Never the days you trained.
        </Txt>
      </Card>

      <Card style={styles.card}>
        <Txt variant="headline">Add a friend</Txt>
        <View style={styles.addRow}>
          <Input
            value={code}
            onChangeText={setCode}
            placeholder="e.g. K7QM-2XPH"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={12}
            accessibilityLabel="Your friend’s code"
            onSubmitEditing={() => void add()}
            style={styles.input}
          />
          <PrimaryButton label="Add" busy={adding} disabled={!code.trim()} onPress={() => void add()} />
        </View>
        {note && (
          <Txt variant="footnote" color={color.labelSecondary}>
            {note}
          </Txt>
        )}
      </Card>

      {view && view.incoming.length > 0 && (
        <Section title="Asked to be your friend">
          {view.incoming.map((who) => (
            <PersonRow key={who.id} person={who}>
              <SmallButton label="Accept" onPress={() => void act(() => api.acceptFriend(token, who.id), `You and ${who.displayName} are friends now.`)} />
              <SmallButton label="No" quiet onPress={() => void act(() => api.removeFriend(token, who.id))} />
            </PersonRow>
          ))}
        </Section>
      )}

      {view && view.invites.incoming.length > 0 && (
        <Section title="Invites to train">
          {view.invites.incoming.map((invite) => (
            <InviteRow key={invite.id} invite={invite} mine={false}>
              {invite.answer ? (
                <Txt variant="footnote" color={invite.answer === 'yes' ? color.goodInk : color.labelSecondary} style={face('semibold')}>
                  {invite.answer === 'yes' ? 'You’re going' : 'You said no'}
                </Txt>
              ) : (
                <>
                  <SmallButton label="I’m in" onPress={() => void act(() => api.answerInvite(token, invite.id, 'yes'))} />
                  <SmallButton label="Can’t" quiet onPress={() => void act(() => api.answerInvite(token, invite.id, 'no'))} />
                </>
              )}
            </InviteRow>
          ))}
        </Section>
      )}

      <Section title={view ? `Friends (${view.friends.length})` : 'Friends'}>
        {!view && !problem && <ListSkeleton rows={2} card={false} label="Loading your friends" />}
        {view && view.friends.length === 0 && (
          <Txt variant="subhead" color={color.labelSecondary}>
            No friends yet. Send your code, or add theirs above.
          </Txt>
        )}
        {view?.friends.map((friend) => (
          <Pressable
            key={friend.id}
            onPress={() => {
              haptic.tap();
              router.push({ pathname: '/friends/[id]', params: { id: friend.id, name: friend.displayName } });
            }}
            accessibilityRole="button"
            accessibilityLabel={`${friend.displayName}: ${friend.totals.gyms} gyms in ${friend.totals.cities} cities. See their cards`}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.fill }]}
          >
            <Avatar account={{ displayName: friend.displayName, avatarUrl: friend.avatarUrl }} size={40} variant="headline" />
            <View style={styles.flex}>
              <Txt variant="headline" numberOfLines={1}>
                {friend.displayName}
              </Txt>
              <Txt variant="footnote" color={color.labelSecondary}>
                {`${friend.totals.gyms} gym${friend.totals.gyms === 1 ? '' : 's'} · ${friend.totals.cities} cit${friend.totals.cities === 1 ? 'y' : 'ies'} · ${friend.totals.visits} visit${friend.totals.visits === 1 ? '' : 's'}`}
              </Txt>
            </View>
            <Icon name="chevron" size={14} color={color.labelTertiary} />
          </Pressable>
        ))}
      </Section>

      {view && view.invites.outgoing.length > 0 && (
        <Section title="Invites you sent">
          {view.invites.outgoing.map((invite) => (
            <InviteRow key={invite.id} invite={invite} mine>
              <Txt variant="footnote" color={invite.answer === 'yes' ? color.goodInk : color.labelSecondary} style={face('semibold')}>
                {invite.answer === 'yes' ? 'Going' : invite.answer === 'no' ? 'Can’t make it' : 'No answer yet'}
              </Txt>
              <SmallButton label="Cancel" quiet onPress={() => void act(() => api.cancelInvite(token, invite.id))} />
            </InviteRow>
          ))}
        </Section>
      )}

      {view && view.outgoing.length > 0 && (
        <Section title="Waiting for them to accept">
          {view.outgoing.map((who) => (
            <PersonRow key={who.id} person={who}>
              <SmallButton label="Take back" quiet onPress={() => void act(() => api.removeFriend(token, who.id))} />
            </PersonRow>
          ))}
        </Section>
      )}

      <PrimaryButton label="Leaderboard" icon="trophy" tone="quiet" onPress={() => router.push('/leaderboard')} />
    </PageScroll>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Txt variant="eyebrow" color={color.labelSecondary} style={styles.sectionTitle}>
        {title.toUpperCase()}
      </Txt>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function PersonRow({ person, children }: { person: Person; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Avatar account={{ displayName: person.displayName, avatarUrl: person.avatarUrl }} size={36} variant="subhead" />
      <Txt variant="headline" numberOfLines={1} style={styles.flex}>
        {person.displayName}
      </Txt>
      {children}
    </View>
  );
}

function InviteRow({ invite, mine, children }: { invite: TrainInvite; mine: boolean; children: React.ReactNode }) {
  const who = mine ? invite.to : invite.from;
  return (
    <View style={[styles.row, styles.inviteRow]}>
      <Avatar account={{ displayName: who.displayName, avatarUrl: who.avatarUrl }} size={36} variant="subhead" />
      <View style={styles.flex}>
        <Txt variant="subhead" style={face('semibold')} numberOfLines={2}>
          {mine ? `You invited ${who.displayName}` : `${who.displayName} invited you`}
        </Txt>
        <Txt variant="footnote" color={color.labelSecondary} numberOfLines={2}>
          {`${invite.gymName} · ${inviteWhen(invite.at)}`}
        </Txt>
        {invite.note && (
          <Txt variant="footnote" numberOfLines={3}>
            {`“${invite.note}”`}
          </Txt>
        )}
        <View style={styles.inviteActions}>{children}</View>
      </View>
    </View>
  );
}

function SmallButton({ label, quiet = false, onPress }: { label: string; quiet?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="button"
      style={({ pressed }) => [styles.small, quiet ? styles.smallQuiet : styles.smallBrand, pressed && { opacity: 0.7 }]}
    >
      <Txt variant="footnote" color={quiet ? color.brand : color.onBrand} style={face('semibold')}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], paddingBottom: space[8], gap: space[3], width: '100%', maxWidth: 560, alignSelf: 'center' },
    signedOut: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3], padding: space[6], backgroundColor: color.groupedBackground },
    centre: { textAlign: 'center' },
    flex: { flex: 1, minWidth: 0 },
    card: { gap: space[2] },
    codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] },
    code: { letterSpacing: 2 },
    iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: color.brandTint },
    addRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    input: { flex: 1, minWidth: 0, height: 48, paddingHorizontal: space[3], borderRadius: radius.md, backgroundColor: color.fill, color: color.label, fontSize: 17 },
    section: { gap: space[2], marginTop: space[2] },
    sectionTitle: { marginLeft: space[4] },
    sectionBody: { borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.card, overflow: 'hidden', padding: space[1] },
    row: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3], borderRadius: radius.md },
    inviteRow: { alignItems: 'flex-start' },
    inviteActions: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[2], flexWrap: 'wrap' },
    small: { paddingHorizontal: space[3], paddingVertical: 6, borderRadius: radius.pill },
    smallBrand: { backgroundColor: color.brandFill },
    smallQuiet: { backgroundColor: color.brandTint },
  }),
);
