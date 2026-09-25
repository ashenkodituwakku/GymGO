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
all tests: at last count domain 120, osm 25, demo 23, melbourne 11, au 11,
usa 11, web 39, mobile 78, server 103; all passing).

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

## What the owner asked for next

1. **Make the UI look better, with the Liquid Glass effect throughout.**
   Liquid Glass exists already (the glass tab-bar capsule, `Glass`
   surfaces; on iOS 26 it's the system material, and elsewhere a blur
   fallback). Take it further, tastefully: search bar, results sheet,
   filter chips, the "Search this area" pill, the status pill, map
   controls, the place card's header and action buttons, the Home cards.
   Keep text contrast at WCAG AA over any map, respect Reduce Transparency
   and Reduce Motion, and keep every control named for screen readers.
   Take screenshots before and after at phone (390×844) and desktop
   (1280×860) sizes, and judge them critically. Apple's Maps app on iOS 26
   is the reference.
2. **Expand to Europe with built-in gyms**, like the Australian and US
   city packs. Add a `packages/eu-data` (copy `packages/au-data`'s shape
   and generator) for major cities: London, Paris, Berlin, Madrid,
   Barcelona, Rome, Milan, Amsterdam, Dublin, Lisbon, Vienna, Munich,
   Stockholm, Copenhagen and Zurich, say. Read them from OpenStreetMap once,
   by script, with the same `packages/osm` rules, and credit them (ODbL) in
   `CREDITS.md`.
   - Widen `City.country` in `apps/mobile/src/lib/places.ts` beyond
     `'AU' | 'US'`.
   - Group Home's "Other cities" by region (Australia, USA, Europe); see
     `(['AU', 'US'] as const)` in `src/app/(tabs)/index.tsx`.
   - Seed the server (`GYM_RECORDS` in `apps/server/src/config.ts`), and
     keep an eye on bundle size.
   - Optionally, take visit prices in EUR, GBP and CHF: the A$1–500 range
     fits them, but not SEK, NOK, DKK, PLN, CZK or HUF. The
     `price_reports` table has `check (currency in ('AUD','USD'))`, so it
     needs a table-rebuild migration in `apps/server/src/db.ts`.
3. **Make dense cities work.** For central London's 504, try splitting the
   Overpass query (gyms and place names as separate requests), retrying the
   answering server once, or smaller tiles where a tile is dense. Test it
   with a stand-in Overpass in `apps/server/src/area.test.ts`.

One thing the owner turned down: clearing the search text when a gym opens
from the search box (the suggestion list otherwise stays over the card).
Don't redo that without asking.

For each step: implement, run `pnpm verify`, check it in the browser, update
`docs/STATUS.md` honestly (what was seen, what wasn't, e.g. never run on a
real iPhone), then commit and push. Report failures as failures.
