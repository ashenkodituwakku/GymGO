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
import type { GymRecord, Review } from '@gymgo/domain';

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
  const timer = setTimeout(() => controller.abort(), 8000);
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
    throw new ApiError(response.status, typeof data.error === 'string' ? data.error : 'Something went wrong.');
  }
  return data as T;
}

export interface Account {
  id: string;
  email: string;
  displayName: string;
  role: 'member' | 'owner' | 'moderator' | 'admin';
  createdAt: string;
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

  moderationQueue: (token: string) => request<{ reviews: Review[] }>('GET', '/api/moderation/reviews', { token }),
  moderate: (token: string, reviewId: string, body: { decision: 'publish' | 'reject'; reason?: string }) =>
    request<unknown>('POST', `/api/moderation/reviews/${encodeURIComponent(reviewId)}`, { token, body }),
};
