/**
 * GymGO's own exercise icons: a figure doing the move, with the kit it moves
 * in the accent colour. Drawn here as plain shapes on a 48-point square, so
 * the same drawing serves the app (components/ExerciseGlyph.tsx) and the
 * tests. Each one is drawn at several points through a rep, which the app
 * eases between to make it move.
 *
 * Every figure is built from the same body: one set of limb lengths, posed by
 * the angle of each limb, so a squat and a bench press are the same person.
 * It's drawn like a pictogram: a torso that tapers from chest to waist, a
 * head just clear of the shoulders, limbs that taper from thigh to shin and
 * upper arm to forearm, hands, and feet that stand flat on the floor (or
 * point, or rise onto the toes) as the move needs. Side views face right;
 * the far arm and leg are drawn fainter, for depth.
 *
 * Icons of movements, not pictures of any gym or of anyone in particular.
 */

export type Pt = readonly [number, number];

/**
 * What a shape is painted with: `ink` the figure, `far` its far limbs, `kit`
 * what's lifted (bar, dumbbell, handle), `frame` what isn't (bench, rails,
 * cable), `floor` the ground, `motion` an arrow.
 */
export type Tone = 'ink' | 'far' | 'kit' | 'frame' | 'floor' | 'motion';

export type Shape =
  | { k: 'line'; pts: Pt[]; w: number; tone: Tone }
  | { k: 'dot'; c: Pt; r: number; tone: Tone }
  | { k: 'ring'; c: Pt; r: number; w: number; tone: Tone }
  /** A rounded box centred on `c`, turned `a` degrees. */
  | { k: 'box'; c: Pt; w: number; h: number; r: number; a: number; tone: Tone }
  /** A filled outline, its corners rounded by `r` (a torso). */
  | { k: 'poly'; pts: Pt[]; r: number; tone: Tone };

export const GLYPH_SIZE = 48;

// --- The body ------------------------------------------------------------------

const BODY = { torso: 12, neck: 5, head: 4.2, upper: 7, fore: 6.6, thigh: 9.4, shin: 9.2, shoulder: 10.4, foot: 3.4, heel: 0.7 };
/**
 * How thick each part is drawn. Limbs taper away from the body; the torso
 * is widest at the chest (side on, the chest stands out in front of the
 * back), and seen from the front it's a V from the shoulders to the waist.
 */
const THICK = { chest: 6.6, waist: 4.9, frontChest: 10, frontWaist: 6.4, upper: 3.6, fore: 3, hand: 1.85, thigh: 4.6, shin: 3.5, foot: 2.5, round: 1.3 };

/** A unit step at `deg` degrees: 0 points down, 90 right, 180 up, -90 left. */
function dir(deg: number): Pt {
  const rad = (deg * Math.PI) / 180;
  return [Math.sin(rad), Math.cos(rad)];
}
const at = (from: Pt, deg: number, length: number): Pt => {
  const [x, y] = dir(deg);
  return [from[0] + x * length, from[1] + y * length];
};
const plus = (p: Pt, dx: number, dy: number): Pt => [p[0] + dx, p[1] + dy];
const mid = (a: Pt, b: Pt, t = 0.5): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

type Limb = readonly [number, number];

interface Pose {
  hip: Pt;
  /** Hip to neck. 180 is upright. */
  torso: number;
  /** Neck to head, if the head isn't in line with the trunk. */
  head?: number;
  /** Upper arm, forearm (the near arm). */
  arm: Limb;
  arm2?: Limb;
  /** Thigh, shin (the near leg). */
  leg: Limb;
  leg2?: Limb;
  /** Seen from the front: shoulders and hips spread, no near or far. */
  front?: boolean;
  /**
   * Which way each foot points, as degrees from its shin (20: pointed
   * toes). Left out, a foot stands flat when its shin is upright and sits
   * square to the shin otherwise (see `footAngle`).
   */
  toes?: number;
  toes2?: number;
  /** Or as an absolute direction (90 is flat, toes forward): a sole on a foot plate, a calf raise. */
  sole?: number;
  sole2?: number;
  /** How the pose changes over one rep (see `phase`). */
  move?: Move;
}

/**
 * The other end of a rep, as changes to the pose: degrees for each limb,
 * points for the hips, and `lift` for shoulders that rise on their own (a
 * shrug).
 */
interface Move {
  hip?: Pt;
  torso?: number;
  head?: number;
  arm?: Limb;
  arm2?: Limb;
  leg?: Limb;
  leg2?: Limb;
  lift?: number;
  /** Degrees the soles turn (a heel rising). */
  sole?: number;
  sole2?: number;
}

/**
 * How far through a rep the icon is being drawn: 0 is the pose as written
 * (the still icon), 1 the other end of the rep. Set by `exerciseFrames`
 * around each drawing; the drawings read it through `pose` (and `rep()` for
 * the odd thing that moves without a limb, a wrist curl's dumbbell).
 */
let phase = 0;
const rep = () => phase;

/** Drawn as at the start of the rep, for what mustn't move with it (a pull-up bar, a bench). */
function still<T>(draw: () => T): T {
  const now = phase;
  phase = 0;
  try {
    return draw();
  } finally {
    phase = now;
  }
}

const turned = (base: number, change: number | undefined) => base + (change ?? 0) * phase;
const limb = (base: Limb, change: Limb | undefined): Limb => [turned(base[0], change?.[0]), turned(base[1], change?.[1])];
/** The direction from one point to another, in this file's degrees. */
const angleOf = (from: Pt, to: Pt) => (Math.atan2(to[0] - from[0], to[1] - from[1]) * 180) / Math.PI;

/**
 * A two-part limb from `from` that reaches `to` (a foot on a pedal, a hand
 * on a handlebar): its two angles, the middle joint bending one way (`side`
 * 1: a knee in front, for a figure facing right; -1: an elbow below). Out of
 * reach, it stretches as far as it goes.
 */
function reachFor(from: Pt, to: Pt, first: number, second: number, side: 1 | -1 = 1): Limb {
  const d = Math.min(first + second - 0.01, Math.max(Math.abs(first - second) + 0.01, Math.hypot(to[0] - from[0], to[1] - from[1])));
  const bend = (Math.acos((first * first + d * d - second * second) / (2 * first * d)) * 180) / Math.PI;
  const upper = angleOf(from, to) + side * bend;
  return [upper, angleOf(at(from, upper, first), to)];
}

export interface Joints {
  hip: Pt;
  neck: Pt;
  head: Pt;
  shoulder: Pt;
  elbow: Pt;
  hand: Pt;
  shoulder2: Pt;
  elbow2: Pt | null;
  hand2: Pt | null;
  hipL: Pt;
  hipR: Pt;
  knee: Pt;
  foot: Pt;
  knee2: Pt | null;
  foot2: Pt | null;
  /** The far end of each foot. */
  toe: Pt;
  toe2: Pt | null;
  /** Each foot's back, a touch behind the ankle. */
  heel: Pt;
  heel2: Pt | null;
  /** The trunk's direction, hip to neck. */
  trunk: number;
  front: boolean;
}

/** Degrees between -180 and 180. */
const norm = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180;

