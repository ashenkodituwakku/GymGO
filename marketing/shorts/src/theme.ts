/**
 * The look of every short, locked before any scene (the explainer-video skill's
 * style system): one type scale, one colour grammar, one easing, one set of
 * transitions. Colour means the same thing throughout: GymGO's indigo is the
 * ground, white is what to read, soft white is what's said quietly.
 */

import { Easing } from 'remotion';

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export const color = {
  /** GymGO's own accent (the app's Indigo), flat: no glows, no gradients. */
  ground: '#5856D6',
  ink: '#FFFFFF',
  soft: 'rgba(255, 255, 255, 0.84)',
  chip: 'rgba(255, 255, 255, 0.16)',
  bezel: '#0E0E14',
  tap: '#FFFFFF',
};

export const type = {
  family: 'Inter, system-ui, sans-serif',
  caption: { size: 74, weight: 800, line: 1.14 },
  chip: { size: 30, weight: 600 },
  end: { big: 132, mid: 54, small: 38 },
};

/** Enter: quick then settling. Used for every move in every short. */
export const ease = Easing.bezier(0.22, 1, 0.36, 1);

/** Frames for a crossfade between two screens of the app, and for text to leave. */
export const CUT = 7;
export const LEAVE = 6;

/**
 * The phone: the app's screen is 390 x 844 points, shot at three times that.
 * Shown 664 px wide, its top below the caption; the canvas cuts off its foot,
 * where the platforms' own buttons and captions sit anyway.
 */
export const phone = {
  bezel: 16,
  screenWidth: 664,
  top: 596,
  radius: 92,
};
export const POINT = phone.screenWidth / 390;
export const screenHeight = Math.round(844 * POINT);

/** Where text is safe from each platform's own overlays (top bar, side buttons, caption). */
export const safe = { top: 196, side: 90 };
