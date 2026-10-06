/**
 * Talking to the GymGO server (apps/server).
 *
 * Where it is:
 *  - EXPO_PUBLIC_API_URL, when set (a hosted GymGO, or a release build);
 *  - otherwise, in development, wherever the app's own code came from, at
 *    /_gymgo: the bundler forwards that to the server on the computer it's
 *    running on (metro.config.js). So the browser, a phone in Expo Go on the
 *    same Wi-Fi, a phone through `gymgo -Tunnel` and a debug build from Xcode
 *    all reach it, through the one port that already works for them.
 *
 * Every call has a timeout, and callers treat "couldn't reach the server"
 * as its own state rather than as an empty answer.
 */

import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';
import type { BillingCurrency, BillingInterval, CollectedGym, GymRecord, LegalOperator, PlanId, PlanLimits, ProPrice, RatingSummary, ReportCurrency, ReportedEquipment, Review, CollectionTotals, FriendCard, BusyLevel, OwnerUpdatePayload } from '@gymgo/domain';
import type { TrainingSession } from './training';
import { pickApiBase } from './serverAddress';

export { SERVER_PREFIX, pickApiBase } from './serverAddress';

export function apiBase(): string | null {
  return pickApiBase({
    configured: process.env.EXPO_PUBLIC_API_URL,
    pageOrigin: Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : null,
    bundleUrl: bundleUrl(),
    hostUri: Constants.expoConfig?.hostUri ?? null,
  });
}

/** The address a debug build or Expo Go loaded its code from; a release build loads from a file inside the app. */
function bundleUrl(): string | null {
  try {
    const source = NativeModules.SourceCode as { scriptURL?: string; getConstants?: () => { scriptURL?: string } } | undefined;
    return source?.scriptURL ?? source?.getConstants?.().scriptURL ?? null;
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** The server's reason, when it gives one: `pro_required`, `billing_off`… */
    readonly code: string | null = null,
    /** Anything else the server said, e.g. `countryCode` for an area that needs Pro. */
    readonly detail: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

/** A town or suburb the server's place finder found. */
export interface FoundPlace {
  name: string;
  /** "Victoria, Australia", "Bavaria, Germany". */
  region: string;
  lat: number;
  lng: number;
  /** ISO 3166-1 alpha-2. */
  countryCode: string;
  kind: 'city' | 'suburb';
  /** Its clock. */
  timezone: string;
}

/** The server couldn't be reached at all. */
export class OfflineError extends Error {}

/** What to tell someone when a request to the GymGO server failed. */
export function problemText(error: unknown, fallback = 'That didn’t save. Try again?'): string {
  if (error instanceof OfflineError) return 'Can’t reach the GymGO server right now.';
  if (error instanceof ApiError) return error.message;
  return fallback;
}

async function request<T>(method: string, path: string, options: { token?: string | null; body?: unknown } = {}): Promise<T> {
  const base = apiBase();
  if (!base) throw new OfflineError('No server address.');
  const controller = new AbortController();
  // Photos upload slowly; billing waits on Stripe; an area search may wait on the map service.
  // A bug report waits (a few seconds at most) for its email to go.
  const slow = (method === 'POST' && (path.endsWith('/photos') || path === '/api/bug-reports')) || path === '/api/me/avatar' || path.startsWith('/api/billing');
  const timer = setTimeout(() => controller.abort(), path.startsWith('/api/area') ? 75000 : slow || path.startsWith('/api/places') ? 30000 : 8000);
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
      data,
    );
  }
  return data as T;
}

