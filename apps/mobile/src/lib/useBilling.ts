/**
 * Which plan you're on, and what Pro costs.
 *
 * The server decides "Free or Pro" (it's the one Stripe tells); the app just
 * asks. The last answer is kept on the device so a Pro subscriber isn't
 * treated as Free when the server can't be reached for a moment.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DUO_PRICES, GIFT_PRICES, LIMITS, PRO_PRICES, type BillingCurrency, type PlanId, type ProPrice } from '@gymgo/domain';
import { useCallback, useEffect, useState } from 'react';
import { api, type BillingState } from './api';
import type { AccountApi } from './useAccount';

const PLAN_KEY = 'gymgo.plan.v1';

/**
 * Whether Pro can be bought through this server: still asking, couldn't ask
 * (out of reach), or its answer. Couldn't-ask isn't "not on sale", so it's
 * kept apart, and asked again when the Pro screen opens.
 */
export type Sale = 'asking' | 'unreachable' | 'on' | 'off';

export function useBilling(account: AccountApi) {
  const [offer, setOffer] = useState<{ sale: Sale; prices: ProPrice[]; duo: ProPrice[]; gifts: Array<{ currency: BillingCurrency; amountMinor: number }> }>({
    sale: 'asking',
    prices: PRO_PRICES,
    duo: DUO_PRICES,
    gifts: GIFT_PRICES,
  });
  const [state, setState] = useState<BillingState | null>(null);
  const [remembered, setRemembered] = useState<PlanId>('free');
  const token = account.token;
  const signedIn = account.state === 'signed_in' || account.state === 'unreachable';

  const askSale = useCallback(() => {
    setOffer((current) => (current.sale === 'unreachable' ? { ...current, sale: 'asking' } : current));
    api
      .billingPlans()
      .then((result) => setOffer({ sale: result.available ? 'on' : 'off', prices: result.prices, duo: result.duo ?? [], gifts: result.gifts ?? [] }))
      .catch(() => setOffer((current) => (current.sale === 'asking' ? { ...current, sale: 'unreachable' } : current)));
  }, []);

  useEffect(() => {
    askSale();
    AsyncStorage.getItem(PLAN_KEY)
      .then((value) => setRemembered(value === 'pro' ? 'pro' : 'free'))
      .catch(() => undefined);
  }, [askSale]);

  /** Ask the server again; `fromStripe` makes it re-read Stripe first. */
  const refresh = useCallback(
    async (fromStripe = false): Promise<BillingState | null> => {
      if (!token) return null;
      try {
        const next = fromStripe ? await api.syncBilling(token) : await api.billing(token);
        setState(next);
        setOffer((current) => ({ ...current, sale: next.available ? 'on' : 'off' }));
        setRemembered(next.plan);
        AsyncStorage.setItem(PLAN_KEY, next.plan).catch(() => undefined);
        return next;
      } catch {
        return null;
      }
    },
    [token],
  );

  useEffect(() => {
    if (account.state === 'signed_in') void refresh();
    if (account.state === 'signed_out') {
      setState(null);
      setRemembered('free');
      AsyncStorage.removeItem(PLAN_KEY).catch(() => undefined);
    }
  }, [account.state, refresh]);

  const plan: PlanId = state?.plan ?? (signedIn ? remembered : 'free');
  return {
    plan,
    isPro: plan === 'pro',
    /** The plan is the server's answer, not a guess from last time (or you're signed out, so it's Free). */
    planKnown: state !== null || account.state === 'signed_out',
    limits: LIMITS[plan],
    subscription: state?.subscription ?? null,
    /** Whether Pro can be bought through this server right now. */
    sale: offer.sale,
    askSale,
    prices: offer.prices,
    /** Duo's prices, and a gift year's (empty when the server doesn't sell them). */
    duoPrices: offer.duo,
    giftPrices: offer.gifts,
    /** Your own subscription is a Duo. */
    duo: state?.duo === true,
    /** Pro through a gift or someone's Duo. */
    grant: state?.grant ?? null,
    refresh,
  };
}

export type BillingApi = ReturnType<typeof useBilling>;
