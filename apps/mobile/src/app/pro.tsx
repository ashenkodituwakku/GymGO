/**
 * GymGO Pro: what it adds, what it costs, and a way to buy it.
 *
 * Opened from Profile, or when a Free limit is reached (it then says which).
 * Everything that tells you the truth about a gym stays free, and this screen
 * lists that too, so nobody wonders what they're missing.
 *
 * Paying happens on Stripe's own page. Coming back, the app asks the server
 * to confirm with Stripe before saying you're on Pro.
 */

import {
  ALWAYS_FREE,
  PRO_FEATURES,
  annualSaving,
  formatPlanPrice,
  proPrice,
  type BillingCurrency,
  type BillingInterval,
} from '@gymgo/domain';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { PrimaryButton, Txt } from '@/components/ui';
import { useApp, type ProReason } from '@/lib/app-state';
import { ApiError, OfflineError } from '@/lib/api';
import { haptic } from '@/lib/haptics';
import { cityAt } from '@/lib/places';
import { CAN_BUY_HERE, openManage, startCheckout } from '@/lib/purchase';
import { color, face, radius, space } from '@/lib/theme';

const REASON: Record<ProReason, string> = {
  saved: 'You’ve saved as many gyms as Free keeps. Pro saves as many as you like.',
  compare: 'Free compares two gyms at a time. Pro lines up four.',
  workouts: 'Keep your workouts in your account with Pro, and open them on any device.',
};

