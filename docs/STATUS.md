# Status

Reported in separate columns on purpose. None of this is "production ready",
and collapsing these into that phrase would be the single most misleading thing
this document could do.

## Server, accounts and data (`apps/server`, `packages/melbourne-data`)

| | Implemented locally | Tested locally | Externally integrated | Deployed |
|---|---|---|---|---|
| API server (Node, built-in SQLite) | ✅ | ✅ 27 tests over real HTTP | n/a, runs on your PC | ❌ not hosted |
| Sign-up, sign-in, sign-out, delete account | ✅ | ✅ tests + driven in the browser | ❌ no email verification | ❌ |
| Saved gyms synced to the account | ✅ | ✅ tests + driven in the browser | n/a | ❌ |
| Reviews held for moderation; moderator queue | ✅ | ✅ tests; posting driven in the browser | n/a | ❌ |
| Real Melbourne gyms (23), every fact sourced | ✅ | ✅ 11 honesty tests | ⚠️ one-off read, 23 Sep 2026 | n/a |
| Member photos: consent, hidden details removed, moderated, credited | ✅ | ✅ tests + driven in the browser | n/a | ❌ |
| Google's map and card for each gym (free embed, no key) | ✅ | ✅ loaded from Google in the browser, phone and PC sizes | ✅ Google's public embed | ❌ |
| Google Street View nearest each gym (free embed, no key) | ✅ | ✅ loaded in the browser (Carlton Fitness's shopfront) | ✅ Google's public embed | ❌ |
| Members' equipment reports (👍/👎 per machine, tallied) | ✅ | ✅ 2 server tests + driven in the browser | n/a | ❌ |
| Extra Google photos and reviews (owner's own key, paid) | ✅ | ⚠️ tests with a fake Google only | ❌ **never called with a real key** | ❌ |

**Photos:** only members' own photos, which they confirm they took. The
server checks each file really is a JPEG or PNG, strips its hidden details
(EXIF, including GPS location, and text chunks), and holds it until a
moderator publishes it. A rejected photo's file is deleted, and the invented demo gyms
take no photos. None has been uploaded apart from a test image
labelled "TEST UPLOAD" in a throwaway database. There is no automatic check
for faces or unsuitable content: that's the moderator's job.

**Google, the free part:** each gym's Google page shows Google's own
embeddable map with Google's card for the gym (name, address, star rating,
number of reviews). It is loaded straight from Google, with no key, and
GymGO stores none of it. It was seen working in Chromium for Doherty's Gym
City ("4.4 ★ (177)"). Google only shows that card when the embed is at least
about 420 px wide, so on narrow screens the embed is laid out at 440 px and
scaled down. That was checked in the browser at phone size, and the phone
app's wrapper page was checked in mobile Chromium. It has **not** been seen
in a real phone's web view. Google's guidelines allow a plain embed without
permission, but ask revenue-generating apps to use the official Maps Embed
API. That is also free, but needs a Cloud account with billing set up.

**Equipment:** only 2 of the 23 real gyms publish any specific equipment
(Absolute MMA, and Australian Strength Performance's platforms and Eleiko
bars and plates). The other sites say "free weights" or "cardio" at most,
which isn't specific enough to record. Members' reports fill the gap, shown
as tallies and labelled as members'. They are not moderated. One member can
make one report per gym, so a single bad report shows as "👍 1" and nothing
more. They don't feed the search.

**Google, the paid extra:** off unless the owner sets `GOOGLE_PLACES_API_KEY`. The code
follows Google's rules as read on 23 September 2026. Only place IDs are
stored, nothing else is cached, the page has no map on it, and Google and
every author are credited. It has **not** been run against the real Google,
because no key was used, so the gym matching and response handling are
tested only against a fake that mimics Google's documented format. The
attribution is the text "Google Maps", not Google's logo, which Google says
is allowed. Treat the first run with a real key as the real test. Using a
real key needs billing turned on, and Google charges once the monthly free
allowance runs out.

**Free, and what that means here:** the server and database run on your own
computer. That costs nothing and needs no account anywhere. It also means
the phone only reaches them on the same Wi-Fi. Hosting them for free
elsewhere (for example a free Postgres tier) would mean signing up for a
service, which is your decision to make. Nothing has been provisioned.

**Security, stated plainly:**

- Passwords are hashed with scrypt, and sessions are random tokens stored
  hashed.
- Sign-in attempts are rate-limited, and browser access is limited to
  localhost and your home network.
- There is no email verification and no password reset.
- The API runs over plain HTTP on your network. Fine for a pilot on your own
  Wi-Fi; not for the internet.

**The Melbourne data:**

- Names and positions come from OpenStreetMap (ODbL). Prices, hours and
  equipment come only from the gyms' own sites, read once on 23 September
  2026.
- Only 9 of the 23 gyms publish anything we could use beyond their location.
  None states whether a first visit needs an induction. So no gym is "Good to
  go", which is the honest result.
- Map-only gyms are marked as not confirmed to be trading.
- Prices go stale after 30 days, and there is no re-checking process yet.
- No gym has been contacted.

## Phone app (`apps/mobile`, Expo)

| | Implemented locally | Tested locally | Externally integrated | Native-tested | Deployed | Store-approved |
|---|---|---|---|---|---|---|
| Search, filters, tiering on the device | ✅ | ✅ unit tests | n/a | ❌ | n/a | ❌ |
| Map with tier-coloured pins | ✅ | ⚠️ web preview only | ⚠️ see below | ❌ | n/a | ❌ |
| Results sheet, place card, filters sheet | ✅ | ⚠️ web preview only | n/a | ❌ | n/a | ❌ |
| Directions / call / website hand-off | ✅ | ❌ | n/a | ❌ | n/a | ❌ |
| Locate me (foreground, never stored) | ✅ | ❌ | n/a | ❌ | n/a | ❌ |
| Saved gyms (on the device) | ✅ | ⚠️ web preview only | n/a | ❌ | n/a | ❌ |
| Liquid Glass (iOS 26) / blur fallbacks | ✅ | ⚠️ blur fallback only | n/a | ❌ | n/a | ❌ |
| Haptics | ✅ | ❌ | n/a | ❌ | n/a | ❌ |
| Helvetica (built-in on iOS, free clone on Android) | ✅ | ⚠️ clone only, in web preview | n/a | ❌ | n/a | ❌ |
| Time-zone self-check at start-up | ✅ | ✅ unit tests | n/a | ❌ | n/a | ❌ |
| App icon, splash screen | ❌ | ❌ | n/a | ❌ | n/a | ❌ |
| Store builds (EAS / Xcode / Gradle) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| PC browser layout (side panels) | ✅ | ✅ driven end to end at 1440 × 900 | n/a | n/a | ❌ | n/a |
| Tabs: Home, Explore, Saved, Profile | ✅ | ⚠️ browser's glass tab bar only | n/a | ❌ Apple/Android native tab bar never seen | n/a | ❌ |
| Home (picks, nearby, saved, recent, suburbs, counts) | ✅ | ✅ driven at phone and PC sizes | n/a | ❌ | n/a | ❌ |
| Gym page (pushed screen, share/compare/save) | ✅ | ✅ driven in the browser | n/a | ❌ | n/a | ❌ |
| Compare up to 3 gyms | ✅ | ✅ driven in the browser | n/a | ❌ | n/a | ❌ |
| Sort (best match, closest, cheapest, top rated) | ✅ | ⚠️ tsc; browser cycles, iPhone action sheet not seen | n/a | ❌ | n/a | ❌ |
| Recently viewed, haptics switch (kept on the device) | ✅ | ✅ driven in the browser | n/a | ❌ | n/a | ❌ |
| Press-and-hold preview and menu on gym cards | ✅ | ❌ iPhone only, never seen | n/a | ❌ | n/a | ❌ |
| Gym photos: strip on the card, thumbnails in the list, add a photo | ✅ | ✅ driven in the browser (web file picker) | n/a | ❌ phone photo picker not seen | n/a | ❌ |
| "See it on Google" full-screen page | ✅ | ✅ Google's embed live in the browser; key-only extras from faked data | ✅ free embed | ❌ web view not seen | n/a | ❌ |

**What "tested locally" means for the phone app, exactly:**

- It typechecks, and 31 unit tests pass. They include the same reference search
  the website runs, run through the app's own filter code: 3 confirmed results,
  Ironbark first.
- `expo export` builds both the **iOS and Android bundles** into Hermes
  bytecode without errors: 1,918 and 1,970 modules. The web-only map library
  is confirmed absent from both.
- `expo-doctor` passes 21/21 checks.
- The interface was driven with Playwright in the browser build at 390 × 844,
  and at 1440 × 900 for the PC layout. On the PC that browser build is the
  product itself, not a preview.
- The PC run covered creating an account, searching Fitzroy, opening a gym,
  saving it and writing a review. That review showed as waiting for a
  moderator, and the saved gym appeared in the account.
- The photo and Google round was driven at both sizes too. It covered the
  simpler list with its status chips and a photo thumbnail, the gym card with
  its folding sections, uploading a photo through the browser's file picker,
  the consent step, the "a moderator will check it" message, the moderator's
  photo queue, and the Google page. The Google page was shown in its "off"
  state for real, and in its "on" state only with clearly labelled fake data.
- The phone-sized run covered the map with pins, opening a place card from a row,
  closing it, the filters sheet, tightening filters to "nothing fits" with its
  suggestions, and place search. Those screenshots are the only visual evidence.
  They were taken in Chromium, not on a phone. They show the blur fallback,
  not Liquid Glass, and MapLibre, not MapKit or Google Maps.

**The tabs, and what hasn't been seen:** on phones the tab bar is the
system's own (Expo Router's native tabs), so on iOS 26 it should be Apple's
Liquid Glass bar. That, the iPhone press-and-hold previews, the sort action
sheet and how the Explore sheets sit above the real tab bar have only been
built and bundled, not seen. The browser version uses GymGO's own glass tab
bar and was driven end to end.

