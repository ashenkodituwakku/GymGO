/**
 * Haptics, used sparingly so they mean something: a tick when a choice
 * changes, a tap when something opens, a success when something is kept.
 * The buzz does nothing on web, where there is nothing to feel.
 *
 * Each also plays its quiet sound (lib/sounds.ts), on every device and in a
 * browser, so the whole app has sound; the Haptics and Sounds switches are
 * separate.
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { playSound } from './sounds';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';
let switchedOn = true;

/** The Haptics switch in Profile. */
export function setHapticsEnabled(on: boolean) {
  switchedOn = on;
}

const on = () => supported && switchedOn;

export const haptic = {
  /** A filter chip, a segment, a sheet settling at a new height. */
  select: () => {
    playSound('select');
    if (on()) void Haptics.selectionAsync();
  },
  /** Opening a gym, tapping a pin. */
  tap: () => {
    playSound('tap');
    if (on()) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },
  /** Saving a gym. */
  success: () => {
    playSound('success');
    if (on()) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
  /** Something the person asked for could not be done. */
  warn: () => {
    playSound('warn');
    if (on()) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },
};
