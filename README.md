# GymGO

**Find a gym that fits your workout, budget and visit time.**

## Start GymGO

GymGO is an app for iPhone, Android and your PC's browser. One command
starts it on your computer. It opens in your browser, and you can open it on
your phone with **Expo Go**, a free app. It also starts a small server
on your computer that keeps accounts, saved gyms and reviews in a database
file. Everything is free: no Mac, no Xcode, no sign-ups, no API keys.

### On Windows

Open **PowerShell** (Start menu → type *PowerShell*). Then:

**1. Install Node.js and Git** (skip if you have them; GymGO needs Node 22.13 or newer):

```powershell
winget install OpenJS.NodeJS.LTS Git.Git
```

Close PowerShell and open a new window.

**2. Allow scripts to run** (once per computer; type `Y` if asked):

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

**3. Download GymGO:**

```powershell
git clone -b claude/friendly-johnson-9rzxrj https://github.com/ashenkodituwakku/GymGO.git "$HOME\GymGO"
```

**4. Start it:**

```powershell
& "$HOME\GymGO\scripts\gymgo.ps1"
```

The first start takes a minute or two. Then:

- **On your PC:** the app opens in your browser at **http://localhost:8081**.
  If it doesn't, open that address yourself.
- **On your phone:** install **Expo Go** from the App Store or Google Play,
  and join the same Wi-Fi as your PC. Then scan the QR code in PowerShell:
  on an **iPhone** with the **Camera** app, on **Android** from inside
  **Expo Go**.

If Windows asks whether Node.js may use the network, choose **Allow**.
Without that, your phone can't reach your PC.

Press **Ctrl+C** in PowerShell to stop everything.

**Phone won't connect?** Stop with **Ctrl+C** and run:

```powershell
& "$HOME\GymGO\scripts\gymgo.ps1" -Tunnel
```

This works even when the phone is on a different network, but it's slower.
In this mode the phone shows the gyms from the app's built-in copy. Signing
in and reviews on the phone need the same Wi-Fi as the PC.

**Optional: start it from anywhere by typing `gymgo`.** Run this once, then open
a new PowerShell window:

```powershell
if (!(Test-Path $PROFILE)) { New-Item -ItemType File -Path $PROFILE -Force | Out-Null }
Add-Content $PROFILE "`nfunction gymgo { & `"$HOME\GymGO\scripts\gymgo.ps1`" @args }"
```

After that you can run:

- `gymgo` to start everything;
- `gymgo -Update` to get the latest version first;
- `gymgo -Tunnel` when the phone isn't on the same Wi-Fi;
- `gymgo -NoBrowser` to start without opening a browser window.

### On a Mac or Linux

```bash
git clone -b claude/friendly-johnson-9rzxrj https://github.com/ashenkodituwakku/GymGO.git ~/GymGO
cd ~/GymGO
npx pnpm@10 install
npx pnpm@10 app          # add --tunnel if the phone can't connect
```

### What's in the app

Four tabs along the bottom, icons only, the way Instagram does it on iOS 26:
a floating Liquid Glass capsule above the home indicator, the tab you're on
filled in (your initial for Profile once you're signed in), and a glass lens
behind it that springs to the tab you tap. Drag the lens along the bar to
switch tabs; it swells under your finger. It's the same bar everywhere: on
iOS 26 it's made of Apple's own Liquid Glass material, on older iPhones and
Android the closest blur, and in a browser a glass with real refraction in
Chrome and Edge (blur only in Safari and Firefox).

- **Home**: kept short. A greeting, the search, four one-tap picks (Near
  me, Early start, After work, Under $25), **Build a workout**, gyms near
  you, your saved and recently viewed gyms, then neighbourhoods and other
  cities as chips.
- **Explore**: the map with the results sheet, filters, and sorting (best
  match, closest, cheapest, top rated). "Best match" means: gyms that meet
  everything you asked first, then, among the rest, the ones with the fewest
  things you'd need to call about, then the nearest.
- **Saved**: your saved gyms. Tick two or three to **compare** them side by
  side: answer, price, guest entry, what to bring, machines, rating and
  distance.
- **Profile**: sign in, your gyms, moderation (for moderators), a haptics
  switch, and where GymGO's facts come from.

Tap any gym to open its own page, with share, compare and save at the top.
It opens with the gym's logo (for the chains that have a free one, below)
and its photos. On an iPhone, press and hold a gym card on Home for a preview
and a quick menu.

Buttons and rows use proper symbols rather than emoji: Apple's SF Symbols on
iPhone, Google's Material Symbols on Android and in the browser, and
Phosphor's two-tone icons in the tab bar and section headings. So a phone
button shows a handset, directions an arrow sign, and so on, drawn the way
the rest of the phone draws them.

### Where you are

GymGO opens where you are. The first time, it asks for your location once;
after that it uses it only if you allowed it. It asks for your **precise**
position (full GPS accuracy, not rounded), so distances and the blue "you
are here" dot are right. The position stays on your device, in memory, for
the search: it is never saved, and never sent to the GymGO server or anyone
else. If you've only allowed approximate location (iPhone's "Precise: Off",
or Android's "Approximate"), GymGO says so, because distances will be off.

If you're outside every city GymGO covers, it takes you to the nearest one
and tells you how far away that is.

### Emails, classes and facilities (free)

Some gyms' OpenStreetMap entries also list an email address, sports or
classes (yoga, swimming, boxing…) and facilities (pool, sauna, showers,
step-free entrance). Where they do, the gym's card shows them under
**Facilities & more**, labelled as mapped by volunteers. Anything not listed
is unknown, never a no. So far that's 35 emails, 59 gyms with classes and
31 with facilities, all in the US data.

### Cities

- **Melbourne**: 23 researched gyms, with prices and hours from each gym's
  own website where it publishes them, plus 40 more from OpenStreetMap
  (map-only, like the cities below). The map's copies of the researched 23
  are left out, so none shows twice.
- **7 more Australian cities**: Sydney, Brisbane, Perth, Adelaide, Canberra,
  the Gold Coast and Hobart, with 229 real gyms between them. Like the US
  cities below, these are **map-only**, from OpenStreetMap: no prices, guest
  hours or machine lists yet, so every one says **Call first**. Distances are
  in kilometres and money in A$.
- **15 US cities**: New York, Los Angeles, Chicago, Houston, Miami, San
  Francisco, Seattle, Boston, Austin, Denver, Las Vegas, Washington DC,
  Atlanta, San Diego and Philadelphia, with 477 real gyms between them. These
  are **map-only**: names, addresses, phone numbers, websites and sometimes
  opening hours, from OpenStreetMap. There are no prices, guest hours or
  machine lists yet, so every one says **Call first**. Distances are in
  miles and money in dollars there.
- **Demo mode** (Profile → Preferences, off to start): invented gyms in inner
  Sydney that show every case GymGO handles, from "Good to go" to "Not a
  fit". Turning it on hides every real gym, and turning it off hides every
  invented one, so the two never share a map: the demo gyms sit on the same
  streets as real Sydney ones.

Search a city ("Brisbane", "New York", "NYC", "Philly"), a suburb or
neighborhood ("Fortitude Valley", "SoHo", "Capitol Hill, Seattle") or a
Melbourne suburb or postcode. Visit times are
always on the searched city's clock.

### Build a workout

Tap **Build a workout** on Home, or **Build a workout here** on any gym.
Tap the muscles you want to train on the body (front and back; there's also
a plain list), or pick Push, Pull, Legs, Core or Full body. Choose a goal
(strength, muscle, endurance) and a length (4, 6 or 8 exercises), and GymGO
builds a session: compound lifts first, sets × reps, rest, and a tip for
each. **Shuffle** for another version, **Share** to send it.

From a gym's page it uses only the machines that gym publishes or that its
members have reported, and marks each exercise ✓ where the kit is
confirmed. Most gyms haven't published their machines, so for those it
offers a **typical gym** plan instead and marks anything not confirmed with
"?". It never claims a gym has a machine it hasn't been told about.

### Accounts

Tap the person icon next to the search box to create an account. Your saved
gyms then follow you between your PC and your phone, and you can write
reviews. Accounts live only in `apps/server/data/gymgo.db` on your
computer. Passwords are stored hashed, and no emails are sent.

Reviews wait for a moderator before they appear. To make your own account a
moderator, run this in the GymGO folder:

```powershell
npx pnpm@10 --filter @gymgo/server make-moderator you@example.com
```

Then open your account in the app to see the reviews and photos waiting for a
decision.

### Gym photos

GymGO only shows gym photos that its own members took and chose to share. It
never copies them from gym websites (they're copyrighted) and never shows a
stand-in picture of some other gym.

The top of a gym's page shows, in this order:

1. **Members' photos**, each with the member's name on it.
2. If there are none, and the owner has set up the optional Google key
   (below), **Google's photos** of the place, each credited to whoever took
   it, with "Google Maps" underneath.
3. Otherwise **Google Street View** outside the gym, labelled as such (it
   may not face the door). This is Google's free public embed.

It always says when no member has shared a photo yet, and an invented demo
gym says **No photo supplied yet**.

To add one, open a gym, tap **+ Add a photo**, and pick a picture you took
there. You're asked to confirm you took it and are happy for it to show with
your name. The server removes the photo's hidden details (including where it
was taken) before saving it, and it stays hidden until a moderator publishes
it. A photo the moderator turns down is deleted. Photos live in `apps/server/data/photos/` on your computer.

### Gym logos

Eight chains have a logo that is free to reuse, found through Wikidata (the
brand's "logo image") and hosted on Wikimedia Commons: 24 Hour Fitness,
CrossFit, Equinox, Fitness First, Gold's Gym, LA Fitness, Life Time and Snap
Fitness. Each shows at the top of that chain's gym pages, and on its cards
when no member has shared a photo. Seven are public domain as simple text or
shapes; Gold's Gym's is CC BY 4.0, credited to Gold's Gym. Every gym page
with a logo credits it and says GymGO isn't connected to or endorsed by the
brand. A logo is still its owner's trademark: GymGO uses it only to say
which gym this is.

Other chains (Planet Fitness, Orangetheory, Anytime Fitness and so on) have
no free logo on Commons. Their logos are copyrighted, so GymGO doesn't copy
them from their websites; their cards show a plain symbol instead.

The logos are copied into the app (`apps/mobile/assets/logos/`), so the app
never fetches them from Wikimedia. To look for new ones after the gym data
changes, run `node apps/mobile/scripts/brand-logos.mjs`. It keeps only logos
under a licence GymGO can use, and goes slowly because Wikimedia limits busy
networks.

### What machines a gym has

Gyms hardly ever publish their equipment. Their websites say "free weights"
and "cardio", and Google has no equipment list either. So GymGO shows two
things, kept apart:

- **What the gym publishes**, with a link to the page it came from.
- **What members say**: anyone signed in can open a gym's **Equipment**
  section, tap **Trained here? Tick what they have**, and mark each machine
  **Yes** or **No** (thumbs up or down), plus the heaviest dumbbells if they
  know. The card then shows a tally, such as "Squat rack, 3 thumbs up", with
  how many members reported and when. You can change your report any time. Members' reports are labelled
  as theirs and never make a gym "Good to go" on their own.

### Google info (free, nothing to set up)

Each gym has a **See it on Google** button. It opens a full-screen page with
**Google's own map and card for the gym**: its name, address, star rating
and number of reviews, straight from Google. Tap the ↗ on Google's card, or
**Open in Google Maps**, to see every photo and review in Google Maps
itself. Under that is Google's **Street View** nearest the gym, so you can
see the building. Both use Google's public embed, so they're free, with no
key, no account and no limit.

Why not pull Google's photos and reviews into GymGO's own pages? Google's
terms don't allow copying or storing them, and scraping them breaks those
terms. The reviews and photos also belong to the people who posted them.
Showing Google's own embed and linking to Google is the free way to do it
properly.

If GymGO ever becomes a business, Google asks for its official Maps Embed
API instead of the public embed. That's also free and unlimited, but it
needs a Google Cloud account with billing set up.

#### Optional extra: Google's photos, reviews and details on every gym

With your own Google Places API key, each gym's own page gets Google's
photos at the top (when no member has shared one) and a **From Google Maps**
section, and the Google page shows the same under the map:
Google's photos (up to six) with each photographer credited, its rating and
latest reviews, whether it's open now and its opening hours, phone number,
website, Google's one-line description, and what Google knows about
accessibility, parking and payment. It's labelled as Google's, isn't saved,
and never changes GymGO's own answer. Google doesn't hold email addresses,
so there are none from Google. And there's no free way to get this data out
of Google: copying it from Google Maps pages breaks Google's terms, so GymGO
uses Google's own API or its free embed, nothing else. **This part is not free.**
It needs a Google Cloud account with billing turned on. Google gives a free
allowance each month and then charges. At the time of writing that was about
1,000 place lookups and 1,000 photos a month for the kind GymGO uses, so
roughly 250 page opens a month are free (one lookup and up to four photos
each). Check Google's current pricing first, and set a daily limit on the
API in Google Cloud so it can never cost more than you've decided.

Even then, GymGO never saves what Google sends (only Google's ID for each
gym, which Google allows), credits Google and every photo and review author,
and doesn't let Google's hours change its own answers. To switch it on, in
Google Cloud create a project, turn on billing, enable **Places API (New)**,
create an API key restricted to that API, then start GymGO with it:

```powershell
$env:GOOGLE_PLACES_API_KEY = "your-key-here"
gymgo
```

On a Mac or Linux: `GOOGLE_PLACES_API_KEY=your-key-here npx pnpm@10 app`.
The key stays on your computer; the app never sees it.

### GymGO Pro (subscriptions, through Stripe)

GymGO has two plans. **Free** is everything that tells you the truth about a
gym: every gym and city, the answer for your visit and why, the source behind
every fact, prices and hours where published, reviews, photos, members'
machine reports and the workout builder. That is never behind Pro.

**Pro** is for keeping more:

| | Free | Pro |
|---|---|---|
| Saved gyms | Up to 10 | Unlimited |
| Compare side by side | 2 gyms | 4 gyms |
| Workout library | Build and share | Save workouts to your account, reopen them on any device |

One tier, two ways to pay, tax included:

| | Australia | United States |
|---|---|---|
| Monthly | A$3.99 | US$2.99 |
| Yearly | A$29.99 (save 37%) | US$19.99 (save 44%) |

The prices live in `packages/domain/src/plans.ts`; change them there and run the setup below
again. Existing subscribers keep the price they signed up at.

People pay on **Stripe's own checkout page**, so GymGO never sees a card.
They manage or cancel on Stripe's page too (Profile → Manage subscription),
and keep Pro to the end of what they paid for. If Pro ends, nothing they
saved is deleted; they just can't add more than Free allows. Deleting an
account cancels its subscription first.

**Until you connect Stripe, Pro isn't on sale**: the Pro screen shows the
planned prices and says "Not on sale yet". To connect it (test mode, no real
money):

1. Make a free account at stripe.com. Stay in **Test mode**, go to
   Developers → API keys and copy the **Secret key** (it starts `sk_test_`).
2. Copy `apps/server/.env.example` to `apps/server/.env.local` and put the
   key after `STRIPE_SECRET_KEY=`. That file is git-ignored; the key stays on
   your computer and the app never sees it.
3. Create GymGO Pro in your Stripe account (the product, its four prices and
   the manage-subscription page). This charges nobody:

   ```bash
   npx pnpm@10 --filter @gymgo/server stripe:setup
   ```

4. Start GymGO as usual. The server says `GymGO Pro payments (Stripe): on,
   test mode`. Sign in, open Profile → GymGO Pro, pick a plan, and pay with
   Stripe's test card **4242 4242 4242 4242**, any future date, any CVC.

**Webhooks** (recommended): they tell GymGO about renewals, failed payments
and cancellations as they happen. Without them Pro still turns on straight
after checkout, and the app re-checks with Stripe now and then. On your
computer, install the Stripe CLI and run
`stripe listen --forward-to localhost:4000/api/billing/webhook`, then put the
`whsec_…` it prints after `STRIPE_WEBHOOK_SECRET=`.

**Taking real money** needs more than a live key, and none of it is done:

- The server has to be hosted on a public `https://` address, with a webhook
  endpoint added in Stripe for `checkout.session.completed` and
  `customer.subscription.*`. Nothing is deployed.
- Terms of service, a privacy policy and a refund policy, linked from the Pro
  screen and Stripe's settings.
- Tax: in Australia, registering for GST once turnover reaches A$75,000; in
  the US, sales tax on subscriptions varies by state. Stripe Tax can work it
  out. Prices are set tax-inclusive so what's shown is what's paid.
- **App stores.** Apple and Google have their own rules for selling
  subscriptions inside an app, and they differ by country and change often.
  As of writing, Apple requires its own in-app purchase for digital
  subscriptions except where a country's rules allow links to outside
  payment (the US storefront allows it); Google Play has similar rules with
  its own exceptions. Check both stores' current policies before submitting.
  So a store build hides the buy button unless `EXPO_PUBLIC_NATIVE_CHECKOUT=on`
  is set on purpose; in Expo Go and the browser it's always there.

The setup refuses a live key (`sk_live_…`) unless you add `--live`.

### The older website

The first version of GymGO was a Next.js website, and it's still in the
repository. Start it with `gymgo -OldWebsite` (or `pnpm dev`) and open
**http://localhost:3000**. New work goes into the app.

---

A gym discovery and comparison pilot for inner Sydney. It answers three
questions that a map pin and an "open now" badge do not: does this gym have the
equipment I need, what will the visit actually cost, and can a visitor get in at
the hour I want to train?

The organising principle is that **"unknown" is a real answer**. A blank field is
never a no, a missing fee is never A$0, and a fact past its recheck target stops
counting as confirmed. Every result is one of three things, and the difference is
always visible:

| Tier | Meaning |
|---|---|
| **Confirmed match** | Every stated requirement is met by evidence we checked recently. |
| **Needs confirmation** | Could work, but something is unknown, stale or conditional. |
| **Does not match** | A stated requirement is contradicted by what we know. |

## Running it

Requires Node 20.9+ and pnpm. Nothing here needs an API key, a credential, or a
paid service.

```bash
pnpm install

pnpm app          # server + app: opens the browser, QR code for Expo Go
pnpm server       # just the server (http://localhost:4000)
pnpm dev          # website: http://localhost:3000
pnpm build        # website production build
pnpm start        # serve the website production build

pnpm verify       # typecheck + lint + unit tests, every package
pnpm test         # unit tests only
pnpm test:e2e     # website: fresh build + Playwright at 3 viewports
```

Start here: [`/search?q=Surry+Hills&budget=30&date=2026-09-23&time=19:00&eq=squat_rack&eq=cable_station&eq=dumbbells&db=40&r=5`](http://localhost:3000/search?q=Surry+Hills&budget=30&date=2026-09-23&time=19:00&eq=squat_rack&eq=cable_station&eq=dumbbells&db=40&r=5)
— the reference task: a gym near Surry Hills with a squat rack, cable station
and dumbbells to at least 40 kg, admitting a visitor at 7pm for under A$30.

### Signing in

The local development adapter has no passwords: it exists so the permission
rules can be exercised. Go to `/account` and pick an account.

| Account | What it can do |
|---|---|
| Sam (member) | Review, suggest corrections, claim a gym |
| Jo (gym operator) | Starts with nothing; must claim a branch and be approved |
| Ali (moderator) | Decide corrections and reviews. Cannot see ownership evidence |
| Robin (administrator) | Decide ownership claims and see their evidence |

It is refused in a production build unless two separate environment variables
are set deliberately, and when they are, every page carries a warning banner.

### Configuration

Everything is optional; see `apps/web/.env.example`. Without any of it the app
runs with honest "not configured" states rather than fake successes.

| Variable | Effect |
|---|---|
| `GYMGO_DATA_SOURCE` | `demo` (default outside production) or `none` |
| `GYMGO_AUTH_ADAPTER` | `local-dev` or `disabled` (default in production) |
| `NEXT_PUBLIC_MAP_STYLE_URL` | A MapLibre style document; without it the map says so |
| `NEXT_PUBLIC_MAP_TILE_URL` + `NEXT_PUBLIC_MAP_ATTRIBUTION` | A raster basemap. Attribution is required, not optional |
| `NEXT_DIST_DIR` | Build output directory, so a build does not clobber a running dev server |

## Layout

```
packages/domain/     Framework-free rules. No React, no Next, no I/O.
                     The phone and the website run the same search from
                     here, so a pin's colour and a row's verdict can't drift.
packages/melbourne-data/  23 real inner-Melbourne gyms, every fact linked to
                     where it was read (gym websites, OpenStreetMap).
packages/usa-data/   477 real gyms in 15 US cities, map-only, from
                     OpenStreetMap. scripts/generate.py rebuilds it.
packages/demo-data/  17 fictional Sydney gyms covering the edge cases.
apps/server/         The API: accounts, saved gyms, reviews, moderation, on
                     Node's built-in SQLite. Free, local, no external services.
apps/mobile/         The iOS and Android app (Expo, React Native).
  src/app/           Tabs (Home, Explore, Saved, Profile), gym page,
                     Compare and Workout.
  src/components/    Map, pins, sheets, place card, filters, body picker.
  src/lib/           The app's voice (copy.ts), theme, filter state,
                     cities (places.ts), location, workout generator.
apps/web/            The earlier Next.js website pilot.
  src/app/           Pages and the /api/v1 server API.
  src/server/        Config, persistence, repositories, auth, moderation.
  e2e/               Playwright specs at 390 / 768 / 1440 px.
docs/                Architecture, data model, API, status, launch checklist.
```

## What is and is not done

`docs/STATUS.md` separates *implemented locally*, *tested locally*,
*externally integrated*, *native-tested*, *deployed* and *store-approved*, and
does not collapse them into "production ready". Read it before quoting any of
this as finished.

In short: the app runs on your PC in the browser, with a real local server
and database behind it. Its iOS and Android bundles compile, but it has
**not** been run on a real phone or simulator yet. The Melbourne gyms are
real, with sources; most of their details are unknown because the gyms don't
publish them. The US gyms are real but map-only, and nobody has checked that
each one is still trading. Nothing is deployed, and nothing has been submitted to an app
store. No real gym data has been collected, no gym has
been contacted, and no customer research has been done — the whole product
thesis is still a hypothesis.

## Real data, and what "unknown" means

The 23 Melbourne gyms are real. Names and map positions come from
OpenStreetMap (© OpenStreetMap contributors, ODbL). Prices, hours and
equipment come only from each gym's own website, read on 23 September 2026,
and every fact in the app links to the page it came from. What a gym doesn't
publish is shown as unknown, not guessed. That is why most of them show
**Call first** 📞: for example, no gym states whether a first-time visitor needs
an induction, so none can honestly be a sure thing yet. Nothing here was
supplied by or agreed with the gyms, and none of them has been contacted.

Prices and hours count as current for 30 days after they were checked. After
that the app flags them as due for a recheck.

The 477 US gyms are real places on OpenStreetMap, fetched on 24 September
2026 (© OpenStreetMap contributors, ODbL). The script keeps gyms and fitness
studios you can walk into and drops what the map marks private, gyms inside
hotels, apartment blocks, offices and campuses, generic "Fitness Center"
rooms, and yoga, pilates, barre, cycling, dance and climbing studios. It then
keeps the 40 nearest each city centre. Everything from the map is labelled
community-reported, not checked. Opening hours are used only when they're
mapped in a simple form, and count as member hours, never guest hours. No
US gym is called open for business on the map's word alone.

## Demo data

The 17 Sydney gyms in `packages/demo-data/` are invented. In the phone app,
turn on **Demo mode** in Profile to see them (the older website shows them
when you search a Sydney suburb such as Surry Hills). None of the names,
addresses, prices, hours, equipment or reviews describe a real business. Every
record is flagged `isDemoData`, the interface says so on every page, and
production ingestion refuses records carrying the flag.
