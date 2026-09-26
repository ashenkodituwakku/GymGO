# Architecture

## The shape of it

```
packages/domain          packages/demo-data        apps/mobile (the product)
─────────────────        ──────────────────        ─────────────────────────
types, money, time  ───► 17 invented gyms    ───►  Expo / React Native
access, offers,          pilot suburbs,            search runs on the device;
equipment, search,       geocode                   map + sheets, Maps-style
authz, tokens
                                              └──► apps/web (earlier pilot)
                                                   Next.js, server API,
                                                   file-backed dev store
```

`packages/domain` has no React, no Next, and no I/O. Everything in it is pure:
given the same records and query it returns the same verdict. That is what lets
the same decision run on a phone, on the server for an indexable page, and in
the browser when a filter changes, with no second implementation drifting away
from the first. The phone app runs `search()` on the device against the demo
dataset; nothing is fetched.

Both packages ship TypeScript source rather than a build. The website lists
them in `transpilePackages`; Metro resolves them through the pnpm workspace
(supported from Expo SDK 54). One compile step, no stale published artefact.

### The phone app

One screen, the way Apple Maps is one screen: the map fills it and sheets
stack over it.

- **Results sheet** (`ResultsContent`): always present. It peeks, sits at half
  height, or goes full. It holds search, the quick filters, and results
  grouped by tier.
- **Place card** (`PlaceCard`): a modal sheet stacked on top of the results.
  The name stays pinned while the detail scrolls. Closing it puts the results
  sheet back where it was.
- **Filters** (`FiltersContent`): a modal sheet whose changes apply live. Its
  button says how many gyms are left, so the controls and the results never
  disagree.

`GymMap.tsx` (react-native-maps) is the phone's map. Metro swaps in
`GymMap.web.tsx` (MapLibre) only for the browser preview, so MapLibre is never
in a phone bundle.

## Why the rules live in one place

The acceptance criteria include "required-equipment filters use the same rules
in map results, lists and comparison". The cheapest way to guarantee that is to
make it structurally impossible to do otherwise: `evaluateGym()` is the only
function that decides what a gym is, and the list, the map markers, the
comparison table and the detail page all call it.

## Data flow

1. **Repository** (`src/server/gyms.ts`) loads base records from the configured
   source and applies approved corrections as patches on read.
2. **Search parameters** (`src/server/search-params.ts`) turn a URL into a
   `SearchQuery`. The URL is the only search state there is.
3. **Domain** (`search()` / `evaluateGym()`) produces tiered, ranked results
   with reasons.
4. **Pages** render. They format; they do not decide.

### Corrections are patches, not edits

An approved correction is stored as an `AppliedPatch` and applied when a record
is read. The base record and the correction history both survive, and a pending
change can never overwrite a confirmed fact in place.

Where a contributor supplies machine-readable values (a price, an equipment
presence, an operating status) approval applies a structured change with fresh
provenance naming the correction and the moderator. Where they do not, approval
publishes the correction *beside* the fact rather than guessing at a structured
edit. Guessing would be how a free-text note becomes a wrong price.

Only real evidence moves a check date forward. A scheduled recheck that finds
nothing new must not write `checkedAt` — that would make old information look
new, which is worse than admitting it is old.

## Storage

**Local:** a JSON file under `.data/`, written atomically (temp file plus
rename) with serialised writes. It is a real store — restart and your pending
correction is still pending — but it is a development store.

**Production:** PostgreSQL with PostGIS. `docs/sql/001_schema.sql` has the
schema. Two reasons the file store cannot be promoted:

- A serverless deployment has no durable local disk, and several instances would
  each hold their own copy.
- Nearby search wants a geographic index. Haversine over every row is fine for
  17 gyms and wrong for 17,000.

The repository functions in `src/server/` are the seam. Swapping the store means
reimplementing them, not touching the domain or the pages.

## Provider interfaces

Every external provider sits behind a narrow interface with an honest
unconfigured state. None is required for the product to work.

### Maps

`MapPanel` decides; `MapCanvas` (dynamically imported) draws. With no basemap
configured the panel says "Map tiles are not configured" and the list view is
the full alternative — not a fallback, the same data.

