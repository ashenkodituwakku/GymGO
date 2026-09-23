# GymGO

**Find a gym that fits your workout, budget and visit time.**

## Run the app on your phone

GymGO is an iPhone and Android app. You run it from your computer and open it
on your phone with **Expo Go**, a free app from Expo. You don't need a Mac,
Xcode, an Apple developer account or an app store listing.

**On your phone:** install **Expo Go** from the App Store or Google Play, and
join the same Wi-Fi as your computer.

### On Windows

Open **PowerShell** (Start menu → type *PowerShell*). Then:

**1. Install Node.js and Git** (skip if you have them):

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

A QR code appears in PowerShell. The first start takes a minute or two.

**5. Open it on your phone.** On an **iPhone**, point the **Camera** app at the
QR code and tap the banner. On **Android**, open **Expo Go** and tap
*Scan QR code*. GymGO opens on the phone.

If Windows asks whether Node.js may use the network, choose **Allow**. Without
that, the phone can't reach your computer.

**Phone won't connect?** Press **Ctrl+C**, then run this, which works across
different networks. It's slower, and Expo may ask to install a small helper.
Type `Y`.

```powershell
& "$HOME\GymGO\scripts\gymgo.ps1" -Tunnel
```

Save a file on the computer and the app reloads on the phone. Press
**Ctrl+C** in PowerShell to stop.

**Optional: start it from anywhere by typing `gymgo`.** Run this once, then open
a new PowerShell window:

```powershell
if (!(Test-Path $PROFILE)) { New-Item -ItemType File -Path $PROFILE -Force | Out-Null }
Add-Content $PROFILE "`nfunction gymgo { & `"$HOME\GymGO\scripts\gymgo.ps1`" @args }"
```

Then `gymgo` starts the app, `gymgo -Tunnel` uses the tunnel, and
`gymgo -Update` pulls the latest version first.

### On a Mac or Linux

```bash
git clone -b claude/friendly-johnson-9rzxrj https://github.com/ashenkodituwakku/GymGO.git ~/GymGO
cd ~/GymGO
npx pnpm@10 install
npx pnpm@10 app          # or: npx pnpm@10 app --tunnel
```

Scan the QR code as above.

### The older website

The first version of GymGO was a website, and it's still in the repository.
To run it, start the launcher with `-Web` (or run `pnpm dev`), then open
**http://localhost:3000**. New work goes into the phone app.

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

pnpm app          # phone app: prints a QR code for Expo Go
pnpm dev          # website: http://localhost:3000
pnpm build        # website production build
pnpm start        # serve the website production build

pnpm verify       # typecheck + lint + unit tests, every package (199 tests)
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
packages/demo-data/  17 fictional demo gyms covering the edge cases, and the
                     pilot suburbs the search box understands.
apps/mobile/         The iOS and Android app (Expo, React Native).
  src/app/           The one screen: a map with sheets over it.
  src/components/    Map, pins, sheets, place card, filters.
  src/lib/           The app's voice (copy.ts), theme, filter state.
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

In short: the phone app is built, typechecked, unit-tested, and its iOS and
Android bundles compile. Its interface has been checked in a browser preview
only; it has **not** been run on a real phone or simulator yet. The website
pilot works locally and is tested locally. Nothing is deployed and nothing has
been submitted to an app store. No real gym data has been collected, no gym has
been contacted, and no customer research has been done — the whole product
thesis is still a hypothesis.

## Demo data

The 17 gyms in `packages/demo-data/` are invented. None of the names,
addresses, prices, hours, equipment or reviews describe a real business. Every
record is flagged `isDemoData`, the interface says so on every page, and
production ingestion refuses records carrying the flag.