**Not done, and it matters:** apart from the Android map report above, the app
has **not been checked on a physical phone or a simulator**. This machine has no iOS simulator and no Android emulator. Nothing
about touch, gestures, keyboard behaviour, haptics, safe areas, the native map,
Liquid Glass or performance has been observed. The first run in Expo Go on a
real phone is the next test. Expect to fix things there.

**Maps, per platform:**

- **iPhone:** Apple MapKit through react-native-maps. It needs no key and no
  account.
- **Android:** first tested on a real phone (a Nothing Phone (3a) in Expo
  Go), where Google Maps stayed blank. That is a current Expo Go bug
  (expo/expo#49323, open). Android now draws the map in a web view with
  MapLibre and OpenFreeMap tiles, the same as the PC. So no Google Maps key
  is needed, now or for a standalone build. That page was tested in a
  phone-sized Chromium: tiles, pins, the selected pin, padding for the sheet,
  and pin taps reaching the app. It has **not** yet been confirmed on the
  phone. It needs an internet connection on the phone to fetch the map
  library and tiles. There is no "you are here" dot on Android yet.
- **PC (browser):** OpenFreeMap tiles (OpenStreetMap data). They are free,
  with attribution, and the credit is kept visible above the sheet.

Apple's and Google's own place labels are switched off, so no real business
appears next to an invented one. On Android that is a map style rule, which has
not been seen working.

## Website (`apps/web`, the earlier pilot)

| | Implemented locally | Tested locally | Externally integrated | Native-tested | Deployed | Store-approved |
|---|---|---|---|---|---|---|
| Search, filters, tiering, ranking | ✅ | ✅ | n/a | ❌ | ❌ | n/a |
| Gym detail with provenance | ✅ | ✅ | n/a | ❌ | ❌ | n/a |
| Comparison (up to 3) | ✅ | ✅ | n/a | ❌ | ❌ | n/a |
| Saved gyms (browser-local) | ✅ | ✅ | n/a | ❌ | ❌ | n/a |
| Corrections + moderation | ✅ | ✅ | ❌ | ❌ | ❌ | n/a |
| Reviews + moderation | ✅ | ✅ | ❌ | ❌ | ❌ | n/a |
| Ownership claims | ✅ | ✅ | ❌ | ❌ | ❌ | n/a |
| Server API `/api/v1` | ✅ | ✅ | n/a | ❌ | ❌ | n/a |
| Authorisation rules | ✅ | ✅ | n/a | ❌ | ❌ | n/a |
| Account deletion | ✅ | ✅ | n/a | ❌ | ❌ | n/a |
| SEO pages, sitemap, robots | ✅ | ⚠️ builds only | ❌ | ❌ | ❌ | n/a |
| Map rendering | ⚠️ written | ❌ **never run** | ❌ no basemap | ❌ | ❌ | n/a |
| Authentication | ⚠️ dev adapter only | ✅ | ❌ no provider | ❌ | ❌ | n/a |
| Persistence | ⚠️ JSON file | ✅ | ❌ no database | ❌ | ❌ | n/a |
| macOS native binary | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Real gym data | ❌ | ❌ | ❌ | ❌ | ❌ | n/a |

## Verification evidence

Run `pnpm verify` and `pnpm test:e2e`. Last run on this commit:

| Check | Result |
|---|---|
| `pnpm typecheck` | Clean, all six packages |
| `pnpm lint` | No ESLint warnings or errors (web); tsc clean elsewhere |
| `@gymgo/domain` unit tests | **115 passed** |
| `@gymgo/demo-data` unit tests | **23 passed** |
| `@gymgo/melbourne-data` unit tests | **11 passed** |
| `@gymgo/server` tests (real HTTP, in-memory SQLite) | **27 passed** |
| `@gymgo/mobile` unit tests | **31 passed** |
| `@gymgo/web` unit tests | **39 passed** |
| `expo export` (iOS + Android) | Both compiled (1,918 and 1,970 modules) |
| `expo-doctor` | 21/21 checks passed |
| `pnpm build` | Compiled successfully |
| Playwright, old website (390 / 768 / 1440), fresh build | **99 passed**, 24 skipped (website unchanged since) |

The 24 skips are the contribution and moderation suite at phone and tablet
width: it writes to a shared local store, so running it in three browsers at
once would have the tests trip over each other. Those pages' layout is covered
by the accessibility suite at all three widths.

### What the e2e suite actually checks

Not that the app compiles — that it behaves. Among them: a 24-hour member gym
with daytime guest entry does not match a 7pm visitor; an unresolved induction
shows "Needs confirmation"; a pool-only admission is not offered as gym-floor
access; a refundable deposit shows A$45 needed on the day against a A$25 visit
cost; an unknown mandatory fee prevents a confirmed total; changing a filter
updates results and back navigation restores both the results *and* the control
values; a member cannot reach the moderation queue; a moderator cannot see
ownership evidence; an approved claim grants one branch and not another; the
public change history carries the reason and not the evidence; no horizontal
scroll at any of the three widths; every interactive control has an accessible
name; the skip link works.

## Known gaps

### Never exercised

- **The map.** No basemap is configured, so `MapCanvas` has never rendered. The
  unconfigured state is tested; the configured one is not. Treat the MapLibre
  code as unreviewed-in-practice until someone runs it with a real style URL.

### Development-only

- **Authentication.** `local-dev` has no passwords and no identity checks. It is
  refused in a production build unless two variables are set deliberately, and
  then every page carries a warning banner. A real provider is required before
  anyone but a developer uses this.
- **Persistence.** The JSON file store will not survive a serverless deployment
  and does not scale. `docs/sql/001_schema.sql` is the production schema; the
  repository functions in `src/server/` are the seam.

### Not built

- **Native QA of the phone app.** Built and bundled, but never run on a
  device or simulator (see the top of this document). A web-preview screenshot
  is not native QA evidence.
- **Store builds.** No app icon, splash screen, bundle identifiers, EAS
  project, signing, or store listing. None of those were asked for yet, and
  most involve an account or a fee.
- **A native macOS binary.** A separate later deliverable. The desktop website
  and the installable web experience cover the Mac requirement for now.
- **A support channel.** `/support` says plainly that no channel is connected
  and the addresses are placeholders. This must exist before contributions open
  to the public.
- **Structured data (schema.org).** Would need to be backed by visible, licensed
  facts. A decision to make with real data.
- **Crowd reporting.** Modelled, deliberately unpopulated.

### Not started at all

- **Any real gym data.** All 17 listings are invented.
- **Any customer research.** No interviews, no operator conversations, no task
  testing, no pilot. The product thesis is a hypothesis and this build does not
  make it less of one.
- **Any external contact.** No gym has been approached. No outreach has
  happened.

## What would need deciding before production

1. **A basemap licence suitable for a directory.** Not a default to inherit.
2. **Whether any mapping-provider data is used at all**, and under what terms.
3. **An identity provider**, and what "account" means when browsing needs none.
4. **A database**, and the migration from the file store.
5. **A support and moderation rota.** The queue works; nobody is staffing it.
6. **Legal review** of the terms and privacy pages, which are written as a
   description of the software rather than as a reviewed document.
