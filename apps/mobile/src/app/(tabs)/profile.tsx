/**
 * Profile: your account, laid out like iOS Settings. Sign in or create an
 * account; see your saved and recent gyms; moderate if you're a moderator;
 * switch haptics; and read where GymGO's facts come from.
 */

import { formatPlanPrice } from '@gymgo/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BugReportQueue, MemberReportQueue, ModerationQueue, PhotoQueue } from '@/components/AccountContent';
import { AppBadge, Wordmark } from '@/components/BrandMark';
import { Icon } from '@/components/Icon';
import { Pressy } from '@/components/motion';
import { OrDivider, SocialButtons, useAnySocial, type TokenHandler } from '@/components/SocialSignIn';
import { Group, Row, TILE, TabScreen } from '@/components/ios';
import { PrimaryButton, Txt } from '@/components/ui';
import { ApiError, api } from '@/lib/api';
import { holdPendingSignIn } from '@/lib/ageGate';
import { setAlwaysShowGoogle, useAlwaysShowGoogle } from '@/lib/googleConsent';
import { useApp } from '@/lib/app-state';
import { countryName } from '@/lib/country';
import { useThemeChoice } from '@/lib/themePrefs';
import { useCollection } from '@/lib/useCollection';
import { CAN_BUY_HERE, openManage } from '@/lib/purchase';
import { color, face, radius, space, themed } from '@/lib/theme';
import { haptic } from '@/lib/haptics';
import { usePageTitle } from '@/lib/pageTitle';

export default function Profile() {
  usePageTitle('Profile');
  const { account, data, recents, compare, prefs, setPref, billing, openPro } = useApp();
  const themeChoice = useThemeChoice();
  const alwaysGoogle = useAlwaysShowGoogle();
  const collection = useCollection();
  const router = useRouter();
  const params = useLocalSearchParams<{ checkout?: string }>();
  const [about, setAbout] = useState<'facts' | 'sources' | 'privacy' | 'copyright' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const me = account.state === 'signed_in' ? account.account : null;
  const moderator = me?.role === 'moderator' || me?.role === 'admin';

  const toggle = (key: 'facts' | 'sources' | 'privacy' | 'copyright') => setAbout((current) => (current === key ? null : key));

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
        <Pressy
          scaleTo={0.98}
          onPress={() => router.push('/account')}
          accessibilityRole="button"
          accessibilityLabel={`${me.displayName}, ${me.email}. Account settings`}
          style={styles.meCard}
        >
          <View style={styles.avatar}>
            <Txt variant="title" color={color.onBrand}>
              {me.displayName.slice(0, 1).toUpperCase()}
            </Txt>
          </View>
          <View style={styles.flex}>
            <Txt variant="title2" numberOfLines={1}>
              {me.displayName}
            </Txt>
            <Txt variant="subhead" color={color.labelSecondary} numberOfLines={1}>
              {me.email}
              {moderator ? ' · Moderator' : ''}
            </Txt>
            <Txt variant="footnote" color={color.brand} style={face('medium')}>
              {billing.isPro ? 'GymGO Pro · Account settings' : 'Account settings'}
            </Txt>
          </View>
          <Icon name="chevron" size={14} color={color.labelTertiary} />
        </Pressy>
      ) : account.state === 'unreachable' ? (
        <ServerAwayCard />
      ) : (
        <SignInCard />
      )}

      <Group header="Training">
        <Row icon="chart" tile={TILE.green} title="Progress" subtitle="Your log, records and streak" onPress={() => router.push('/progress')} />
        <Row icon="workout" tile={TILE.orange} title="My workouts" onPress={() => router.push('/workouts')} />
        <Row icon="plates" tile={TILE.teal} title="Plate calculator" onPress={() => router.push('/plates')} />
      </Group>

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
      </Group>

      <Group header="Your gyms">
        <Row icon="saved" tile={TILE.orange} title="Saved" value={String(account.saved.length)} onPress={() => router.navigate('/saved')} />
        <Row icon="trophy" tile={TILE.orange} title="Collection" subtitle="Gyms you’ve checked in at" value={String(Object.keys(collection.gyms).length)} onPress={() => router.push('/collection')} />
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
            <ModerationQueue token={account.token} records={data.records} onPublished={data.refreshRatings} />
            <MemberReportQueue token={account.token} records={data.records} />
            <BugReportQueue token={account.token} />
          </View>
        </View>
      )}

      <Group
        header="Settings"
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
        {prefs.country && !prefs.demo && <PackRow />}
        <Row
          icon="palette"
          tile={TILE.indigo}
          title="Appearance"
          value={themeChoice.appearance === 'system' ? 'Automatic' : themeChoice.appearance === 'dark' ? 'Dark' : 'Light'}
          onPress={() => router.push('/appearance')}
        />
        <Row
          icon="sparkle"
          tile={TILE.pink}
          title="Haptics"
          toggle={{ value: prefs.haptics, onChange: (value) => setPref('haptics', value) }}
        />
        <Row
          icon="globe"
          tile={TILE.blue}
          title="Google content"
          subtitle="Show Street View and Google’s photos on a gym’s page without asking"
          toggle={{ value: alwaysGoogle, onChange: (value) => setAlwaysShowGoogle(value) }}
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
            or live when you search an area. Towns you type are found with Photon, from the same map; each country’s biggest
            cities come from GeoNames (CC BY 4.0). For Melbourne’s 23
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
            {'\n\n'}
            GymGO has no ads, no analytics and no session recording: nothing watches what you tap or type. Accounts are for
            people 13 and over; the month and year you give when making one is checked, then not kept. The map comes from
            OpenFreeMap (Apple Maps on iPhone), which, like any site, sees your device’s IP address. Nothing loads from Google
            until you ask: Street View and Google’s photos wait for a tap unless you turn on Google content above. A bug
            report sends only what its form lists.
          </Explainer>
        )}
        <Row icon="photo" tile={TILE.grey} title="Copyright and takedowns" onPress={() => toggle('copyright')} />
        {about === 'copyright' && <CopyrightExplainer onNotice={() => router.push({ pathname: '/report-bug', params: { topic: 'copyright', from: 'Profile' } })} />}
        <Row
          icon="bug"
          tile={TILE.red}
          title="Report a bug"
          subtitle="Something not working? Tell the team"
          onPress={() => router.push({ pathname: '/report-bug', params: { from: 'Profile' } })}
        />
        <Row icon="settings" tile={TILE.grey} title="Version" value="0.1.0 · pilot" chevron={false} />
      </Group>

      {error && (
        <Txt variant="footnote" color={color.dangerInk} style={styles.center}>
          {error}
        </Txt>
      )}

      <View style={styles.colophon}>
        <Wordmark height={24} />
        <Txt variant="footnote" color={color.labelSecondary}>
          The truthful gym finder
        </Txt>
      </View>
    </TabScreen>
  );
}

