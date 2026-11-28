# Paying for GymGO Pro: card, Apple Pay, Google Pay, PayPal

How GymGO takes payment, and what the owner sets up to switch each way to
pay on. Nothing here has been signed up for, switched on or paid for by
Claude: every step below is the owner's. Built on 22 November 2026
(Update 249); Apple Pay's and Google Pay's own buttons on 23 November
(Update 251).

## How it works

| Way to pay | Where people pay | What switches it on |
|---|---|---|
| **Card** | Stripe's checkout page | Stripe connected (`STRIPE_SECRET_KEY`), as today |
| **Apple Pay** | Stripe's checkout page, on Safari and Apple devices that have it set up; and, on the website, from Apple Pay's own button on the Pro page | On in the Stripe Dashboard; the button also needs the publishable key and your domain registered (below) |
| **Google Pay** | Stripe's checkout page, in Chrome and on Android with a card saved; and, on the website, from Google Pay's own button on the Pro page | As for Apple Pay |
| **PayPal** | PayPal's own page, from PayPal's own button (its wordmark on its blue; white in dark mode) | Your PayPal business account's keys (below) |

- **The Pro page only names what's really on.** The server reads Stripe's
  payment method settings and says so under the Subscribe button ("Card,
  Apple Pay or Google Pay, on Stripe's secure page"). Nothing switched on, or
  settings it can't read: it says only "Card", or nothing.
- **Apple Pay and Google Pay need no code and no domain set-up.** Stripe's
  checkout page is Stripe's own (checkout.stripe.com), so Stripe has already
  registered it with Apple and Google. They show only on a device that can
  pay with them: someone on Windows in Firefox sees the card form.
- **Apple Pay's and Google Pay's own buttons, on the website.** With the
  publishable key set, the Pro page in a browser shows the wallet the
  device has under Subscribe: **Apple Pay on an iPhone, iPad or Mac**,
  **Google Pay on Android** (and on Windows, Linux or ChromeOS, in Chrome).
  Which device it is comes from what the browser says it runs on
  (`deviceWallet` in packages/domain/src/plans.ts). The button is Stripe's
  Express Checkout Element, drawn from Apple's and Google's own artwork,
  "Subscribe with Apple Pay" / "Subscribe with Google Pay", black on a
  light page and white on a dark one, the height and corners of Subscribe.
  Tapping it opens the wallet's own sheet straight away (Apple and Google
  require that of their buttons), and once paid Stripe sends the browser
  back through the server, which turns Pro on, as after Stripe's page.
  - It shows only when the device can really pay with that wallet (Apple
    Pay set up in Safari, a card saved in Google Pay), and only for the
    device's own wallet: a Mac in Chrome, where Apple Pay can't show, gets
    no wallet button (Subscribe's page still takes Google Pay there).
  - Not in the phone apps: Pro is a digital subscription, sold there
    through the stores' own purchase, and Apple doesn't allow Apple Pay for
    one inside an iPhone app.
  - Each time the page shows the button for a plan, the server makes a
    Stripe checkout for it (the page needs one before anyone taps). It
    tells Stripe nothing new about the account: it uses the Stripe customer
    the account already has, or none, and Stripe makes one from the
    wallet's name and email only if they pay. At most 60 an hour each.
- **PayPal** comes with its own button, under Subscribe, once its keys are
  set and its plans are made. It works for monthly and yearly Pro and Max,
  in A$ and US$, and for the free trial. Gift codes and day passes are still
  paid through Stripe (card, Apple Pay, Google Pay).
- **Whichever way someone pays, Pro is the same.** PayPal's subscriptions
  are kept beside Stripe's, re-read from PayPal (never taken on trust), and
  Profile → Manage subscription opens PayPal's own page (automatic payments)
  for anyone who paid with PayPal.

### Why PayPal isn't simply a switch in Stripe

Stripe offers PayPal on its own checkout page only to Stripe accounts based
in the EU (not Hungary), Liechtenstein, Norway, the UK or Switzerland, and
for subscriptions only with "PayPal recurring payments" turned on. GymGO's
prices are in A$ and US$, so the Stripe account is most likely Australian or
American, where Stripe can't offer PayPal. So GymGO takes PayPal through its
own PayPal account instead (apps/server/src/paypal.ts, PayPal's Subscriptions
API).

If your Stripe account *is* in Europe: turn PayPal on in Stripe's payment
methods (and PayPal recurring payments), and skip the PayPal steps below.
The server sees it's on and lists PayPal on Stripe's page instead of a
separate button.

## What only the owner can do

### Apple Pay and Google Pay (a few minutes)

1. Stripe Dashboard → **Settings → Payment methods**.
2. Make sure **Cards** is on, and turn on **Apple Pay** and **Google Pay**
   (both are under Wallets). New accounts usually have them on already.
3. Optional: if you want GymGO's checkouts to use a different set of
   payment methods than the rest of your Stripe account, make a new payment
   method configuration there and put its id (`pmc_…`) in
   `STRIPE_PAYMENT_METHOD_CONFIGURATION` in `apps/server/.env.local`.
4. Restart the server. Within ten minutes the Pro page names them.

To try it: open the Pro page in Safari on a Mac or iPhone with Apple Pay set
up, choose a plan, and Stripe's page shows the Apple Pay button. In test
mode Stripe takes the payment from a real Apple Pay card but charges
nothing.

### Apple Pay's and Google Pay's own buttons on the website (ten minutes, after the above)

1. Stripe Dashboard → **Developers → API keys**: copy the **publishable
   key** (`pk_test_…` in test mode; `pk_live_…` later, with the live
   secret key). Put it in `apps/server/.env.local` as
   `STRIPE_PUBLISHABLE_KEY`. Unlike the secret key it's public by design
   (web pages carry it), but keep it with the others there all the same.
   It must be the same mode as `STRIPE_SECRET_KEY`; the server checks, and
   says so at start-up if they don't match.
2. Stripe Dashboard → **Settings → Payment method domains** → Add a new
   domain: every domain the web app is opened at to buy Pro (for example
   `app.gymgo.site`), in **test mode and again in live mode**. Without it
   the wallets won't show there. They need https too, so they won't show
   on a plain `http://` address such as your computer's network address:
   try them with the server online (`gymgo -Online`, README → Put GymGO
   online) at a domain you've registered.
3. Restart the server. Its first lines say
   `Apple Pay and Google Pay buttons: on (test mode)…`.
4. **Try it:** open the Pro page in Safari on an iPhone or Mac with Apple
   Pay set up, and in Chrome on Android with a card in Google Pay. In test
   mode the wallet's real card is used but nothing is charged.
5. **Before taking real payments this way**, the Privacy Policy's wording
   (below): the button brings Stripe's code onto GymGO's page.

### PayPal (about half an hour)

1. **A PayPal business account** at paypal.com (Business), if you don't
   have one.
2. **An app at developer.paypal.com** → Apps & Credentials: create an app
   (sandbox first). Copy its **Client ID** and **Secret** into
   `apps/server/.env.local` (git-ignored, so it never reaches GitHub), as
   Verity's keys are (README → Verity). Don't paste them anywhere else, a
   chat included:
   - `PAYPAL_CLIENT_ID`
   - `PAYPAL_CLIENT_SECRET`
   - leave `PAYPAL_MODE` unset for the sandbox (no real money).
3. **Make GymGO's plans in PayPal:**
   `npx pnpm@10 --filter @gymgo/server paypal:setup`
   It makes the product "GymGO Pro" (id `GYMGO-PRO`) and a plan for each
   price, named in each plan's description (`gymgo:gymgo_pro_month_aud`, and
   `:trial` for the one with the free trial). Run it again any time; when a
   price changes in GymGO's plans it makes a new plan and retires the old one
   (its subscribers keep it).