/** The account's copy of your gym collection. */
/** Someone on GymGO, as friends and boards show them: a display name, never an email. */
export interface Person {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface FriendSummary extends Person {
  since: string;
  totals: CollectionTotals;
}

export interface TrainInvite {
  id: string;
  from: Person;
  to: Person;
  gymId: string;
  gymName: string;
  at: string;
  note: string | null;
  answer: 'yes' | 'no' | null;
}

export interface FriendsOverview {
  code: string;
  friends: FriendSummary[];
  incoming: Person[];
  outgoing: Person[];
  invites: { incoming: TrainInvite[]; outgoing: TrainInvite[] };
  leaderboard: boolean;
}

export interface BoardEntry {
  rank: number;
  displayName: string;
  avatarUrl: string | null;
  gyms: number;
  visits: number;
  you: boolean;
}

export interface Board {
  joined: boolean;
  rows: BoardEntry[];
  you: BoardEntry | null;
  people: number;
}

/** How busy members at a gym say it is now (domain busy.ts). */
export interface BusySummary {
  level: BusyLevel | null;
  count: number;
  latestAt: string | null;
  windowMinutes: number;
  minimum: number;
  mine: { level: BusyLevel; reportedAt: string } | null;
}

export interface OwnerSubmission {
  id: string;
  payload: OwnerUpdatePayload;
  status: 'pending' | 'approved' | 'rejected';
  reason: string | null;
  createdAt: string;
}

/** Whether a verified owner runs a gym, and (signed in) where you stand. */
export interface GymOwnerView {
  verified: boolean;
  since: string | null;
  updates: Array<{ kind: OwnerUpdatePayload['kind']; approvedAt: string }>;
  you: {
    owner: boolean;
    claim: { id: string; status: 'pending' | 'approved' | 'rejected'; reason: string | null; createdAt: string } | null;
    submissions: OwnerSubmission[];
  } | null;
}

export interface ModerationCounts {
  reviews: number;
  photos: number;
  ownerUpdates: number;
  /** Admins only; null for moderators. */
  claims: number | null;
}

export interface ClaimItem {
  id: string;
  gymId: string;
  createdAt: string;
  displayName: string;
  email: string;
  roleTitle: string;
  contact: string;
  evidence: string;
}

export interface OwnerUpdateItem {
  id: string;
  gymId: string;
  displayName: string;
  payload: OwnerUpdatePayload;
  createdAt: string;
}

export interface CollectionAnswer {
  gyms: CollectedGym[];
  resetAt: string | null;
}

export interface GymPhoto {
  id: string;
  /** Server-relative; pass through photoUrl(). */
  url: string;
  credit: string;
  createdAt: string;
}

export type AccessOutcome = 'walked_in' | 'booked_first' | 'turned_away';

/** Whether members say a gym has closed, over the last six months. */
export interface GymStatusSummary {
  closed: number;
  open: number;
  latestClosedOn: string | null;
  latestOpenOn: string | null;
  mine: { status: 'closed' | 'open'; seenOn: string } | null;
}

/** A member's price, visit or open/closed report, as moderators see it. */
/** A bug report as the app sends it. */
export interface BugReportDraft {
  /** A bug, or a copyright (takedown) notice. */
  topic: 'bug' | 'copyright';
  description: string;
  /** Where the team can reply, if the person asked for one. */
  replyTo: string | null;
  /** The app and device details the person agreed to send. */
  context: Array<{ label: string; value: string }>;
}

/** A bug report as moderators see it. */
export interface BugReportItem {
  id: string;
  topic: 'bug' | 'copyright';
  description: string;
  replyTo: string | null;
  reporter: { id: string; displayName: string | null; email: string | null } | null;
  context: Array<{ label: string; value: string }>;
  status: 'pending' | 'sent' | 'failed';
  attempts: number;
  lastError: string | null;
  createdAt: string;
  sentAt: string | null;
}

export interface MemberReport {
  kind: 'price' | 'access' | 'status';
  gymId: string;
  userId: string;
  author: string;
  amountMinor: number | null;
  currency: ReportCurrency | null;
  /** A visit's outcome, or for a status report, "closed" or "open". */
  outcome: AccessOutcome | 'closed' | 'open' | null;
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
  /** Null for a gym where no prices are kept (where the exchange rate is too unsettled to check one against). */
  currency: ReportCurrency | null;
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
  /** False for an account made with Google or Apple until a password is set. Missing from older servers. */
  hasPassword?: boolean;
  /** Your profile picture, server-relative (pass through photoUrl()); null or missing: none. */
  avatarUrl?: string | null;
  /** Only the dev Pro account on a local server with GYMGO_DEV_PRO=on: testing shortcuts, such as collecting gyms from anywhere. */
  devTools?: boolean;
  /** The version of the terms (LEGAL_VERSION) this account last agreed to; null if never. Missing from older servers. */
  termsVersion?: string | null;
}

export type SignInProvider = 'google' | 'apple';

/** Which of Google and Apple sign-in the server has been set up for. */
export interface SignInProviders {
  google: { web: string | null; ios: string | null; android: string | null } | null;
  apple: boolean;
}

export interface SignInMethods {
  password: boolean;
  identities: Array<{ provider: SignInProvider; email: string | null; connectedAt: string }>;
}

export interface SubscriptionInfo {
  status: string;
  interval: BillingInterval | null;
  currency: BillingCurrency | null;
  amountMinor: number | null;
  renewsAt: string | null;
  endsAt: string | null;
  /** Stripe's page can change or cancel it (the local dev account's Pro can't be). Missing from older servers. */
  manageable?: boolean;
  /** In its free trial: `renewsAt` is when it ends and the first payment is taken (missing from older servers). */
  trial?: boolean;
}

export interface BillingState {
  plan: PlanId;
  limits: PlanLimits;
  subscription: SubscriptionInfo | null;
  /** Payments are connected on the server. */
  available: boolean;
  /** Your own subscription is a Duo (missing from older servers). */
  duo?: boolean;
  /** Pro through a gift or someone's Duo. */
  grant?: { via: 'gift' | 'duo'; endsAt: string | null; from: string | null } | null;
  /** The free trial of monthly Pro this account can start (missing from older servers). */
  trial?: { days: number; offerEndsAt: string } | null;
}

export interface DuoState {
  role: 'owner' | 'member' | null;
  partner: { displayName: string } | null;
  canAdd: boolean;
}

export interface GiftBought {
  code: string;
  createdAt: string;
  redeemed: boolean;
  redeemedAt: string | null;
}

export interface PartnerPass {
  id: string;
  gymId: string;
  label: string;
  priceMinor: number;
  feeMinor: number;
  currency: BillingCurrency;
}

export interface PassBooking {
  id: string;
  gymId: string;
  label: string;
  forDate: string;
  code: string;
  totalMinor: number;
  currency: BillingCurrency;
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
  /** Towns and suburbs anywhere called this, best first (for search on submit). */
  places: (q: string) => request<{ places: FoundPlace[]; attribution: string }>('GET', `/api/places?q=${encodeURIComponent(q)}`),
  /** One gym by id, including ones found by searching an area. */
  gym: (id: string) => request<{ gym: GymRecord }>('GET', `/api/gyms/${encodeURIComponent(id)}`),
  /** The gyms OpenStreetMap has in a box, anywhere, read live by the server and kept. */
  area: (box: { south: number; west: number; north: number; east: number }, home: string, token: string | null) =>
    request<{
      gyms: GymRecord[];
      fetchedAt: string | null;
      truncated: boolean;
      attribution: string;
      /** The country and time zone of the middle of the area. */
      where: { countryCode: string; timezone: string } | null;
    }>(
      'GET',
      `/api/area?${new URLSearchParams({
        south: box.south.toFixed(5),
        west: box.west.toFixed(5),
        north: box.north.toFixed(5),
        east: box.east.toFixed(5),
        // Free covers your own country; elsewhere the server wants Pro.
        home,
      }).toString()}`,
      { token },
    ),

