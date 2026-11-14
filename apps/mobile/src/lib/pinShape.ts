/**
 * The picked gym's map pin: one teardrop, drawn the same on the iPhone map
 * (components/Pin.tsx), the browser's (GymMap.web.tsx) and Android's map page
 * (mapPage.ts), and where its tip is, so each map can stand it on its gym.
 */

/** The teardrop, in a 40 × 50 box, tip down. */
export const DROP_PATH =
  'M20 2C10.06 2 2 10.06 2 20c0 9.4 11.2 22.6 16.3 28.3a2.3 2.3 0 0 0 3.4 0C26.8 42.6 38 29.4 38 20 38 10.06 29.94 2 20 2z';
export const DROP_BOX = { width: 40, height: 50 };
/** As drawn, in points, with its white outline. */
export const DROP_DRAWN = { width: 44, height: 55 };
export const DROP_OUTLINE = 2.2;

/** The teardrop's round head, in the box (the path's first arc: centred at 20, 20, radius 18). */
export const DROP_HEAD = { cx: 20, cy: 20, radius: 18 };
/** A soft lit disc inside the head, behind the dumbbell. */
export const DROP_HIGHLIGHT = 12.5;
/**
 * The box the dumbbell is centred in, in points: from the top of the drawing
 * down to twice the head's centre, so its middle is the head's centre.
 */
export const DROP_GLYPH_BOX = 2 * DROP_HEAD.cy * (DROP_DRAWN.height / DROP_BOX.height);

/**
 * The tip's geometry, as the path draws it: the sides meet at y 48.3, three
 * and a bit units apart, rounded off by an arc of radius 2.3 that dips below.
 */
const SIDES_MEET = 48.3;
const ROUND_OFF = { radius: 2.3, across: 3.4 };

/** How far down the drawing the tip's point is, in points (its outline reaches a little further). */
export function dropTipY(drawnHeight: number = DROP_DRAWN.height): number {
  const dip = ROUND_OFF.radius - Math.sqrt(ROUND_OFF.radius ** 2 - (ROUND_OFF.across / 2) ** 2);
  return (SIDES_MEET + dip) * (drawnHeight / DROP_BOX.height);
}

/** The iPhone's picked marker: the teardrop, with room under it for its shadow on the ground. */
export const PICKED_HEIGHT = 58;
/** Where its tip sits down that marker, in points. */
export const PICKED_TIP = 54.3;

/** The tip, as a share of the marker's height: Google's maps anchor the marker there. */
export const PICKED_ANCHOR_Y = PICKED_TIP / PICKED_HEIGHT;

/**
 * The same for Apple Maps, which ignores `anchor` and puts a marker's centre
 * on its spot, moved by an offset in points: up, so the tip is on the gym.
 */
export const PICKED_CENTER_OFFSET = { x: 0, y: -(PICKED_TIP - PICKED_HEIGHT / 2) };
