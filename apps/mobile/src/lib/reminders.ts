/**
 * Training reminders: a notification on the days you pick, at the time you
 * pick, every week ("Time to train"). Scheduled on the phone with
 * expo-notifications as repeating weekly ones, so they come with GymGO
 * closed and nothing is sent from a server. Your choice is kept on the
 * device; turning reminders off keeps the days and time for next time.
 *
 * Phones only: a browser can't wake itself, and Expo Go on Android can't
 * load the notifications module (notifications.ts).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { timeLabel } from './copy';
import { mayNotify, notifications } from './notifications';

export interface Reminders {
  on: boolean;
  /** Days of the week, 0 Sunday to 6 Saturday (as Date's getDay). */
  days: number[];
  /** Minutes after midnight, on the phone's own clock. */
  minute: number;
}

const KEY = 'gymgo.reminders.v1';
/** What a reminder carries, so GymGO finds its own among whatever's scheduled. */
const KIND = 'gymgo-training-reminder';

/** Three days a week, early evening: where most people's week is. */
export const DEFAULT_REMINDERS: Reminders = { on: false, days: [1, 3, 5], minute: 18 * 60 };

/** Monday first, as GymGO's weeks are. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** What was kept, or the default when there's nothing (or it's damaged). */
export function parseReminders(raw: string | null): Reminders {
  try {
    const value = raw ? (JSON.parse(raw) as Partial<Reminders>) : null;
    if (!value || typeof value !== 'object') return DEFAULT_REMINDERS;
    const days = Array.isArray(value.days) ? [...new Set(value.days.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))] : DEFAULT_REMINDERS.days;
    const minute = Number.isInteger(value.minute) && value.minute! >= 0 && value.minute! < 1440 ? value.minute! : DEFAULT_REMINDERS.minute;
    return { on: value.on === true && days.length > 0, days: sortDays(days), minute };
  } catch {
    return DEFAULT_REMINDERS;
  }
}

/** Monday to Sunday. */
export const sortDays = (days: number[]): number[] => WEEK_ORDER.filter((day) => days.includes(day));

/** expo-notifications' weekly triggers: its weekday counts 1 for Sunday to 7 for Saturday. */
export function weeklyTriggers(reminders: Reminders): Array<{ weekday: number; hour: number; minute: number }> {
  if (!reminders.on) return [];
  return sortDays(reminders.days).map((day) => ({ weekday: day + 1, hour: Math.floor(reminders.minute / 60), minute: reminders.minute % 60 }));
}

/** "Mon, Wed and Fri"; "Every day"; "Weekdays"; "Weekends". */
export function reminderDays(given: number[]): string {
  const days = sortDays(given);
  if (days.length === 7) return 'Every day';
  if (days.length === 5 && [1, 2, 3, 4, 5].every((day) => days.includes(day))) return 'Weekdays';
  if (days.length === 2 && days.includes(6) && days.includes(0)) return 'Weekends';
  const names = days.map((day) => SHORT[day]!);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : (names[0] ?? '');
}

/** "Mon, Wed and Fri at 6 pm"; "Every day at 7 am"; "Weekdays at 6:30 am". */
export function remindersLine(reminders: Pick<Reminders, 'days' | 'minute'>): string {
  return `${reminderDays(reminders.days)} at ${timeLabel(reminders.minute)}`;
}

/** What the notification says. */
export const REMINDER_TEXT = { title: 'Time to train', body: 'Your workout’s waiting. Open GymGO to start it.' };

export async function loadReminders(): Promise<Reminders> {
  try {
    return parseReminders(await AsyncStorage.getItem(KEY));
  } catch {
    return DEFAULT_REMINDERS;
  }
}

/** Whether this phone can have reminders at all. */
export const remindersPossible = (): boolean => notifications() !== null;

export type ReminderOutcome = 'on' | 'off' | 'denied' | 'unavailable';

/**
 * Keep the choice and set the phone's notifications to match: the old ones
 * taken away, the new ones scheduled. Asks for permission the first time
 * they're turned on; refused, they stay off.
 */
export async function applyReminders(reminders: Reminders): Promise<ReminderOutcome> {
  const api = notifications();
  if (!api) return 'unavailable';
  try {
    const all = await api.getAllScheduledNotificationsAsync();
    await Promise.all(all.filter((item) => item.content.data?.kind === KIND).map((item) => api.cancelScheduledNotificationAsync(item.identifier).catch(() => undefined)));
    const triggers = weeklyTriggers(reminders);
    if (triggers.length === 0) {
      await AsyncStorage.setItem(KEY, JSON.stringify({ ...reminders, on: false })).catch(() => undefined);
      return 'off';
    }
    if (!(await mayNotify(api))) {
      await AsyncStorage.setItem(KEY, JSON.stringify({ ...reminders, on: false })).catch(() => undefined);
      return 'denied';
    }
    for (const trigger of triggers) {
      await api.scheduleNotificationAsync({
        content: { ...REMINDER_TEXT, sound: true, data: { kind: KIND } },
        trigger: { type: api.SchedulableTriggerInputTypes.WEEKLY, ...trigger, channelId: 'reminders' },
      });
    }
    await AsyncStorage.setItem(KEY, JSON.stringify(reminders)).catch(() => undefined);
    return 'on';
  } catch {
    return 'unavailable';
  }
}