/**
 * Which way a foot points. Seen from the front, a little out to its side.
 * Side on: flat on the floor while the shin is upright (standing, squatting),
 * square to the shin once it's well off upright (lying, kneeling, a foot on
 * a plate), and turning smoothly between the two, so a moving leg never
 * snaps its foot round.
 */
function footAngle(shin: number, front: boolean, near: boolean, toes: number | undefined, sole: number | undefined): number {
  if (sole !== undefined) return sole;
  if (toes !== undefined) return shin + toes;
  if (front) return shin + (near ? 76 : -76);
  const s = norm(shin);
  const off = Math.min(1, Math.max(0, (Math.abs(s) - 30) / 30));
  return 90 + s * off;
}

function pose(p: Pose): Joints {
  const m = p.move ?? {};
  const hip: Pt = [p.hip[0] + (m.hip?.[0] ?? 0) * phase, p.hip[1] + (m.hip?.[1] ?? 0) * phase];
  const torso = turned(p.torso, m.torso);
  const lift = (m.lift ?? 0) * phase;
  const neck = plus(at(hip, torso, BODY.torso), 0, lift);
  const head = at(neck, turned(p.head ?? p.torso, m.head ?? m.torso), BODY.neck);
  const centre = plus(at(hip, torso, BODY.shoulder), 0, lift);
  // Across the body, for a front view's shoulders and hips.
  const across = (torso + 90) % 360;
  const shoulder = p.front ? at(centre, across, -4.2) : centre;
  const shoulder2 = p.front ? at(centre, across, 4.2) : centre;
  const hipR = p.front ? at(hip, across, -2.4) : hip;
  const hipL = p.front ? at(hip, across, 2.4) : hip;
  const arm = limb(p.arm, m.arm);
  const elbow = at(shoulder, arm[0], BODY.upper);
  const hand = at(elbow, arm[1], BODY.fore);
  const arm2 = p.arm2 ? limb(p.arm2, m.arm2) : null;
  const elbow2 = arm2 ? at(shoulder2, arm2[0], BODY.upper) : null;
  const hand2 = arm2 && elbow2 ? at(elbow2, arm2[1], BODY.fore) : null;
  const leg = limb(p.leg, m.leg);
  const knee = at(hipR, leg[0], BODY.thigh);
  const foot = at(knee, leg[1], BODY.shin);
  const leg2 = p.leg2 ? limb(p.leg2, m.leg2) : null;
  const knee2 = leg2 ? at(hipL, leg2[0], BODY.thigh) : null;
  const foot2 = leg2 && knee2 ? at(knee2, leg2[1], BODY.shin) : null;
  const front = Boolean(p.front);
  const length = front ? BODY.foot * 0.7 : BODY.foot;
  const sole = p.sole !== undefined ? turned(p.sole, m.sole) : undefined;
  const sole2 = p.sole2 !== undefined ? turned(p.sole2, m.sole2) : sole;
  const way = footAngle(leg[1], front, true, p.toes, sole);
  const way2 = leg2 ? footAngle(leg2[1], front, false, p.toes2 ?? p.toes, sole2) : 0;
  const toe = at(foot, way, length);
  const heel = at(foot, way, -BODY.heel);
  const toe2 = foot2 ? at(foot2, way2, length) : null;
  const heel2 = foot2 ? at(foot2, way2, -BODY.heel) : null;
  return { hip, neck, head, shoulder, elbow, hand, shoulder2, elbow2, hand2, hipL, hipR, knee, foot, knee2, foot2, toe, toe2, heel, heel2, trunk: torso, front };
}

/** A leg: thigh, shin and foot, each a little slimmer than the last. */
function legShapes(hip: Pt, knee: Pt, ankle: Pt, heel: Pt, toe: Pt, tone: Tone): Shape[] {
  return [
    { k: 'line', pts: [hip, knee], w: THICK.thigh, tone },
    { k: 'line', pts: [knee, ankle], w: THICK.shin, tone },
    { k: 'line', pts: [heel, toe], w: THICK.foot, tone },
  ];
}

/** An arm: upper arm, forearm, and a hand a touch wider than the wrist. */
function armShapes(shoulder: Pt, elbow: Pt, hand: Pt, tone: Tone): Shape[] {
  return [
    { k: 'line', pts: [shoulder, elbow], w: THICK.upper, tone },
    { k: 'line', pts: [elbow, hand], w: THICK.fore, tone },
    { k: 'dot', c: hand, r: THICK.hand, tone },
  ];
}

/**
 * The torso: a rounded outline from the waist up to just over the
 * shoulders. Side on, the chest stands a little proud of the back; from
 * the front it's a V.
 */
function torsoShape(j: Joints): Shape {
  const r = THICK.round;
  const centre = mid(j.shoulder, j.shoulder2);
  const top = at(centre, angleOf(j.hip, centre), 1.3 - r);
  const bottom = at(j.hip, angleOf(j.hip, centre), r * 0.5);
  const across = angleOf(j.hip, centre) + 90;
  if (j.front) {
    const chest = THICK.frontChest / 2 - r;
    const waist = THICK.frontWaist / 2 - r;
    return { k: 'poly', pts: [at(bottom, across, waist), at(top, across, chest), at(top, across, -chest), at(bottom, across, -waist)], r, tone: 'ink' };
  }
  // Across + is behind (a figure facing right, upright: its back is to the left).
  const back = THICK.chest / 2 - r - 0.4;
  const chest = THICK.chest / 2 - r + 0.4;
  const waist = THICK.waist / 2 - r;
  const ribs = at(bottom, angleOf(j.hip, centre), (BODY.shoulder - 1) * 0.55);
  return {
    k: 'poly',
    pts: [at(bottom, across, waist), at(ribs, across, back), at(top, across, back), at(top, across, -chest), at(ribs, across, -chest - 0.25), at(bottom, across, -waist)],
    r,
    tone: 'ink',
  };
}

/** The figure: far leg and arm (fainter, side on), torso, near leg and arm, head. */
function figure(j: Joints): Shape[] {
  const far: Tone = j.front ? 'ink' : 'far';
  const shapes: Shape[] = [];
  if (j.knee2 && j.foot2 && j.toe2 && j.heel2) shapes.push(...legShapes(j.hipL, j.knee2, j.foot2, j.heel2, j.toe2, far));
  if (j.elbow2 && j.hand2) shapes.push(...armShapes(j.shoulder2, j.elbow2, j.hand2, far));
  shapes.push(torsoShape(j));
  shapes.push(...legShapes(j.hipR, j.knee, j.foot, j.heel, j.toe, 'ink'));
  shapes.push(...armShapes(j.shoulder, j.elbow, j.hand, 'ink'));
  shapes.push({ k: 'dot', c: j.head, r: BODY.head, tone: 'ink' });
  return shapes;
}

// --- The kit -------------------------------------------------------------------

/** A barbell seen end on: a plate, its rim, and the bar's end through the middle. */
function plate(c: Pt, r = 4.8): Shape[] {
  return [
    { k: 'ring', c, r: r * 0.72, w: r * 0.56, tone: 'kit' },
    { k: 'dot', c, r: r * 0.24, tone: 'kit' },
  ];
}

