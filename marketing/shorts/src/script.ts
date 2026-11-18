/**
 * The three shorts, as data: the explainer-video skill's script and
 * storyboard in one place, so captions and cuts come from the same timings
 * and never drift. Each scene is one caption (one idea, at most two lines of
 * at most 22 characters at this size), held for about words / 2.3 + 0.4
 * seconds, over real screens of the app (public/shots, from capture.cjs).
 *
 * Every frame of app is the full GymGO app as it is (the footage), and every
 * short ends on what's out today: the limited version at gymgo.site. Nothing
 * claims more: no gym is shown by its brand, and no fact is shown that the
 * app doesn't show itself.
 */

import tapsJson from '../public/shots/taps.json';
import { FPS } from './theme';

type Point = { x: number; y: number };
const taps = tapsJson as Record<string, Point>;

/** A point on the app's 390 x 844 screen, from where capture.cjs really tapped. */
const tapped = (name: string): Point => {
  const point = taps[name];
  if (!point) throw new Error(`No tap recorded for ${name}: run capture.cjs`);
  return point;
};

/**
 * The camera on the phone: how much bigger the whole phone is drawn (1 to
 * about 1.45, where it still fits the canvas's width), and the height on its
 * screen, in points, to keep in view.
 */
export type Zoom = { scale: number; y: number };
export type Shot = {
  src: string;
  /** Frame within its scene. */
  from: number;
  zoom?: Zoom;
  /** Raise the phone at least this many pixels while this shot shows. */
  lift?: number;
};
export type Tap = Point & { at: number };
/**
 * A detail of a screen, enlarged over the phone: the box x, y, w, h (in
 * points) of shot `src`, from frame `at` of its scene to the scene's end.
 * `radius` rounds the callout's corners, in points: a bar's own corner, so
 * nothing behind the bar shows, or a card-like corner inside a card.
 */
export type Callout = { src: string; x: number; y: number; w: number; h: number; at: number; radius?: number };
export type Scene = { caption: string[]; frames: number; shots: Shot[]; taps?: Tap[]; callout?: Callout };
export type ShortScript = { id: string; title: string; scenes: Scene[]; endFrames: number };

const s = (seconds: number) => Math.round(seconds * FPS);
const WHOLE: Zoom = { scale: 1, y: 0 };