export default function ProScreen() {
  const params = useLocalSearchParams<{ reason?: string; checkout?: string }>();
  const router = useRouter();
  const { account, billing, filters } = useApp();
  const [interval, setInterval] = useState<BillingInterval>('year');
  const [currency, setCurrency] = useState<BillingCurrency>(cityAt(filters.centre).country === 'US' ? 'usd' : 'aud');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [welcome, setWelcome] = useState(false);
  const token = account.token;
  const signedIn = account.state === 'signed_in' && token !== null;
  const reason = params.reason === 'saved' || params.reason === 'compare' || params.reason === 'workouts' ? params.reason : null;

  // Back from Stripe in a browser: confirm with the server before celebrating.
  const { refresh } = billing;
  useEffect(() => {
    if (params.checkout !== 'success' || !signedIn) return;
    void refresh(true).then((next) => {
      if (next?.plan === 'pro') {
        haptic.success();
        setWelcome(true);
      }
    });
  }, [params.checkout, signedIn, refresh]);

  const monthly = proPrice('month', currency, billing.prices);
  const yearly = proPrice('year', currency, billing.prices);
  const saving = monthly && yearly ? annualSaving(monthly.amountMinor, yearly.amountMinor) : null;
  const chosen = interval === 'year' ? yearly : monthly;

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const subscribe = async () => {
    if (!token || !chosen) return;
    setBusy(true);
    setProblem(null);
    try {
      const outcome = await startCheckout(token, interval, currency);
      if (outcome === 'left') return; // The browser is on its way to Stripe.
      const next = await billing.refresh(true);
      if (next?.plan === 'pro') {
        haptic.success();
        setWelcome(true);
      } else if (outcome === 'done') {
        setProblem('Stripe hasn’t confirmed the payment yet. Give it a moment, then open this screen again.');
      }
    } catch (error) {
      setProblem(messageFor(error));
    } finally {
      setBusy(false);
    }
  };

  const manage = async () => {
    if (!token) return;
    setBusy(true);
    setProblem(null);
    try {
      const outcome = await openManage(token);
      if (outcome !== 'left') await billing.refresh(true);
    } catch (error) {
      setProblem(messageFor(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <Pressable onPress={close} accessibilityRole="button" hitSlop={8}>
              <Txt variant="body" color={color.brand} style={face('bold')}>
                Done
              </Txt>
            </Pressable>
          ),
        }}
      />
      <ScrollView style={styles.page} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        {/* Hero ------------------------------------------------------------ */}
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Txt style={styles.badgeEmoji}>✨</Txt>
          </View>
          <Txt variant="largeTitle" style={styles.center}>
            GymGO Pro
          </Txt>
          <Txt variant="body" color={color.labelSecondary} style={styles.center}>
            {billing.isPro ? 'Thanks for backing GymGO.' : reason ? REASON[reason] : 'Keep more of what you find.'}
          </Txt>
        </View>

        {/* Already Pro --------------------------------------------------------- */}
        {billing.isPro && (
          <View style={[styles.card, styles.onPro]}>
            <Txt variant="title2">{welcome ? 'You’re on Pro 🎉' : 'You’re on Pro'}</Txt>
            <Txt variant="subhead" color={color.labelSecondary}>
              {describeSubscription(billing.subscription)}
            </Txt>
            {CAN_BUY_HERE ? (
              <PrimaryButton label={busy ? 'Opening Stripe…' : 'Manage subscription'} tone="quiet" disabled={busy} onPress={() => void manage()} />
            ) : (
              <Txt variant="footnote" color={color.labelSecondary}>
                Manage it from GymGO on your computer.
              </Txt>
            )}
          </View>
        )}

        {/* Free vs Pro ------------------------------------------------------------ */}
        <View style={styles.card}>
          <View style={styles.tableHead}>
            <View style={styles.flex} />
            <Txt variant="footnote" color={color.labelSecondary} style={styles.column}>
              FREE
            </Txt>
            <Txt variant="footnote" color={color.brand} style={[styles.column, face('bold')]}>
              PRO
            </Txt>
          </View>
          {PRO_FEATURES.map((feature) => (
            <View key={feature.title} style={styles.tableRow}>
              <Txt style={styles.featureEmoji}>{feature.emoji}</Txt>
              <Txt variant="subhead" style={[styles.flex, face('medium')]}>
                {feature.title}
              </Txt>
              <Txt variant="footnote" color={color.labelSecondary} style={styles.column}>
                {feature.free}
              </Txt>
              <Txt variant="footnote" color={color.label} style={[styles.column, face('bold')]}>
                {feature.pro}
              </Txt>
            </View>
          ))}
        </View>

        {/* The plans ---------------------------------------------------------------- */}
        {!billing.isPro && (
          <>
            <View style={styles.plans} accessibilityRole="radiogroup">
              {yearly && (
                <PlanOption
                  selected={interval === 'year'}
                  onPress={() => setInterval('year')}
                  title="Yearly"
                  price={`${formatPlanPrice(yearly.amountMinor, currency)} a year`}
                  detail={`${formatPlanPrice(Math.round(yearly.amountMinor / 12), currency)} a month, billed yearly`}
                  tag={saving ? `Save ${saving}%` : null}
                />
              )}
              {monthly && (
                <PlanOption
                  selected={interval === 'month'}
                  onPress={() => setInterval('month')}
                  title="Monthly"
                  price={`${formatPlanPrice(monthly.amountMinor, currency)} a month`}
                  detail="Billed every month"
                  tag={null}
                />
              )}
            </View>
            <Pressable
              onPress={() => setCurrency((current) => (current === 'aud' ? 'usd' : 'aud'))}
              accessibilityRole="button"
              hitSlop={8}
              style={styles.currency}
            >
              <Txt variant="footnote" color={color.brand}>
                Prices in {currency === 'aud' ? 'A$' : 'US$'} · show {currency === 'aud' ? 'US$' : 'A$'}
              </Txt>
            </Pressable>

            <BuyButton
              signedIn={signedIn}
              available={billing.available}
              busy={busy}
              label={chosen ? `Continue · ${formatPlanPrice(chosen.amountMinor, currency)} a ${interval}` : 'Continue'}
              onSubscribe={() => void subscribe()}
              onSignIn={() => router.navigate('/profile')}
            />
          </>
        )}

        {problem && (
          <View style={styles.problem}>
            <Txt variant="footnote" color={color.dangerInk}>
              {problem}
            </Txt>
          </View>
        )}

        {/* Always free -------------------------------------------------------------------- */}
        <View style={styles.card}>
          <Txt variant="headline">Always free, for everyone</Txt>
          {ALWAYS_FREE.map((line) => (
            <View key={line} style={styles.freeLine}>
              <Txt variant="subhead" color={color.goodInk}>
                ✓
              </Txt>
              <Txt variant="subhead" style={styles.flex}>
                {line}
              </Txt>
            </View>
          ))}
        </View>

        <Txt variant="caption" color={color.labelTertiary} style={styles.fine}>
          Prices include tax. Pro renews automatically until you cancel. Cancel any time from Profile → Manage subscription, and
          you keep Pro until the end of what you’ve paid for. If Pro ends, nothing you saved is deleted; you just can’t add more
          than Free allows. Payments are handled by Stripe: GymGO never sees your card, and Stripe gets your name and email for
          the receipt.
        </Txt>
      </ScrollView>
    </>
  );
}

