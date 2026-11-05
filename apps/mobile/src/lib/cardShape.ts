/**
 * The collection card's silhouette for each rarity (components/GemCard.tsx
 * draws it): its outline as an SVG path, the face inside the frame, and the
 * rarity's metal. Rarer cards have more worked shapes, so a card's rarity
 * reads at a glance, even in a grid:
 *
 *   Common     rounded corners, steel
 *   Uncommon   cut corners, green
 *   Rare       cut top corners, notched sides, blue
 *   Epic       scooped corners and a second line inside, purple
 *   Legendary  scooped corners, a raised crest with a crown, studs, gold
 *
 * It's only the card's frame: the gym's own logo or a member's photo sits
 * in a plain box inside it. No React Native here, so it's tested in Node.
 */

import type { Rarity } from '@gymgo/domain';

type Corner = { kind: 'round' | 'cut' | 'scoop'; size: number };

export interface CardFrameSpec {
  /** The frame's width, outline to face. */
  frame: number;
  corners: { top: Corner; bottom: Corner };
  /** V notches in both sides, at this share of the card's height. */
  notchAt?: number;
  /** A crest rising from the top edge's middle: its height above that edge. */
  crest?: number;
  /** The rarity's metal: light, base and deep, as a gem's colours are. */
  metal: readonly [string, string, string];
  /** Rare and up glow in their metal. */
  glow: number;
}

export const CARD_FRAMES: Record<Rarity, CardFrameSpec> = {
  common: { frame: 3, corners: { top: { kind: 'round', size: 14 }, bottom: { kind: 'round', size: 14 } }, metal: ['#E3E7EC', '#9BA3AD', '#5E6670'], glow: 0 },
  uncommon: { frame: 4, corners: { top: { kind: 'cut', size: 11 }, bottom: { kind: 'cut', size: 11 } }, metal: ['#A8EBC0', '#2FAE6A', '#17673F'], glow: 0 },
  rare: { frame: 4, corners: { top: { kind: 'cut', size: 15 }, bottom: { kind: 'round', size: 14 } }, notchAt: 0.36, metal: ['#A9D6FF', '#2F86E8', '#174A9C'], glow: 0.5 },
  epic: { frame: 5, corners: { top: { kind: 'scoop', size: 13 }, bottom: { kind: 'scoop', size: 13 } }, metal: ['#E2C2FF', '#9148E6', '#4E1D90'], glow: 0.75 },
  legendary: { frame: 6, corners: { top: { kind: 'scoop', size: 15 }, bottom: { kind: 'scoop', size: 15 } }, notchAt: 0.36, crest: 14, metal: ['#FFF0B8', '#E3AC2F', '#8C5A0B'], glow: 1 },
};

/** How far the sides' notches go in, and half their height. */
const NOTCH_DEPTH = 4;
const NOTCH_HALF = 6;

const n = (value: number) => Math.round(value * 100) / 100;

/**
 * The outline of a card `width` × `height`, drawn `inset` in from its edge
 * (0 for the outline, the frame's width for the face), moved by `x`, `y`.
 * A shape's corners and notches shrink by the inset, so the face's edge runs
 * parallel to the outline's; a scooped corner stays round the same centre.
 */
