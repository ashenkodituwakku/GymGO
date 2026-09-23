# GymGO

**Find a gym that fits your workout, budget and visit time.**

## Start it on your computer

### Windows

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

Your browser opens **http://localhost:3000** by itself. The first start takes a
minute or two. Press **Ctrl+C** to stop.

**Optional: start it from anywhere by typing `gymgo`.** Run this once, then open
a new PowerShell window:

```powershell
if (!(Test-Path $PROFILE)) { New-Item -ItemType File -Path $PROFILE -Force | Out-Null }
Add-Content $PROFILE "`nfunction gymgo { & `"$HOME\GymGO\scripts\gymgo.ps1`" @args }"
```

`gymgo -Update` pulls the latest version before starting.

### Mac or Linux

```bash
git clone -b claude/friendly-johnson-9rzxrj https://github.com/ashenkodituwakku/GymGO.git ~/GymGO
cd ~/GymGO
npx pnpm@10 install
npx pnpm@10 dev
```

Then open **http://localhost:3000**. Press **Ctrl+C** to stop.

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

pnpm dev          # http://localhost:3000
pnpm build        # production build
pnpm start        # serve the production build

pnpm verify       # typecheck + lint + unit tests (174 tests)
pnpm test         # unit tests only
pnpm test:e2e     # Playwright, 3 viewports (needs a build first)
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
packages/domain/   Framework-free rules. No React, no Next, no I/O.
                   Shared with future Expo clients so the decision that
                   ranks a list is the same one that renders a detail page.
apps/web/          Next.js App Router pilot.
  src/app/         Pages and the /api/v1 server API.
  src/server/      Config, persistence, repositories, auth, moderation.
  src/fixtures/    17 fictional demo gyms covering the edge cases.
  e2e/             Playwright specs at 390 / 768 / 1440 px.
docs/              Architecture, data model, API, status, launch checklist.
```

## What is and is not done

`docs/STATUS.md` separates *implemented locally*, *tested locally*,
*externally integrated*, *native-tested*, *deployed* and *store-approved*, and
does not collapse them into "production ready". Read it before quoting any of
this as finished.

In short: the web pilot works locally and is tested locally. No native client
exists. Nothing is deployed. No real gym data has been collected, no gym has
been contacted, and no customer research has been done — the whole product
thesis is still a hypothesis.

## Demo data

The 17 gyms in `apps/web/src/fixtures/` are invented. None of the names,
addresses, prices, hours, equipment or reviews describe a real business. Every
record is flagged `isDemoData`, the interface says so on every page, and
production ingestion refuses records carrying the flag.
