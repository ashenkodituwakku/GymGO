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
`npx tsc --noEmit -p .` and `npx vitest run`. At last count: server 216,
mobile 279, domain 163 and web 39 tests, all passing.

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

- Polish round 3 (6 Oct): forms. Sign in's "don't match" clears as you
  fix the email or password; on Account, Enter saves a name or a password,
  and a new password says how many characters it still needs; naming an
  interval timer has Cancel and a proper box, and deleting one takes two
  taps; a review can be cancelled ("Send review" / "Cancel"); the owner
  claim's contact hint fits, and only Australian gyms are asked for an ABN.
  Search: Explore now passes your country to its search box (it never had,
  so the box was read out as "Search a town, city or gym" to everyone and
  world cities weren't yours-first), place suggestions in Explore and
  Trips put your country's first (`suggestPlaces(..., home)`), and "Try a
  city or ZIP code" / "A city or neighborhood" for a US user. A scan of
  every screen found no unnamed controls and no button label that wraps.
- Polish round 2 (5–6 Oct): every page scrolls a box you're typing in clear
  of the iPhone keyboard (`PageScroll` now does it for all pages; only four
  did); trips are described by the date where they are (`todayThere` in
  `src/lib/trips.ts`: the list said "Tomorrow" while the trip's page said
  "Under way"), their first day reads "Today", and removing one takes a
  second tap; "1 gym near Melbourne CBD" in Find a machine, not "near
  melbourne cbd"; a friend code nobody has shows in red and clears as you
  type; the leaderboard's "You" is a label that a long name can't cut off;
  Friends and Leaderboard show "Can't reach GymGO" with Try again when the
  server is away, not "Sign in" to a signed-in person; My workouts has Try
  again; Profile's Offline gyms and Google content lines fit their two
  lines. A check for text cut short on every screen at 375 and 393 points
  finds only gym names on Home's cards and map street names. Mac trackpad
  haptics were looked at: a web page can't drive them (Safari only reports
  a force click), and the owner chose to leave it.
- Polish round (5 Oct): distances in your own country's units everywhere
  (`setReaderCountry` in `src/lib/places.ts`, set from your Country); the
  server keeps one copy when the same workout plan is saved twice; proper
  empty states for a card you don't have and for Moderation; Friends' empty
  line padded like its rows; a saved gym the server no longer has shows as
  "No longer listed" with Remove (it used to be invisible but still take a
  Free space; `gone` in `useGymData`), and a gone compare pick no longer
  counts towards Free's two (picking another opened the Pro screen); Saved's sign-in line is a link and
  says "your other devices", not "your PC". Seen in the browser at iPhone
  and iPhone SE sizes and at 1440 wide, light and dark, signed in and out,
  with Reduce Motion on.
- Batch E: gift Pro (a code for a year), Pro Duo (a partner by friend
  code), partner day passes (mechanics only; none listed). Stripe test mode
  only, against a pretend Stripe.
- Batch D: "is it busy?" from members there, verified gym owners (claim,
  admin check, moderated updates shown as from the gym), a Moderation screen.
- Batch C: workout templates, record celebration and card, rest alert when
  locked, CSV as a real file with the Health explanation.
- Batch B: collection sets (another session), friends, invites to train,
  leaderboards, share cards as pictures. Card rarity now lives in the
  domain package (`cards.ts`) so the server can show friends' cards.
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

**Two sessions are working through this list at once.** Before starting
an item, `git fetch` and read this list on `origin/claude/friendly-johnson-9rzxrj`;
skip anything ticked or marked claimed, and mark what you take as claimed
(push that first) so the other session doesn't build it too.

- All five batches are done (B's sets by the other session, the rest by
  gymgo-82). Nothing is claimed now.

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
- [x] Leaderboards (opt-in, display name only), per city and among friends
      (`src/app/leaderboard.tsx`; server `src/social.ts`).
- [x] Friends: add by code, see each other's collections, invite to train
      (`src/app/friends/`; server `src/social.ts`, domain `social.ts`).
- [x] Share a collected card as an image (`src/lib/shareImage.ts`,
      `src/app/card/[id].tsx`, Share card in the new-card pop-up).

**Batch C: training**
- [x] Workout templates (`src/lib/templates.ts`, `src/app/templates.tsx`).
- [x] Personal-record celebration (`src/components/Celebrate.tsx`,
      `src/lib/records.ts`; in the workout summary).
- [x] Rest timer alert while the phone is locked (`src/lib/restAlert.ts`).
      Live Activities still need a native build.
- [x] Apple Health / Google Fit: explained on Progress beside the CSV
      export, which now shares a real file on phones.

**Batch D: trust**
- [x] "Is it busy?" member reports (`src/components/MemberBusy.tsx`, domain
      `busy.ts`, server busy routes).
- [x] Verified gym owners (`src/components/GymOwner.tsx`, server
      `owners.ts`, domain `owner.ts`; `make-admin` to decide claims).
- [x] Faster moderation on the phone (`src/app/moderation.tsx`,
      `src/components/Moderation.tsx`; count on Profile).

**Batch E: money** (Stripe test mode; nothing live without the owner)
- [x] Gift Pro (server `perks.ts`, domain `perks.ts`, app `ProExtras.tsx`).
- [x] Duo Pro (same files; a Duo price in Stripe, a partner by friend code).
- [x] Partner day passes, mechanics only (`DayPass.tsx`; admins add passes).
      No gym has one: agreements are the owner's to make.
