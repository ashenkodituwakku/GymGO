/**
 * Draws a screen again from scratch when the colours change (dark mode, an
 * accent), so every style and colour on it is read afresh.
 *
 * Only a screen's own content is drawn again, never the navigator: the
 * native screens, the stack you're in and the tab you're on stay exactly as
 * they were. (Rebuilding the whole navigator, as GymGO first did, threw the
 * native screens away and had to put the navigation back afterwards, which a
 * phone didn't always manage.)
 *
 * The page keeps its place: where it was scrolled to is held here, outside
 * what's drawn again, and PageScroll goes back there. (Choosing an accent at
 * the foot of Appearance used to land you back at its top.)
 */

import { Fragment, createContext, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { subscribeTheme, themeVersion } from '@/lib/theme';

/** The theme's version, redrawing whoever reads it when the colours change. */
export function useThemeVersion(): number {
  return useSyncExternalStore(subscribeTheme, themeVersion, themeVersion);
}

/** How far a redrawn screen's page was scrolled, kept across the redraw. */
export const ScrollMemory = createContext<{ y: number } | null>(null);

export function Redrawn({ children }: { children: ReactNode }) {
  const version = useThemeVersion();
  const memory = useRef({ y: 0 }).current;
  return (
    <ScrollMemory.Provider value={memory}>
      <Fragment key={version}>{children}</Fragment>
    </ScrollMemory.Provider>
  );
}
