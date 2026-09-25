/**
 * Profile: your account, laid out like iOS Settings. Sign in or create an
 * account; see your saved and recent gyms; moderate if you're a moderator;
 * switch haptics; and read where GymGO's facts come from.
 */

import { formatPlanPrice } from '@gymgo/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { AccountSettings, MemberReportQueue, ModerationQueue, PhotoQueue, SignInForm } from '@/components/AccountContent';
import { Group, Row, TILE, TabScreen } from '@/components/ios';
import { Txt } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { countryName } from '@/lib/country';
import { downloadMyData } from '@/lib/exportData';
import { CAN_BUY_HERE, openManage } from '@/lib/purchase';
import { color, space } from '@/lib/theme';

export default function Profile() {
  const { account, data, recents, compare, prefs, setPref, billing, openPro } = useApp();
  const router = useRouter();
  const params = useLocalSearchParams<{ checkout?: string }>();
  const [about, setAbout] = useState<'facts' | 'sources' | 'privacy' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [exported, setExported] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const me = account.state === 'signed_in' ? account.account : null;
  const token = account.state === 'signed_in' ? account.token : null;
  const moderator = me?.role === 'moderator' || me?.role === 'admin';

  const toggle = (key: 'facts' | 'sources' | 'privacy') => setAbout((current) => (current === key ? null : key));

  // Back from Stripe's manage page in a browser: pick up any change.
  const { refresh } = billing;
  useEffect(() => {
    if (params.checkout === 'portal' && account.state === 'signed_in') void refresh(true);
  }, [params.checkout, account.state, refresh]);

  const manage = async () => {
    if (!account.token) return;
    setError(null);
    try {
      const outcome = await openManage(account.token);
      if (outcome !== 'left') await refresh(true);
    } catch (problem) {
      setError(problem instanceof ApiError ? problem.message : 'Couldn’t reach the GymGO server.');
    }
  };

  const sub = billing.subscription;
  const proLine = billing.isPro
    ? sub?.endsAt
      ? `Cancelled · Pro until ${new Date(sub.endsAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`
      : sub?.amountMinor && sub.currency
        ? `${formatPlanPrice(sub.amountMinor, sub.currency)} a ${sub.interval ?? 'period'}${sub.renewsAt ? ` · renews ${new Date(sub.renewsAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : ''}`
        : 'On for this account'
    : `${billing.limits.savedGyms} saved gyms, compare ${billing.limits.compare}`;

  return (
    <TabScreen title="Profile">
      {me ? (
        <Group>
          <View style={styles.me}>
            <View style={styles.avatar}>
              <Txt variant="title" color={color.onBrand}>
                {me.displayName.slice(0, 1).toUpperCase()}
              </Txt>
            </View>
            <View style={styles.flex}>
              <Txt variant="title2">{me.displayName}</Txt>
              <Txt variant="subhead" color={color.labelSecondary}>
                {me.email}
                {moderator ? ' · Moderator' : ''}
              </Txt>
            </View>
          </View>
          <View style={styles.settings}>
            <AccountSettings account={account} />
          </View>
        </Group>
      ) : (
        <View style={styles.signIn}>
          <SignInForm account={account} inSheet={false} />
        </View>
      )}

      <Group header="GymGO Pro">
        <Row
          icon="crown"
          tile={TILE.indigo}
          title={billing.isPro ? 'GymGO Pro' : 'Free plan'}
          subtitle={proLine}
          value={billing.isPro ? undefined : 'Upgrade'}
          onPress={() => openPro()}
        />
        {billing.isPro && me && CAN_BUY_HERE && billing.subscription?.manageable !== false && (
          <Row icon="settings" tile={TILE.grey} title="Manage subscription" onPress={() => void manage()} />
        )}
        <Row icon="workout" tile={TILE.orange} title="My workouts" onPress={() => router.push('/workouts')} />
        <Row icon="chart" tile={TILE.green} title="Progress" subtitle="Your log, records and streak" onPress={() => router.push('/progress')} />
      </Group>

      <Group header="Your gyms">
        <Row icon="saved" tile={TILE.orange} title="Saved" value={String(account.saved.length)} onPress={() => router.navigate('/saved')} />
        <Row icon="history" tile={TILE.blue} title="Recently viewed" value={String(recents.length)} onPress={() => router.navigate('/')} />
        <Row
          icon="compare"
          tile={TILE.teal}
          title="Compare"
          value={compare.length ? `${compare.length} picked` : 'None picked'}
          onPress={() => router.push('/compare')}
        />
      </Group>

      {moderator && account.token && (
        <View style={styles.moderation}>
          <Txt variant="footnote" color={color.labelSecondary} style={styles.caps}>
            MODERATION
          </Txt>
          <View style={styles.card}>
            <PhotoQueue token={account.token} records={data.records} onPublished={data.refreshCovers} />
            <ModerationQueue token={account.token} records={data.records} />
            <MemberReportQueue token={account.token} records={data.records} />
          </View>
        </View>
      )}

      <Group
        header="Preferences"
        footer={[
          Platform.OS === 'web' ? 'Haptics are the small taps you feel on a phone; a browser has none.' : null,
          'Demo mode swaps every real gym for invented ones in inner Sydney, made up to show each case GymGO handles. Nothing in it is real, and real gyms come back when you turn it off.',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <Row
          icon="globe"
          tile={TILE.blue}
          title="Country"
          value={prefs.country ? countryName(prefs.country) : 'Choose'}
          subtitle={billing.isPro ? 'Every country is open with Pro' : 'GymGO Free covers this country'}
          onPress={() => router.push('/country')}
        />
        <Row
          icon="sparkle"
          tile={TILE.pink}
          title="Haptics"
          toggle={{ value: prefs.haptics, onChange: (value) => setPref('haptics', value) }}
        />
        <Row
          icon="flask"
          tile={TILE.orange}
          title="Demo mode"
          subtitle={prefs.demo ? 'Showing invented gyms only' : undefined}
          toggle={{ value: prefs.demo, onChange: (value) => setPref('demo', value) }}
        />
      </Group>

      <Group header="About GymGO">
        <Row icon="good" tile={TILE.green} title="How we check facts" onPress={() => toggle('facts')} />
        {about === 'facts' && (
          <Explainer>
            Every price, opening hour and machine comes from a named source: the gym’s own website, OpenStreetMap, or members
            who train there. Each fact links to where it came from and says when it was checked. Anything nobody has published
            is shown as unknown, never guessed, which is why most gyms say “Call first”.
          </Explainer>
        )}
        <Row icon="source" tile={TILE.indigo} title="Where the data comes from" onPress={() => toggle('sources')} />
        {about === 'sources' && (
          <Explainer>
            Gym names, map positions and most opening hours: © OpenStreetMap contributors (ODbL), read on 24 September 2026,
            or live when you search an area. Towns you type are found with Photon, from the same map. For Melbourne’s 23
            researched gyms, prices, hours and equipment come from each gym’s own website, read on 23 September 2026. Logos:
            Wikimedia Commons for ten chains, otherwise the icon on the gym’s own website. Maps: Apple Maps on iPhone,
            OpenFreeMap elsewhere. The Google page shows Google’s own map and Street View, straight from Google. Photos,
            reviews, what members paid and machine reports: GymGO members.
          </Explainer>
        )}
        <Row icon="info" tile={TILE.grey} title="Privacy" onPress={() => toggle('privacy')} />
        {about === 'privacy' && (
          <Explainer>
            Your account lives on the GymGO server on your own computer. Your precise location, if you allow it, is used on
            this device to find gyms near you and measure distances. It is never stored or sent to GymGO or anyone else.
            Outside the cities GymGO carries, the app asks the GymGO server for the gyms in the whole map tiles around you (a
            block about 30 km across, the same for everyone in it), never your position. When you search an area or type a
            town, the server is told that area or name to look up on OpenStreetMap, not who you are.
            Photos have their location data removed before they’re saved. What you say you paid for a visit is shown without your
            name. If you subscribe to Pro, Stripe handles the payment:
            GymGO never sees your card, and Stripe gets your name and email for the receipt. Signed in, Download my data (below)
            gives you everything GymGO holds about you as one file.
          </Explainer>
        )}
        <Row icon="settings" tile={TILE.grey} title="Version" value="0.1.0 · pilot" chevron={false} />
      </Group>

      {me && (
        <Group
          footer={
            confirmDelete
              ? `This removes your account, saved gyms, workouts, reviews, photos and your machine, price and visit reports from the server.${billing.isPro ? ' Your Pro subscription is cancelled first.' : ''}`
              : undefined
          }
        >
          <Row
            icon="download"
            tile={TILE.teal}
            title="Download my data"
            subtitle={exported ?? undefined}
            onPress={async () => {
              if (!token) return;
              try {
                setExported('Preparing your file…');
                await downloadMyData(token);
                setExported('Everything GymGO holds about you, as one file.');
              } catch {
                setExported('Couldn’t reach the GymGO server. Try again?');
              }
            }}
          />
          <Row icon="signOut" tile={TILE.blue} title="Sign out" onPress={() => void account.signOut()} />
          <Row
            icon="no"
            tile={TILE.red}
            title={confirmDelete ? 'Tap again to delete everything' : 'Delete account'}
            destructive
            onPress={async () => {
              if (!confirmDelete) return setConfirmDelete(true);
              try {
                await account.deleteAccount();
                setConfirmDelete(false);
              } catch (problem) {
                setError(
                  problem instanceof ApiError ? `${problem.message} Nothing was deleted.` : 'Couldn’t reach the GymGO server, so nothing was deleted.',
                );
              }
            }}
          />
        </Group>
      )}
      {error && (
        <Txt variant="footnote" color={color.dangerInk} style={styles.center}>
          {error}
        </Txt>
      )}
    </TabScreen>
  );
}

function Explainer({ children }: { children: string }) {
  return (
    <Txt variant="subhead" color={color.labelSecondary} style={styles.explainer}>
      {children}
    </Txt>
  );
}

const styles = StyleSheet.create({
  settings: { paddingHorizontal: space[4], paddingBottom: space[4] },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  me: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[4] },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: color.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signIn: { marginHorizontal: -space[4] },
  moderation: { gap: 6 },
  caps: { paddingHorizontal: space[4], letterSpacing: 0.3 },
  card: { backgroundColor: color.background, borderRadius: 12, padding: space[4], gap: space[4] },
  explainer: { paddingHorizontal: 16, paddingBottom: space[3], paddingLeft: 16 + 29 + 12 },
});