/** A barbell seen from the front: the bar and two plates each end. */
function barbell(c: Pt, half = 15): Shape[] {
  const [x, y] = c;
  return [
    { k: 'line', pts: [plus(c, -half - 1.5, 0), plus(c, half + 1.5, 0)], w: 1.6, tone: 'kit' },
    { k: 'box', c: [x - half + 1.5, y], w: 2.6, h: 11, r: 1, a: 0, tone: 'kit' },
    { k: 'box', c: [x + half - 1.5, y], w: 2.6, h: 11, r: 1, a: 0, tone: 'kit' },
    { k: 'box', c: [x - half + 4.4, y], w: 2.2, h: 7.5, r: 1, a: 0, tone: 'kit' },
    { k: 'box', c: [x + half - 4.4, y], w: 2.2, h: 7.5, r: 1, a: 0, tone: 'kit' },
  ];
}

/** A dumbbell, its handle `a` degrees off level. */
function dumbbell(c: Pt, a = 0, length = 7.6): Shape[] {
  const ends: [Pt, Pt] = [at(c, 90 + a, -length / 2), at(c, 90 + a, length / 2)];
  return [
    { k: 'line', pts: ends, w: 1.8, tone: 'kit' },
    { k: 'box', c: ends[0], w: 2.8, h: 6.2, r: 1.1, a, tone: 'kit' },
    { k: 'box', c: ends[1], w: 2.8, h: 6.2, r: 1.1, a, tone: 'kit' },
  ];
}

/** A flat bench: the pad, and legs to the floor. */
function bench(x1: number, x2: number, y: number, floorY = 44): Shape[] {
  return [
    { k: 'box', c: [(x1 + x2) / 2, y + 1.4], w: x2 - x1, h: 2.8, r: 1.2, a: 0, tone: 'frame' },
    { k: 'line', pts: [[x1 + 3, y + 2], [x1 + 3, floorY]], w: 1.6, tone: 'frame' },
    { k: 'line', pts: [[x2 - 3, y + 2], [x2 - 3, floorY]], w: 1.6, tone: 'frame' },
  ];
}

/** A cable from its pulley to a handle. */
function cable(pulley: Pt, handle: Pt, grip = true): Shape[] {
  return [
    { k: 'line', pts: [pulley, handle], w: 1.1, tone: 'frame' },
    { k: 'ring', c: pulley, r: 1.9, w: 1.3, tone: 'frame' },
    ...(grip ? [{ k: 'dot' as const, c: handle, r: 1.9, tone: 'kit' as const }] : []),
  ];
}

const floor = (x1: number, x2: number, y = 44): Shape => ({ k: 'line', pts: [[x1, y], [x2, y]], w: 1.6, tone: 'floor' });
const rail = (x: number, y1 = 4, y2 = 44): Shape => ({ k: 'line', pts: [[x, y1], [x, y2]], w: 1.3, tone: 'frame' });

/** A short arrow saying which way it moves. */
function arrow(from: Pt, to: Pt): Shape[] {
  const angle = (Math.atan2(to[0] - from[0], to[1] - from[1]) * 180) / Math.PI;
  return [
    { k: 'line', pts: [from, to], w: 1.6, tone: 'motion' },
    { k: 'line', pts: [at(to, angle + 150, 2.6), to, at(to, angle - 150, 2.6)], w: 1.6, tone: 'motion' },
  ];
}

// --- Standing, sitting, lying ------------------------------------------------------

/** Upright, feet on the floor (44). */
const standing = (extra: Partial<Pose> = {}): Pose => ({
  hip: [24, 25.4],
  torso: 180,
  arm: [4, 0],
  leg: [4, -4],
  leg2: [-4, 4],
  ...extra,
});

// --- The icons -----------------------------------------------------------------------

type Draw = () => Shape[];

/** Lying on a bench pressing up: at lockout, then the bar down to the chest. */
function benchPress(kind: 'bar' | 'dumbbell' | 'smith'): Shape[] {
  const j = pose({ hip: [29, 30], torso: -90, head: -96, arm: [178, 182], leg: [70, 4], leg2: [64, -2], move: { arm: [-108, -4] } });
  const hold = at(j.hand, 180, 1.5);
  return [
    ...(kind === 'smith' ? [rail(16, 6, 44), rail(24, 6, 44)] : []),
    ...bench(8, 33, 32.2),
    ...figure(j),
    ...(kind === 'dumbbell' ? dumbbell(hold) : plate(hold)),
    floor(5, 43),
  ];
}

/** Curled up, then lowered. */
function standingCurl(kind: 'dumbbell' | 'bar' | 'cable' | 'hammer'): Shape[] {
  const j = pose(standing({ arm: [-4, 112], move: { arm: [0, -96] } }));
  const hold = at(j.hand, angleOf(j.elbow, j.hand), 1);
  return [
    ...(kind === 'cable' ? cable([40, 42], j.hand) : []),
    ...figure(j),
    ...(kind === 'bar' ? plate(hold, 4.4) : kind === 'dumbbell' ? dumbbell(hold, 0) : kind === 'hammer' ? dumbbell(hold, 90) : []),
    floor(12, 40),
  ];
}

/** At the bottom of the squat, then standing; the feet stay put. */
function squat(kind: 'back' | 'front' | 'smith' | 'body' | 'goblet' | 'hack'): Shape[] {
  const lean = kind === 'front' || kind === 'goblet' ? 155 : kind === 'hack' ? 160 : 140;
  const rise = 176 - lean;
  const arm: Limb = kind === 'body' ? [92, 92] : kind === 'front' ? [80, -150] : kind === 'goblet' ? [30, 160] : kind === 'hack' ? [70, -120] : [60, -140];
  const j = pose({
    hip: [17, 32.6],
    torso: lean,
    arm,
    leg: [88, -22],
    leg2: [84, -18],
    // Arms that hold a bar or a dumbbell turn with the trunk.
    move: { hip: [5.9, -9.7], torso: rise, arm: kind === 'body' ? [0, 0] : [rise, rise], leg: [-84, 18], leg2: [-84, 18] },
  });
  const trunk = angleOf(j.hip, j.neck);
  // Facing right, trunk + 90 is behind: a back squat's bar sits across the upper back, just under the neck.
  const back = at(at(j.neck, trunk, -1.6), trunk + 90, 2.6);
  const shapes: Shape[] = [];
  if (kind === 'smith') {
    const rails = still(() => at(at(pose({ hip: [17, 32.6], torso: lean, arm, leg: [88, -22] }).neck, lean, -1.6), lean + 90, 2.6)[0]);
    shapes.push(rail(rails - 4.5), rail(rails + 4.5));
  }
  if (kind === 'hack') {
    const base = at(j.hip, trunk - 90, 3.2);
    shapes.push({ k: 'line', pts: [at(base, trunk, -3), at(base, trunk, 15)], w: 3, tone: 'frame' });
    shapes.push({ k: 'line', pts: [[6, 44], at(base, trunk, -3)], w: 1.6, tone: 'frame' });
  }
  shapes.push(...figure(j));
  if (kind === 'back' || kind === 'smith') shapes.push(...plate(at(back, trunk + 90, 1.4)));
  // A front squat's bar rests on the front of the shoulders, the elbows high under it.
  if (kind === 'front') shapes.push(...plate(at(at(j.neck, trunk, -1.4), trunk - 90, 3.4), 4.4));
  if (kind === 'goblet') shapes.push(...dumbbell(at(j.hand, 90, 0.4), 90, 6.6));
  shapes.push(floor(6, 42));
  return shapes;
}

