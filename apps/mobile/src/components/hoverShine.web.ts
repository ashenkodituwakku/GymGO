/**
 * Home's cards answering a mouse, in a browser: the card under the pointer
 * drifts a few points towards it and lifts, and in a glass look (Standard,
 * Frost, Liquid) a light follows the pointer across its face, with its rim
 * catching the light nearest the pointer, as Liquid Glass does.
 *
 * One listener on the page (the zone), not one per card: whatever the
 * pointer is over, the nearest thing you can press that has a surface (a
 * background, a gradient or an edge) is the card. A text link (Map) or a
 * bare icon has none, so it's left alone; a row inside a card (Templates)
 * lights the card it sits in. The card is marked with data attributes, and
 * CSS does the rest (the pointer's place is passed as custom properties), so
 * nothing redraws as the pointer moves.
 *
 * Only for a mouse or trackpad (`hover: hover`): a touch screen has no
 * hover. With Reduce motion (yours in Appearance, or the system's) the card
 * stays put and only the light moves with the pointer.
 */

import { useEffect, type RefObject } from 'react';
import { solidSurfaces, subscribeGlass } from '@/lib/theme';

const CSS = `
/* Its own layer, so the light can sit on the card's surface, under its words and pictures. */
[data-shine] { transition: translate 280ms cubic-bezier(0.22, 1, 0.36, 1); isolation: isolate; }
[data-shining] { translate: calc(var(--gg-dx, 0) * 3px) calc(var(--gg-dy, 0) * 2px - 2px); }
html[data-gg-calm] [data-shining] { translate: none; }
@media (prefers-reduced-motion: reduce) { [data-shining] { translate: none; } }

html[data-gg-glass] [data-shine]::after,
html[data-gg-glass] [data-shine]::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0;
  transition: opacity 220ms ease-out;
}
/* The light on the glass's face, under the pointer: behind the card's content, so text never washes out under it. */
html[data-gg-glass] [data-shine]::after {
  z-index: -1;
  background: radial-gradient(circle 170px at var(--gg-mx, 50%) var(--gg-my, 50%), rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.12) 45%, rgba(255, 255, 255, 0) 100%);
}
/* The rim catching it: a 1-point ring, brightest nearest the pointer. */
html[data-gg-glass] [data-shine]::before {
  padding: 1px;
  background: radial-gradient(circle 120px at var(--gg-mx, 50%) var(--gg-my, 50%), rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0) 100%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
}
html[data-gg-glass] [data-shining]::after,
html[data-gg-glass] [data-shining]::before { opacity: 1; }
/* Fainter on dark glass, where a bright light would wash out the words. */
html[data-gg-scheme="dark"][data-gg-glass] [data-shine]::after {
  background: radial-gradient(circle 170px at var(--gg-mx, 50%) var(--gg-my, 50%), rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.03) 45%, rgba(255, 255, 255, 0) 100%);
}
html[data-gg-scheme="dark"][data-gg-glass] [data-shine]::before {
  background: radial-gradient(circle 120px at var(--gg-mx, 50%) var(--gg-my, 50%), rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0) 100%);
}
`;

let installed = false;
function install(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  const style = document.createElement('style');
  style.setAttribute('data-gymgo', 'hover-shine');
  style.textContent = CSS;
  document.head.appendChild(style);
  // The light is only for the glass looks; the solid ones (8-bit, Paper…) keep their flat plates, and only move.
  const sync = () => document.documentElement.toggleAttribute('data-gg-glass', !solidSurfaces());
  sync();
  subscribeGlass(sync);
}

/** Things you can press. */
const PRESSABLE = '[role="button"], [role="link"], [role="checkbox"], [role="radio"], a, button';

/** Whether something is drawn with a surface: a colour, a gradient or an edge. A text link isn't. */
function hasSurface(node: HTMLElement): boolean {
  const style = getComputedStyle(node);
  const clear = style.backgroundColor === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(style.backgroundColor);
  return !clear || style.backgroundImage !== 'none' || style.boxShadow !== 'none';
}

/**
 * A press target's own card, when it's bare wrappers round one: a gym's
 * card is a link, round a view, round the card, all the same size.
 */
function wrapped(pressable: HTMLElement): HTMLElement | null {
  const outer = pressable.getBoundingClientRect();
  let node: Element = pressable;
  for (let step = 0; step < 3; step += 1) {
    const only: Element | null = node.children.length === 1 ? node.children[0]! : null;
    if (!(only instanceof HTMLElement)) return null;
    const inner = only.getBoundingClientRect();
    if (Math.abs(outer.width - inner.width) >= 4 || Math.abs(outer.height - inner.height) >= 4) return null;
    if (hasSurface(only)) return only;
    node = only;
  }
  return null;
}

/**
 * The card for what the pointer is over: the nearest thing you can press,
 * if it has a surface (or wraps a card of its own size), or else the
 * surface it sits on, at most two steps out (a row inside a card). Never
 * the page itself, nor anything as tall as most of it.
 */
function cardAt(target: Element, zone: HTMLElement): HTMLElement | null {
  const pressable = target.closest(PRESSABLE);
  if (!(pressable instanceof HTMLElement) || !zone.contains(pressable)) return null;
  if (!hasSurface(pressable)) {
    const inner = wrapped(pressable);
    if (inner) return inner;
  }
  let node: HTMLElement | null = pressable;
  for (let step = 0; node && node !== zone && step < 3; step += 1, node = node.parentElement) {
    if (node.getBoundingClientRect().height > zone.clientHeight * 0.6) return null;
    if (hasSurface(node)) return node;
  }
  return null;
}

export function useHoverShine(zone: RefObject<unknown>, on = true): void {
  useEffect(() => {
    const node = zone.current;
    if (!on || !(node instanceof HTMLElement) || typeof window === 'undefined' || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    install();
    let card: HTMLElement | null = null;
    let last: PointerEvent | null = null;
    let frame = 0;
    const letGo = () => {
      card?.removeAttribute('data-shining');
      card = null;
    };
    // Once a frame at most, however fast the pointer moves.
    const update = () => {
      frame = 0;
      if (!last) return;
      const next = last.target instanceof Element ? cardAt(last.target, node) : null;
      if (next !== card) {
        letGo();
        if (next) {
          // Kept once given, so a card eases back when the pointer leaves it.
          next.setAttribute('data-shine', '');
          next.setAttribute('data-shining', '');
          card = next;
        }
      }
      if (!card) return;
      const box = card.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (last.clientX - box.left) / box.width));
      const y = Math.min(1, Math.max(0, (last.clientY - box.top) / box.height));
      card.style.setProperty('--gg-mx', `${(x * 100).toFixed(1)}%`);
      card.style.setProperty('--gg-my', `${(y * 100).toFixed(1)}%`);
      card.style.setProperty('--gg-dx', ((x - 0.5) * 2).toFixed(3));
      card.style.setProperty('--gg-dy', ((y - 0.5) * 2).toFixed(3));
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      last = event;
      if (!frame) frame = requestAnimationFrame(update);
    };
    const leave = () => {
      last = null;
      letGo();
    };
    node.addEventListener('pointermove', move, { passive: true });
    node.addEventListener('pointerleave', leave);
    // A scroll carries the cards out from under a still pointer: the one it was over lets go.
    node.addEventListener('scroll', leave, { capture: true, passive: true });
    return () => {
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerleave', leave);
      node.removeEventListener('scroll', leave, { capture: true });
      if (frame) cancelAnimationFrame(frame);
      leave();
    };
  }, [zone, on]);
}