export function cardPath(rarity: Rarity, width: number, height: number, inset = 0, x = 0, y = 0): string {
  const spec = CARD_FRAMES[rarity];
  const crest = spec.crest ?? 0;
  const left = x + inset;
  const right = x + width - inset;
  const top = y + crest + inset;
  const bottom = y + height - inset;
  // Each corner's leg (how far along each edge it starts) and, for a curve, its radius, the face's
  // running parallel to the outline's: a cut moves in along the diagonal, a round corner keeps its
  // centre, and a scoop stays round the outline's corner point.
  const shape = (corner: Corner): { leg: number; radius: number } => {
    if (corner.kind === 'round') return { leg: Math.max(0, corner.size - inset), radius: Math.max(0, corner.size - inset) };
    if (corner.kind === 'cut') return { leg: Math.max(0, corner.size - inset * (2 - Math.SQRT2)), radius: 0 };
    const radius = corner.size + inset;
    return { leg: Math.sqrt(radius * radius - inset * inset) - inset, radius };
  };
  const tc = spec.corners.top;
  const bc = spec.corners.bottom;
  const { leg: t, radius: tr } = shape(tc);
  const { leg: b, radius: br } = shape(bc);
  const parts: string[] = [`M ${n(left + t)} ${n(top)}`];

  if (crest > 0) {
    // The crest: a third of the width, its shoulders curving up from the top edge.
    const middle = x + width / 2;
    const half = Math.max(30, width * 0.2) - inset * 0.4;
    const rise = y + inset;
    const shoulder = Math.min(12, half * 0.45);
    parts.push(
      `L ${n(middle - half - shoulder)} ${n(top)}`,
      `C ${n(middle - half)} ${n(top)} ${n(middle - half)} ${n(rise)} ${n(middle - half + shoulder)} ${n(rise)}`,
      `L ${n(middle + half - shoulder)} ${n(rise)}`,
      `C ${n(middle + half)} ${n(rise)} ${n(middle + half)} ${n(top)} ${n(middle + half + shoulder)} ${n(top)}`,
    );
  }

  const corner = (kind: Corner['kind'], r: number, endX: number, endY: number) => {
    if (r <= 0 || kind === 'cut') return `L ${n(endX)} ${n(endY)}`;
    if (kind === 'round') return `A ${n(r)} ${n(r)} 0 0 1 ${n(endX)} ${n(endY)}`;
    return `A ${n(r)} ${n(r)} 0 0 0 ${n(endX)} ${n(endY)}`;
  };
  const notch = (side: 'left' | 'right') => {
    if (spec.notchAt === undefined) return [];
    const at = y + crest + (height - crest) * spec.notchAt;
    const depth = NOTCH_DEPTH;
    const half = Math.max(2, NOTCH_HALF - inset * 0.5);
    return side === 'right'
      ? [`L ${n(right)} ${n(at - half)}`, `L ${n(right - depth)} ${n(at)}`, `L ${n(right)} ${n(at + half)}`]
      : [`L ${n(left)} ${n(at + half)}`, `L ${n(left + depth)} ${n(at)}`, `L ${n(left)} ${n(at - half)}`];
  };

  parts.push(`L ${n(right - t)} ${n(top)}`, corner(tc.kind, tr, right, top + t));
  parts.push(...notch('right'));
  parts.push(`L ${n(right)} ${n(bottom - b)}`, corner(bc.kind, br, right - b, bottom));
  parts.push(`L ${n(left + b)} ${n(bottom)}`, corner(bc.kind, br, left, bottom - b));
  parts.push(...notch('left'));
  parts.push(`L ${n(left)} ${n(top + t)}`, corner(tc.kind, tr, left + t, top), 'Z');
  return parts.join(' ');
}

/**
 * How far in from the card's edge its content keeps, so nothing on it runs
 * into a corner, a notch or the crest.
 */
export function cardPadding(rarity: Rarity): { top: number; side: number; bottom: number; corner: number } {
  const spec = CARD_FRAMES[rarity];
  const deepest = Math.max(spec.corners.top.size, spec.corners.bottom.size);
  return {
    top: (spec.crest ?? 0) + spec.frame + 7,
    side: spec.frame + (spec.notchAt === undefined ? 7 : NOTCH_DEPTH + 6),
    bottom: spec.frame + 10,
    // Room the header and footer leave each side, for a corner's curve or cut.
    corner: spec.frame + Math.round(deepest * 0.75),
  };
}

/** The card is drawn this far inside a bigger picture, so its glow has room. */
export const GLOW_ROOM = 10;
