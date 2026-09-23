# Status

Reported in separate columns on purpose. None of this is "production ready",
and collapsing these into that phrase would be the single most misleading thing
this document could do.

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

**What "tested locally" means for the phone app, exactly:**

- It typechecks, and 22 unit tests pass. They include the same reference search
  the website runs, run through the app's own filter code: 3 confirmed results,
  Ironbark first.
- `expo export` builds both the **iOS and Android bundles** into Hermes
  bytecode without errors: 1,845 and 1,938 modules. The web-only map library
  is confirmed absent from both.
- `expo-doctor` passes 21/21 checks.
- The interface was driven with Playwright in the **react-native-web preview**
  at 390 × 844. It covered the map with pins, opening a place card from a row,
  closing it, the filters sheet, tightening filters to "nothing fits" with its
  suggestions, and place search. Those screenshots are the only visual evidence.
  They were taken in Chromium, not on a phone. They show the blur fallback,
  not Liquid Glass, and MapLibre, not MapKit or Google Maps.

**Not done, and it matters:** the app has **never run on a physical phone or a
simulator.** This machine has no iOS simulator and no Android emulator. Nothing
about touch, gestures, keyboard behaviour, haptics, safe areas, the native map,
Liquid Glass or performance has been observed. The first run in Expo Go on a
real phone is the next test. Expect to fix things there.

**Maps, per platform:**

- **iPhone:** Apple MapKit through react-native-maps. It needs no key and no
  account.
- **Android in Expo Go:** Google Maps inside Expo Go works as it is.
- **A standalone Android build:** needs a Google Maps API key, which means a
  Google Cloud account with billing enabled. None has been obtained or used.
- **Web preview:** OpenFreeMap tiles (OpenStreetMap data). They are free, with
  attribution, and the credit is kept visible above the sheet.

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
| `pnpm typecheck` | Clean, all four packages |
| `pnpm lint` | No ESLint warnings or errors (web); tsc clean elsewhere |
| `@gymgo/domain` unit tests | **115 passed** |
| `@gymgo/demo-data` unit tests | **23 passed** |
| `@gymgo/mobile` unit tests | **22 passed** |
| `@gymgo/web` unit tests | **39 passed** |
| `expo export` (iOS + Android) | Both bundles compiled |
| `expo-doctor` | 21/21 checks passed |
| `pnpm build` | Compiled successfully |
| Playwright (390 / 768 / 1440), fresh build | **99 passed**, 24 skipped |

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
