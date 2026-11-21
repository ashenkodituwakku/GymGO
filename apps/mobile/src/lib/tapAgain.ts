/**
 * The state behind a "Tap again to delete it" button. The first tap arms
 * it; if the second doesn't come within a few seconds, it goes back to how
 * it was. A button left armed would delete on a tap much later, made
 * while you meant something else (scrolling back past it, say).
 *
 * `ms` gives longer to read when the button explains what it deletes.
 */

import { useEffect, useState } from 'react';

export const TAP_AGAIN_MS = 8000;

function useDisarming<T>(rest: T, ms: number): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(rest);
  useEffect(() => {
    if (value === rest) return;
    const timer = setTimeout(() => setValue(rest), ms);
    return () => clearTimeout(timer);
  }, [value, rest, ms]);
  return [value, setValue];
}

/** One button: armed or not. */
export function useTapAgain(ms: number = TAP_AGAIN_MS): [boolean, (armed: boolean) => void] {
  return useDisarming<boolean>(false, ms);
}

/** One of a list (a trip, a day's measurements): which is armed, if any. */
export function useTapAgainOn<T extends string>(ms: number = TAP_AGAIN_MS): [T | null, (which: T | null) => void] {
  return useDisarming<T | null>(null, ms);
}
