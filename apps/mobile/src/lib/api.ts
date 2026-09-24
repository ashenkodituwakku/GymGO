/**
 * Talking to the GymGO server (apps/server).
 *
 * Where it is:
 *  - EXPO_PUBLIC_API_URL, when set (a hosted server later on);
 *  - in the browser, the same machine that served the page, port 4000;
 *  - on a phone in Expo Go, the computer Expo is running on (its address is
 *    in the dev-server URL), port 4000.
 *
 * Every call has a timeout, and callers treat "couldn't reach the server"
 * as its own state rather than as an empty answer.
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { BillingCurrency, BillingInterval, GymRecord, PlanId, PlanLimits, ProPrice, Review } from '@gymgo/domain';

const PORT = 4000;

export function apiBase(): string | null {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) return configured.replace(/\/+$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:${PORT}`;
  }
  const hostUri = Constants.expoConfig?.hostUri ?? null;
  const host = hostUri?.split(':')[0];
  return host ? `http://${host}:${PORT}` : null;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** The server's reason, when it gives one: `pro_required`, `billing_off`… */
    readonly code: string | null = null,
  ) {
    super(message);
  }
}

/** The server couldn't be reached at all. */
export class OfflineError extends Error {}

async function request<T>(method: string, path: string, options: { token?: string | null; body?: unknown } = {}): Promise<T> {
  const base = apiBase();
  if (!base) throw new OfflineError('No server address.');
  const controller = new AbortController();
  // Photos upload slowly; billing waits on Stripe.
  const slow = (method === 'POST' && path.endsWith('/photos')) || path.startsWith('/api/billing');
  const timer = setTimeout(() => controller.abort(), slow ? 30000 : 8000);
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new OfflineError('Couldn’t reach the GymGO server.');
  } finally {
    clearTimeout(timer);
  }
  const text = await response.text();
  const data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  if (!response.ok) {
    throw new ApiError(
      response.status,
      typeof data.error === 'string' ? data.error : 'Something went wrong.',
      typeof data.code === 'string' ? data.code : null,
    );
  }
  return data as T;
}

export interface GymPhoto {
  id: string;
  /** Server-relative; pass through photoUrl(). */
  url: string;
  credit: string;
  createdAt: string;
}

export type AccessOutcome = 'walked_in' | 'booked_first' | 'turned_away';

/** A member's price or visit report, as moderators see it. */
export interface MemberReport {
  kind: 'price' | 'access';
  gymId: string;
  userId: string;
  author: string;
  amountMinor: number | null;
  currency: 'AUD' | 'USD' | null;
  outcome: AccessOutcome | null;
  on: string;
  reportedAt: string;
}

/** How getting in went for members who visited as guests, in the last year. */
export interface AccessSummary {
  count: number;
  walkedIn: number;
  bookedFirst: number;
  turnedAway: number;
  latestVisitOn: string | null;
  mine: { outcome: AccessOutcome; visitedOn: string } | null;
}

/** What members paid for one casual visit: typical (median), range, how many, how recent. */
export interface PriceSummary {
  currency: 'AUD' | 'USD';
  count: number;
  typicalMinor: number | null;
  lowMinor: number | null;
  highMinor: number | null;
  latestPaidOn: string | null;
  mine: { amountMinor: number; paidOn: string } | null;
}

export interface GoogleAuthor {
  name: string;
  uri: string | null;
  photoUri: string | null;
}

export interface GooglePlace {
  placeId: string;
  name: string;
  address: string | null;
  rating: number | null;
  ratingCount: number | null;
  openNow: boolean | null;
  hours: string[];
  phone: string | null;
  website: string | null;
  googleMapsUri: string | null;
  businessStatus: string | null;
  summary: string | null;
  type: string | null;
  phoneInternational: string | null;
  details: Array<{ group: 'Accessibility' | 'Parking' | 'Payments'; label: string; value: boolean }>;
  photos: Array<{ uri: string; authors: GoogleAuthor[] }>;
  reviews: Array<{ rating: number | null; text: string; when: string | null; author: GoogleAuthor; googleMapsUri: string | null }>;
}

export type GoogleResult =
  | { configured: false }
  | { configured: true; found: false; reason: 'demo' | 'no_match' }
  | { configured: true; found: true; place: GooglePlace };

