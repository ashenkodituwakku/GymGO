/**
 * Supersets and circuits: exercises done one after another, resting only
 * once each has had its set. Two together are a superset, three or more a
 * circuit. In a workout they're marked by a shared letter (`group`: "A",
 * "B"…) on neighbouring exercises; GymGO keeps the letters in order and a
 * group always side by side.
 *
 * The rest timer follows the group: no rest between its exercises, then the
 * longest of their rests once the round is done, and none after the last
 * round.
 *
 * No React Native here, so it is unit-tested in Node.
 */

export interface Groupable {
  group?: string;
}

interface Tickable extends Groupable {
  restSeconds: number;
  /** A drop set (`kind: 'drop'`) follows the set before it with no rest. */
  sets: ReadonlyArray<{ done: boolean; kind?: string }>;
}

const LETTERS = 'ABCDEFGHIJKL';
/** The most rest after a warm-up set: it's light, so there's little to recover from. */
export const WARM_UP_REST = 60;

/**
 * Letters in order of appearance (A, B, C…), a group always one run of
 * neighbours (a run apart from the rest of its letter becomes its own), and
 * no group of one.
 */
export function tidyGroups<T extends Groupable>(items: readonly T[]): T[] {
  const runs: Array<{ start: number; end: number }> = [];
  items.forEach((item, index) => {
    if (!item.group) return;
    const last = runs[runs.length - 1];
    if (last && last.end === index - 1 && items[index - 1]?.group === item.group) last.end = index;
    else runs.push({ start: index, end: index });
  });
  const letterAt = new Map<number, string>();
  let next = 0;
  for (const run of runs) {
    if (run.end === run.start) continue;
    const letter = LETTERS[next] ?? LETTERS[LETTERS.length - 1]!;
    next += 1;
    for (let at = run.start; at <= run.end; at += 1) letterAt.set(at, letter);
  }
  return items.map((item, index) => {
    const letter = letterAt.get(index);
    if (letter) return item.group === letter ? item : { ...item, group: letter };
    if (!item.group) return item;
    const { group: _dropped, ...rest } = item;
    return rest as T;
  });
}

/** Joins an exercise with the next one: into its group, the next one's, or a new one. */
export function linkWithNext<T extends Groupable>(items: readonly T[], index: number): T[] {
  const item = items[index];
  const following = items[index + 1];
  if (!item || !following) return [...items];
  // A letter no one uses, for a new group (tidyGroups gives it its place in order).
  const fresh = '~';
  const letter = item.group ?? following.group ?? fresh;
  const merging = following.group && following.group !== letter ? following.group : null;
  const joined = items.map((other, at) => {
    if (at === index || at === index + 1) return { ...other, group: letter };
    // The next one's whole group comes along, if it's next to it.
    if (merging && other.group === merging && at > index + 1) return { ...other, group: letter };
    return other;
  });
  return tidyGroups(joined);
}

/** Takes an exercise out of its group; what's left either side stays grouped if it's still two or more. */
export function unlink<T extends Groupable>(items: readonly T[], index: number): T[] {
  const item = items[index];
  if (!item?.group) return [...items];
  // The ones after it get a letter of their own, so they don't join back up with the ones before.
  const letter = item.group;
  const split = items.map((other, at) => {
    if (at === index) {
      const { group: _dropped, ...rest } = other;
      return rest as T;
    }
    if (at > index && other.group === letter) return { ...other, group: `${letter}'` };
    return other;
  });
  return tidyGroups(split);
}

export interface GroupInfo {
  letter: string;
  kind: 'superset' | 'circuit';
  /** The members' places in the workout, in order. */
  members: number[];
  /** This one's place in the group, from 1. */
  position: number;
}

export function groupOf(items: ReadonlyArray<Groupable>, index: number): GroupInfo | null {
  const letter = items[index]?.group;
  if (!letter) return null;
  const members: number[] = [];
  items.forEach((item, at) => {
    if (item.group === letter) members.push(at);
  });
  if (members.length < 2) return null;
  return { letter, kind: members.length === 2 ? 'superset' : 'circuit', members, position: members.indexOf(index) + 1 };
}

/** "Superset A", "Circuit B". */
export const groupName = (group: GroupInfo) => `${group.kind === 'superset' ? 'Superset' : 'Circuit'} ${group.letter}`;

/**
 * How long to rest after set `at` of exercise `index` was ticked (the items
 * as they are with it ticked). On its own: its rest after every set but its
 * last. In a group: nothing until every member has done this round, then the
 * longest of their rests, and nothing after the last round. Never before a
 * drop set: it's done straight after. After a warm-up, a minute at most.
 */
export function restAfter(items: ReadonlyArray<Tickable>, index: number, at: number): number {
  const item = items[index];
  if (!item) return 0;
  if (item.sets[at + 1]?.kind === 'drop') return 0;
  if (item.sets[at]?.kind === 'warmup') return Math.min(item.restSeconds, WARM_UP_REST);
  const group = groupOf(items, index);
  if (!group) return at < item.sets.length - 1 ? item.restSeconds : 0;
  const members = group.members.map((member) => items[member]!);
  const roundDone = members.every((member) => member.sets[at]?.done ?? true);
  const lastRound = members.every((member) => member.sets.length <= at + 1);
  if (!roundDone || lastRound) return 0;
  return Math.max(...members.map((member) => member.restSeconds));
}

/**
 * The exercise to do next: the first with a set left, and in a group the
 * first member whose turn it is in the round that's under way. -1 when
 * everything's ticked.
 */
export function nextUp(items: ReadonlyArray<Tickable>): number {
  const first = items.findIndex((item) => item.sets.some((set) => !set.done));
  if (first < 0) return -1;
  const group = groupOf(items, first);
  if (!group) return first;
  const pending = group.members
    .map((member) => ({ member, round: items[member]!.sets.findIndex((set) => !set.done) }))
    .filter((entry) => entry.round >= 0);
  const round = Math.min(...pending.map((entry) => entry.round));
  return pending.find((entry) => entry.round === round)!.member;
}
