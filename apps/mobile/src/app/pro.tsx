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
  trialEndsAt,
  type BillingCurrency,
  type BillingInterval,
} from '@gymgo/domain';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Pressable } from '@/components/motion';
import { Icon, type IconName } from '@/components/Icon';
import { PrimaryButton, Segmented, Txt } from '@/components/ui';
import { DuoPartner, GiftPro, RedeemGift, grantLine } from '@/components/ProExtras';
import { useApp, type ProReason } from '@/lib/app-state';
import type { Sale } from '@/lib/useBilling';
import { ApiError, OfflineError } from '@/lib/api';
import { haptic } from '@/lib/haptics';
import { CAN_BUY_HERE, openManage, startCheckout } from '@/lib/purchase';
import { HEADER_EDGE, color, face, radius, shadow, space, themed } from '@/lib/theme';
import { usePageTitle } from '@/lib/pageTitle';
import { PageScroll } from '@/components/PageScroll';
import { LegalText } from '@/components/LegalText';

const FEATURE_ICON: Record<string, IconName> = {
  'Gyms worldwide': 'globe',
  'Saved gyms': 'saved',
  'Compare side by side': 'compare',
  'Workout library': 'workout',
  'Progress charts': 'chart',
  'Session targets': 'target',
  'Colour themes': 'palette',
  'Muscle balance': 'body',
  'Warm-up sets': 'flame',
  'Gym notes': 'list',
  'Your plates': 'plates',
  'Interval timer': 'timer',
  '1-rep max': 'target',
  'Streak freeze': 'sparkle',
  'Profile ring': 'person',
};

const REASON: Record<ProReason, string> = {
  saved: 'You’ve saved as many gyms as Free keeps. Pro saves as many as you like.',
  compare: 'Free compares two gyms at a time. Pro lines up four.',
  workouts: 'Keep your workouts in your account with Pro, and open them on any device.',
  worldwide: 'GymGO Free covers the country you chose. Pro finds gyms in every country, wherever you travel.',
  progress: 'Your log and records are free. Pro draws a chart for every exercise and works out what to lift next.',
  themes: 'Dark mode is free for everyone. Pro adds eleven more accents, Rainbow and Camo among them, and four looks that redraw the whole app: 8-bit, Classic, Material and Neon.',
  balance: 'Your log, goal and milestones are free. Pro counts your sets for every muscle and names the ones you’ve missed.',
  warmup: 'The plate calculator is free. Pro works out your warm-up sets to any weight, with the plates for each.',
  notes: 'Pro keeps your own notes on each gym, like the door code or who to ask for. Only you see them.',
  plates: 'The plate calculator uses the usual set for free. Pro lets it use the plates your gym really has, change plates and all.',
  timers: 'Tabata and EMOM are free. Pro lets you set your own work, rest and rounds, and keep up to ten timers of your own.',
  strength: 'Your estimated 1-rep max is free. Pro adds the whole percentage table, with the plates for each weight, and what you could lift for 2 to 12 reps.',
  freeze: 'Pro’s streak freeze keeps your weekly streak going through one missed week a month.',
};

