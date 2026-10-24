/**
 * Verified gym owners' updates: the gym's visitor hours and its casual
 * visit price, from someone a GymGO admin has checked runs the gym.
 *
 * An update is a submission: a moderator approves it before anyone sees it
 * (authz.ts: "edit" means submit a change for review, never write-through).
 * Once approved it becomes the record's fact for that, marked as from the
 * gym (owner_confirmed, an owner_submission source dated the day it was
 * approved), and the app labels it "From the gym" as it does anything else
 * a gym confirms. The newest approved update of each kind wins.
 */

import { reportCurrency, visitPriceRange } from './money';
import type { AccessSchedule, GymRecord, OpeningWindow, Provenance, Tri, VisitOffer } from './types';

export type OwnerUpdateKind = 'visitor_hours' | 'casual_price';

export interface VisitorHoursUpdate {
  kind: 'visitor_hours';
  /** Open round the clock to visitors, every day. */
  alwaysOpen: boolean;
  /** Up to two windows a day (0 = Sunday), minutes after local midnight; a close past 1440 runs past midnight. */
  windows: OpeningWindow[];
}

export interface CasualPriceUpdate {
  kind: 'casual_price';
  /** In the gym country's own currency, everything a visitor must pay (tax and any must-pay fee included). */
  amountMinor: number;
  currency: string;
  /** Anyone can buy it, or only locals or members' guests. */
  anyoneCanBuy: Tri;
  photoIdRequired: Tri;
}

export type OwnerUpdatePayload = VisitorHoursUpdate | CasualPriceUpdate;

export interface ApprovedOwnerUpdate {
  id: string;
  gymId: string;
  payload: OwnerUpdatePayload;
  /** When a moderator approved it. */
  approvedAt: string;
}

export class OwnerUpdateError extends Error {}

const tri = (value: unknown): Tri => (value === 'yes' || value === 'no' ? value : 'unknown');

/** A submission as stored, or an OwnerUpdateError saying what's wrong. `countryCode` is the gym's. */
export function cleanOwnerUpdate(input: unknown, countryCode: string): OwnerUpdatePayload {
  const body = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  if (body.kind === 'visitor_hours') {
    const alwaysOpen = body.alwaysOpen === true;
    const raw = Array.isArray(body.windows) ? body.windows : [];
    if (raw.length > 14) throw new OwnerUpdateError('Up to two opening times a day.');
    const windows: OpeningWindow[] = raw.map((item) => {
      const window = (item ?? {}) as Record<string, unknown>;
      const day = Number(window.day);
      const openMinute = Number(window.openMinute);
      const closeMinute = Number(window.closeMinute);
      if (![day, openMinute, closeMinute].every(Number.isInteger) || day < 0 || day > 6) throw new OwnerUpdateError('Each opening time needs a day and its hours.');
      if (openMinute < 0 || openMinute >= 1440 || closeMinute <= openMinute || closeMinute > openMinute + 1440 || closeMinute > 2880) {
        throw new OwnerUpdateError('Each opening time has to close after it opens.');
      }
      return { day, openMinute, closeMinute };
    });
    for (let day = 0; day < 7; day++) {
      const today = windows.filter((window) => window.day === day).sort((a, b) => a.openMinute - b.openMinute);
      if (today.length > 2) throw new OwnerUpdateError('Up to two opening times a day.');
      if (today.length === 2 && today[1]!.openMinute < today[0]!.closeMinute) throw new OwnerUpdateError('A day’s two opening times can’t overlap.');
    }
    if (!alwaysOpen && windows.length === 0) throw new OwnerUpdateError('Give at least one day’s visitor hours, or say it’s open round the clock.');
    return { kind: 'visitor_hours', alwaysOpen, windows: alwaysOpen ? [] : windows.sort((a, b) => a.day - b.day || a.openMinute - b.openMinute) };
  }
  if (body.kind === 'casual_price') {
    const currency = reportCurrency(countryCode);
    if (!currency) throw new OwnerUpdateError('GymGO doesn’t keep visit prices in this country.');
    const amountMinor = Number(body.amountMinor);
    const range = visitPriceRange(currency);
    if (!Number.isInteger(amountMinor) || amountMinor < range.minMinor || amountMinor > range.maxMinor) throw new OwnerUpdateError('That price doesn’t look like one visit’s.');
    return { kind: 'casual_price', amountMinor, currency, anyoneCanBuy: tri(body.anyoneCanBuy), photoIdRequired: tri(body.photoIdRequired) };
  }
  throw new OwnerUpdateError('Say what you’re updating: visitor hours or the casual visit price.');
}

