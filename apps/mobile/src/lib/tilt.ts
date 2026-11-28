/**
 * How far a card leans as you hold it (components/TiltCard.tsx): towards
 * the point you hold, as if pressed there. A worklet, so the card's
 * animation thread uses it too; plain arithmetic, so it's tested in Node.
 */

/** The most it leans, either way, in degrees. */
export const MOST_TILT = 14;

/** For a point on the card, 0–1 across and down from its top left (clamped to the card). */
export function tiltFor(across: number, down: number): { rotateX: number; rotateY: number } {
  'worklet';
  const x = Math.min(1, Math.max(0, across)) - 0.5;
  const y = Math.min(1, Math.max(0, down)) - 0.5;
  // Turned about the vertical axis by left and right, about the horizontal by up and down.
  return { rotateX: -y * 2 * MOST_TILT, rotateY: x * 2 * MOST_TILT };
}
