/**
 * The picture for one of the demo's invented gyms: an illustration made for
 * the demo (scripts/demo-pictures.mjs), never a photograph, and shown as
 * one wherever a gym's picture goes, credited as such. A real gym never
 * gets one: it has members' photos, its own website's, or "No photo
 * supplied".
 */

import type { GymLocation } from '@gymgo/domain';
import { DEMO_PICTURES } from './demoPictures';

export const ILLUSTRATION_CREDIT = 'Illustration made for the GymGO demo';

export type DemoPicture = { source: number; alt: string };

export function demoPicture(location: Pick<GymLocation, 'id' | 'isDemoData'> | null | undefined): DemoPicture | null {
  if (!location?.isDemoData) return null;
  const picture = DEMO_PICTURES[location.id];
  // Said as an illustration to a screen reader too, not only by the label drawn over it.
  return picture ? { source: picture.source, alt: `Illustration: ${picture.alt}` } : null;
}
