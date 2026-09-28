/**
 * Room to leave at the bottom of a screen so nothing sits under the tab bar.
 *
 * The tab bar is GymGO's own floating glass capsule on every platform, so
 * the tabs layout says how much room it takes (including the home indicator)
 * through this context. Outside the tabs it's just the safe area.
 */

import { createContext, useContext } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const TabBarInset = createContext(0);

export function useBottomClearance(): number {
  const bar = useContext(TabBarInset);
  const insets = useSafeAreaInsets();
  return bar > 0 ? bar : insets.bottom;
}

/**
 * Room under a full page's scrolling content (not a tab): its own gap, plus
 * the phone's home indicator or navigation bar, so the last row can always
 * scroll clear of it.
 *
 * On iPhone, a scroll view with contentInsetAdjustmentBehavior="automatic"
 * (every page's) already keeps clear of the home indicator. Android draws
 * pages edge to edge, behind its navigation bar, which the page must clear
 * itself; so must a browser on a phone with a home indicator.
 */
export function useScreenBottom(gap = 32): number {
  const insets = useSafeAreaInsets();
  return Platform.OS === 'ios' ? gap : gap + insets.bottom;
}
