/**
 * The look of every launch ad, locked before any scene: one tempo, one type
 * scale, one colour grammar. GymGO's indigo is the ground (the app icon's own
 * gradient), white is what to read, lime marks the one word that matters in
 * each line, the way a creator's caption would.
 */

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

/** 120 BPM: a beat is 15 frames. Every cut, pop and punch lands on one. */
export const BEAT = 15;
export const beats = (n: number) => Math.round(n * BEAT);

export const color = {
  /** The app icon's gradient, light top-left to deep bottom-right (public/og.png). */
  top: '#7C86FF',
  mid: '#5856D6',
  deep: '#2A1AB0',
  ink: '#FFFFFF',
  soft: 'rgba(255, 255, 255, 0.86)',
  /** The highlight behind a caption's key word, and the callouts' rim. */
  lime: '#D9FF43',
  limeInk: '#16112E',
  bezel: '#0D0C14',
  live: '#FF3B5C',
  gold: '#FFD25A',
};

export const font = {
  family: 'Inter, "Noto Color Emoji", system-ui, sans-serif',
};

export const type = {
  /** A scene's caption: two lines at most, about 17 characters each at this size. */
  caption: { size: 86, weight: 900, line: 1.12 },
  /** The montage's one-line slams. */
  slam: { size: 104, weight: 900 },
  /** The hook's sticker, the first thing anyone reads. */
  hook: { size: 74, weight: 900, line: 1.16 },
};

/**
 * The phone: the app's screen is 390 x 844 points, shot at three times that,
 * shown 720 px wide. It sits under the caption, and the canvas cuts off its
 * foot, where TikTok lays its own caption and buttons anyway.
 */
export const phone = {
  bezel: 18,
  screenWidth: 720,
  /** The top of the bezel on the canvas, at rest. */
  top: 600,
  radius: 104,
};
export const POINT = phone.screenWidth / 390;
export const screenHeight = Math.round(844 * POINT);
export const phoneHeight = screenHeight + phone.bezel * 2;

/**
 * Where TikTok's own interface sits over a video: the tabs along the top, the
 * buttons down the right and the account name and caption along the bottom.
 * Every word and every callout stays inside the rest.
 */
export const safe = { top: 190, bottom: 1520, left: 90, right: 950 };

/** Where the camera brings the part of a screen it's looking at. */
export const FOCUS_Y = 1120;
/** How wide a callout (a detail of a screen, enlarged) is drawn. */
export const CALLOUT_WIDTH = 860;
/** Where a callout's middle sits: over the phone, clear of TikTok's buttons and caption. */
export const CALLOUT_MIDDLE = 1130;
