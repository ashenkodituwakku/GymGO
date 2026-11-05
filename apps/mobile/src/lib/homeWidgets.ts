/**
 * Home's widgets: what each is, the order Home starts in, and the rules for
 * changing it (Customise Home: Home's own edit mode, components/HomeEditor.tsx). Kept on the device
 * (lib/homeLayout.ts). The search, a workout under way and the gym you're
 * at aren't widgets: they always come first.
 *
 * No React Native here, so it's unit-tested in Node.
 */

import type { IconName } from '@/components/Icon';

export type HomeWidgetId =
  | 'shortcuts'
  | 'workout'
  | 'finders'
  | 'weather'
  | 'weatherHours'
  | 'week'
  | 'collection'
  | 'lastWorkout'
  | 'month'
  | 'recovery'
  | 'bodyWeight'
  | 'tools'
  | 'nearby'
  | 'saved'
  | 'recent'
  | 'browse'
  | 'cities';

export type HomeWidgetGroup = 'Finding a gym' | 'Training' | 'Weather' | 'You';

export interface HomeWidget {
  id: HomeWidgetId;
  title: string;
  /** What it shows, for Customise Home. */
  detail: string;
  icon: IconName;
  group: HomeWidgetGroup;
  /** It shows only once there's something in it (a saved gym, a viewed one). */
  whenThere?: string;
  /** It needs GymGO's server (an account, the weather), so the limited website has none. */
  needsServer?: boolean;
  /** A section of the page rather than a card of its own: framed while editing, so it has edges to hold. */
  bare?: boolean;
}

export const HOME_WIDGETS: readonly HomeWidget[] = [
  { id: 'shortcuts', title: 'Quick searches', detail: 'Near me, early start, after work and under a price', icon: 'search', group: 'Finding a gym' },
  { id: 'nearby', title: 'Gyms near you', detail: 'The gyms where you’re searching, for your visit time', icon: 'pin', group: 'Finding a gym', bare: true },
  { id: 'finders', title: 'Machines and trips', detail: 'Who has the machine you want, and gyms where you’re going', icon: 'target', group: 'Finding a gym' },
  { id: 'saved', title: 'Saved gyms', detail: 'The gyms you saved', icon: 'saved', group: 'Finding a gym', whenThere: 'Shows once you’ve saved a gym.', bare: true },
  { id: 'recent', title: 'Recently viewed', detail: 'Gyms you looked at lately', icon: 'history', group: 'Finding a gym', whenThere: 'Shows once you’ve opened a gym.', bare: true },
  { id: 'browse', title: 'Browse suburbs', detail: 'Neighbourhoods of the city you’re in', icon: 'map', group: 'Finding a gym', bare: true },
  { id: 'cities', title: 'Other cities', detail: 'Cities GymGO knows, your country’s first', icon: 'globe', group: 'Finding a gym', bare: true },
  { id: 'workout', title: 'Workout', detail: 'Build a workout, and what’s up next on your plan', icon: 'workout', group: 'Training' },
  { id: 'lastWorkout', title: 'Last workout', detail: 'What you did last time, and Do it again', icon: 'refresh', group: 'Training', needsServer: true },
  { id: 'week', title: 'This week', detail: 'Workouts this week and your streak', icon: 'flame', group: 'Training', needsServer: true, whenThere: 'Shows once you’ve logged a workout.' },
  { id: 'month', title: 'This month', detail: 'Workouts, time, weight lifted and records this month', icon: 'calendar', group: 'Training', needsServer: true },
  { id: 'recovery', title: 'Muscles trained', detail: 'When you last trained each muscle, from your log', icon: 'person', group: 'Training', needsServer: true },
  { id: 'tools', title: 'Tools', detail: 'Interval timer, plate calculator, 1-rep max and exercises', icon: 'timer', group: 'Training' },
  { id: 'weather', title: 'Weather', detail: 'The weather where you’re searching, in one line', icon: 'thermometer', group: 'Weather', needsServer: true },
  { id: 'weatherHours', title: 'Weather by the hour', detail: 'Now and the next six hours', icon: 'clock', group: 'Weather', needsServer: true },
  { id: 'collection', title: 'Collection', detail: 'The gyms you’ve checked in at', icon: 'cards', group: 'You', needsServer: true, whenThere: 'Shows once you’ve checked in at a gym.' },
  { id: 'bodyWeight', title: 'Body weight', detail: 'Your latest weigh-in and how it’s changed', icon: 'body', group: 'You' },
];

export const HOME_GROUPS: readonly HomeWidgetGroup[] = ['Finding a gym', 'Training', 'Weather', 'You'];

/** Home as it comes: what it showed before it could be changed, with the weather in a line. */
export const DEFAULT_HOME: readonly HomeWidgetId[] = ['shortcuts', 'workout', 'finders', 'weather', 'week', 'collection', 'nearby', 'saved', 'recent', 'browse', 'cities'];

const KNOWN = new Map(HOME_WIDGETS.map((widget) => [widget.id, widget]));

export const homeWidget = (id: HomeWidgetId): HomeWidget => KNOWN.get(id)!;

/** What was stored, cleaned: known widgets once each, in their order; Home as it comes for anything else. */
export function cleanHome(stored: unknown): HomeWidgetId[] {
  const list = stored && typeof stored === 'object' && Array.isArray((stored as { widgets?: unknown }).widgets) ? (stored as { widgets: unknown[] }).widgets : null;
  if (!list) return [...DEFAULT_HOME];
  const seen = new Set<HomeWidgetId>();
  for (const id of list) if (typeof id === 'string' && KNOWN.has(id as HomeWidgetId)) seen.add(id as HomeWidgetId);
  return [...seen];
}

/** Moved one place up (-1) or down (1); as it was at either end. */
export function moveWidget(list: readonly HomeWidgetId[], id: HomeWidgetId, by: -1 | 1): HomeWidgetId[] {
  const at = list.indexOf(id);
  const to = at + by;
  if (at < 0 || to < 0 || to >= list.length) return [...list];
  const next = [...list];
  [next[at], next[to]] = [next[to]!, next[at]!];
  return next;
}

/** Dragged to place `to` (counted as the list is now); as it was if it isn't there. */
export function moveWidgetTo(list: readonly HomeWidgetId[], id: HomeWidgetId, to: number): HomeWidgetId[] {
  const at = list.indexOf(id);
  if (at < 0) return [...list];
  const next = list.filter((each) => each !== id);
  next.splice(Math.min(Math.max(to, 0), next.length), 0, id);
  return next;
}

/** Added at the top, where you'll see it (the gallery), or at the end (the tray under Home's widgets); once only. */
export function addWidget(list: readonly HomeWidgetId[], id: HomeWidgetId, at: 'top' | 'end' = 'top'): HomeWidgetId[] {
  if (list.includes(id)) return [...list];
  return at === 'top' ? [id, ...list] : [...list, id];
}

export const removeWidget = (list: readonly HomeWidgetId[], id: HomeWidgetId): HomeWidgetId[] => list.filter((each) => each !== id);

/** The widgets that can be on Home here: the limited website has no server for the ones that need it. */
export function availableWidgets(limited: boolean): HomeWidget[] {
  return HOME_WIDGETS.filter((widget) => !(limited && widget.needsServer));
}

/** Home's widgets in order, without any this version can't show. */
export function shownWidgets(list: readonly HomeWidgetId[], limited: boolean): HomeWidgetId[] {
  return list.filter((id) => !(limited && homeWidget(id).needsServer));
}