/** Bent at the hips, then standing tall (or, for a row, the bar pulled in). */
function hinge(kind: 'deadlift' | 'rdl' | 'good-morning' | 'bb-row' | 'pull-through'): Shape[] {
  const torso = kind === 'deadlift' ? 125 : kind === 'bb-row' ? 118 : 108;
  const leg: Limb = kind === 'deadlift' ? [50, -30] : [16, -8];
  const arm: Limb = kind === 'good-morning' ? [-70, -170] : kind === 'bb-row' ? [-40, 10] : kind === 'pull-through' ? [-2, -20] : [2, 0];
  const move: Move =
    kind === 'deadlift'
      ? { hip: [2.6, -4.6], torso: 55, leg: [-50, 30], leg2: [-46, 26] }
      : kind === 'bb-row'
        ? { arm: [42, -10] }
        : kind === 'good-morning'
          ? { hip: [1.3, -0.4], torso: 66, arm: [66, 66], leg: [-12, 4], leg2: [-12, 4] }
          : kind === 'pull-through'
            ? { hip: [1.3, -0.4], torso: 66, arm: [14, 40], leg: [-12, 4], leg2: [-12, 4] }
            : { hip: [1.3, -0.4], torso: 70, leg: [-12, 4], leg2: [-12, 4] };
  const j = pose({ hip: [15, kind === 'deadlift' ? 29 : 26], torso, arm, leg, leg2: [leg[0] - 6, leg[1] + 6], move });
  const shapes: Shape[] = [];
  if (kind === 'pull-through') shapes.push(...cable([4, 42], plus(j.hand, 0, 0.5)));
  shapes.push(...figure(j));
  if (kind === 'deadlift') shapes.push(...plate(plus(j.hand, 0, 2.3), 5));
  if (kind === 'rdl') shapes.push(...plate(at(j.hand, 0, 1.6), 4.6));
  if (kind === 'bb-row') shapes.push(...plate(at(j.hand, 0, 1.4), 4.4));
  if (kind === 'good-morning') shapes.push(...plate(at(at(j.neck, angleOf(j.hip, j.neck), -1.4), angleOf(j.hip, j.neck) + 90, 4), 4.4));
  shapes.push(floor(4, 44));
  return shapes;
}

