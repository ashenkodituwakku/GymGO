/**
 * Draws a screen again from scratch when the colours change (dark mode, an
 * accent), so every style and colour on it is read afresh.
 *
 * Only a screen's own content is drawn again, never the navigator: the
 * native screens, the stack you're in and the tab you're on stay exactly as
 * they were. (Rebuilding the whole navigator, as GymGO first did, threw the
 * native screens away and had to put the navigation back afterwards, which a
 * phone didn't always manage.)
 */

import { Fragment, useSyncExternalStore, type ReactNode } from 'react';
import { subscribeTheme, themeVersion } from '@/lib/theme';

/** The theme's version, redrawing whoever reads it when the colours change. */
export function useThemeVersion(): number {
  return useSyncExternalStore(subscribeTheme, themeVersion, themeVersion);
}

export function Redrawn({ children }: { children: ReactNode }) {
  const version = useThemeVersion();
  return <Fragment key={version}>{children}</Fragment>;
}