Deliberately not done: shipping a default tile URL. A public tile service is not
unlimited hosting, OpenStreetMap carries attribution and licensing obligations,
and a basemap licence suitable for a *directory* is a decision to make before
production rather than a default to inherit. A raster source configured without
attribution is treated as not configured at all.

**This path is unverified.** No basemap is configured in this repository, so the
MapLibre code has never rendered. It is written carefully and reported as
untested in `docs/STATUS.md`.

### Business listings and ratings

The directory is built from independently acquired records. A mapping
provider's terms restrict content reuse and specifically address directory
uses, so this product does not assume its listings are licensed as a
foundation. Our gym ids are our own and never a provider's id, kept in a
separate `externalRefs` map, so a provider can be added or dropped without
orphaning anything.

If external ratings are ever added they stay visibly separate. They are never
averaged with first-party reviews.

### Geocoding

A local table of 16 pilot suburbs. Anything outside it returns "we do not cover
that area yet", which is true, rather than recentring somewhere plausible. A
geocoding service is a licence decision and a credential; neither is worth
taking on before the product does something useful.

## Authentication

`local-dev` is a cookie holding a user id plus a visible account switcher. It is
not an identity provider and does not pretend to be one.

In a production build it is refused unless `GYMGO_AUTH_ADAPTER=local-dev` **and**
`GYMGO_ALLOW_DEV_AUTH_IN_PROD=yes-i-understand` are both set, and when they are,
a warning banner appears on every page. Two deliberate steps and a permanent
visible consequence; no accidental path to an open admin panel.

Production needs a real provider. The seam is `getCurrentUser()`,
`signIn()` and `signOut()` in `src/server/auth.ts`.

`getCurrentUser()` reads cookies unconditionally, before checking whether the
adapter is enabled. That is not redundant: reading cookies is what marks a page
as per-request, and a page whose content depends on who is asking must never be
prerendered. An earlier version read them conditionally, and the moderation
queue was statically generated at build time — serving everyone the empty state
it was built with. The session pages also carry `dynamic = 'force-dynamic'`.

## Security

- Every mutating route validates its body with a zod schema from the domain
  package, and re-checks permissions server-side. The interface hides controls
  as a courtesy; it is never the control.
- Owner permissions are scoped to approved branches. An owner naming their own
  gym id but another gym's review id is refused (409), not just hidden.
- Owners cannot remove or moderate reviews about their own gym. They can reply,
  once a moderator approves the reply.
- Nobody decides their own ownership claim, whatever role they hold.
- Ownership evidence lives in a separate private store, is visible only to
  administrators deciding that claim, and is never in a public response. There
  is a test asserting the audit event does not contain it.
- Submission rates are capped per account per day.
- User text is stored as plain text with control characters stripped, and
  escaped at render by React. No `dangerouslySetInnerHTML` anywhere.
- Form redirects accept same-site paths only; an absolute URL is dropped rather
  than followed.

## Privacy

Device location is requested only when the person presses "Near me", rounded to
about 100 m, used for that search, and not stored. There is no movement history
and no analytics integration — precise location, review evidence and personal
details have nowhere to leak to, because nothing is sent anywhere.

Account deletion exists before public registration does. It removes the account
and its private evidence and redacts authorship of contributions, rather than
deleting them and leaving holes in a gym's correction history.

## Rendering and SEO

Gym pages are server-rendered with real text and metadata, canonical URLs and a
sitemap. The search page is `noindex`: filter permutations are not useful search
results.

Curated area pages exist for each pilot suburb that actually has listings.
Area-plus-equipment pages exist only for four anchor suburbs, and only where at
least three gyms back the page, capped at three per area — twelve pages, not
hundreds. Inner-city suburbs overlap heavily at a 1.5 km radius, so generating
one per pair would produce near-duplicates, which is the thin-generated-page
problem wearing a different hat.

While the dataset is the fictional demo one, every listing page is `noindex`,
`robots.txt` disallows everything, and the sitemap contains only the
informational pages. Invented venues must not be indexed as real ones.

No structured data is emitted. It would need to be backed by visible, licensed
facts, and that is a decision to make with real data.

## Native clients

Not built. The domain package is structured so they can share types, validation,
filtering and design tokens, but nothing has been scaffolded, built or run on a
device or simulator. See `docs/STATUS.md`.