function fromTheGym(update: ApprovedOwnerUpdate, label: string): Provenance {
  return {
    status: 'owner_confirmed',
    sources: [
      {
        id: `owner-${update.id}`,
        sourceType: 'owner_submission',
        evidenceRef: null,
        label,
        observedAt: update.approvedAt,
        checkedAt: update.approvedAt,
        reviewerId: null,
      },
    ],
    conflictNote: null,
  };
}

/** The record with the gym's approved updates applied, the newest of each kind. */
export function applyOwnerUpdates(record: GymRecord, updates: readonly ApprovedOwnerUpdate[]): GymRecord {
  const mine = updates.filter((update) => update.gymId === record.location.id).sort((a, b) => a.approvedAt.localeCompare(b.approvedAt));
  if (mine.length === 0) return record;
  let next = record;
  const hours = mine.filter((update) => update.payload.kind === 'visitor_hours').at(-1);
  if (hours && hours.payload.kind === 'visitor_hours') {
    const schedule: AccessSchedule = {
      id: `owner-hours-${record.location.id}`,
      gymId: record.location.id,
      audience: 'visitor',
      timezone: record.location.timezone,
      windows: hours.payload.windows,
      exceptions: [],
      alwaysOpen: hours.payload.alwaysOpen,
      provenance: fromTheGym(hours, 'Visitor hours from the gym (verified owner)'),
    };
    next = { ...next, schedules: [...next.schedules.filter((item) => item.audience !== 'visitor'), schedule] };
  }
  const price = mine.filter((update) => update.payload.kind === 'casual_price').at(-1);
  if (price && price.payload.kind === 'casual_price') {
    const anyone = price.payload.anyoneCanBuy;
    const offer: VisitOffer = {
      id: `owner-casual-${record.location.id}`,
      gymId: record.location.id,
      productType: 'casual_gym_visit',
      label: 'Casual visit',
      currency: price.payload.currency,
      baseAmountMinor: price.payload.amountMinor,
      // The owner said it's the whole price: tax and any must-pay fee included.
      taxIncluded: true,
      taxAmountMinor: null,
      mandatoryCharges: [],
      refundableDeposits: [],
      grantsGymFloorAccess: 'yes',
      inclusions: ['gym_floor'],
      durationMinutes: null,
      validityDays: 1,
      eligibility: {
        localResidentOnly: anyone === 'yes' ? 'no' : 'unknown',
        memberGuestOnly: anyone === 'yes' ? 'no' : 'unknown',
        firstTimeVisitorOnly: anyone === 'yes' ? 'no' : 'unknown',
        membershipRequired: anyone === 'yes' ? 'no' : 'unknown',
        photoIdRequired: price.payload.photoIdRequired,
        minAgeYears: null,
        notes: anyone === 'no' ? ['Not open to everyone: ask the gym who can buy it.'] : [],
      },
      purchaseMethod: 'at_reception',
      availableFrom: null,
      availableUntil: null,
      membershipTerms: null,
      provenance: fromTheGym(price, 'Casual visit price from the gym (verified owner)'),
    };
    next = { ...next, offers: [...next.offers.filter((item) => item.productType !== 'casual_gym_visit'), offer] };
  }
  return next;
}
