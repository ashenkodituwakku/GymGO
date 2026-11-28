/**
 * Stripe.js, for Apple Pay's and Google Pay's own buttons on the Pro page
 * (components/WalletButton.tsx). Only the website loads it, and only when
 * the Pro page shows one of those buttons: nothing of Stripe's is on any
 * other page.
 *
 * Loaded from Stripe, as Stripe requires (never bundled or copied), at the
 * API version the server's Stripe library speaks (stripe 22.6:
 * 2026-08-26.dahlia), since Stripe.js reads the checkout the server made.
 * Only the few parts GymGO uses are typed here.
 */

export const STRIPE_JS_URL = 'https://js.stripe.com/dahlia/stripe.js';

export type WalletChoice = 'auto' | 'always' | 'never';

export interface ExpressCheckoutOptions {
  paymentMethods?: Partial<Record<'applePay' | 'googlePay' | 'link' | 'paypal' | 'amazonPay' | 'klarna', WalletChoice>>;
  buttonType?: { applePay?: string; googlePay?: string };
  buttonTheme?: { applePay?: 'black' | 'white' | 'white-outline'; googlePay?: 'black' | 'white' };
  /** 40 to 55 pixels. */
  buttonHeight?: number;
}

export interface ExpressCheckoutConfirmEvent {
  expressPaymentType: string;
  paymentFailed(details?: { reason?: string; message?: string }): void;
}

export interface ExpressCheckoutElement {
  mount(target: HTMLElement): void;
  destroy?(): void;
  unmount?(): void;
  on(event: 'ready', handler: (event: { availablePaymentMethods?: Record<string, boolean> | null }) => void): void;
  on(event: 'confirm', handler: (event: ExpressCheckoutConfirmEvent) => void): void;
  on(event: 'loaderror', handler: (event: { error?: { message?: string } }) => void): void;
}

export interface CheckoutActions {
  confirm(options: { expressCheckoutConfirmEvent: ExpressCheckoutConfirmEvent }): Promise<{ type: 'success' } | { type: 'error'; error: { message: string } }>;
}

export interface CheckoutElementsSdk {
  createExpressCheckoutElement(options?: ExpressCheckoutOptions): ExpressCheckoutElement;
  loadActions(): Promise<{ type: 'success'; actions: CheckoutActions } | { type: 'error'; error?: { message?: string } }>;
}

export interface StripeJs {
  initCheckoutElementsSdk(options: {
    clientSecret: string | Promise<string>;
    elementsOptions?: { appearance?: { theme?: 'stripe' | 'night' | 'flat'; variables?: Record<string, string> } };
  }): CheckoutElementsSdk;
}

type StripeFactory = (publishableKey: string) => StripeJs;

declare global {
  interface Window {
    Stripe?: StripeFactory;
  }
}

let loading: Promise<StripeFactory> | null = null;
const instances = new Map<string, StripeJs>();

function loadScript(): Promise<StripeFactory> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return Promise.reject(new Error('Stripe.js runs in a browser.'));
  if (window.Stripe) return Promise.resolve(window.Stripe);
  if (!loading) {
    loading = new Promise<StripeFactory>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = STRIPE_JS_URL;
      script.async = true;
      script.onload = () => (window.Stripe ? resolve(window.Stripe) : reject(new Error('Stripe.js didn’t start.')));
      script.onerror = () => {
        // Offline, or blocked: let the next visit to the Pro page try again.
        loading = null;
        script.remove();
        reject(new Error('Stripe.js didn’t load.'));
      };
      document.head.appendChild(script);
    });
  }
  return loading;
}

/** Stripe.js for this publishable key, loading it the first time. */
export async function stripeJs(publishableKey: string): Promise<StripeJs> {
  const known = instances.get(publishableKey);
  if (known) return known;
  const stripe = (await loadScript())(publishableKey);
  instances.set(publishableKey, stripe);
  return stripe;
}
