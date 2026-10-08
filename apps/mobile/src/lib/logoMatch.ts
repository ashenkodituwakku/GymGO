/**
 * Which brand logo, if any, belongs to a gym. No React Native here, so it's
 * unit-tested in Node.
 *
 * A logo is someone's trademark, so a wrong match is worse than none. It
 * matches only by the brand's Wikidata ID from the map, the gym's exact brand
 * or name, or a name that starts with the whole brand name ("Snap Fitness Mt
 * Lawley"); never a looser resemblance, and never an invented demo gym.
 */

import type { GymLocation } from '@gymgo/domain';

export interface LogoKey {
  qid: string;
  brand: string;
}

const normalise = (text: string) =>
  text
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export function matchLogo<T extends LogoKey>(location: GymLocation, logos: readonly T[]): T | null {
  if (location.isDemoData) return null;
  const qid = location.externalRefs.wikidataBrand;
  const byId = qid ? logos.find((logo) => logo.qid === qid) : undefined;
  if (byId) return byId;
  const brand = location.brand ? normalise(location.brand) : null;
  const name = normalise(location.name);
  return (
    logos.find((logo) => {
      const target = normalise(logo.brand);
      return brand === target || name === target || name.startsWith(`${target} `);
    }) ?? null
  );
}
