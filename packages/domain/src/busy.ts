/**
 * "Is it busy?": members at a gym say how busy it is right now. A level is
 * shown only when enough of them have said so recently (3 in the last hour),
 * as the middle of what they said; one person's word isn't shown as fact,
 * and an old report says nothing about now. Nothing is estimated or
 * predicted: no reports, no answer.
 */

export type BusyLevel = 'quiet' | 'steady' | 'busy' | 'packed';

export const BUSY_LEVELS: ReadonlyArray<{ id: BusyLevel; label: string; detail: string }> = [
  { id: 'quiet', label: 'Quiet', detail: 'Plenty of free kit' },
  { id: 'steady', label: 'Steady', detail: 'Some waiting for popular kit' },
  { id: 'busy', label: 'Busy', detail: 'Waiting for most kit' },
  { id: 'packed', label: 'Packed', detail: 'Hard to train' },
];

/** Reports count for this long. */
export const BUSY_WINDOW_MINUTES = 60;
/** And this many are needed before a level is shown. */
export const BUSY_MINIMUM = 3;

export const isBusyLevel = (value: unknown): value is BusyLevel => BUSY_LEVELS.some((level) => level.id === value);

export interface BusyNow {
  /** The middle of the recent reports, or null when there aren't enough. */
  level: BusyLevel | null;
  /** Reports in the window. */
  count: number;
  /** The newest of them. */
  latestAt: string | null;
}

export function busyNow(reports: ReadonlyArray<{ level: BusyLevel; reportedAt: string }>, now: Date): BusyNow {
  const since = now.getTime() - BUSY_WINDOW_MINUTES * 60_000;
  const recent = reports.filter((report) => {
    const at = Date.parse(report.reportedAt);
    return at >= since && at <= now.getTime() + 60_000;
  });
  const latestAt = recent.map((report) => report.reportedAt).sort().at(-1) ?? null;
  if (recent.length < BUSY_MINIMUM) return { level: null, count: recent.length, latestAt };
  const ranks = recent.map((report) => BUSY_LEVELS.findIndex((level) => level.id === report.level)).sort((a, b) => a - b);
  // The lower middle on an even count: never busier than members said.
  const middle = ranks[Math.floor((ranks.length - 1) / 2)]!;
  return { level: BUSY_LEVELS[middle]!.id, count: recent.length, latestAt };
}
