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
| SF Pro, set to Apple's specs | Asked for SF Pro, "formatted correctly". iPhone uses the system font, which is SF Pro: iOS picks the Text or Display cut by size and applies SF's tracking itself, so no letter-spacing is set there (adding it would double it). The type scale is Apple's iOS text styles (Large Title 34/41 bold, Title 1 28/34, Title 2 22/28, Headline 17/22 semibold, Body 17/22, Subhead 15/20, Footnote 13/18, Caption 12/16), and small emphasis is semibold, as in Apple's apps, with bold kept for titles. SF Pro's licence covers only Apple platforms, so Android and non-Apple browsers get Inter, the nearest free face, with its designer's size-based tracking; browsers list SF Pro first, so Macs and PCs that have it use it. The web page turns off faux bold, so every weight is a real cut. Replaces the earlier Helvetica choice below. |
| Helvetica throughout (replaced by SF Pro) | Asked for. iPhone uses the built-in Helvetica Neue (Regular, Medium, Bold). Android has no Helvetica and a licence costs money, so it bundles TeX Gyre Heros, a free clone. That clone has no Medium cut, so medium weights render Regular on Android. All weights go through `face()` in `theme.ts`, because Android picks custom fonts by name and a bare `fontWeight` would give a faux bold. |
| Local server on Node's built-in SQLite | "Free servers and databases" without signing anyone up for anything: it runs on the owner's PC, costs nothing, and needs no keys. A hosted free tier is a later choice for the owner, because it means an account with a provider. |
| Real gyms from OpenStreetMap + the gyms' own sites | OSM is openly licensed (ODbL, attribution shown). Operator websites are the only place a price or hours can be read without contacting anyone. Nothing was inferred: staffed hours are never treated as guest hours unless the gym says so. |
| One command runs server + app | `scripts/dev.mjs` spawns both through the same Node, so it doesn't depend on a shell or on how pnpm is installed. It works the same from the launcher, `pnpm app` or plain `node`. |
| Weekly hours start on Monday | Australian timetables do. Changed in the shared domain, so the website follows. |
| Four tabs, with the system's tab bar on phones | Asked for a home page and a more iOS feel. Native tabs give Apple's own (Liquid Glass) tab bar on iPhone and Material's on Android, rather than an imitation. The browser has no native bar, so it gets GymGO's floating glass one, bottom centre when narrow and top right when wide. |
| Shared app state (`lib/app-state.tsx`) | Four tabs need the same search, gyms, account, recents and compare list. Tabs ask Explore to do things (open a gym, focus search, locate) through a counted request, so the same request twice still works. |
| Home picks only set the search | "Early start", "Under A$25" and the rest just change the filters and open Explore, so every answer still comes from the same rules as the map. Nothing on Home is a separate ranking. |
| A gym page as well as the map card | Lists (Home, Saved, Compare) push a proper page with back-swipe, as iOS apps do. The map keeps its sheet card. Both render the same `PlaceCard`. |
| Gym photos come only from members | Asked for gym images. Photos on gym websites are copyrighted, and a picture of a different gym would be a lie about the place. So members share their own, confirm they took them, have location data stripped, and wait for a moderator. Until someone does, the card says "No photo supplied yet" and the list shows a plain 🏋️ tile, which is clearly a symbol and not a photo. |
| Google's info through Google's own free embed | Asked to "import data from Google", then for a completely free way. Google's terms forbid copying or storing Places content, and its API needs a billing account. Google's public "Embed a map" is free, keyless and unlimited, and shows Google's card (stars, review count, address) with a link to every photo and review. So each gym's Google page is that embed, full screen. The paid Places API extras stay optional behind the owner's key. |
| Machines come from members, not Google | Asked for "the machines they have" from Google. Google has no equipment data, only photos, which can't be copied, and gyms' sites rarely list machines. So members tick what they saw, one report each per gym, shown as tallies next to (never merged into) what the gym publishes. Keeping them out of the search means one wrong report can't make a gym "Good to go". |
| Precise location, asked once, never stored | Asked to "use your precise location". The app asks for full GPS accuracy (not rounded any more) the first time it opens, then only uses it if allowed. The fix stays in memory on the device and never reaches the server. If the phone only shares an approximate position, the app says so instead of pretending distances are exact. |
| US cities are map-only, from OpenStreetMap | Asked for lots of gyms in popular US cities. The only free, openly licensed source is OpenStreetMap, which has names, positions and sometimes hours, but no prices or guest rules. So all 477 are community-reported, never "open for business" on the map's word, with no invented prices, and every one says "Call first". Mapped opening hours count as member hours, never guest hours. |
| Members say a gym has closed | The map-only gyms were never checked as trading, and the map lags reality. Members can say "closed" or "still open"; the warning shows only when closed outnumbers open in the last six months, so one mistaken report is answered by the next visitor. It sits above the verdict, in the card's grey "not a fit" colours, and never changes the verdict itself. |
| Members say how getting in went | The same pattern as prices, for the question that matters most: could a visitor get in? Three outcomes a member actually experiences (walked in, had to book, turned away) rather than a rule they'd have to guess at, counted over the last year only. Shown as members' visits, never as the gym's policy and never feeding the verdict, because one friendly receptionist isn't a guest policy. |
| Members say what a visit cost | Map-only gyms have no price, and "price unknown" on 900 gyms isn't much help. Members who paid can say so, once per gym. Shown as the median and range, never as the gym's price, never feeding the verdict, and without names. Amounts are held to $1–$500 and to the last two years, which with the median keeps a single bad report from misleading anyone. Unmoderated, like equipment reports, so it's rate-limited per member per day. |
| "Best match" means fewest open questions | It used to sort exactly like "Closest". With map-only gyms around every researched one, the nearest was usually a gym that publishes nothing. Now, within the same answer (good to go / call first / not a fit), the gym with fewer things to call about comes first, then the nearer. It never moves a gym across answers, and "Closest" still sorts by distance alone. |
| Melbourne's other mapped gyms | Melbourne had 23 researched gyms and nothing else, fewer than any map-only city. The other 40 mapped gyms near the CBD are added map-only, and the map's copies of the researched ones are dropped by their map element (every researched gym records it), with a same-name-within-100-m check as a backstop. |
| Real Sydney, with the demo behind a switch | The demo gyms are invented but sit on real inner-Sydney streets, so real Sydney waited until the two could never meet. The phone app now has a Demo mode switch in Profile, off to start: off shows only real gyms (Sydney included), on shows only invented ones, and place search follows the same rule. Moving the demo to made-up streets was the other option; it would have broken the older website and every test built on the demo's suburbs, for no gain in honesty. |
| Six more Australian cities, but not Sydney yet | "Australia first", but only Melbourne was real. Brisbane, Perth, Adelaide, Canberra, the Gold Coast and Hobart come from OpenStreetMap exactly as the US cities do (map-only, every one "Call first"), with one set of rules for what counts as a gym, shared in `scripts/osm_gyms.py`; moving the US rules there regenerated the US data byte for byte. Sydney is left out because the invented demo gyms are on inner-Sydney streets, and a real gym next to an invented one is how a demo gets mistaken for fact. Australian suburbs are official names, so every mapped suburb is searchable, not only ones with a Wikidata entry. |
| What counts as a gym in the US data | The map mixes gyms with yoga, pilates, cycling and climbing studios, and with private gyms in hotels, apartment blocks, offices and campuses. Those are filtered out by rules in `packages/usa-data/scripts/generate.py`, plus a short named list read by hand. Fitness studios (Orangetheory, F45, Barry's, boxing) stay, labelled as studios. 40 nearest the centre per city keeps the map readable. |
| Visit times follow the searched city's clock | A "6 pm" visit in New York means 6 pm New York time wherever the phone is. Moving to another time zone keeps the time of day and picks its next occurrence there. |
| Workout plans use only confirmed machines | Asked for a workout generator "for the machines each gym has". Most gyms publish none, so the plan uses the gym's published kit plus members' majority reports, and marks each exercise ✓. With under three confirmed machines it starts on a "typical gym" plan and marks anything unconfirmed "?". It never says a gym has a machine it hasn't been told about. |
| GymGO draws the body itself | react-native-body-highlighter's drawings are good (MIT), but its component bakes a dark colour into every muscle and prints warnings in the browser. GymGO uses its shapes with its own small renderer: native SVG on phones, plain keyboard-reachable SVG in the browser. |
| Tab bar like Instagram's on iOS 26 | Asked for it, then told the first version wasn't right. The system tab bar only looks like iOS 26 on iOS 26, and not like Instagram's even there, so GymGO draws one bar everywhere: a floating capsule, icons only (Phosphor, outline and filled), a lens that springs between tabs and can be dragged, swelling under a finger. The material is Apple's Liquid Glass on iOS 26 (expo-glass-effect), the system blur on older iPhones, and on the web a CSS glass with SVG refraction where Chrome supports it. Labels are hidden but read out by VoiceOver and TalkBack. |
| What's Free and what's Pro | Asked to decide. The rule: nothing that tells you the truth about a gym is ever paid for. Every gym, verdict, source, published price and hour, review, photo, machine report and the workout builder stay free. Pro is about keeping more: unlimited saved gyms (Free: 10), comparing 4 gyms (Free: 2), and a workout library in your account. Defined once in `packages/domain/src/plans.ts`. |
| Pro's price | A$3.99 a month or A$29.99 a year (save 37%); US$2.99 or US$19.99 (save 44%). Priced below workout apps like Strong or Hevy Pro, because Pro here is about convenience, not the core product. Tax-inclusive, so the shown price is the paid price. Prices are Stripe prices found by lookup key, so the server never holds price ids and a price change needs no code change. |
| Stripe's hosted pages, not a card form | Checkout and the customer portal are Stripe's own pages, so GymGO never touches card details, Apple Pay and Google Pay come for free where enabled, and cancelling is one tap on a page GymGO doesn't control. |
| Three ways Pro status arrives | Webhooks can't reach a server on someone's laptop. So the return page asks Stripe about the checkout straight away, the app asks for a re-sync after checkout and the portal, and without a webhook secret the server re-syncs at most every 10 minutes. With webhooks, events are re-read from Stripe (never trusted as sent) and de-duplicated. |
| `past_due` stays Pro | While Stripe retries a card, the subscriber keeps Pro. Stripe ends the subscription if payment never succeeds, and then it's Free. |
| Deleting an account cancels its subscription | Otherwise someone could keep paying for an account that no longer exists. If it can't be cancelled (payments not connected), nothing is deleted and they're told why. |
| Ending Pro deletes nothing | Saved gyms over 10 and saved workouts stay, readable and deletable. Only adding more stops. |
| A switch for selling inside phone apps | App-store payment rules vary by country, so store builds hide the buy button unless `EXPO_PUBLIC_NATIVE_CHECKOUT=on`. Expo Go and the browser always show it. |
| Simpler card: one answer, three facts, folded detail | Asked for simpler and more playful. The verdict is one symbol and a word, and the detail folds under one-line summaries, so nothing honest was removed, only tucked away. "Worth a call" became "Call first", which says what to do. |
| Symbols, not emoji, on buttons | Asked for "proper fitting symbols rather than emojis" after an earlier round added emoji everywhere. Buttons, rows, chips, section headings and empty states now use the platform's own symbols (SF Symbols on iPhone, Material Symbols elsewhere) or Phosphor's; emoji are gone from the interface. Stars, ticks and crosses stay as plain text marks. Home was cut down at the same time: four picks instead of six, no stats block, no explainer, cities as chips. |
| Logos only from Wikimedia Commons | Asked to find gym logos. Logos on gyms' own sites are copyrighted, so GymGO uses only files on Commons (reached through each brand's Wikidata "logo image") whose page gives a public-domain or CC licence: 8 chains. They're bundled, credited on the page, and carry a "not connected or endorsed" line, since a free licence doesn't cancel a trademark. Other chains get a plain symbol, not a copied logo. |
| Search this area reads OpenStreetMap live | Asked for a button that scans the area on screen for gyms. The server, not the app, asks the Overpass API, so the rules for what counts as a gym are the bundled cities' own (one TypeScript copy in `packages/osm`, proven identical to the Python it replaced on all 2,039 fetched elements). The world is cut into fixed 11 km tiles, each read at most once a month and shared by everyone, with a daily cap, one request at a time, and a per-address limit, so a free volunteer service is never hammered. Found gyms are kept in their own table, so they can be saved, reviewed and reported on, and a link to one still works tomorrow. Only Australia and the US, found from an offline time-zone table (CC0), since those are the countries GymGO has prices, addresses and clocks for. |
| Towns by name through Photon, on Enter only | Typing a town GymGO doesn't carry used to say "we don't cover that". Now the server looks it up. OpenStreetMap's own Nominatim forbids search-as-you-type and refused this sandbox's network outright, so it's Photon (komoot's free OpenStreetMap geocoder), asked only when someone presses Enter, at most once a second, answers kept a month, towns and suburbs in AU and the US only. The map flies there and searches once it has arrived, so the list is exactly what's on screen. |
| Your country is free; the rest of the world is Pro | Asked to make the app global, ask for the user's country, and make global a premium feature. The first launch asks "Where do you train?" (suggesting the device's region); Free covers that country and Pro every country, so the earlier rule "every gym, every city is free" now reads "every gym in your country". Gym pages opened from a link or Saved always open, since those are about one gym, not finding gyms abroad. The server refuses a live area search outside your country for a non-Pro caller before reading the map (403 `pro_required`), so the rule costs no map reads; the country list is generated from country-coder and Wikidata rather than typed by hand. |
| Built-in European cities | Asked to expand to Europe. `packages/eu-data` is built like the Australian pack: 15 cities, the 40 gyms nearest each centre under the same rules, fetched once by bounding box (the circle query timed out for London). Names stay local (what's on the door and the street signs), and place search now ignores accents. |
| The map searches the whole world | Asked to expand the maps globally. The Australia-and-US gate is gone: each found gym's country comes from country-coder (the iD editor's offline borders, ISC), its clock from tz-lookup, and its street line is written the way its country writes it. The app now carries the searched country in its filters, so distances are in miles only in the US and UK (and the islands that follow them) and a budget is dropped on crossing a border (A$30 isn't ¥30). Prices stay A$ and US$ only: members' reports and budgets are off elsewhere, and the app says so, rather than file a price in the wrong money. |
| Search around you before the nearest city | Outside the carried cities, finding you jumped to the nearest one, sometimes hundreds of kilometres off. With the area search in place, the honest answer is the gyms around you, from the map; the nearest city is now only the fallback (outside AU and the US, or map servers down). The first version sent a box centred on your exact position, which broke the promise that your location never leaves the device; it now asks for the 3 × 3 block of whole map tiles around you (the same request for anyone in the tile), and the privacy text says so. |
| Gyms' own website icons, after all | Asked again, this time to "find the logos of every gym". Commons has free logos for only ten chains, and the big ones (Planet Fitness, Orangetheory, F45, Anytime) have none. So the stance above is widened, not dropped: Commons logos still come first and are bundled; every other gym with a website gets the icon its own site publishes, fetched live by the server (never copied into the repo), shown as a browser shows a site's icon beside its link, credited to the site with the same "not connected or endorsed" line, and never altered. Website addresses come from OpenStreetMap, which anyone can edit, so the fetcher only reaches public addresses (checked at connection time, through redirects too), only takes real images of at least 64 px, and can be switched off with `GYMGO_SITE_ICONS=off`. |
| Photos at the top of a gym's page | Asked for photos when a gym is opened. No free, reusable photo source covers gyms (OpenStreetMap had no image tags on these gyms). So the hero shows members' photos first, then Google's photos if the owner pays for the Places key (credited as Google requires), then Google's free Street View embed, labelled. Never a stand-in picture of another gym. |

## Traps

**Spring entrances break the web layout.** Reanimated's web version pins a
view that entered with a spring (or custom start values) in place, as
`position: absolute`, once its container moves, and a bottom sheet always
moves. The gym card collapsed to its photo row. So `components/motion.tsx`
uses springs on the phone and plain timed fades in the browser; keep new
entrances going through `rise()` and `DROP_IN` rather than calling
`springify()` directly.

**Stripe's `{CHECKOUT_SESSION_ID}` must stay unencoded** in the success
URL; Stripe fills it in. The server builds that URL by hand for this reason.

**In the current Stripe API, the billing period lives on subscription
items** (`items.data[0].current_period_end`), not on the subscription.

**Stripe only sends people back to `http(s)` pages**, so checkout returns to
`/api/billing/return` on the GymGO server, which confirms the payment and
forwards into the app (`gymgo://`, `exp://`) or the web page. It only
forwards to addresses on an allow-list, so it can't be used as an open
redirect.

**Refreshing the US gyms.** The main Overpass server resets connections from
some networks; the `maps.mail.ru` mirror worked. Ask for `out center tags`
for gyms (ways need a centre) and plain `out` for neighbourhood nodes:
`out tags` drops their coordinates. Then run
`pnpm --filter @gymgo/usa-data generate <folder of city JSON files>`
and the package's tests. The raw JSON isn't committed.

**The start-up location fix mustn't undo a choice.** It arrives a moment
after launch. If someone has already picked a place by then, it's ignored
(`onlyIfUntouched` in `lib/app-state.tsx`).

**The Explore sheets live in a layer that stops above the tab bar.** Its
own `BottomSheetModalProvider` sits in that layer, so a gym's card can't
float over another tab, and the floating glass background ends at the
layer's bottom so the sheet reads as a card. Moving the provider back to
the root puts sheets over every tab.

**Metro can wedge after routes are moved** ("Got unexpected undefined").
Restart it with `--clear`.

**Don't "import" Google data into the gym records.** It would be the obvious
way to fill the unknowns, and Google's terms forbid it (no copying, no
caching beyond the place ID). It would also blur what GymGO checked with
what Google says. The Google page is deliberately separate, and its hours are
labelled as opening hours, not guest hours.

**Don't scrape Google Maps** to get its reviews and photos "for free". It
breaks Google's terms, Google blocks it, and the reviews and photos belong
to their authors. The embed is the free, allowed route.

**Keep Google's embed at least 420 px wide.** Below that Google swaps its
card for a bare "Open in Maps" button. `GoogleEmbed` lays it out at 440 px
and scales it down; don't "simplify" that away.

**Don't use `BottomSheetTextInput` in the browser.** It calls
`TextInput.State.currentlyFocusedInput`, which react-native-web lacks, so
typing in any sheet crashed the phone-sized browser layout. `TextField` and
the search box use a plain `TextInput` on web.

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
