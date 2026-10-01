# Handoff

How to carry GymGO on in a new Claude Code session (another account, or
after usage runs out). Kept up to date at every pushed step.

## The prompt

Paste this into a new Claude Code session that can reach
`ashenkodituwakku/GymGO`:

> You're continuing work on GymGO, a truthful gym finder (Expo app + Node
> server) in the GitHub repo `ashenkodituwakku/GymGO`. Check out the branch
> `claude/friendly-johnson-9rzxrj` and read `docs/HANDOFF.md` first, then
> `README.md`, `docs/STATUS.md` and `SECURITY.md`. Follow the working rules
> in the handoff exactly, and carry on from its "Next up" list. Push every
> finished, tested step to `claude/friendly-johnson-9rzxrj`. Don't open a
> pull request unless I ask.

If the new session is told to develop on a different branch, it should
still merge into and push `claude/friendly-johnson-9rzxrj`, because that's
the branch the owner's launcher pulls.

## Working rules

- **Branches.** `claude/friendly-johnson-9rzxrj` is what the owner's
  launcher (`gymgo -update`) pulls. Other sessions may push to it too:
  always `git fetch`, then **merge** (never rebase or force-push), and
  check `git merge-base --is-ancestor origin/claude/friendly-johnson-9rzxrj
  HEAD` before pushing.
- **Commits.** Small, verified steps with clear messages that say what
  changed and how it was checked. No AI model names in commits or code. No
  pull requests unless the owner asks.
- **Truth first** (the product's rule). Unknown isn't no; a missing fee
  isn't $0. Every fact about a gym carries its source and date. Never invent
  prices, reviews, busyness, partnerships or photos for real gyms. A missing
  image says "No photo supplied".
- **Owner's go-ahead needed.** Spending money, deploying publicly,
  contacting gyms, publishing, store submissions or live payments. Never
  read or expose API keys or credentials unless asked.
- **Check before saying done.** Run the tests and typecheck (see below),
  look at the change in the browser with Playwright, and update
  `docs/STATUS.md` honestly: say what was seen, and what wasn't (nothing
  has run on a real iPhone from the sandbox). Report failures as failures.
- **The Windows launcher** `scripts/gymgo.ps1` must stay ASCII-only
  (`apps/web/src/launcher.test.ts` checks it).
- **Speak plainly to the owner.** They test on a Windows PC (browser, with
  Windows "Animation effects" off, so Reduce Motion is on) and an iPhone on
  iOS 18 in Expo Go.

## The code

pnpm monorepo, Node 22+. `pnpm install`, then per package:
`npx tsc --noEmit -p .` and `npx vitest run`. At last count: server 202,
mobile 254, domain 150 and web 39 tests, all passing.

- `apps/mobile`: the app (Expo SDK 57, React Native 0.86, expo-router,
  Reanimated 4). Screens in `src/app`, shared pieces in `src/components`,
  logic in `src/lib`.
  - `src/lib/api.ts` is the server client. In development the app reaches
    the server through the bundler at `/_gymgo`; `metro.config.js`
    forwards it to port 4000 (`src/lib/serverAddress.ts`).
  - `src/components/Glass.tsx`: every glass surface, the same opacity on
    every device.
  - `src/components/Skeleton.tsx`: skeleton loaders.
  - `src/components/GymScan.tsx`: the check-in scan.
  - `src/components/LegalText.tsx` and `src/app/legal/[doc].tsx`: the legal
    documents.
  - `src/lib/theme.ts`: palettes, accents and Pro "looks". Wrap styles in
    `themed(() => StyleSheet.create(...))` and never keep a colour in a
    module constant.
- `apps/server`: Node with `node:sqlite` and raw http routes in
  `src/app.ts`. `src/auth.ts` (scrypt, hashed tokens, reset links, rate
  limits), `src/billing.ts` (Stripe, test mode until keys are set),
  `src/legalPages.ts` (the public `/terms` pages and friends), `src/backup.ts`,
  `src/devAccount.ts` (the local Pro test account `dev@gymgo.test` /
  `GymGO-dev-pro-2026`, never on a hosted server).
