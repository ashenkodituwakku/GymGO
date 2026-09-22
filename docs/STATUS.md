# Status

Reported in separate columns on purpose. None of this is "production ready",
and collapsing these into that phrase would be the single most misleading thing
this document could do.

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
| iOS / Android client | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| macOS native binary | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Real gym data | ❌ | ❌ | ❌ | ❌ | ❌ | n/a |

## Verification evidence

Run `pnpm verify` and `pnpm test:e2e`. Last run on this commit:

| Check | Result |
|---|---|
| `pnpm typecheck` | Clean, both packages |
| `pnpm lint` | No ESLint warnings or errors |
| `@gymgo/domain` unit tests | **114 passed** |
| `@gymgo/web` unit tests | **60 passed** |
| `pnpm build` | Compiled successfully |
| Playwright (390 / 768 / 1440) | **98 passed**, 22 skipped |

The 22 skips are the contribution and moderation suite at phone and tablet
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

- **Native iOS and Android.** Nothing scaffolded, built, or run on a device or
  simulator. The domain package is structured to be shared, which is
  preparation, not progress. A web screenshot is not native QA evidence.
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
