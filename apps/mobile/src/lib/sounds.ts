/**
 * GymGO's sound effects, made from scratch by scripts/make-sounds.mjs
 * (assets/sounds/). Quiet ones go with every haptic, so the whole app has
 * them: a choice changing, something opening, something kept, something
 * refused (lib/haptics.ts plays them). The moments that matter have their
 * own: checking in, a card's reveal (one per rarity, with foil's glitter on
 * top), finishing a set, a new record, a workout done, a rest over, a set
 * ticked, a gym saved, and the interval timer.
 *
 * A moment's own sound wins: an everyday sound played with it (the success
 * haptic beside a check-in, say) gives way rather than doubling up.
 *
 * Off with the Sounds switch in Profile → Settings. On a phone they follow
 * the silent switch and play over your music without stopping it. In a
 * browser they play once the page has been tapped, as browsers require.
 */

import type { Rarity } from './rarity';

// Loaded when first played, so nothing here runs (or downloads) before a sound is wanted.
const FILES = {
  select: () => require('../../assets/sounds/select.wav'),
  tap: () => require('../../assets/sounds/tap.wav'),
  success: () => require('../../assets/sounds/success.wav'),
  warn: () => require('../../assets/sounds/warn.wav'),
  tick: () => require('../../assets/sounds/tick.wav'),
  save: () => require('../../assets/sounds/save.wav'),
  scan: () => require('../../assets/sounds/scan.wav'),
  checkin: () => require('../../assets/sounds/checkin.wav'),
  'card-common': () => require('../../assets/sounds/card-common.wav'),
  'card-uncommon': () => require('../../assets/sounds/card-uncommon.wav'),
  'card-rare': () => require('../../assets/sounds/card-rare.wav'),
  'card-epic': () => require('../../assets/sounds/card-epic.wav'),
  'card-legendary': () => require('../../assets/sounds/card-legendary.wav'),
  foil: () => require('../../assets/sounds/foil.wav'),
  'set-complete': () => require('../../assets/sounds/set-complete.wav'),
  record: () => require('../../assets/sounds/record.wav'),
  finish: () => require('../../assets/sounds/finish.wav'),
  'rest-done': () => require('../../assets/sounds/rest-done.wav'),
  'timer-go': () => require('../../assets/sounds/timer-go.wav'),
  'timer-count': () => require('../../assets/sounds/timer-count.wav'),
} satisfies Record<string, () => unknown>;

export type Sound = keyof typeof FILES;

/** The everyday ones, alongside haptics: quiet, and giving way to a moment's own sound. */
const EVERYDAY = new Set<Sound>(['select', 'tap', 'success', 'warn']);

/** How long after a moment's own sound an everyday one stays quiet. */
const QUIET_AFTER_MS = 400;
/** An everyday sound waits this long, in case a moment's own sound comes with it. */
const EVERYDAY_WAIT_MS = 25;

let enabled = true;

/** The Sounds switch in Profile. */
export function setSoundsEnabled(on: boolean): void {
  enabled = on;
}

// How loud each plays is in the file itself (scripts/make-sounds.mjs), as
// browsers on an iPhone ignore a player's volume.
interface Player {
  play(): void;
  seekTo(seconds: number): Promise<void>;
}

type AudioModule = {
  createAudioPlayer(source: unknown): Player;
  setAudioModeAsync(mode: Record<string, unknown>): Promise<void>;
};

let audio: AudioModule | null | undefined;
const players = new Map<Sound, Player>();

function audioModule(): AudioModule | null {
  if (audio !== undefined) return audio;
  try {
    audio = require('expo-audio') as AudioModule;
    // Follow the silent switch, and play over music rather than stopping it.
    void audio
      .setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false, allowsRecording: false })
      .catch(() => undefined);
  } catch {
    audio = null;
  }
  return audio;
}

function playerFor(sound: Sound): Player | null {
  const module = audioModule();
  if (!module) return null;
  let player = players.get(sound);
  if (!player) {
    player = module.createAudioPlayer(FILES[sound]());
    players.set(sound, player);
  }
  return player;
}

function start(sound: Sound): void {
  try {
    const player = playerFor(sound);
    if (!player) return;
    // From the top, even if it played a moment ago.
    player
      .seekTo(0)
      .catch(() => undefined)
      .then(() => player.play());
  } catch {
    // No sound, then: the screen and the haptic still say what happened.
  }
}

let lastMoment = 0;
let waiting: ReturnType<typeof setTimeout> | null = null;
const lastEveryday = new Map<Sound, number>();

/**
 * Play one of GymGO's sounds, unless Sounds is off. `afterMs` waits first
 * (foil's glitter after the card's own sound).
 */
export function playSound(sound: Sound, afterMs = 0): void {
  if (!enabled) return;
  const now = Date.now();
  if (EVERYDAY.has(sound)) {
    if (now - lastMoment < QUIET_AFTER_MS) return;
    // Not the same one twice in a blink (a slider, a sheet settling).
    if (now - (lastEveryday.get(sound) ?? 0) < 70) return;
    lastEveryday.set(sound, now);
    if (waiting) clearTimeout(waiting);
    waiting = setTimeout(() => {
      waiting = null;
      if (enabled && Date.now() - lastMoment >= QUIET_AFTER_MS) start(sound);
    }, EVERYDAY_WAIT_MS);
    return;
  }
  lastMoment = now;
  if (waiting) {
    clearTimeout(waiting);
    waiting = null;
  }
  if (afterMs > 0) setTimeout(() => enabled && start(sound), afterMs);
  else start(sound);
}

/** A card's reveal: its rarity's sound, with foil's glitter on top. */
export function playCardSound(rarity: Rarity, foil: boolean): void {
  playSound(`card-${rarity}`);
  if (foil) playSound('foil', 380);
}
