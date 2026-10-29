/**
 * How GymGO's sounds are voiced: Marimba (soft marimba and bells) for
 * everyone, or Arcade (chip tunes) with GymGO Pro, picked in Appearance.
 * Arcade voices the workout and check-in moments; the cards keep their own
 * sounds, in either. Made by scripts/make-sounds.mjs.
 *
 * No React Native here, so it is unit-tested in Node.
 */

export type SoundPack = 'marimba' | 'arcade';

export const SOUND_PACKS: Array<{ id: SoundPack; name: string; blurb: string; sample: string }> = [
  { id: 'marimba', name: 'Marimba', blurb: 'Soft marimba and bells', sample: '🎵' },
  { id: 'arcade', name: 'Arcade', blurb: 'Chip tunes, like an old games console', sample: '🕹️' },
];

export const FREE_SOUND_PACK: SoundPack = 'marimba';

/** The sounds Arcade has its own of; anything else plays as it is. */
export const ARCADE_SOUNDS = ['scan', 'checkin', 'set-complete', 'record', 'rest-done', 'timer-go', 'timer-count'] as const;

/** What was kept, cleaned: anything unknown is Marimba. */
export function cleanSoundPack(value: unknown): SoundPack {
  return SOUND_PACKS.some((item) => item.id === value) ? (value as SoundPack) : FREE_SOUND_PACK;
}

/** The one that plays: yours with Pro, Marimba without (what you picked is kept for when Pro's back). */
export function soundPackFor(picked: SoundPack, isPro: boolean): SoundPack {
  return isPro ? picked : FREE_SOUND_PACK;
}

/** The file a sound plays from in a pack: Arcade's own where it has one. */
export function voiced<S extends string>(sound: S, pack: SoundPack): S | `arcade-${S}` {
  return pack === 'arcade' && (ARCADE_SOUNDS as readonly string[]).includes(sound) ? `arcade-${sound}` : sound;
}
