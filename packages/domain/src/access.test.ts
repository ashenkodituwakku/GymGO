/**
 * Access rules. These encode the acceptance criteria that a wrong answer
 * would send someone across town for nothing.
 */

import { describe, expect, it } from 'vitest';
import { evaluateVisitorAccess } from './access';
import { zonedTimeToInstant } from './time';
import {
  NOW,
  SYDNEY,
  checked,
  daysAgo,
  everyDayWindows,
  location,
  prerequisites,
  record,
  schedule,
  weekdayWindows,
} from './testing';

const at = (date: string, minute: number) => zonedTimeToInstant(date, minute, SYDNEY);
/** Tuesday 23 September 2026, 7pm Sydney time. */
const SEVEN_PM = at('2026-09-23', 19 * 60);

function reasonCodes(result: { reasons: Array<{ code: string }> }): string[] {
  return result.reasons.map((reason) => reason.code);
}

describe('visitor access', () => {
  it('does not admit a 7pm visitor to a 24-hour member gym whose guest entry ends at 4pm', () => {
    const gym = record({
      schedules: [
        schedule('member', { alwaysOpen: true }),
        schedule('visitor', { windows: weekdayWindows(9 * 60, 16 * 60) }),
        schedule('staffed', { windows: weekdayWindows(9 * 60, 16 * 60) }),
      ],
    });

    const result = evaluateVisitorAccess(gym, SEVEN_PM, { asOf: NOW });

    expect(result.verdict).toBe('not_admitted');
    expect(reasonCodes(result)).toContain('outside_visitor_hours');
    // The 24-hour member door must not leak into the answer.
    expect(result.reasons.find((r) => r.code === 'outside_visitor_hours')?.message).toContain(
      'Next guest entry',
    );
  });

  it('treats unknown visitor hours as unknown even when members have 24-hour access', () => {
    const gym = record({
      schedules: [
        schedule('member', { alwaysOpen: true }),
        schedule('visitor', { provenance: { status: 'unknown', sources: [], conflictNote: null } }),
      ],
    });

    const result = evaluateVisitorAccess(gym, SEVEN_PM, { asOf: NOW });

    expect(result.verdict).toBe('needs_confirmation');
    const reason = result.reasons.find((r) => r.code === 'visitor_hours_unknown');
    expect(reason?.message).toContain('Members have 24-hour access');
  });

  it('admits a visitor inside guest hours when every prerequisite is resolved', () => {
    const gym = record({
      schedules: [schedule('visitor', { windows: everyDayWindows(6 * 60, 22 * 60) })],
      prerequisites: prerequisites(),
    });

    const result = evaluateVisitorAccess(gym, SEVEN_PM, { asOf: NOW });

    expect(result.verdict).toBe('admits_visitor');
  });

  it('needs confirmation when an induction is required, even during guest hours', () => {
    const gym = record({
      schedules: [schedule('visitor', { windows: everyDayWindows(6 * 60, 22 * 60) })],
      prerequisites: prerequisites({ inductionRequired: 'yes' }),
    });

    const result = evaluateVisitorAccess(gym, SEVEN_PM, { asOf: NOW });

    expect(result.verdict).toBe('needs_confirmation');
    expect(reasonCodes(result)).toContain('induction_required');
  });

  it('needs confirmation when booking is required, and says so when the lead time cannot be met', () => {
    const gym = record({
      schedules: [schedule('visitor', { windows: everyDayWindows(6 * 60, 22 * 60) })],
      prerequisites: prerequisites({ advanceBookingRequired: 'yes', bookingLeadTimeHours: 48 }),
    });

    const result = evaluateVisitorAccess(gym, SEVEN_PM, { asOf: NOW });

    expect(result.verdict).toBe('needs_confirmation');
    const reason = result.reasons.find((r) => r.code === 'booking_required');
    expect(reason?.message).toContain('confirm with the gym before travelling');
  });

  it('needs confirmation when a prerequisite is simply unestablished', () => {
    const gym = record({
      schedules: [schedule('visitor', { windows: everyDayWindows(6 * 60, 22 * 60) })],
      prerequisites: prerequisites({ inductionRequired: 'unknown' }),
    });

    expect(evaluateVisitorAccess(gym, SEVEN_PM, { asOf: NOW }).verdict).toBe('needs_confirmation');
  });

  it('flags an induction that can only happen while reception is staffed', () => {
    const gym = record({
      schedules: [
        schedule('visitor', { windows: everyDayWindows(6 * 60, 22 * 60) }),
        schedule('staffed', { windows: weekdayWindows(9 * 60, 17 * 60) }),
      ],
      prerequisites: prerequisites({
        inductionRequired: 'yes',
        inductionAvailableDuringStaffedHoursOnly: 'yes',
      }),
    });

    const reason = evaluateVisitorAccess(gym, SEVEN_PM, { asOf: NOW }).reasons.find(
      (r) => r.code === 'induction_required',
    );
    expect(reason?.message).toContain('Reception is not staffed');
  });

  it('rules out a temporarily closed gym', () => {
    const gym = record({
      location: location({
        operatingStatus: 'temporarily_closed',
        operatingStatusNote: 'Closed for a floor refit until October.',
      }),
      schedules: [schedule('visitor', { windows: everyDayWindows(0, 1440) })],
    });

    const result = evaluateVisitorAccess(gym, SEVEN_PM, { asOf: NOW });
    expect(result.verdict).toBe('not_admitted');
    expect(result.reasons[0]?.message).toContain('floor refit');
  });

  it('asks for confirmation when visitor hours are past the recheck target', () => {
    const gym = record({
      schedules: [
        schedule('visitor', {
          windows: everyDayWindows(6 * 60, 22 * 60),
          provenance: checked(100),
        }),
      ],
    });

    const result = evaluateVisitorAccess(gym, SEVEN_PM, { asOf: NOW });
    expect(result.verdict).toBe('needs_confirmation');
    expect(reasonCodes(result)).toContain('visitor_hours_stale');
  });

  it('admits a visitor inside an overnight window that started the previous day', () => {
    const gym = record({
      schedules: [
        schedule('visitor', {
          // Friday 20:00 through to 02:00 Saturday.
          windows: [{ day: 5, openMinute: 20 * 60, closeMinute: 26 * 60 }],
        }),
      ],
    });

    // Saturday 26 September 2026, 1am Sydney time.
    const oneAmSaturday = at('2026-09-26', 60);
    expect(evaluateVisitorAccess(gym, oneAmSaturday, { asOf: NOW }).verdict).toBe('admits_visitor');

    // Saturday 3am is past the window's close.
    const threeAmSaturday = at('2026-09-26', 3 * 60);
    expect(evaluateVisitorAccess(gym, threeAmSaturday, { asOf: NOW }).verdict).toBe('not_admitted');
  });

  it('applies a dated exception over the weekly pattern', () => {
    const gym = record({
      schedules: [
        schedule('visitor', {
          windows: everyDayWindows(6 * 60, 22 * 60),
          exceptions: [
            {
              date: '2026-09-23',
              closed: true,
              openMinute: null,
              closeMinute: null,
              note: 'Closed for a public holiday.',
            },
          ],
        }),
      ],
    });

    const result = evaluateVisitorAccess(gym, SEVEN_PM, { asOf: NOW });
    expect(result.verdict).toBe('not_admitted');
    expect(result.reasons[0]?.message).toContain('public holiday');
  });

  it('records a stale check date without changing what the fact says', () => {
    const gym = record({
      schedules: [
        schedule('visitor', { windows: everyDayWindows(6 * 60, 22 * 60), provenance: checked(100) }),
      ],
    });
    const result = evaluateVisitorAccess(gym, SEVEN_PM, { asOf: NOW });
    // Still open at 7pm as far as anyone knows — just not freshly confirmed.
    expect(result.visitorOpen?.open).toBe(true);
    expect(result.freshness?.state).toBe('stale');
    expect(result.freshness?.lastCheckedAt).toBe(daysAgo(100));
  });
});
