/**
 * Paying for GymGO Pro: Stripe's own checkout page (card, Apple Pay, Google
 * Pay, whichever are on), or PayPal's, opened from the app; on the website,
 * Apple Pay's or Google Pay's own button too (components/WalletButton.tsx).
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

import { deviceWallet, type BillingCurrency, type BillingInterval, type Wallet } from '@gymgo/domain';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { api } from './api';

const nativeSwitch = process.env.EXPO_PUBLIC_NATIVE_CHECKOUT;

/** This build may take people to Stripe to buy or manage Pro. */
export const CAN_BUY_HERE = Platform.OS === 'web' || nativeSwitch === 'on' || (__DEV__ && nativeSwitch !== 'off');

export type PurchaseOutcome = 'done' | 'cancelled' | 'left';

/**
 * This device's wallet, for its own button on the Pro page: Apple Pay on an
 * iPhone, iPad or Mac, Google Pay on Android and the rest, from what the
 * browser says it runs on. None in the phone apps, which sell Pro through
 * their stores.
 */
export function walletHere(): Wallet | null {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return null;
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  return deviceWallet({ userAgent: nav.userAgent, platform: nav.platform, uaPlatform: nav.userAgentData?.platform });
}

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

/** Stripe Checkout for Pro or Duo; `trial` when the Pro screen showed the free trial (monthly Pro only). */
export async function startCheckout(token: string, interval: BillingInterval, currency: BillingCurrency, plan: 'pro' | 'duo' = 'pro', trial = false): Promise<PurchaseOutcome> {
  const back = returnUrl('pro');
  const { url } = await api.checkout(token, { interval, currency, returnUrl: back, plan, ...(trial ? { trial } : {}) });
  return visit(url, back);
}

/**
 * The checkout behind Apple Pay's or Google Pay's own button on the Pro page
 * (the website only, components/WalletButton.tsx): Stripe.js opens the
 * wallet with this, then comes back to the Pro page through the server.
 */
export async function walletCheckoutSecret(token: string, interval: BillingInterval, currency: BillingCurrency, plan: 'pro' | 'duo' = 'pro', trial = false): Promise<string> {
  const { clientSecret } = await api.walletCheckout(token, { interval, currency, returnUrl: returnUrl('pro'), plan, ...(trial ? { trial } : {}) });
  return clientSecret;
}

/** Pro (or Duo) paid with PayPal, on PayPal's own page; `trial` as for Stripe. */
export async function startPayPalCheckout(token: string, interval: BillingInterval, currency: BillingCurrency, plan: 'pro' | 'duo' = 'pro', trial = false): Promise<PurchaseOutcome> {
  const back = returnUrl('pro');
  const { url } = await api.paypalCheckout(token, { interval, currency, returnUrl: back, plan, ...(trial ? { trial } : {}) });
  return visit(url, back);
}

/** Where a PayPal subscription is managed: PayPal's automatic payments, in the browser (nothing to come back from). */
export async function openPayPalManage(url: string): Promise<void> {
  if (Platform.OS === 'web') {
    window.open(url, '_blank', 'noopener');
    return;
  }
  await WebBrowser.openBrowserAsync(url);
}

/** A year of Pro as a gift code: paid once at Stripe. */
export async function startGift(token: string, currency: BillingCurrency): Promise<PurchaseOutcome> {
  const back = returnUrl('pro');
  const { url } = await api.giftCheckout(token, { currency, returnUrl: back });
  return visit(url, back);
}

/** A partner day pass for a day, paid at Stripe; back to the gym's page. */
export async function startPassBooking(token: string, passId: string, forDate: string, gymId: string): Promise<PurchaseOutcome> {
  const back = returnUrl(`gym/${encodeURIComponent(gymId)}`);
  const { url } = await api.bookPass(token, passId, { forDate, returnUrl: back });
  return visit(url, back);
}

/**
 * Where a subscription is managed: PayPal's automatic payments for one paid
 * with PayPal, Stripe's page for the rest. PayPal's opens in the browser,
 * with nothing to come back from ('left').
 */
export async function manageSubscription(token: string, subscription: { provider?: 'stripe' | 'paypal'; manageUrl?: string | null } | null): Promise<PurchaseOutcome> {
  if (subscription?.provider === 'paypal' && subscription.manageUrl) {
    await openPayPalManage(subscription.manageUrl);
    return 'left';
  }
  return openManage(token);
}

/** Stripe's page to change card, see receipts, or cancel. */
export async function openManage(token: string): Promise<PurchaseOutcome> {
  const back = returnUrl('profile');
  const { url } = await api.billingPortal(token, back);
  return visit(url, back);
}
