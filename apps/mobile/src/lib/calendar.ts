/**
 * A planned visit to a gym as a calendar event: when (the visit time you're
 * searching for, on the gym's own clock), where (its address), and in the
 * notes what GymGO knows about getting in and what to ask if it doesn't.
 * As a standard .ics file for a browser to download; a phone hands the same
 * event to its own calendar (lib/addToCalendar.ts).
 *
 * No React Native imports here, so it is unit-tested in Node.
 */

import { zonedTimeToInstant, type IsoDate, type TimeZone } from '@gymgo/domain';

export interface VisitEvent {
  title: string;
  startsAt: Date;
  endsAt: Date;
  location: string;
  notes: string;
}

/** How long a visit is put in the calendar for. */
export const VISIT_MINUTES = 75;

export function visitEvent({
  gymName,
  address,
  date,
  minute,
  timezone,
  answer,
  questions,
}: {
  gymName: string;
  address: string[];
  date: IsoDate;
  minute: number;
  timezone: TimeZone;
  /** The answer for this visit, as the card says it ("Good to go · Guests welcome at 4 pm"). */
  answer: string;
  /** What to ask when you call, when the answer isn't confirmed. */
  questions: string[];
}): VisitEvent {
  const startsAt = zonedTimeToInstant(date, minute, timezone);
  const notes = [
    answer,
    questions.length > 0 ? `When you call, ask:\n${questions.map((question, index) => `${index + 1}. ${question}`).join('\n')}` : null,
    'Planned with GymGO. Gyms change their hours and prices: check with the gym before you go.',
  ]
    .filter(Boolean)
    .join('\n\n');
  return {
    title: `Gym: ${gymName}`,
    startsAt,
    endsAt: new Date(startsAt.getTime() + VISIT_MINUTES * 60_000),
    location: address.join(', '),
    notes,
  };
}

/** "20261008T060000Z": a moment in UTC, as calendars write one. */
const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** Text as an .ics value: backslashes, commas, semicolons and line breaks escaped. */
const text = (value: string) => value.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Lines longer than 75 characters folded onto continuation lines, as the format asks. */
function fold(line: string): string {
  const chars = [...line];
  if (chars.length <= 75) return line;
  const parts: string[] = [];
  for (let at = 0; at < chars.length; at += at === 0 ? 75 : 74) parts.push(chars.slice(at, at + (at === 0 ? 75 : 74)).join(''));
  return parts.join('\r\n ');
}

export function icsFor(event: VisitEvent, uid: string, now: Date = new Date()): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GymGO//Visit//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(event.startsAt)}`,
    `DTEND:${stamp(event.endsAt)}`,
    `SUMMARY:${text(event.title)}`,
    `LOCATION:${text(event.location)}`,
    `DESCRIPTION:${text(event.notes)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .map(fold)
    .join('\r\n')
    .concat('\r\n');
}

/** A file name for the event: "gym-carlton-fitness-2026-10-08.ics". */
export const icsFileName = (gymId: string, date: IsoDate) => `gym-${gymId.replace(/[^a-z0-9-]/gi, '').slice(0, 60)}-${date}.ics`;
