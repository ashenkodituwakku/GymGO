/**
 * Profile: your account, laid out like iOS Settings. Sign in or create an
 * account; see your saved and recent gyms; moderate if you're a moderator;
 * switch haptics; and read where GymGO's facts come from.
 */

import Constants from 'expo-constants';
import { LEGAL_VERSION, formatPlanPrice, type LegalDocId } from '@gymgo/domain';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { AppBadge, Wordmark } from '@/components/BrandMark';
import { Icon } from '@/components/Icon';
import { Pressy } from '@/components/motion';
import { useGlassRedraw } from '@/components/Redrawn';
import { ServerAwayCard } from '@/components/ServerAwayCard';
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
import { useTrainingLog } from '@/lib/useTraining';
import { BrandFill, Sheen, accentGlow } from '@/components/BrandFill';
import { CAN_BUY_HERE, openManage } from '@/lib/purchase';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';
import { Avatar } from '@/components/Avatar';
import { haptic } from '@/lib/haptics';
import { usePageTitle } from '@/lib/pageTitle';
import { useLegalInfo } from '@/lib/legal';
import { LegalText } from '@/components/LegalText';
import { Bone, Skeleton } from '@/components/Skeleton';
import { DEMO_ONLY } from '@/lib/demoOnly';

export default function Profile() {
  useGlassRedraw();
  usePageTitle('Profile');
  const { account, data, recents, compare, prefs, setPref, billing, openPro } = useApp();
  const themeChoice = useThemeChoice();
  const alwaysGoogle = useAlwaysShowGoogle();
  const collection = useCollection();
  // The same copy of your log Home and the workout screen read: no extra request.
  const log = useTrainingLog(account.token);
  const router = useRouter();
  const params = useLocalSearchParams<{ checkout?: string }>();
  const [about, setAbout] = useState<'facts' | 'sources' | 'copyright' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const me = account.state === 'signed_in' ? account.account : null;
  const moderator = me?.role === 'moderator' || me?.role === 'admin';
  // How much is waiting, for the Moderation row: refreshed each time Profile comes back into view.
  const [waiting, setWaiting] = useState<number | null>(null);
  useFocusEffect(
    useCallback(() => {
      if (!moderator || !account.token) return;
      api
        .moderationCounts(account.token)
        .then((counts) => setWaiting(counts.reviews + counts.photos + counts.ownerUpdates + (counts.claims ?? 0)))
        .catch(() => setWaiting(null));
    }, [moderator, account.token]),
  );

  const toggle = (key: 'facts' | 'sources' | 'copyright') => setAbout((current) => (current === key ? null : key));
  const openLegal = (doc: LegalDocId) => router.push({ pathname: '/legal/[doc]', params: { doc } });

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
  // Pro can be bought from here: a build that may sell it (lib/purchase.ts), and the server selling it.
  const canBuy = CAN_BUY_HERE && billing.sale === 'on';
  // The plan only once the server has said (a guess said FREE to a Pro subscriber on a new phone).
  const plan = billing.planKnown ? (billing.isPro ? 'GymGO Pro' : 'Free plan') : null;
  const short = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const proLine = billing.isPro
    ? sub?.trial && sub.renewsAt && !sub.endsAt
      ? `Free trial · first payment ${short(sub.renewsAt)}`
      : sub?.endsAt
        ? `Cancelled · Pro until ${new Date(sub.endsAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`
        : sub?.amountMinor && sub.currency
          ? `${formatPlanPrice(sub.amountMinor, sub.currency)} a ${sub.interval ?? 'period'}${sub.renewsAt ? ` · renews ${short(sub.renewsAt)}` : ''}`
          : 'On for this account'
    : billing.trial && canBuy
      ? `Try Pro free for ${billing.trial.days} days`
      : `${billing.limits.savedGyms} saved gyms, compare ${billing.limits.compare}`;

  // Your numbers at a glance, on your account card. Workouts show a dash until
  // your log has loaded (or if it couldn't), so the three columns never jump.
  const workouts = log.status === 'ready' ? log.sessions.length : null;
  const meStats = [
    { value: workouts === null ? '–' : String(workouts), label: workouts === 1 ? 'workout' : 'workouts', spoken: workouts === null ? 'workouts not loaded' : undefined },
    { value: String(account.saved.length), label: 'saved' },
    { value: String(Object.keys(collection.gyms).length), label: 'collected' },
  ];

  return (
    <TabScreen title="Profile" glow>
      {me ? (
        <Pressy
          scaleTo={0.98}
          onPress={() => router.push('/account')}
          accessibilityRole="button"
          accessibilityLabel={`${me.displayName}, ${me.email}${plan ? `, ${plan}` : ''}${moderator ? ', moderator' : ''}. ${meStats.map((stat) => stat.spoken ?? `${stat.value} ${stat.label}`).join(', ')}. Account settings`}
          style={styles.meCard}
        >
          <View style={styles.meTop}>
            <Avatar account={me} size={64} variant="title" ring={billing.isPro ? color.plateSolid : undefined} />
            <View style={styles.flex}>
              <Txt variant="title2" numberOfLines={2}>
                {me.displayName}
              </Txt>
              <Txt variant="subhead" color={color.labelSecondary} numberOfLines={1}>
                {me.email}
              </Txt>
              <View style={styles.badges}>
                {plan && <Badge label={billing.isPro ? 'PRO' : 'FREE'} strong={billing.isPro} />}
                {moderator && <Badge label="MODERATOR" />}
              </View>
            </View>
            <Icon name="chevron" size={14} color={color.labelTertiary} />
          </View>
          <View style={styles.meStats}>
            {meStats.map((stat, at) => (
              <View key={stat.label} style={[styles.meStat, at > 0 && styles.meStatLine]}>
                <Txt variant="figure">{stat.value}</Txt>
                <Txt variant="caption" color={color.labelSecondary}>
                  {stat.label}
                </Txt>
              </View>
            ))}
          </View>
        </Pressy>
      ) : account.state === 'unreachable' ? (
        <ServerAwayCard />
      ) : account.state === 'loading' ? (
        <MeCardSkeleton />
      ) : DEMO_ONLY ? (
        <ComingSoonCard />
      ) : (
        <SignInCard />
      )}

      {me && me.termsVersion !== undefined && me.termsVersion !== LEGAL_VERSION && <NewTermsCard />}

      <Group header="Training">
        <Row icon="chart" tile={TILE.green} title="Progress" subtitle="Your log, records and streak" onPress={() => router.push('/progress')} />
        <Row icon="workout" tile={TILE.orange} title="My workouts" onPress={() => router.push('/workouts')} />
        <Row icon="plates" tile={TILE.teal} title="Plate calculator" onPress={() => router.push('/plates')} />
        <Row icon="target" tile={TILE.blue} title="1-rep max" subtitle="From any set, and the weights to train at" onPress={() => router.push('/strength')} />
        <Row icon="timer" tile={TILE.red} title="Interval timer" subtitle="Tabata and EMOM, or your own with Pro" onPress={() => router.push('/timer')} />
      </Group>

      {plan && <ProCard isPro={billing.isPro} line={proLine} trial={Boolean(billing.trial)} canBuy={canBuy} onOpen={() => openPro()} />}
      {billing.isPro && me && CAN_BUY_HERE && billing.subscription?.manageable !== false && (
        <Group>
          <Row icon="settings" tile={TILE.grey} title="Manage subscription" subtitle="Change plan, payment or cancel" onPress={() => void manage()} />
        </Group>
      )}

      <Group header="Your gyms">
        <Row icon="saved" tile={TILE.orange} title="Saved" value={String(account.saved.length)} onPress={() => router.navigate('/saved')} />
        <Row icon="trophy" tile={TILE.orange} title="Collection" subtitle={me ? 'Gyms you’ve checked in at, on your account' : 'Gyms you’ve checked in at'} value={String(Object.keys(collection.gyms).length)} onPress={() => router.push('/collection')} />
        <Row icon="globe" tile={TILE.blue} title="Trips" subtitle="Gyms that let visitors in where you’re going" onPress={() => router.push('/trips')} />
        <Row icon="history" tile={TILE.blue} title="Recently viewed" value={String(recents.length)} onPress={() => router.navigate('/')} />
        <Row
          icon="compare"
          tile={TILE.teal}
          title="Compare"
          value={compare.length ? `${compare.length} picked` : 'None picked'}
          onPress={() => router.push('/compare')}
        />
      </Group>

      <Group header="Friends">
        <Row icon="people" tile={TILE.indigo} title="Friends" subtitle="Add by code, see their cards, invite to train" onPress={() => router.push('/friends')} />
        <Row icon="trophy" tile={TILE.teal} title="Leaderboard" subtitle="Most gyms collected, if you join" onPress={() => router.push('/leaderboard')} />
      </Group>

      {moderator && account.token && (
        <Group header="Moderation">
          <Row
            icon="check"
            tile={TILE.red}
            title="Moderation"
            subtitle="Reviews, photos, owners’ updates and reports"
            value={waiting === null ? undefined : waiting === 0 ? 'All clear' : `${waiting} waiting`}
            onPress={() => router.push('/moderation')}
          />
        </Group>
      )}

      <Group header="Settings" footer={Platform.OS === 'web' ? undefined : 'Sounds follow your phone’s silent switch, and play over your music without stopping it.'}>
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
          // A browser can't tap back: say so where the switch is.
          subtitle={Platform.OS === 'web' ? 'The small taps you feel on a phone; a browser has none' : undefined}
          toggle={{ value: prefs.haptics, onChange: (value) => setPref('haptics', value) }}
        />
        <Row
          icon="sound"
          tile={TILE.orange}
          title="Sounds"
          subtitle={
            Platform.OS === 'web'
              ? 'Card reveals, check-ins, new records and the timers, once you’ve tapped the page'
              : 'Card reveals, check-ins, new records and the timers'
          }
          toggle={{ value: prefs.sounds, onChange: (value) => setPref('sounds', value) }}
        />
        <Row
          icon="globe"
          tile={TILE.blue}
          title="Google content"
          subtitle="Load Street View and Google’s photos without asking"
          toggle={{ value: alwaysGoogle, onChange: (value) => setAlwaysShowGoogle(value) }}
        />
        {!DEMO_ONLY && (
          <Row
            icon="flask"
            tile={TILE.orange}
            title="Demo mode"
            subtitle={
              prefs.demo
                ? 'Showing made-up gyms only. Turn off for real ones'
                : 'Made-up gyms in inner Sydney, to show how GymGO works'
            }
            toggle={{ value: prefs.demo, onChange: (value) => setPref('demo', value) }}
          />
        )}
      </Group>

      <Group header="About GymGO">
        <Row icon="good" tile={TILE.green} title="How we check facts" expanded={about === 'facts'} onPress={() => toggle('facts')} />
        {about === 'facts' && (
          <Explainer>
            Every price, opening hour and machine comes from a named source: the gym’s own website, OpenStreetMap, or members
            who train there. Each fact links to where it came from and says when it was checked. Anything nobody has published
            is shown as unknown, never guessed, which is why most gyms say “Call first”.
          </Explainer>
        )}
        <Row icon="source" tile={TILE.indigo} title="Where the data comes from" expanded={about === 'sources'} onPress={() => toggle('sources')} />
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
        <Row
          icon="bug"
          tile={TILE.red}
          title="Report a bug"
          subtitle="Something not working? Tell the team"
          onPress={() => router.push({ pathname: '/report-bug', params: { from: 'Profile' } })}
        />
        <Row icon="info" tile={TILE.grey} title="Version" value={Constants.expoConfig?.version ?? '1.0.0'} chevron={false} />
      </Group>

      <Group header="Legal">
        <Row icon="source" tile={TILE.grey} title="Terms of Service" onPress={() => openLegal('terms')} />
        <Row icon="lock" tile={TILE.grey} title="Privacy Policy" subtitle="No ads, no analytics, and your location stays on your phone" onPress={() => openLegal('privacy')} />
        <Row icon="refresh" tile={TILE.grey} title="Refunds and Cancelling" onPress={() => openLegal('refunds')} />
        <Row icon="people" tile={TILE.grey} title="Community Guidelines" subtitle="The rules for reviews, photos and reports" onPress={() => openLegal('community')} />
        <Row icon="photo" tile={TILE.grey} title="Copyright and takedowns" expanded={about === 'copyright'} onPress={() => toggle('copyright')} />
        {about === 'copyright' && <CopyrightExplainer onNotice={() => router.push({ pathname: '/report-bug', params: { topic: 'copyright', from: 'Profile' } })} />}
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

/** A small capital label on your account card: your plan, or Moderator. */
function Badge({ label, strong = false }: { label: string; strong?: boolean }) {
  return (
    <View style={[styles.badge, strong && styles.badgeStrong, strong && accentGlow(color.brandFill, true)]}>
      {strong && <BrandFill round={radius.pill} />}
      <Txt variant="eyebrow" color={strong ? color.onBrand : color.labelSecondary}>
        {label}
      </Txt>
    </View>
  );
}

/**
 * Your plan, as a card of the accent: Pro and when it renews, or what Free
 * covers and a way to see Pro.
 */
function ProCard({ isPro, line, trial, canBuy, onOpen }: { isPro: boolean; line: string; trial: boolean; canBuy: boolean; onOpen: () => void }) {
  const title = isPro ? 'GymGO Pro' : 'Go further with Pro';
  // A way to buy only where Pro can be bought: a store build that can't sell it offers nothing.
  const action = isPro || !canBuy ? null : trial ? 'See the free trial' : 'See what’s in Pro';
  return (
    <Pressy
      scaleTo={0.98}
      onPress={onOpen}
      accessibilityRole="button"
      // The words on the card, so a voice command that names them finds it.
      accessibilityLabel={[isPro ? 'Your plan' : 'Your plan, Free', title, line, action].filter(Boolean).join('. ')}
      style={[styles.proCard, accentGlow(color.brandFill)]}
    >
      <BrandFill round={radius.lg} />
      <Sheen round={radius.lg} />
      <View style={styles.proTop}>
        <View style={styles.proMark}>
          <Icon name="crown" size={20} color={color.onBrand} />
        </View>
        <View style={styles.flex}>
          <Txt variant="eyebrow" color={color.onBrandSoft}>
            {isPro ? 'YOUR PLAN' : 'YOUR PLAN · FREE'}
          </Txt>
          <Txt variant="title2" color={color.onBrand} numberOfLines={2}>
            {title}
          </Txt>
        </View>
        {/* Something to say it opens, where there's no button doing so. */}
        {!action && <Icon name="chevron" size={14} color={color.onBrandSoft} />}
      </View>
      <Txt variant="subhead" color={color.onBrandSoft}>
        {line}
      </Txt>
      {action && (
        <View style={styles.proCta}>
          <Txt variant="subhead" color={color.brandFill} style={face('semibold')}>
            {action}
          </Txt>
        </View>
      )}
    </Pressy>
  );
}

/** Signed out: Apple and Google where they're set up, then email. */
/** On the demo-only website (lib/demoOnly.ts), in place of signing in: what this is, and what's coming. */
function ComingSoonCard() {
  return (
    <View style={styles.signInCard}>
      <View style={styles.signInHead}>
        <AppBadge size={52} />
        <View style={styles.flex}>
          <Txt variant="title2">GymGO demo</Txt>
          <Txt variant="subhead" color={color.labelSecondary}>
            Every gym here is invented, to show what GymGO does. The full version, with real gyms and your own account, is coming soon.
          </Txt>
        </View>
      </View>
    </View>
  );
}

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
  const { copyrightAgent: agent } = useLegalInfo();
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

/** Your account card's shape while the sign-in is checked, so the sign-in card doesn't flash up first. */
function MeCardSkeleton() {
  const { billing } = useApp();
  // A Pro picture is 10 points bigger, for its ring: the same here, so nothing jumps.
  const picture = billing.isPro ? 74 : 64;
  return (
    <Skeleton label="Loading your account" style={styles.meCard}>
      <View style={styles.meTop}>
        <Bone width={picture} height={picture} round={picture / 2} />
        <View style={styles.meLines}>
          <Bone width="55%" height={20} />
          <Bone width="72%" height={14} />
          <Bone width="22%" height={16} round={8} />
        </View>
      </View>
      <Bone width="100%" height={58} round={radius.md} />
    </Skeleton>
  );
}

/** The terms or privacy policy have changed since this account agreed to them. */
function NewTermsCard() {
  const { account } = useApp();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const agree = async () => {
    setBusy(true);
    setProblem(null);
    try {
      await account.agreeToTerms(LEGAL_VERSION);
      haptic.success();
    } catch (caught) {
      setProblem(caught instanceof ApiError ? caught.message : 'Couldn’t reach the GymGO server. Try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={styles.newTerms}>
      <Txt variant="headline">GymGO’s terms have changed</Txt>
      <LegalText
        variant="subhead"
        tint={color.labelSecondary}
        text="Have a look at the new [Terms of Service](terms) and [Privacy Policy](privacy). Agree to keep using your account; if you’d rather not, you can delete it in Account settings."
      />
      {problem && (
        <Txt variant="footnote" color={color.dangerInk}>
          {problem}
        </Txt>
      )}
      <PrimaryButton label="Agree" busy={busy} onPress={() => void agree()} />
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
  // Two lines at most beside the count, so each says only what matters.
  const subtitle =
    state.status === 'ready'
      ? `Kept here, ${size}: area searches work offline`
      : state.status === 'building'
        ? `Reading ${name}’s gyms from the map${state.progress && state.progress.total ? ` (${state.progress.done} of ${state.progress.total})` : ''}…`
        : state.status === 'loading'
          ? 'Checking…'
          : state.failure === 'map'
            ? 'Not saved: the map service didn’t answer. Try later.'
            : 'Not saved: couldn’t reach GymGO. Tap to try again.';
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
    gap: space[4],
    padding: space[4],
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: color.plate,
    ...shadow.plate,
  },
  meTop: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space[1] + 2, marginTop: space[1] + 2 },
  // No clipping: a clipped view hides its own glow (BrandFill takes the corners itself).
  badge: { paddingHorizontal: space[2], paddingVertical: 3, borderRadius: radius.pill, backgroundColor: color.fill },
  badgeStrong: { backgroundColor: color.brandFill },
  meStats: { flexDirection: 'row', paddingVertical: space[2] + 2, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: color.fill },
  meStat: { flex: 1, alignItems: 'center', gap: 1 },
  meStatLine: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: color.separator },
  proCard: { gap: space[2], padding: space[4], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.brandFill },
  proTop: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  proMark: { width: 40, height: 40, borderRadius: Math.min(12, radius.sm + 2), borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: color.onBrandFaint },
  proCta: { alignSelf: 'flex-start', marginTop: space[1], paddingHorizontal: space[4], paddingVertical: space[2], borderRadius: radius.pill, backgroundColor: color.onBrand },
  meLines: { flex: 1, gap: 8 },
  newTerms: { gap: space[2], padding: space[4], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.plate, ...shadow.plate },
  signInCard: { gap: space[3], padding: space[4], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.plate, ...shadow.plate },
  signInHead: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginBottom: space[1] },
  moderation: { gap: 6 },
  caps: { paddingHorizontal: space[4], letterSpacing: 0.3 },
  card: { backgroundColor: color.plate, borderRadius: radius.lg, borderCurve: 'continuous', padding: space[4], gap: space[4], ...shadow.plate },
  explainer: { paddingHorizontal: 16, paddingBottom: space[3], paddingLeft: 16 + 29 + 12 },
}));
