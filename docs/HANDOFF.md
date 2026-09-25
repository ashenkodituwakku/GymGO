# Handoff prompt

Paste everything below the line into a new Claude Code session that has
access to `ashenkodituwakku/GymGO`.

---

You're continuing work on **GymGO**, a truthful gym finder, in the GitHub
repo `ashenkodituwakku/GymGO`. Work on the branch
`claude/friendly-johnson-9rzxrj` and push there (`git push -u origin
claude/friendly-johnson-9rzxrj`). The owner's PR #1 already tracks that
branch: don't open another PR unless asked. Before changing anything, read
`README.md`, `docs/STATUS.md` (what's verified, and how) and
`docs/PROGRESS.md` (decisions and "Traps"), and skim `CREDITS.md`.

## The product rules (binding, from the owner's brief)

- Truth first. Unknown ≠ no. A missing fee ≠ $0. Member, staffed and
  visitor hours are separate. Every fact carries its source and date.
- Never invent prices, reviews, stock, partnerships, busyness or photos for
  real venues. A missing image says "No photo supplied". Never substitute
  CSS/SVG/canvas shapes for photographs. The map must be a real map.
- Never read, use or expose API keys unless the owner explicitly asks. Don't
  scan credential locations.
- Don't spend money, provision services, deploy publicly, contact gyms,
  publish content, submit store apps or start payments without the owner's
  specific go-ahead. No fake auth bypass in production.
- Commit in small, verified steps with clear messages; no model names in
  commits or code.

## The code

pnpm monorepo, Node 22. `pnpm install`, then `pnpm verify` (typecheck, lint,
all tests: at last count domain 121, osm 25, demo 23, melbourne 11, au 11,
usa 12, eu 10, web 39, mobile 113, server 130; all passing).

- `apps/mobile`: the app (Expo SDK 57, React Native, expo-router,
  Reanimated). Runs on iOS, Android and in a browser (`npx expo start
  --web`). Screens are in `src/app`, shared pieces in `src/components`
  (`ui.tsx`, `ios.tsx`, `motion.tsx`, `Glass.tsx`, `liquidGlass.ts` and its `.web.ts`), logic in `src/lib`
  (`query.ts` filters, `places.ts` cities/units/money, `app-state.tsx`,
  `useGymData.ts`, `api.ts`, `copy.ts`). Type: SF Pro, with Inter bundled
  only where SF Pro can't draw (`src/lib/theme.ts`).
- `apps/server`: Node + `node:sqlite`, raw http (`src/app.ts` routes).
  `src/area.ts` is "Search this area" (Overpass, 0.1° tiles cached a month,
  one read at a time, daily cap, failover across three public servers with
  the last good one first). `src/places.ts` finds towns by name (Photon).
  `src/siteicons.ts` fetches gyms' own website icons (SSRF-guarded).
- `packages/osm`: the one copy of the rules for what counts as a gym, and
  the map-only record builder. `packages/au-data`, `packages/usa-data`: the
  bundled map-only cities, made by `scripts/generate.ts` from OpenStreetMap.
  `packages/melbourne-data`: 23 gyms researched fact by fact.
- `apps/web`: an older Next.js site; leave it unless asked.
- Training: `src/lib/training.ts` (records, targets, plates, streak; pure
  and tested), `src/lib/activeSession.ts` (the workout in progress, kept
  on the device), `src/lib/useTraining.ts` (the log), screens `train.tsx`,
  `plates.tsx`, `progress/`. Server: `/api/training` in `app.ts`.
- Theme: `src/lib/theme.ts` has light and dark palettes and five accents
  (Indigo free, the rest Pro); `color` changes in place, and every style
  sheet is wrapped in `themed(() => StyleSheet.create(...))` so it's remade
  after a switch. Never read a colour into a module-level constant; wrap it
  in `themed()` too. `app/_layout.tsx` redraws the screens under a
  crossfade and restores the navigation state. `src/lib/themePrefs.ts`
  keeps the choice. A unit test checks AA contrast for every palette.
- Sign in with Google/Apple: `apps/server/src/identity.ts` (token checks),
  routes in `app.ts`; app side `src/components/SocialSignIn.tsx`,
  `src/app/sign-in.tsx`, `src/app/account.tsx`. Off until the owner sets
  client ids (README → Sign in with Google and Apple).
- On a Mac: `scripts/gymgo-mac.sh --xcode` (wraps `scripts/dev.mjs --xcode`
  and `scripts/xcode.mjs`) generates `apps/mobile/ios` with `expo prebuild`
  and opens Xcode. Never yet run on a real Mac: expect the first real build
  to surface something, and fix it from what the owner reports.

Running it in this sandbox: start the server with `NODE_USE_ENV_PROXY=1`
(so its fetches use the proxy) and `EXPO_PUBLIC_API_URL=http://localhost:4000`
for the app. From the sandbox, only the `maps.mail.ru` Overpass mirror
answers (overpass-api.de resets, kumi times out). In Playwright, route
`https://tiles.openfreemap.org/**` through `curl` with retries and a disk
cache, because the proxy drops some tile requests; Chromium is at
`/opt/pw-browsers/chromium`. On the web build, Reanimated spring entrances
break layout, so use timed ones there (see "Traps"). Stop background dev
servers when you're done with them.

## Where things stand

The map now searches the whole world. Each found gym gets its country from
country-coder, its time zone from tz-lookup and its street line in its
country's order. The app carries the searched country in its filters, so
distances are in miles only in the US and UK. Budgets and members'
visit-price reports stay A$/US$ only, and the app says so elsewhere. This
was verified live on Kyoto (68 gyms) and Kreuzberg (68 gyms, in km). Central
London (Shoreditch) failed: the one reachable Overpass mirror gave up with a
504.

## What the owner asked for next, and how far it got

1. **Make the UI look better, with the Liquid Glass effect throughout.**
   Liquid Glass exists (the glass tab-bar capsule, `Glass` surfaces; on iOS
   26 it's the system material, and elsewhere a blur fallback). Done so
   far:
   - every floating glass control in the browser bends the map at its
     edges like the tab bar (`refractionFor` in `liquidGlass.web.ts`);
   - Home, Saved and Profile get a compact title on frosted glass when
     scrolled (`TabScreen` in `ios.tsx`);
   - the map's credit no longer hides behind the sheet (`creditInset`);
   - Home's carousels keep to the page column on wide screens.
   Still open: the results sheet, filter chips and Home cards could go
   further. Keep text contrast at WCAG AA over any map, respect Reduce
   Transparency and Reduce Motion, and keep every control named. Take
   screenshots before and after at phone (390×844) and desktop (1280×860)
   sizes, and judge them critically. Apple's Maps app on iOS 26 is the
   reference.
2. **Europe: done.** `packages/eu-data` has 600 gyms in 15 cities
   (London, Paris, Berlin, Madrid, Barcelona, Rome, Milan, Amsterdam,
   Dublin, Lisbon, Vienna, Munich, Stockholm, Copenhagen, Zurich), rebuilt
   by `scripts/fetch.py` (bounding-box queries through the mail.ru mirror)
   then `scripts/generate.ts`. Still open: logos for Europe's chains
   (`apps/mobile/scripts/brand-logos.mjs` already reads eu-data; run it and
   check each licence). Visit prices now work in €, £ and CHF as well as A$
   and US$ (`reportCurrency` in `packages/domain/src/money.ts`; the
   database migrates itself); kronor, zloty and the like would each need
   their own sanity range.
3. **Your country is free, the rest of the world is Pro: done.** The owner
   asked for this. The first launch asks "Where do you train?"
   (`src/app/country.tsx`, 198 countries from `src/lib/countries.ts`, made
   by `scripts/countries.mjs` from country-coder and Wikidata), and Profile
   → Country changes it. `src/lib/country.ts` decides who may search where;
   outside your country without Pro, Explore and Home show "Gyms in France
   are part of GymGO Pro" instead of pins and a list. The server refuses a
   live area search abroad for a non-Pro caller (`home` parameter, 403
   `pro_required`). Pro can't actually be bought until the owner connects
   Stripe (README → GymGO Pro), so until then nobody can search abroad.
4. **Dense cities live: working.** A busy Overpass server (429 or 504)
   gets one more try before the next is asked, and the one that answered
   last is asked first. Hackney (22 gyms) and Camden (13) came back live. If
   a denser area still times out, split the query (gyms and place names as
   separate requests) or use smaller tiles there, tested with a stand-in
   Overpass in `apps/server/src/area.test.ts`.

5. **USA focus: done.** 40 US cities (1,055 gyms), US first everywhere,
   search asks for "a city, ZIP code or gym", pounds and miles, US$ on the
   Pro screen, street addresses on gym pages.
6. **Run it from Xcode on a Mac: ready, untested on a Mac** (see above).
7. **Features for training, and more Pro: done.** Logging with a rest
   timer, plates, records and Progress (free); charts and next-session
   targets (Pro). Ideas not yet built: a weekly goal, supersets, notes per
   set, and exporting the log as CSV.

8. **Dark mode and Pro themes, Google and Apple sign-in, a better login
   and settings area, smoother animation: done** (see above). The Mac
   launcher was reported not working; it was rebuilt to start from any
   state and to keep itself updated, but it still hasn't run on a real Mac:
   ask the owner for `gymgo-mac.sh --doctor` output if it fails again.

One thing the owner turned down: clearing the search text when a gym opens
from the search box (the suggestion list otherwise stays over the card).
Don't redo that without asking.

For each step: implement, run `pnpm verify`, check it in the browser, update
`docs/STATUS.md` honestly (what was seen, what wasn't, e.g. never run on a
real iPhone), then commit and push. Report failures as failures.
