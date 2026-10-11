import { describe, expect, it } from 'vitest';
import { icsFileName, icsFor, visitEvent } from './calendar';

const event = visitEvent({
  gymName: 'Carlton Fitness',
  address: ['Level 1, 657 Nicholson Street', 'Carlton North VIC 3054'],
  date: '2026-10-08',
  minute: 16 * 60,
  timezone: 'Australia/Melbourne',
  answer: 'Call first · Call to check guest entry',
  questions: ['Can a visitor walk in at 4 pm?', 'How much is one visit, all in?'],
});

describe('a visit as a calendar event', () => {
  it('starts at the visit time on the gym’s own clock, for 75 minutes', () => {
    // 4 pm in Melbourne on 8 October 2026 is daylight time, UTC+11: 05:00 UTC.
    expect(event.startsAt.toISOString()).toBe('2026-10-08T05:00:00.000Z');
    expect(event.endsAt.toISOString()).toBe('2026-10-08T06:15:00.000Z');
    expect(event.title).toBe('Gym: Carlton Fitness');
    expect(event.location).toBe('Level 1, 657 Nicholson Street, Carlton North VIC 3054');
  });

  it('carries the answer and what to ask in its notes', () => {
    expect(event.notes).toContain('Call first · Call to check guest entry');
    expect(event.notes).toContain('When you call, ask:\n1. Can a visitor walk in at 4 pm?\n2. How much is one visit, all in?');
    const confirmed = visitEvent({ gymName: 'X', address: [], date: '2026-10-08', minute: 600, timezone: 'UTC', answer: 'Good to go', questions: [] });
    expect(confirmed.notes).not.toContain('When you call');
  });

  it('writes a valid .ics file, escaped and folded', () => {
    const ics = icsFor(event, 'visit-1@gymgo', new Date('2026-10-01T00:00:00Z'));
    const lines = ics.split('\r\n');
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines).toContain('DTSTART:20261008T050000Z');
    expect(lines).toContain('DTEND:20261008T061500Z');
    expect(lines).toContain('DTSTAMP:20261001T000000Z');
    expect(lines).toContain('LOCATION:Level 1\\, 657 Nicholson Street\\, Carlton North VIC 3054');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    // No line over 75 characters; continuations start with a space.
    for (const line of lines) expect([...line].length).toBeLessThanOrEqual(75);
    const unfolded = ics.replace(/\r\n /g, '');
    expect(unfolded).toContain('DESCRIPTION:Call first · Call to check guest entry\\n\\nWhen you call\\, ask:\\n1. Can a visitor walk in at 4 pm?');
  });

  it('names the file after the gym and day', () => {
    expect(icsFileName('carlton-fitness', '2026-10-08')).toBe('gym-carlton-fitness-2026-10-08.ics');
  });
});
