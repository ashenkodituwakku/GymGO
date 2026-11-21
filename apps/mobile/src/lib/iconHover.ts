/**
 * Icons that answer a mouse, in a browser: point at a button, link or row
 * and its icon moves a little, in a way that says what it does.
 *
 * The tab bar's and the sidebar's icons each play a scene of their own,
 * drawn in parts (components/iconArt.tsx, ART_CSS below): Progress's graph
 * draws itself out of the axis and its arrow shoots out past the end,
 * Workout's barbell is loaded plate by plate and dips with the weight,
 * Home's roof hops and its door swings open, Explore's map unfolds, Saved's
 * bookmark drops in and fills, Profile's head pops up as its ring draws
 * round, My workouts' lines write themselves, Programme's days pop in one by
 * one, Collection's card flips, Friends step out from behind each other, and
 * Appearance's paints light up in colour.
 *
 * Every other icon (a glyph in a browser, so it can't be taken apart) makes
 * a motion that fits it: a chevron steps forward, Back steps back, Share
 * and Send rise, the bell rings, Settings' gear turns, Save pops, Search
 * tilts, the eye blinks; anything else lifts a point and grows a touch.
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
  | 'art'
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
  // A drawing in parts moves its parts, not itself (ART_CSS).
  art: '',
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

/** The icons drawn in parts, by their Phosphor names (components/iconArt.tsx draws them). */
export const ART_NAMES = [
  'chart-line-up',
  'barbell',
  'house',
  'map-trifold',
  'bookmark-simple',
  'user-circle',
  'clipboard-text',
  'calendar-dots',
  'cards',
  'users-three',
  'palette',
] as const;
export type ArtName = (typeof ART_NAMES)[number];

export function isArt(name: string): name is ArtName {
  return (ART_NAMES as readonly string[]).includes(name);
}

/** A part of a drawing, while its control is under the mouse. */
const at = (art: ArtName, piece: string) => `[data-gg-art="${art}"][data-gg-hover] [data-part="${piece}"]`;
/** Drawing a line from nothing (its path measured as 100 long). */
const DRAW = 'stroke-dasharray: 100; animation-name: gg-art-draw; animation-fill-mode: both;';
const OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';

/**
 * Each drawing's scene. Lengths are on the icon's 256 grid (the parts sit in
 * its view box), times in milliseconds; `both` holds a part where its scene
 * starts until its turn comes. Moving the pointer away ends it at once, back
 * to the icon at rest.
 */