const DRAW: Record<string, Draw> = {
  // Chest
  'bench-press': () => benchPress('bar'),
  'db-bench': () => benchPress('dumbbell'),
  'smith-bench': () => benchPress('smith'),
  'close-grip': () => {
    const shapes = benchPress('bar');
    return [...shapes, ...arrow([31, 13], [31, 22])];
  },
  'incline-db': () => {
    const j = pose({ hip: [28, 32], torso: -122, head: -128, arm: [176, 184], leg: [72, 6], leg2: [66, 0], move: { arm: [-100, -8] } });
    const seat = at(j.hip, -32, 2.6);
    return [
      { k: 'line', pts: [seat, at(seat, -122, 16)], w: 3, tone: 'frame' },
      { k: 'line', pts: [plus(j.hip, 0, 3), [j.hip[0], 44]], w: 1.6, tone: 'frame' },
      { k: 'line', pts: [at(seat, -122, 12), [17, 44]], w: 1.6, tone: 'frame' },
      ...figure(j),
      ...dumbbell(at(j.hand, 180, 1.5)),
      floor(5, 43),
    ];
  },
  'cable-fly': () => {
    const j = pose(standing({ front: true, arm: [62, 92], arm2: [-62, -92], leg: [6, 0], leg2: [-6, 0], move: { arm: [-22, -132], arm2: [22, 132] } }));
    return [...cable([5, 5], j.hand2!), ...cable([43, 5], j.hand), ...figure(j), floor(10, 38)];
  },
  'push-up': () => {
    const j = pose({ hip: [19, 33.4], torso: 118, head: 112, arm: [2, -2], leg: [-62, -62], move: { hip: [2, 6], torso: -20, head: -20, arm: [-104, 37], leg: [-20, -20] } });
    return [...figure(j), floor(2, 44)];
  },
  'pike-push-up': () => {
    const j = pose({ hip: [24, 22], torso: 34, head: 26, arm: [8, 4], leg: [-34, -34], move: { hip: [0, 1.5], torso: 18, head: 18, arm: [-62, 34], leg: [4, 4] } });
    return [...figure(j), floor(4, 44)];
  },

  // Shoulders and arms
  ohp: () => {
    const j = pose(standing({ front: true, arm: [-156, -174], arm2: [156, 174], leg: [4, 0], leg2: [-4, 0], move: { arm: [-154, -16], arm2: [154, 16] } }));
    return [...figure(j), ...barbell([24, j.hand[1] - 1], 17), floor(12, 36)];
  },
  'db-shoulder': () => {
    const j = pose({ hip: [20, 32], torso: 180, arm: [150, 190], arm2: [154, 186], leg: [90, 0], move: { arm: [-90, -12], arm2: [-90, -10] } });
    return [...bench(8, 26, 34), ...figure(j), ...dumbbell(at(j.hand, 180, 1.4)), floor(5, 40)];
  },
  'lateral-raise': () => {
    const j = pose(standing({ front: true, arm: [86, 92], arm2: [-86, -92], leg: [4, 0], leg2: [-4, 0], move: { arm: [-72, -88], arm2: [72, 88] } }));
    return [...figure(j), ...dumbbell(at(j.hand, angleOf(j.elbow, j.hand), 0.6), 90, 6), ...dumbbell(at(j.hand2!, angleOf(j.elbow2!, j.hand2!), 0.6), 90, 6), floor(12, 36)];
  },
  'cable-lateral': () => {
    const j = pose(standing({ front: true, arm: [80, 96], arm2: [-14, -4], leg: [4, 0], leg2: [-4, 0], move: { arm: [-96, -100] } }));
    return [...cable([6, 42], j.hand), ...figure(j), floor(10, 38)];
  },
  'face-pull': () => {
    const j = pose(standing({ arm: [112, -150], arm2: [104, -146], move: { arm: [-17, -115], arm2: [-7, -117] } }));
    const pulley = still(() => pose(standing({ arm: [112, -150] })).hand[1] + 1);
    return [...cable([44, pulley], plus(j.hand, 0.5, 0)), ...figure(j), floor(12, 40)];
  },
  'db-curl': () => standingCurl('dumbbell'),
  'bb-curl': () => standingCurl('bar'),
  'cable-curl': () => standingCurl('cable'),
  'hammer-curl': () => standingCurl('hammer'),
  pushdown: () => {
    const j = pose(standing({ arm: [4, 30], move: { arm: [0, 96] } }));
    return [...cable([33, 4], plus(j.hand, 0.4, 0.6)), ...figure(j), floor(12, 40)];
  },
  'overhead-ext': () => {
    const j = pose(standing({ arm: [172, -22], move: { arm: [4, -150] } }));
    return [...figure(j), ...dumbbell(at(j.hand, angleOf(j.elbow, j.hand), 1.2), 70, 6.4), floor(12, 36)];
  },
  'bench-dip': () => {
    const j = pose({ hip: [17, 35], torso: 184, arm: [-156, -10], leg: [86, 76], leg2: [90, 72], move: { hip: [3, -6], arm: [62, 10], leg: [-22, -21], leg2: [-22, -21] } });
    return [...bench(2, 15, 27), ...figure(j), floor(2, 46, 39.6)];
  },
  'farmer-carry': () => {
    const j = pose(standing({ arm: [6, 0], arm2: [-8, -2], leg: [18, -2], leg2: [-18, 6], move: { arm: [-12, -2], arm2: [12, 2], leg: [-36, 8], leg2: [36, -8] } }));
    return [...figure(j), ...dumbbell(at(j.hand, 0, 1.4), 0), floor(10, 38)];
  },
  'wrist-curl': () => {
    const j = pose({ hip: [16, 30], torso: 158, arm: [40, 90], leg: [88, 0] });
    return [...bench(5, 22, 32), ...figure(j), ...dumbbell(plus(at(j.hand, 90, 1.6), 0, -2.6 * rep()), 90, 6), ...arrow([33, 31], [33, 25]), floor(2, 40)];
  },

  // Back
  pulldown: () => {
    const j = pose({ hip: [20, 32], torso: 174, arm: [156, 176], arm2: [160, 172], leg: [88, 2], move: { arm: [-128, 0], arm2: [-128, 4] } });
    const bar = at(j.hand, 176, 1.2);
    const top = still(() => at(pose({ hip: [20, 32], torso: 174, arm: [156, 176], leg: [88, 2] }).hand, 176, 1.2)[0]);
    return [
      { k: 'line', pts: [bar, [top, 4]], w: 1.1, tone: 'frame' },
      { k: 'ring', c: [top, 4], r: 1.9, w: 1.3, tone: 'frame' },
      ...bench(10, 26, 34),
      { k: 'box', c: [j.knee[0] + 1, j.knee[1] - 3.8], w: 6, h: 2.6, r: 1.2, a: 0, tone: 'frame' },
      ...figure(j),
      { k: 'line', pts: [plus(bar, -6, 1.5), plus(bar, -4, 0), plus(bar, 4, 0), plus(bar, 6, 1.5)], w: 1.8, tone: 'kit' },
      floor(5, 40),
    ];
  },
  'pull-up': () => {
    const hang: Pose = { hip: [24, 28], torso: 180, front: true, arm: [-152, -170], arm2: [152, 170], leg: [8, -6], leg2: [-8, 6] };
    const j = pose({ ...hang, move: { hip: [0, -7], arm: [-38, 92], arm2: [38, -92], leg: [10, -10], leg2: [-10, 10] } });
    const bar = still(() => pose(hang).hand[1] - 1.2);
    return [{ k: 'line', pts: [[6, bar], [42, bar]], w: 2.2, tone: 'kit' }, ...figure(j)];
  },
  'hanging-knee': () => {
    const j = pose({ hip: [22, 29], torso: 184, arm: [180, 180], leg: [90, 6], leg2: [84, 10], toes: 30, move: { leg: [-84, -4], leg2: [-80, -8] } });
    return [{ k: 'line', pts: [[10, j.hand[1] - 1.4], [36, j.hand[1] - 1.4]], w: 2.2, tone: 'kit' }, ...figure(j), ...arrow([33, 40], [33, 33])];
  },
  'cable-row': () => {
    const j = pose({ hip: [14, 36], torso: 176, arm: [-30, 88], leg: [76, 104], leg2: [72, 108], move: { torso: -22, arm: [112, 2] } });
    const pulley = still(() => pose({ hip: [14, 36], torso: 176, arm: [-30, 88], leg: [76, 104] }).hand[1] + 1);
    return [
      { k: 'box', c: [j.foot[0] + 3, 37], w: 2.6, h: 10, r: 1, a: 0, tone: 'frame' },
      ...cable([45, pulley], j.hand),
      ...figure(j),
      floor(3, 46, 39.2),
    ];
  },
  'db-row': () => {
    const j = pose({ hip: [12, 21], torso: 98, head: 100, arm: [-150, 0], arm2: [16, 4], leg: [-4, 2], leg2: [0, -90], move: { arm: [156, 0] } });
    return [...bench(1, 27, j.knee2![1] + 2, j.foot[1] + 2), ...figure(j), ...dumbbell(at(j.hand, 0, 1.2), 0), floor(0, 34, j.foot[1] + 2)];
  },
  'bb-row': () => hinge('bb-row'),
  'inverted-row': () => {
    const hang: Pose = { hip: [24, 33], torso: 106, head: 100, arm: [172, 176], leg: [-74, -74] };
    const j = pose({ ...hang, move: { hip: [-1.8, -4.2], torso: 14, head: 14, arm: [-74, 28], leg: [14, 14] } });
    const bar = still(() => at(pose(hang).hand, 180, 1));
    return [rail(bar[0] + 5, 6, 44), ...figure(j), ...plate(bar, 3.6), floor(4, 44)];
  },
  'db-shrug': () => {
    const j = pose(standing({ front: true, arm: [10, 0], arm2: [-10, 0], leg: [4, 0], leg2: [-4, 0], move: { lift: -2.6 } }));
    return [
      ...figure(j),
      ...dumbbell(at(j.hand, 0, 1.4), 90, 6),
      ...dumbbell(at(j.hand2!, 0, 1.4), 90, 6),
      ...arrow([39, 16], [39, 9]),
      ...arrow([9, 16], [9, 9]),
      floor(12, 36),
    ];
  },
  'bb-shrug': () => {
    const j = pose(standing({ front: true, arm: [8, 0], arm2: [-8, 0], leg: [4, 0], leg2: [-4, 0], move: { lift: -2.6 } }));
    return [...figure(j), ...barbell([24, j.hand[1] + 0.6], 17), ...arrow([42, 16], [42, 9]), ...arrow([6, 16], [6, 9]), floor(10, 38)];
  },
  deadlift: () => hinge('deadlift'),
  rdl: () => hinge('rdl'),
  'good-morning': () => hinge('good-morning'),
  superman: () => {
    const j = pose({ hip: [26, 38], torso: -102, head: -114, arm: [-122, -124], arm2: [-118, -120], leg: [102, 104], leg2: [98, 100], toes: -14, move: { torso: 10, head: 18, arm: [24, 26], arm2: [24, 26], leg: [-12, -14], leg2: [-10, -12] } });
    return [...figure(j), floor(2, 46, 41)];
  },

  // Legs
  'back-squat': () => squat('back'),
  'front-squat': () => squat('front'),
  'smith-squat': () => squat('smith'),
  'hack-squat': () => squat('hack'),
  'air-squat': () => squat('body'),
  'goblet-squat': () => squat('goblet'),
  'leg-press': () => legPress(false),
  'leg-press-calf': () => legPress(true),
  'split-squat': () => {
    const base: Pose = { hip: [24, 27], torso: 180, arm: [2, 0], leg: [80, 0], leg2: [-22, -112], toes2: 18 };
    const j = pose({ ...base, move: { hip: [0.5, -5.5], leg: [-50, 26], leg2: [0, 35] } });
    const rest = still(() => pose(base));
    return [...bench(1, 15, rest.foot2![1] + 1.6, rest.foot[1] + 2), ...figure(j), ...dumbbell(at(j.hand, 0, 1.3)), floor(0, 42, rest.foot[1] + 2)];
  },
  lunge: () => {
    const base: Pose = { hip: [23, 26], torso: 180, arm: [2, 0], leg: [76, 0], leg2: [-26, -78] };
    const j = pose({ ...base, move: { hip: [-0.5, -2.5], leg: [-18, 10], leg2: [-16, 30] } });
    return [...figure(j), ...dumbbell(at(j.hand, 0, 1.3)), floor(4, 42, still(() => pose(base)).foot[1] + 2)];
  },
  'hip-thrust': () => bridge(true),
  'glute-bridge': () => bridge(false),
  'cable-kickback': () => {
    const j = pose({ hip: [24, 25], torso: 160, arm: [126, 100], leg: [4, -2], leg2: [-44, -20], move: { leg2: [40, 24] } });
    return [
      rail(41, 4, 44),
      ...cable([39, 41], at(j.foot2!, 90, 1), false),
      { k: 'line', pts: [plus(j.foot2!, -1, -1), plus(j.foot2!, 2, 0)], w: 2.2, tone: 'kit' },
      ...figure(j),
      floor(4, 44),
    ];
  },
  'pull-through': () => hinge('pull-through'),
  nordic: () => {
    const base: Pose = { hip: [26, 31.6], torso: 140, arm: [112, 96], leg: [-8, -94] };
    const j = pose({ ...base, move: { torso: 36, head: 36, arm: [36, 36] } });
    const rest = still(() => pose(base));
    return [{ k: 'box', c: plus(rest.foot, -1, -2.8), w: 5, h: 3, r: 1.4, a: 0, tone: 'frame' }, ...figure(j), floor(4, 44, rest.foot[1] + 1.8)];
  },
  'sumo-squat': () => {
    const j = pose({ hip: [24, 30], torso: 180, front: true, arm: [4, -4], arm2: [-4, 4], leg: [62, -4], leg2: [-62, 4], move: { hip: [0, -3], leg: [-36, 26], leg2: [36, -26] } });
    return [...figure(j), ...dumbbell([24, j.hand[1] + 2.4], 90, 6), floor(6, 42)];
  },
  copenhagen: () => sidePlank(true),
  cossack: () => {
    const base: Pose = { hip: [22, 33], torso: 176, front: true, arm: [24, -110], arm2: [-24, 110], leg: [50, -8], leg2: [-70, -76] };
    const j = pose({ ...base, move: { hip: [-1, -4], torso: 4, leg: [-22, 10], leg2: [6, 4] } });
    return [...figure(j), floor(2, 46, still(() => pose(base)).foot[1] + 1.8)];
  },
  'calf-raise': () => {
    // Up onto the toes: the heels rise as the soles tip, the toes stay put.
    const j = pose(standing({ hip: [24, 23.6], arm: [4, 0], leg: [2, -6], leg2: [-2, 2], sole: 90, move: { hip: [0, -2.2], sole: -40 } }));
    return [
      { k: 'box', c: [26, 43], w: 10, h: 3, r: 1, a: 0, tone: 'frame' },
      ...figure(j),
      ...dumbbell(at(j.hand, 0, 1.4)),
      ...arrow([38, 26], [38, 18]),
      floor(10, 40, 44.6),
    ];
  },
  'smith-calf': () => {
    const base = standing({ hip: [24, 23.6], arm: [150, -120], leg: [2, -6], leg2: [-2, 2], sole: 90 });
    const j = pose({ ...base, move: { hip: [0, -2.2], sole: -40 } });
    const back = at(j.neck, 90, -2.6);
    const rails = still(() => at(pose(base).neck, 90, -2.6)[0]);
    return [
      rail(rails - 5),
      rail(rails + 4),
      { k: 'box', c: [26, 43], w: 10, h: 3, r: 1, a: 0, tone: 'frame' },
      ...figure(j),
      ...plate(at(back, -90, 1.2), 4.2),
      ...arrow([38, 26], [38, 18]),
      floor(10, 40, 44.6),
    ];
  },
  'sled-push': () => {
    const j = pose({ hip: [15, 25], torso: 128, head: 120, arm: [100, 96], leg: [30, -20], leg2: [-14, -6], move: { leg: [-44, 14], leg2: [44, -14] } });
    const reach = at(j.hand, 96, 1);
    return [
      { k: 'line', pts: [reach, [reach[0] + 1, 41]], w: 1.8, tone: 'kit' },
      { k: 'box', c: [reach[0] + 5.5, 40.4], w: 13, h: 5.2, r: 1.2, a: 0, tone: 'kit' },
      ...figure(j),
      floor(2, 46, 43.6),
    ];
  },

  // Core
  plank: () => {
    // A hold: only a breath of movement.
    const j = pose({ hip: [22, 34.6], torso: 94, head: 98, arm: [0, 90], leg: [-86, -86], move: { hip: [0, 0.9], torso: -2, leg: [2, 2] } });
    return [...figure(j), floor(2, 46, 40.4)];
  },
  'side-plank': () => sidePlank(false),
  'cable-crunch': () => {
    const j = pose({ hip: [18, 32], torso: 136, head: 120, arm: [148, -40], leg: [8, -84], move: { torso: 30, head: 40, arm: [30, 30] } });
    return [...cable([40, 4], plus(j.hand, 0.6, -0.6)), ...figure(j), floor(4, 44, 42.4)];
  },
  'dead-bug': () => {
    const j = pose({ hip: [28, 38], torso: -90, head: -86, arm: [180, 180], arm2: [-134, -132], leg: [180, 90], leg2: [90, 92], move: { arm: [46, 48], arm2: [-46, -48], leg: [-90, 2], leg2: [90, -2] } });
    return [...figure(j), floor(2, 46, 41.6)];
  },
  pallof: () => {
    const base = standing({ arm: [88, 92] });
    const j = pose({ ...base, move: { arm: [-66, 8] } });
    const pulley = still(() => pose(base).hand[1]);
    return [...cable([4, pulley], j.hand), ...figure(j), ...arrow([35, 13], [42, 13]), floor(10, 38)];
  },
  woodchop: () => {
    const j = pose(standing({ front: true, torso: 186, arm: [146, 138], arm2: [122, 132], leg: [12, 0], leg2: [-12, 0], move: { torso: -12, arm: [-176, -178], arm2: [-172, -172] } }));
    return [...cable([44, 3], j.hand), ...figure(j), ...arrow([16, 12], [7, 28]), floor(10, 38)];
  },
  'russian-twist': () => {
    const j = pose({ hip: [18, 36], torso: 144, arm: [104, 64], leg: [118, 32], leg2: [112, 36], move: { torso: 4, arm: [-34, 30] } });
    return [...figure(j), ...dumbbell(at(j.hand, angleOf(j.elbow, j.hand), 1.2), 90, 6), ...arrow([12, 20], [22, 13]), floor(4, 44, 40.2)];
  },

  // Finishers
  'row-intervals': () => {
    const j = pose({ hip: [16, 34], torso: 196, head: 190, arm: [-24, 96], leg: [84, 88], leg2: [80, 92], move: { hip: [10, 0], torso: -46, head: -40, arm: [124, 4], leg: [66, -58], leg2: [66, -58] } });
    return [
      { k: 'line', pts: [[4, 38.6], [44, 38.6]], w: 2, tone: 'frame' },
      { k: 'ring', c: [42, 32], r: 5.2, w: 2.2, tone: 'kit' },
      ...cable([37.5, 31], j.hand),
      ...figure(j),
      floor(2, 46, 42),
    ];
  },
  'bike-intervals': () => {
    // Pedalling: one turn of the cranks a rep, each foot on its pedal and
    // each knee where the leg's lengths put it, the trunk rocking a little.
    const crank: Pt = [21.5, 35.5];
    const turn = 360 * rep();
    const pedal = at(crank, 90 + turn, 3.6);
    const pedal2 = at(crank, 270 + turn, 3.6);
    const hip: Pt = [17, 21.5];
    const wave = Math.sin((turn * Math.PI) / 180);
    const torso = 160 + 2 * wave;
    const bar: Pt = [32.5, 14.5];
    const arm = reachFor(at(hip, torso, BODY.shoulder), bar, BODY.upper, BODY.fore, -1);
    const j = pose({
      hip,
      torso,
      head: 150,
      arm,
      leg: reachFor(hip, pedal, BODY.thigh, BODY.shin),
      leg2: reachFor(hip, pedal2, BODY.thigh, BODY.shin),
      sole: 90 + 10 * wave,
      sole2: 90 - 10 * wave,
    });
    return [
      { k: 'ring', c: [36, 33], r: 7.4, w: 2.2, tone: 'kit' },
      { k: 'dot', c: [36, 33], r: 1.6, tone: 'kit' },
      { k: 'line', pts: [[16, 23.5], crank, [36, 33], [33.5, 16], [30.5, 14.5]], w: 1.8, tone: 'frame' },
      { k: 'box', c: [16.5, 23], w: 6, h: 2.2, r: 1, a: 0, tone: 'frame' },
      { k: 'line', pts: [crank, pedal2], w: 1.6, tone: 'kit' },
      ...figure(j),
      { k: 'line', pts: [crank, pedal], w: 1.6, tone: 'kit' },
      { k: 'dot', c: crank, r: 1.5, tone: 'kit' },
      floor(4, 46, 42),
    ];
  },
  'incline-walk': () => {
    const j = pose({ hip: [22, 24], torso: 184, head: 188, arm: [-16, 14], arm2: [20, 50], leg: [22, 0], leg2: [-20, 4], move: { arm: [36, 36], arm2: [-36, -36], leg: [-42, 4], leg2: [42, -4] } });
    return [
      { k: 'line', pts: [[6, 43.6], [42, 38]], w: 2.2, tone: 'kit' },
      { k: 'line', pts: [[41, 38], [41, 14], [36, 13]], w: 1.8, tone: 'frame' },
      ...figure(j),
    ];
  },
};

