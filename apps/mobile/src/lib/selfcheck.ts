/**
 * A startup check that the device can do the time-zone arithmetic the
 * visitor-hours rules depend on.
 *
 * Every "can I get in at 7 pm?" answer runs through Intl.DateTimeFormat with an
 * IANA time zone. Node and browsers ship full ICU; a JavaScript engine on a
 * phone may not. If this check fails the app says so on screen rather than
 * quietly showing guest-entry answers that could be an hour out — the kind of
 * confident wrong answer this product exists to avoid.
 */

import { localMinuteOfDay, zonedTimeToInstant } from '@gymgo/domain';

export interface SelfCheck {
  ok: boolean;
  detail: string;
}

export function checkTimeZoneSupport(): SelfCheck {
  try {
    // 19:00 on 22 September 2026 in Sydney is 09:00 UTC (AEST, UTC+10).
    const winter = zonedTimeToInstant('2026-09-22', 19 * 60, 'Australia/Sydney').toISOString();
    // 19:00 on 22 December 2026 is 08:00 UTC (AEDT, daylight saving).
    const summer = zonedTimeToInstant('2026-12-22', 19 * 60, 'Australia/Sydney').toISOString();
    const roundTrip = localMinuteOfDay(new Date('2026-09-22T09:00:00.000Z'), 'Australia/Sydney');

    if (winter !== '2026-09-22T09:00:00.000Z') {
      return { ok: false, detail: `Standard-time conversion gave ${winter}.` };
    }
    if (summer !== '2026-12-22T08:00:00.000Z') {
      return { ok: false, detail: `Daylight-saving conversion gave ${summer}.` };
    }
    if (roundTrip !== 19 * 60) {
      return { ok: false, detail: `Reading local time gave minute ${roundTrip}.` };
    }
    // The rest of the world too: a northern summer (New York, EDT, UTC−4) and
    // a half-hour zone (India, UTC+5:30), where rounding to the hour breaks.
    const north = zonedTimeToInstant('2026-07-01', 7 * 60, 'America/New_York').toISOString();
    if (north !== '2026-07-01T11:00:00.000Z') {
      return { ok: false, detail: `Northern daylight-saving conversion gave ${north}.` };
    }
    const half = localMinuteOfDay(new Date('2026-09-22T12:00:00.000Z'), 'Asia/Kolkata');
    if (half !== 17 * 60 + 30) {
      return { ok: false, detail: `A half-hour time zone gave minute ${half}.` };
    }
    return { ok: true, detail: 'Time-zone support verified.' };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : 'Time-zone support failed.' };
  }
}
