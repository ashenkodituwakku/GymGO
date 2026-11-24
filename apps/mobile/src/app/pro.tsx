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
  MAX_FEATURES,
  PRO_FEATURES,
  PRO_FEATURE_GROUPS,
  WALLET_NAME,
  annualSaving,
  formatPlanPrice,
  orList,
  proPrice,
  stripePageNames,
  trialEndsAt,
  walletButtonFor,
  type BillingCurrency,
  type BillingInterval,
  type PayWith,
} from '@gymgo/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Pressable } from '@/components/motion';
import { AppBadge } from '@/components/BrandMark';
import { Icon, type IconName } from '@/components/Icon';
import { PayPalButton } from '@/components/PayPalButton';
import { WalletButton } from '@/components/WalletButton';
import { useGlassRedraw } from '@/components/Redrawn';
import { PrimaryButton, Segmented, Txt, LiveLine } from '@/components/ui';
import { GiftPro, RedeemGift, grantLine } from '@/components/ProExtras';
import { AskGymPal } from '@/components/AskGymPal';
import { useApp, type ProReason } from '@/lib/app-state';
import type { Sale } from '@/lib/useBilling';
import { ApiError, OfflineError, apiBase, serverHosted } from '@/lib/api';
import { serverOfflineLine } from '@/lib/copy';
import { LIMITED } from '@/lib/limited';
import { haptic } from '@/lib/haptics';
import { CAN_BUY_HERE, manageSubscription, startCheckout, startPayPalCheckout, walletHere } from '@/lib/purchase';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';
import { usePageTitle } from '@/lib/pageTitle';
import { PageScroll } from '@/components/PageScroll';
import { LegalText } from '@/components/LegalText';
import { ScreenOptions } from '@/components/ScreenOptions';

const FEATURE_ICON: Record<string, IconName> = {
  'Gyms worldwide': 'globe',
  'Saved gyms': 'saved',
  'Compare gyms': 'compare',
  'Workout library': 'workout',
  'Custom exercises': 'plus',
  'Custom splits': 'calendar',
  'Progress charts': 'chart',
  'Next-session targets': 'target',
  Themes: 'palette',
  'Muscle balance': 'body',
  'Warm-up sets': 'flame',
  'Gym notes': 'list',
  'Custom plates': 'plates',
  'Interval timer': 'timer',
  '1-rep max': 'target',
  'Streak freeze': 'flame',
  'Profile ring': 'person',
  Celebrations: 'star',
  'Lifetime stats': 'trophy',
  'Sound packs': 'sound',
  'Head to head': 'compare',
  GymPal: 'send',
  'Max badge': 'trophy',
  'AI workout builder': 'workout',
  'AI coach notes': 'sparkle',
  'Higher GymPal limits': 'send',
};

const REASON: Record<ProReason, string> = {
  exercises: 'Create custom exercises, with their own records and history.',
  splits: 'Create your own training splits and save them to your account.',
  saved: 'You’ve reached the Free limit for saved gyms. Pro removes the limit.',
  compare: 'Free compares 2 gyms at a time. Pro compares up to 4.',
  workouts: 'Save workouts to your account and use them on any device.',
  worldwide: 'Free covers gyms in your country. Pro covers gyms worldwide.',
  progress: 'Get charts for every exercise and suggested weights for your next session.',
  themes: 'Dark mode is free. Pro adds 11 accent colours, 10 app styles and 3 more map styles.',
  balance: 'See your sets for every muscle over 4 weeks, and which ones need work.',
  warmup: 'Get warm-up sets for any working weight, with the plates for each.',
  notes: 'Add private notes to any gym, like a door code or who to ask for.',
  plates: 'Set the plate calculator to the plates your gym has.',
  timers: 'Tabata and EMOM are free. Pro lets you build and save up to 10 custom timers.',
  strength: 'See the full 1-rep max percentage table with plates, and your estimated max for 2 to 12 reps.',
  freeze: 'Keep your weekly streak through 1 missed week a month.',
  celebrations: 'Celebrate records and goals with fireworks, stars or emoji.',
  lifetime: 'See your all-time totals and favourite exercises, ready to share.',
  sounds: 'Add Arcade, a chiptune sound pack for workouts and check-ins.',
  headToHead: 'Compare your best lifts with a friend’s, exercise by exercise.',
  max: 'AI workout building and coach notes come with GymGO Max.',
  gympal: 'Free includes 20 GymPal messages a day. Pro raises that to 100 and uses your training history. Max raises it to 300.',
};

