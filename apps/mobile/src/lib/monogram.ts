/**
 * A gym's initials, for the tile shown where it has no photo or logo: "DG"
 * for Doherty's Gym, "UF" for The Underground Fitness Club, "F45" for F45
 * Training. Lettering, never a picture: it stands in for nothing the gym
 * looks like.
 */

/** Words that don't make an initial: articles, joins, and what most gyms' names end in. */
const SKIP = new Set(['the', 'and', '&', 'of', 'at', 'a', 'co', 'co.', '+', '-', '–', '·']);

export function monogram(name: string): string {
  const words = name
    .replace(/[’']s\b/gi, '')
    .split(/[\s/]+/)
    .map((word) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter((word) => word && !SKIP.has(word.toLowerCase()));
  if (words.length === 0) return '';
  const first = words[0]!;
  // A name led by a number keeps it whole: F45, 9Round, 24/7.
  const lead = first.match(/^\p{L}?\p{N}+/u)?.[0];
  if (lead && lead.length <= 3) return lead.toUpperCase();
  const initial = (word: string) => [...word][0]!.toUpperCase();
  return words.length === 1 ? initial(first) : initial(first) + initial(words[1]!);
}
