/**
 * Paying for GymGO Pro: Stripe's own checkout page, opened from the app.
 *
 * In a browser the page simply goes to Stripe and comes back. On a phone it
 * opens in an in-app browser that closes itself when Stripe sends you back
 * (through the GymGO server, which confirms the payment on the way).
 *
 * App stores have their own rules for selling subscriptions inside an app
 * (see docs/STATUS.md). So a phone build only offers to buy Pro when that's
 * switched on: always while developing in Expo Go, and in a store build only
 * with EXPO_PUBLIC_NATIVE_CHECKOUT=on.
 */

import type { BillingCurrency, BillingInterval } from '@gymgo/domain';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { api } from './api';

const nativeSwitch = process.env.EXPO_PUBLIC_NATIVE_CHECKOUT;

/** This build may take people to Stripe to buy or manage Pro. */
export const CAN_BUY_HERE = Platform.OS === 'web' || nativeSwitch === 'on' || (__DEV__ && nativeSwitch !== 'off');

export type PurchaseOutcome = 'done' | 'cancelled' | 'left';

/** Where Stripe sends people back to: the app's screen at `path`. */
function returnUrl(path: string): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return `${window.location.origin}/${path}`;
  return Linking.createURL(path);
}

async function visit(url: string, back: string): Promise<PurchaseOutcome> {
  if (Platform.OS === 'web') {
    window.location.assign(url);
    return 'left';
  }
  // An ephemeral session: no "wants to use … to sign in" prompt, no shared cookies.
  const result = await WebBrowser.openAuthSessionAsync(url, back, { preferEphemeralSession: true });
  if (result.type !== 'success') return 'cancelled';
  const checkout = Linking.parse(result.url).queryParams?.checkout;
  return checkout === 'cancelled' ? 'cancelled' : 'done';
}

export async function startCheckout(token: string, interval: BillingInterval, currency: BillingCurrency): Promise<PurchaseOutcome> {
  const back = returnUrl('pro');
  const { url } = await api.checkout(token, { interval, currency, returnUrl: back });
  return visit(url, back);
}

/** Stripe's page to change card, see receipts, or cancel. */
export async function openManage(token: string): Promise<PurchaseOutcome> {
  const back = returnUrl('profile');
  const { url } = await api.billingPortal(token, back);
  return visit(url, back);
}
