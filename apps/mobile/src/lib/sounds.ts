/**
 * GymGO's sound effects, made from scratch by scripts/make-sounds.mjs
 * (assets/sounds/): soft marimba and bell tones, never a click. Only the
 * moments worth a little thrill have one: checking in at a gym, a card's
 * reveal, a finished set, a new record. Buttons make no sound (their
 * haptic is enough). The interval timer and the rest timer keep their cues,
 * so you can train without watching the screen.
 *
 * A card's reveal is two layers: its rarity's sound (how big: two notes for
 * Common up to a run, a chord and glitter for Legendary) and its gem's
 * signature over it (how it sounds: a warm bell for Ruby, glass for
 * Sapphire, a marimba trill for Emerald...), written to always agree.
 * Foil adds its glitter on top.
 *
 * Arcade (GymGO Pro, picked in Appearance) plays the workout and check-in
 * moments as chip tunes instead (lib/soundPacks.ts).
 *
 * Off with the Sounds switch in Profile → Settings. On a phone they follow
 * the silent switch and play over your music without stopping it. In a
 * browser they play once the page has been tapped, as browsers require.
 */

import type { Gem, Rarity } from './rarity';
import { ARCADE_SOUNDS, FREE_SOUND_PACK, voiced, type SoundPack } from './soundPacks';

// Loaded when first played, so nothing here runs (or downloads) before a sound is wanted.
const FILES = {
  scan: () => require('../../assets/sounds/scan.wav'),
  checkin: () => require('../../assets/sounds/checkin.wav'),
  'card-common': () => require('../../assets/sounds/card-common.wav'),
  'card-uncommon': () => require('../../assets/sounds/card-uncommon.wav'),
  'card-rare': () => require('../../assets/sounds/card-rare.wav'),
  'card-epic': () => require('../../assets/sounds/card-epic.wav'),
  'card-legendary': () => require('../../assets/sounds/card-legendary.wav'),
  foil: () => require('../../assets/sounds/foil.wav'),
  'gem-ruby': () => require('../../assets/sounds/gem-ruby.wav'),
  'gem-sapphire': () => require('../../assets/sounds/gem-sapphire.wav'),
  'gem-emerald': () => require('../../assets/sounds/gem-emerald.wav'),
  'gem-amethyst': () => require('../../assets/sounds/gem-amethyst.wav'),
  'gem-topaz': () => require('../../assets/sounds/gem-topaz.wav'),
  'gem-aquamarine': () => require('../../assets/sounds/gem-aquamarine.wav'),
  'gem-rose': () => require('../../assets/sounds/gem-rose.wav'),
  'gem-onyx': () => require('../../assets/sounds/gem-onyx.wav'),
  'set-complete': () => require('../../assets/sounds/set-complete.wav'),
  record: () => require('../../assets/sounds/record.wav'),
  'rest-done': () => require('../../assets/sounds/rest-done.wav'),
  'timer-go': () => require('../../assets/sounds/timer-go.wav'),
  'timer-count': () => require('../../assets/sounds/timer-count.wav'),
  'arcade-scan': () => require('../../assets/sounds/arcade-scan.wav'),
  'arcade-checkin': () => require('../../assets/sounds/arcade-checkin.wav'),
  'arcade-set-complete': () => require('../../assets/sounds/arcade-set-complete.wav'),
  'arcade-record': () => require('../../assets/sounds/arcade-record.wav'),
  'arcade-rest-done': () => require('../../assets/sounds/arcade-rest-done.wav'),
  'arcade-timer-go': () => require('../../assets/sounds/arcade-timer-go.wav'),
  'arcade-timer-count': () => require('../../assets/sounds/arcade-timer-count.wav'),
} satisfies Record<string, () => unknown>;

type File = keyof typeof FILES;
/** A moment that has a sound; its pack decides which file plays. */
export type Sound = Exclude<File, `arcade-${string}`>;
// Every sound Arcade voices has its file here, or this doesn't compile.
const arcadeFiles: `arcade-${(typeof ARCADE_SOUNDS)[number]}` extends File ? true : never = true;
void arcadeFiles;

let enabled = true;
let pack: SoundPack = FREE_SOUND_PACK;

/** The Sounds switch in Profile. */
export function setSoundsEnabled(on: boolean): void {
  enabled = on;
}

/** The pack that plays (soundPackFor: yours with Pro). */
export function setSoundPack(next: SoundPack): void {
  pack = next;
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
const players = new Map<File, Player>();

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

function playerFor(sound: File): Player | null {
  const module = audioModule();
  if (!module) return null;
  let player = players.get(sound);
  if (!player) {
    player = module.createAudioPlayer(FILES[sound]());
    players.set(sound, player);
  }
  return player;
}

function start(sound: Sound, voice: SoundPack): void {
  try {
    const player = playerFor(voiced(sound, voice) as File);
    if (!player) return;
    // From the top, even if it played a moment ago.
    player
      .seekTo(0)
      .catch(() => undefined)
      .then(() => player.play())
      // A player let go of meanwhile: no sound, rather than an unhandled rejection.
      .catch(() => undefined);
  } catch {
    // No sound, then: the screen and the haptic still say what happened.
  }
}

/**
 * Play one of GymGO's sounds, unless Sounds is off. `afterMs` waits first
 * (a gem's signature after its card's first notes); `voice` plays it in
 * another pack than yours (Appearance's previews).
 */
export function playSound(sound: Sound, afterMs = 0, voice: SoundPack = pack): void {
  if (!enabled) return;
  if (afterMs > 0) setTimeout(() => enabled && start(sound, voice), afterMs);
  else start(sound, voice);
}

/** When each rarity's sound has played enough for the gem's signature to come in over it. */
const GEM_AFTER_MS: Record<Rarity, number> = { common: 120, uncommon: 200, rare: 260, epic: 420, legendary: 560 };

/** A card's reveal: its rarity's sound, its gem's signature over it, and foil's glitter on top. */
export function playCardSound(rarity: Rarity, gem: Gem, foil: boolean): void {
  playSound(`card-${rarity}`);
  playSound(`gem-${gem}`, GEM_AFTER_MS[rarity]);
  if (foil) playSound('foil', GEM_AFTER_MS[rarity] + 220);
}
