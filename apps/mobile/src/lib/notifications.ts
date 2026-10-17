/**
 * expo-notifications, loaded once and only on a phone, for GymGO's two kinds
 * of local notification: the rest timer's alert (restAlert.ts) and training
 * reminders (reminders.ts). Both are scheduled on the phone, never pushed
 * from a server.
 *
 * In Expo Go: on iPhone they work, and the module's warnings about push
 * notifications (sent from a server, which GymGO doesn't use) are kept out
 * of the app: each popped up over the workout the first time a rest began.
 * On Android, Expo Go can't load the module at all (Expo took its push half
 * out), so null comes back there until GymGO is a real build.
 */

import { LogBox, Platform } from 'react-native';

/** What expo-notifications says on loading in Expo Go: about push, which GymGO never uses. */
const EXPO_GO_PUSH_WARNINGS = ['`expo-notifications` functionality is not fully supported in Expo Go', 'expo-notifications: Android Push notifications'];

export type Notifications = typeof import('expo-notifications');

let loaded: Notifications | null | undefined;

/** The module, or null where it can't load (the web; Expo Go on Android). */
export function notifications(): Notifications | null {
  if (Platform.OS === 'web') return null;
  if (loaded === undefined) {
    LogBox.ignoreLogs(EXPO_GO_PUSH_WARNINGS);
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      loaded = require('expo-notifications') as Notifications;
      // With GymGO open, the screen says it (the rest bar; you're already here to train): no banner on top.
      loaded.setNotificationHandler({
        handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false }),
      });
      if (Platform.OS === 'android') {
        loaded.setNotificationChannelAsync('rest', { name: 'Rest timer', importance: loaded.AndroidImportance.HIGH, vibrationPattern: [0, 250, 150, 250] }).catch(() => undefined);
        loaded.setNotificationChannelAsync('reminders', { name: 'Training reminders', importance: loaded.AndroidImportance.DEFAULT }).catch(() => undefined);
      }
    } catch {
      loaded = null;
    }
  }
  return loaded;
}

/** Whether GymGO may notify, asking the first time (once: a no stays a no until Settings). */
export async function mayNotify(api: Notifications): Promise<boolean> {
  const permission = await api.getPermissionsAsync();
  if (permission.granted || permission.ios?.status === api.IosAuthorizationStatus.PROVISIONAL) return true;
  if (!permission.canAskAgain) return false;
  return (await api.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true } })).granted;
}
