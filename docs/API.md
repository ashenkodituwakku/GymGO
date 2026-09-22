# Server API

Base path `/api/v1`. Every mutating route validates with a zod schema from
`@gymgo/domain` and re-checks permissions server-side.

Routes accept **both** JSON and ordinary form encoding and answer in kind: JSON
for a `fetch`, a 303 redirect for a plain form post. That is how the forms keep
working without JavaScript while there is still one documented API.

For a form post, `returnTo` sets the redirect target. Only same-site paths are
honoured; an absolute URL is dropped rather than followed.

## Errors

```json
{ "ok": false, "error": "You do not have permission to do that." }
```

| Status | Meaning |
|---|---|
| 400 | Validation failed. The message names the field. |
| 403 | Not permitted. Says nothing about whether the record exists. |
| 409 | Conflict — already reviewed, duplicate claim, wrong gym for that review. |
| 429 | Daily submission limit reached. |
| 503 | Sign-in is not available in this environment. |

## Read

### `GET /api/v1/gyms`

Runs the same search the web pages run, and accepts the same query parameters
as `/search`, so a URL from the interface can be pasted here.

| Parameter | Notes |
|---|---|
| `q` | Suburb or postcode. Outside the pilot area sets `outOfArea`. |
| `lat`, `lng`, `r` | Centre and radius in km. |
| `bbox` | `north,south,east,west`. Overrides centre and radius. |
| `budget` | In dollars. Compared against total non-refundable cost. |
| `date`, `time` | Visit date and `HH:MM`, local to the gym. |
| `eq`, `db` | Required equipment ids; `db` is the minimum dumbbell maximum in kg. |
| `am` | Required amenity ids. |
| `resident`, `visited`, `guest` | `yes` / `no`, default unknown. |
| `sort` | `best_match` \| `distance` \| `visit_cost` \| `rating`. |

Response carries `counts` per tier, `sortDescription`, any `relaxations`, and
per result the `tier`, `access.verdict` with reasons, `visitCost`, equipment
match states and `limitations`.

`visitCost.totalNonRefundableMinor` is `null`, never `0`, when unconfirmed.

### `GET /api/v1/auth/session`

The caller's id, display name, role and owned gym ids.

## Write

| Route | Permission | Result |
|---|---|---|
| `POST /reviews` | signed in | Review created `pending`. `verifiedVisit` is not accepted from the client. |
| `POST /corrections` | signed in | Correction `pending`. Structured values kept where supplied. |
| `POST /claims` | signed in | Claim `pending`. Grants nothing. Evidence goes to the private store and is **not** echoed back. |
| `POST /reports` | anyone | Report opened. No account needed. |
| `POST /owner/replies` | owner of that branch | Reply `pending`. |
| `POST /moderation/reviews` | moderator | `approve`, `reject`, or `remove`. |
| `POST /moderation/corrections` | moderator | Approving applies a patch with fresh provenance. |
| `POST /moderation/replies` | moderator | Publish or reject an owner reply. |
| `POST /moderation/claims` | **administrator** | Approving grants that one branch. Nobody decides their own. |
| `POST /auth/session` | — | Development sign-in. 503 when the adapter is disabled. |
| `DELETE /auth/session` | — | Sign out. |
| `POST /account` | signed in | `intent=sign-out`, or delete the account and its evidence. |

### Worked example

```bash
# Sign in (development adapter only)
curl -c jar -X POST localhost:3000/api/v1/auth/session \
  -H 'Accept: application/json' -d 'persona=demo-member'

# Suggest a structured price correction
curl -b jar -X POST localhost:3000/api/v1/corrections \
  -H 'Accept: application/json' \
  --data-urlencode 'gymId=oakline-fitness-zetland' \
  --data-urlencode 'targetKind=offer_price' \
  --data-urlencode 'targetId=oakline-fitness-zetland-casual' \
  --data-urlencode 'newPrice=24' \
  --data-urlencode 'proposedValue=The casual visit is now A$24.' \
  --data-urlencode 'evidenceNote=Paid it on 20 September; receipt in hand.'
# → {"ok":true,"correctionId":"cor_…","status":"pending"}
```

The correction changes nothing until a moderator approves it. On approval the
price updates and its provenance becomes "Reported by a user — correction
approved by a moderator", checked today, by that moderator.

## Not implemented

No search-by-id endpoint, no pagination (the pilot dataset is 17 records), no
rate limiting beyond per-account daily caps, and no API authentication other
than the session cookie. All of these need doing before anything but a browser
calls this.
