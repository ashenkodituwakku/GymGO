/**
 * The rest timer's alert for when the phone is locked or GymGO is in the
 * background: a local notification set for the moment the rest ends
 * (expo-notifications), moved when the rest changes, and taken away when
 * it's skipped or the workout ends. With GymGO open, the rest bar buzzes
 * instead, so the notification isn't shown on top of it.
 *
 * The phone asks once whether GymGO may send notifications, the first time
 * a rest starts; say no and the timer just works as before. Nothing leaves
 * the phone: these are scheduled on it, not pushed from a server.
 *
 * Not on the web (a browser tab keeps its own timer), and not a Live
 * Activity on the lock screen: that needs a build of GymGO made for the
 * App Store, which Expo Go can't run.
 *
 * In Expo Go: on iPhone the alert works, and the module's warnings about
 * push notifications (sent from a server, which GymGO doesn't use) are kept
 * out of the app: each popped up over the workout the first time a rest
 * began. On Android, Expo Go can't load the notifications module at all
 * (Expo took its push half out), so the alert is off there until GymGO is
 * a real build; the timer on screen still buzzes.
 */

import { LogBox, Platform } from 'react-native';

/** What expo-notifications says on loading in Expo Go: about push, which GymGO never uses. */
const EXPO_GO_PUSH_WARNINGS = ['`expo-notifications` functionality is not fully supported in Expo Go', 'expo-notifications: Android Push notifications'];

type Notifications = typeof import('expo-notifications');

let loaded: Notifications | null | undefined;
let scheduled: string | null = null;
/** The latest request wins: an older one finishing late doesn't schedule over it. */
let generation = 0;

/** Loaded only on phones, and set up once. */
function notifications(): Notifications | null {
  if (Platform.OS === 'web') return null;
  if (loaded === undefined) {
    LogBox.ignoreLogs(EXPO_GO_PUSH_WARNINGS);
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      loaded = require('expo-notifications') as Notifications;
      // With GymGO open, the rest bar says it: no banner on top.
      loaded.setNotificationHandler({
        handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false }),
      });
      if (Platform.OS === 'android') {
        void loaded.setNotificationChannelAsync('rest', { name: 'Rest timer', importance: loaded.AndroidImportance.HIGH, vibrationPattern: [0, 250, 150, 250] });
      }
    } catch {
      loaded = null;
    }
  }
  return loaded;
}

/** Whole seconds until the rest ends, or null when it's too close to bother (or past). */
export function secondsUntil(endsAt: number, now: number): number | null {
  const seconds = Math.round((endsAt - now) / 1000);
  return seconds >= 3 ? seconds : null;
}

/** What the alert says. */
export function restAlertText(next: string | null): { title: string; body: string } {
  return { title: 'Rest’s up', body: next ? `Next: ${next}` : 'Time for your next set.' };
}

/** Set (or move) the alert for a rest ending at `endsAt`. */
export async function scheduleRestAlert(endsAt: number, next: string | null = null): Promise<void> {
  const api = notifications();
  if (!api) return;
  const mine = ++generation;
  await cancelScheduled(api);
  const seconds = secondsUntil(endsAt, Date.now());
  if (seconds === null) return;
  try {
    const permission = await api.getPermissionsAsync();
    let allowed = permission.granted || permission.ios?.status === api.IosAuthorizationStatus.PROVISIONAL;
    if (!allowed && permission.canAskAgain) allowed = (await api.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true } })).granted;
    if (!allowed || mine !== generation) return;
    const text = restAlertText(next);
    scheduled = await api.scheduleNotificationAsync({
      content: { ...text, sound: true },
      trigger: { type: api.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, repeats: false, channelId: 'rest' },
    });
  } catch {
    // No alert this time; the timer on screen still runs.
  }
}

async function cancelScheduled(api: Notifications): Promise<void> {
  const id = scheduled;
  scheduled = null;
  if (id) await api.cancelScheduledNotificationAsync(id).catch(() => undefined);
}

/** Take the alert away: the rest was skipped, or the workout ended. */
export async function cancelRestAlert(): Promise<void> {
  const api = notifications();
  if (!api) return;
  generation++;
  await cancelScheduled(api);
}