/** Reclined on the seat, pushing the sled up its rails at 45°. */
function legPress(calf: boolean): Shape[] {
  const base: Pose = { hip: [12, 36], torso: -132, head: -138, arm: [30, 60], leg: calf ? [136, 136] : [168, 110], leg2: calf ? [132, 132] : [162, 114] };
  const j = pose({ ...base, move: calf ? {} : { leg: [-32, 26], leg2: [-30, 22] } });
  const sole = at(j.foot, 135, 1.8 + (calf ? 1.8 * rep() : 0));
  const rest = still(() => at(pose(base).foot, 135, 1.8));
  // The seat's back, just behind the figure's.
  const pad = (p: Pt) => at(p, -42, 3.4);
  return [
    { k: 'line', pts: [at(rest, 135, -14), at(rest, 135, 15)], w: 1.4, tone: 'frame' },
    { k: 'line', pts: [pad(at(j.hip, 48, 3)), pad(at(j.neck, -132, 1))], w: 3.2, tone: 'frame' },
    { k: 'line', pts: [pad(at(j.hip, 48, 3)), [j.hip[0] + 2, 44]], w: 1.6, tone: 'frame' },
    ...figure(j),
    { k: 'box', c: sole, w: 3, h: 12, r: 1.2, a: -45, tone: 'kit' },
    ...(calf ? arrow(at(rest, 135, 6), at(rest, 135, 11)).map((shape) => (shape.k === 'line' ? { ...shape, pts: shape.pts.map((p) => at(p, 45, 7)) } : shape)) : []),
    floor(2, 46),
  ];
}

