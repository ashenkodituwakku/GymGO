/**
 * The interval timer: work, rest, rounds. Tabata and EMOM are free as they
 * come; with Pro you set your own work, rest and rounds, and keep up to ten
 * timers of your own on this device.
 *
 * Pure timing: where a timer is, given how long it has run. The screen
 * (app/timer.tsx) works out the elapsed time from the clock, so a paused
 * or backgrounded app never drifts.
 */

export interface IntervalPlan {
  id: string;
  name: string;
  /** Seconds of work each round. */
  work: number;
  /** Seconds of rest after each round but the last (0: none, as in EMOM). */
  rest: number;
  rounds: number;
}

/** Free for everyone, as they come. */
export const STANDARD_TIMERS: IntervalPlan[] = [
  // 20 seconds all-out, 10 seconds rest, eight times (it ends on the last burst, so 3:50).
  { id: 'tabata', name: 'Tabata', work: 20, rest: 10, rounds: 8 },
  // Every minute on the minute: do the reps, rest what's left of the minute.
  { id: 'emom', name: 'EMOM', work: 60, rest: 0, rounds: 10 },
];

/** How many of your own timers Pro keeps. */
export const MAX_OWN_TIMERS = 10;

export const LIMITS = {
  work: { min: 5, max: 600 },
  rest: { min: 0, max: 600 },
  rounds: { min: 1, max: 50 },
} as const;

/** Seconds to get ready before the first round. */
export const LEAD_IN = 5;

export type PhaseKind = 'ready' | 'work' | 'rest' | 'done';

export interface Phase {
  kind: PhaseKind;
  /** 1-based; 0 while getting ready. */
  round: number;
  /** Seconds left in this phase (0 once done). */
  remaining: number;
  /** How long this phase lasts. */
  length: number;
}

/** The whole timer, lead-in included, in seconds. */
export function totalSeconds(plan: IntervalPlan, lead = LEAD_IN): number {
  return lead + plan.rounds * plan.work + Math.max(0, plan.rounds - 1) * plan.rest;
}

/** Where the timer is after `elapsed` seconds. */
export function phaseAt(plan: IntervalPlan, elapsed: number, lead = LEAD_IN): Phase {
  let t = Math.max(0, elapsed);
  if (t < lead) return { kind: 'ready', round: 0, remaining: lead - t, length: lead };
  t -= lead;
  for (let round = 1; round <= plan.rounds; round += 1) {
    if (t < plan.work) return { kind: 'work', round, remaining: plan.work - t, length: plan.work };
    t -= plan.work;
    if (round === plan.rounds) break;
    if (t < plan.rest) return { kind: 'rest', round, remaining: plan.rest - t, length: plan.rest };
    t -= plan.rest;
  }
  return { kind: 'done', round: plan.rounds, remaining: 0, length: 0 };
}

/** "20 s work, 10 s rest, 8 rounds · 4:00". */
export function describePlan(plan: IntervalPlan): string {
  const total = totalSeconds(plan, 0);
  const clock = `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  const rest = plan.rest > 0 ? `, ${seconds(plan.rest)} rest` : '';
  return `${seconds(plan.work)} work${rest}, ${plan.rounds} round${plan.rounds === 1 ? '' : 's'} · ${clock}`;
}

function seconds(value: number): string {
  return value >= 60 && value % 60 === 0 ? `${value / 60} min` : value > 60 ? `${Math.floor(value / 60)} min ${value % 60} s` : `${value} s`;
}

const clamp = (value: number, { min, max }: { min: number; max: number }) => Math.min(max, Math.max(min, Math.round(value)));

/** A plan with every number inside its limits. */
export function withinLimits(plan: IntervalPlan): IntervalPlan {
  return { ...plan, work: clamp(plan.work, LIMITS.work), rest: clamp(plan.rest, LIMITS.rest), rounds: clamp(plan.rounds, LIMITS.rounds) };
}

/** Your own timers as stored, cleaned: anything malformed is dropped. */
export function cleanTimers(value: unknown): IntervalPlan[] {
  if (!Array.isArray(value)) return [];
  const out: IntervalPlan[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const { id, name, work, rest, rounds } = item as Record<string, unknown>;
    if (typeof id !== 'string' || typeof name !== 'string' || ![work, rest, rounds].every((n) => typeof n === 'number' && Number.isFinite(n))) continue;
    out.push(withinLimits({ id, name: name.trim().slice(0, 40) || 'My timer', work: work as number, rest: rest as number, rounds: rounds as number }));
    if (out.length === MAX_OWN_TIMERS) break;
  }
  return out;
}
