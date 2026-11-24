/**
 * The four launch ads, as data: hook, scenes, captions, camera, callouts,
 * taps and sounds in one place, so captions, cuts and the music's drop come
 * from the same timings and never drift. Everything is counted in beats of
 * the 120 BPM track (a beat is 15 frames).
 *
 * Each ad opens on a hook (the first two seconds decide whether anyone stays),
 * drops the beat on the first real screen, says one thing per scene, and ends
 * on the same card: GymGO is live, free to join, at app.gymgo.site.
 *
 * The rules, the same as GymGO's other videos (marketing/shorts):
 * - Every frame of app is the real app (public/shots, from capture.cjs), from
 *   a FREE account, never Pro or the dev account. Callouts are crops of the
 *   same screenshots, enlarged; nothing is redrawn.
 * - No gym is shown by a chain's brand: the gyms opened are independents, and
 *   the map is framed so the chain at the top of its list stays off screen.
 * - Only what the app shows. Every search near Fitzroy says "none a sure
 *   thing at 3 pm", so nothing claims a gym is "good to go"; prices are shown
 *   with the source and date the app gives them.
 * - The training and the collection are sample data in a local test account
 *   (seed.mjs), named "Alex"; nobody real trained this.
 */

import marksJson from '../public/shots/marks.json';
import { beats } from './theme';

type Point = { x: number; y: number };
type Marks = {
  taps: Record<string, Point>;
  boxes: Record<string, { x: number; y: number; w: number; h: number }>;
  burst: Array<{ name: string; ms: number; stage: 'checking' | 'here' | 'card' | 'between' }>;
  pulled: { rarity: string; gem: string };
  legendary: { gem: string; foil: boolean };
};
const marks = marksJson as unknown as Marks;

/** Where capture.cjs really tapped, on the app's 390 x 844 screen. */
const tapped = (name: string): Point => {
  const point = marks.taps[name];
  if (!point) throw new Error(`No tap recorded for ${name}: run capture.cjs`);
  return point;
};

/**
 * The camera on the phone: how much bigger the whole phone is drawn (1 to
 * 1.42, where it still fits the canvas's width), and, when the part to see
 * is low on the screen, the point (in the app's points, 0 to 844) to lift
 * to the middle of the canvas.
 */
export type Cam = { s: number; focus?: number };
export type Shot = { src: string; at: number; cam?: Cam };
export type Tap = Point & { at: number };
export type Box = { x: number; y: number; w: number; h: number };
/** A part of a screen (box, in points) enlarged over the phone from frame `at` of its scene to its end. */
export type Callout = { src: string; box: Box; at: number; radius?: number };
export type Sfx = { src: string; at: number; volume?: number };
/** hook: the opening sticker. caption: a scene's line, word by word. slam: the montage's one big line. */
export type CaptionStyle = 'hook' | 'caption' | 'slam';
export type Scene = {
  /** One idea, at most two lines; *words* in stars get the lime highlight. */
  caption: string[];
  style?: CaptionStyle;
  frames: number;
  shots: Shot[];
  taps?: Tap[];
  callout?: Callout;
  sfx?: Sfx[];
  /** A warm glow behind the phone, for the Legendary card. */
  glow?: boolean;
};
export type AdScript = { id: string; title: string; scenes: Scene[]; endFrames: number };

const b = beats;
const WHOLE: Cam = { s: 1 };
/**
 * The map and its list, framed so the list's first row stays below the
 * canvas: near Fitzroy that row is a chain with its logo, and no chain is in
 * these ads. The callout over it shows the filters and the honest summary.
 */
const MAP: Cam = { s: 1.16 };
const MAP_TOP: Box = { x: 12, y: 474, w: 366, h: 148 };

// --- The check-in, as it was shot -----------------------------------------------------
// The frames capture.cjs took while the app checked the member was at the gym
// and then showed the new card, replayed at their own spacing, sped up so the
// card lands on a beat. Frames shot mid-change are left out.
const burst = marks.burst.filter((frame) => frame.stage !== 'between');
const firstCard = burst.findIndex((frame) => frame.stage === 'card');
const firstHere = burst.findIndex((frame) => frame.stage === 'here');
if (firstCard < 1 || firstHere < 1) throw new Error('The check-in burst has no "You’re at" or no card: run capture.cjs');
const SCAN_FRAMES = b(4);
const cardMs = burst[firstCard]!.ms;
const scanAt = (ms: number) => Math.round((ms / cardMs) * SCAN_FRAMES);
const scanShots: Shot[] = burst.slice(0, firstCard).map((frame) => ({ src: frame.name, at: scanAt(frame.ms) }));
const hereAt = scanAt(burst[firstHere]!.ms);
const cardShots: Shot[] = burst.slice(firstCard).map((frame) => ({ src: frame.name, at: scanAt(frame.ms - cardMs) }));

