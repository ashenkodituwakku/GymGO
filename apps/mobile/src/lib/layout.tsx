/**
 * Room to leave at the bottom of a screen so nothing sits under the tab bar.
 *
 * The tab bar is GymGO's own floating glass capsule on every platform, so
 * the tabs layout says how much room it takes (including the home indicator)
 * through this context. Outside the tabs it's just the safe area.
 */

import { createContext, useContext } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const TabBarInset = createContext(0);

export function useBottomClearance(): number {
  const bar = useContext(TabBarInset);
  const insets = useSafeAreaInsets();
  return bar > 0 ? bar : insets.bottom;
}
