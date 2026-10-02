/**
 * The Pro screen's other ways in (apps/server/src/perks.ts):
 *
 * - Give Pro: a year as a gift code, paid once at Stripe; the codes you've
 *   bought, to send on.
 * - Redeem a code someone gave you.
 * - Duo: a Duo subscriber adds their one more person by friend code; that
 *   person sees whose Duo they're on and can leave.
 */

import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { formatPlanPrice, type BillingCurrency } from '@gymgo/domain';
import { shareText } from '@/lib/actions';
import { api, problemText, type DuoState, type GiftBought } from '@/lib/api';
import { haptic } from '@/lib/haptics';
import { CAN_BUY_HERE, startGift } from '@/lib/purchase';
import type { BillingApi } from '@/lib/useBilling';
import { color, face, radius, space, themed } from '@/lib/theme';
import { Icon } from './Icon';
import { Input, PrimaryButton, Txt } from './ui';

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

/** What makes you Pro, when it isn't your own subscription. */
export function grantLine(grant: NonNullable<BillingApi['grant']>): string {
  if (grant.via === 'gift') return `Pro until ${day(grant.endsAt!)}, a gift. No card, nothing to cancel: it simply ends.`;
  return `Pro on ${grant.from ?? 'someone'}’s Duo, for as long as they keep it.`;
}

