/**
 * How you get around GymGO (Appearance → Layout): the floating tab bar at
 * the foot of the screen, the default, or a sidebar menu. The sidebar stays
 * open down the left of a wide screen; on a phone it slides in from a Menu
 * button at the foot.
 *
 * No React Native here, so it is unit-tested in Node.
 */

export type NavLayout = 'tabs' | 'sidebar';

/** From this width (points) the sidebar stays open beside the page. */
export const SIDEBAR_WIDE = 960;
export const SIDEBAR_WIDTH = 248;
/** The Menu button's height, on a phone in the sidebar layout. */
export const MENU_BUTTON = 48;

/** The tab bar; the sidebar always open beside the page; or the sidebar behind a Menu button. */
export type NavMode = 'tabs' | 'docked' | 'drawer';

export function navMode(layout: NavLayout, width: number): NavMode {
  if (layout !== 'sidebar') return 'tabs';
  return width >= SIDEBAR_WIDE ? 'docked' : 'drawer';
}

/** The pages the docked sidebar steps aside for: the welcome tour, which is the whole screen. */
const SIDEBAR_STEPS_ASIDE = new Set(['/welcome']);

/**
 * Whether the docked sidebar is beside this page. Once you're in it stays
 * beside every page, as an iPad's does, not only the four tabs: Progress
 * opened from it used to cover it, leaving a back button to find your way.
 */
export function dockedBeside(mode: NavMode, pathname: string, signedIn: boolean): boolean {
  return mode === 'docked' && signedIn && !SIDEBAR_STEPS_ASIDE.has(pathname);
}

/** The pages where the docked sidebar folds away to a small capsule: the map, which wants the room. */
const SIDEBAR_FOLDS_AWAY = new Set(['/explore']);

/** How far in from the window's left edge the folded sidebar's capsule reaches: its 16-point gap and its 44-point width. */
export const SIDEBAR_FOLDED = 60;

/** Whether the docked sidebar is folded away to its capsule on this page (it opens over the page from there). */
export function foldedOn(mode: NavMode, pathname: string, signedIn: boolean): boolean {
  return dockedBeside(mode, pathname, signedIn) && SIDEBAR_FOLDS_AWAY.has(pathname);
}

/** How far in from the left the sidebar reaches over this page, for its content to keep clear of: all of it, its capsule, or nothing. */
export function sidebarInset(mode: NavMode, pathname: string, signedIn: boolean): number {
  if (!dockedBeside(mode, pathname, signedIn)) return 0;
  return SIDEBAR_FOLDS_AWAY.has(pathname) ? SIDEBAR_FOLDED : SIDEBAR_WIDTH;
}

/** What the sidebar lists. Tabs first, then the places you'd go most from Profile. */
export interface SidebarItem {
  href: string;
  label: string;
  /** One of the four tabs (a Phosphor icon, as in the tab bar), or a page over them (an Icon). */
  tab: boolean;
}

export const SIDEBAR_TABS: readonly SidebarItem[] = [
  { href: '/', label: 'Home', tab: true },
  { href: '/explore', label: 'Explore', tab: true },
  { href: '/saved', label: 'Saved', tab: true },
  { href: '/profile', label: 'Profile', tab: true },
];

export const SIDEBAR_TRAINING: readonly SidebarItem[] = [
  { href: '/train', label: 'Workout', tab: false },
  { href: '/progress', label: 'Progress', tab: false },
  { href: '/workouts', label: 'My workouts', tab: false },
  { href: '/programme', label: 'Programme', tab: false },
];

export const SIDEBAR_YOU: readonly SidebarItem[] = [
  { href: '/collection', label: 'Collection', tab: false },
  { href: '/friends', label: 'Friends', tab: false },
  { href: '/appearance', label: 'Appearance', tab: false },
];

/** The tab a path is on (Home only for "/" itself), or null for a page over the tabs. */
export function tabFor(pathname: string): string | null {
  const found = SIDEBAR_TABS.find((tab) => (tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)));
  return found?.href ?? null;
}