export const ADS: AdScript[] = [
  {
    id: 'WalkIn',
    title: 'New city, need a gym',
    endFrames: b(8),
    scenes: [
      {
        caption: ['POV: new city,', 'need a gym today 😩'],
        style: 'hook',
        frames: b(4),
        shots: [{ src: 'map', at: 0, cam: MAP }],
      },
      {
        caption: ['Your *time*.', 'Your *budget*.'],
        frames: b(6),
        shots: [{ src: 'map', at: 0, cam: MAP }],
        callout: { src: 'map', box: MAP_TOP, at: b(0.5), radius: 18 },
      },
      {
        caption: ['Most gyms never say', 'if you can *walk in*'],
        frames: b(5),
        shots: [{ src: 'results', at: 0, cam: MAP }],
        callout: { src: 'results', box: MAP_TOP, at: b(0.5), radius: 18 },
      },
      {
        caption: ['Open any gym 👇'],
        frames: b(3),
        shots: [{ src: 'gym', at: 0, cam: WHOLE }],
      },
      {
        caption: ['Real prices,', '*with the source*'],
        frames: b(6),
        shots: [
          { src: 'rows', at: 0, cam: { s: 1.08, focus: 200 } },
          { src: 'prices', at: b(1), cam: { s: 1.08, focus: 220 } },
        ],
        taps: [{ ...tapped('prices'), at: b(0.6) }],
        callout: { src: 'prices', box: { x: 12, y: 150, w: 366, h: 154 }, at: b(1.5), radius: 16 },
      },
      {
        caption: ['Not published?', 'It tells you *what to ask*'],
        frames: b(6),
        shots: [{ src: 'call', at: 0, cam: { s: 1.06, focus: 430 } }],
        callout: { src: 'call', box: { x: 12, y: 356, w: 366, h: 160 }, at: b(0.75), radius: 16 },
      },
    ],
  },
  {
    id: 'Build',
    title: 'No plan? Tap the muscles',
    endFrames: b(8),
    scenes: [
      {
        caption: ['Walked into the gym', 'with *no plan*? 🤔'],
        style: 'hook',
        frames: b(4),
        shots: [{ src: 'build-picker', at: 0, cam: WHOLE }],
      },
      {
        caption: ['Tap the *muscles*', 'you want to train'],
        frames: b(6),
        shots: [
          { src: 'build-picker', at: 0, cam: { s: 1.22, focus: 400 } },
          { src: 'build-chest', at: b(1.25) },
          { src: 'build-triceps', at: b(3.25) },
        ],
        taps: [
          { ...tapped('build-chest'), at: b(1) },
          { ...tapped('build-triceps'), at: b(3) },
        ],
      },
      {
        caption: ['GymGO *builds*', 'the workout'],
        frames: b(4),
        shots: [
          { src: 'build-options', at: 0, cam: { s: 1, focus: 640 } },
          { src: 'build-plan', at: b(1.5), cam: WHOLE },
        ],
        taps: [{ ...tapped('build-go'), at: b(1) }],
      },
      {
        caption: ['*Sets, reps & rest*', 'for every move'],
        frames: b(5),
        shots: [{ src: 'build-plan', at: 0, cam: { s: 1.06, focus: 620 } }],
        callout: { src: 'build-plan', box: { x: 16, y: 650, w: 358, h: 144 }, at: b(0.5), radius: 16 },
      },
      {
        caption: ['Tick a set and the', '*rest timer* starts ⏱️'],
        frames: b(7),
        shots: [
          { src: 'log-start', at: 0, cam: { s: 1.1, focus: 470 } },
          { src: 'log-typed', at: b(1.5) },
          { src: 'log-ticked', at: b(3), cam: { s: 1, focus: 780 } },
        ],
        taps: [
          { ...tapped('log-weight'), at: b(1) },
          { ...tapped('log-tick'), at: b(2.5) },
        ],
        callout: { src: 'log-ticked', box: { x: 16, y: 766, w: 358, h: 66 }, at: b(4), radius: 33 },
      },
      {
        caption: ['Every workout,', '*saved* ✅'],
        frames: b(4),
        shots: [{ src: 'log-done', at: 0, cam: WHOLE }],
      },
    ],
  },
  {
    id: 'Collect',
    title: 'Gym check-ins, but collectible',
    endFrames: b(8),
    scenes: [
      {
        caption: ['Gym check-ins,', 'but *collectible* 👀'],
        style: 'hook',
        frames: b(4),
        shots: [{ src: 'card-legendary', at: 0, cam: { s: 1.1 } }],
        glow: true,
      },
      {
        caption: ['At the gym?', 'Tap *I’m here*'],
        frames: b(4),
        shots: [{ src: 'collect-ready', at: 0, cam: { s: 1.08, focus: 570 } }],
        taps: [{ ...tapped('collect-here'), at: b(3.6) }],
        sfx: [{ src: 'app/scan.wav', at: b(3.6), volume: 0.9 }],
      },
      {
        caption: ['It checks you’re', '*really there* 📍'],
        frames: SCAN_FRAMES,
        shots: scanShots.map((shot, i) => (i === 0 ? { ...shot, cam: { s: 1.12, focus: 600 } } : shot)),
        sfx: [{ src: 'app/checkin.wav', at: hereAt, volume: 0.9 }],
      },
      {
        caption: ['*New card!* 🃏'],
        frames: b(5),
        shots: cardShots.map((shot, i) => (i === 0 ? { ...shot, cam: { s: 1.16, focus: 300 } } : shot)),
        sfx: [
          { src: `app/card-${marks.pulled.rarity}.wav`, at: 0, volume: 1 },
          { src: `app/gem-${marks.pulled.gem}.wav`, at: 3, volume: 0.8 },
        ],
      },
      {
        caption: ['Every visit', '*rolls again* 🎲'],
        frames: b(4),
        shots: [{ src: 'cards', at: 0, cam: { s: 1.1, focus: 330 } }],
        callout: { src: 'cards', box: { x: 12, y: 200, w: 378, h: 48 }, at: b(0.75), radius: 24 },
      },
      {
        caption: ['Chase the', '*Legendary foil* ✨'],
        frames: b(5),
        shots: [{ src: 'card-legendary', at: 0, cam: { s: 1.38, focus: 330 } }],
        glow: true,
        sfx: [
          { src: 'app/card-legendary.wav', at: 0, volume: 1 },
          ...(marks.legendary.foil ? [{ src: 'app/foil.wav', at: b(1.5), volume: 0.8 }] : []),
        ],
      },
      {
        caption: ['Unlock *badges*,', 'finish sets'],
        frames: b(4),
        shots: [{ src: 'collection-badges', at: 0, cam: { s: 1.06 } }],
        callout: { src: 'collection-badges', box: { x: 12, y: 154, w: 378, h: 88 }, at: b(0.5), radius: 16 },
      },
    ],
  },
  {
    id: 'Launch',
    title: 'GymGO is out now',
    endFrames: b(8),
    scenes: [
      {
        caption: ['GymGO is', '*finally* here 🚨'],
        style: 'hook',
        frames: b(4),
        shots: [{ src: 'home', at: 0, cam: WHOLE }],
      },
      { caption: ['Find *gyms*'], style: 'slam', frames: b(2), shots: [{ src: 'map', at: 0, cam: MAP }] },
      { caption: ['Real *prices*'], style: 'slam', frames: b(2), shots: [{ src: 'prices', at: 0, cam: { s: 1.4, focus: 228 } }] },
      { caption: ['Know what *to ask*'], style: 'slam', frames: b(2), shots: [{ src: 'call', at: 0, cam: { s: 1.36, focus: 436 } }] },
      { caption: ['Build *workouts*'], style: 'slam', frames: b(2), shots: [{ src: 'build-triceps', at: 0, cam: { s: 1.3, focus: 360 } }] },
      { caption: ['Log *every set*'], style: 'slam', frames: b(2), shots: [{ src: 'log-ticked', at: 0, cam: { s: 1.3, focus: 520 } }] },
      { caption: ['Keep your *streak*'], style: 'slam', frames: b(2), shots: [{ src: 'progress', at: 0, cam: { s: 1.3, focus: 360 } }] },
      { caption: ['Collect *every gym*'], style: 'slam', frames: b(2), shots: [{ src: 'card-legendary', at: 0, cam: { s: 1.38, focus: 330 } }], glow: true },
    ],
  },
];

export const sceneTotal = (script: AdScript) => script.scenes.reduce((sum, scene) => sum + scene.frames, 0);
export const totalFrames = (script: AdScript) => sceneTotal(script) + script.endFrames;
/** The beat drops on the first real scene, after the hook. */
export const dropAt = (script: AdScript) => script.scenes[0]!.frames;