  signUp: (body: { email: string; password: string; displayName: string; birthMonth: string; acceptTerms: true }) =>
    request<{ token: string; account: Account }>('POST', '/api/auth/signup', { body }),
  signIn: (body: { email: string; password: string }) => request<{ token: string; account: Account }>('POST', '/api/auth/login', { body }),
  /** Emails a link to choose a new password, if there's an account for the address (the answer's the same either way). */
  forgotPassword: (email: string) => request<{ sent: true; minutes: number }>('POST', '/api/auth/forgot', { body: { email } }),
  providers: () => request<SignInProviders>('GET', '/api/auth/providers'),
  /** Sign in (or, the first time, sign up) with a Google or Apple ID token. */
  signInWith: (
    provider: SignInProvider,
    body: { idToken: string; nonce: string | null; name?: string | null; birthMonth?: string; acceptTerms?: true },
  ) =>
    request<{ token: string; account: Account; created: boolean }>('POST', `/api/auth/${provider}`, { body }),
  signInMethods: (token: string) => request<SignInMethods>('GET', '/api/me/identities', { token }),
  connect: (token: string, provider: SignInProvider, body: { idToken: string; nonce: string | null }) =>
    request<{ connected: SignInProvider; email: string | null }>('POST', `/api/me/identities/${provider}`, { token, body }),
  disconnect: (token: string, provider: SignInProvider) => request<unknown>('DELETE', `/api/me/identities/${provider}`, { token }),
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
  gymStatus: (gymId: string, token: string | null) => request<GymStatusSummary>('GET', `/api/gyms/${encodeURIComponent(gymId)}/status`, { token }),
  reportGymStatus: (token: string, gymId: string, body: { status: 'closed' | 'open'; seenOn: string }) =>
    request<unknown>('PUT', `/api/gyms/${encodeURIComponent(gymId)}/status`, { token, body }),
  deleteGymStatus: (token: string, gymId: string) => request<unknown>('DELETE', `/api/gyms/${encodeURIComponent(gymId)}/status`, { token }),
  access: (gymId: string, token: string | null) => request<AccessSummary>('GET', `/api/gyms/${encodeURIComponent(gymId)}/access`, { token }),
  reportAccess: (token: string, gymId: string, body: { outcome: AccessOutcome; visitedOn: string }) =>
    request<unknown>('PUT', `/api/gyms/${encodeURIComponent(gymId)}/access`, { token, body }),
  deleteAccess: (token: string, gymId: string) => request<unknown>('DELETE', `/api/gyms/${encodeURIComponent(gymId)}/access`, { token }),
  /** Machine search: the gyms members say have any of these machines, tallied per machine. */
  reportedEquipment: (types: string[]) =>
    request<{ gyms: ReportedEquipment }>('GET', `/api/equipment/reported?types=${types.map(encodeURIComponent).join(',')}`),
  typicalPrices: () => request<{ typical: Record<string, { typicalMinor: number; count: number }> }>('GET', '/api/prices/typical'),
  /** Every gym's rating from its published reviews, for lists and cards. */
  reviewRatings: () => request<{ ratings: Record<string, RatingSummary> }>('GET', '/api/reviews/ratings'),
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