function BuyButton({
  signedIn,
  available,
  busy,
  label,
  onSubscribe,
  onSignIn,
}: {
  signedIn: boolean;
  available: boolean;
  busy: boolean;
  label: string;
  onSubscribe: () => void;
  onSignIn: () => void;
}) {
  if (!CAN_BUY_HERE) {
    return (
      <Txt variant="footnote" color={color.labelSecondary} style={styles.center}>
        Pro can’t be bought in this version of the app.
      </Txt>
    );
  }
  if (!available) {
    return (
      <View style={styles.gap}>
        <PrimaryButton label="Not on sale yet" disabled onPress={() => undefined} />
        <Txt variant="footnote" color={color.labelSecondary} style={styles.center}>
          Payments aren’t connected on this GymGO server yet, so these are the planned prices.
        </Txt>
      </View>
    );
  }
  if (!signedIn) {
    return (
      <View style={styles.gap}>
        <PrimaryButton label="Sign in to subscribe" onPress={onSignIn} />
        <Txt variant="footnote" color={color.labelSecondary} style={styles.center}>
          Pro belongs to your GymGO account, so it works on your phone and your computer.
        </Txt>
      </View>
    );
  }
  return <PrimaryButton label={busy ? 'Opening Stripe…' : label} disabled={busy} onPress={onSubscribe} />;
}

function PlanOption({
  selected,
  onPress,
  title,
  price,
  detail,
  tag,
}: {
  selected: boolean;
  onPress: () => void;
  title: string;
  price: string;
  detail: string;
  tag: string | null;
}) {
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}, ${price}${tag ? `, ${tag}` : ''}`}
      style={({ pressed }) => [styles.plan, selected && styles.planOn, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      <View style={[styles.radio, selected && styles.radioOn]}>{selected && <View style={styles.radioDot} />}</View>
      <View style={styles.flex}>
        <View style={styles.planTitle}>
          <Txt variant="headline">{title}</Txt>
          {tag && (
            <View style={styles.tag}>
              <Txt variant="caption" color={color.onBrand} style={face('bold')}>
                {tag}
              </Txt>
            </View>
          )}
        </View>
        <Txt variant="footnote" color={color.labelSecondary}>
          {detail}
        </Txt>
      </View>
      <Txt variant="subhead" style={face('bold')}>
        {price}
      </Txt>
    </Pressable>
  );
}

function describeSubscription(subscription: ReturnType<typeof useApp>['billing']['subscription']): string {
  if (!subscription) return 'Pro is on for this account.';
  const price =
    subscription.amountMinor !== null && subscription.currency
      ? `${formatPlanPrice(subscription.amountMinor, subscription.currency)} a ${subscription.interval ?? 'period'}`
      : null;
  const date = (value: string) => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  if (subscription.endsAt) return [price, `Cancelled: Pro until ${date(subscription.endsAt)}`].filter(Boolean).join(' · ');
  if (subscription.status === 'past_due') return 'Your last payment didn’t go through. Stripe will try again; update your card in Manage subscription.';
  return [price, subscription.renewsAt ? `renews ${date(subscription.renewsAt)}` : null].filter(Boolean).join(' · ');
}

function messageFor(error: unknown): string {
  if (error instanceof OfflineError) return 'Couldn’t reach the GymGO server. Check it’s running, then try again.';
  if (error instanceof ApiError) return error.message;
  return Platform.OS === 'web' ? 'Something went wrong opening Stripe. Try again.' : 'Something went wrong. Try again.';
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  gap: { gap: space[2] },
  page: { flex: 1, backgroundColor: color.groupedBackground },
  content: { padding: space[4], gap: space[4], paddingBottom: space[8], width: '100%', maxWidth: 560, alignSelf: 'center' },
  hero: { alignItems: 'center', gap: space[2], paddingTop: space[2] },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: color.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmoji: { fontSize: 36, lineHeight: 44 },
  card: { backgroundColor: color.background, borderRadius: radius.xl, borderCurve: 'continuous', padding: space[4], gap: space[3] },
  onPro: { borderWidth: 2, borderColor: color.brand },
  tableHead: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  featureEmoji: { fontSize: 20, lineHeight: 26, width: 28 },
  column: { width: 84, textAlign: 'center' },
  plans: { gap: space[3] },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[4],
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    backgroundColor: color.background,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planOn: { borderColor: color.brand },
  planTitle: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: color.labelTertiary, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: color.brand },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: color.brand },
  tag: { paddingHorizontal: space[2], paddingVertical: 2, borderRadius: radius.pill, backgroundColor: color.brand },
  currency: { alignSelf: 'center', marginTop: -space[2] },
  problem: { padding: space[3], borderRadius: radius.md, backgroundColor: color.dangerTint },
  freeLine: { flexDirection: 'row', gap: space[2] },
  fine: { textAlign: 'center', paddingHorizontal: space[2] },
});