4. **The webhook** (recommended): developer.paypal.com → your app →
   Webhooks → Add webhook, URL `https://<your server>/api/billing/paypal/webhook`,
   events: all of "Billing subscription" and "Payment sale completed". Put
   its **Webhook ID** in `PAYPAL_WEBHOOK_ID`. Without it, renewals and
   cancellations made at PayPal still show up, just when the app next checks
   (every ten minutes or so). A server on your own computer can't receive
   webhooks unless it's reachable from the internet (`gymgo -Online`).
5. **Restart the server.** Its first lines say `GymGO Pro payments (PayPal): on, sandbox`.
   The Pro page then shows the PayPal button.
6. **Try it** with a sandbox buyer account (developer.paypal.com → Sandbox
   accounts): subscribe, approve at PayPal, and you come back on Pro.
7. **Before real money**, the legal pages (below), then a live app at
   developer.paypal.com, its keys in place of the sandbox ones,
   `PAYPAL_MODE=live`, and `paypal:setup --live`.

### The legal pages, before PayPal takes real payments

The Privacy Policy and Terms name **Stripe** as the one company that takes
payments (`packages/domain/src/legal.ts`). Before anyone pays with PayPal,
they must name PayPal too, with a new legal version so everyone is asked to
agree again. Claude hasn't changed them: that wording is yours to approve.
What would change:

