/**
 * In a browser, when a button takes itself away (Not now on the Pro card,
 * Remove on a gym that's gone from the map), focus went with it, to the
 * page itself: a screen reader was left saying nothing and Tab started again
 * from the top. Called just before, this notes the next thing Tab would
 * reach after what's going, and focuses it once that has gone.
 *
 * Phones move a screen reader's focus on their own; there it does nothing.
 */

const TABBABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

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
