/**
 * Moderation, on its own screen rather than down the bottom of Profile:
 * what's waiting at the top (Profile shows the count), then each queue with
 * one tap to approve and Reject-then-reason to turn down. Gym claims show
 * for admins only.
 */

import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Pressable } from '@/components/motion';
import { BugReportQueue, MemberReportQueue, ModerationQueue, PhotoQueue } from '@/components/AccountContent';
import { ClaimQueue, OwnerUpdateQueue } from '@/components/Moderation';
import { PageScroll } from '@/components/PageScroll';
import { Segmented, Txt } from '@/components/ui';
import { api, type ModerationCounts } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { usePageTitle } from '@/lib/pageTitle';
import { color, radius, space, themed } from '@/lib/theme';

type Tab = 'waiting' | 'owners' | 'reports';

export default function ModerationScreen() {
  usePageTitle('Moderation');
  const router = useRouter();
  const { account, data } = useApp();
  const token = account.token;
  const role = account.account?.role;
  const staff = role === 'moderator' || role === 'admin';
  const [tab, setTab] = useState<Tab>('waiting');
  const [counts, setCounts] = useState<ModerationCounts | null>(null);
  const refresh = useCallback(() => {
    if (token && staff) api.moderationCounts(token).then(setCounts).catch(() => setCounts(null));
  }, [token, staff]);
  useEffect(refresh, [refresh]);

  if (!token || !staff) {
    return (
      <View style={styles.none}>
        <Stack.Screen options={{ title: 'Moderation' }} />
        <Icon name="lock" size={36} color={color.labelTertiary} />
        <Txt variant="title2" style={styles.centre}>
          For GymGO’s moderators
        </Txt>
        <Txt variant="subhead" color={color.labelSecondary} style={styles.centre}>
          {token
            ? 'This is where moderators check reported reviews, photos and gym claims. Your account isn’t one of them.'
            : 'This is where moderators check reported reviews, photos and gym claims. Sign in with a moderator’s account to see it.'}
        </Txt>
      </View>
    );
  }

  const owners = (counts?.ownerUpdates ?? 0) + (counts?.claims ?? 0);
  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Moderation' }} />
      <Segmented
        options={[
          { value: 'waiting', label: `Posts${counts ? ` (${counts.reviews + counts.photos})` : ''}` },
          { value: 'owners', label: `Owners${counts ? ` (${owners})` : ''}` },
          { value: 'reports', label: 'Reports' },
        ]}
        value={tab}
        onChange={(next) => {
          setTab(next);
          refresh();
        }}
      />
      <View style={styles.card}>
        {tab === 'waiting' && (
          <>
            <PhotoQueue token={token} records={data.records} onPublished={data.refreshCovers} />
            <ModerationQueue token={token} records={data.records} onPublished={data.refreshRatings} />
          </>
        )}
        {tab === 'owners' && (
          <>
            <OwnerUpdateQueue token={token} records={data.records} onChanged={refresh} />
            {role === 'admin' ? (
              <ClaimQueue token={token} records={data.records} />
            ) : (
              <Txt variant="footnote" color={color.labelSecondary}>
                Gym claims hold personal details, so only admins check them.
              </Txt>
            )}
          </>
        )}
        {tab === 'reports' && (
          <>
            <MemberReportQueue token={token} records={data.records} />
            <BugReportQueue token={token} />
          </>
        )}
      </View>
      <Pressable onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'community' } })} accessibilityRole="link">
        <Txt variant="footnote" color={color.labelSecondary} style={styles.note}>
          Decide by the community guidelines (tap to read them). The person sees the reason you pick.
        </Txt>
      </Pressable>
    </PageScroll>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], paddingBottom: space[8], gap: space[3], width: '100%', maxWidth: 640, alignSelf: 'center' },
    none: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3], padding: space[6], backgroundColor: color.groupedBackground },
    centre: { textAlign: 'center' },
    card: { gap: space[4], padding: space[4], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.card },
    note: { textAlign: 'center', paddingHorizontal: space[4] },
  }),
);