  billingPlans: () =>
    request<{ available: boolean; prices: ProPrice[]; duo?: ProPrice[]; gifts?: Array<{ currency: BillingCurrency; amountMinor: number }>; limits: Record<PlanId, PlanLimits> }>(
      'GET',
      '/api/billing/plans',
    ),
  billing: (token: string) => request<BillingState>('GET', '/api/billing', { token }),
  syncBilling: (token: string) => request<BillingState>('POST', '/api/billing/sync', { token }),
  checkout: (token: string, body: { interval: BillingInterval; currency: BillingCurrency; returnUrl: string; plan?: 'pro' | 'duo'; trial?: boolean }) =>
    request<{ url: string }>('POST', '/api/billing/checkout', { token, body }),
  giftCheckout: (token: string, body: { currency: BillingCurrency; returnUrl: string }) => request<{ url: string }>('POST', '/api/billing/gift', { token, body }),
  giftsBought: (token: string) => request<{ gifts: GiftBought[] }>('GET', '/api/billing/gifts', { token }),
  redeemGift: (token: string, code: string) => request<BillingState>('POST', '/api/billing/redeem', { token, body: { code } }),
  duo: (token: string) => request<DuoState>('GET', '/api/billing/duo', { token }),
  addToDuo: (token: string, code: string) => request<DuoState>('PUT', '/api/billing/duo', { token, body: { code } }),
  leaveDuo: (token: string) => request<DuoState>('DELETE', '/api/billing/duo', { token }),
  gymPasses: (gymId: string) => request<{ passes: PartnerPass[]; available: boolean }>('GET', `/api/gyms/${encodeURIComponent(gymId)}/passes`),
  bookPass: (token: string, passId: string, body: { forDate: string; returnUrl: string }) =>
    request<{ url: string }>('POST', `/api/passes/${encodeURIComponent(passId)}/book`, { token, body }),
  myPasses: (token: string) => request<{ bookings: PassBooking[] }>('GET', '/api/passes/mine', { token }),
  billingPortal: (token: string, returnUrl: string) => request<{ url: string }>('POST', '/api/billing/portal', { token, body: { returnUrl } }),

