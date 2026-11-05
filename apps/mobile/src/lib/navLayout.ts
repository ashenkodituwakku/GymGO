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