- `packages/domain`: pure rules shared by the app and server (search,
  access, money, plans, collection). `legal.ts` holds the terms, privacy,
  refund and community texts.
- `deploy/`: Docker plus Caddy hosting (README → "Put GymGO online").
  Not deployed anywhere yet.
- `apps/web`: the older Next.js site; leave it alone unless asked.
- Logo: `apps/mobile/assets/brand/gymgo-logo.webp`, made into every icon
  by `apps/mobile/scripts/brand-mark.mjs`.

## Running it in the sandbox

- **Server:**
  `cd apps/server && GYMGO_DEV_PRO=on nohup node --no-warnings=ExperimentalWarning --import tsx src/main.ts &`
- **App:** `cd apps/mobile && CI=1 npx expo start --web --port 8081 --clear`.
  Metro has no file watcher here, so restart it with `--clear` after
  editing.
- **Process checks:** `pgrep -f "src/main.ts"` matches its own shell, so
  check with `curl localhost:4000/api/health` instead. Never
  `pkill -f <word>` with a word that's in your own command.
- **Browser checks:** Playwright Chromium is at `/opt/pw-browsers/chromium`.
  Map tiles (tiles.openfreemap.org) are blocked by the sandbox proxy, so
  the map draws blank; markers and the UI still work.
- **Docker:** start `dockerd &`, and pass `/root/.ccr/ca-bundle.crt` as the
  `extra_ca` build secret.

## Done recently (newest first)

- Batch A: open late / 24 hours filters, Find a machine, Trips.
- Glass equally opaque on every device (iOS 18 was see-through).
- Sign-in, the dev account included, works on every device that opens the
  app, Expo Go through `-Tunnel` included (the server goes through the
  bundler).
- Check-in scan with ripple and progress bar, with a Reduce Motion version.
- Launch work: Terms, Privacy, Refunds, Community Guidelines (app plus public
  pages, agreed at sign-up); security hardening and forgot password; free
  hosting kit (`deploy/`); skeleton loaders.
- New logo everywhere; collection synced to the account; card popup and
  animations.

## Next up: the owner asked for all 22 of these

Status is updated as each batch lands. Build them in order, one batch per
pushed commit or a few.

**Batch A: search**
- [x] Open late (after 10 pm) and 24-hour quick filters, from published
      hours (`packages/domain/src/hours.ts`, `hours` in the filters).
- [x] Machine search (`src/app/machines.tsx`, domain `machines.ts`,
      server `GET /api/equipment/reported`).
- [x] Travel mode (`src/app/trips/`, `src/lib/trips.ts`, domain
      `trips.ts`); a Home card for a trip under way or within a month.

**Batch B: collection and social**
- [x] City and suburb sets with badges and a reward card
      (`src/lib/sets.ts`, `src/components/SetCard.tsx`; on Collection and
      at check-in).
- [ ] Leaderboards (opt-in, display name only), per city and among friends.
- [ ] Friends: add by code, see each other's collections, invite to train.
- [ ] Share a collected card as an image (react-native-view-shot plus
      expo-sharing on phones; Web Share or download in a browser).

**Batch C: training**
- [ ] Workout templates (PPL, 5×5, beginner full-body) that start a workout.
- [ ] Personal-record celebration: confetti and a shareable card.
- [ ] Rest timer alert while the phone is locked (local notification via
      expo-notifications). Live Activities need a native build, so say so.
- [ ] Apple Health / Google Fit: need a native build with HealthKit
      entitlements, which can't run in Expo Go. Offer a CSV export of the
      log instead and explain.

**Batch D: trust**
- [ ] "Is it busy?" member reports, shown only with enough recent reports.
- [ ] Verified gym owners: claim, moderator approval, owner-updated hours
      and prices shown as from the gym.
- [ ] Faster moderation on the phone (approve or reject in one tap, a
      queue count on Profile).

**Batch E: money** (Stripe test mode; nothing live without the owner)
- [ ] Gift Pro: a one-off payment gives a code, which redeems a year of Pro.
- [ ] Duo Pro: share Pro with one more account.
- [ ] Partner day passes: discounted passes booked through Stripe with a
      fee. The mechanics only; real gym agreements are the owner's to make.
