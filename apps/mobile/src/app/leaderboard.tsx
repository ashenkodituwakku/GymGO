/**
 * Leaderboards: most gyms collected, then most visits. "Everyone" lists
 * only people who joined it, by display name, and you join or leave with
 * the switch at the top; "Friends" is you and your friends, who can see
 * each other's collections anyway. Either for every gym, or for the city
 * you're searching. Ranked on the server (apps/server/src/social.ts).
 */

import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Toggle } from '@/components/Toggle';
import { Avatar } from '@/components/Avatar';
import { BrandFill, Sheen, accentGlow } from '@/components/BrandFill';
import { Icon } from '@/components/Icon';
import { HeroMark } from '@/components/HeroMark';
import { PageScroll } from '@/components/PageScroll';
import { useGlassRedraw } from '@/components/Redrawn';
import { ServerAwayCard } from '@/components/ServerAwayCard';
import { ListSkeleton } from '@/components/Skeleton';
import { Card, PrimaryButton, Segmented, Txt } from '@/components/ui';
import { ScreenOptions } from '@/components/ScreenOptions';
import { api, problemText, type Board, type BoardEntry } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { cityFor } from '@/lib/collection';
import { placeGap } from '@/lib/friends';
import { THIS_AREA, YOUR_LOCATION } from '@/lib/query';
import { haptic } from '@/lib/haptics';
import { usePageTitle } from '@/lib/pageTitle';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';
import { syncCollection } from '@/lib/useCollection';
import { LIMITED } from '@/lib/limited';

const MEDAL = ['#C9971C', '#8E959E', '#B0713A'];

