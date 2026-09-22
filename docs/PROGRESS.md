# Progress and handoff

Written so someone picking this up cold knows what happened, what to trust, and
where the traps are.

## What was built

A complete web vertical slice of the Gym Information Map pilot, plus the
operational screens that keep its data honest. See `README.md` for how to run
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

## Traps

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
