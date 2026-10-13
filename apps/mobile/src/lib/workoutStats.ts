/**
 * The summary at the top of a plan: how many exercises and sets, and roughly
 * how long it takes. The time is an estimate, and says so ("about"): about
 * 40 seconds a set, the planned rest between sets, a minute and a half to
 * move between exercises, and 10 minutes for a finisher.
 */

export interface PlanLine {
  sets: number;
  restSeconds: number;
  /** A conditioning finisher, done for time rather than in sets. */
  cardio?: boolean;
}

const SET_SECONDS = 40;
const CHANGE_SECONDS = 90;
const FINISHER_SECONDS = 10 * 60;

/** Minutes, to the nearest 5 (never under 5). */
export function planMinutes(lines: PlanLine[]): number {
  if (lines.length === 0) return 0;
  const seconds = lines.reduce((sum, line) => {
    if (line.cardio) return sum + FINISHER_SECONDS;
    const sets = Math.max(1, line.sets);
    return sum + sets * SET_SECONDS + (sets - 1) * Math.max(0, line.restSeconds);
  }, CHANGE_SECONDS * (lines.length - 1));
  return Math.max(5, Math.round(seconds / 60 / 5) * 5);
}

/** Sets across the plan; a finisher counts as none. */
export const planSets = (lines: PlanLine[]): number => lines.reduce((sum, line) => sum + (line.cardio ? 0 : line.sets), 0);

/** "about 55 min", or "about 1 h 15 min". */
export function minutesLabel(minutes: number): string {
  if (minutes < 60) return `about ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `about ${hours} h${rest ? ` ${rest} min` : ''}`;
}