export const SHORTS: ShortScript[] = [
  {
    id: 'WalkIn',
    title: 'Can I walk in?',
    endFrames: s(3.8),
    scenes: [
      { caption: ['Training away', 'from home?'], frames: s(2.2), shots: [{ src: 'find-map', from: 0, zoom: WHOLE }] },
      {
        caption: ['Most gyms never say', 'if you can walk in.'],
        frames: s(3.6),
        shots: [{ src: 'find-map', from: 0, zoom: { scale: 1.06, y: 330 } }],
        taps: [{ ...tapped('find-typed'), at: s(2.9) }],
      },
      { caption: ['GymGO finds the', 'gyms near you.'], frames: s(3.0), shots: [{ src: 'find-results', from: 0, zoom: WHOLE }] },
      { caption: ['Open any gym.'], frames: s(1.8), shots: [{ src: 'find-gym', from: 0, zoom: WHOLE }] },
      {
        caption: ['Prices come with', 'their source.'],
        frames: s(4.2),
        shots: [
          { src: 'find-rows', from: 0, zoom: WHOLE },
          { src: 'find-prices', from: s(1.1), zoom: { scale: 1.12, y: 250 } },
        ],
        taps: [{ ...tapped('find-prices'), at: s(0.6) }],
        callout: { src: 'find-prices', x: 16, y: 206, w: 358, h: 96, at: s(1.7), radius: 14 },
      },
      {
        caption: ['Not published?', 'Here’s what to ask.'],
        frames: s(4.6),
        shots: [{ src: 'find-call', from: 0, zoom: { scale: 1.08, y: 420 } }],
        callout: { src: 'find-call', x: 16, y: 520, w: 358, h: 172, at: s(0.9), radius: 14 },
      },
    ],
  },
  {
    id: 'Build',
    title: 'Build it in seconds',
    endFrames: s(3.8),
    scenes: [
      { caption: ['No plan for', 'the gym today?'], frames: s(2.8), shots: [{ src: 'build-picker', from: 0, zoom: WHOLE }] },
      {
        caption: ['Tap the muscles', 'you want.'],
        frames: s(3.2),
        shots: [
          { src: 'build-picker', from: 0, zoom: { scale: 1.2, y: 400 } },
          { src: 'build-chest', from: s(0.75) },
          { src: 'build-triceps', from: s(1.9) },
        ],
        taps: [
          { ...tapped('build-chest'), at: s(0.5) },
          { ...tapped('build-triceps'), at: s(1.65) },
        ],
      },
      {
        caption: ['GymGO builds', 'the workout.'],
        frames: s(2.8),
        shots: [
          { src: 'build-options', from: 0, zoom: { scale: 1, y: 700 } },
          { src: 'build-plan', from: s(1.3), zoom: WHOLE },
        ],
        taps: [{ ...tapped('build-go'), at: s(0.8) }],
      },
      {
        caption: ['Sets, reps and rest', 'for every exercise.'],
        frames: s(3.4),
        shots: [{ src: 'build-plan', from: 0, zoom: { scale: 1.06, y: 500 } }],
        callout: { src: 'build-plan', x: 18, y: 652, w: 354, h: 140, at: s(0.5), radius: 14 },
      },
      {
        caption: ['Log a set, and', 'the rest timer starts.'],
        frames: s(5.0),
        shots: [
          { src: 'build-plan', from: 0, zoom: WHOLE },
          { src: 'log-start', from: s(0.55), zoom: { scale: 1.1, y: 420 } },
          { src: 'log-typed', from: s(1.7) },
          { src: 'log-ticked', from: s(2.9), zoom: { scale: 1, y: 800 } },
        ],
        taps: [
          { ...tapped('build-start'), at: s(0.2) },
          { ...tapped('log-weight'), at: s(1.35) },
          { ...tapped('log-tick'), at: s(2.6) },
        ],
        callout: { src: 'log-ticked', x: 20, y: 771, w: 354, h: 63, at: s(3.25), radius: 22 },
      },
      { caption: ['Every workout,', 'saved to your log.'], frames: s(3.0), shots: [{ src: 'log-done', from: 0, zoom: WHOLE }] },
    ],
  },
  {
    id: 'OnePlace',
    title: 'All in one place',
    endFrames: s(3.8),
    scenes: [
      { caption: ['Your training,', 'in one place.'], frames: s(2.6), shots: [{ src: 'home', from: 0, zoom: WHOLE }] },
      { caption: ['Weeks in a row,', 'every workout.'], frames: s(3.0), shots: [{ src: 'progress', from: 0, zoom: { scale: 1.1, y: 260 } }] },
      { caption: ['Watch your', 'strength go up.'], frames: s(2.8), shots: [{ src: 'chart', from: 0, zoom: { scale: 1.15, y: 480 } }] },
      { caption: ['See which muscles', 'you’ve trained.'], frames: s(3.4), shots: [{ src: 'recovery', from: 0, zoom: { scale: 1.12, y: 420 } }] },
      {
        caption: ['Check in at a gym.', 'Collect its card.'],
        frames: s(4.0),
        shots: [
          { src: 'collection', from: 0, zoom: WHOLE },
          { src: 'card', from: s(1.7), zoom: { scale: 1.12, y: 330 } },
        ],
      },
    ],
  },
];

export const sceneTotal = (script: ShortScript) => script.scenes.reduce((sum, scene) => sum + scene.frames, 0);
export const totalFrames = (script: ShortScript) => sceneTotal(script) + script.endFrames;
