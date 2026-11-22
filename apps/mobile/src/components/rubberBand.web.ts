/**
 * A sideways row (Home's rail of gyms, a gym's photos) gives at its ends
 * under a trackpad in a browser, as it does under a finger on a phone:
 * swipe on past the first or last card and the row follows a little, less
 * the further you pull (the same give as iOS), then springs back when you
 * stop. A desktop browser otherwise stops the row dead, and on a Mac a swipe
 * past the start could even go Back a page; that's switched off for these
 * rows (overscroll-behavior).
 *
 * One listener on the page, for every row marked with `rubberBand()`. The
 * row's content is moved by a transform, never its position. Not with Reduce
 * motion, yours in Appearance or the system's.
 */

let installed = false;
const pulled = new WeakMap<HTMLElement, { raw: number; timer: ReturnType<typeof setTimeout> | null }>();

/** How far the row shows for a pull of `raw` points, in a row `width` wide: iOS's give, never more than the width. */
export function give(raw: number, width: number): number {
  const w = Math.max(1, width);
  return Math.sign(raw) * (1 - 1 / ((Math.abs(raw) * 0.55) / w + 1)) * w;
}

function calm(): boolean {
  return document.documentElement.hasAttribute('data-gg-calm') || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

function onWheel(event: WheelEvent) {
  const row = (event.target as Element | null)?.closest?.('[data-rubber-band]') as HTMLElement | null;
  const content = row?.firstElementChild as HTMLElement | null;
  if (!row || !content || calm()) return;
  // Sideways only: an up-and-down scroll over the row is the page's.
  if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
  const max = row.scrollWidth - row.clientWidth;
  if (max <= 0) return;
  const state = pulled.get(row) ?? { raw: 0, timer: null };
  const delta = event.deltaX * (event.deltaMode === 1 ? 16 : 1);
  const atStart = row.scrollLeft <= 0;
  const atEnd = row.scrollLeft >= max - 1;
  if (state.raw === 0 && !(atStart && delta < 0) && !(atEnd && delta > 0)) return;
  // Pulled right at the start (positive), left at the end (negative); swiping back eases it home.
  state.raw = atStart && !atEnd ? Math.max(0, state.raw - delta) : atEnd && !atStart ? Math.min(0, state.raw - delta) : state.raw - delta;
  content.style.transition = 'none';
  content.style.transform = state.raw ? `translateX(${give(state.raw, row.clientWidth).toFixed(1)}px)` : '';
  if (state.timer) clearTimeout(state.timer);
  // Let go (no more swiping for a moment): it springs back.
  state.timer = setTimeout(() => {
    state.raw = 0;
    state.timer = null;
    content.style.transition = 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)';
    content.style.transform = '';
  }, 120);
  pulled.set(row, state);
}

function install(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  const style = document.createElement('style');
  style.textContent = '[data-rubber-band] { overscroll-behavior-x: contain; }';
  document.head.appendChild(style);
  document.addEventListener('wheel', onWheel, { passive: true, capture: true });
}

/** Spread onto a horizontal ScrollView. Pass another row helper's props (edgeFade()) to keep its marks too. */
export function rubberBand(other: object = {}): object {
  install();
  const before = (other as { dataSet?: Record<string, string> }).dataSet ?? {};
  return { ...other, dataSet: { ...before, rubberBand: 'on' } };
}
