/**
 * When to remind a free account about GymGO Pro (components/ProNudge.tsx):
 * at most once every three days, never on the first day you use GymGO, and
 * after a short wait of a random length on Home, so it never lands as you
 * arrive or while you're doing something. Kept on this device.
 *
 * The rules are plain functions, so they're unit-tested in Node.
 */

import { deviceStore } from './deviceStore';

export interface NudgeState {
  /** When this device first saw a free account it could remind (ms), or null. */
  firstSeen: number | null;
  /** When the reminder last showed (ms), or null for never. */
  lastShown: number | null;
}

const DAY = 24 * 60 * 60_000;
/** Days between reminders, at the least. */
export const NUDGE_GAP_DAYS = 3;
/** Days before the first one. */
export const NUDGE_FIRST_DAYS = 1;

export function readNudge(stored: unknown): NudgeState {
  const value = (stored ?? {}) as Record<string, unknown>;
  const time = (raw: unknown) => (typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? raw : null);
  return { firstSeen: time(value.firstSeen), lastShown: time(value.lastShown) };
}

/** Whether a reminder may show now. */
export function nudgeDue(state: NudgeState, now: number): boolean {
  if (state.firstSeen === null || now - state.firstSeen < NUDGE_FIRST_DAYS * DAY) return false;
  return state.lastShown === null || now - state.lastShown >= NUDGE_GAP_DAYS * DAY;
}

/** How long to wait on Home before showing it: 8 to 20 seconds, by `random` (0 to 1). */
export function nudgeWait(random: number): number {
  return Math.round(8_000 + Math.min(1, Math.max(0, random)) * 12_000);
}

export const nudgeStore = deviceStore<NudgeState>('gymgo.proNudge.v1', readNudge, { firstSeen: null, lastShown: null });