export default function ProScreen() {
  usePageTitle('GymGO Pro');
  const params = useLocalSearchParams<{ reason?: string; checkout?: string }>();
  const router = useRouter();
  const { account, billing, filters, prefs } = useApp();
  // Pro for you alone, or Duo: you and one more person.
  const [plan, setPlan] = useState<'pro' | 'duo'>('pro');
  // A new account's free trial of monthly Pro (the server decides who gets one).
  const trialOffer = !billing.isPro && plan === 'pro' ? billing.trial : null;
  // Yearly unless there's a trial to start, until you pick.
  const [intervalPick, setInterval] = useState<BillingInterval | null>(null);
  const interval: BillingInterval = intervalPick ?? (trialOffer ? 'month' : 'year');
  const trial = trialOffer && interval === 'month' ? trialOffer : null;
  // Pro is sold in A$ and US$: A$ for Australia and New Zealand, US$ for
  // everyone else. From the country you chose, or where you're looking.
  const home = prefs.country ?? filters.countryCode;
  const [picked, setCurrency] = useState<BillingCurrency | null>(null);
  const currency: BillingCurrency = picked ?? (home === 'AU' || home === 'NZ' ? 'aud' : 'usd');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [welcome, setWelcome] = useState(false);
  const token = account.token;
  const signedIn = account.state === 'signed_in' && token !== null;
  const reason = params.reason && params.reason in REASON ? (params.reason as ProReason) : null;

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

  // The app couldn't ask at launch (offline then): ask now, so a blip earlier
  // doesn't leave Pro looking unbuyable until the next restart.
  const { sale, askSale } = billing;
  useEffect(() => {
    if (sale === 'unreachable') askSale();
    // Once, on opening; the Try again button asks after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const duoOnSale = billing.duoPrices.some((price) => price.currency === currency);
  const list = plan === 'duo' && duoOnSale ? billing.duoPrices : billing.prices;
  const monthly = proPrice('month', currency, list);
  const yearly = proPrice('year', currency, list);
  const saving = monthly && yearly ? annualSaving(monthly.amountMinor, yearly.amountMinor) : null;
  const chosen = interval === 'year' ? yearly : monthly;

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const subscribe = async () => {
    if (!token || !chosen) return;
    setBusy(true);
    setProblem(null);
    try {
      const outcome = await startCheckout(token, interval, currency, plan === 'duo' && duoOnSale ? 'duo' : 'pro', trial !== null);
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
      // The trial ran out while this screen was open: show the plans as they now are.
      if (error instanceof ApiError && error.code === 'trial_unavailable') void billing.refresh();
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
            <Pressable onPress={close} accessibilityRole="button" hitSlop={8} style={styles.done}>
              <Txt variant="body" color={color.brand} style={face('semibold')}>
                Done
              </Txt>
            </Pressable>
          ),
        }}
      />
      <PageScroll style={styles.page} contentContainerStyle={styles.content}>
        {/* Hero ------------------------------------------------------------ */}
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Icon name="crown" size={36} color={color.onBrand} />
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
            <Txt variant="title2">{welcome ? 'Welcome to Pro' : 'You’re on Pro'}</Txt>
            <Txt variant="subhead" color={color.labelSecondary}>
              {billing.grant ? grantLine(billing.grant) : `${billing.duo ? 'Duo: you and one more person. ' : ''}${describeSubscription(billing.subscription)}`}
            </Txt>
            {billing.grant ? null : billing.subscription?.manageable === false ? null : CAN_BUY_HERE ? (
              <PrimaryButton label={busy ? 'Opening Stripe…' : 'Manage subscription'} tone="quiet" disabled={busy} onPress={() => void manage()} />
            ) : (
              <Txt variant="footnote" color={color.labelSecondary}>
                Manage it from GymGO on your computer.
              </Txt>
            )}
          </View>
        )}

        {signedIn && <DuoPartner token={token!} />}

        {/* Free vs Pro ------------------------------------------------------------ */}
        <View style={styles.card}>
          <View style={styles.tableHead}>
            <View style={styles.flex} />
            <Txt variant="footnote" color={color.labelSecondary} style={styles.column}>
              FREE
            </Txt>
            <Txt variant="footnote" color={color.brand} style={[styles.column, styles.proColumn, face('semibold')]}>
              PRO
            </Txt>
          </View>
          {PRO_FEATURES.map((feature) => (
            <View key={feature.title} style={styles.tableRow}>
              <View style={styles.featureIcon}>
                <Icon name={FEATURE_ICON[feature.title] ?? 'sparkle'} size={17} color={color.brand} />
              </View>
              <Txt variant="subhead" style={[styles.flex, face('medium')]}>
                {feature.title}
              </Txt>
              <Txt variant="footnote" color={color.labelSecondary} style={styles.column}>
                {feature.free}
              </Txt>
              <Txt variant="footnote" color={color.label} style={[styles.column, styles.proColumn, face('semibold')]}>
                {feature.pro}
              </Txt>
            </View>
          ))}
        </View>

        {/* The plans ---------------------------------------------------------------- */}
        {!billing.isPro && (
          <>
            {duoOnSale && (
              <Segmented
                options={[
                  { value: 'pro', label: 'Just me' },
                  { value: 'duo', label: 'Duo: you + 1' },
                ]}
                value={plan}
                onChange={setPlan}
              />
            )}
            {plan === 'duo' && duoOnSale && (
              <Txt variant="footnote" color={color.labelSecondary} style={styles.center}>
                One subscription, two people: add one more person by their friend code after you subscribe. Only Pro is shared, nothing else.
              </Txt>
            )}
            {trialOffer && monthly && (
              <View style={[styles.card, styles.trialCard]}>
                <Txt variant="headline">{`New here? Try Pro free for ${trialOffer.days} days`}</Txt>
                <Txt variant="subhead" color={color.labelSecondary}>
                  {`Monthly Pro, free for ${trialOffer.days} days, then ${formatPlanPrice(monthly.amountMinor, currency)} a month until you cancel. Yours to start until ${dayLabel(trialOffer.offerEndsAt)}.`}
                </Txt>
              </View>
            )}
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
                  detail={trialOffer ? `Free for ${trialOffer.days} days, then billed every month` : 'Billed every month'}
                  tag={trialOffer ? `${trialOffer.days} days free` : null}
                />
              )}
            </View>
            <Pressable
              onPress={() => setCurrency(currency === 'aud' ? 'usd' : 'aud')}
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
              sale={billing.sale}
              onAskAgain={billing.askSale}
              busy={busy}
              label={
                trial
                  ? `Start ${trial.days}-day free trial`
                  : chosen
                    ? `Subscribe${plan === 'duo' && duoOnSale ? ' to Duo' : ''} · ${formatPlanPrice(chosen.amountMinor, currency)} a ${interval}`
                    : 'Subscribe'
              }
              renewal={
                !chosen
                  ? null
                  : trial
                    ? `Free for ${trial.days} days, then ${formatPlanPrice(chosen.amountMinor, currency)} a month, tax included, until you cancel. Stripe takes your card now; the first payment is on ${dayLabel(trialEndsAt(new Date(), trial.days).toISOString())}. Cancel before then in Profile → Manage subscription and you aren’t charged. Tapping Start agrees to these terms and the [Terms of Service](terms); [Refunds and Cancelling](refunds) says when you get your money back.`
                    : `Renews automatically at ${formatPlanPrice(chosen.amountMinor, currency)} a ${interval}, tax included, until you cancel. Cancel any time in Profile → Manage subscription; Pro stays on to the end of the ${interval} you’ve paid for. Tapping Subscribe agrees to these renewal terms and the [Terms of Service](terms); [Refunds and Cancelling](refunds) says when you get your money back.`
              }
              onSubscribe={() => void subscribe()}
              onSignIn={() => router.push('/sign-in')}
            />
          </>
        )}

        {(!billing.isPro || billing.grant?.via === 'gift') && <RedeemGift token={signedIn ? token : null} billing={billing} onSignIn={() => router.push('/sign-in')} />}
        <GiftPro token={signedIn ? token : null} billing={billing} currency={currency} onSignIn={() => router.push('/sign-in')} />

        {problem && (
          <View style={styles.problem}>
            <Txt variant="footnote" color={color.dangerInk}>
              {problem}
            </Txt>
          </View>
        )}

        {/* Always free -------------------------------------------------------------------- */}
        <View style={styles.card}>
          <Txt variant="headline">Always free, with a free account</Txt>
          {ALWAYS_FREE.map((line) => (
            <View key={line} style={styles.freeLine}>
              <Icon name="check" size={16} color={color.goodInk} />
              <Txt variant="subhead" style={styles.flex}>
                {line}
              </Txt>
            </View>
          ))}
        </View>

        <LegalText
          variant="caption"
          tint={color.labelSecondary}
          style={styles.fine}
          text="Prices include tax. Pro and Duo renew automatically until you cancel; a gift year is paid once and doesn't renew. A new account can try monthly Pro free for 3 days, once, in its first 30 days: the monthly price is charged when the trial ends unless you cancel before then. Cancel any time from Profile → Manage subscription, and you keep Pro until the end of what you’ve paid for. Changed your mind? Ask within 14 days of your first payment, or of a yearly renewal, for a full refund. If Pro ends, nothing you saved is deleted; you just can’t add more than Free allows. Payments are handled by Stripe: GymGO never sees your card, and Stripe gets your name and email for the receipt. [Terms of Service](terms) · [Refunds and Cancelling](refunds) · [Privacy Policy](privacy)"
        />
      </PageScroll>
    </>
  );
}

