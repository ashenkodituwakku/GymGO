/**
 * A button that's only an icon (Share, Compare, Save on a gym's page; the
 * map's buttons; a close ×) says what it is when a mouse rests on it, in a
 * browser: a small label under it. The first waits a moment, so a pointer
 * passing over doesn't set one off; once one has shown, the next shows at
 * once while you move along a row of them, and the wait comes back after a
 * pause. The label is the button's own name (its aria-label), so a screen
 * reader hears nothing twice: the label is hidden from it.
 *
 * It stays while the pointer is on the button or the label itself, goes
 * with Escape, a press or a scroll (WCAG 1.4.13), and only for a mouse or
 * trackpad (`hover: hover`). No fade with Reduce motion.
 */

/** The first label's wait, and how long after one goes the next can come at once. */
export const FIRST_DELAY_MS = 500;
export const WARM_FOR_MS = 800;

let installed = false;
let tip: HTMLDivElement | null = null;
let target: HTMLElement | null = null;
let showTimer: ReturnType<typeof setTimeout> | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let lastHidden = 0;

/** Whether a label shows at once (one went within WARM_FOR_MS) or waits. */
export function waitFor(now: number, hiddenAt: number, showing: boolean): number {
  return showing || now - hiddenAt < WARM_FOR_MS ? 0 : FIRST_DELAY_MS;
}

/** The button under the pointer, if it's one shown only as an icon, and its name. */
function iconButton(from: EventTarget | null): { el: HTMLElement; name: string } | null {
  const el = (from as Element | null)?.closest?.('[role=button],[role=link],[role=tab],button,a') as HTMLElement | null;
  if (!el || el.closest('[data-no-tip]')) return null;
  const name = (el.getAttribute('aria-label') ?? '').trim();
  if (!name || name.length > 60) return null;
  // Icon only: no words of its own on show.
  if ((el.innerText ?? '').replace(/\s+/g, '').length > 0) return null;
  return { el, name };
}

function calm(): boolean {
  return document.documentElement.hasAttribute('data-gg-calm') || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

function place(el: HTMLElement) {
  if (!tip) return;
  const box = el.getBoundingClientRect();
  const own = tip.getBoundingClientRect();
  const gap = 6;
  let top = box.bottom + gap;
  if (top + own.height > window.innerHeight - 4) top = box.top - gap - own.height;
  const left = Math.min(Math.max(4, box.left + box.width / 2 - own.width / 2), window.innerWidth - own.width - 4);
  tip.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
}

function show(el: HTMLElement, name: string) {
  if (!tip) return;
  target = el;
  tip.textContent = name;
  tip.style.transition = calm() ? 'none' : 'opacity 120ms ease-out';
  tip.style.visibility = 'hidden';
  tip.style.opacity = '0';
  tip.style.display = 'block';
  place(el);
  tip.style.visibility = 'visible';
  tip.style.opacity = '1';
}

function hide() {
  if (showTimer) clearTimeout(showTimer);
  if (hideTimer) clearTimeout(hideTimer);
  showTimer = hideTimer = null;
  if (tip && tip.style.display === 'block') {
    tip.style.display = 'none';
    lastHidden = Date.now();
  }
  target = null;
}

function onOver(event: PointerEvent) {
  if (event.pointerType !== 'mouse') return;
  if (tip && (event.target === tip || tip.contains(event.target as Node))) {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = null;
    return;
  }
  const found = iconButton(event.target);
  if (!found) {
    // Off the button (and not on its label): give the pointer a moment to reach the label.
    if (target && !hideTimer) hideTimer = setTimeout(hide, 120);
    return;
  }
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = null;
  if (found.el === target) return;
  const showing = Boolean(tip && tip.style.display === 'block');
  if (showTimer) clearTimeout(showTimer);
  const wait = waitFor(Date.now(), lastHidden, showing);
  if (showing && tip) {
    tip.style.display = 'none';
    lastHidden = Date.now();
  }
  target = found.el;
  showTimer = setTimeout(() => {
    showTimer = null;
    if (target === found.el && found.el.isConnected) show(found.el, found.name);
  }, wait);
}

export function installTooltips(): void {
  if (installed || typeof document === 'undefined') return;
  if (!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return;
  installed = true;
  tip = document.createElement('div');
  tip.setAttribute('aria-hidden', 'true');
  tip.setAttribute('data-gg-tip', '');
  Object.assign(tip.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    zIndex: '2147483000',
    display: 'none',
    maxWidth: '240px',
    padding: '4px 8px',
    borderRadius: '6px',
    background: 'rgba(28, 28, 30, 0.92)',
    color: '#FFFFFF',
    font: '500 12px/16px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif',
    whiteSpace: 'nowrap',
    // A faint rim, so the dark label still has an edge on a dark page.
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.18), inset 0 0 0 0.5px rgba(255, 255, 255, 0.16)',
    pointerEvents: 'auto',
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.appendChild(tip);
  document.addEventListener('pointerover', onOver, { passive: true });
  document.addEventListener('pointerdown', hide, { passive: true, capture: true });
  document.addEventListener('scroll', hide, { passive: true, capture: true });
  document.addEventListener('keydown', (event) => event.key === 'Escape' && target && hide(), { capture: true });
  window.addEventListener('blur', hide);
}
