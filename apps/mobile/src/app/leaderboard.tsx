/**
 * Leaderboards: most gyms collected, then most visits. "Everyone" lists
 * only people who joined it, by display name, and you join or leave with
 * the switch at the top; "Friends" is you and your friends, who can see
 * each other's collections anyway. Either for every gym, or for the city
 * you're searching. Ranked on the server (apps/server/src/social.ts).
 */

import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { PageScroll } from '@/components/PageScroll';
import { ListSkeleton } from '@/components/Skeleton';
import { Card, PrimaryButton, Segmented, Txt } from '@/components/ui';
import { api, problemText, type Board, type BoardEntry } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { cityFor } from '@/lib/collection';
import { haptic } from '@/lib/haptics';
import { usePageTitle } from '@/lib/pageTitle';
import { color, face, radius, space, themed } from '@/lib/theme';
import { syncCollection } from '@/lib/useCollection';

const MEDAL = ['#C9971C', '#8E959E', '#B0713A'];

export default function LeaderboardScreen() {
  usePageTitle('Leaderboard');
  const router = useRouter();
  const { account, filters } = useApp();
  const token = account.token;
  const [scope, setScope] = useState<'everyone' | 'friends'>('everyone');
  const [area, setArea] = useState<'all' | 'city'>('all');
  const [board, setBoard] = useState<Board | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const city = cityFor(filters.centre, filters.countryCode, filters.placeName);

  const load = useCallback(async () => {
    if (!token) return;
    setBoard(null);
    try {
      // Your latest check-ins first, so your own row is up to date.
      await syncCollection().catch(() => undefined);
      setBoard(await api.leaderboard(token, scope, area === 'city' ? { city, countryCode: filters.countryCode } : null));
      setProblem(null);
    } catch (error) {
      setProblem(problemText(error, 'Couldn’t load the leaderboard.'));
    }
  }, [token, scope, area, city, filters.countryCode]);
  useEffect(() => {
    void load();
  }, [load]);

  const join = async (on: boolean) => {
    if (!token) return;
    setSaving(true);
    try {
      await api.setLeaderboard(token, on);
      haptic.select();
      await load();
    } catch (error) {
      setProblem(problemText(error));
    } finally {
      setSaving(false);
    }
  };

  if (!token || !account.account) {
    return (
      <View style={styles.signedOut}>
        <Stack.Screen options={{ title: 'Leaderboard' }} />
        <Icon name="trophy" size={40} color={color.brand} />
        <Txt variant="title2" style={styles.centre}>
          Who’s collected the most?
        </Txt>
        <Txt variant="subhead" color={color.labelSecondary} style={styles.centre}>
          Sign in to see the leaderboards, and to join them if you like.
        </Txt>
        <PrimaryButton label="Sign in" onPress={() => router.push('/sign-in')} />
      </View>
    );
  }

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Leaderboard' }} />
      <Card style={styles.join}>
        <View style={styles.flex}>
          <Txt variant="headline">Be on the public board</Txt>
          <Txt variant="footnote" color={color.labelSecondary}>
            {`As “${account.account.displayName}”, with your gym and visit counts. Nothing else, and you can leave any time.`}
          </Txt>
        </View>
        <Switch
          value={board?.joined ?? false}
          disabled={!board || saving}
          onValueChange={(on) => void join(on)}
          accessibilityLabel="Be on the public leaderboard"
          trackColor={{ true: color.brand, false: color.fill }}
        />
      </Card>

      <Segmented
        options={[
          { value: 'everyone', label: 'Everyone' },
          { value: 'friends', label: 'Friends' },
        ]}
        value={scope}
        onChange={setScope}
      />
      <Segmented
        options={[
          { value: 'all', label: 'All gyms' },
          { value: 'city', label: `In ${city}` },
        ]}
        value={area}
        onChange={setArea}
      />

      {problem && (
        <Txt variant="footnote" color={color.noInk}>
          {problem}
        </Txt>
      )}
      {!board && !problem ? (
        <ListSkeleton rows={5} />
      ) : board && board.rows.length === 0 ? (
        <Txt variant="subhead" color={color.labelSecondary} style={styles.centre}>
          {scope === 'friends'
            ? 'Nobody here has collected a gym yet. Check in at one to start.'
            : area === 'city'
              ? `Nobody on the board has collected a gym in ${city} yet.`
              : 'Nobody has joined the board yet. Be the first?'}
        </Txt>
      ) : (
        board && (
          <View style={styles.list}>
            {board.rows.map((row, index) => (
              <Row key={`${row.rank}-${index}`} row={row} />
            ))}
            {board.you && !board.rows.some((row) => row.you) && (
              <>
                <Txt variant="caption" color={color.labelTertiary} style={styles.centre}>
                  ···
                </Txt>
                <Row row={board.you} />
              </>
            )}
          </View>
        )
      )}
      {board && scope === 'everyone' && !board.joined && (
        <Txt variant="footnote" color={color.labelSecondary} style={styles.centre}>
          You’re not on this board. Switch it on above to see your place.
        </Txt>
      )}
      <Txt variant="footnote" color={color.labelSecondary} style={styles.centre}>
        Ranked by gyms collected, then visits. A gym counts once you’ve checked in there; a visit, once a day.
      </Txt>
    </PageScroll>
  );
}

function Row({ row }: { row: BoardEntry }) {
  return (
    <View
      style={[styles.row, row.you && styles.rowYou]}
      accessible
      accessibilityLabel={`${row.rank}. ${row.you ? 'You' : row.displayName}: ${row.gyms} gyms, ${row.visits} visits`}
    >
      <View style={[styles.rank, row.rank <= 3 && { backgroundColor: MEDAL[row.rank - 1] }]}>
        <Txt variant="footnote" color={row.rank <= 3 ? '#FFFFFF' : color.labelSecondary} style={face('bold')}>
          {row.rank}
        </Txt>
      </View>
      <Avatar account={{ displayName: row.displayName, avatarUrl: row.avatarUrl }} size={34} variant="subhead" />
      <Txt variant="headline" numberOfLines={1} style={styles.flex}>
        {row.you ? `${row.displayName} (you)` : row.displayName}
      </Txt>
      <View style={styles.counts}>
        <Txt variant="headline">{`${row.gyms} gym${row.gyms === 1 ? '' : 's'}`}</Txt>
        <Txt variant="caption" color={color.labelSecondary}>
          {`${row.visits} visit${row.visits === 1 ? '' : 's'}`}
        </Txt>
      </View>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], paddingBottom: space[8], gap: space[3], width: '100%', maxWidth: 560, alignSelf: 'center' },
    signedOut: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3], padding: space[6], backgroundColor: color.groupedBackground },
    centre: { textAlign: 'center' },
    flex: { flex: 1, minWidth: 0 },
    join: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
    list: { gap: 2, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.card, padding: space[1], overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[2], paddingHorizontal: space[3], borderRadius: radius.md },
    rowYou: { backgroundColor: color.brandTint },
    rank: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: color.fill },
    counts: { alignItems: 'flex-end' },
  }),
);