function BuyButton({
  signedIn,
  sale,
  onAskAgain,
  busy,
  label,
  renewal,
  onSubscribe,
  onSignIn,
}: {
  signedIn: boolean;
  sale: Sale;
  onAskAgain: () => void;
  busy: boolean;
  label: string;
  /** The auto-renewal terms, shown right by the button that agrees to them. */
  renewal: string | null;
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
  if (sale === 'asking' || sale === 'unreachable') {
    return (
      <View style={styles.gap}>
        <PrimaryButton label={sale === 'asking' ? 'Checking…' : 'Try again'} icon="refresh" tone="quiet" busy={sale === 'asking'} onPress={onAskAgain} />
        {sale === 'unreachable' && (
          <Txt variant="footnote" color={color.labelSecondary} style={styles.center}>
            Can’t reach the GymGO server, so Pro can’t be bought just now.
          </Txt>
        )}
      </View>
    );
  }
  if (sale === 'off') {
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
  return (
    <View style={styles.gap}>
      <PrimaryButton label={busy ? 'Opening Stripe…' : label} disabled={busy} onPress={onSubscribe} />
      {renewal && <LegalText variant="footnote" tint={color.labelSecondary} style={styles.center} text={renewal} />}
    </View>
  );
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
      aria-checked={selected}
      accessibilityLabel={`${title}, ${price}${tag ? `, ${tag}` : ''}`}
      style={({ pressed }) => [styles.plan, selected && styles.planOn, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      <View style={[styles.radio, selected && styles.radioOn]}>{selected && <View style={styles.radioDot} />}</View>
      <View style={styles.flex}>
        <View style={styles.planTitle}>
          <Txt variant="headline">{title}</Txt>
          {tag && (
            <View style={styles.tag}>
              <Txt variant="caption" color={color.onBrand} style={face('semibold')}>
                {tag}
              </Txt>
            </View>
          )}
        </View>
        <Txt variant="footnote" color={color.labelSecondary}>
          {detail}
        </Txt>
      </View>
      <Txt variant="subhead" style={face('semibold')}>
        {price}
      </Txt>
    </Pressable>
  );
}

function describeSubscription(subscription: ReturnType<typeof useApp>['billing']['subscription']): string {
  if (!subscription) return 'Pro is on for this account.';
  // The ready-made account for trying GymGO on your own computer: nobody paid, nothing renews.
  if (subscription.manageable === false) return 'Pro for trying GymGO on this computer. No payment, nothing to renew.';
  const price =
    subscription.amountMinor !== null && subscription.currency
      ? `${formatPlanPrice(subscription.amountMinor, subscription.currency)} a ${subscription.interval ?? 'period'}`
      : null;
  const date = (value: string) => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  if (subscription.trial && subscription.endsAt) return `Free trial, cancelled: Pro until ${date(subscription.endsAt)}, and you won’t be charged.`;
  if (subscription.trial) {
    return `Free trial${subscription.renewsAt ? ` until ${date(subscription.renewsAt)}` : ''}${price ? `, then ${price}` : ''}. Cancel before then in Manage subscription and you won’t be charged.`;
  }
  if (subscription.endsAt) return [price, `Cancelled: Pro until ${date(subscription.endsAt)}`].filter(Boolean).join(' · ');
  if (subscription.status === 'past_due') return 'Your last payment didn’t go through. Stripe will try again; update your card in Manage subscription.';
  return [price, subscription.renewsAt ? `renews ${date(subscription.renewsAt)}` : null].filter(Boolean).join(' · ');
}

/** "Thu 9 Oct": a short day, in the phone's language. */
function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

function messageFor(error: unknown): string {
  if (error instanceof OfflineError) return 'Couldn’t reach the GymGO server. Check it’s running, then try again.';
  if (error instanceof ApiError) return error.message;
  return Platform.OS === 'web' ? 'Something went wrong opening Stripe. Try again.' : 'Something went wrong. Try again.';
}

const styles = themed(() => StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  gap: { gap: space[2] },
  page: { flex: 1, backgroundColor: color.groupedBackground },
  done: { paddingHorizontal: HEADER_EDGE },
  content: { padding: space[4], gap: space[4], paddingBottom: space[8], width: '100%', maxWidth: 560, alignSelf: 'center' },
  hero: { alignItems: 'center', gap: space[2], paddingTop: space[2] },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: color.brandFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmoji: { fontSize: 36, lineHeight: 44 },
  card: { backgroundColor: color.card, borderRadius: radius.xl, borderCurve: 'continuous', padding: space[4], gap: space[3], ...shadow.plate },
  onPro: { borderWidth: 2, borderColor: color.brand },
  trialCard: { gap: space[1], backgroundColor: color.brandWash, borderWidth: 1, borderColor: color.brandBorder },
  tableHead: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  featureIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: color.brandTint, alignItems: 'center', justifyContent: 'center' },
  column: { width: 84, textAlign: 'center' },
  // Pro's column is the one being sold: room for its words on a phone.
  proColumn: { width: 100 },
  plans: { gap: space[3] },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[4],
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    backgroundColor: color.card,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planOn: { borderColor: color.brand },
  planTitle: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: color.labelTertiary, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: color.brand },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: color.brand },
  tag: { paddingHorizontal: space[2], paddingVertical: 2, borderRadius: radius.pill, backgroundColor: color.brandFill },
  currency: { alignSelf: 'center', marginTop: -space[2] },
  problem: { padding: space[3], borderRadius: radius.md, backgroundColor: color.dangerTint },
  freeLine: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  fine: { textAlign: 'center', paddingHorizontal: space[2] },
}));
