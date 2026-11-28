-- GymGO production schema (PostgreSQL + PostGIS).
--
-- Not used by the local pilot, which runs on a JSON file store. This is the
-- shape the domain model implies, written down so the migration is a known
-- quantity rather than a later surprise. It has not been run against a live
-- database.
--
-- Two ideas drive the design:
--   * Money is integer minor units plus a currency code. Never a float.
--   * "Unknown" is representable everywhere a value could be missing, and a
--     NULL amount is never read as zero by anything that consumes these rows.

CREATE EXTENSION IF NOT EXISTS postgis;

-- ---------------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------------

CREATE TYPE tri            AS ENUM ('yes', 'no', 'unknown');
CREATE TYPE fact_status    AS ENUM ('owner_confirmed', 'independently_checked',
                                    'community_reported', 'unknown', 'conflicting');
CREATE TYPE source_type    AS ENUM ('owner_submission', 'operator_website',
                                    'independent_check', 'community_report',
                                    'licensed_dataset');
CREATE TYPE access_audience AS ENUM ('member', 'staffed', 'visitor');
CREATE TYPE moderation_status AS ENUM ('pending', 'published', 'rejected', 'removed');
CREATE TYPE operating_status AS ENUM ('open', 'temporarily_closed',
                                      'permanently_closed', 'unknown');
CREATE TYPE visit_product_type AS ENUM ('casual_gym_visit', 'day_pass',
                                        'multi_day_pass', 'week_pass', 'pool_only',
                                        'class_only', 'trial', 'membership');
CREATE TYPE user_role      AS ENUM ('member', 'owner', 'moderator', 'admin');

-- ---------------------------------------------------------------------------
-- Gyms
-- ---------------------------------------------------------------------------

CREATE TABLE gym_location (
  id                    TEXT PRIMARY KEY,
  slug                  TEXT NOT NULL UNIQUE,
  name                  TEXT NOT NULL,
  branch                TEXT,
  brand                 TEXT,

  address_line1         TEXT NOT NULL,
  address_line2         TEXT,
  suburb                TEXT NOT NULL,
  state                 TEXT NOT NULL,
  postcode              TEXT NOT NULL,
  country_code          CHAR(2) NOT NULL,

  position              geography(Point, 4326) NOT NULL,
  timezone              TEXT NOT NULL,

  training_types        TEXT[] NOT NULL DEFAULT '{}',
  operating_status      operating_status NOT NULL DEFAULT 'unknown',
  operating_status_note TEXT,
  phone                 TEXT,
  website               TEXT,

  -- Refuses fixture content in production; see src/server/gyms.ts.
  is_demo_data          BOOLEAN NOT NULL DEFAULT FALSE,

  -- Provider ids live here, never as the primary key, so a provider can be
  -- dropped without orphaning anything. {"google": "...", "osm": "..."}
  external_refs         JSONB NOT NULL DEFAULT '{}',

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT no_demo_data_in_production CHECK (is_demo_data = FALSE)
);

-- The index that makes "gyms near here" a query rather than a table scan.
CREATE INDEX gym_location_position_idx ON gym_location USING GIST (position);
CREATE INDEX gym_location_suburb_idx   ON gym_location (suburb, postcode);

