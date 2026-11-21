/**
 * Icons that answer a mouse, in a browser: point at a button, link or row
 * and its icon moves a little, in a way that says what it does. A chevron
 * steps forward, Back steps back, Share and Send rise, the bell rings,
 * Settings' gear turns, Save pops, Search tilts, the eye blinks. Anything
 * without a motion of its own lifts a point and grows a touch.
 *
 * Each icon carries its motion as `data-gg-icon` (Icon.tsx, PIcon.tsx). One
 * listener on the page (installIconHover) marks the icons of the control
 * under the pointer with `data-gg-hover`, and CSS does the moving, so
 * nothing redraws. Only a control's own icons move, never those of a button
 * inside it; a big card (taller than TALL) moves only an arrow it has, so a
 * gym's card doesn't set all its little icons going at once, and nothing
 * with more than MOST icons moves at all.
 *
 * Only for a mouse, trackpad or pen: a touch has no hover. With Reduce
 * motion (yours in Appearance, `data-gg-calm`, or the system's), nothing
 * moves.
 */

export type IconMotion =
  | 'lift'
  | 'forward'
  | 'back'
  | 'up'
  | 'down'
  | 'out'
  | 'turn'
  | 'rewind'
  | 'quarter'
  | 'ring'
  | 'pop'
  | 'tilt'
  | 'blink'
  | 'grow'
  | 'shrink'
  | 'widen'
  | 'shake';

/** Each icon's motion, by its name in Icon.tsx or Phosphor's (PIcon.tsx). The rest lift. */
const MOTIONS: Partial<Record<string, IconMotion>> = {
  // Going on, going back.
  chevron: 'forward',
  signOut: 'forward',
  chevronBack: 'back',
  back: 'back',
  // Sending something up or out, bringing it down.
  send: 'up',
  share: 'up',
  chart: 'up',
  'chart-line-up': 'up',
  barbell: 'up',
  download: 'down',
  external: 'out',
  directions: 'out',
  locate: 'out',
  // Turning.
  settings: 'turn',
  'gear-six': 'turn',
  refresh: 'rewind',
  history: 'rewind',
  plus: 'quarter',
  close: 'quarter',
  // Something that rings.
  bell: 'ring',
  call: 'ring',
  timer: 'ring',
  // Keeping, liking, winning.
  save: 'pop',
  saved: 'pop',
  'bookmark-simple': 'pop',
  star: 'pop',
  crown: 'pop',
  trophy: 'pop',
  thumbsUp: 'pop',
  gem: 'pop',
  flame: 'pop',
  bolt: 'pop',
  good: 'pop',
  done: 'pop',
  check: 'pop',
  sparkle: 'pop',
  confetti: 'pop',
  fireworks: 'pop',
  smile: 'pop',
  // Looking, writing, choosing.
  search: 'tilt',
  'magnifying-glass': 'tilt',
  google: 'tilt',
  website: 'tilt',
  globe: 'tilt',
  'globe-hemisphere-west': 'tilt',
  moon: 'tilt',
  palette: 'tilt',
  note: 'tilt',
  'clipboard-text': 'tilt',
  key: 'tilt',
  thumbsDown: 'tilt',
  music: 'tilt',
  arcade: 'tilt',
  cards: 'tilt',
  eye: 'blink',
  eyeOff: 'blink',
  // Making bigger or smaller.
  expand: 'grow',
  fit: 'grow',
  collapse: 'shrink',
  menu: 'widen',
  list: 'widen',
  // A warning or a bin: a small shake.
  trash: 'shake',
  warning: 'shake',
  bug: 'shake',
};

export function iconMotion(name: string): IconMotion {
  return MOTIONS[name] ?? 'lift';
}

/** A spring with a little overshoot: quick, and settles. */
const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

/**
 * What each motion does on hover. Written with `translate`, `rotate` and
 * `scale` (not `transform`), which add to whatever transform an icon has
 * already (Icon's blur-in when it changes).
 */
export const MOTION_CSS: Record<IconMotion, string> = {
  lift: 'translate: 0 -1.5px; scale: 1.08;',
  forward: 'translate: 2.5px 0;',
  back: 'translate: -2.5px 0;',
  up: 'translate: 0 -2.5px;',
  down: 'translate: 0 2.5px;',
  out: 'translate: 2px -2px;',
  turn: `rotate: 60deg; transition-duration: 520ms; transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1);`,
  rewind: `rotate: -120deg; transition-duration: 520ms; transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1);`,
  quarter: 'rotate: 90deg;',
  ring: 'transform-origin: 50% 15%; animation: gg-icon-ring 620ms ease-in-out;',
  pop: `animation: gg-icon-pop 420ms ${SPRING};`,
  tilt: 'rotate: -12deg; scale: 1.06;',
  blink: 'animation: gg-icon-blink 360ms ease-in-out;',
  grow: 'scale: 1.15;',
  shrink: 'scale: 0.86;',
  widen: 'scale: 1.18 1;',
  shake: 'animation: gg-icon-shake 460ms ease-in-out;',
};

