/**
 * Apple Pay's or Google Pay's own button, on the Pro page in a browser:
 * Apple Pay on an iPhone, iPad or Mac, Google Pay on Android and everything
 * else (deviceWallet, @gymgo/domain). Tapping it opens the wallet's own
 * sheet straight away, as Apple and Google require of their buttons, and
 * Stripe sends the browser back to GymGO once it's paid.
 *
 * The button is drawn by Stripe's Express Checkout Element, from Apple's and
 * Google's own artwork: black on a light page, white on a dark one, the
 * height and corners of the app's other buttons. It shows only when the
 * device can really pay with that wallet (Apple Pay set up in Safari, a card
 * saved in Google Pay), so nobody taps a button that can't work; and until
 * then, or if Stripe can't be reached, there's no gap where it would be.
 *
 * The phone apps have none (WalletButton.native.tsx).
 */

import type { BillingCurrency, BillingInterval, Wallet } from '@gymgo/domain';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type ViewInstance } from 'react-native';
import { walletCheckoutSecret } from '@/lib/purchase';
import { stripeJs, type ExpressCheckoutElement } from '@/lib/stripeJs';
import { currentTheme, radius } from '@/lib/theme';

export interface WalletButtonProps {
  wallet: Wallet;
  /** Stripe's publishable key, from the server. */
  publishableKey: string;
  token: string;
  choice: { interval: BillingInterval; currency: BillingCurrency; plan: 'pro' | 'duo'; trial: boolean };
  /** Another checkout is opening: the button can't be tapped meanwhile. */
  disabled?: boolean;
  /** Whether the button is showing, for the renewal terms that name it. */
  onShown?: (shown: boolean) => void;
  /** Something to tell the person (the wallet was declined, say). */
  onProblem?: (message: string) => void;
}

/** A run of quick taps on the plans makes one checkout, for the last. */
const SETTLE_MS = 350;

export function WalletButton({ wallet, publishableKey, token, choice, disabled = false, onShown, onProblem }: WalletButtonProps) {
  // On the web a View is its own <div>, which Stripe's button goes into.
  const host = useRef<ViewInstance>(null);
  const [shown, setShown] = useState(false);
  const dark = currentTheme().scheme === 'dark';
  const cornerRadius = radius.lg;
  // The latest callbacks, without making a new checkout when only they change.
  const said = useRef({ onShown, onProblem });
  said.current = { onShown, onProblem };
  const { interval, currency, plan, trial } = choice;

  useEffect(() => {
    let gone = false;
    let element: ExpressCheckoutElement | null = null;
    const show = (next: boolean) => {
      if (gone) return;
      setShown(next);
      said.current.onShown?.(next);
    };
    show(false);
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const [stripe, clientSecret] = await Promise.all([stripeJs(publishableKey), walletCheckoutSecret(token, interval, currency, plan, trial)]);
          const target = host.current as unknown as HTMLElement | null;
          if (gone || !target) return;
          const checkout = stripe.initCheckoutElementsSdk({
            clientSecret,
            elementsOptions: { appearance: { theme: dark ? 'night' : 'stripe', variables: { borderRadius: `${cornerRadius}px` } } },
          });
          const actions = checkout.loadActions();
          element = checkout.createExpressCheckoutElement({
            // Only this device's own wallet: none of the others Stripe could add.
            paymentMethods: {
              applePay: wallet === 'applePay' ? 'auto' : 'never',
              googlePay: wallet === 'googlePay' ? 'auto' : 'never',
              link: 'never',
              paypal: 'never',
              amazonPay: 'never',
              klarna: 'never',
            },
            buttonType: { applePay: 'subscribe', googlePay: 'subscribe' },
            buttonTheme: dark ? { applePay: 'white', googlePay: 'white' } : { applePay: 'black', googlePay: 'black' },
            buttonHeight: 52,
          });
          element.on('ready', (event) => show(Object.values(event.availablePaymentMethods ?? {}).some(Boolean)));
          element.on('loaderror', () => show(false));
          element.on('confirm', (event) => {
            void (async () => {
              const loaded = await actions;
              if (loaded.type !== 'success') {
                event.paymentFailed({ reason: 'fail' });
                said.current.onProblem?.('Stripe couldn’t start the payment. Try again, or use Subscribe.');
                return;
              }
              // On success Stripe.js takes the browser back through the server, which turns Pro on.
              const result = await loaded.actions.confirm({ expressCheckoutConfirmEvent: event });
              if (result.type === 'error') said.current.onProblem?.(result.error.message);
            })();
          });
          element.mount(target);
        } catch {
          // No button: Subscribe and Stripe's own page still take Apple Pay and Google Pay.
          show(false);
        }
      })();
    }, SETTLE_MS);
    return () => {
      gone = true;
      clearTimeout(timer);
      // Taken away (another plan, or off the page): the terms stop naming it.
      said.current.onShown?.(false);
      if (element?.destroy) element.destroy();
      else element?.unmount?.();
    };
  }, [wallet, publishableKey, token, interval, currency, plan, trial, dark, cornerRadius]);

  return (
    <View
      ref={host}
      // Its own sheet is the wallet's: nothing to read out here until it's there.
      aria-hidden={!shown}
      style={[styles.host, !shown && styles.waiting, disabled && styles.disabled]}
    />
  );
}

const styles = StyleSheet.create({
  host: { minHeight: 0 },
  // Its full size but out of sight, and out of the way, until Stripe says the wallet can pay: no gap, no flash of an empty frame.
  waiting: { position: 'absolute', left: 0, right: 0, opacity: 0, pointerEvents: 'none' },
  disabled: { opacity: 0.45, pointerEvents: 'none' },
});