/** A server path such as /api/photos/abc as a full URL. */
export function photoUrl(path: string): string | null {
  const base = apiBase();
  return base ? `${base}${path}` : null;
}

export interface EquipmentTally {
  equipmentTypeId: string;
  yes: number;
  no: number;
  /** Heaviest reported, for dumbbells. */
  maxWeightKg: number | null;
  lastReportedAt: string;
}

export interface EquipmentReportItem {
  equipmentTypeId: string;
  presence: 'yes' | 'no';
  maxWeightKg?: number | null;
}

export interface Account {
  id: string;
  email: string;
  displayName: string;
  role: 'member' | 'owner' | 'moderator' | 'admin';
  createdAt: string;
}

export interface SubscriptionInfo {
  status: string;
  interval: BillingInterval | null;
  currency: BillingCurrency | null;
  amountMinor: number | null;
  renewsAt: string | null;
  endsAt: string | null;
}

export interface BillingState {
  plan: PlanId;
  limits: PlanLimits;
  subscription: SubscriptionInfo | null;
  /** Payments are connected on the server. */
  available: boolean;
}

/** A plan kept in the account, as it was when saved. */
export interface SavedWorkoutPlan {
  version: number;
  muscles: string[];
  goal: string | null;
  gymName: string | null;
  items: Array<{ exerciseId: string; sets: number; reps: string; restSeconds: number; uses: string[]; confirmed: boolean }>;
  uncovered: string[];
}

export interface SavedWorkout {
  id: string;
  name: string;
  gymId: string | null;
  createdAt: string;
  plan: SavedWorkoutPlan;
}