  workouts: (token: string) => request<{ workouts: SavedWorkout[] }>('GET', '/api/workouts', { token }),
  saveWorkout: (token: string, body: { name: string; gymId: string | null; plan: Omit<SavedWorkoutPlan, 'version'> }) =>
    request<{ workout: SavedWorkout }>('POST', '/api/workouts', { token, body }),
  deleteWorkout: (token: string, id: string) => request<unknown>('DELETE', `/api/workouts/${encodeURIComponent(id)}`, { token }),

  /** Your training log, newest first. */
  training: (token: string) => request<{ sessions: TrainingSession[] }>('GET', '/api/training', { token }),
  logTraining: (token: string, body: Omit<TrainingSession, 'id'>) => request<{ session: TrainingSession }>('POST', '/api/training', { token, body }),
  deleteTraining: (token: string, id: string) => request<unknown>('DELETE', `/api/training/${encodeURIComponent(id)}`, { token }),

  /** Your gym collection on the account, and when it was last reset. */
  collection: (token: string) => request<CollectionAnswer>('GET', '/api/collection', { token }),
  busy: (gymId: string, token: string | null) => request<BusySummary>('GET', `/api/gyms/${encodeURIComponent(gymId)}/busy`, { token }),
  reportBusy: (token: string, gymId: string, level: BusyLevel) => request<unknown>('PUT', `/api/gyms/${encodeURIComponent(gymId)}/busy`, { token, body: { level } }),
  deleteBusy: (token: string, gymId: string) => request<unknown>('DELETE', `/api/gyms/${encodeURIComponent(gymId)}/busy`, { token }),
  gymOwner: (gymId: string, token: string | null) => request<GymOwnerView>('GET', `/api/gyms/${encodeURIComponent(gymId)}/owner`, { token }),
  claimGym: (token: string, gymId: string, body: { roleTitle: string; contact: string; evidence: string }) =>
    request<unknown>('POST', `/api/gyms/${encodeURIComponent(gymId)}/claim`, { token, body }),
  submitOwnerUpdate: (token: string, gymId: string, body: Record<string, unknown>) =>
    request<unknown>('POST', `/api/gyms/${encodeURIComponent(gymId)}/owner-updates`, { token, body }),
  moderationCounts: (token: string) => request<ModerationCounts>('GET', '/api/moderation/counts', { token }),
  claimQueue: (token: string) => request<{ claims: ClaimItem[] }>('GET', '/api/moderation/claims', { token }),
  decideClaim: (token: string, id: string, body: { decision: 'approve' | 'reject'; reason?: string }) =>
    request<unknown>('POST', `/api/moderation/claims/${encodeURIComponent(id)}`, { token, body }),
  ownerUpdateQueue: (token: string) => request<{ updates: OwnerUpdateItem[] }>('GET', '/api/moderation/owner-updates', { token }),
  decideOwnerUpdate: (token: string, id: string, body: { decision: 'approve' | 'reject'; reason?: string }) =>
    request<unknown>('POST', `/api/moderation/owner-updates/${encodeURIComponent(id)}`, { token, body }),
  friends: (token: string) => request<FriendsOverview>('GET', '/api/friends', { token }),
  addFriend: (token: string, code: string) => request<{ status: 'requested' | 'accepted'; friend: Person }>('POST', '/api/friends', { token, body: { code } }),
  acceptFriend: (token: string, id: string) => request<FriendsOverview>('POST', `/api/friends/${encodeURIComponent(id)}/accept`, { token }),
  removeFriend: (token: string, id: string) => request<unknown>('DELETE', `/api/friends/${encodeURIComponent(id)}`, { token }),
  friendCollection: (token: string, id: string) =>
    request<{ friend: Person; totals: CollectionTotals; cards: FriendCard[] }>('GET', `/api/friends/${encodeURIComponent(id)}/collection`, { token }),
  invite: (token: string, id: string, body: { gymId: string; gymName: string; at: string; note?: string }) =>
    request<TrainInvite>('POST', `/api/friends/${encodeURIComponent(id)}/invites`, { token, body }),
  answerInvite: (token: string, id: string, answer: 'yes' | 'no') => request<TrainInvite>('POST', `/api/invites/${encodeURIComponent(id)}`, { token, body: { answer } }),
  cancelInvite: (token: string, id: string) => request<unknown>('DELETE', `/api/invites/${encodeURIComponent(id)}`, { token }),
  setLeaderboard: (token: string, join: boolean) => request<{ leaderboard: boolean }>('PUT', '/api/me/leaderboard', { token, body: { join } }),
  leaderboard: (token: string, scope: 'everyone' | 'friends', city: { city: string; countryCode: string } | null) =>
    request<Board>(
      'GET',
      `/api/leaderboard?scope=${scope}${city ? `&city=${encodeURIComponent(city.city)}&country=${encodeURIComponent(city.countryCode)}` : ''}`,
      { token },
    ),
  /** Merged into the account's (up to 200 gyms at a time); a 409 `collection_reset` when it was reset since `resetAt`. */
  syncCollection: (token: string, gyms: CollectedGym[], resetAt: string | null) =>
    request<CollectionAnswer>('PUT', '/api/collection', { token, body: { gyms, resetAt } }),
  /** Every gym and visit removed from the account. */
  resetCollection: (token: string) => request<CollectionAnswer>('DELETE', '/api/collection', { token }),