export default function LeaderboardScreen() {
  useGlassRedraw();
  usePageTitle('Leaderboard');
  const router = useRouter();
  const { account, filters } = useApp();
  const token = account.token;
  const [scope, setScope] = useState<'everyone' | 'friends'>('everyone');
  const [area, setArea] = useState<'all' | 'city'>('all');
  const [board, setBoard] = useState<Board | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // The city being searched; none when the search has no city's name ("your location" far from any).
  const named = cityFor(filters.centre, filters.countryCode, filters.placeName);
  const city = named === YOUR_LOCATION || named === THIS_AREA ? null : named;

  const load = useCallback(async () => {
    if (!token) return;
    setBoard(null);
    try {
      // Your latest check-ins first, so your own row is up to date.
      await syncCollection().catch(() => undefined);
      setBoard(await api.leaderboard(token, scope, area === 'city' && city ? { city, countryCode: filters.countryCode } : null));
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

  // Signed in, but the server can't be reached: say so, rather than asking them to sign in.
  if (account.state === 'unreachable' || account.state === 'loading') {
    return (
      <PageScroll style={styles.page} contentContainerStyle={styles.content}>
        <ScreenOptions options={{ title: 'Leaderboard' }} />
        {/* While your account is confirmed, the shape of what's coming rather than a blank page. */}
        {account.state === 'unreachable' ? <ServerAwayCard /> : <ListSkeleton rows={5} label="Loading the leaderboard" />}
      </PageScroll>
    );
  }

  if (!token || !account.account) {
    return (
      <View style={styles.signedOut}>
        <ScreenOptions options={{ title: 'Leaderboard' }} />
        <HeroMark icon="trophy" />
        <Txt variant="title2" style={styles.centre}>
          Who’s collected the most?
        </Txt>
        <Txt variant="subhead" color={color.labelSecondary} style={styles.centre}>
          {LIMITED ? 'Leaderboards come with the full version of GymGO.' : 'Sign in to see the leaderboards, and to join them if you like.'}
        </Txt>
        {!LIMITED && <PrimaryButton label="Sign in" onPress={() => router.push('/sign-in')} />}
      </View>
    );
  }

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content}>
      <ScreenOptions options={{ title: 'Leaderboard' }} />
      <Card style={styles.join}>
        <View style={styles.joinMark}>
          <Icon name="trophy" size={18} color={color.brand} />
        </View>
        <View style={styles.flex}>
          <Txt variant="headline">Be on the public board</Txt>
          <Txt variant="footnote" color={color.labelSecondary}>
            {`As “${account.account.displayName}”, with your gym and visit counts. Nothing else, and you can leave any time.`}
          </Txt>
        </View>
        <Toggle
          value={board?.joined ?? false}
          disabled={!board || saving}
          onValueChange={(on) => void join(on)}
          accessibilityLabel="Be on the public leaderboard"
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
      {!!city && (
        <Segmented
          options={[
            { value: 'all', label: 'All gyms' },
            { value: 'city', label: `In ${city}` },
          ]}
          value={area}
          onChange={setArea}
        />
      )}

      {problem && (
        <Txt variant="footnote" color={color.noInk}>
          {problem}
        </Txt>
      )}
      {board?.you && <YourPlace you={board.you} board={board} where={[scope === 'friends' ? 'FRIENDS' : 'EVERYONE', area === 'city' && city ? `IN ${city.toUpperCase()}` : null]} />}
      {!board && !problem ? (
        <ListSkeleton rows={5} />
      ) : board && board.rows.length === 0 ? (
        <View style={styles.empty}>
          <HeroMark icon="trophy" size={52} />
          <Txt variant="headline" style={styles.centre}>
            No one ranked yet
          </Txt>
          <Txt variant="subhead" color={color.labelSecondary} style={styles.centre}>
            {scope === 'friends'
              ? 'Nobody here has collected a gym yet. Check in at one to start.'
              : area === 'city' && city
                ? `Nobody on the board has collected a gym in ${city} yet.`
                : board.joined
                  ? 'Nobody on the board has collected a gym yet. Check in at one to be first.'
                  : 'Nobody has joined the board yet. Switch it on above to be the first.'}
          </Txt>
        </View>
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
      {board && board.rows.length > 0 && scope === 'everyone' && !board.joined && (
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

/** Your place on the accent: where you are, of how many, your counts, and how far from the place above. */
function YourPlace({ you, board, where }: { you: BoardEntry; board: Board; where: Array<string | null> }) {
  const gap = placeGap(you, board.rows, board.people);
  const stats = [
    { value: String(you.gyms), label: you.gyms === 1 ? 'gym' : 'gyms' },
    { value: String(you.visits), label: you.visits === 1 ? 'visit' : 'visits' },
  ];
  return (
    <View
      style={[styles.hero, accentGlow(color.brandFill)]}
      accessible
      accessibilityLabel={`Your place: ${you.rank} of ${board.people}. ${you.gyms} gyms, ${you.visits} visits.${gap ? ` ${gap}` : ''}`}
    >
      <BrandFill round={radius.xl} />
      <Sheen round={radius.xl} />
      <Txt variant="eyebrow" color={color.onBrandSoft}>
        {['YOUR PLACE', ...where.filter(Boolean)].join(' · ')}
      </Txt>
      <View style={styles.place}>
        <Txt variant="largeTitle" color={color.onBrand}>
          {`#${you.rank}`}
        </Txt>
        <Txt variant="subhead" color={color.onBrandSoft}>
          {`of ${board.people}`}
        </Txt>
        <View style={styles.stats}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <Txt variant="figure" color={color.onBrand}>
                {stat.value}
              </Txt>
              <Txt variant="caption" color={color.onBrandSoft}>
                {stat.label}
              </Txt>
            </View>
          ))}
        </View>
      </View>
      {gap && (
        <Txt variant="footnote" color={color.onBrandSoft}>
          {gap}
        </Txt>
      )}
    </View>
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
      <Avatar account={{ displayName: row.displayName, avatarUrl: row.avatarUrl }} size={34} variant="subhead" person={row.you ? undefined : row.displayName} />
      {/* The name gives way to a long one; "You" always shows. */}
      <View style={styles.name}>
        <Txt variant="headline" numberOfLines={1} style={styles.shrink}>
          {row.displayName}
        </Txt>
        {row.you && (
          <View style={styles.youPill}>
            <Txt variant="caption" color={color.onBrand} style={face('semibold')}>
              You
            </Txt>
          </View>
        )}
      </View>
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
    name: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: space[2] },
    shrink: { flexShrink: 1, minWidth: 0 },
    youPill: { paddingHorizontal: space[2], paddingVertical: 2, borderRadius: radius.pill, backgroundColor: color.brandFill },
    join: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
    joinMark: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: color.brandTint },
    hero: { gap: space[1], padding: space[4], paddingTop: space[4] + 2, borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: color.brandFill },
    place: { flexDirection: 'row', alignItems: 'baseline', gap: space[2] },
    stats: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: space[4] },
    stat: { alignItems: 'flex-end' },
    empty: { alignItems: 'center', gap: space[2], paddingVertical: space[5] },
    list: { gap: 2, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.plate, padding: space[1], ...shadow.plate },
    row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[2], paddingHorizontal: space[3], borderRadius: radius.md },
    rowYou: { backgroundColor: color.brandTint },
    rank: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: color.fill },
    counts: { alignItems: 'flex-end' },
  }),
);
