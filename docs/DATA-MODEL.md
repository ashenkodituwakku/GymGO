# Data model

The model exists to stop three specific lies:

1. **A blank is not a no.** `Tri` (`yes` / `no` / `unknown`) is used wherever a
   boolean would have been. A gym with no recorded cable station has an unknown
   cable station, not a missing one.
2. **A missing number is not zero.** Money is `number | null`. A price we have
   not established is `null`, and `null` never satisfies a budget.
3. **Old is not the same as wrong.** Staleness is an *evidence state*, separate
   from the value. A stale "has a squat rack" still means we last saw a squat
   rack; it just stops satisfying a strict requirement on its own.

## Provenance

Every material fact carries one:

```ts
interface Provenance {
  status: 'owner_confirmed' | 'independently_checked' | 'community_reported'
        | 'unknown' | 'conflicting';
  sources: EvidenceSource[];
  conflictNote?: string | null;
}

interface EvidenceSource {
  sourceType: 'owner_submission' | 'operator_website' | 'independent_check'
            | 'community_report' | 'licensed_dataset';
  evidenceRef: string | null;   // URL, receipt id, ticket — never a secret
  label: string;                // shown to readers
  observedAt: IsoDateTime;      // when it was true in the world
  checkedAt: IsoDateTime;       // when someone last confirmed it still is
  reviewerId: string | null;
}
```

`status` is the route a fact took, not a quality score: an owner submission is
not automatically better or worse than a visit. `conflicting` means two sources
disagree and nobody has resolved it — we keep both and say so, because picking
wrong sends someone to a gym they cannot enter.

**Only real evidence advances `checkedAt`.** A cron job that finds nothing new
must not touch it.

## Freshness

```ts
const PILOT_FRESHNESS = {
  visitorPriceAccessDays: 30,
  equipmentDays: 90,
  amenityDays: 180,
};
```

Configurable product assumptions to be tested, not guarantees and not universal
expiry rules. Past the target, a fact is labelled "due for a recheck" and stops
counting as confirmed.

## Money

Integer minor units plus an ISO-4217 code. Three different numbers, never
conflated:

| Number | What it is |
|---|---|
| `totalNonRefundableMinor` | Price + applicable tax + mandatory fees. Compared against a budget. |
| `depositsMinor` | Refundable deposits. Never counted against a budget. |
| `cashNeededTodayMinor` | The two added. What you actually hand over. |

A A$25 visit with a A$20 refundable deposit **fits** a A$30 budget and needs
A$45 on the day. Both are shown.

If any mandatory component is unknown, `known` is `false` and the total is
`null` — "total not confirmed". It cannot satisfy a budget filter. A charge that
is *known not to apply* contributes nothing and is not a source of uncertainty;
one that *might* apply is.

## Offers

`VisitOffer` carries a `productType`, and the distinctions matter:

- `pool_only` with `grantsGymFloorAccess: 'no'` — the cheapest admission on a
  price list may buy the pool and not the weights room.
- `trial` with `localResidentOnly` / `firstTimeVisitorOnly` — a promotional
  trial is not an unrestricted visitor pass.
- `week_pass` is never selected as a single-visit price and never divided into
  a daily rate. A gym selling only a week pass has **no single-visit price**.
- `membership` shows billing interval, joining and card fees, minimum term and
  cancellation notice separately, and any effective weekly figure shows its
  arithmetic and its assumptions.

Eligibility is evaluated against a `VisitorProfile` that defaults to all
unknown. An unknown answer to "do you live locally?" makes a residents-only
trial *need confirmation*, not fail and not pass.

## Schedules

Three audiences, evaluated separately and never substituted:

| Audience | Question it answers |
|---|---|
| `member` | When can existing members get in? |
| `staffed` | When is someone at the desk? |
| `visitor` | When can someone without a membership enter? |

An unknown visitor schedule stays unknown however generous member access is.
The reason text even says so: "Members have 24-hour access, which does not
establish guest entry."

Windows are minutes from local midnight on a weekday, with `closeMinute`
allowed past 1440 for an overnight window (Friday 20:00–02:00 is
`{ day: 5, openMinute: 1200, closeMinute: 1560 }`). Evaluation checks both the
current local date and the previous one. Dated exceptions override the weekly
pattern. All conversion goes through the platform IANA database, so
daylight-saving transitions are handled by the runtime rather than by us
guessing an offset — there are tests on both Sydney transitions.

## Prerequisites

Booking, induction, photo ID, minimum age, residency and member accompaniment,
each tri-state. Any unresolved one produces **Needs confirmation** even inside
guest hours, because guest hours alone do not prove eligibility.

## Equipment

Presence, count, maximum weight, brand/model, and condition are five separate
fields, and inventory, condition and real-time availability are three different
questions. `count: null` means "present but nobody counted", which is not zero.
`maxWeightKg: null` means a 40 kg requirement cannot be confirmed, so the gym
moves to needs-confirmation rather than matching or being ruled out.

Brand and model are populated only where there is actual evidence.

## Reviews

First-party only, with an overall score and optional aspects. No published
reviews means `{ average: null, count: 0 }` — "No reviews yet", never zero
stars, and gyms with no reviews sort last rather than bottom.

`verifiedVisit` exists in the type and is `false` everywhere. A verified-visit
badge needs a defined evidence mechanism; a self-declared visit date and a
location ping are not one. The API does not accept the field from a client.

`CrowdReport` is modelled and deliberately unpopulated. Without an authorised
source the product says "Live crowd information unavailable" rather than
animating a guess, and equipment availability is never inferred from crowd
level.

## Identity and moderation

`Role` is `anonymous | member | owner | moderator | admin`, and `owner` is
scoped by `ownedGymIds`. Permissions are pure functions in `authz.ts` so the
same rule is asserted in tests and enforced on the server.

Two separations are enforced rather than described:

- **Ownership confirmation is not factual verification.** Approving a claim
  says who someone is. It marks nothing about their gym as verified.
- **Owners are not moderators.** A gym cannot remove a legitimate negative
  review about itself. It can reply, once a moderator approves the reply.

`ModerationEvent` records actor, action, subject and a public-safe reason. The
reason appears in the gym's change history; the evidence behind an ownership
claim stays in `privateEvidence` and there is a test asserting it never reaches
the event.

## Demo data

17 invented gyms covering: a clean confirmed match, a cheap pool-only
admission, a residents-only trial, an unknown mandatory fee, a refundable
deposit, an expired offer, 24-hour member access with daytime-only guest entry,
unknown visitor hours behind a 24-hour member door, a missing equipment count,
an unrecorded dumbbell maximum, conflicting reports on both a price and a
machine, a temporarily closed gym, an induction-and-booking requirement, an
overnight visitor window, a week-pass-only gym, a confirmed accessible bathroom
beside an unconfirmed entrance, stale equipment data, and a member-guest-only
price.

Every record carries `isDemoData: true`. `apps/web/src/fixtures/gyms.test.ts`
asserts each of those cases is still present and still behaves as intended.
