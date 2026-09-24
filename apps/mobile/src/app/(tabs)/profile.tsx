/**
 * Profile: your account, laid out like iOS Settings. Sign in or create an
 * account; see your saved and recent gyms; moderate if you're a moderator;
 * switch haptics; and read where GymGO's facts come from.
 */

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { ModerationQueue, PhotoQueue, SignInForm } from '@/components/AccountContent';
import { Group, Row, TILE, TabScreen } from '@/components/ios';
import { Txt } from '@/components/ui';
import { useApp } from '@/lib/app-state';
import { color, space } from '@/lib/theme';

export default function Profile() {
  const { account, data, recents, compare, prefs, setPref } = useApp();
  const router = useRouter();
  const [about, setAbout] = useState<'facts' | 'sources' | 'privacy' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const me = account.state === 'signed_in' ? account.account : null;
  const moderator = me?.role === 'moderator' || me?.role === 'admin';

  const toggle = (key: 'facts' | 'sources' | 'privacy') => setAbout((current) => (current === key ? null : key));

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
        </Group>
      ) : (
        <View style={styles.signIn}>
          <SignInForm account={account} inSheet={false} />
        </View>
      )}

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
          </View>
        </View>
      )}

      <Group
        header="Preferences"
        footer={Platform.OS === 'web' ? 'Haptics are the small taps you feel on a phone; a browser has none.' : undefined}
      >
        <Row
          icon="sparkle"
          tile={TILE.pink}
          title="Haptics"
          toggle={{ value: prefs.haptics, onChange: (value) => setPref('haptics', value) }}
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
            Gym names and map positions: © OpenStreetMap contributors (ODbL). Prices, hours and equipment: each gym’s own
            website, read on 23 September 2026. Maps: Apple Maps on iPhone, OpenFreeMap elsewhere. The Google page shows
            Google’s own map and Street View, straight from Google. Photos, reviews and machine reports: GymGO members.
          </Explainer>
        )}
        <Row icon="info" tile={TILE.grey} title="Privacy" onPress={() => toggle('privacy')} />
        {about === 'privacy' && (
          <Explainer>
            Your account lives on the GymGO server on your own computer. Your location is used only when you tap “near me”,
            rounded to about 100 m, and never stored. Photos have their location data removed before they’re saved.
          </Explainer>
        )}
        <Row icon="settings" tile={TILE.grey} title="Version" value="0.1.0 · pilot" chevron={false} />
      </Group>

      {me && (
        <Group footer={confirmDelete ? 'This removes your account, saved gyms, reviews, photos and machine reports from the server.' : undefined}>
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
              } catch {
                setError('Couldn’t reach the GymGO server, so nothing was deleted.');
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