export function GiftPro({ token, billing, currency, onSignIn }: { token: string | null; billing: BillingApi; currency: BillingCurrency; onSignIn: () => void }) {
  const [gifts, setGifts] = useState<GiftBought[]>([]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const price = billing.giftPrices.find((item) => item.currency === currency) ?? null;
  const load = useCallback(() => {
    if (token) api.giftsBought(token).then((answer) => setGifts(answer.gifts)).catch(() => undefined);
  }, [token]);
  useEffect(load, [load]);

  const buy = async () => {
    if (!token) return onSignIn();
    setBusy(true);
    setProblem(null);
    try {
      const outcome = await startGift(token, currency);
      if (outcome !== 'left') load();
    } catch (error) {
      setProblem(problemText(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Icon name="sparkle" size={20} color={color.brand} />
        <Txt variant="headline">Give Pro</Txt>
      </View>
      <Txt variant="subhead" color={color.labelSecondary}>
        {`A year of GymGO Pro for anyone, as a code to send them${price ? `: ${formatPlanPrice(price.amountMinor, currency)}, paid once, tax included` : ''}. It doesn’t renew.`}
      </Txt>
      {CAN_BUY_HERE && (
        <PrimaryButton
          label={billing.sale !== 'on' || !price ? 'Not on sale yet' : busy ? 'Opening Stripe…' : token ? 'Buy a gift code' : 'Sign in to buy a gift'}
          icon="sparkle"
          tone="quiet"
          disabled={billing.sale !== 'on' || !price || busy}
          onPress={() => void buy()}
        />
      )}
      {problem && (
        <Txt variant="footnote" color={color.dangerInk}>
          {problem}
        </Txt>
      )}
      {gifts.map((gift) => (
        <View key={gift.code} style={styles.gift}>
          <View style={styles.flex}>
            <Txt variant="headline" style={styles.code}>
              {gift.code}
            </Txt>
            <Txt variant="caption" color={color.labelSecondary}>
              {gift.redeemed ? `Used ${day(gift.redeemedAt!)}` : `Bought ${day(gift.createdAt)} · not used yet`}
            </Txt>
          </View>
          {!gift.redeemed && (
            <PrimaryButton
              label="Send"
              icon="share"
              tone="quiet"
              onPress={() => void shareText(`A year of GymGO Pro, from me. Open GymGO → Profile → GymGO Pro → Redeem, and enter ${gift.code}`, 'GymGO Pro, a gift')}
            />
          )}
        </View>
      ))}
    </View>
  );
}

export function RedeemGift({ token, billing, onSignIn }: { token: string | null; billing: BillingApi; onSignIn: () => void }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const redeem = async () => {
    if (!token) return onSignIn();
    setBusy(true);
    setNote(null);
    try {
      const next = await api.redeemGift(token, code);
      haptic.success();
      setCode('');
      await billing.refresh();
      setNote(next.grant?.endsAt ? `Done: you’re on Pro until ${day(next.grant.endsAt)}.` : 'Done: you’re on Pro.');
    } catch (error) {
      haptic.warn();
      setNote(problemText(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={styles.card}>
      <Txt variant="headline">Have a gift code?</Txt>
      <View style={styles.row}>
        <Input
          value={code}
          onChangeText={setCode}
          placeholder="K7QM-2XPH-9RTA"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={16}
          accessibilityLabel="Gift code"
          style={styles.input}
          onSubmitEditing={() => void redeem()}
        />
        <PrimaryButton label="Redeem" busy={busy} disabled={!code.trim()} onPress={() => void redeem()} />
      </View>
      {note && (
        <Txt variant="footnote" color={color.labelSecondary}>
          {note}
        </Txt>
      )}
    </View>
  );
}

export function DuoPartner({ token }: { token: string }) {
  const [duo, setDuo] = useState<DuoState | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    api.duo(token).then(setDuo).catch(() => setDuo(null));
  }, [token]);
  if (!duo || (duo.role === null && !duo.canAdd)) return null;

  const act = async (work: () => Promise<DuoState>, done: string) => {
    setBusy(true);
    setNote(null);
    try {
      setDuo(await work());
      haptic.success();
      setCode('');
      setNote(done);
    } catch (error) {
      haptic.warn();
      setNote(problemText(error));
    } finally {
      setBusy(false);
    }
  };

  if (duo.role === 'member') {
    return (
      <View style={styles.card}>
        <Txt variant="headline">{`On ${duo.partner?.displayName ?? 'someone'}’s Duo`}</Txt>
        <Txt variant="subhead" color={color.labelSecondary}>
          You have Pro for as long as they keep their Duo. Nothing is shared but Pro: they can’t see your saved gyms, workouts or anything else.
        </Txt>
        <PrimaryButton label="Leave their Duo" tone="quiet" busy={busy} onPress={() => void act(() => api.leaveDuo(token), 'You’ve left. Pro ends now unless you have it another way.')} />
      </View>
    );
  }
  return (
    <View style={styles.card}>
      <Txt variant="headline">Your Duo</Txt>
      <Txt variant="subhead" color={color.labelSecondary}>
        {duo.partner
          ? `${duo.partner.displayName} has Pro on your Duo. Nothing else is shared: not your saved gyms, workouts or collection.`
          : 'Add one more person to your Pro: enter their friend code (it’s on their Friends screen).'}
      </Txt>
      <View style={styles.row}>
        <Input value={code} onChangeText={setCode} placeholder="e.g. K7QM-2XPH" autoCapitalize="characters" autoCorrect={false} maxLength={12} accessibilityLabel="Their friend code" style={styles.input} />
        <PrimaryButton label={duo.partner ? 'Swap' : 'Add'} busy={busy} disabled={!code.trim()} onPress={() => void act(() => api.addToDuo(token, code), 'Done: they have Pro now.')} />
      </View>
      {duo.partner && <PrimaryButton label={`Take ${duo.partner.displayName} off`} tone="quiet" onPress={() => void act(() => api.leaveDuo(token), 'Done. Your Duo has room for someone again.')} />}
      {note && (
        <Txt variant="footnote" color={color.labelSecondary}>
          {note}
        </Txt>
      )}
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    card: { gap: space[3], padding: space[4], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.card },
    head: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    flex: { flex: 1, minWidth: 0 },
    input: { flex: 1, minWidth: 0, height: 48, paddingHorizontal: space[3], borderRadius: radius.md, backgroundColor: color.fill, color: color.label, fontSize: 17 },
    gift: { flexDirection: 'row', alignItems: 'center', gap: space[2], padding: space[3], borderRadius: radius.md, backgroundColor: color.fill },
    code: { ...face('bold'), letterSpacing: 1 },
  }),
);
