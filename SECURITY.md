# Security

## Reporting a problem

If you find a security problem in GymGO, please tell us privately first and
give us time to fix it before telling anyone else. Don't open a public issue.

- A hosted GymGO says where to write in `/.well-known/security.txt` (from
  the server's `GYMGO_CONTACT_EMAIL`).
- Otherwise, use **Profile → Report a bug** in the app and say it's a
  security problem.

Please include what you found, how to reproduce it, and what it lets
someone do. Testing against a GymGO that isn't yours needs its owner's
written permission (the Terms of Service say so).

## What's in place

**Accounts and sign-in**
- Passwords are hashed with scrypt and a salt per password. The commonest
  breached passwords, one character repeated, and your own email address are
  refused.
- Sign-in tokens are 256-bit random values. The database keeps only their
  SHA-256 hash, so a copied database file doesn't hand out sign-ins. They
  expire after 30 days and are deleted then.
- Changing your password signs out every other device, and resetting it
  signs out all of them.
- Wrong passwords are limited to 10 per address and email per 15 minutes,
  and 30 an hour for one email from anywhere. A login takes the same time
  whether or not the account exists.
- Forgot password emails a one-time link, kept only as a hash, that works
  for 30 minutes. The answer is the same whether or not an address has an
  account. The link is built from `GYMGO_PUBLIC_URL`, never from the
  request, so a forged `Host` header can't send it elsewhere.
- Sign in with Google and Apple checks the ID token's signature, audience,
  issuer, expiry and nonce. An existing password account is never joined to
  an identity on email alone.
- On phones, the sign-in token is kept in the system keychain (SecureStore).

**The server**
- Every route that changes something checks permission on the server. The
  app hiding a button is not access control.
- SQL is always parameterised. Request bodies are size-limited (16 KB of
  JSON; uploads have their own limits). Uploaded images are checked to be
  real JPEG or PNG and have their metadata, including location, removed.
- Rate limits cover sign-up, sign-in, password reset emails, uploads,
  reports, area searches and bug reports. They forget each key once its
  window passes, so memory stays bounded. Behind Caddy
  (`GYMGO_TRUST_PROXY=on`) they use the caller's real address.
- Headers on every answer: `nosniff`, `Referrer-Policy: no-referrer`,
  `X-Frame-Options: DENY`, a `default-src 'none'` CSP, a
  `Permissions-Policy`, and HSTS when hosted on https. HTML pages set
  tighter CSPs of their own.
- Slow or half-sent requests are dropped: 30 seconds for headers, 2
  minutes for the whole request.
- Stripe webhooks are checked against their signature, and each event is
  acted on once. GymGO never sees a card.
- Secrets live only in `apps/server/.env.local` or `deploy/.env`. Both are
  git-ignored, and the app never sees them.

**Hosting (`deploy/`)**
- HTTPS everywhere, with certificates from Let's Encrypt renewed by Caddy.
  Plain HTTP redirects to HTTPS.
- The server runs as an unprivileged user in its container and isn't
  published to the internet itself; only Caddy is.
- The database is copied every day and copies are kept 14 days.

## Running a public GymGO safely

- Keep the server's operating system updated
  (`sudo apt update && sudo apt upgrade`, or turn on unattended upgrades),
  and update GymGO with `deploy/update.sh`.
- Allow only ports 22, 80 and 443 in. Sign in to the server with an SSH key,
  not a password.
- Never set `GYMGO_DEV_PRO` on a hosted server (it refuses to anyway).
  Set `GYMGO_TRUST_PROXY` only behind a proxy.
- Use Stripe test keys until launch. If a key leaks, roll it in Stripe
  straight away, along with the webhook secret.
- Copy `deploy/data` off the server regularly, and try restoring a copy once
  so you know it works.
- Run `pnpm audit --prod` now and then.

## Known limits

- Rate limits are kept in memory, per server: fine for one server, reset on
  restart.
- No two-step sign-in yet, and email addresses aren't verified at sign-up.
- The web map's MapLibre 5 has an advisory in its HTML sanitizer, fixed only
  in MapLibre 6, whose worker Metro can't bundle yet. GymGO never gives it
  HTML: the map credit is drawn as fixed text, and no popups are used.
- `pnpm audit` also lists advisories in build-time tools (Next.js's
  PostCSS, Expo's config plugins) and in a URL decoder used by expo-router.
  None of them handles untrusted input on the server.
- The hosted web app has no Content-Security-Policy of its own yet. The map
  tiles, Google's embeds and gyms' images come from many origins.
