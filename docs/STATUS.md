# Status

Reported in separate columns on purpose. None of this is "production ready",
and collapsing these into that phrase would be the single most misleading thing
this document could do.

## Server, accounts and data (`apps/server`, `packages/melbourne-data`, `packages/au-data`, `packages/usa-data`)

| | Implemented locally | Tested locally | Externally integrated | Deployed |
|---|---|---|---|---|
| API server (Node, built-in SQLite) | ✅ | ✅ 225 tests, most over real HTTP | n/a, runs on your PC | ⚠️ ready to host (`deploy/`): built and run here in Docker behind Caddy; not on a public server |
| Hosting kit: server image, Caddy with automatic HTTPS serving the web app, setup and update scripts, daily database copies kept 14 days | ✅ | ✅ the whole stack built and run here: HTTPS on localhost, the web app, a sign-up through it, the first backup written; 3 backup tests | ❌ Let's Encrypt not exercised (localhost gets Caddy's own certificate); never run on Oracle Cloud | ❌ |
| Terms of Service, Privacy Policy, Refunds and Cancelling, Community Guidelines: in the app (Profile → Legal), as public pages (`/terms` …), agreed to at sign-up with the version recorded, asked again when they change, linked by Pro and Stripe's checkout | ✅ | ✅ 7 server tests + every screen and page seen in the browser | ⚠️ who runs GymGO comes from `GYMGO_LEGAL_*`, not set yet | ❌ |
| Forgot password: a one-time emailed link (30 minutes), a page to choose the new password, every device signed out | ✅ | ✅ server tests with a stand-in mailer, including a forged Host header | ❌ never sent to a real inbox | ❌ |
| Security hardening: common passwords refused, 30 tries an hour per account, rate limits by the caller's address behind a proxy, limiter memory bounded, expired sign-ins deleted, security headers and HSTS, request timeouts, `/.well-known/security.txt`, nodemailer 10 | ✅ | ✅ 10 server tests | n/a | ❌ |
| Gzip for larger answers (the gym list: 1.5 MB → 0.1 MB) | ✅ | ✅ 2 server tests + measured locally | n/a | ❌ |
| Members' visits: walked in / booked first / turned away, one per member per gym, last year only, no names | ✅ | ✅ 2 server tests + reported and shown in the browser | n/a | ❌ |
| Members say a gym has closed or is still open (6 months); the card warns when closed outnumbers open | ✅ | ✅ 2 server tests + reported and the warning seen in the browser | n/a | ❌ |
| Change your name and password (current password needed; other devices signed out) | ✅ | ✅ 3 server tests (including the browser's PATCH preflight, a real bug the first browser run caught) + driven in the browser | n/a | ❌ |
| Download my data (everything held about you, as one JSON file; no password hash or tokens) | ✅ | ✅ 1 server test + downloaded and read in the browser; phone share sheet not seen | n/a | ❌ |
| Report a bug (Profile, and the crash screen): kept on the server, emailed to the team through the owner's SMTP account, retried, 5 an hour per person, 50 emails a day | ✅ | ✅ 15 server tests + 3 app tests + sent from the browser, signed in and out, offline and from the crash screen, into a local stand-in mail server | ❌ no SMTP account set; no real inbox has received one | ❌ |
| Accounts for 13 and over: sign-up (and a first Google or Apple sign-in) asks the month and year you were born; the server refuses a younger age and keeps nothing, only when the check was made; the device won't offer sign-up again for a day | ✅ | ✅ 3 server tests (the boundary month, no row kept, Google asked first) + 3 app tests + driven in the browser (an under-13 answer refused and still refused after reloading; an adult account made) | n/a | ❌ |
| Copyright notices: Profile → Copyright and takedowns explains the process; the notice form goes through bug reports, marked and emailed as a copyright notice; the registered agent shows once `GYMGO_DMCA_AGENT_*` is set | ✅ | ✅ 1 server test (the email) + the explainer and form seen in the browser | ❌ **no agent registered** with the US Copyright Office | ❌ |
| Moderators review and remove members' price and visit reports | ✅ | ✅ 1 server test (members refused) + the list seen in the browser | n/a | ❌ |
| Members' visit prices: one report per member per gym, median and range, no names, 2-year window; "~A$22 · members say" in lists when the gym publishes none; kept in the gym's country's own currency, never converted, with the typo check (1 to 500 dollars' worth) and budget steps sized to it (¥100 to ¥50,000; "Under ¥2,500"); none where the exchange rate is too unsettled (Iran, Lebanon, Venezuela, Syria, Cuba, Myanmar, Yemen, Sudan, South Sudan, North Korea); older databases migrate themselves | ✅ | ✅ 7 server tests (euros in Berlin, NZ$ in Auckland, yen in Tokyo with ¥50 refused, none in Tehran) + app and domain tests (every listed country's money, labels such as "¥1,500" and "Rp500,000", typed "¥1,500" and "24,50") + both older schemas migrated + reported and shown in the browser | n/a | ❌ |
| Sign-up, sign-in, sign-out, delete account | ✅ | ✅ tests + driven in the browser | ❌ no email verification | ❌ |
| GymGO needs an account: the server answers only a signed-in session (401 "Sign in first."), apart from a short open list (`isPublicRoute`: health, signing in and up, password reset, legal pages, bug reports, Stripe's callbacks, Pro's prices, image files); a route added later is closed unless listed | ✅ | ✅ 2 server tests (the open list, gyms refused signed out and with a made-up token, served signed in) + every other server test now reads as a signed-in member | n/a | ❌ |
| Saved gyms synced to the account (a saved gym the server no longer has shows as "No longer listed" with Remove, instead of silently taking a Free space): only the changes made on the device go to the account (saved or removed signed out, or while the server was away, sent when it's back), never the device's whole copy, so a gym removed on another device or offline stays removed | ✅ | ✅ tests (9 unit tests with a stand-in server: removed elsewhere, removed offline and sent later, kept across a restart, saved signed out, a device from before changes were kept, a refused change, sign-out, the latest change wins) + driven in the browser (removed offline then the server back; removed on a second device then this one restarted; saved signed out then sign-up) | n/a | ❌ |
| Reviews held for moderation; moderator queue | ✅ | ✅ tests; posting driven in the browser | n/a | ❌ |
| Real Melbourne gyms (23), every fact sourced | ✅ | ✅ 11 honesty tests | ⚠️ one-off read, 23 Sep 2026 | n/a |
| Real US gyms (1,044 in 40 cities), map-only from OpenStreetMap; no gym listed under two cities, and none across a border (Windsor, Canada, taken out of Detroit's) | ✅ | ✅ 13 honesty tests; served by the local server | ⚠️ one-off fetch, 24–25 Sep 2026; nobody has checked each gym is trading | n/a |
| Member photos: consent, hidden details removed, moderated, credited | ✅ | ✅ tests + driven in the browser | n/a | ❌ |
| Google's map and card for each gym (free embed, no key) | ✅ | ✅ loaded from Google in the browser, phone and PC sizes | ✅ Google's public embed | ❌ |
| Google Street View nearest each gym (free embed, no key) | ✅ | ✅ loaded in the browser (Carlton Fitness's shopfront) | ✅ Google's public embed | ❌ |
| Members' equipment reports (yes/no per machine, tallied) | ✅ | ✅ 2 server tests + driven in the browser | n/a | ❌ |
| Friends (codes, requests, accept, unfriend), invites to train (gym, time, note; yes/no; take back), the friends' and public leaderboards (opt-in, display name only, per city); a friend sees cards and totals, never days; all in Download my data and gone with the account | ✅ | ✅ 6 server tests (no emails or ids shown, no days in a friend's cards, only the invited answer, only the sender cancels, unfriending clears invites, leaving the board, deletion) + domain tests for codes, ranks and friend cards + driven in the browser with the dev account and a second account | n/a | ❌ |
| "Is it busy?": one report per member per gym, a level only from 3 in the last hour (the middle of them), deleted after a day | ✅ | ✅ 2 server tests + 3 domain tests + reported from the gym page in the browser (dev account, location check skipped) with two other accounts' reports | n/a | ❌ |
| Verified gym owners: claims (admins only see the evidence), approval making a branch-scoped owner, owner updates (visitor hours, casual price) approved by a moderator then laid over the gym's record as owner-confirmed; `make-admin` | ✅ | ✅ 2 server tests (the whole flow, permissions, nothing personal in public answers, export, deletion removing the updates) + 3 domain tests + driven in the browser end to end | n/a | ❌ no real gym has claimed anything |
| Gift Pro (a one-off payment makes one code per checkout, by webhook or return page; redeeming gives a year after any gift running), Pro Duo (a Duo price; a partner by friend code is Pro while the Duo is paid), partner day passes (admins add them; pass and booking fee as separate Checkout lines; a pass code once paid); Stripe setup creates the Duo and gift prices | ✅ | ✅ 3 server tests against a pretend Stripe + 3 domain tests + each screen driven in the browser with sandbox-only test rows (removed after) | ❌ **never run against Stripe itself**; no gym has a pass agreement | ❌ |
| Machine search: one request for the machines picked (`/api/equipment/reported`), no position sent | ✅ | ✅ 2 server tests + used by the app in the browser | n/a | ❌ |
| GymGO Pro through Stripe: checkout, manage page, webhooks, who is Pro | ✅ | ✅ 21 tests with a stand-in Stripe; webhook signatures made and checked with Stripe's own library | ❌ **never run against Stripe itself**: no Stripe account or key was used | ❌ |
| Free trial of monthly Pro: 3 days, offered in an account's first 30 days, once per account (the server decides); card taken at checkout, the monthly price charged when it ends unless cancelled; the offer, its last day and the first payment's date on the Pro screen and Profile; Terms and Refunds say so (legal version 2026-10-06) | ✅ | ✅ 6 server tests with a stand-in Stripe (offered, the checkout's trial and card, monthly Pro only, not after 30 days, only when the app asked, once) + 4 domain tests + the screens seen in the browser with the server's answers stood in for | ❌ never run against Stripe itself | ❌ |
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
| Account only: signed out, the app is the sign-in screen (Create account for someone new to the device, Sign in for someone who has signed in there before), the legal pages and Report a bug; a link opened signed out opens after signing in; a kept sign-in opens straight into the app; gyms and the country download are fetched only signed in | ✅ | ✅ driven in the browser: a signed-out visit to Home and to a gym's link both showed only sign-in; the terms and Report a bug opened; a new account made from a gym's link landed on that gym; a reload stayed in without showing sign-in; Sign out went back to Sign in; signing in again worked; an account on the old terms was asked to agree to the new ones | n/a | ❌ deep links on a phone not tried | n/a | ❌ |
| Map with tier-coloured pins | ✅ | ⚠️ web preview only | ⚠️ see below | ❌ | n/a | ❌ |
| Results sheet, place card, filters sheet; on a phone (the app, or a touch-screen browser) a sheet's list only scrolls, a swipe on it opens its sheet all the way first, the sheet moves by its top edge, and the list is sized to the part of the sheet in sight so its last row can always be scrolled into view | ✅ | ⚠️ web preview only: in a touch browser at phone size, a swipe on the half-open results or a gym's card opened it and scrolled, both scrolled to their last row, and the card's top edge dragged it back down; with a mouse, the wheel scrolls the half-open list as before; the phone app's path (the list only scrolls; the sheet opens as a drag starts) checked in the browser, not on a device | n/a | ❌ Expo Go not tried from here | n/a | ❌ |
| Directions / call / website hand-off | ✅ | ❌ | n/a | ❌ | n/a | ❌ |
| Skeleton loaders: a gym's page, results and Home while searching a place, reviews, member reports, Progress, workouts, the account card | ✅ | ⚠️ seen in the browser with the server's answers held back | n/a | ❌ | n/a | ❌ |
| Open late (still open at 10 pm) and 24 hours: filter sheet, chips over the results, a "Drop" suggestion when it leaves nothing; from the gym's published hours, visitors' first, never guessed | ✅ | ✅ 5 domain tests + 1 app test on the bundled gyms + chips and sheet seen in the browser | n/a | ❌ | n/a | ❌ |
| Find a machine (Home → Machines): pick up to 8, a distance; gyms with them by the gym's record or members' tally, each line saying which; a record saying "no" rules a gym out | ✅ | ✅ 3 domain tests + 2 app tests + seen in the browser with two members' reports on the local server | n/a | ❌ | n/a | ❌ |
| Trips (Home → Trips): a place and dates kept on the phone, described by the date where the trip is ("Today", "Tomorrow", "Under way"); the gyms there that let visitors in each day (7 am, noon, 6 pm on the gym's clock), "ask first" days apart; a Home card for a trip under way or within a month; removing one takes two taps; Pro gate abroad | ✅ | ✅ 2 domain tests + 5 app tests + Sydney, Brisbane and Hobart trips made, shown and removed in the browser (their gyms publish no visitor hours, so every day is "ask first") | n/a | ❌ | n/a | ❌ |
| Legal screens, the terms box when making an account, "Forgot your password?" | ✅ | ⚠️ seen in the browser; sign-up through the hosted stack recorded the terms version | n/a | ❌ | n/a | ❌ |
| Precise location: opens where you are, blue dot, nearest covered city when outside | ✅ | ⚠️ browser only, with simulated positions (New York, Toronto) | n/a | ❌ GPS, iPhone "Precise: Off" and Android "Approximate" never seen | n/a | ❌ |
| 40 US cities (the main market: first in the country list and on Home; New York until you choose): search by city, neighborhood, state ("Texas", "TX") or ZIP ("10001", your own country's match first; suggested places your own country's first too, so "Kensington" is Brooklyn's before Melbourne's), the search box worded for the US ("Search a city, ZIP code or gym", "Try a city or ZIP code"), miles and $ (distances in your own country's units once you've chosen one, so Saved never mixes "550 m" and "10,361 mi"; prices always in the gym's currency), visit times on local clocks (Phoenix without daylight saving, Honolulu, Detroit, Indianapolis their own zones) | ✅ | ✅ unit tests + driven in the browser (New York, Seattle, Philadelphia, Chicago; the search box's wording and a missed search as a US user) | n/a | ❌ | n/a | ❌ |
| 15 European cities (London, Paris, Berlin, Madrid, Barcelona, Rome, Milan, Amsterdam, Dublin, Lisbon, Vienna, Munich, Stockholm, Copenhagen, Zurich), map-only, 600 gyms, districts under local names, accent-free search | ✅ | ✅ 10 data tests + 2 place tests + driven in the browser (London in miles, 40 pins; Paris with Pro, 40 pins) | ✅ OpenStreetMap, fetched once by bounding box (the circle query timed out for London) | ❌ | n/a | ❌ |
| Choose your country (first launch, with "Not now" to skip it until next launch; and Profile → Country): Free covers it, Pro every country. Outside it, no pins or list, just "Gyms in France are part of GymGO Pro" and the way back; a typed town, a built-in city (tagged PRO on Home) and "Search this area" all lead there; gym pages from links or Saved always open | ✅ | ✅ 7 country tests + 2 server tests (a Free search abroad refused before the map is read; a Pro account searches Paris) + driven in the browser (picker on a fresh visit, "uk" finds the UK, Paris and Kyoto locked for Free, Paris open for a Pro account) | ✅ the server checks Pro for live area searches | ❌ | n/a | ❌ |
| 7 more Australian cities (Sydney, Brisbane, Perth, Adelaide, Canberra, Gold Coast, Hobart) and the rest of Melbourne, map-only: every mapped gym across each city's suburbs (14 to 30 km out; the old 40-per-city cap is gone), 1,251 gyms (nail and hair salons a mapper tagged as gyms left out), 1,758 suburbs in the search box | ✅ | ✅ 11 data tests + place tests + searched in the browser (Burwood East) | ⚠️ OpenStreetMap, fetched 28 Sep 2026; nobody has checked each gym is trading | ❌ | n/a | ❌ |
| Gyms from operators' own websites: 76 open Revo Fitness gyms (address, position, phone, 24/7 member hours, from each branch's page; 7 not yet open left out; the map's copies and Victoria's old Crunch pins left out) and T1 Fitness, Burwood East (address from its contact page; position of 315 Burwood Highway from OpenStreetMap; no hours, as it publishes none) | ✅ | ✅ 5 data tests + found in the browser by searching Burwood East | ⚠️ read once, 28 Sep 2026 | ❌ | n/a | ❌ |
| Demo mode (Profile switch): only invented gyms when on, only real ones when off | ✅ | ✅ a place test that switches it + driven in the browser (Sydney real, then demo) | n/a | ❌ | n/a | ❌ |
| Scrolling the tab screens in a browser | ✅ fixed: the tab container never shrank, so Home grew past the window and couldn't scroll | ✅ mouse wheel at phone and PC sizes | n/a | ❌ not checked on a phone that the old version was broken there too | n/a | ❌ |
| Workout builder: tap muscles on a body, plan from the gym's machines | ✅ | ✅ 6 unit tests + driven in the browser | n/a | ❌ taps on the native SVG body never seen | n/a | ❌ |
| Saved gyms (on the device) | ✅ | ⚠️ web preview only | n/a | ❌ | n/a | ❌ |
| Liquid Glass (iOS 26) / blur fallbacks | ✅ | ⚠️ browser imitation only: every floating glass control (status pill, map buttons, Search this area, the card's buttons) now bends the map at its edges like the tab bar (Chrome and Edge; a blur elsewhere), seen in phone and desktop screenshots | n/a | ❌ | n/a | ❌ |
| A ready-made Pro account for local testing (dev@gymgo.test), made by the launcher on this computer only; refused on a server with a public address or live Stripe keys; its password is put back and its Pro renewed on every start; Stripe never hears of it; it alone can collect gyms from anywhere (the server marks it `devTools` only when it made it) | ✅ | ✅ 5 server tests (signs in, is Pro, searches Paris from Australia, wrong password refused, one account however often it runs, refusals, and only it marked for testing shortcuts, only by a server that made it) + started for real: signed in and read "pro" from /api/billing; refused with GYMGO_PUBLIC_URL set; collected a New York gym from here in the browser | n/a | ❌ PowerShell launcher not run here (no PowerShell in this sandbox) | n/a | ❌ |
| Compact title on frosted glass once the large title scrolls away (Home, Saved, Profile) | ✅ | ✅ scrolled in the browser at phone size | n/a | ❌ | n/a | ❌ |
| The map's credit (OpenFreeMap/OpenStreetMap, Apple's Legal) stays above the sheet at every sheet height | ✅ | ✅ phone-size browser (it hid behind the sheet whenever the sheet was over half the screen); Android map page and Apple's label not seen | n/a | ❌ | n/a | ❌ |
| A gym's card stays open when the search moves on without that gym (Show gyms near me, another place, a filter); in a browser, a back capsule naming the page behind on every page, titles centred | ✅ | ✅ 4 unit tests (the back label) + driven in the browser at phone and desktop width, light and dark (the card had turned into a Filters panel that wouldn't close on desktop, and a blank sheet on a phone); hover and keyboard focus seen | n/a | ❌ iPhone keeps its own back button; the card change not yet tried on one | n/a | ❌ |
| Haptics | ✅ | ❌ | n/a | ❌ | n/a | ❌ |
| Motion: spring presses on every button, chip and card; Save and Compare pop; what's on a screen arrives with the screen (its push or its sheet), with no staggered rise piece by piece; "Search this area" grows in like an iOS popover; pins land with a spring and bubbles pop in and out as you zoom; notices, icons and folds fade; the segmented pill slides; saved rows glide out and collection cards slide when re-sorted; all off under Reduce Motion (the web and Android maps' pins too) | ✅ | ⚠️ driven in the browser (a gym's card, Home and the map at phone size; pill slides; fold opens; no errors); the springier phone versions never seen on a device | n/a | ❌ | n/a | ❌ |
| Sleeker motion: one set of springs tuned by damping ratio (moves glide in and stop, presses crisp, pops lively, glass a touch liquid) and a soft "expo out" for arrivals, clamped so a first frame can't dip; every row, chip and button's press highlight fades away instead of snapping (a drop-in `Pressable`); tabs cross-fade; in a browser pages rise into place and fade back up on Back; skeletons fade away under the content, and a gym's page fades in where its skeleton was; the card reveal, pins, celebrations, theme veil and slider use the shared springs; all off under Reduce Motion | ✅ | ✅ traced in the browser at 375 pt: tab fades both ways, a page's rise and its return, a row's highlight fading over 300 ms, every screen swept with no new console errors | n/a | ❌ unseen on a phone (iOS's own push slide is left as it is) | n/a | n/a |
| Screens arrive without popping up: a tab fades up as it lifts 8 pt into place, a browser page rises 14 pt, and a page you come back to comes up from 60%, all on a gentle start-then-glide curve (`EASE_SCREEN`) instead of the steep one that put a screen two-thirds of the way there on its first frame; in a browser the browser runs it (Web Animations), so a screen that's slow to draw the first time can't stall it, and nothing is left on the screen afterwards | ✅ | ✅ measured frame by frame in the browser at 390 pt: before, the first visible frame of a tab or page was already 61–71% opaque, and Profile's first fade was lost entirely to a 266 ms stall; after, every case starts at 0–4% and ramps smoothly (tab switches, Account opening and Back, Plates opening and closing, Build a workout and Back); a 1280-wide sheet closes back to the page with no dimming left | n/a | ❌ unseen on a phone (the phone's tab fade uses the same curve on the UI thread) | n/a | n/a |
| SF Pro to Apple's iOS text styles (system font on iPhone and Apple browsers; Inter, the closest free face, on Android and elsewhere) | ✅ | ⚠️ only Inter seen, in this sandbox's browser (no SF Pro installed); SF Pro itself never seen on an iPhone or Mac | n/a | ❌ | n/a | ❌ |
| Dark mode (Automatic, Light, Dark) for everyone; accent themes (Indigo free; with Pro, Cobalt, Ocean, Midnight, Lagoon, Grape, Fuchsia, Rose, Slate, Graphite, Rainbow and Camo, from a grid of swatches); switching crossfades and keeps your place; map, glass, tab bar, headers, status bar and the phone's own UI follow | ✅ | ✅ a unit test checks every text colour against WCAG AA in every mode and accent; seen in the browser (Home, Explore, gym page, Profile, Appearance, sign-in) in both modes; switching from the Appearance screen kept the screen and Back still went to Profile | n/a | ❌ Apple Maps' and Liquid Glass's dark look unseen | n/a | ❌ the accent gate is the app's (your own setting) |
| Pro looks that redraw the app: 8-bit (square corners, Press Start 2P headings, Pixelify Sans text, outlines with hard shadows), Classic (teal backdrop, grey bevels), Material (Roboto, rounder corners, accent-tinted surfaces), Neon (always dark, accent glow); solid plates instead of glass; Rainbow and Camo accents paint filled buttons, selected chips, the tab bar and Build a workout | ✅ | ✅ a unit test checks every text colour against WCAG AA in every look, mode and accent, and that each look sets its corners and fonts; seen in the browser (Appearance, Home, Explore, a gym page, Profile; Saved, Progress, Pro and the workout builder in 8-bit and Material) in light and dark | n/a | ❌ bevels, glows and hard shadows use `boxShadow`, never seen on a phone | n/a | ❌ the look gate is the app's (your own setting) |
| Liquid Glass percentage (Appearance, for everyone): 0% solid plates, 50% default, 100% clearest, in steps of 5; a live preview over a drawn map while you slide, applied when you let go; an iOS 26-style slider (the thumb swells into a glass lens that magnifies the track, stretches with speed, wobbles back; firmer ticks at 0, 50 and 100); drag, tap the track, − and +, arrow keys in a browser, adjustable for screen readers; only the glass redraws, so the screen keeps its place (and choosing an accent no longer scrolls Appearance to the top); greyed out in the solid looks | ✅ | ✅ unit tests for the levels, Android's floor, the saved choice and that a level change redraws only the glass; driven in the browser at 375 pt light and dark: drag, tap, keys, 0% and 100% on Home, Explore and the preview, Classic greyed out | n/a | ❌ unseen on a phone, including iOS 26's real Liquid Glass at each level | n/a | n/a |
| Sign in with Google and Apple: server checks the ID token (RS256 against the provider's keys, issuer, audience, expiry, nonce), makes the account the first time, never joins a password account on email alone; connect and disconnect from Account; a Google- or Apple-only account can set a password | ✅ | 🟡 11 server tests with locally made keys standing in for Google's and Apple's; the Google button seen in the browser with a placeholder client id; **never used with real Google or Apple accounts** (needs the owner's client ids; Apple needs a paid developer account) | ❌ | ❌ | n/a | ❌ |
| New sign-in sheet, Account screen and Settings-style Profile | ✅ | ✅ driven in the browser: wrong password shakes and explains, right one returns to Profile; account card, password form, light and dark | n/a | ❌ | n/a | ❌ |
| Profile picture: picked from your photos, cut to a centred square of 400 pixels, metadata removed on the server; on Account, Profile, the tab bar, Home and the map, only to you; change or remove it, and it goes with the account | ✅ | ✅ 2 server tests (sets, serves without GPS, replaces and deletes the old file, removes, goes with the account) + a crop test; driven in the browser: a square and a wide picture uploaded (400×400 JPEG kept, 12 KB), removed, light and dark | n/a | ❌ the phone's own crop and the image resizer never run on a phone (needs a new build) | n/a | ❌ |
| Pro extras with a free taste: interval timer (Tabata and EMOM free; your own work, rest and rounds, ten kept, with Pro), 1-rep max calculator (estimate and 90/80/70% free; full 100–50% table with plates and 2–12 rep maxes with Pro), streak freeze (Pro: one missed week a month; Free sees when one would have helped), Pro ring round your profile picture | ✅ | ✅ 3 timer tests, a rep-max test, 3 streak-freeze cases; driven in the browser as Free and Pro: timer ran, paused, the locked settings opened Pro, a Pro timer saved and kept after reload; 1-rep max for 100 kg × 5 (≈ 117.5 kg); Progress and Home with a missed week (Free 1 week plus a teaser, Pro 3 weeks and the covered week named); ring in Indigo and Rainbow | n/a | ❌ haptics and keep-awake never felt on a phone; no sound on a phone | n/a | ❌ |
| Mac launcher from any state (`curl … \| bash -s -- --xcode`), and auto-update while running | ✅ | 🟡 on Linux: an old checkout on another branch with an edit was stashed, switched and updated; a running copy picked up a new commit and restarted its server; the Xcode step with macOS tools stood in for writes the Node path Xcode needs. **Not yet run on a real Mac** | n/a | ❌ | n/a | ❌ |
| Training log: start a built or saved workout, tick sets (the set before's weight, else last time's numbers, as placeholders), rest timer, plates per side (lb and kg, drawn side on: the collar, then each plate to size; the bare bar and what will show before you type), records on finishing (heaviest, estimated 1RM, body-weight reps; only against earlier sessions), Progress (week streak, this week, records, history grouped by day with each session's start time, delete); in progress kept on the device; saved to the account (free), once even when sent twice (the answer lost on the gym's Wi-Fi, and Finish tapped again); lb in the US, kg elsewhere | ✅ | ✅ 25 unit tests (records, targets, plates, streak, days, parsing, an untyped set's weight) + 7 server tests (auth, own sessions only, validation, export, deleted with the account, sent twice) + driven in the browser: two sessions logged, the first answer to Finish dropped and Finish tapped again (one session logged), a reload mid-workout kept both sets, the second broke a record, Progress and plates checked, Free and Pro views | n/a (your own numbers) | ❌ | n/a | ❌ |
| Pro: a chart per exercise (estimated 1RM over time) and next-session targets by double progression | ✅ | ✅ unit tests + seen in the browser as Pro (chart, aim) and as Free (Pro hint, no aim) | n/a | ❌ | n/a | ❌ the gate is the app's (your own data, worked out on the device) |
| Gym collection: at a gym, "I'm here" takes one location fix and compares it with the gym's map point on the phone (within 150 m, allowing for the fix's accuracy; a fix rougher than 300 m says so rather than guessing); the gym joins your collection, and each later day you check in is a visit, moving its card from Bronze to Silver (3), Gold (10) and Platinum (25). A collection screen with gyms, cities, countries and visits, seven badges, and cards showing the gym's own logo or a member's photo, else "No photo supplied". Home nudges when your last known position is at a gym you haven't checked in at today (its page takes a fresh fix first), and shows a line for the collection; Profile has a Collection row. The position is never sent or kept; none for demo gyms; free | ✅ | ✅ 7 unit tests + collected in the browser with a stand-in position (4.4 km away refused, at the gym collected, a second check-in the same day not counted), the collection screen light and dark at iPhone sizes, the Home nudge | n/a | ❌ never checked in on a phone, indoors or out | n/a | ❌ |
| Gym collection on your account: signed in, the collection is kept on the account too (GET/PUT/DELETE /api/collection), each copy merged into the other so no visit is lost (days joined, the account's card seed kept so a card looks the same everywhere, a card from before seeds given one first); a check-in made offline is sent when the server's back (on the next check-in, sign-in, Try again, or the app coming back to the front); signed out it stays on the device, and signing in adds it; in the data download; deleted with the account. Where it's kept said at the top of the collection (synced, syncing, offline with Try again, or this device only with Sign in). **Delete all collection data** at the foot of the collection and in Account → Your data (a row with the card count): a warning naming how many cards and visits go, and where (device, account and other devices), then everything cleared; signed in and offline, nothing is reset; the account remembers the reset, so a device that was offline keeps only its visits from later days | ✅ | ✅ 5 domain tests (tidying, merging, visits after a reset) + 5 server tests (merging two devices, batches, reset and the 409 for a device that hasn't heard, export and account deletion) + 6 unit tests with a stand-in server (merge on sign-in, an offline check-in sent later, reset seen by an offline device, no reset offline, signed out, old seeds) + driven in the browser: a phone's gym and the account's gym merged on both sides, the synced line, the warning (signed in and out), reset emptying the account and the device; then with the button renamed and added to Account: a check-in on one browser shown on a second signed in as the same account, deleting from Account emptying both and the first then showing the empty collection, the server away refusing the delete, deleting from the collection's own button, and signed out clearing only the device | n/a | ❌ two real phones not tried | n/a | ❌ |
| Weekly goal (1 to 7 a week, kept on the device), the last 12 weeks as a calendar with the weeks you met it, and milestones (workouts, best weeks in a row, records broken, sets logged), all counted from your own log; free | ✅ | ✅ 7 unit tests + seen in the browser at iPhone sizes, light and dark, on a log of 18 workouts over 11 weeks | n/a | ❌ | n/a | ❌ |
| Share a finished workout: a few lines of text (what, how long, sets, weight lifted, records, each exercise's sets), through the phone's share sheet, or copied in a browser that has none; nothing about the gym, place or time of day | ✅ | ✅ 1 unit test + shared (copied) from the browser after finishing a workout | n/a | ❌ share sheet not seen on a phone | n/a | ❌ |
| Export your training log as CSV from Progress (a row a set, oldest first: date, time, workout, exercise, set, weight, unit, reps; blank weight for body weight); downloads in a browser, the share sheet on a phone; free | ✅ | ✅ 1 unit test + downloaded and read back in the browser (56 sets) | n/a | ❌ share sheet not seen on a phone | n/a | ❌ |
| Pro: muscle balance (sets per muscle over the last 4 weeks from GymGO's own exercise list, a helper muscle counting half; exercises it doesn't list are left out and counted as such; names the muscles you've missed) and warm-up sets on the plate calculator (the bar, then about 40, 60 and 80%, rounded down to what the plates make, with the plates); Free sees what each would show, linking to Pro | ✅ | ✅ 4 unit tests + seen in the browser as Pro (kg and lb) and as Free | n/a | ❌ | n/a | ❌ the gate is the app's, like the charts |
| GymGO Pro screen, plan in Profile, Free limits, workout library | ✅ | ✅ whole loop driven in the browser against a stand-in Stripe (checkout, return, manage, cancel) | ❌ real Stripe never used | ❌ the phone's in-app browser round trip not seen | n/a | ❌ |
| Workout library: Save shows a plan already saved (no second copy, and the server keeps one if the same plan for the same gym comes twice, from a double tap or an older app); Start on each saved workout; the empty Workout screen lists the latest four to start in one tap; two with the same title on the same day show their time | ✅ | ✅ 3 app tests + 1 server test + driven in the browser as the dev Pro account (saved, rebuilt the same plan and saw "Already in My workouts", shuffled and could save again; started one from Workout; the library hides Start while one is in progress), light and dark | n/a | ❌ | n/a | ❌ |
| A gym's pop-up on the map expands to its full page (⤢), and the page shrinks back onto the map with the gym open (⤡), also when the page was opened from a link; the pop-up's logo and buttons share a row so the name keeps its width | ✅ | ✅ driven in the browser at phone size (pop-up, full page, back to the map; a cold link too) | n/a | ❌ | n/a | ❌ |
| Collection cards with luck: each check-in day rolls a rarity (Common 60% to Legendary 1%; the card keeps its best), a random gem colour and 1 in 16 Foil, all from a seed made when the gym is first collected (older collections get a steady one from the gym and date); gem frames, shine, rainbow and sparkles around the gym's real logo or photo; a full-screen reveal for a new card or an upgrade; sort by newest, rarest or visits; the odds and "luck, not a rating" shown; three luck badges | ✅ | ✅ 6 app tests (odds edges, 40,000 rolls land on the stated odds, cards never get worse, seeds) + seen in the browser, light and dark: every rarity, Foil, a new pull and an upgrade from Common to Legendary as the dev account | n/a | ❌ animations never seen on a phone | n/a | ❌ |
| Friends, leaderboard and card screens; share a card or a finished set as a picture (react-native-view-shot and expo-sharing on phones; html2canvas then Web Share or a download in a browser) | ✅ | ✅ 2 app tests + every screen driven in the browser: a friend request accepted, a friend's cards, an invite sent, both boards, a card downloaded as a PNG and checked | n/a | ❌ the phone share sheet never seen | n/a | ❌ |
| Workout templates (beginner full body, 5×5, push/pull/legs) that take turns through their days from your log | ✅ | ✅ 2 app tests (every exercise exists, reps and rest make sense, the next day) + started from the browser, the progression aims showing | n/a | ❌ | n/a | ❌ |
| Record celebration: confetti (none with Reduce Motion), a record card shared as a picture | ✅ | ✅ 2 app tests (the set that broke it, which record leads) + a heavier bench set finished in the browser, the confetti and card seen and the card downloaded | n/a | ❌ the phone share sheet never seen | n/a | ❌ |
| Rest-over alert with the phone locked: a local notification scheduled for the end of the rest, moved and cancelled with it; foreground shows none | ✅ | ⚠️ 3 app tests (timing, wording, nothing in a browser); **never seen on a phone** (the sandbox has none); Live Activities not built (need a store build) | n/a | ❌ | n/a | ❌ |
| Training log as CSV: a real file for the phone's share sheet (was message text); Apple Health / Google Fit explained as needing a store build | ✅ | ⚠️ the download seen in the browser; the phone file never seen | n/a | ❌ | n/a | ❌ |
| Busy section, owner section (claim form, the owner's hours and price forms) and a Moderation screen with counts on Profile, one tap to approve and Reject-then-reason | ✅ | ✅ 4 app tests (the owner's forms) + every part driven in the browser; the location check before a busy report not seen on a phone | n/a | ❌ | n/a | ❌ |
| Collection sets: a suburb set (every listed gym in a suburb you've collected in, 2 to 15 gyms) and a city set (10 gyms, or all if fewer); progress with the gyms still to collect, a gold reward card with the day finished, a "set finished" moment at check-in, and two badges (Local hero, City collector) | ✅ | ✅ 7 unit tests (open and real gyms only, finished on the right day and only once, closed gyms you collected, the listed suburb wins over a stale one, city-sized "suburbs" left to the city set, city sets of fewer than ten); driven in the browser with the dev account: collected both Carlton gyms, saw the set finish at check-in and its reward card on Collection, light and dark | n/a | ❌ | n/a | ❌ |
| Phones: every full page keeps its last row clear of the home indicator or Android's navigation bar, with iPhone's automatic insets; every page (PageScroll) and tab (TabScreen) also measures where the phone really laid it out and adds anything below the screen to its bottom room, and the rest timer and the map's sheets are lifted by as much; Android: the sheets' shadow is a box shadow (elevation drew the sheet's background over its own list) and the tab bar sits above the navigation bar; the card reveal and collection cards fit narrow screens | ✅ | ⚠️ in the browser at 320×640, 360×740 and 390×844: pages, Home and the gym pop-up scroll to their last row; a page forced 90 px past the window got 122 px of bottom room instead of 32 | n/a | ❌ **not seen on a real iPhone or Android phone**: the reported problems were on phones, and none was available here | n/a | ❌ |
| Logos and photos from gyms' own websites: 229 more gyms' sites looked up by hand (108 in Australia, 121 in the US; address checked against the map; for a small chain's branch, its own page; cited as found by GymGO), a chain table (about 85 chains, per country) asked before `chainSites.ts` for branches without a site, leaving 497 of 2,995 real gyms with the plain symbol (778 before); 1,566 have a site of their own that no other gym shares, so can show its photo, and GET /api/gyms/:id/photo (the site's `og:image`, only from a site that is that gym's alone), shown on a gym's page and Home's cards when no member has shared a photo | ✅ | ✅ 5 domain tests + 5 server tests with a stand-in web (picks the shared picture, never a logo or vector; refuses shared and chain home-page sites; passes over a chain's stock picture on branch pages; serves the real image type) | ⚠️ the gyms' sites were never fetched from this sandbox (its network blocks them): the first real fetch is on the owner's computer | ❌ | n/a | ❌ |
| Renewal terms under the buy button ("Renews automatically at $19.99 a year, tax included, until you cancel", how to cancel, that Subscribe agrees to them), and the price on the button | ✅ | ✅ seen in the browser with payments switched on for that browser only | ❌ Stripe's receipt and renewal-reminder emails not turned on (owner's Stripe account) | ❌ | n/a | ❌ |
| Google content on request: a gym's Street View and Google photos wait for Show (or "Always show", also in Profile); nothing reaches Google before | ✅ | ✅ in the browser, no request to a Google address before the tap and two after | n/a | ❌ | n/a | ❌ |
| Time-zone self-check at start-up (Sydney both seasons, a New York summer, India's half-hour zone) | ✅ | ✅ unit tests | n/a | ❌ | n/a | ❌ |
| App icon (iOS light, dark and tinted; Android adaptive and themed), splash screen, favicon, the web site's icons | ✅ | ⚠️ made from the logo picture by `apps/mobile/scripts/brand-mark.mjs`; the favicons and the in-app badge seen in the browser, the icons never on a phone's home screen | n/a | ❌ | n/a | ❌ |
| Run from Xcode on a Mac (Simulator or your own iPhone, free Apple ID): `scripts/gymgo-mac.sh --xcode` makes the project with `expo prebuild`, fetches pods, writes the server address for release builds, opens Xcode; a debug build finds the server on the Mac it loaded its code from. For Xcode 27: the UIKit scene life cycle (expo-build-properties `enableSceneSupport`, without which an iOS 27 build stops at launch), and a patch to `expo` (`patches/`) so its app delegate names the real `INIntent` and `CKShareMetadata` (a build failed with "reference to type 'INIntent' broken by a context change") | ✅ | 🟡 project generation checked here (bundle id, team, local-network and location permissions, the build phase reading `.xcode.env.local`, the scene manifest and scene-ready AppDelegate), the flow run end to end with Xcode, CocoaPods and `open` stood in for, and the iOS bundle built (2,091 modules); the owner's Xcode build log was read to find the failure; **the fix is not yet built in real Xcode**: this sandbox has no Mac | n/a | ❌ | n/a | ❌ |
| Store builds (EAS / App Store / Play) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| PC browser layout (side panels) | ✅ | ✅ driven end to end at 1440 × 900 | n/a | n/a | ❌ | n/a |
| Tabs: Home, Explore, Saved, Profile (Instagram-style glass capsule, draggable lens) | ✅ | ⚠️ browser only: taps, and dragging with touch and with a mouse | n/a | ❌ Liquid Glass material and the drag never seen on a phone | n/a | ❌ |
| Home, simplified (four picks, workout, nearby, saved, recent, neighbourhoods and cities as chips) | ✅ | ✅ driven at phone size | n/a | ❌ | n/a | ❌ |
| Accessibility in the browser: every button and link named, text contrast, keyboard order, a focus ring in the accent colour that shows in dark mode and on filled buttons and isn't cut off by rounded cards; Escape closes a screen that opened as a sheet (a filled text field takes one press more) | ✅ | ✅ scanned 9 screens (0 unnamed controls), re-scanned after the area-search, icon and motion rounds, including a gym card on the map and a gym found by an area search (still 0); text colours checked at WCAG AA (fine print moved off the faint grey, which was 2.9:1); Tab order and focus rings checked on Home | n/a | ❌ VoiceOver / TalkBack never run | n/a | ❌ |
| Symbols instead of emoji on buttons, rows, chips and empty states (SF Symbols / Material Symbols / Phosphor) | ✅ | ⚠️ Material Symbols seen in the browser; SF Symbols only on an iPhone, never seen | n/a | ❌ | n/a | ❌ |
| Gyms' own website icons where there's no Commons logo (or their chain's, when branches share one site): card header, gym page, list tiles, credited to the site; any icon the site has (a big one first, else one down to 32 px), else Google's copy of the site's icon (its favicon service, for sites that have none or refuse automated visitors), a white mark on a clear background put on a dark square; 1,899 of 2,995 real gyms have a website (their own or their chain's) to take one from | ✅ | ✅ 18 server tests (stand-in web: fake images refused, a small icon taken when there's no big one, Google's copy for a site that refuses visitors, a white mark put on a dark square, one visit per site, chain sites never lent between independent affiliates, a down site retried after an hour) + guard checked live (localtest.me, lvh.me, 127.0.0.1.nip.io refused) + real icons seen in the browser (Doherty's, Absolute MMA, Anytime Fitness) | ✅ gyms' websites, fetched live by the server | ❌ | n/a | ❌ |
| Logos for gyms the map gives no website: about 50 chains' official sites written down by hand (Club Lime, Revo, Goodlife, Fitstop, F45, Plus Fitness, Fernwood, 9Round, Genesis, CorePlus, Conditn, 98 Gym, Bodyfit, 12RND…, some only in one country), and 168 Australian gyms' sites found by GymGO (23 by trying likely domains, the rest by searching the web for each gym without one in Melbourne, Sydney and Brisbane), every one read by hand against the gym's name and suburb and cited on the gym page as found by GymGO; Perth, Adelaide, Canberra, the Gold Coast and Hobart not yet searched | ✅ | ✅ 2 domain tests + 1 server test (a chain branch with no site of its own takes its chain's icon) + icons seen on gym pages in the browser (Club Lime, Goodlife, Revo, Summer Hill Gym); icons fetched live from this server for Derrimut 24:7 (32 px, Google's copy: its site refuses automated visitors), World Gym Australia (256 px) and Planet Fitness in Philadelphia, all three showing the symbol before; 212 Australian gyms still have no site anyone could confirm | ✅ the sites, fetched live | ❌ | n/a | ❌ |
| Brand logos (18 chains across the US, Australia and Europe, from Wikimedia Commons, bundled) on gym pages and cards, credited | ✅ | ✅ driven in the browser (Equinox, Gold's Gym, Snap Fitness); in both native bundles | ✅ fetched from Wikidata and Commons once, by script | ❌ | n/a | ❌ |
| Top of a gym page: members' photos, else Google's photos of the exact gym (owner's key; the listing must share a real word of the name, or be a gym within 40 m), else Street View; when Google can't be reached (a quick check first, shared by every embed), the box says Street View isn't available, with Try again, instead of a broken or blank frame | ✅ | ⚠️ Google's photos only with stubbed data; the unavailable box seen in this sandbox (no Google access), light and dark; the frame's path with the check answered by a stand-in; 2 unit tests for the check | ⚠️ Street View is Google's free embed; Places photos never called with a real key | ❌ | n/a | ❌ |
| Gym page (pushed screen, share/compare/save; Call and Website greyed out, and say why when tapped, if nothing's on record; past 50 km the distance names where it's from) | ✅ | ✅ driven in the browser | n/a | ❌ | n/a | ❌ |
| "When you call, ask" on a gym's page: up to four questions, one for each thing about a visit GymGO hasn't confirmed (still open, walk-in at your time, the price all in, booking, induction, a member signing you in, locals only), in the order it matters, with Call when there's a number; nothing it already knows, and none for demo gyms | ✅ | ✅ 2 unit tests + seen in the browser on researched and map-only gyms, light and dark | n/a | ❌ | n/a | ❌ |
| On iPhone, every page scrolls a box being typed in clear of the keyboard, and a tap on a button while typing works first time (`PageScroll`: a gym's notes and owner forms, Friends, Trips, Plates, 1-rep max, the timer, as well as the four pages that already did) | ✅ | ⚠️ type-checked and the pages seen unchanged in the browser; a browser has no iPhone keyboard to show it | n/a | ❌ not yet seen on the owner's iPhone | n/a | ❌ |
| Pro: your own notes on a gym ("Your notes" on its page, up to 500 characters, saved as you type), kept on this device only and never sent to the server; Free sees what it's for and a way to Pro; none on demo gyms | ✅ | ✅ typed, reloaded and read back in the browser as Pro; the Free fold and its Pro link seen | n/a | ❌ keyboard in the phone's sheet not seen | n/a | ❌ |
| Pro: your gym's plates on the plate calculator (tick the sizes it has, change plates included: 0.5 to 25 kg, 1.25 to 55 lb), used by the sums and the warm-ups, kept on this device per unit; Free keeps the usual set and sees how to change it | ✅ | ✅ 3 unit tests + picked in the browser as Pro (101 kg made exactly with 0.5 kg plates); Free ignores a stored set | n/a | ❌ | n/a | ❌ |
| Join this gym, on every gym's card and page: each membership the gym publishes (price and period, joining and card fees, minimum term, notice, the gym's own conditions, its source and when it was read), a fee not published said to be not published, and a button to the gym's own sign-up page (else its website, else its phone). GymGO takes no payment | ✅ | ✅ seen in the browser at phone size, light and dark: Next Level Fitness (A$11.95 a week, no joining fee), Doherty's, Fitness XO (A$215 a month) and an Anytime Fitness with nothing published | n/a | ❌ | n/a | ❌ |
| Membership and day-pass prices researched on 30 Sep 2026 for the curated Melbourne gyms, from each gym's own site only (read through a web search's copy of the page: the sandbox can't open the sites); three added (Next Level Fitness, Australian Strength Performance, Fitness XO), two disagreements with last week's direct reading left unchanged for a recheck (Doherty's, Carlton Fitness); see docs/research/prices-2026-09-30.md | ✅ | ⚠️ each figure seen in a search copy of the gym's own page, not on the live page | n/a | n/a | n/a | ❌ nobody has opened the live pages to confirm |
| Membership prices centred near the top of every gym's card: each tier the gym publishes side by side (price and period), a warning where its pages disagree, and a sign-up link; Join this gym below keeps the detail. Chain-wide tiers for every Revo Fitness, Zap Fitness (South Australia's own prices) and Derrimut 24:7 club, and Doherty's 12-month, 3-month and FIFO plans (marked as disagreeing with last week's direct reading); chains that price club by club get none | ✅ | ✅ 1 new unit test (Zap's SA and VIC prices, Revo's two levels, no Anytime Fitness priced) and every AU price cited to its chain's page; seen in the browser at 390 and 375, light and dark: Doherty's (4 options and the warning), Revo Altona North, Zap Linden Park, Next Level | n/a | ❌ | n/a | ❌ read from search copies of the chains' pages, not the live pages |
| AD PLACEHOLDER: a marked space for a future ad, on Home (under the gyms near you) and under Explore's list; nothing loads or tracks; Pro members never see it | ✅ | ✅ seen in the browser as Free; absent as Pro | n/a | ❌ | n/a | ❌ no ad partner chosen |
| Compare 2 gyms side by side, 4 with Pro (incl. a "Members paid" row; add from the map card's round compare button; the gym names stay pinned while you scroll when they all fit across, and a phone with more scrolls sideways) | ✅ | ✅ driven in the browser | n/a | ❌ | n/a | ❌ |
| Search this area: gyms from OpenStreetMap for wherever the map is, anywhere in the world, each with its own country (country-coder), time zone and address order, same rules as the bundled cities, kept a month per 11 km tile; the Overpass server that answered last is asked first | ✅ | ✅ 19 server tests (stand-in Overpass, incl. falling over to the next server, the last good one first, Auckland and Berlin addresses, the open sea, and today’s rules applied to kept gyms) + 4 unit tests + driven in the browser over Bendigo (7 gyms found live), Kyoto (68) and Kreuzberg (68, in km, no A$ budget) and Hobart; dense London live through the API: Hackney 22 gyms (54 s, waiting out two servers that don't answer from here), then Camden 13 in 14 s straight from the one that does (it had failed with a 504 before a busy server got a second try), desktop and phone layouts; the Android map page's area reporting checked in Chromium with a stand-in app bridge (reports the area above the sheet) | ✅ Overpass API, read live (a mirror from this sandbox; the main server refuses it) | ❌ | n/a | ❌ |
| Your country's gyms kept on the device: the server builds one file per country from OpenStreetMap (a state or region at a time, gyms and place names asked separately; bundled gyms left out; in Australia and the US a gym the map gives no state keeps the one it was found in; kept a month; six builds a day at most; served gzipped with an ETag), the app downloads your country's once (a file on a phone, Cache Storage in a browser) and answers "Search this area", "Near you" and finding a gym by name from it at once, offline too; the list changes only when you tap Search this area, never just because the map moved; Profile → Offline gyms shows it; another country's needs Pro | ✅ | ✅ 6 server tests (stand-in Overpass: one state at a time, bundled gyms left out, a gym with no state given the one it was found in, gzip and 304, plain JSON without gzip, Pro for another country, a bad code, a failed build retried after an hour) + 6 unit tests (reading a pack, an area nearest the middle first, too many to show, the sea and other countries left to the server, names, a whole-country view) + built live for Australia from the public Overpass servers (eight states in about a quarter of an hour, busy servers' 503s and 504s passed over): 762 gyms beyond the 1,351 bundled, 41 KB gzipped, 216 KB on the device + driven in the browser at phone size: Profile's row, the file in Cache Storage, then Bendigo, Ballarat and Geelong listed from it with no request to the server (a development build); with a stand-in pack, moving the map from Melbourne to Bendigo left the list on Melbourne and offered Search this area, the tap listed Bendigo's gyms with no request to the server, and moving on to Ballarat left Bendigo's list in place (the old version swapped the list on each move) | ✅ Overpass, read live | ❌ | n/a | ❌ |
| Gyms close together share one bubble with a count until you zoom in (all three maps; grouped on the world's pixels at a whole zoom, so panning never regroups; the picked gym never in a bubble; every gym on its own from street level; only what's on screen and half a screen round it drawn); a tap zooms to its gyms, or opens the best fit when they share one building; the browser and Android maps redraw only the pins that changed | ✅ | ✅ 7 unit tests (grouping, street level, the picked gym, panning, off screen, one building, 600 gyms to under 80 bubbles) + driven in the browser at phone and desktop sizes (Melbourne zoomed out to bubbles, a bubble tapped to zoom in, a pin picked) | n/a | ❌ Apple's map and the Android map page never seen on a phone | n/a | ❌ |
| Taps and drags reach the map in a browser at phone width: the layer holding the search bar covered the whole map and swallowed them (Reanimated writes an animated view's styles inline, losing the compiled rule that let touches through); every animated layer over something tappable now uses the pointerEvents prop | ✅ fixed | ✅ driven in the browser at 390 × 844 (pins tappable, map drags; they weren't before) | n/a | ❌ native was never affected by this bug, but not re-checked on a phone | n/a | ❌ |
| Opening outside the carried cities, anywhere, shows "Near you" on where you are and waits for Search this area: nothing is read from the map by itself. Until then the country and clock are the phone's own (its time zone, and the nearest big city on that clock, so a border town nearby doesn't count); a Free member abroad is told Pro covers it. Tapped, the server is asked for the whole map tiles around you (about 30 km across), never your position, and its answer corrects the country and clock; the list widens to 10 km only when that reaches a gym. Before a country is chosen, the nearest carried city | ✅ | ✅ unit tests of the phone's guess (Kehl beside Strasbourg, Kyoto, Uluru) and of what it says + driven in the browser: Bendigo at launch (no map request until the tap, then one, 6 gyms), a Free Australian in Kyoto (told Pro covers Japan, no request), and a phone set to Melbourne's clock in Kyoto (the tap finds Japan and shows what Pro adds) | ✅ Overpass, via the area search | ❌ | n/a | ❌ |
| A place GymGO carries no city for (the capital of a country you choose, a city picked on Home, a town typed in the search) never reads the map by itself: the lists say "GymGO has no gyms built in around Tokyo" with a Search this area button, and the map shows its own without being moved. Tapped: "Looking for gyms around Tokyo…", then the gyms; if the map service fails, says so with Try again (never retried on its own); when nothing is in range, says that instead of blaming the filters | ✅ | ✅ unit tests (when the button is offered, and its wording) + driven in the browser against local stand-ins for Overpass and the place finder (the real ones are blocked from this sandbox), counting the app's map requests: Japan on Home and Explore (none on opening or while panning, one per tap), Bendigo typed in the search (none until the tap, then 6 gyms), Sendai with the map service down then Try again, phone and desktop, light and dark | ✅ Overpass, via the area search (real servers not reached from here) | ❌ | n/a | ❌ |
| Every country's biggest cities (1,074 in 197 countries, up to twelve each, from GeoNames): Home lists your country's first (Japan: Yokohama, Osaka, Nagoya…), the search box suggests them as you type and Enter on an exact name goes straight there, no lookup; cities GymGO carries already keep their own chips | ✅ | ✅ 4 unit tests (biggest first, carried ones left out, your country first for "Hamilton", every city in a listed country on a real clock, none in demo mode) + driven in the browser: Japan's chips, Osaka read from the (stand-in) map, "kyo" → Kyoto, Enter on Sapporo, Toronto shown as Pro for a Free Japan account | ✅ GeoNames, once, by script | ❌ | n/a | ❌ |
| Gyms found by an area search kept on the device (newest 250): saved and recent ones still show, and open, with the server unreachable; a link to one fetches it first ("Finding this gym…") | ✅ | ✅ driven in the browser (opened online, then Home and the gym page with the server blocked; a made-up id ends at "Gym not found") | n/a | ❌ | n/a | ❌ |
| Signed in with the GymGO server out of reach: you stay signed in. Profile says it can't reach GymGO, with Try again (the app also retries every 20 s); Saved says the list is this device's copy; finishing a workout keeps it and says so; Progress, My workouts and member photos say they didn't load (dashes, not zeros; not "no photos yet"); no screen asks you to sign in. Pro's screen tells "couldn't ask" apart from "not on sale" and asks again when opened | ✅ | ✅ driven in the browser with the server blocked, then unblocked (Try again signs you back in; photos and Pro reload); "on sale" from a stand-in answer | n/a | ❌ | n/a | ❌ |
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
| `@gymgo/domain` unit tests | **167 passed** |
| `@gymgo/demo-data` unit tests | **23 passed** |
| `@gymgo/melbourne-data` unit tests | **11 passed** |
| `@gymgo/au-data` unit tests | **18 passed** |
| `@gymgo/usa-data` unit tests | **12 passed** |
| `@gymgo/eu-data` unit tests | **10 passed** |
| `@gymgo/osm` unit tests | **25 passed** |
| `@gymgo/server` tests (real HTTP, in-memory SQLite) | **225 passed** |
| `@gymgo/mobile` unit tests | **283 passed** |
| `@gymgo/web` unit tests | **39 passed** |
| `expo export` (iOS + Android) | Both compiled to Hermes bytecode |
| `expo-doctor` | 21/21 checks passed |
| `expo prebuild` (iOS + Android, on Linux) | Both generated. The iPhone asks only for location while in use, photos and the local network; Android for location, internet and vibration |
| Phone app in a browser (Chromium, 390 / 768 / 1280 wide) | Scripted by hand, not a suite in the repo: search, filters, save, compare, review, country, sign-in, training, keyboard use, Escape, offline server, location allowed / unanswered / abroad |
| Layout at iPhone sizes (Chromium at 375 × 667, 390 × 844, 402 × 874 and 430 × 932, with the Dynamic Island and home-bar safe areas emulated; also 768 and 1280 wide) | A script, not in the repo, measured every screen for anything past the window's edge, text cut by its box, cards off the 16-point gutter and content left under the tab bar; light and dark screenshots looked at. None past the edge or cut; long gym names wrap to two lines and can still end in "…" on the smallest phones. Never seen on a real iPhone |
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
- **Hosting.** `deploy/` puts the server, the web app and HTTPS on any Linux
  server with Docker, and README walks through Oracle Cloud's free tier. It
  was built and run here, but nothing is on a public server yet, so
  accounts, reviews and members' reports still live in one SQLite file on
  your computer. Off-server copies of the backups are by hand.
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
  servers. Gyms' website icons are fetched from the gyms' own sites, or
  from Google's favicon service when a site has none or blocks automated
  visitors (Planet Fitness and Derrimut do); that service is Google's, free
  and unofficial, and could change or stop.
- **Little email.** The server sends bug reports to the team and password
  reset links someone asked for, and only once the owner gives it an SMTP
  account (`GYMGO_SMTP_URL`; checked against stand-ins, never a real inbox).
  Sign-up sends nothing, so email addresses aren't verified. There's no
  two-step sign-in.
- **Google's extras and Stripe** are built but have never been used with the
  owner's real keys, so Google's photos of the exact gym have been matched
  only against a stand-in for Google.
- **Pro can't be bought yet.** Gyms outside your country are part of Pro,
  and Pro is on sale only once the owner connects Stripe, so until then
  nobody can search other countries (they can switch their own country in
  Profile). The rule is checked by the server for live area searches; the
  built-in cities ship inside the app, so for those it's the app's word.
- **Prices where money is unsettled.** Budgets and members' visit-price
  reports work in every country's own currency, with the typo check sized
  by a rough, hand-set scale per currency (about what a US dollar is there,
  rounded; `packages/domain/src/currencies.ts`). It never converts a price,
  but a currency that loses a lot of value would need its scale raised. Where
  the rate is too unsettled for any scale (Iran, Lebanon, Venezuela and a
  few more), prices stay unknown. The gym-name rules are English-first, so a
  hotel or kids' gym named in another language can slip through.
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
6. **Legal review** of the Terms of Service, Privacy Policy, Refunds and
   Community Guidelines (`packages/domain/src/legal.ts`). They're written to
   match what the software does, but no lawyer has read them, and who runs
   GymGO (`GYMGO_LEGAL_*`) isn't set.