/**
 * Signed in, but the server can't be reached (it's down, or the phone is on
 * the gym's patchy Wi-Fi). You're not signed out, so there's nothing to sign
 * in to: just say so, and offer to try again. The app also retries by itself.
 */
function ServerAwayCard() {
  const { account } = useApp();
  const [trying, setTrying] = useState(false);
  const [tried, setTried] = useState(false);
  const retry = async () => {
    setTrying(true);
    await account.reconnect();
    // Back: this card is gone. Still away: say so, so the tap wasn't ignored.
    setTrying(false);
    setTried(true);
  };
  return (
    <View style={styles.signInCard}>
      <View style={styles.signInHead}>
        <AppBadge size={52} />
        <View style={styles.flex}>
          <Txt variant="title2">Can’t reach GymGO</Txt>
          <Txt variant="subhead" color={color.labelSecondary}>
            You’re still signed in. Your saved gyms on this device work, and the rest comes back when the server does.
          </Txt>
        </View>
      </View>
      <PrimaryButton label={trying ? 'Trying…' : 'Try again'} icon="refresh" tone="quiet" busy={trying} onPress={() => void retry()} />
      {tried && !trying && (
        <Txt variant="footnote" color={color.maybeInk}>
          Still no answer. GymGO keeps trying by itself every 20 seconds.
        </Txt>
      )}
    </View>
  );
}

/** Signed out: Apple and Google where they're set up, then email. */
function SignInCard() {
  const { account } = useApp();
  const router = useRouter();
  const social = useAnySocial();
  const [problem, setProblem] = useState<string | null>(null);
  const withProvider: TokenHandler = async (provider, idToken, nonce, name) => {
    setProblem(null);
    try {
      await account.signInWith(provider, idToken, nonce, name);
      haptic.success();
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'age_needed') {
        // A new account: the sign-in screen asks the age question, then finishes this same sign-in.
        holdPendingSignIn({ provider, idToken, nonce, name: name ?? null });
        router.push({ pathname: '/sign-in', params: { mode: 'create' } });
        return;
      }
      haptic.warn();
      setProblem(caught instanceof ApiError ? caught.message : 'Couldn’t reach the GymGO server. Try again.');
    }
  };
  return (
    <View style={styles.signInCard}>
      <View style={styles.signInHead}>
        <AppBadge size={52} />
        <View style={styles.flex}>
          <Txt variant="title2">Sign in to GymGO</Txt>
          <Txt variant="subhead" color={color.labelSecondary}>
            Your saved gyms, workouts and training log, on every device.
          </Txt>
        </View>
      </View>
      <SocialButtons onToken={withProvider} onError={setProblem} />
      {social && <OrDivider label="or" />}
      <PrimaryButton label="Sign in with email" icon="mail" onPress={() => router.push('/sign-in')} />
      <PrimaryButton label="Create an account" tone="quiet" onPress={() => router.push({ pathname: '/sign-in', params: { mode: 'create' } })} />
      {problem && (
        <Txt variant="footnote" color={color.dangerInk}>
          {problem}
        </Txt>
      )}
    </View>
  );
}

