/**
 * Putting a planned visit in your calendar (lib/calendar.ts makes the
 * event). A phone opens its own calendar's new-event screen, filled in, for
 * you to save or cancel: GymGO never reads your calendar or adds anything
 * without that. A browser downloads it as an .ics file, which any calendar
 * app opens.
 */

import { Platform } from 'react-native';
import { icsFileName, icsFor, type VisitEvent } from './calendar';

export type CalendarOutcome = 'saved' | 'downloaded' | 'cancelled' | 'failed';

export async function addVisitToCalendar(event: VisitEvent, file: { gymId: string; date: string }): Promise<CalendarOutcome> {
  if (Platform.OS === 'web') {
    if (typeof document === 'undefined') return 'failed';
    const url = URL.createObjectURL(new Blob([icsFor(event, `${file.gymId}-${event.startsAt.getTime()}@gymgo`)], { type: 'text/calendar' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = icsFileName(file.gymId, file.date);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return 'downloaded';
  }
  try {
    // Loaded when someone adds a visit, not when the app starts.
    const { createEventInCalendarAsync } = require('expo-calendar/legacy') as typeof import('expo-calendar/legacy');
    const result = await createEventInCalendarAsync({
      title: event.title,
      startDate: event.startsAt,
      endDate: event.endsAt,
      location: event.location,
      notes: event.notes,
    });
    return result.action === 'canceled' ? 'cancelled' : 'saved';
  } catch {
    return 'failed';
  }
}
