# Progress and handoff

Written so someone picking this up cold knows what happened, what to trust, and
where the traps are.

## What was built

An iOS and Android app (`apps/mobile`, Expo), map-first in the manner of Apple
Maps, running the shared search rules on the device against the demo dataset.
Before that, a complete web vertical slice of the pilot, plus the operational
screens that keep its data honest. The website is kept, but new work goes into
the app. See `README.md` for how to run
it and `docs/STATUS.md` for what is and is not finished.

## Decisions made without asking

These were judgement calls. Each is reversible, and each is written down here
because "the code does X" is not the same as "someone decided X".

| Decision | Reasoning |
|---|---|
| pnpm workspace, `packages/domain` + `apps/web` | The rules have to be shared with future Expo clients without a second implementation. Extracting them later is harder than starting that way. |
| Domain ships TS source, not a build | One compile step, no stale published artefact between the rules and the app. |
| Plain CSS with custom properties, no Tailwind | One stylesheet, tokens mirrored from `packages/domain/src/tokens.ts` so native can use the same scale. Avoids a large dependency for a pilot. |
| JSON file store for local, Postgres documented | The product had to run with no external services. The repository functions are the seam. |
| No images anywhere | No authorised image tool was available, and inventing a photograph of a gym would be a fabrication about a place someone is deciding whether to visit. Empty slots say "No photo supplied". |
| Map ships unconfigured | A basemap licence suitable for a directory is a decision, not a default. The code is written; it has never run. |
| Full dynamic rendering for session pages | Correctness over prerendering. See the trap below. |
| Equipment SEO pages limited to four anchor suburbs | Inner-city suburbs overlap at 1.5 km, so one page per pair would be near-duplicates — the thin-generated-page problem in disguise. |

### Phone app decisions

| Decision | Reasoning |
|---|---|
| Expo, runnable in Expo Go | The owner is on Windows with no Mac. Expo Go runs the app on a real iPhone from a Windows PC, with no Xcode, developer account or build step. Every library was chosen to work inside Expo Go. |
| react-native-maps, not a custom map | MapKit on iPhone needs no key and is what Maps users expect. A standalone Android build will need a Google Maps key; that is a decision with a billing account attached, so it was left for the owner. |
| @gorhom/bottom-sheet for the sheets | MIT, works in Expo Go, and is the standard for Maps-style sheets. A native-sheet alternative that looked closer to Apple Maps needs a development build and had no clear licence. |
| Light mode only, system indigo brand | Asked for light by default. Indigo is distinct from the map's blues and greens, and from the three tier colours, so "tap here" is never confused with "good to go". |
| Search runs on the device | No server, no account, nothing to deploy for the pilot; the same `search()` the website runs. |
| Liquid Glass on small controls, thick material on sheets | A list over a busy street map has to stay readable. Liquid Glass at sheet size is too see-through for body text. |
| Helvetica throughout | Asked for. iPhone uses the built-in Helvetica Neue (Regular, Medium, Bold). Android has no Helvetica and a licence costs money, so it bundles TeX Gyre Heros, a free clone. That clone has no Medium cut, so medium weights render Regular on Android. All weights go through `face()` in `theme.ts`, because Android picks custom fonts by name and a bare `fontWeight` would give a faux bold. |
| Local server on Node's built-in SQLite | "Free servers and databases" without signing anyone up for anything: it runs on the owner's PC, costs nothing, and needs no keys. A hosted free tier is a later choice for the owner, because it means an account with a provider. |
| Real gyms from OpenStreetMap + the gyms' own sites | OSM is openly licensed (ODbL, attribution shown). Operator websites are the only place a price or hours can be read without contacting anyone. Nothing was inferred: staffed hours are never treated as guest hours unless the gym says so. |
| One command runs server + app | `scripts/dev.mjs` spawns both through the same Node, so it doesn't depend on a shell or on how pnpm is installed. It works the same from the launcher, `pnpm app` or plain `node`. |
| Weekly hours start on Monday | Australian timetables do. Changed in the shared domain, so the website follows. |
| Gym photos come only from members | Asked for gym images. Photos on gym websites are copyrighted, and a picture of a different gym would be a lie about the place. So members share their own, confirm they took them, have location data stripped, and wait for a moderator. Until someone does, the card says "No photo supplied yet" and the list shows a plain 🏋️ tile, which is clearly a symbol and not a photo. |
| Google's info on its own page, live, behind the owner's key | Asked to "import data from Google". Google's terms forbid copying or storing Places content, forbid showing it with a non-Google map, and need a billing account. So nothing is imported: a separate full-screen page asks Google fresh each time, stores only the place ID, and credits everyone. Without a key it just opens Google Maps, which is free. |
| Simpler card: one answer, three facts, folded detail | Asked for simpler and more playful. The verdict is one emoji and a word, and the detail folds under one-line summaries, so nothing honest was removed, only tucked away. "Worth a call" became "Call first", which says what to do. |

## Traps

