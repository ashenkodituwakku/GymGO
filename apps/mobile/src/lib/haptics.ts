/**
 * Haptics, used sparingly so they mean something: a tick when a choice
 * changes, a tap when something opens, a success when something is kept.
 * No-ops on web, where there is nothing to feel.
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

export const haptic = {
  /** A filter chip, a segment, a sheet settling at a new height. */
  select: () => {
    if (on()) void Haptics.selectionAsync();
  },
  /** Opening a gym, tapping a pin. */
  tap: () => {
    if (on()) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },
  /** Saving a gym. */
  success: () => {
    if (on()) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
  /** Something the person asked for could not be done. */
  warn: () => {
    if (on()) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },
};