CREATE TABLE gym_photo (
  id         TEXT PRIMARY KEY,
  gym_id     TEXT NOT NULL REFERENCES gym_location(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  alt        TEXT NOT NULL,
  -- Both required: a photo without a credit and a licence does not get shown.
  credit     TEXT NOT NULL,
  licence    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Provenance
-- ---------------------------------------------------------------------------

-- One row per fact. Other tables point at it, so the rule "every material fact
-- carries provenance" is enforced by NOT NULL foreign keys rather than by
-- convention.
CREATE TABLE provenance (
  id            BIGSERIAL PRIMARY KEY,
  status        fact_status NOT NULL,
  conflict_note TEXT,
  CONSTRAINT conflict_note_requires_conflict
    CHECK (status = 'conflicting' OR conflict_note IS NULL)
);

CREATE TABLE evidence_source (
  id             BIGSERIAL PRIMARY KEY,
  provenance_id  BIGINT NOT NULL REFERENCES provenance(id) ON DELETE CASCADE,
  source_type    source_type NOT NULL,
  evidence_ref   TEXT,
  label          TEXT NOT NULL,
  observed_at    TIMESTAMPTZ NOT NULL,
  -- Advanced only by real evidence. A scheduled recheck that finds nothing new
  -- must not write here.
  checked_at     TIMESTAMPTZ NOT NULL,
  reviewer_id    TEXT
);

CREATE INDEX evidence_source_provenance_idx ON evidence_source (provenance_id);
CREATE INDEX evidence_source_checked_idx    ON evidence_source (checked_at);

-- ---------------------------------------------------------------------------
-- Equipment and amenities
-- ---------------------------------------------------------------------------

CREATE TABLE equipment_type (
  id             TEXT PRIMARY KEY,
  label          TEXT NOT NULL,
  category       TEXT NOT NULL,
  uses_max_weight BOOLEAN NOT NULL DEFAULT FALSE,
  hint           TEXT NOT NULL DEFAULT ''
);

CREATE TABLE equipment_observation (
  id                    TEXT PRIMARY KEY,
  gym_id                TEXT NOT NULL REFERENCES gym_location(id) ON DELETE CASCADE,
  equipment_type_id     TEXT NOT NULL REFERENCES equipment_type(id),
  presence              tri NOT NULL DEFAULT 'unknown',
  -- NULL means "present but nobody counted", which is not zero.
  count                 INTEGER CHECK (count IS NULL OR count >= 0),
  max_weight_kg         NUMERIC(5,1) CHECK (max_weight_kg IS NULL OR max_weight_kg > 0),
  brand                 TEXT,
  model                 TEXT,
  -- Condition ages faster than presence, so it is tracked separately.
  condition             TEXT NOT NULL DEFAULT 'unknown',
  condition_observed_at TIMESTAMPTZ,
  provenance_id         BIGINT NOT NULL REFERENCES provenance(id),
  UNIQUE (gym_id, equipment_type_id)
);

CREATE INDEX equipment_observation_lookup_idx
  ON equipment_observation (equipment_type_id, presence);

CREATE TABLE amenity_observation (
  id            TEXT PRIMARY KEY,
  gym_id        TEXT NOT NULL REFERENCES gym_location(id) ON DELETE CASCADE,
  -- Specific facts only. There is no blanket "accessible" column, because a
  -- step-free entrance says nothing about the bathroom.
  amenity_id    TEXT NOT NULL,
  present       tri NOT NULL DEFAULT 'unknown',
  note          TEXT,
  provenance_id BIGINT NOT NULL REFERENCES provenance(id),
  UNIQUE (gym_id, amenity_id)
);

-- ---------------------------------------------------------------------------
-- Offers
-- ---------------------------------------------------------------------------

CREATE TABLE visit_offer (
  id                      TEXT PRIMARY KEY,
  gym_id                  TEXT NOT NULL REFERENCES gym_location(id) ON DELETE CASCADE,
  product_type            visit_product_type NOT NULL,
  label                   TEXT NOT NULL,

  currency                CHAR(3) NOT NULL,
  -- NULL is "not established", never free.
  base_amount_minor       INTEGER CHECK (base_amount_minor IS NULL OR base_amount_minor >= 0),
  tax_included            BOOLEAN NOT NULL DEFAULT TRUE,
  tax_amount_minor        INTEGER CHECK (tax_amount_minor IS NULL OR tax_amount_minor >= 0),

  -- Does this actually buy the gym floor? The pool-only case lives here.
  grants_gym_floor_access tri NOT NULL DEFAULT 'unknown',
  inclusions              TEXT[] NOT NULL DEFAULT '{}',
  duration_minutes        INTEGER,
  validity_days           INTEGER,

  eligibility             JSONB NOT NULL DEFAULT '{}',
  purchase_method         TEXT NOT NULL DEFAULT 'unknown',
  available_from          DATE,
  available_until         DATE,
  membership_terms        JSONB,

  provenance_id           BIGINT NOT NULL REFERENCES provenance(id),

  CONSTRAINT membership_terms_only_for_memberships
    CHECK (product_type = 'membership' OR membership_terms IS NULL),
  CONSTRAINT offer_window_ordered
    CHECK (available_from IS NULL OR available_until IS NULL
           OR available_from <= available_until)
);

CREATE INDEX visit_offer_gym_idx ON visit_offer (gym_id, product_type);

-- Charges you do not get back. Amount NULL with applies='yes' is the case that
-- makes a total unconfirmed rather than cheap.
CREATE TABLE offer_mandatory_charge (
  id            BIGSERIAL PRIMARY KEY,
  offer_id      TEXT NOT NULL REFERENCES visit_offer(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  amount_minor  INTEGER CHECK (amount_minor IS NULL OR amount_minor >= 0),
  applies       tri NOT NULL DEFAULT 'unknown'
);

-- Charges you do get back. Never counted against a budget.
CREATE TABLE offer_refundable_deposit (
  id                 BIGSERIAL PRIMARY KEY,
  offer_id           TEXT NOT NULL REFERENCES visit_offer(id) ON DELETE CASCADE,
  label              TEXT NOT NULL,
  amount_minor       INTEGER CHECK (amount_minor IS NULL OR amount_minor >= 0),
  refund_conditions  TEXT
);

-- ---------------------------------------------------------------------------
-- Access
-- ---------------------------------------------------------------------------

CREATE TABLE access_schedule (
  id            TEXT PRIMARY KEY,
  gym_id        TEXT NOT NULL REFERENCES gym_location(id) ON DELETE CASCADE,
  audience      access_audience NOT NULL,
  timezone      TEXT NOT NULL,
  always_open   BOOLEAN NOT NULL DEFAULT FALSE,
  provenance_id BIGINT NOT NULL REFERENCES provenance(id),
  UNIQUE (gym_id, audience)
);

CREATE TABLE opening_window (
  id           BIGSERIAL PRIMARY KEY,
  schedule_id  TEXT NOT NULL REFERENCES access_schedule(id) ON DELETE CASCADE,
  -- 0 = Sunday. Minutes from local midnight on that day.
  day_of_week  SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_minute  INTEGER NOT NULL CHECK (open_minute BETWEEN 0 AND 1439),
  -- May exceed 1440: Friday 20:00 to 02:00 Saturday is 1200 to 1560.
  close_minute INTEGER NOT NULL CHECK (close_minute BETWEEN 1 AND 2880),
  CONSTRAINT window_ordered CHECK (close_minute > open_minute)
);

CREATE INDEX opening_window_schedule_idx ON opening_window (schedule_id, day_of_week);

CREATE TABLE schedule_exception (
  id           BIGSERIAL PRIMARY KEY,
  schedule_id  TEXT NOT NULL REFERENCES access_schedule(id) ON DELETE CASCADE,
  exception_date DATE NOT NULL,
  closed       BOOLEAN NOT NULL,
  open_minute  INTEGER,
  close_minute INTEGER,
  note         TEXT NOT NULL DEFAULT '',
  UNIQUE (schedule_id, exception_date)
);

CREATE TABLE entry_prerequisites (
  gym_id                   TEXT PRIMARY KEY REFERENCES gym_location(id) ON DELETE CASCADE,
  advance_booking_required tri NOT NULL DEFAULT 'unknown',
  booking_lead_time_hours  INTEGER,
  induction_required       tri NOT NULL DEFAULT 'unknown',
  induction_staffed_only   tri NOT NULL DEFAULT 'unknown',
  photo_id_required        tri NOT NULL DEFAULT 'unknown',
  min_age_years            SMALLINT,
  residency_rule           TEXT NOT NULL DEFAULT 'unknown',
  member_accompaniment_required tri NOT NULL DEFAULT 'unknown',
  notes                    TEXT[] NOT NULL DEFAULT '{}',
  provenance_id            BIGINT NOT NULL REFERENCES provenance(id)
);

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------

CREATE TABLE app_user (
  id           TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  role         user_role NOT NULL DEFAULT 'member',
  blocked      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ownership is per branch, not per account. A row here is the whole of an
-- owner's power.
CREATE TABLE user_owned_gym (
  user_id TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  gym_id  TEXT NOT NULL REFERENCES gym_location(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, gym_id)
);

-- ---------------------------------------------------------------------------
-- Contributions
-- ---------------------------------------------------------------------------

CREATE TABLE review (
  id                  TEXT PRIMARY KEY,
  gym_id              TEXT NOT NULL REFERENCES gym_location(id) ON DELETE CASCADE,
  author_id           TEXT NOT NULL REFERENCES app_user(id),
  author_display_name TEXT NOT NULL,
  overall             SMALLINT NOT NULL CHECK (overall BETWEEN 1 AND 5),
  equipment           SMALLINT CHECK (equipment BETWEEN 1 AND 5),
  cleanliness         SMALLINT CHECK (cleanliness BETWEEN 1 AND 5),
  atmosphere          SMALLINT CHECK (atmosphere BETWEEN 1 AND 5),
  value               SMALLINT CHECK (value BETWEEN 1 AND 5),
  body                TEXT NOT NULL,
  visited_on          DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  status              moderation_status NOT NULL DEFAULT 'pending',
  moderation_reason   TEXT,
  -- Requires a defined evidence mechanism. There is none, so it stays FALSE.
  verified_visit      BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (gym_id, author_id)
);

CREATE INDEX review_published_idx ON review (gym_id) WHERE status = 'published';

CREATE TABLE owner_reply (
  review_id  TEXT PRIMARY KEY REFERENCES review(id) ON DELETE CASCADE,
  author_id  TEXT NOT NULL REFERENCES app_user(id),
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status     moderation_status NOT NULL DEFAULT 'pending'
);

CREATE TABLE correction (
  id              TEXT PRIMARY KEY,
  gym_id          TEXT NOT NULL REFERENCES gym_location(id) ON DELETE CASCADE,
  target_kind     TEXT NOT NULL,
  target_id       TEXT,
  proposed_value  TEXT NOT NULL,
  -- Shown to moderators, never published.
  evidence_note   TEXT NOT NULL,
  evidence_url    TEXT,
  -- The machine-readable half, when supplied. NULL means an approval publishes
  -- the correction beside the fact rather than overwriting it.
  structured      JSONB,
  submitted_by    TEXT NOT NULL REFERENCES app_user(id),
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  status          moderation_status NOT NULL DEFAULT 'pending',
  decided_by      TEXT REFERENCES app_user(id),
  decided_at      TIMESTAMPTZ,
  decision_reason TEXT
);

CREATE INDEX correction_queue_idx ON correction (submitted_at) WHERE status = 'pending';

-- Approved corrections applied over the base record, so the original source
-- and the correction history both survive.
CREATE TABLE applied_patch (
  id            TEXT PRIMARY KEY,
  correction_id TEXT NOT NULL REFERENCES correction(id) ON DELETE CASCADE,
  gym_id        TEXT NOT NULL REFERENCES gym_location(id) ON DELETE CASCADE,
  target_kind   TEXT NOT NULL,
  target_id     TEXT,
  change        JSONB NOT NULL,
  applied_by    TEXT NOT NULL REFERENCES app_user(id),
  applied_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX applied_patch_gym_idx ON applied_patch (gym_id, applied_at);

CREATE TABLE ownership_claim (
  id              TEXT PRIMARY KEY,
  gym_id          TEXT NOT NULL REFERENCES gym_location(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  claimant_name   TEXT NOT NULL,
  claimant_role   TEXT NOT NULL,
  evidence_type   TEXT NOT NULL,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  status          moderation_status NOT NULL DEFAULT 'pending',
  decided_by      TEXT REFERENCES app_user(id),
  decided_at      TIMESTAMPTZ,
  decision_reason TEXT,
  CONSTRAINT nobody_decides_their_own_claim CHECK (decided_by IS NULL OR decided_by <> user_id)
);

CREATE UNIQUE INDEX one_pending_claim_per_user_per_gym
  ON ownership_claim (user_id, gym_id) WHERE status = 'pending';

-- Separate table so the evidence can be dropped on its own retention schedule
-- and so no join that builds a public response can reach it by accident.
CREATE TABLE private_ownership_evidence (
  claim_id      TEXT PRIMARY KEY REFERENCES ownership_claim(id) ON DELETE CASCADE,
  evidence_ref  TEXT NOT NULL,
  stored_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Kept while the claim is open and for 90 days after a decision, per the
  -- privacy page. A job enforces this; the column records the promise.
  delete_after  TIMESTAMPTZ
);

CREATE TABLE content_report (
  id           TEXT PRIMARY KEY,
  subject_type TEXT NOT NULL,
  subject_id   TEXT NOT NULL,
  -- Nullable: reporting abuse does not require an account.
  reported_by  TEXT REFERENCES app_user(id),
  reason       TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  status       TEXT NOT NULL DEFAULT 'open'
);

CREATE TABLE moderation_event (
  id           TEXT PRIMARY KEY,
  actor_id     TEXT NOT NULL REFERENCES app_user(id),
  action       TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id   TEXT NOT NULL,
  gym_id       TEXT REFERENCES gym_location(id) ON DELETE SET NULL,
  -- Public-safe. Evidence stays in private_ownership_evidence.
  reason       TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX moderation_event_gym_idx ON moderation_event (gym_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Crowd reports
-- ---------------------------------------------------------------------------

-- Modelled, deliberately unpopulated. Showing a crowd level requires enough
-- independent reports within the expiry window, and historical patterns must
-- stay distinct from live observations.
CREATE TABLE crowd_report (
  id          TEXT PRIMARY KEY,
  gym_id      TEXT NOT NULL REFERENCES gym_location(id) ON DELETE CASCADE,
  reported_by TEXT NOT NULL REFERENCES app_user(id),
  level       TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  status      moderation_status NOT NULL DEFAULT 'pending',
  CONSTRAINT crowd_report_expires_after_observation CHECK (expires_at > observed_at)
);