export const api = {
  gyms: () => request<{ gyms: GymRecord[]; attribution: string; generatedAt: string }>('GET', '/api/gyms'),

  signUp: (body: { email: string; password: string; displayName: string }) =>
    request<{ token: string; account: Account }>('POST', '/api/auth/signup', { body }),
  signIn: (body: { email: string; password: string }) => request<{ token: string; account: Account }>('POST', '/api/auth/login', { body }),
  signOut: (token: string) => request<unknown>('POST', '/api/auth/logout', { token }),
  me: (token: string) => request<{ account: Account }>('GET', '/api/me', { token }),
  deleteAccount: (token: string) => request<unknown>('DELETE', '/api/me', { token }),

  saved: (token: string) => request<{ gymIds: string[] }>('GET', '/api/saved', { token }),
  save: (token: string, gymId: string) => request<unknown>('PUT', `/api/saved/${encodeURIComponent(gymId)}`, { token }),
  unsave: (token: string, gymId: string) => request<unknown>('DELETE', `/api/saved/${encodeURIComponent(gymId)}`, { token }),

  reviews: (gymId: string, token: string | null) =>
    request<{ reviews: Review[]; mine: Review[] }>('GET', `/api/gyms/${encodeURIComponent(gymId)}/reviews`, { token }),
  postReview: (token: string, gymId: string, body: { overall: number; body: string }) =>
    request<{ review: Review }>('POST', `/api/gyms/${encodeURIComponent(gymId)}/reviews`, { token, body }),

  photos: (gymId: string, token: string | null) =>
    request<{ photos: GymPhoto[]; mine: Array<{ id: string; status: string; createdAt: string }> }>(
      'GET',
      `/api/gyms/${encodeURIComponent(gymId)}/photos`,
      { token },
    ),
  uploadPhoto: (token: string, gymId: string, data: string) =>
    request<{ photo: { id: string; status: string } }>('POST', `/api/gyms/${encodeURIComponent(gymId)}/photos`, {
      token,
      body: { data, consent: true },
    }),
  covers: () => request<{ covers: Record<string, string> }>('GET', '/api/photos/covers'),
  equipment: (gymId: string, token: string | null) =>
    request<{ reporters: number; items: EquipmentTally[]; mine: EquipmentReportItem[] }>(
      'GET',
      `/api/gyms/${encodeURIComponent(gymId)}/equipment`,
      { token },
    ),
  reportEquipment: (token: string, gymId: string, items: EquipmentReportItem[]) =>
    request<unknown>('PUT', `/api/gyms/${encodeURIComponent(gymId)}/equipment`, { token, body: { items } }),
  access: (gymId: string, token: string | null) => request<AccessSummary>('GET', `/api/gyms/${encodeURIComponent(gymId)}/access`, { token }),
  reportAccess: (token: string, gymId: string, body: { outcome: AccessOutcome; visitedOn: string }) =>
    request<unknown>('PUT', `/api/gyms/${encodeURIComponent(gymId)}/access`, { token, body }),
  deleteAccess: (token: string, gymId: string) => request<unknown>('DELETE', `/api/gyms/${encodeURIComponent(gymId)}/access`, { token }),
  typicalPrices: () => request<{ typical: Record<string, { typicalMinor: number; count: number }> }>('GET', '/api/prices/typical'),
  prices: (gymId: string, token: string | null) => request<PriceSummary>('GET', `/api/gyms/${encodeURIComponent(gymId)}/prices`, { token }),
  reportPrice: (token: string, gymId: string, body: { amountMinor: number; paidOn: string }) =>
    request<unknown>('PUT', `/api/gyms/${encodeURIComponent(gymId)}/prices`, { token, body }),
  deletePrice: (token: string, gymId: string) => request<unknown>('DELETE', `/api/gyms/${encodeURIComponent(gymId)}/prices`, { token }),
  google: (gymId: string) => request<GoogleResult>('GET', `/api/gyms/${encodeURIComponent(gymId)}/google`),
  photoQueue: (token: string) =>
    request<{ photos: Array<{ id: string; gymId: string; credit: string; createdAt: string; dataUrl: string | null }> }>(
      'GET',
      '/api/moderation/photos',
      { token },
    ),
  moderatePhoto: (token: string, photoId: string, body: { decision: 'publish' | 'reject'; reason?: string }) =>
    request<unknown>('POST', `/api/moderation/photos/${encodeURIComponent(photoId)}`, { token, body }),

  billingPlans: () => request<{ available: boolean; prices: ProPrice[]; limits: Record<PlanId, PlanLimits> }>('GET', '/api/billing/plans'),
  billing: (token: string) => request<BillingState>('GET', '/api/billing', { token }),
  syncBilling: (token: string) => request<BillingState>('POST', '/api/billing/sync', { token }),
  checkout: (token: string, body: { interval: BillingInterval; currency: BillingCurrency; returnUrl: string }) =>
    request<{ url: string }>('POST', '/api/billing/checkout', { token, body }),
  billingPortal: (token: string, returnUrl: string) => request<{ url: string }>('POST', '/api/billing/portal', { token, body: { returnUrl } }),

  workouts: (token: string) => request<{ workouts: SavedWorkout[] }>('GET', '/api/workouts', { token }),
  saveWorkout: (token: string, body: { name: string; gymId: string | null; plan: Omit<SavedWorkoutPlan, 'version'> }) =>
    request<{ workout: SavedWorkout }>('POST', '/api/workouts', { token, body }),
  deleteWorkout: (token: string, id: string) => request<unknown>('DELETE', `/api/workouts/${encodeURIComponent(id)}`, { token }),

  rename: (token: string, displayName: string) => request<{ account: Account }>('PATCH', '/api/me', { token, body: { displayName } }),
  changePassword: (token: string, body: { currentPassword: string; newPassword: string }) =>
    request<unknown>('POST', '/api/me/password', { token, body }),
  exportMyData: (token: string) => request<Record<string, unknown>>('GET', '/api/me/export', { token }),
  memberReports: (token: string) => request<{ reports: MemberReport[] }>('GET', '/api/moderation/member-reports', { token }),
  removeMemberReport: (token: string, report: Pick<MemberReport, 'kind' | 'gymId' | 'userId'>) =>
    request<unknown>(
      'DELETE',
      `/api/moderation/member-reports/${report.kind}/${encodeURIComponent(report.gymId)}/${encodeURIComponent(report.userId)}`,
      { token },
    ),
  moderationQueue: (token: string) => request<{ reviews: Review[] }>('GET', '/api/moderation/reviews', { token }),
  moderate: (token: string, reviewId: string, body: { decision: 'publish' | 'reject'; reason?: string }) =>
    request<unknown>('POST', `/api/moderation/reviews/${encodeURIComponent(reviewId)}`, { token, body }),
};