- Terms → Pro: "paid monthly or yearly through Stripe" becomes "through
  Stripe or PayPal"; the free trial: "Stripe takes your card" becomes
  "Stripe or PayPal takes your payment details".
- Terms → other companies' services: add PayPal for payments.
- Privacy → Payments: PayPal takes your payment on its own page; GymGO keeps
  your PayPal subscription number, plan, status and renewal date, never your
  PayPal login or card; PayPal receives your name, email and payment details
  under PayPal's privacy statement.
- Privacy → who we share with, where data is handled, how long it's kept:
  PayPal alongside Stripe.
- Refunds: "goes back to the card or account you paid with, through Stripe"
  becomes "through Stripe or PayPal"; cancelling a PayPal subscription is
  in Profile → Manage subscription, which opens PayPal.

Apple Pay and Google Pay on **Stripe's page** need no change: they're paid
through Stripe, which the pages already name.

### The Privacy Policy, before the wallet buttons take real payments

Apple Pay's and Google Pay's **own buttons** on the Pro page change two
things the Privacy Policy says. With the button, Stripe's code (Stripe.js)
loads on GymGO's Pro page for signed-in Free accounts, and Stripe uses it to
prevent fraud, setting its own cookies for that; on devices other than
Apple's, Google Pay's button comes from Google. The policy says now that
"Stripe takes your payment on its own page" and that "GymGO uses no cookies
for tracking and no analytics, advertising or tracking code" (true of
GymGO's own code, but a reader could take it to mean nothing of anyone
else's loads). Claude hasn't changed them. What would change:

- Privacy → Payments: "Stripe takes your payment on its own page" becomes
  "on its own page, or, if you use the Apple Pay or Google Pay button on
  the website's Pro page, through Stripe's form on that page and Apple's or
  Google's own payment sheet". Apple or Google receive what their wallet
  needs to pay, under their own privacy policies.
- Privacy → Cookies and tracking: add that on the website's Pro page, when
  it shows the Apple Pay or Google Pay button, Stripe's code loads to show
  it and to prevent fraud, and Stripe may set its own cookies for that,
  under Stripe's privacy policy; on devices other than Apple's, Google
  Pay's button loads from Google.
- Privacy → who we share with: Apple and Google when you pay with Apple Pay
  or Google Pay.
- Terms → other companies' services: Apple Pay and Google Pay, when you pay
  with them.

Until then: leave `STRIPE_PUBLISHABLE_KEY` unset (no button, and nothing
of Stripe's loads on GymGO's pages), or set a test key only, to try it.