**Don't "import" Google data into the gym records.** It would be the obvious
way to fill the unknowns, and Google's terms forbid it (no copying, no
caching beyond the place ID). It would also blur what GymGO checked with
what Google says. The Google page is deliberately separate, and its hours are
labelled as opening hours, not guest hours.

**Don't show the Google page beside the map.** It is a full-screen modal for
that reason. A side panel on the PC would break Google's rules.

**The app has not been seen on a phone.** Everything visual was checked in the
react-native-web preview. The first Expo Go run is the real test.

**MapLibre's stylesheet makes its container `position: relative`.** On the web
preview that silently cancelled `StyleSheet.absoluteFill` and gave the map zero
height. The map now sits inside an absolutely-filled wrapper.

**react-native-maps spells it `showsPointsOfInterests`** (with the extra *s*) and
ignores it on Android, where hiding business labels takes a `customMapStyle`
rule instead.

**`CI=1 expo start` does not watch files.** Metro prints "reloads are disabled"
and keeps serving the old bundle. Start it without `CI` when iterating.

**`pnpm test:e2e` used to test whatever was in `.next-e2e`.** `pnpm build`
writes to `.next`, so the suite could pass or fail against an old build, and
its store was never reset, so a second run met the first run's approved
corrections. The Playwright web server now deletes `.data-e2e` and builds fresh
before serving. Slower, and correct.

**No real gym is "Good to go", and that is correct.** The best-documented,
Doherty's City, publishes its price, guest hours and walk-in policy, but not
whether a first visit needs an induction. An unconfirmed requirement is never
treated as met. Don't "fix" this by defaulting induction to no.

**`pgrep -f` / `pkill -f` will match your own shell.** Any pattern you pass
appears in your own command line. Use a bracket trick (`[e]xpo start`) or
look processes up in `/proc`.

**Screenshots from a sandbox may lose map tiles.** A proxy that drops some tile
requests leaves a blank map. The harness used for the app screenshots fetched
tiles through curl with retries and a cache; the app itself needs nothing.

**Session pages must not be statically prerendered.** `getCurrentUser()` reads
cookies unconditionally, *before* checking whether the auth adapter is enabled.
That looks redundant and is not: reading cookies is what marks a page
per-request. An earlier version read them conditionally, and because the build
ran without `GYMGO_AUTH_ADAPTER` set, Next prerendered `/admin`, `/owner` and
`/account` at build time and served everyone the empty state. The e2e suite
caught it. `dynamic = 'force-dynamic'` on those pages is the belt to that
braces.

**Builds and dev servers share `.next`.** Running `pnpm build` while a dev
server is running breaks the dev server. `NEXT_DIST_DIR` exists for this; the
Playwright config sets it to `.next-e2e`.

**The e2e contribution suite shares one store.** It runs on `desktop-1440`
only, and its tests are order-dependent by design (submit, then moderate, then
observe). Tests that assert on result counts must read the count rather than
hard-code it, because the contribution suite adds data before the search suite
runs.

**Fixture check dates are offsets from a fixed epoch** (`DEMO_EPOCH`,
2026-09-22), so freshness labels stay meaningful whenever the demo is run. Real
records carry absolute dates. If the wall clock drifts far from that epoch the
demo data will read as increasingly stale — which is honest, but worth knowing.

## Two bugs found by testing, and what they teach

1. **A gym ruled out on budget quoted the wrong price.** The card read "the
   cheapest single visit we have confirmed is A$18, above your budget" — where
   A$18 was an *expired* winter rate, and A$18 is not above A$30. Two errors in
   one sentence. The fix separates `overBudget` (offers whose *only* blocker is
   the budget) from everything else, so "above your budget" is only ever said
   about an offer that was otherwise usable. Regression tests in
   `offers.test.ts` and `search.test.ts`.

2. **Back navigation restored results but not the controls.** The filter inputs
   are uncontrolled, so React did not update their DOM values when the URL
   changed underneath them. Keying each input to its value from the URL remounts
   it. Caught by the e2e test for the back-navigation acceptance criterion —
   which had to test the *control*, not just the results, to find it.

Both were cases where the rule was right and the presentation lied about it.
That is the failure mode worth watching for in this product specifically.

## Where to go next

In rough order of what unblocks the most:

1. **Customer discovery** (`docs/LAUNCH-CHECKLIST.md` §1). Everything below is
   premature if the three questions this answers were not the blockers.
2. **A real basemap**, and actually running `MapCanvas`.
3. **A real identity provider**, replacing `local-dev`.
4. **Postgres/PostGIS**, replacing the file store.
5. **The concierge dataset** — 30–50 genuinely checked listings, which is also
   the only way to find out whether the recheck targets are affordable.
6. **Expo clients**, once the above holds up. The domain package is ready to be
   shared; nothing has been scaffolded.

## What this build does not establish

That anyone wants this. No interviews, no operator conversations, no task
testing, no real listings, no outreach. The competitor set is real and the
feature bundle is not novel — the bet is on data quality, and data quality is
exactly the thing a demo dataset cannot demonstrate.
