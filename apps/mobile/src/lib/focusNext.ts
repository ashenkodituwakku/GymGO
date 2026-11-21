/**
 * In a browser, when a button takes itself away (Not now on the Pro card,
 * Remove on a gym that's gone from the map), focus went with it, to the
 * page itself: a screen reader was left saying nothing and Tab started again
 * from the top. Called just before, this notes the next thing Tab would
 * reach after what's going, and focuses it once that has gone.
 *
 * Phones move a screen reader's focus on their own; there it does nothing.
 */

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

const TABBABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * The props for a view that takes focus from code only: never a Tab stop of
 * its own, and no focus ring round it (app/_layout.tsx leaves this mark out).
 */
export const FOCUS_FROM_CODE = { tabIndex: -1, dataSet: { quietFocus: '' } } as object;

/**
 * For a one-line field whose Enter does something you might do again (add a
 * friend's code, log a weight): in a browser it kept focus after Enter, as
 * a phone keeps its keyboard up, instead of blurring to the page itself, so
 * a wrong code can be put right at once. Phones keep their own behaviour.
 */
export const KEEP_FOCUS_ON_ENTER = (Platform.OS === 'web' ? { blurOnSubmit: false } : {}) as object;

/**
 * When a screen replaces the one whose button was pressed (Workout done after
 * Finish, Thanks after Send), focus went with the button, to the page itself.
 * Put the returned ref, with FOCUS_FROM_CODE, on the new screen's heading:
 * it takes focus as it appears, so a screen reader reads it and Tab goes on
 * from there. A browser only.
 */
export function useFocusOnArrival<T>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    (ref.current as unknown as { focus?: (options?: { preventScroll?: boolean }) => void } | null)?.focus?.({ preventScroll: true });
  }, []);
  return ref;
}

type Node = { contains?: (other: unknown) => boolean; compareDocumentPosition?: (other: unknown) => number; isConnected?: boolean };

export function focusNextWhenGone(going: unknown): void {
  if (typeof document === 'undefined' || typeof requestAnimationFrame === 'undefined') return;
  const node = going as Node | null;
  if (!node?.contains || !node.compareDocumentPosition) return;
  const FOLLOWING = 4; // Node.DOCUMENT_POSITION_FOLLOWING
  const next = [...document.querySelectorAll<HTMLElement>(TABBABLE)].find(
    (candidate) =>
      !node.contains!(candidate) &&
      (node.compareDocumentPosition!(candidate) & FOLLOWING) !== 0 &&
      candidate.getClientRects().length > 0 &&
      !candidate.closest('[aria-hidden="true"]'),
  );
  if (!next) return;
  let frames = 0;
  const settle = () => {
    // Until it has gone (a fade on its way out keeps it a moment), and not for ever.
    if (node.isConnected && frames++ < 40) {
      requestAnimationFrame(settle);
      return;
    }
    // Only if focus was lost with it: not if someone has already moved on.
    if (document.activeElement === document.body || document.activeElement === null) next.focus();
  };
  requestAnimationFrame(settle);
}