## GymGO Max (Update 264, 24 Nov 2026)

The owner's tiers: **Free**, **Pro** (everything Pro had) and **Max**
(Pro, plus AI features and badges), and no Duo or family plan.

- **Max's prices** (`MAX_PRICES`, packages/domain/src/plans.ts): A$9.99 a
  month or A$79.99 a year; US$6.99 or US$54.99. Its own Stripe product,
  "GymGO Max" (metadata `gymgo: max`), prices `gymgo_max_*`.
- **What Max adds** (`MAX_FEATURES`, only what's built): **Build with
  Verity** (a workout from what you say, ready to start), a **coach's note**
  after each workout, Verity at 300 questions a day (Pro 100, Free 20) with
  twice Pro's memory of a chat, and a Max badge by your name in the feed,
  comments, friends and challenges (Updates 264 and 266).
- **Switching.** A Pro subscriber switches to Max (or back, or monthly to
  yearly) on Stripe's page for their subscription (Profile → Manage
  subscription), which charges or credits the difference for the days left.
  Checkout never makes a second subscription: it answers `switch_plan`.
  PayPal subscriptions can't be switched in place, so the Pro page says to
  cancel Pro at PayPal and choose Max once it ends.
- **Duo is gone**: no price, no routes, nothing on the Pro page. Anyone who
  had subscribed to Duo keeps Pro until they cancel; their partner's place
  is gone. The setup script takes the Duo product off sale.
- **Verity's limit is per person, and OpenRouter's free models have their
  own daily limit for the whole account** (50 a day, or 1,000 once $10 of
  credit is bought there). A few busy Max subscribers could use that up.
  Before selling Max widely, think about OpenRouter credit or a paid model
  for Max.

### What only the owner does

1. **Run the Stripe setup again** (test mode first):
   `npx pnpm@10 --filter @gymgo/server stripe:setup`. It makes the Max
   product and prices, takes Duo off sale, and turns on switching between
   Pro and Max on Stripe's subscription page (the "customer portal"
   settings it made before are brought up to date).
2. **PayPal** (only if you use it): `paypal:setup` again makes the Max plans.
3. **The legal pages, before Max takes real payments.** The Terms and
   Privacy Policy still describe Pro Duo and don't name Max
   (`packages/domain/src/legal.ts`). Claude hasn't changed them: the wording
   is yours to approve, with a new legal version so everyone agrees again.
   What would change:
   - Terms → Pro: "Pro Duo is the same subscription for two…" becomes:
     "GymGO Max is everything in Pro, with more from Verity and a Max badge
     shown by your name to your friends, at its own price. You can switch
     between Pro and Max on Stripe's page for your subscription; the
     difference for the time left is charged or credited."
   - Privacy → what we keep: drop "who’s on your Duo (or whose you’re on)";
     add that friends can see whether you're on Max (the badge).

## Refunds and disputes (Update 276, 24 Nov 2026)

When Stripe refunds a payment or a customer disputes one, the server now
keeps a record (`stripe_money_events`) and emails it to the address bug
reports go to (`GYMGO_BUG_REPORT_TO`, sent with the same mail settings).
The email says how much, which charge and which GymGO account, and, for a
dispute, the date evidence is due, with a link to the payment or dispute in
Stripe's dashboard.

**Nobody's access changes.** A refund doesn't cancel a subscription in
Stripe, so someone refunded stays Pro or Max until you also cancel their
subscription in Stripe's dashboard (the server hears about that and ends
it). A disputed payment doesn't end Pro either. Whether a refund or a lost
dispute should end access, or void an unused gift code, is your decision;
it hasn't been built either way.

**What you do:** add `charge.refunded`, `charge.dispute.created` and
`charge.dispute.closed` to the webhook endpoint's events in Stripe
(Developers → Webhooks → your endpoint → Select events), next to
`checkout.session.completed` and `customer.subscription.*`. The Privacy
Policy's list of what's kept may want a line for refund and dispute
records when you next approve its wording.