export const ART_CSS: Record<ArtName, string> = {
  // The line draws out of the axis; as it gets there the arrow shoots out past the end and settles.
  'chart-line-up': `
${at('chart-line-up', 'line')} { ${DRAW} animation-duration: 560ms; animation-timing-function: cubic-bezier(0.45, 0, 0.25, 1); }
${at('chart-line-up', 'arrow')} { animation: gg-chart-arrow 820ms ${OUT} both; }
@keyframes gg-chart-arrow { 0%, 50% { opacity: 0; transform: translate(-44px, 44px); } 78% { opacity: 1; transform: translate(12px, -12px); } 100% { opacity: 1; transform: translate(0, 0); } }`,
  // The inner plates slide on, then the outer ones, each with a clank; then the bar dips with the weight.
  barbell: `
${at('barbell', 'inner-left')} { animation: gg-plate-left 460ms ${OUT} both; }
${at('barbell', 'inner-right')} { animation: gg-plate-right 460ms ${OUT} both; }
${at('barbell', 'outer-left')} { animation: gg-plate-left 440ms ${OUT} 240ms both; }
${at('barbell', 'outer-right')} { animation: gg-plate-right 440ms ${OUT} 240ms both; }
${at('barbell', 'all')} { animation: gg-bar-dip 300ms ease-in-out 620ms both; }
@keyframes gg-plate-left { 0% { opacity: 0; transform: translateX(-64px); } 55% { opacity: 1; transform: translateX(7px); } 100% { opacity: 1; transform: translateX(0); } }
@keyframes gg-plate-right { 0% { opacity: 0; transform: translateX(64px); } 55% { opacity: 1; transform: translateX(-7px); } 100% { opacity: 1; transform: translateX(0); } }
@keyframes gg-bar-dip { 0%, 100% { transform: translateY(0); } 45% { transform: translateY(10px); } }`,
  // The roof hops and lands; the door swings open on its hinge.
  house: `
${at('house', 'roof')} { animation: gg-roof-hop 620ms ${OUT} both; }
${at('house', 'door')} { transform-origin: 112px 184px; animation: gg-door-open 640ms ease-in-out 120ms both; }
@keyframes gg-roof-hop { 0% { transform: translateY(0); } 32% { transform: translateY(-30px); } 58% { transform: translateY(4px); } 76%, 100% { transform: translateY(0); } }
@keyframes gg-door-open { 0% { opacity: 0.9; transform: scaleX(1); } 70% { opacity: 0.9; transform: scaleX(0.14); } 100% { opacity: 0; transform: scaleX(0.14); } }`,
  // The two outer panels unfold from the middle one.
  'map-trifold': `
${at('map-trifold', 'left')} { transform-origin: 96px 120px; animation: gg-unfold 560ms ${OUT} both; }
${at('map-trifold', 'right')} { transform-origin: 160px 136px; animation: gg-unfold 560ms ${OUT} 110ms both; }
@keyframes gg-unfold { 0% { transform: scaleX(0); } 65% { transform: scaleX(1.1); } 100% { transform: scaleX(1); } }`,
  // The bookmark drops in and bounces; a fill runs down it, then fades.
  'bookmark-simple': `
${at('bookmark-simple', 'all')} { animation: gg-bookmark-drop 600ms ${OUT} both; }
${at('bookmark-simple', 'fill')} { transform-origin: 128px 40px; animation: gg-bookmark-fill 760ms ease-out 140ms both; }
@keyframes gg-bookmark-drop { 0% { transform: translateY(-40px); opacity: 0; } 45% { transform: translateY(8px); opacity: 1; } 68% { transform: translateY(-4px); } 100% { transform: translateY(0); opacity: 1; } }
@keyframes gg-bookmark-fill { 0% { opacity: 0.9; transform: scaleY(0); } 55% { opacity: 0.9; transform: scaleY(1); } 100% { opacity: 0; transform: scaleY(1); } }`,
  // The head pops up as the ring draws round.
  'user-circle': `
${at('user-circle', 'ring')} { ${DRAW} animation-duration: 640ms; animation-timing-function: ease-in-out; }
${at('user-circle', 'head')} { animation: gg-head-pop 560ms ${OUT} 80ms both; }
@keyframes gg-head-pop { 0% { transform: translateY(0); } 38% { transform: translateY(-20px); } 64% { transform: translateY(3px); } 100% { transform: translateY(0); } }`,
  // The clip snaps down; the two lines write themselves, one after the other.
  'clipboard-text': `
${at('clipboard-text', 'clip')} { animation: gg-clip-snap 520ms ${OUT} both; }
${at('clipboard-text', 'line-1')} { ${DRAW} animation-duration: 300ms; animation-delay: 160ms; animation-timing-function: ease-out; }
${at('clipboard-text', 'line-2')} { ${DRAW} animation-duration: 300ms; animation-delay: 400ms; animation-timing-function: ease-out; }
@keyframes gg-clip-snap { 0% { transform: translateY(0); } 35% { transform: translateY(-16px); } 62% { transform: translateY(3px); } 100% { transform: translateY(0); } }`,
  // The rings flick; the days pop in, one by one.
  'calendar-dots': `
${at('calendar-dots', 'rings')} { animation: gg-rings-flick 440ms ${OUT} both; }
${[1, 2, 3, 4, 5].map((day) => `${at('calendar-dots', `day-${day}`)} { transform-box: fill-box; transform-origin: center; animation: gg-pop-in 340ms ${SPRING} ${60 + day * 70}ms both; }`).join('\n')}
@keyframes gg-rings-flick { 0% { transform: translateY(0); } 40% { transform: translateY(-12px); } 100% { transform: translateY(0); } }`,
  // The front card flips over; the one behind slides out.
  cards: `
${at('cards', 'front')} { transform-origin: 112px 144px; animation: gg-card-flip 620ms ease-in-out both; }
${at('cards', 'back')} { animation: gg-card-out 560ms ${OUT} 120ms both; }
@keyframes gg-card-flip { 0% { transform: scaleX(1); } 40% { transform: scaleX(0); } 78% { transform: scaleX(1.08); } 100% { transform: scaleX(1); } }
@keyframes gg-card-out { 0% { opacity: 0; transform: translate(-28px, 28px); } 100% { opacity: 1; transform: translate(0, 0); } }`,
  // The one in the middle hops; a friend steps out from behind each side.
  'users-three': `
${at('users-three', 'middle')} { animation: gg-friend-hop 520ms ${OUT} both; }
${at('users-three', 'left')} { animation: gg-friend-left 520ms ${OUT} 140ms both; }
${at('users-three', 'right')} { animation: gg-friend-right 520ms ${OUT} 220ms both; }
@keyframes gg-friend-hop { 0% { transform: translateY(0); } 36% { transform: translateY(-16px); } 62% { transform: translateY(3px); } 100% { transform: translateY(0); } }
@keyframes gg-friend-left { 0% { opacity: 0; transform: translateX(48px); } 65% { opacity: 1; transform: translateX(-5px); } 100% { opacity: 1; transform: translateX(0); } }
@keyframes gg-friend-right { 0% { opacity: 0; transform: translateX(-48px); } 65% { opacity: 1; transform: translateX(5px); } 100% { opacity: 1; transform: translateX(0); } }`,
  // The palette rocks; its paints pop and light up in colour, one by one, and stay lit while it's pointed at.
  palette: `
${at('palette', 'all')} { transform-origin: 128px 128px; animation: gg-palette-rock 640ms ${OUT} both; }
${['#FF5F57', '#FFBD2E', '#28C840', '#3A86FF']
  .map((paint, index) => `${at('palette', `paint-${index + 1}`)} { transform-box: fill-box; transform-origin: center; fill: ${paint}; animation: gg-paint 380ms ${SPRING} ${80 + index * 90}ms both; }`)
  .join('\n')}
@keyframes gg-palette-rock { 0% { transform: rotate(0); } 30% { transform: rotate(-12deg); } 62% { transform: rotate(6deg); } 100% { transform: rotate(0); } }
@keyframes gg-paint { 0% { transform: scale(1); } 55% { transform: scale(1.6); } 100% { transform: scale(1); } }`,
};

