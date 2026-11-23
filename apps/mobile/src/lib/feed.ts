/**
 * The friends' feed, in words: when a workout was, who liked it, the best
 * set of each exercise, the volume. The feed itself comes from the server
 * (apps/server/src/feed.ts); the page is app/feed.
 *
 * No React Native here, so it is unit-tested in Node.
 */

import { exerciseName } from './workout';
import { durationLabel, formatWeight, fromKg, repsWords, workingSets, type LoggedSet, type NewRecord, type WeightUnit } from './training';
import { RECORD_WORD } from './records';
import type { FeedItem, FeedPerson, HeadToHeadBest } from './api';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * When, as a feed says it: "Just now", "12 min ago", "3 h ago", "Yesterday",
 * a weekday within the week, then the date ("12 Nov", with the year once
 * it's another year's). In this device's time zone.
 */
export function feedWhen(iso: string, now: Date = new Date()): string {
  const at = new Date(iso);
  const ms = now.getTime() - at.getTime();
  if (!Number.isFinite(ms)) return '';
  if (ms < 60_000) return 'Just now';
  if (ms < 60 * 60_000) return `${Math.floor(ms / 60_000)} min ago`;
  const startOf = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(at)) / 86_400_000);
  if (days === 0) return `${Math.floor(ms / 3_600_000)} h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return DAYS[at.getDay()]!;
  return `${at.getDate()} ${MONTHS[at.getMonth()]}${at.getFullYear() === now.getFullYear() ? '' : ` ${at.getFullYear()}`}`;
}

/** "You and Max like this", "Max and 2 others like this", "3 people like this"; empty for none. */
export function likedLine(item: Pick<FeedItem, 'likes' | 'liked' | 'likedBy'>): string {
  if (item.likes <= 0) return '';
  const names = item.likedBy.map((person, index) => (index === 0 && item.liked ? 'You' : person.displayName));
  const first = names[0];
  if (!first) return `${item.likes} ${item.likes === 1 ? 'person likes' : 'people like'} this`;
  const verb = item.likes === 1 && !item.liked ? 'likes' : 'like';
  if (item.likes === 1) return `${first} ${verb} this`;
  if (item.likes === 2 && names[1]) return `${first} and ${names[1]} like this`;
  const others = item.likes - 1;
  return `${first} and ${others} other${others === 1 ? '' : 's'} like this`;
}

/** An exercise's name in the feed: the one its owner gave theirs, or GymGO's. */
export const feedExerciseName = (exercise: { exerciseId: string; name?: string }) => exercise.name ?? exerciseName(exercise.exerciseId);

/** The best working set, for a one-line summary: the heaviest ("100 kg × 5"), or the most reps at body weight ("15 reps"). */
export function bestSetLine(sets: readonly LoggedSet[], unit: WeightUnit): string {
  const working = workingSets(sets);
  const weighted = working.filter((set) => set.weight !== null && set.weight > 0);
  if (weighted.length > 0) {
    const best = [...weighted].sort((a, b) => b.weight! - a.weight! || b.reps - a.reps)[0]!;
    return `${formatWeight(best.weight!, unit)} × ${best.reps}`;
  }
  const most = [...working].sort((a, b) => b.reps - a.reps)[0];
  return most ? repsWords([most.reps]) : '';
}

/** Everything lifted, in the lifter's unit: "4,320 kg". */
export function volumeLine(volumeKg: number, unit: WeightUnit): string {
  return `${Math.round(fromKg(volumeKg, unit)).toLocaleString('en')} ${unit}`;
}

/** How long it took: "48 min". */
export const timeLine = (item: Pick<FeedItem, 'startedAt' | 'finishedAt'>) => durationLabel(Date.parse(item.finishedAt) - Date.parse(item.startedAt));

/** The records an exercise broke, in words: "Heaviest yet · Most reps yet". */
export function recordsFor(records: readonly NewRecord[], exerciseId: string): string {
  return records
    .filter((record) => record.exerciseId === exerciseId)
    .map((record) => RECORD_WORD[record.kind])
    .join(' · ');
}

/** What a screen reader hears for a card: who, what, when and how it went. */
export function feedCardLabel(item: FeedItem, now: Date = new Date()): string {
  const who = item.you ? 'You' : item.person.displayName;
  const parts = [
    `${who}: ${item.name}, ${feedWhen(item.finishedAt, now).toLowerCase()}`,
    timeLine(item),
    item.volumeKg > 0 ? `${volumeLine(item.volumeKg, item.unit).replace(' ', ' ')} lifted` : null,
    `${item.sets} set${item.sets === 1 ? '' : 's'}`,
    item.records.length > 0 ? `${item.records.length} record${item.records.length === 1 ? '' : 's'}` : null,
    item.likes > 0 ? `${item.likes} like${item.likes === 1 ? '' : 's'}` : null,
    item.comments > 0 ? `${item.comments} comment${item.comments === 1 ? '' : 's'}` : null,
  ];
  return parts.filter(Boolean).join('. ');
}

/** The person's first name, for "Like Sam's workout". */
export const firstName = (person: FeedPerson) => person.displayName.trim().split(/\s+/)[0] ?? person.displayName;

/**
 * One side of Head to head, in your unit: the heaviest lift ("100 kg"), or
 * the most reps at body weight ("15 reps"), and the estimated 1-rep max
 * under it when there is one.
 */
export function bestLine(best: HeadToHeadBest, unit: WeightUnit): { main: string; under: string | null } {
  const weight = (kg: number) => formatWeight(Math.round(fromKg(kg, unit) * 2) / 2, unit);
  if (best.heaviestKg !== null) return { main: weight(best.heaviestKg), under: best.e1rmKg !== null ? `1-rep max ${weight(best.e1rmKg)}` : null };
  if (best.mostReps !== null) return { main: repsWords([best.mostReps]), under: null };
  return { main: '—', under: null };
}

/** Who's ahead on an exercise: the heavier lift, else the stronger set, else more reps; null for level, or nothing to compare. */
export function ahead(you: HeadToHeadBest, them: HeadToHeadBest): 'you' | 'them' | null {
  const pairs: Array<[number | null, number | null]> = [
    [you.heaviestKg, them.heaviestKg],
    [you.e1rmKg, them.e1rmKg],
    [you.mostReps, them.mostReps],
  ];
  for (const [a, b] of pairs) {
    if (a === null || b === null) continue;
    if (Math.abs(a - b) < 1e-9) continue;
    return a > b ? 'you' : 'them';
  }
  return null;
}