## The phone apps and the stores

Pro is a digital subscription, so the App Store and Google Play have their
own rules for selling it inside the iPhone and Android apps (Apple's
in-app purchase, Google Play Billing), with exceptions that depend on the
country. That's unchanged by this: a store build only offers to buy Pro
when `EXPO_PUBLIC_NATIVE_CHECKOUT=on` (`apps/mobile/src/lib/purchase.ts`),
and the website takes payment as above. In particular, Apple doesn't allow
Apple Pay to be used for a digital subscription inside an iPhone app; on
the website, in Safari, it's fine.

## What's built (Updates 249 and 251)

- `packages/domain/src/plans.ts`: `PayWith` (card, Apple Pay, Google Pay,
  Link, PayPal as 'stripe' or 'direct'), `stripePageNames`, `orList`.
- `apps/server/src/billing.ts`: `payWith()` reads Stripe's payment method
  configuration (the account's default, or `STRIPE_PAYMENT_METHOD_CONFIGURATION`),
  cached ten minutes; checkouts and one-off payments pass the chosen
  configuration. The plan view says which company a subscription is with
  (`provider`) and where a PayPal one is managed (`manageUrl`).
- `apps/server/src/paypal.ts`: PayPal's REST client (OAuth token kept until
  it expires, PayPal-Request-Id so a double click makes one subscription),
  plans read back by product and description, status in Stripe's terms (a
  cancelled subscription keeps Pro to the end of what was paid for),
  checkout, the return, re-syncing, webhooks (signature checked by PayPal,
  each event once), cancelling on account deletion.
- `apps/server/src/paypal-setup.ts` (`paypal:setup`): the product and plans.
- Routes: `POST /api/billing/paypal/checkout`, `GET /api/billing/paypal/return`,
  `POST /api/billing/paypal/webhook`; `GET /api/billing/plans` now includes
  `payWith`.
- The app: the line under Subscribe, PayPal's button (components/PayPalButton.tsx: PayPal's own wordmark and colours, Update 250), the renewal
  terms naming both buttons, Manage subscription opening PayPal for PayPal
  subscribers.
- Apple Pay's and Google Pay's own buttons (Update 251):
  `STRIPE_PUBLISHABLE_KEY` (config.ts; main.ts checks its shape and mode);
  `Billing.wallets()` (the key, and which wallet is on, for
  `GET /api/billing/plans` as `wallets`); `Billing.walletCheckout()` and
  `POST /api/billing/wallet` (the same subscription checkout as Stripe's
  page, with `ui_mode: 'elements'` and `return_url` instead of the page's
  settings, returning `{ clientSecret }`; the account's existing Stripe
  customer or none). In the app: `deviceWallet` and `walletButtonFor`
  (packages/domain), `walletHere` (lib/purchase.ts), lib/stripeJs.ts
  (loads `https://js.stripe.com/dahlia/stripe.js`, the API version the
  server's Stripe library speaks), components/WalletButton.tsx (the
  Express Checkout Element: only the device's wallet, `subscribe` buttons,
  black or white, 52 high; shown once Stripe's `ready` says it can pay; a
  run of plan taps makes one checkout; `confirm` through Stripe's actions)
  and WalletButton.native.tsx (nothing, in the phone apps). The renewal
  terms name the wallet button when it shows.
- Tests: `apps/server/src/paypal.test.ts` (31: plans, status, the ways to
  pay, the wallet buttons' checkout, checkout to Pro, the trial, webhooks,
  account deletion, the client against a stand-in fetch) and the device
  check in packages/domain/src/plans.test.ts. Nothing has touched the real
  Stripe or PayPal: there are no keys here. The Pro page was checked in a
  browser with a stand-in Stripe.js (each device, light and dark, a device
  that can't pay) and with the real Stripe.js and a dummy key (no button,
  no errors); a real wallet payment hasn't been tried.