/** The page's style sheet for it: the motions, the scenes, their keyframes, and Reduce motion. */
export function iconHoverCss(): string {
  const rules = (Object.keys(MOTION_CSS) as IconMotion[])
    .map((motion) => `[data-gg-icon="${motion}"][data-gg-hover] { ${MOTION_CSS[motion]} }`)
    .join('\n');
  const scenes = ART_NAMES.map((art) => ART_CSS[art]).join('\n');
  return `
[data-gg-icon] { transition: translate 280ms ${SPRING}, rotate 280ms ${SPRING}, scale 280ms ${SPRING}; }
${rules}
[data-gg-art] [data-part] { transform-box: view-box; }
${scenes}
@keyframes gg-art-draw { from { stroke-dashoffset: 100; } to { stroke-dashoffset: 0; } }
@keyframes gg-pop-in { 0% { transform: scale(0); } 60% { transform: scale(1.4); } 100% { transform: scale(1); } }
@keyframes gg-icon-ring { 0%, 100% { rotate: 0deg; } 20% { rotate: -14deg; } 40% { rotate: 12deg; } 60% { rotate: -8deg; } 80% { rotate: 4deg; } }
@keyframes gg-icon-pop { 0%, 100% { scale: 1; } 40% { scale: 1.22; } 70% { scale: 0.95; } }
@keyframes gg-icon-blink { 0%, 100% { scale: 1 1; } 50% { scale: 1 0.12; } }
@keyframes gg-icon-shake { 0%, 100% { rotate: 0deg; } 20% { rotate: -9deg; } 40% { rotate: 9deg; } 60% { rotate: -6deg; } 80% { rotate: 4deg; } }
html[data-gg-calm] [data-gg-icon], html[data-gg-calm] [data-gg-icon] * { transition: none; animation: none !important; translate: none !important; rotate: none !important; scale: none !important; }
@media (prefers-reduced-motion: reduce) {
  [data-gg-icon], [data-gg-icon] * { transition: none; animation: none !important; translate: none !important; rotate: none !important; scale: none !important; }
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
