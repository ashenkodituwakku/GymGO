/**
 * A screen's header options (its title, buttons, whether it shows), handed
 * to the navigator only when one of them changes.
 *
 * expo-router's own <Stack.Screen options={...} /> hands them over again
 * each time the screen draws, and each time the navigator draws every screen
 * in the stack again, with its header: a letter typed into a workout's
 * weight redrew the tabs, the templates and every header beneath it.
 *
 * Options that are functions (headerRight and the like) are new each time,
 * so they still go to the navigator each time: build them with useMemo or
 * useCallback where the screen draws often.
 */

import { Stack } from 'expo-router';
import { useRef, type ComponentProps } from 'react';

type Options = NonNullable<Exclude<ComponentProps<typeof Stack.Screen>['options'], (...args: never[]) => unknown>>;

/** Whether two sets of options have the same keys holding the same values. */
export function sameOptions(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((key) => Object.prototype.hasOwnProperty.call(b, key) && Object.is(a[key], b[key]));
}

export function ScreenOptions({ options }: { options: Options }) {
  const held = useRef(options);
  if (held.current !== options && !sameOptions(held.current as Record<string, unknown>, options as Record<string, unknown>)) held.current = options;
  return <Stack.Screen options={held.current} />;
}