/** The page's style sheet for it: the motions, their keyframes, and Reduce motion. */
export function iconHoverCss(): string {
  const rules = (Object.keys(MOTION_CSS) as IconMotion[])
    .map((motion) => `[data-gg-icon="${motion}"][data-gg-hover] { ${MOTION_CSS[motion]} }`)
    .join('\n');
  return `
[data-gg-icon] { transition: translate 280ms ${SPRING}, rotate 280ms ${SPRING}, scale 280ms ${SPRING}; }
${rules}
@keyframes gg-icon-ring { 0%, 100% { rotate: 0deg; } 20% { rotate: -14deg; } 40% { rotate: 12deg; } 60% { rotate: -8deg; } 80% { rotate: 4deg; } }
@keyframes gg-icon-pop { 0%, 100% { scale: 1; } 40% { scale: 1.22; } 70% { scale: 0.95; } }
@keyframes gg-icon-blink { 0%, 100% { scale: 1 1; } 50% { scale: 1 0.12; } }
@keyframes gg-icon-shake { 0%, 100% { rotate: 0deg; } 20% { rotate: -9deg; } 40% { rotate: 9deg; } 60% { rotate: -6deg; } 80% { rotate: 4deg; } }
html[data-gg-calm] [data-gg-icon] { transition: none; animation: none !important; translate: none !important; rotate: none !important; scale: none !important; }
@media (prefers-reduced-motion: reduce) {
  [data-gg-icon] { transition: none; animation: none !important; translate: none !important; rotate: none !important; scale: none !important; }
}
`;
}

/** Taller than this, a control is a card, and only its arrow moves. */
export const TALL = 100;
/** More icons than this in one control, and none moves. */
export const MOST = 3;
/** The motions a card's arrow may make. */
const ARROWS: ReadonlySet<IconMotion> = new Set(['forward', 'back', 'out']);

/** Which of a control's own icons move, given their motions and the control's height. */
export function movingIcons(motions: IconMotion[], height: number): boolean[] {
  if (motions.length > MOST) return motions.map(() => false);
  return motions.map((motion) => height <= TALL || ARROWS.has(motion));
}

/** Things you can press or choose. */
const CONTROL =
  '[role="button"], [role="link"], [role="tab"], [role="checkbox"], [role="radio"], [role="switch"], [role="menuitem"], [role="option"], a, button';

let installed = false;

/** Listen on the page for the pointer (a browser only; once, however often it's called). */
export function installIconHover(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  const style = document.createElement('style');
  style.setAttribute('data-gymgo', 'icon-hover');
  style.textContent = iconHoverCss();
  document.head.appendChild(style);

  let control: Element | null = null;
  let moving: Element[] = [];
  const letGo = () => {
    for (const icon of moving) icon.removeAttribute('data-gg-hover');
    moving = [];
    control = null;
  };
  document.addEventListener(
    'pointerover',
    (event) => {
      if (event.pointerType === 'touch') return;
      const target = event.target instanceof Element ? event.target : null;
      const next = target?.closest(CONTROL) ?? null;
      if (next === control) return;
      letGo();
      control = next;
      if (!next || next.getAttribute('aria-disabled') === 'true' || next.hasAttribute('disabled')) return;
      // Its own icons: not a button's inside it, and an icon drawn inside another (Icon round PIcon) once.
      const icons = Array.from(next.querySelectorAll('[data-gg-icon]')).filter(
        (icon) => icon.closest(CONTROL) === next && !icon.parentElement?.closest('[data-gg-icon]'),
      );
      if (icons.length === 0) return;
      const height = next.getBoundingClientRect().height;
      const move = movingIcons(
        icons.map((icon) => (icon.getAttribute('data-gg-icon') ?? 'lift') as IconMotion),
        height,
      );
      moving = icons.filter((_, index) => move[index]);
      for (const icon of moving) icon.setAttribute('data-gg-hover', '');
    },
    { passive: true },
  );
  // Out of the window: whatever was moving settles.
  document.addEventListener('pointerout', (event) => {
    if (!event.relatedTarget) letGo();
  });
}
