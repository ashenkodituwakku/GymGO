/**
 * Which plan you're on, and what Pro costs.
 *
 * The server decides "Free or Pro" (it's the one Stripe tells); the app just
 * asks. The last answer is kept on the device so a Pro subscriber isn't
 * treated as Free when the server can't be reached for a moment.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LIMITS, PRO_PRICES, type PlanId, type ProPrice } from '@gymgo/domain';
import { useCallback, useEffect, useState } from 'react';
import { api, type BillingState } from './api';
import type { AccountApi } from './useAccount';

const PLAN_KEY = 'gymgo.plan.v1';

export function useBilling(account: AccountApi) {
  const [offer, setOffer] = useState<{ available: boolean; prices: ProPrice[] }>({ available: false, prices: PRO_PRICES });
  const [state, setState] = useState<BillingState | null>(null);
  const [remembered, setRemembered] = useState<PlanId>('free');
  const token = account.token;
  const signedIn = account.state === 'signed_in' || account.state === 'unreachable';

  useEffect(() => {
    api
      .billingPlans()
      .then((result) => setOffer({ available: result.available, prices: result.prices }))
      .catch(() => undefined);
    AsyncStorage.getItem(PLAN_KEY)
      .then((value) => setRemembered(value === 'pro' ? 'pro' : 'free'))
      .catch(() => undefined);
  }, []);

  /** Ask the server again; `fromStripe` makes it re-read Stripe first. */
  const refresh = useCallback(
    async (fromStripe = false): Promise<BillingState | null> => {
      if (!token) return null;
      try {
        const next = fromStripe ? await api.syncBilling(token) : await api.billing(token);
        setState(next);
        setOffer((current) => ({ ...current, available: next.available }));
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
    /** Pro can be bought through this server right now. */
    available: offer.available,
    prices: offer.prices,
    refresh,
  };
}

export type BillingApi = ReturnType<typeof useBilling>;