/**
 * How someone whose photo or words were posted here without permission gets
 * them taken down (the US DMCA's notice and takedown), and where to send the
 * notice: GymGO's registered agent once there is one, else Report a problem.
 */
function CopyrightExplainer({ onNotice }: { onNotice: () => void }) {
  const [agent, setAgent] = useState<{ name: string; address: string | null; email: string | null } | null | undefined>(undefined);
  useEffect(() => {
    api
      .legal()
      .then((answer) => setAgent(answer.copyrightAgent))
      .catch(() => setAgent(null));
  }, []);
  return (
    <View style={styles.copyright}>
      <Explainer>
        Photos and reviews on GymGO are posted by members, who confirm they took or wrote them. If something here is yours and
        was posted without your permission, send a notice. Say who you are and how to reach you; what the work is; where it is
        on GymGO (the gym, and the photo or review); that you believe in good faith its use isn’t authorised; and that the
        notice is accurate and, under penalty of perjury, that you own the work or act for its owner, signed with your full
        name. GymGO takes the item down and tells the member who posted it, who can send a counter-notice. A member who
        keeps posting other people’s work loses their account.
      </Explainer>
      {agent ? (
        <Txt variant="footnote" color={color.labelSecondary} style={styles.explainer}>
          GymGO’s designated copyright agent: {[agent.name, agent.address, agent.email].filter(Boolean).join(', ')}.
        </Txt>
      ) : null}
      <View style={styles.copyrightButton}>
        <PrimaryButton label="Send a copyright notice" tone="quiet" icon="mail" onPress={onNotice} />
      </View>
    </View>
  );
}

function Explainer({ children }: { children: ReactNode }) {
  return (
    <Txt variant="subhead" color={color.labelSecondary} style={styles.explainer}>
      {children}
    </Txt>
  );
}

/** Your country's gyms kept on this device, for instant area searches. */
function PackRow() {
  const { pack, prefs } = useApp();
  const { state } = pack;
  const name = prefs.country ? countryName(prefs.country) : 'your country';
  const size = state.bytes >= 1024 * 1024 ? `${(state.bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(state.bytes / 1024))} KB`;
  const subtitle =
    state.status === 'ready'
      ? `All ${state.gyms.toLocaleString()} mapped gyms in ${name} beyond the built-in cities, ${size}. Searching an area there is instant, offline too.`
      : state.status === 'building'
        ? `GymGO is reading ${name}’s gyms from the map${state.progress && state.progress.total ? ` (${state.progress.done} of ${state.progress.total} regions)` : ''}. It saves them here when it’s done.`
        : state.status === 'loading'
          ? 'Checking…'
          : 'Not saved yet: GymGO couldn’t reach its server. Tap to try again.';
  return (
    <Row
      icon="download"
      tile={TILE.green}
      title="Offline gyms"
      value={state.status === 'ready' ? `${state.gyms.toLocaleString()} gyms` : state.status === 'building' ? 'Saving…' : undefined}
      subtitle={subtitle}
      onPress={state.status === 'failed' ? pack.retry : undefined}
    />
  );
}

const styles = themed(() => StyleSheet.create({
  settings: { paddingHorizontal: space[4], paddingBottom: space[4] },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  copyright: { paddingBottom: space[3] },
  copyrightButton: { paddingLeft: 16 + 29 + 12, paddingRight: 16 },
  colophon: { alignItems: 'center', gap: space[1], paddingTop: space[2], paddingBottom: space[4] },
  meCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[4],
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: color.card,
  },
  signInCard: { gap: space[3], padding: space[4], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.card },
  signInHead: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginBottom: space[1] },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: color.brandFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moderation: { gap: 6 },
  caps: { paddingHorizontal: space[4], letterSpacing: 0.3 },
  card: { backgroundColor: color.card, borderRadius: radius.lg, borderCurve: 'continuous', padding: space[4], gap: space[4] },
  explainer: { paddingHorizontal: 16, paddingBottom: space[3], paddingLeft: 16 + 29 + 12 },
}));
