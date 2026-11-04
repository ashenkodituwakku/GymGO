import { describe, expect, it } from 'vitest';
import { CARD_FRAMES, cardPadding, cardPath } from './cardShape';
import { RARITIES as LISTED } from './rarity';

const RARITIES = LISTED.map((rarity) => rarity.id);

/** The points a path goes through, its curves' ends included. */
const points = (path: string) => {
  const numbers = path.match(/-?\d+(\.\d+)?/g)!.map(Number);
  const out: Array<[number, number]> = [];
  for (const command of path.split(/(?=[MLCAZ])/)) {
    const values = command.slice(1).trim().split(/\s+/).filter(Boolean).map(Number);
    if (command.startsWith('A')) out.push([values[5]!, values[6]!]);
    else for (let at = 0; at + 1 < values.length; at += 2) out.push([values[at]!, values[at + 1]!]);
  }
  return numbers.length ? out : [];
};

describe('a card’s shape by rarity', () => {
  it('has a shape for every rarity, each closed and inside the card', () => {
    for (const rarity of RARITIES) {
      const path = cardPath(rarity, 170, 240);
      expect(path.startsWith('M ')).toBe(true);
      expect(path.endsWith('Z')).toBe(true);
      for (const [x, y] of points(path)) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(170);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(240);
      }
    }
  });

  it('gives each rarity a different outline', () => {
    // Its commands, and which way each curve bends (out for a round corner, in for a scoop).
    const signature = (path: string) => path.split(/(?=[MLCAZ])/).map((command) => (command.startsWith('A') ? `A${command.trim().split(/\s+/)[5]}` : command[0])).join('');
    const outlines = new Set(RARITIES.map((rarity) => signature(cardPath(rarity, 170, 240))));
    expect(outlines.size).toBe(RARITIES.length);
  });

  it('rounds Common, cuts Uncommon, notches Rare, scoops Epic, and crowns Legendary with a crest', () => {
    expect(cardPath('common', 100, 100)).toContain('A 14 14 0 0 1');
    expect(cardPath('uncommon', 100, 100)).not.toContain('A ');
    expect(cardPath('rare', 100, 100)).toContain('L 96 '); // the notch, 4 in from the right
    expect(cardPath('epic', 100, 100)).toContain('A 13 13 0 0 0');
    const legendary = cardPath('legendary', 170, 240);
    expect(legendary).toContain(' C ');
    // The crest rises to the very top; the rest of the top edge is lower.
    expect(Math.min(...points(legendary).map(([, y]) => y))).toBe(0);
    expect(legendary.startsWith(`M 15 ${CARD_FRAMES.legendary.crest}`)).toBe(true);
  });

  it('draws the face inside the frame, its corners parallel to the outline’s', () => {
    for (const rarity of RARITIES) {
      const { frame } = CARD_FRAMES[rarity];
      for (const [x, y] of points(cardPath(rarity, 170, 240, frame))) {
        expect(x).toBeGreaterThanOrEqual(frame - 0.01);
        expect(x).toBeLessThanOrEqual(170 - frame + 0.01);
        expect(y).toBeLessThanOrEqual(240 - frame + 0.01);
      }
    }
    // A scooped corner stays round the outline's corner: radius grows by the frame.
    expect(cardPath('epic', 100, 100, 5)).toContain('A 18 18 0 0 0');
    // A round one keeps its centre: radius shrinks by it.
    expect(cardPath('common', 100, 100, 3)).toContain('A 11 11 0 0 1');
  });

  it('keeps content clear of the frame, corners, notches and crest', () => {
    for (const rarity of RARITIES) {
      const pad = cardPadding(rarity);
      const spec = CARD_FRAMES[rarity];
      expect(pad.top).toBeGreaterThan(spec.frame + (spec.crest ?? 0));
      expect(pad.side).toBeGreaterThan(spec.frame);
      expect(pad.corner).toBeGreaterThanOrEqual(pad.side);
    }
    expect(cardPadding('rare').side).toBeGreaterThan(cardPadding('common').side);
  });
});
