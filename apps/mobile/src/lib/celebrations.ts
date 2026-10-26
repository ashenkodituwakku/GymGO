/**
 * How a new record or a weekly goal met is celebrated after Finish:
 * confetti for everyone; fireworks, gold stars or a shower of emoji with
 * GymGO Pro (picked in Appearance). Kept on this device with your settings.
 *
 * No React Native here, so it is unit-tested in Node.
 */

export type CelebrationStyle = 'confetti' | 'fireworks' | 'stars' | 'emoji';

export const CELEBRATIONS: Array<{ id: CelebrationStyle; name: string; blurb: string; sample: string }> = [
  { id: 'confetti', name: 'Confetti', blurb: 'A burst of colour from the top', sample: '🎊' },
  { id: 'fireworks', name: 'Fireworks', blurb: 'Three bursts across the screen', sample: '🎆' },
  { id: 'stars', name: 'Gold stars', blurb: 'Stars drifting down, twinkling', sample: '⭐' },
  { id: 'emoji', name: 'Emoji', blurb: 'A shower of muscles, fire and trophies', sample: '💪' },
];

export const FREE_CELEBRATION: CelebrationStyle = 'confetti';

/** What the emoji shower drops, in turn. */
export const SHOWER_EMOJI = ['💪', '🔥', '🏆', '⭐', '🎉'];

/** What was kept, cleaned: anything unknown is confetti. */
export function cleanCelebration(value: unknown): CelebrationStyle {
  return CELEBRATIONS.some((item) => item.id === value) ? (value as CelebrationStyle) : FREE_CELEBRATION;
}

/** The one that plays: yours with Pro, confetti without (what you picked is kept for when Pro's back). */
export function celebrationFor(picked: CelebrationStyle, isPro: boolean): CelebrationStyle {
  return isPro ? picked : FREE_CELEBRATION;
}