  rename: (token: string, displayName: string) => request<{ account: Account }>('PATCH', '/api/me', { token, body: { displayName } }),
  /** Agree to the terms as they are now (after they've changed). */
  agreeToTerms: (token: string, version: string) => request<{ account: Account }>('POST', '/api/me/terms', { token, body: { version } }),
  /** A new profile picture (base64 JPEG or PNG, up to 2 MB). */
  setAvatar: (token: string, data: string) => request<{ account: Account }>('PUT', '/api/me/avatar', { token, body: { data } }),
  removeAvatar: (token: string) => request<{ account: Account }>('DELETE', '/api/me/avatar', { token }),
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
  /** Send a bug report to the GymGO team. `emailed` says whether the email has gone yet (it's kept either way). */
  reportBug: (token: string | null, report: BugReportDraft) => request<{ id: string; emailed: boolean }>('POST', '/api/bug-reports', { token, body: report }),
  /** Where to send a copyright (DMCA) notice, once the owner has registered an agent. */
  legal: () =>
    request<{
      copyrightAgent: { name: string; address: string | null; email: string | null } | null;
      /** Who runs GymGO; missing from older servers. */
      operator?: LegalOperator;
      version?: string;
    }>('GET', '/api/legal'),
  /** Moderators: the latest bug reports, and whether this server emails them. */
  bugReports: (token: string) => request<{ emailing: boolean; reports: BugReportItem[] }>('GET', '/api/moderation/bug-reports', { token }),
  moderationQueue: (token: string) => request<{ reviews: Review[] }>('GET', '/api/moderation/reviews', { token }),
  moderate: (token: string, reviewId: string, body: { decision: 'publish' | 'reject'; reason?: string }) =>
    request<unknown>('POST', `/api/moderation/reviews/${encodeURIComponent(reviewId)}`, { token, body }),
};
