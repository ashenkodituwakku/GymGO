# Launch checklist

These are proposed founder decision gates, not industry benchmarks, and not
work that has been done. Nothing on this list has been started.

## 1. Customer discovery — before building more

- [ ] Interview 15–20 people who recently searched for an unfamiliar gym.
      Reconstruct the actual search and any wasted trip. Which detail changed
      the decision?
- [ ] Interview 5–10 operators. Who can keep branch information current, and
      what would make them bother?
- [ ] Decide whether the initial segment (regular gymgoers needing an
      unfamiliar gym) is the right one, or whether the evidence points
      elsewhere.

**Gate:** the three questions this product answers are the ones that actually
blocked people. If they were not, stop and re-aim.

## 2. Concierge dataset — before any acquisition

- [ ] 30–50 genuinely checked listings in one compact area, with verified
      visitor prices, access rules and the equipment target users ask for.
- [ ] At least five operators willing to confirm updates regularly.
- [ ] Measure the real cost per listing: minutes to create, minutes to
      recheck, correction rate.

**Gate:** the recheck targets in `PILOT_FRESHNESS` are affordable in practice.
If 30-day price rechecks cost more than the listings are worth, the policy is
wrong or the product is.

## 3. Comparative task test

- [ ] Ten moderated participants, alternating app-first and usual-workflow-first
      on matched tasks.
- [ ] **Proposed gate:** at least eight find an actually eligible option within
      three minutes, with no systematic price or admission mistake.
- [ ] Record speed relative to their normal process, not in isolation.

## 4. Real-use pilot

- [ ] Recruit people with an upcoming visit. Seek at least twenty followed-up
      visits.
- [ ] Check whether equipment, price and access matched on arrival.
- [ ] Report failed visits and unknown outcomes, not just a conversion rate. A
      mismatch is the most valuable data this product can collect.

## 5. Maintenance test

- [ ] **Proposed gate:** 90% of core price and access fields meet the recheck
      policy, and upkeep has a plausible cost per successful visit.

## 6. Revenue test — last, not first

- [ ] Present an operator offer only after demonstrating attributable value.
- [ ] Seek concrete paid-pilot commitments before assuming subscription
      revenue.
- [ ] Outreach and charging need a separate decision. Neither is authorised by
      having built this.

## Technical readiness, before anyone outside sees it

- [ ] Real identity provider replacing the development adapter.
- [ ] PostgreSQL/PostGIS replacing the file store.
- [ ] Basemap licence resolved and the map path actually exercised.
- [ ] A working support channel. `/support` currently says there is none.
- [ ] Legal review of terms, privacy and community guidelines.
- [ ] A moderation rota. The queue exists; nobody is staffing it.
- [ ] Backups, and a retention job that actually deletes ownership evidence 90
      days after a decision, as the privacy page promises.

## Measuring the right thing

Primary outcome: **a person found and successfully used a gym meeting their
stated requirements.** Measured by voluntary follow-up or legitimate partner
confirmation.

A directions click is not a visit, and counting it as one would corrupt every
number downstream. Daily active users is a poor standalone metric for an
episodic task — someone who finds a gym once and does not return has been well
served.

Worth tracking: valid shortlist completion, time to decision, outbound actions,
**actual visit mismatches**, no-result rate, unknown-field rate, data freshness,
correction turnaround, verification cost, and return usage among people with
another gym-search need.

Never send precise location, private review evidence or personal details to
analytics.