/** Hips up: shoulders on a bench with a bar on the hips, or on the floor; then lowered. */
function bridge(loaded: boolean): Shape[] {
  if (loaded) {
    const base: Pose = { hip: [27, 29], torso: -94, head: -94, arm: [60, 118], leg: [86, 2], leg2: [90, 6] };
    const j = pose({ ...base, move: { hip: [-1.5, 5.5], torso: -27, head: -27, arm: [-12, 10], leg: [32, 16], leg2: [30, 14] } });
    const rest = still(() => pose(base));
    return [...bench(3, 17, rest.neck[1] + 2.6, rest.foot[1] + 2), ...figure(j), ...plate(plus(j.hip, 0, -5.6), 4.6), floor(2, 46, rest.foot[1] + 2)];
  }
  const base: Pose = { hip: [28, 34], torso: -62, head: -70, arm: [76, 88], leg: [80, -8], leg2: [84, -4] };
  const j = pose({ ...base, move: { hip: [1.4, 5.6], torso: -28, head: -28, leg: [34, -4], leg2: [30, -8] } });
  return [...figure(j), ...arrow([28, 26], [28, 19]), floor(2, 46, still(() => pose(base)).foot[1] + 2)];
}

/** A hold: the hips sink a little and come back up. */
function sidePlank(bench_: boolean): Shape[] {
  const j = pose({ hip: [22, 31], torso: 108, front: true, arm: [6, 92], arm2: [-160, -176], leg: [-74, -76], leg2: [-70, -72], move: { hip: [0, 1.6], torso: -4, leg: [5, 5], leg2: [5, 5] } });
  return [...(bench_ ? bench(2, 12, 31) : []), ...figure(j), floor(2, 46, 41.2)];
}

// --- Fitting the square ----------------------------------------------------------

/** Half a shape's stroke or radius beyond its points. */
function reach(shape: Shape): Array<[number, number]> {
  switch (shape.k) {
    case 'line':
      return shape.pts.flatMap(([x, y]) => [
        [x - shape.w / 2, y - shape.w / 2],
        [x + shape.w / 2, y + shape.w / 2],
      ]);
    case 'dot':
      return [
        [shape.c[0] - shape.r, shape.c[1] - shape.r],
        [shape.c[0] + shape.r, shape.c[1] + shape.r],
      ];
    case 'ring':
      return [
        [shape.c[0] - shape.r - shape.w / 2, shape.c[1] - shape.r - shape.w / 2],
        [shape.c[0] + shape.r + shape.w / 2, shape.c[1] + shape.r + shape.w / 2],
      ];
    case 'box': {
      const half = Math.hypot(shape.w, shape.h) / 2;
      return [
        [shape.c[0] - half, shape.c[1] - half],
        [shape.c[0] + half, shape.c[1] + half],
      ];
    }
    case 'poly':
      return shape.pts.flatMap(([x, y]) => [
        [x - shape.r, y - shape.r],
        [x + shape.r, y + shape.r],
      ]);
  }
}

