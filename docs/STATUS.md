# Status

Reported in separate columns on purpose. None of this is "production ready",
and collapsing these into that phrase would be the single most misleading thing
this document could do.

## Server, accounts and data (`apps/server`, `packages/melbourne-data`, `packages/au-data`, `packages/usa-data`)

| | Implemented locally | Tested locally | Externally integrated | Deployed |
|---|---|---|---|---|
| API server (Node, built-in SQLite) | ✅ | ✅ 97 tests over real HTTP | n/a, runs on your PC | ❌ not hosted |
| Gzip for larger answers (the gym list: 1.5 MB → 0.1 MB) | ✅ | ✅ 2 server tests + measured locally | n/a | ❌ |
| Members' visits: walked in / booked first / turned away, one per member per gym, last year only, no names | ✅ | ✅ 2 server tests + reported and shown in the browser | n/a | ❌ |
| Members say a gym has closed or is still open (6 months); the card warns when closed outnumbers open | ✅ | ✅ 2 server tests + reported and the warning seen in the browser | n/a | ❌ |
| Change your name and password (current password needed; other devices signed out) | ✅ | ✅ 3 server tests (including the browser's PATCH preflight, a real bug the first browser run caught) + driven in the browser | n/a | ❌ |
| Download my data (everything held about you, as one JSON file; no password hash or tokens) | ✅ | ✅ 1 server test + downloaded and read in the browser; phone share sheet not seen | n/a | ❌ |
| Moderators review and remove members' price and visit reports | ✅ | ✅ 1 server test (members refused) + the list seen in the browser | n/a | ❌ |
| Members' visit prices: one report per member per gym, median and range, no names, 2-year window; "~A$22 · members say" in lists when the gym publishes none; kept in A$, US$, €, £ or CHF by the gym's country (older databases migrate themselves) | ✅ | ✅ 4 server tests + 2 app tests + a euro report for a Berlin gym + the migration tested on an old-schema file + reported and shown in the browser (A$ only: gym page and list) | n/a | ❌ |
| Sign-up, sign-in, sign-out, delete account | ✅ | ✅ tests + driven in the browser | ❌ no email verification | ❌ |
| Saved gyms synced to the account | ✅ | ✅ tests + driven in the browser | n/a | ❌ |
| Reviews held for moderation; moderator queue | ✅ | ✅ tests; posting driven in the browser | n/a | ❌ |
| Real Melbourne gyms (23), every fact sourced | ✅ | ✅ 11 honesty tests | ⚠️ one-off read, 23 Sep 2026 | n/a |
| Real US gyms (1,055 in 40 cities), map-only from OpenStreetMap; no gym listed under two cities | ✅ | ✅ 12 honesty tests; served by the local server | ⚠️ one-off fetch, 24–25 Sep 2026; nobody has checked each gym is trading | n/a |
| Member photos: consent, hidden details removed, moderated, credited | ✅ | ✅ tests + driven in the browser | n/a | ❌ |
| Google's map and card for each gym (free embed, no key) | ✅ | ✅ loaded from Google in the browser, phone and PC sizes | ✅ Google's public embed | ❌ |
| Google Street View nearest each gym (free embed, no key) | ✅ | ✅ loaded in the browser (Carlton Fitness's shopfront) | ✅ Google's public embed | ❌ |
| Members' equipment reports (yes/no per machine, tallied) | ✅ | ✅ 2 server tests + driven in the browser | n/a | ❌ |
| GymGO Pro through Stripe: checkout, manage page, webhooks, who is Pro | ✅ | ✅ 21 tests with a stand-in Stripe; webhook signatures made and checked with Stripe's own library | ❌ **never run against Stripe itself**: no Stripe account or key was used | ❌ |
| Free limits enforced by the server (10 saved gyms; workout library is Pro) | ✅ | ✅ tests | n/a | ❌ |
| Emails, classes and facilities from OpenStreetMap (US gyms) | ✅ | ✅ honesty tests; shown in the browser | ⚠️ one-off fetch, 24 Sep 2026 | n/a |
| Extra Google photos, reviews, hours, phone, website, summary, accessibility, parking, payments (owner's own key, paid), on each gym page | ✅ | ⚠️ tests with a fake Google only; layout checked in the browser with stand-in data | ❌ **never called with a real key** | ❌ |

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
make one report per gym, so a single bad report shows as "1 thumbs up" and nothing
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
| Precise location: opens where you are, blue dot, nearest covered city when outside | ✅ | ⚠️ browser only, with simulated positions (New York, Toronto) | n/a | ❌ GPS, iPhone "Precise: Off" and Android "Approximate" never seen | n/a | ❌ |
| 40 US cities (the main market: first in the country list and on Home; New York until you choose): search by city, neighborhood, state ("Texas", "TX") or ZIP ("10001", your own country's match first), miles and $, visit times on local clocks (Phoenix without daylight saving, Honolulu, Detroit, Indianapolis their own zones) | ✅ | ✅ unit tests + driven in the browser (New York, Seattle, Philadelphia, Chicago) | n/a | ❌ | n/a | ❌ |
| 15 European cities (London, Paris, Berlin, Madrid, Barcelona, Rome, Milan, Amsterdam, Dublin, Lisbon, Vienna, Munich, Stockholm, Copenhagen, Zurich), map-only, 600 gyms, districts under local names, accent-free search | ✅ | ✅ 10 data tests + 2 place tests + driven in the browser (London in miles, 40 pins; Paris with Pro, 40 pins) | ✅ OpenStreetMap, fetched once by bounding box (the circle query timed out for London) | ❌ | n/a | ❌ |
| Choose your country (first launch, and Profile → Country): Free covers it, Pro every country. Outside it, no pins or list, just "Gyms in France are part of GymGO Pro" and the way back; a typed town, a built-in city (tagged PRO on Home) and "Search this area" all lead there; gym pages from links or Saved always open | ✅ | ✅ 7 country tests + 2 server tests (a Free search abroad refused before the map is read; a Pro account searches Paris) + driven in the browser (picker on a fresh visit, "uk" finds the UK, Paris and Kyoto locked for Free, Paris open for a Pro account) | ✅ the server checks Pro for live area searches | ❌ | n/a | ❌ |
| 7 more Australian cities (Sydney, Brisbane, Perth, Adelaide, Canberra, Gold Coast, Hobart), map-only, 229 gyms | ✅ | ✅ 10 data tests + place tests + driven in the browser (Sydney, Brisbane) | ✅ OpenStreetMap, fetched once | ❌ | n/a | ❌ |
| Demo mode (Profile switch): only invented gyms when on, only real ones when off | ✅ | ✅ a place test that switches it + driven in the browser (Sydney real, then demo) | n/a | ❌ | n/a | ❌ |
| Scrolling the tab screens in a browser | ✅ fixed: the tab container never shrank, so Home grew past the window and couldn't scroll | ✅ mouse wheel at phone and PC sizes | n/a | ❌ not checked on a phone that the old version was broken there too | n/a | ❌ |
| Workout builder: tap muscles on a body, plan from the gym's machines | ✅ | ✅ 6 unit tests + driven in the browser | n/a | ❌ taps on the native SVG body never seen | n/a | ❌ |
| Saved gyms (on the device) | ✅ | ⚠️ web preview only | n/a | ❌ | n/a | ❌ |
| Liquid Glass (iOS 26) / blur fallbacks | ✅ | ⚠️ browser imitation only: every floating glass control (status pill, map buttons, Search this area, the card's buttons) now bends the map at its edges like the tab bar (Chrome and Edge; a blur elsewhere), seen in phone and desktop screenshots | n/a | ❌ | n/a | ❌ |
| A ready-made Pro account for local testing (dev@gymgo.test), made by the launcher on this computer only; refused on a server with a public address or live Stripe keys; its password is put back and its Pro renewed on every start; Stripe never hears of it | ✅ | ✅ 4 server tests (signs in, is Pro, searches Paris from Australia, wrong password refused, one account however often it runs, refusals) + started for real: signed in and read "pro" from /api/billing; refused with GYMGO_PUBLIC_URL set | n/a | ❌ PowerShell launcher not run here (no PowerShell in this sandbox) | n/a | ❌ |
| Compact title on frosted glass once the large title scrolls away (Home, Saved, Profile) | ✅ | ✅ scrolled in the browser at phone size | n/a | ❌ | n/a | ❌ |
| The map's credit (OpenFreeMap/OpenStreetMap, Apple's Legal) stays above the sheet at every sheet height | ✅ | ✅ phone-size browser (it hid behind the sheet whenever the sheet was over half the screen); Android map page and Apple's label not seen | n/a | ❌ | n/a | ❌ |
| Haptics | ✅ | ❌ | n/a | ❌ | n/a | ❌ |
| Motion: spring presses on every button, chip and card; Save and Compare pop; a gym's sections and Home's cards rise in a stagger; notices, icons and folds fade; the segmented pill slides; saved rows glide out; all off under Reduce Motion | ✅ | ⚠️ driven in the browser (sections stay in place after the sheet moves; pill slides; fold opens; no errors); the springier phone versions never seen on a device | n/a | ❌ | n/a | ❌ |
| SF Pro to Apple's iOS text styles (system font on iPhone and Apple browsers; Inter, the closest free face, on Android and elsewhere) | ✅ | ⚠️ only Inter seen, in this sandbox's browser (no SF Pro installed); SF Pro itself never seen on an iPhone or Mac | n/a | ❌ | n/a | ❌ |
| Dark mode (Automatic, Light, Dark) for everyone; accent themes (Indigo free; Ocean, Grape, Rose, Graphite with Pro); switching crossfades and keeps your place; map, glass, tab bar, headers, status bar and the phone's own UI follow | ✅ | ✅ a unit test checks every text colour against WCAG AA in every mode and accent; seen in the browser (Home, Explore, gym page, Profile, Appearance, sign-in) in both modes; switching from the Appearance screen kept the screen and Back still went to Profile | n/a | ❌ Apple Maps' and Liquid Glass's dark look unseen | n/a | ❌ the accent gate is the app's (your own setting) |
| Sign in with Google and Apple: server checks the ID token (RS256 against the provider's keys, issuer, audience, expiry, nonce), makes the account the first time, never joins a password account on email alone; connect and disconnect from Account; a Google- or Apple-only account can set a password | ✅ | 🟡 11 server tests with locally made keys standing in for Google's and Apple's; the Google button seen in the browser with a placeholder client id; **never used with real Google or Apple accounts** (needs the owner's client ids; Apple needs a paid developer account) | ❌ | ❌ | n/a | ❌ |
| New sign-in sheet, Account screen and Settings-style Profile | ✅ | ✅ driven in the browser: wrong password shakes and explains, right one returns to Profile; account card, password form, light and dark | n/a | ❌ | n/a | ❌ |
| Mac launcher from any state (`curl … \| bash -s -- --xcode`), and auto-update while running | ✅ | 🟡 on Linux: an old checkout on another branch with an edit was stashed, switched and updated; a running copy picked up a new commit and restarted its server; the Xcode step with macOS tools stood in for writes the Node path Xcode needs. **Not yet run on a real Mac** | n/a | ❌ | n/a | ❌ |
| Training log: start a built or saved workout, tick sets (last time's numbers as placeholders), rest timer, plates per side (lb and kg), records on finishing (heaviest, estimated 1RM, body-weight reps; only against earlier sessions), Progress (week streak, this week, records, history, delete); in progress kept on the device; saved to the account (free); lb in the US, kg elsewhere | ✅ | ✅ 19 unit tests (records, targets, plates, streak, parsing) + 6 server tests (auth, own sessions only, validation, export, deleted with the account) + driven in the browser: two sessions logged, a reload mid-workout kept both sets, the second broke a record, Progress and plates checked, Free and Pro views | n/a (your own numbers) | ❌ | n/a | ❌ |
| Pro: a chart per exercise (estimated 1RM over time) and next-session targets by double progression | ✅ | ✅ unit tests + seen in the browser as Pro (chart, aim) and as Free (Pro hint, no aim) | n/a | ❌ | n/a | ❌ the gate is the app's (your own data, worked out on the device) |
| GymGO Pro screen, plan in Profile, Free limits, workout library | ✅ | ✅ whole loop driven in the browser against a stand-in Stripe (checkout, return, manage, cancel) | ❌ real Stripe never used | ❌ the phone's in-app browser round trip not seen | n/a | ❌ |
| Time-zone self-check at start-up | ✅ | ✅ unit tests | n/a | ❌ | n/a | ❌ |
| App icon, splash screen | ❌ | ❌ | n/a | ❌ | n/a | ❌ |
| Run from Xcode on a Mac (Simulator or your own iPhone, free Apple ID): `scripts/gymgo-mac.sh --xcode` makes the project with `expo prebuild`, fetches pods, writes the server address for release builds, opens Xcode; a debug build finds the server on the Mac it loaded its code from | ✅ | 🟡 project generation checked here (bundle id, team, local-network and location permissions, the build phase reading `.xcode.env.local`), the flow run end to end with Xcode, CocoaPods and `open` stood in for, and the iOS bundle built (2,091 modules); **never built or run in real Xcode**: this sandbox has no Mac | n/a | ❌ | n/a | ❌ |
| Store builds (EAS / App Store / Play) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| PC browser layout (side panels) | ✅ | ✅ driven end to end at 1440 × 900 | n/a | n/a | ❌ | n/a |
| Tabs: Home, Explore, Saved, Profile (Instagram-style glass capsule, draggable lens) | ✅ | ⚠️ browser only: taps, and dragging with touch and with a mouse | n/a | ❌ Liquid Glass material and the drag never seen on a phone | n/a | ❌ |
| Home, simplified (four picks, workout, nearby, saved, recent, neighbourhoods and cities as chips) | ✅ | ✅ driven at phone size | n/a | ❌ | n/a | ❌ |
| Accessibility in the browser: every button and link named, text contrast, keyboard order | ✅ | ✅ scanned 9 screens (0 unnamed controls), re-scanned after the area-search, icon and motion rounds, including a gym card on the map and a gym found by an area search (still 0); text colours checked at WCAG AA (fine print moved off the faint grey, which was 2.9:1); Tab order and focus rings checked on Home | n/a | ❌ VoiceOver / TalkBack never run | n/a | ❌ |
| Symbols instead of emoji on buttons, rows, chips and empty states (SF Symbols / Material Symbols / Phosphor) | ✅ | ⚠️ Material Symbols seen in the browser; SF Symbols only on an iPhone, never seen | n/a | ❌ | n/a | ❌ |
| Gyms' own website icons where there's no Commons logo (or their chain's, when branches share one site): card header, gym page, list tiles, credited to the site; about 240 of 769 real gyms | ✅ | ✅ 14 server tests (stand-in web: fake, tiny and white-on-clear images refused, one visit per site, chain sites never lent between independent affiliates, a down site retried after an hour) + guard checked live (localtest.me, lvh.me, 127.0.0.1.nip.io refused) + real icons seen in the browser (Doherty's, Absolute MMA, Anytime Fitness) | ✅ gyms' websites, fetched live by the server | ❌ | n/a | ❌ |
| Brand logos (18 chains across the US, Australia and Europe, from Wikimedia Commons, bundled) on gym pages and cards, credited | ✅ | ✅ driven in the browser (Equinox, Gold's Gym, Snap Fitness); in both native bundles | ✅ fetched from Wikidata and Commons once, by script | ❌ | n/a | ❌ |
| Top of a gym page: members' photos, else Google's photos of the exact gym (owner's key; the listing must share a real word of the name, or be a gym within 40 m), else Street View | ✅ | ⚠️ Google's photos only with stubbed data; Street View embed blank in this sandbox (no Google access from the test browser) | ⚠️ Street View is Google's free embed; Places photos never called with a real key | ❌ | n/a | ❌ |
| Gym page (pushed screen, share/compare/save) | ✅ | ✅ driven in the browser | n/a | ❌ | n/a | ❌ |
| Compare 2 gyms side by side, 4 with Pro (incl. a "Members paid" row; add from the map card's round compare button) | ✅ | ✅ driven in the browser | n/a | ❌ | n/a | ❌ |
| Search this area: gyms from OpenStreetMap for wherever the map is, anywhere in the world, each with its own country (country-coder), time zone and address order, same rules as the bundled cities, kept a month per 11 km tile; the Overpass server that answered last is asked first | ✅ | ✅ 19 server tests (stand-in Overpass, incl. falling over to the next server, the last good one first, Auckland and Berlin addresses, the open sea, and today’s rules applied to kept gyms) + 4 unit tests + driven in the browser over Bendigo (7 gyms found live), Kyoto (68) and Kreuzberg (68, in km, no A$ budget) and Hobart; dense London live through the API: Hackney 22 gyms (54 s, waiting out two servers that don't answer from here), then Camden 13 in 14 s straight from the one that does (it had failed with a 504 before a busy server got a second try), desktop and phone layouts; the Android map page's area reporting checked in Chromium with a stand-in app bridge (reports the area above the sheet) | ✅ Overpass API, read live (a mirror from this sandbox; the main server refuses it) | ❌ | n/a | ❌ |
| Opening outside the carried cities, anywhere, searches the map around you and shows "Near you"; only if that search fails (no server), the nearest carried city, saying why. The server is asked for the whole map tiles around you (about 30 km across), never your position; the list widens to 10 km only when that reaches a gym, and says so | ✅ | ✅ 4 unit tests + driven in the browser with a location in Bendigo (7 gyms), a second spot in the same tile (identical request; nothing within 10 km, and it says so) and Auckland (Sydney, 2,156 km) | ✅ Overpass, via the area search | ❌ | n/a | ❌ |
| Gyms found by an area search kept on the device (newest 250): saved and recent ones still show, and open, with the server unreachable; a link to one fetches it first ("Finding this gym…") | ✅ | ✅ driven in the browser (opened online, then Home and the gym page with the server blocked; a made-up id ends at "Gym not found") | n/a | ❌ | n/a | ❌ |
| Type any town or suburb anywhere and press Enter: looked up (Photon, cached a month, one a second), then flown to and searched; a gym's name wins only when that gym is near or no place has exactly that name | ✅ | ✅ 5 server tests (stand-in Photon) + 8 unit tests + driven in the browser ("Bendigo": 10 gyms; "Kyoto", "Kreuzberg"; "Equinox" opens the gym; a made-up name says so) | ✅ Photon, called live | ❌ | n/a | ❌ |
| Search gyms by name, nearest first; Enter opens the closest | ✅ | ✅ 4 unit tests + driven in the browser ("equinox") | n/a | ❌ | n/a | ❌ |
| Sort (best match, closest, cheapest, top rated); best match = fewest open questions, then nearest | ✅ | ✅ domain test for the order + checked on Melbourne in the browser; iPhone action sheet not seen | n/a | ❌ | n/a | ❌ |
| Melbourne's other 40 mapped gyms (map-only), without copies of the researched 23 | ✅ | ✅ data test (no researched map element reappears) + 63 gyms near the CBD in the browser | ✅ OpenStreetMap, fetched once | ❌ | n/a | ❌ |
| Recently viewed, haptics switch (kept on the device) | ✅ | ✅ driven in the browser | n/a | ❌ | n/a | ❌ |
| Press-and-hold preview and menu on gym cards | ✅ | ❌ iPhone only, never seen | n/a | ❌ | n/a | ❌ |
| Gym photos: strip on the card, thumbnails in the list, add a photo | ✅ | ✅ driven in the browser (web file picker) | n/a | ❌ phone photo picker not seen | n/a | ❌ |
| "See it on Google" full-screen page | ✅ | ✅ Google's embed live in the browser; key-only extras from faked data | ✅ free embed | ❌ web view not seen | n/a | ❌ |

**What "tested locally" means for the phone app, exactly:**

- It typechecks, and 44 unit tests pass. They include the same reference search
  the website runs, run through the app's own filter code: 3 confirmed results,
  Ironbark first.
- `expo export` builds both the **iOS and Android bundles** into Hermes
  bytecode without errors: 2,063 and 2,111 modules. The web-only map library
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
  library and tiles. Its "you are here" dot is drawn by that page and has
  only been seen in the browser version.
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

**Payments, exactly:** the server's Stripe code was written against the
Stripe library's own type definitions (API version 2026-08-26), and the real
client was checked to fit the interface the server uses. The setup script
typechecks against the same types. Webhook signatures in the tests are made
and verified by Stripe's library. But no call has ever reached Stripe: this
build was made without a Stripe account or key. The first real test is the
owner's, in test mode, with Stripe's test card (see README). On a phone,
checkout opens in an in-app browser that closes when Stripe sends you back;
that round trip has only been reasoned about, not seen. Nothing here takes
real money: that needs live keys, a hosted `https` server, terms and privacy
pages, tax registration where it applies, and a decision about app-store
rules (below).

**App stores and subscriptions:** Apple and Google have their own rules for
selling digital subscriptions inside apps, and they differ by country. A
store build therefore hides the buy button unless `EXPO_PUBLIC_NATIVE_CHECKOUT=on`
is set deliberately. Before submitting, check both stores' current payment
rules; outside places where linking to web payment is allowed, Pro would
need Apple's and Google's own in-app purchase as well.

## Verification evidence

Run `pnpm verify` and `pnpm test:e2e`. Last run on this commit:

| Check | Result |
|---|---|
| `pnpm typecheck` | Clean, every package |
| `pnpm lint` | No ESLint warnings or errors (web); tsc clean elsewhere |
| `@gymgo/domain` unit tests | **122 passed** |
| `@gymgo/demo-data` unit tests | **23 passed** |
| `@gymgo/melbourne-data` unit tests | **11 passed** |
| `@gymgo/au-data` unit tests | **11 passed** |
| `@gymgo/usa-data` unit tests | **12 passed** |
| `@gymgo/eu-data` unit tests | **10 passed** |
| `@gymgo/osm` unit tests | **25 passed** |
| `@gymgo/server` tests (real HTTP, in-memory SQLite) | **131 passed** |
| `@gymgo/mobile` unit tests | **132 passed** |
| `@gymgo/web` unit tests | **39 passed** |
| `expo export` (iOS + Android) | Both compiled to Hermes bytecode |
| `expo-doctor` | 21/21 checks passed |
| `expo prebuild` (iOS + Android, on Linux) | Both generated. The iPhone asks only for location while in use, photos and the local network; Android for location, internet and vibration |
| Phone app in a browser (Chromium, 390 / 768 / 1280 wide) | Scripted by hand, not a suite in the repo: search, filters, save, compare, review, country, sign-in, training, keyboard use, Escape, offline server, location allowed / unanswered / abroad |
| `pnpm build` (website) | Compiled successfully; not rerun this round, the website is unchanged |
| Playwright, old website (390 / 768 / 1440), fresh build | **99 passed**, 24 skipped (website unchanged since) |

Not run anywhere: a real iPhone, iPad or Android phone, Xcode itself, or
sign-in with real Google or Apple credentials.

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

### Phone app and server (`apps/mobile`, `apps/server`)

- **Native QA.** Built and bundled for iOS and Android, but never run on a
  device or simulator. The Xcode path (`scripts/gymgo-mac.sh --xcode`) is
  ready for a Mac but has never been through a real Xcode build; expect the
  first run there to surface something. Everything above marked "browser" was seen in the web
  build, which shares the code but not the native pieces (Apple Maps, SF
  Symbols, Liquid Glass, haptics, the share sheet, the photo picker).
- **Store builds.** The app icon (iOS light, dark and tinted; Android
  adaptive and themed), splash screen and favicon are done
  (`apps/mobile/scripts/brand-mark.mjs`). No EAS project, store signing or
  store listing: the bundle id is made per person, for running your own
  build from Xcode. None were asked for, and most involve an account or a fee.
- **Hosting.** The server runs on your own computer. Nothing is deployed, so
  accounts, reviews and members' reports live in one SQLite file there.
- **Real gym data is thin on detail.** 23 Melbourne gyms were researched fact
  by fact; the other ~1,900 in 8 Australian, 40 US and 15 European cities, and whatever
  "Search this area" finds elsewhere, are map-only (names, places, sometimes
  hours), so almost every card says "Call first". Members' price, visit and
  machine reports are the way that improves.
- **Free public services under the live features.** "Search this area" and
  finding towns by name lean on free, volunteer-run services (the Overpass
  servers, Photon). GymGO is gentle with them (caching, one request at a
  time, daily caps, four Overpass servers in turn), but they can be slow or
  down, and a busy hosted GymGO would want its own Overpass and Photon
  servers. Gyms' website icons are fetched from the gyms' own sites; a site
  that blocks automated visitors (Planet Fitness does) shows no icon.
- **No email.** Sign-up sends nothing, so there's no email check and no
  password reset.
- **Google's extras and Stripe** are built but have never been used with the
  owner's real keys, so Google's photos of the exact gym have been matched
  only against a stand-in for Google.
- **Pro can't be bought yet.** Gyms outside your country are part of Pro,
  and Pro is on sale only once the owner connects Stripe, so until then
  nobody can search other countries (they can switch their own country in
  Profile). The rule is checked by the server for live area searches; the
  built-in cities ship inside the app, so for those it's the app's word.
- **Prices outside five currencies.** Budgets and members' visit-price
  reports work in A$, US$, €, £ and CHF, where one sanity range (1 to 500)
  fits. Elsewhere, Stockholm and Copenhagen included, they're off (the range
  means nothing in kronor, yen or rupiah), so every price there is unknown. The gym-name rules are
  English-first, so a hotel or kids' gym named in another language can slip
  through.
- **SF Pro has only been seen as its stand-in.** This sandbox has no SF Pro,
  so the browser here drew Inter; the iPhone and Mac rendering is unseen.

### The older website (`apps/web`)

- **Invented data only.** Its 17 listings are the demo gyms.
- **The map has never rendered.** No basemap is configured, so `MapCanvas` is
  tested only in its unconfigured state.
- **Development-only sign-in.** `local-dev` has no passwords; a production
  build refuses it unless two variables are set on purpose, and then every
  page carries a warning.
- **File storage.** The JSON file store won't survive a serverless
  deployment; `docs/sql/001_schema.sql` is the production schema.
- **No support channel, no schema.org data.**

### Not started at all

- **Any customer research.** No interviews, no operator conversations, no task
  testing, no pilot. The product thesis is a hypothesis and this build does not
  make it less of one.
- **Any external contact.** No gym has been approached. No outreach has
  happened.
- **Crowd levels.** Modelled, deliberately unpopulated: GymGO shows no
  "busy now" it can't back up.

## What would need deciding before production

1. **A basemap licence suitable for a directory.** Not a default to inherit.
2. **Whether any mapping-provider data is used at all**, and under what terms.
3. **An identity provider**, and what "account" means when browsing needs none.
4. **A database**, and the migration from the file store.
5. **A support and moderation rota.** The queue works; nobody is staffing it.
6. **Legal review** of the terms and privacy pages, which are written as a
   description of the software rather than as a reviewed document.
