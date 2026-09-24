/**
 * Room to leave at the bottom of a screen so nothing sits under the tab bar.
 *
 * On phones the tab bar is the system's own. Each tab screen has its own
 * SafeAreaProvider, and the system counts the tab bar into that screen's
 * bottom safe area, so the inset already includes it. In the browser the tab
 * bar is GymGO's own floating one, so its height comes from this context.
 */

import { createContext, useContext } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const WebTabBarInset = createContext(0);

export function useBottomClearance(): number {
  const web = useContext(WebTabBarInset);
  const insets = useSafeAreaInsets();
  return Platform.OS === 'web' ? web + insets.bottom : insets.bottom;
}