export default function ProScreen() {
  useGlassRedraw();
  usePageTitle('GymGO Pro');
  const params = useLocalSearchParams<{ reason?: string; checkout?: string }>();
  const router = useRouter();
  const { account, billing, filters, prefs } = useApp();
  // Pro, or Max: Pro with more from GymPal and a badge.
  const [plan, setPlan] = useState<'pro' | 'max'>(params.reason === 'max' ? 'max' : 'pro');
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
  // Which page is opening, for the button's words: Stripe's or PayPal's.
  const [via, setVia] = useState<'stripe' | 'paypal'>('stripe');
  const [problem, setProblem] = useState<string | null>(null);
  const [welcome, setWelcome] = useState(false);
  // Apple Pay's own button on an iPhone, iPad or Mac, Google Pay's elsewhere: in a browser, when the server has it set up.
  const deviceWallet = useMemo(() => walletHere(), []);
  const wallet = deviceWallet ? walletButtonFor(billing.wallets, deviceWallet) : null;
  // Shown only once Stripe says this device can pay with it.
  const [walletShown, setWalletShown] = useState(false);
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
    if (sale === 'unreachable' && !SERVERLESS) askSale();
    // Once, on opening; the Try again button asks after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxOnSale = billing.maxPrices.some((price) => price.currency === currency);
  const buying: 'pro' | 'max' = plan === 'max' && maxOnSale ? 'max' : 'pro';
  const planName = buying === 'max' ? 'Max' : 'Pro';
  const list = buying === 'max' ? billing.maxPrices : billing.prices;
  const monthly = proPrice('month', currency, list);
  const yearly = proPrice('year', currency, list);
  const saving = monthly && yearly ? annualSaving(monthly.amountMinor, yearly.amountMinor) : null;
  const chosen = interval === 'year' ? yearly : monthly;
  // Every button that agrees to the renewal terms, for the terms' own words.
  const alsoTapped = [walletShown && wallet ? WALLET_NAME[wallet] : null, billing.payWith?.paypal === 'direct' ? 'PayPal' : null].filter((name): name is string => name !== null);
  const tapping = (main: string) => orList([main, ...alsoTapped]);

  const subscribe = async (with_: 'stripe' | 'paypal' = 'stripe') => {
    if (!token || !chosen) return;
    setBusy(true);
    setVia(with_);
    setProblem(null);
    try {
      const start = with_ === 'paypal' ? startPayPalCheckout : startCheckout;
      const outcome = await start(token, interval, currency, buying, trial !== null);
      if (outcome === 'left') return; // The browser is on its way to Stripe or PayPal.
      const next = await billing.refresh(true);
      if (next?.plan === 'pro') {
        haptic.success();
        setWelcome(true);
      } else if (outcome === 'done') {
        setProblem(`${with_ === 'paypal' ? 'PayPal' : 'Stripe'} hasn’t confirmed your payment yet. Check back in a moment.`);
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
      const outcome = await manageSubscription(token, billing.subscription);
      if (outcome !== 'left') await billing.refresh(true);
    } catch (error) {
      setProblem(messageFor(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ScreenOptions
        options={{
          // Done on iPhone comes with the sheet (components/SheetDone.tsx); a browser and Android have their own back.
          title: '',
        }}
      />
      <PageScroll style={styles.page} contentContainerStyle={styles.content}>
        {/* Hero ------------------------------------------------------------ */}
        <View style={styles.hero}>
          <AppBadge size={72} />
          <Txt variant="largeTitle" style={styles.center} accessibilityRole="header" level={1}>
            GymGO Pro
          </Txt>
          <Txt variant="body" color={color.labelSecondary} style={styles.center} acronyms>
            {billing.isPro ? 'Thanks for supporting GymGO.' : reason ? REASON[reason] : 'Compare what’s included in each plan.'}
          </Txt>
        </View>

        {/* Already Pro --------------------------------------------------------- */}
        {billing.isPro && (
          <View style={[styles.card, styles.onPro]}>
            <Txt variant="title2">{welcome ? `Welcome to ${billing.isMax ? 'Max' : 'Pro'}` : `You’re on ${billing.isMax ? 'Max' : 'Pro'}`}</Txt>
            <Txt variant="subhead" color={color.labelSecondary}>
              {billing.grant ? grantLine(billing.grant) : describeSubscription(billing.subscription)}
            </Txt>
            {billing.grant ? null : billing.subscription?.manageable === false ? null : CAN_BUY_HERE ? (
              <PrimaryButton
                label={busy ? `Opening ${billing.subscription?.provider === 'paypal' ? 'PayPal' : 'Stripe'}…` : 'Manage subscription'}
                tone="quiet"
                disabled={busy}
                onPress={() => void manage()}
              />
            ) : (
              <Txt variant="footnote" color={color.labelSecondary}>
                {serverHosted() ? 'Manage your subscription on the GymGO website.' : 'Manage your subscription from GymGO on your computer.'}
              </Txt>
            )}
          </View>
        )}

        {/* Free vs Pro ------------------------------------------------------------ */}
        <View style={styles.card}>
          <View style={styles.tableHead}>
            <View style={styles.flex} />
            <Txt variant="footnote" color={color.labelSecondary} style={[styles.column, face('semibold')]}>
              Free
            </Txt>
            <Txt variant="footnote" color={color.brand} style={[styles.column, styles.proColumn, face('semibold')]}>
              Pro
            </Txt>
          </View>
          {/* In three groups, each under its heading, so the list reads in parts rather than as one long column. */}
          {PRO_FEATURE_GROUPS.map((group) => (
            <View key={group.id} style={styles.tableGroup}>
              <Txt variant="label" color={color.brand} style={styles.groupTitle} accessibilityRole="header" level={2}>
                {group.title}
              </Txt>
              {PRO_FEATURES.filter((feature) => feature.group === group.id).map((feature) => (
                <View key={feature.title} style={styles.tableRow}>
                  <View style={styles.featureIcon}>
                    <Icon name={FEATURE_ICON[feature.title] ?? 'star'} size={17} color={color.brand} />
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
          ))}
        </View>

        {/* What Max adds: to choose it, or (on Pro by a subscription of your own) to switch to it on Stripe's page. */}
        {maxOnSale && !billing.isMax && (
          <View style={[styles.card, buying === 'max' && !billing.isPro && styles.maxChosen]}>
            <Txt variant="headline" accessibilityRole="header" level={2}>
              GymGO Max
            </Txt>
            <Txt variant="subhead" color={color.labelSecondary}>
              {`Everything in Pro, plus AI features. From ${formatPlanPrice(proPrice('month', currency, billing.maxPrices)?.amountMinor ?? 0, currency)} a month.`}
            </Txt>
            {MAX_FEATURES.map((feature) => (
              <View key={feature.title} style={styles.tableRow}>
                <View style={styles.featureIcon}>
                  <Icon name={FEATURE_ICON[feature.title] ?? 'star'} size={17} color={color.brand} />
                </View>
                <View style={styles.flex}>
                  <Txt variant="subhead" style={face('medium')}>
                    {feature.title}
                  </Txt>
                  <Txt variant="footnote" color={color.labelSecondary}>
                    {feature.max}
                  </Txt>
                </View>
              </View>
            ))}
            {billing.isPro && !billing.grant && billing.subscription?.manageable !== false && CAN_BUY_HERE && (
              <>
                <Txt variant="footnote" color={color.labelSecondary}>
                  {billing.subscription?.provider === 'paypal'
                    ? 'You pay with PayPal. To switch, cancel Pro in PayPal, then choose Max here when it ends.'
                    : 'You’ll be charged the difference for the rest of this billing period.'}
                </Txt>
                {billing.subscription?.provider !== 'paypal' && <PrimaryButton label={busy ? 'Opening Stripe…' : 'Switch to Max'} tone="quiet" disabled={busy} onPress={() => void manage()} />}
              </>
            )}
          </View>
        )}

        {/* The plans ---------------------------------------------------------------- */}
        {!billing.isPro && (
          <>
            {maxOnSale && (
              <Segmented
                options={[
                  { value: 'pro', label: 'Pro' },
                  { value: 'max', label: 'Max' },
                ]}
                value={plan}
                onChange={setPlan}
              />
            )}
            {trialOffer && monthly && (
              <View style={[styles.card, styles.trialCard]}>
                <Txt variant="headline">{`Try Pro free for ${trialOffer.days} days`}</Txt>
                <Txt variant="subhead" color={color.labelSecondary}>
                  {`Then ${formatPlanPrice(monthly.amountMinor, currency)} a month. Cancel anytime. Offer ends ${dayLabel(trialOffer.offerEndsAt)}.`}
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
                  detail={trialOffer ? `${trialOffer.days} days free, then billed monthly` : 'Billed monthly'}
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
              via={via}
              payWith={billing.payWith}
              onPayPal={() => void subscribe('paypal')}
              wallet={
                wallet && token && chosen && billing.wallets ? (
                  <WalletButton
                    wallet={wallet}
                    publishableKey={billing.wallets.publishableKey}
                    token={token}
                    choice={{ interval, currency, plan: buying, trial: trial !== null }}
                    disabled={busy}
                    onShown={setWalletShown}
                    onProblem={setProblem}
                  />
                ) : null
              }
              label={
                trial
                  ? `Start ${trial.days}-day free trial`
                  : chosen
                    ? `Subscribe${buying === 'max' ? ' to Max' : ''} · ${formatPlanPrice(chosen.amountMinor, currency)} a ${interval}`
                    : 'Subscribe'
              }
              renewal={
                !chosen
                  ? null
                  : trial
                    ? `Free for ${trial.days} days, then ${formatPlanPrice(chosen.amountMinor, currency)} a month (tax included) until you cancel. You’ll add your payment details ${billing.payWith?.paypal === 'direct' ? 'with Stripe or PayPal' : 'with Stripe'} now. Your first payment is on ${dayLabel(trialEndsAt(new Date(), trial.days).toISOString())}; cancel before then in Profile → Manage subscription and you won’t be charged. By tapping ${tapping('Start')}, you agree to these terms and the [Terms of Service](terms). See [Refunds and Cancelling](refunds) for refunds.`
                    : `Renews at ${formatPlanPrice(chosen.amountMinor, currency)} a ${interval} (tax included) until you cancel. Cancel anytime in Profile → Manage subscription and keep ${planName} until the end of the ${interval} you’ve paid for. By tapping ${tapping('Subscribe')}, you agree to these terms and the [Terms of Service](terms). See [Refunds and Cancelling](refunds) for refunds.`
              }
              onSubscribe={() => void subscribe('stripe')}
              onSignIn={() => router.push('/sign-in')}
            />
          </>
        )}

        {/* Gift codes need the server that makes and checks them. */}
        {!SERVERLESS && (!billing.isPro || billing.grant?.via === 'gift') && <RedeemGift token={signedIn ? token : null} billing={billing} onSignIn={() => router.push('/sign-in')} />}
        {!SERVERLESS && <GiftPro token={signedIn ? token : null} billing={billing} currency={currency} onSignIn={() => router.push('/sign-in')} />}

        <LiveLine>
          {problem && (
            <View style={styles.problem}>
              <Txt variant="footnote" color={color.dangerInk}>
                {problem}
              </Txt>
            </View>
          )}
        </LiveLine>

        {/* Always free -------------------------------------------------------------------- */}
        <View style={styles.card}>
          <Txt variant="headline">Free with an account</Txt>
          {ALWAYS_FREE.map((line) => (
            <View key={line} style={styles.freeLine}>
              <Icon name="check" size={16} color={color.goodInk} />
              <Txt variant="subhead" style={styles.flex}>
                {line}
              </Txt>
            </View>
          ))}
        </View>

        <AskGymPal
          title="Questions about Pro? Ask GymPal"
          detail="Features, pricing and what’s free"
          request={{ question: 'What do GymGO Pro and Max include?' }}
        />

        <LegalText
          variant="caption"
          tint={color.labelSecondary}
          style={styles.fine}
          text="Prices include tax. Pro and Max renew until you cancel. A gift year is a one-off payment and doesn’t renew. New accounts can try monthly Pro free for 3 days, once, within 30 days of signing up; the monthly price is charged when the trial ends unless you cancel first. Cancel anytime in Profile → Manage subscription and keep your plan until the end of the period you’ve paid for. You can get a full refund within 14 days of your first payment or a yearly renewal. If your plan ends, your data stays, but you can’t add more than Free allows. Payments are processed by Stripe. GymGO doesn’t see your card details; Stripe receives your name and email for receipts. [Terms of Service](terms) · [Refunds and Cancelling](refunds) · [Privacy Policy](privacy)"
        />
      </PageScroll>
    </>
  );
}

/** Built with no GymGO server (EXPO_PUBLIC_API_URL=none): the website's demo. */
const SERVERLESS = apiBase() === null;

function BuyButton({
  signedIn,
  sale,
  onAskAgain,
  busy,
  via,
  payWith,
  onPayPal,
  wallet,
  label,
  renewal,
  onSubscribe,
  onSignIn,
}: {
  signedIn: boolean;
  sale: Sale;
  onAskAgain: () => void;
  busy: boolean;
  /** Which page is opening: Stripe's or PayPal's. */
  via: 'stripe' | 'paypal';
  /** The ways checkout takes, as the server's payment settings say; null when not known. */
  payWith: PayWith | null;
  onPayPal: () => void;
  /** Apple Pay's or Google Pay's own button (components/WalletButton.tsx), on the website. */
  wallet: ReactNode;
  label: string;
  /** The auto-renewal terms, shown right by the button that agrees to them. */
  renewal: string | null;
  onSubscribe: () => void;
  onSignIn: () => void;
}) {
  if (!CAN_BUY_HERE) {
    return (
      <Txt variant="footnote" color={color.labelSecondary} style={styles.center}>
        Pro isn’t available to buy in this version of the app.
      </Txt>
    );
  }
  // A build with no server at all (the website's demo, say): nothing to
  // reach, so not a "can't reach the server" with a Try again that can never work.
  if (SERVERLESS) {
    return (
      <Txt variant="footnote" color={color.labelSecondary} style={styles.center}>
        {LIMITED ? 'Pro is available in the full version of GymGO.' : 'Pro isn’t available to buy in this version of GymGO.'}
      </Txt>
    );
  }
  if (sale === 'asking' || sale === 'unreachable') {
    return (
      <View style={styles.gap}>
        <PrimaryButton label={sale === 'asking' ? 'Checking…' : 'Try again'} icon="refresh" tone="quiet" busy={sale === 'asking'} onPress={onAskAgain} />
        {sale === 'unreachable' && (
          <Txt variant="footnote" color={color.labelSecondary} style={styles.center}>
            Can’t connect to GymGO right now. Try again in a moment.
          </Txt>
        )}
      </View>
    );
  }
  if (sale === 'off') {
    return (
      <View style={styles.gap}>
        <PrimaryButton label="Coming soon" disabled onPress={() => undefined} />
        <Txt variant="footnote" color={color.labelSecondary} style={styles.center}>
          Payments aren’t set up yet. These are the planned prices.
        </Txt>
      </View>
    );
  }
  if (!signedIn) {
    return (
      <View style={styles.gap}>
        <PrimaryButton label="Sign in to subscribe" onPress={onSignIn} />
        <Txt variant="footnote" color={color.labelSecondary} style={styles.center}>
          Your plan is linked to your account, so it works on all your devices.
        </Txt>
      </View>
    );
  }
  // What Stripe's page takes, named only when the server has read it from the payment settings.
  const onStripe = stripePageNames(payWith);
  const paypal = payWith?.paypal === 'direct';
  return (
    <View style={styles.gap}>
      <PrimaryButton label={busy && via === 'stripe' ? 'Opening Stripe…' : label} disabled={busy} onPress={onSubscribe} />
      {onStripe.length > 0 && (
        <View style={styles.payWith}>
          <Icon name="lock" size={12} color={color.labelSecondary} />
          <Txt variant="footnote" color={color.labelSecondary} style={styles.payWithText}>
            {`Pay securely by ${orList(onStripe)} with Stripe`}
          </Txt>
        </View>
      )}
      {/* Apple Pay's button on Apple devices, Google Pay's elsewhere; there only when the device can pay with it. */}
      {wallet}
      {/* PayPal's own button: its wordmark on its colours (components/PayPalButton.tsx). */}
      {paypal && <PayPalButton busy={busy && via === 'paypal'} disabled={busy} onPress={onPayPal} />}
      {!!renewal && <LegalText variant="footnote" tint={color.labelSecondary} style={styles.center} text={renewal} />}
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
          {!!tag && (
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
  if (!subscription) return 'Pro is active on this account.';
  // The ready-made account for trying GymGO on your own computer: nobody paid, nothing renews.
  if (subscription.manageable === false) return 'Test account with Pro on this computer. No payment needed.';
  const price =
    subscription.amountMinor !== null && subscription.currency
      ? `${formatPlanPrice(subscription.amountMinor, subscription.currency)} a ${subscription.interval ?? 'period'}`
      : null;
  const date = (value: string) => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  if (subscription.trial && subscription.endsAt) return `Trial cancelled. Pro until ${date(subscription.endsAt)}, and you won’t be charged.`;
  if (subscription.trial) {
    return `Free trial${subscription.renewsAt ? ` until ${date(subscription.renewsAt)}` : ''}${price ? `, then ${price}` : ''}. Cancel before it ends and you won’t be charged.`;
  }
  if (subscription.endsAt) return [price, `Cancelled. Active until ${date(subscription.endsAt)}`].filter(Boolean).join(' · ');
  if (subscription.status === 'past_due') return 'Your last payment didn’t go through. Update your card in Manage subscription.';
  return [price, subscription.renewsAt ? `renews ${date(subscription.renewsAt)}` : null].filter(Boolean).join(' · ');
}

/** "Thu 9 Oct": a short day, in the phone's language. */
function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

function messageFor(error: unknown): string {
  if (error instanceof OfflineError) return serverOfflineLine(Platform.OS, serverHosted());
  if (error instanceof ApiError) return error.message;
  return Platform.OS === 'web' ? 'Couldn’t open Stripe. Try again.' : 'Something went wrong. Try again.';
}

const styles = themed(() => StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  gap: { gap: space[2] },
  // "Pay by card, Apple Pay or Google Pay", under the button that opens Stripe's page.
  payWith: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[1] },
  payWithText: { flexShrink: 1, textAlign: 'center' },
  page: { flex: 1, backgroundColor: color.groupedBackground },
  content: { padding: space[4], gap: space[4], paddingBottom: space[8], width: '100%', maxWidth: 560, alignSelf: 'center' },
  hero: { alignItems: 'center', gap: space[2], paddingTop: space[2] },
  card: { backgroundColor: color.plate, borderRadius: radius.xl, borderCurve: 'continuous', padding: space[4], gap: space[3], ...shadow.plate },
  onPro: { borderWidth: 2, borderColor: color.brand },
  // Max chosen below: its card is outlined, as the plan you're about to buy.
  maxChosen: { borderWidth: 2, borderColor: color.brand },
  trialCard: { gap: space[1], backgroundColor: color.brandWash, borderWidth: 1, borderColor: color.brandBorder },
  tableHead: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  tableGroup: { gap: space[3], paddingTop: space[3], borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.separator },
  groupTitle: { marginBottom: -space[1] },
  featureIcon: { width: 24, alignItems: 'center', justifyContent: 'center' },
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
    backgroundColor: color.plate,
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
