/**
 * Other people's colours: a friend or someone on the leaderboard without a
 * picture is their initial on a colour of their own, the same one wherever
 * they appear, so a list of them is easy to tell apart. You keep your
 * accent (components/Avatar.tsx).
 *
 * Deep enough for a white initial to read (WCAG AA), and none of them green
 * or orange: those mean "good to go" and "call first" in GymGO.
 *
 * No React Native here, so it is unit-tested in Node.
 */

export const PERSON_COLOURS = ['#B4235A', '#1D63A8', '#7A3FB8', '#0E6E85', '#9C2F8B', '#4A5A78', '#8A4B2A'] as const;

/**
 * A person's colour, from the name they show: the leaderboard gives no ids,
 * so the name is what every list has, and a person is one colour in all of
 * them.
 */
export function personColour(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PERSON_COLOURS[hash % PERSON_COLOURS.length]!;
}