export function bounds(shapes: Shape[]): { x1: number; y1: number; x2: number; y2: number } {
  const points = shapes.flatMap(reach);
  return {
    x1: Math.min(...points.map((p) => p[0])),
    y1: Math.min(...points.map((p) => p[1])),
    x2: Math.max(...points.map((p) => p[0])),
    y2: Math.max(...points.map((p) => p[1])),
  };
}

const MARGIN = 2.5;

/**
 * Every frame of a rep moved and scaled the same way: the whole rep centred
 * in the square, and shrunk only if it wouldn't fit, so the figure doesn't
 * drift as it moves.
 */
function fit(frames: Shape[][]): Shape[][] {
  const box = bounds(frames.flat());
  const room = GLYPH_SIZE - MARGIN * 2;
  const scale = Math.min(1, room / (box.x2 - box.x1), room / (box.y2 - box.y1));
  const cx = (box.x1 + box.x2) / 2;
  const cy = (box.y1 + box.y2) / 2;
  const move = (p: Pt): Pt => [GLYPH_SIZE / 2 + (p[0] - cx) * scale, GLYPH_SIZE / 2 + (p[1] - cy) * scale];
  const round = (n: number) => Math.round(n * 100) / 100;
  const tidy = (p: Pt): Pt => [round(p[0]), round(p[1])];
  return frames.map((shapes) =>
    shapes.map((shape): Shape => {
      switch (shape.k) {
        case 'line':
          return { ...shape, pts: shape.pts.map((p) => tidy(move(p))), w: round(shape.w * scale) };
        case 'dot':
          return { ...shape, c: tidy(move(shape.c)), r: round(shape.r * scale) };
        case 'ring':
          return { ...shape, c: tidy(move(shape.c)), r: round(shape.r * scale), w: round(shape.w * scale) };
        case 'box':
          return { ...shape, c: tidy(move(shape.c)), w: round(shape.w * scale), h: round(shape.h * scale), r: round(shape.r * scale) };
        case 'poly':
          return { ...shape, pts: shape.pts.map((p) => tidy(move(p))), r: round(shape.r * scale) };
      }
    }),
  );
}

// --- Looking one up ----------------------------------------------------------------

/** For an exercise GymGO doesn't draw (one logged under an older id): a dumbbell. */
const FALLBACK: Draw = () => [...dumbbell([24, 24], -30, 22).map((shape) => (shape.k === 'box' ? { ...shape, w: 7, h: 15, r: 2 } : { ...shape, w: 3.4 }))];

/** How many drawings a rep is made of; the app eases between them (enough that a turning limb keeps its length). */
export const REP_FRAMES = 13;

/**
 * How a move's rep goes, from its still drawing (frame 0) to the other end:
 * `lift` is the effort first (a squat from the bottom up), `lower` the
 * lowering first (a bench press from lockout down), `cycle` round and round
 * (a run, a row, a twist), `spin` one way round for good (a ride: its last
 * drawing is its first, so it loops without a seam) and `hold` a hold that
 * only breathes. The app
 * times each half to suit (components/ExerciseGlyph.tsx).
 */
export type Tempo = 'lift' | 'lower' | 'cycle' | 'spin' | 'hold';

const LOWER_FIRST = [
  'bench-press', 'db-bench', 'smith-bench', 'close-grip', 'incline-db', 'push-up', 'pike-push-up', 'ohp', 'db-shoulder', 'lateral-raise', 'cable-lateral',
  'face-pull', 'db-curl', 'bb-curl', 'cable-curl', 'hammer-curl', 'pushdown', 'hanging-knee', 'cable-row', 'db-row', 'bb-row', 'superman', 'hip-thrust',
  'glute-bridge', 'cable-kickback', 'cable-crunch', 'pallof',
];
const CYCLES = ['farmer-carry', 'sled-push', 'dead-bug', 'russian-twist', 'row-intervals', 'incline-walk'];
const SPINS = ['bike-intervals'];
const HOLDS = ['plank', 'side-plank', 'copenhagen'];

/** The moves named above, by tempo (the rest are lifts), for the tests to check each is one GymGO draws. */
export const TEMPO_NAMED: Record<Exclude<Tempo, 'lift'>, readonly string[]> = { lower: LOWER_FIRST, cycle: CYCLES, spin: SPINS, hold: HOLDS };

export function exerciseTempo(exerciseId: string): Tempo {
  if (HOLDS.includes(exerciseId)) return 'hold';
  if (CYCLES.includes(exerciseId)) return 'cycle';
  if (SPINS.includes(exerciseId)) return 'spin';
  return LOWER_FIRST.includes(exerciseId) ? 'lower' : 'lift';
}

const cache = new Map<string, Shape[][]>();
/** Whether each exercise's icon moves, worked out once with its frames. */
const moves = new Map<string, boolean>();

/**
 * The drawing for an exercise, if GymGO has one. Its own entries only: an id
 * like "constructor" or "toString" (any text can be saved as an exercise)
 * found the object's built-ins, and drawing one crashed the screen.
 */
const drawingFor = (exerciseId: string): Draw | undefined => (Object.prototype.hasOwnProperty.call(DRAW, exerciseId) ? DRAW[exerciseId] : undefined);

/**
 * One rep of an exercise, start to finish, as `REP_FRAMES` drawings of the
 * same shapes in new places (the first is the still icon).
 */
export function exerciseFrames(exerciseId: string): Shape[][] {
  const known = cache.get(exerciseId);
  if (known) return known;
  const draw = drawingFor(exerciseId) ?? FALLBACK;
  const frames: Shape[][] = [];
  try {
    for (let at = 0; at < REP_FRAMES; at++) {
      phase = at / (REP_FRAMES - 1);
      frames.push(draw());
    }
  } finally {
    phase = 0;
  }
  const fitted = fit(frames);
  cache.set(exerciseId, fitted);
  // Any drawing unlike the first (a ride's last drawing is its first again).
  const first = JSON.stringify(fitted[0]);
  moves.set(exerciseId, fitted.some((frame) => JSON.stringify(frame) !== first));
  return fitted;
}

/** The icon for an exercise, still, fitted to the 48-point square. */
export const exerciseGlyph = (exerciseId: string): Shape[] => exerciseFrames(exerciseId)[0]!;

/** Whether the icon moves at all (a dumbbell drawn for an unknown exercise doesn't). */
export function exerciseMoves(exerciseId: string): boolean {
  exerciseFrames(exerciseId);
  return moves.get(exerciseId) ?? false;
}

/** Whether GymGO draws this exercise (rather than the plain dumbbell). */
export const hasExerciseGlyph = (exerciseId: string) => drawingFor(exerciseId) !== undefined;

export const DRAWN_EXERCISES = Object.keys(DRAW);

/**
 * The exercise a saved plan's row leads with: its first that GymGO still
 * draws (an exercise since retired showed the plain dumbbell), or '' for the
 * dumbbell if none.
 */
export const leadExercise = (exerciseIds: string[]): string => exerciseIds.find((id) => hasExerciseGlyph(id)) ?? '';
