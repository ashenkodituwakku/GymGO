/**
 * Haptics, used sparingly so they mean something: a tick when a choice
 * changes, a tap when something opens, a success when something is kept.
 * The buzz does nothing on web, where there is nothing to feel.
 *
 * Felt, not heard: buttons make no sound (lib/sounds.ts keeps sounds for
 * the collection's moments).
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';
let switchedOn = true;

/** The Haptics switch in Profile. */
export function setHapticsEnabled(on: boolean) {
  switchedOn = on;
}

const on = () => supported && switchedOn;

/**
 * Plays one. On Android, the system's own haptics: crisp, as on iPhone, and
 * off when the phone's touch feedback is. The rest of expo-haptics drives
 * Android's vibration motor, a soft 50 ms buzz for every tick that ignores
 * that setting; it's kept only for a phone too old for the system's kind.
 * One that can't play is dropped quietly: unanswered, a failed one was an
 * unhandled rejection, a warning over the app while developing.
 */
function play(android: Haptics.AndroidHaptics, other: () => Promise<void>) {
  if (!on()) return;
  const played = Platform.OS === 'android' ? Haptics.performAndroidHapticsAsync(android).catch(other) : other();
  played.catch(() => undefined);
}

export const haptic = {
  /** A filter chip, a segment, a sheet settling at a new height. */
  select: () => play(Haptics.AndroidHaptics.Clock_Tick, () => Haptics.selectionAsync()),
  /** Opening a gym, tapping a pin. */
  tap: () => play(Haptics.AndroidHaptics.Context_Click, () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Saving a gym. */
  success: () => play(Haptics.AndroidHaptics.Confirm, () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** Something the person asked for could not be done. */
  warn: () => play(Haptics.AndroidHaptics.Reject, () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
