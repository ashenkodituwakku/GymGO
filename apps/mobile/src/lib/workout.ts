/**
 * The workout generator: pick muscles, get a session built only from the
 * kit a gym actually has.
 *
 * "Actually has" is the gym's own published equipment plus what members
 * report (more yes than no). Most gyms publish nothing, so there is a second,
 * clearly labelled mode that assumes a typical commercial gym; the screen
 * then says the plan isn't confirmed for this gym.
 *
 * No React Native here, so it is unit-tested in Node.
 */

import type { GymRecord } from '@gymgo/domain';

// --- Muscles -----------------------------------------------------------------

/** Named to match the body diagram's regions. */
export type Muscle =
  | 'chest'
  | 'deltoids'
  | 'biceps'
  | 'triceps'
  | 'forearm'
  | 'abs'
  | 'obliques'
  | 'upper-back'
  | 'trapezius'
  | 'lower-back'
  | 'gluteal'
  | 'quadriceps'
  | 'hamstring'
  | 'adductors'
  | 'calves';

export const MUSCLES: Array<{ id: Muscle; label: string; side: 'front' | 'back' }> = [
  { id: 'chest', label: 'Chest', side: 'front' },
  { id: 'deltoids', label: 'Shoulders', side: 'front' },
  { id: 'biceps', label: 'Biceps', side: 'front' },
  { id: 'triceps', label: 'Triceps', side: 'back' },
  { id: 'forearm', label: 'Forearms', side: 'front' },
  { id: 'abs', label: 'Abs', side: 'front' },
  { id: 'obliques', label: 'Obliques', side: 'front' },
  { id: 'upper-back', label: 'Upper back', side: 'back' },
  { id: 'trapezius', label: 'Traps', side: 'back' },
  { id: 'lower-back', label: 'Lower back', side: 'back' },
  { id: 'gluteal', label: 'Glutes', side: 'back' },
  { id: 'quadriceps', label: 'Quads', side: 'front' },
  { id: 'hamstring', label: 'Hamstrings', side: 'back' },
  { id: 'adductors', label: 'Adductors', side: 'front' },
  { id: 'calves', label: 'Calves', side: 'back' },
];

export const muscleLabel = (id: Muscle) => MUSCLES.find((item) => item.id === id)?.label ?? id;

/** One-tap selections. */
export const PRESETS: Array<{ label: string; muscles: Muscle[] }> = [
  { label: 'Push', muscles: ['chest', 'deltoids', 'triceps'] },
  { label: 'Pull', muscles: ['upper-back', 'biceps', 'trapezius'] },
  { label: 'Legs', muscles: ['quadriceps', 'hamstring', 'gluteal', 'calves'] },
  { label: 'Core', muscles: ['abs', 'obliques', 'lower-back'] },
  { label: 'Full body', muscles: ['chest', 'upper-back', 'quadriceps', 'hamstring', 'deltoids', 'abs'] },
];

// --- Equipment ---------------------------------------------------------------

/** The gym's equipment ids (as in @gymgo/domain's EQUIPMENT_TYPES). */
export type Kit =
  | 'power_rack'
  | 'squat_rack'
  | 'smith_machine'
  | 'lifting_platform'
  | 'cable_station'
  | 'dumbbells'
  | 'barbells'
  | 'bench'
  | 'leg_press'
  | 'hack_squat'
  | 'lat_pulldown'
  | 'treadmill'
  | 'rower'
  | 'assault_bike'
  | 'turf_sled';

export const KIT_LABEL: Record<Kit, string> = {
  power_rack: 'Power rack',
  squat_rack: 'Squat rack',
  smith_machine: 'Smith machine',
  lifting_platform: 'Lifting platform',
  cable_station: 'Cable station',
  dumbbells: 'Dumbbells',
  barbells: 'Barbell',
  bench: 'Bench',
  leg_press: 'Leg press',
  hack_squat: 'Hack squat',
  lat_pulldown: 'Lat pulldown',
  treadmill: 'Treadmill',
  rower: 'Rower',
  assault_bike: 'Air bike',
  turf_sled: 'Sled',
};

/**
 * What most commercial gyms have. Used only in the labelled "typical gym"
 * mode, never presented as this gym's kit.
 */
export const TYPICAL_KIT: Kit[] = ['dumbbells', 'barbells', 'bench', 'cable_station', 'squat_rack', 'lat_pulldown', 'leg_press', 'treadmill', 'smith_machine'];

/** A member-report tally, as the server returns it. */
export interface KitTally {
  equipmentTypeId: string;
  yes: number;
  no: number;
}

/**
 * The kit a gym is known to have: what it publishes, plus anything members
 * report more often as there than not. Also returns what members say is
 * missing, so the typical-gym mode can leave it out.
 */
export function knownKit(record: GymRecord | null, tallies: KitTally[] = []): { has: Kit[]; lacks: Kit[] } {
  const has = new Set<Kit>();
  const lacks = new Set<Kit>();
  for (const item of record?.equipment ?? []) {
    if (item.presence === 'yes') has.add(item.equipmentTypeId as Kit);
    if (item.presence === 'no') lacks.add(item.equipmentTypeId as Kit);
  }
  for (const tally of tallies) {
    const id = tally.equipmentTypeId as Kit;
    if (tally.yes > tally.no) has.add(id);
    else if (tally.no > tally.yes && !has.has(id)) lacks.add(id);
  }
  return { has: [...has], lacks: [...lacks] };
}

// --- Exercises ---------------------------------------------------------------

export interface Exercise {
  id: string;
  name: string;
  primary: Muscle[];
  secondary: Muscle[];
  /** Ways to do it: each option is a set of kit that must all be there. `[]` = body weight. */
  needs: Kit[][];
  compound: boolean;
  cue: string;
  /** A conditioning finisher rather than a strength move. */
  cardio?: boolean;
}

const BODY: Kit[][] = [[]];

export const EXERCISES: Exercise[] = [
  // Chest
  { id: 'bench-press', name: 'Barbell bench press', primary: ['chest'], secondary: ['triceps', 'deltoids'], needs: [['barbells', 'bench']], compound: true, cue: 'Shoulder blades pinned back, bar to mid-chest, feet planted.' },
  { id: 'db-bench', name: 'Dumbbell bench press', primary: ['chest'], secondary: ['triceps', 'deltoids'], needs: [['dumbbells', 'bench']], compound: true, cue: 'Lower slowly until the dumbbells are level with your chest.' },
  { id: 'incline-db', name: 'Incline dumbbell press', primary: ['chest', 'deltoids'], secondary: ['triceps'], needs: [['dumbbells', 'bench']], compound: true, cue: 'Bench at about 30°, press up and slightly in.' },
  { id: 'smith-bench', name: 'Smith machine bench press', primary: ['chest'], secondary: ['triceps'], needs: [['smith_machine', 'bench']], compound: true, cue: 'Set the safeties just above chest height.' },
  { id: 'cable-fly', name: 'Cable fly', primary: ['chest'], secondary: ['deltoids'], needs: [['cable_station']], compound: false, cue: 'Soft elbows; hug a big tree and squeeze.' },
  { id: 'push-up', name: 'Push-up', primary: ['chest'], secondary: ['triceps', 'abs'], needs: BODY, compound: true, cue: 'Body in one straight line, chest to a fist from the floor.' },
  // Shoulders
  { id: 'ohp', name: 'Standing overhead press', primary: ['deltoids'], secondary: ['triceps', 'abs'], needs: [['barbells', 'squat_rack'], ['barbells', 'power_rack']], compound: true, cue: 'Squeeze glutes, press straight up, head through at the top.' },
  { id: 'db-shoulder', name: 'Seated dumbbell shoulder press', primary: ['deltoids'], secondary: ['triceps'], needs: [['dumbbells', 'bench']], compound: true, cue: 'Back against the bench, stop just short of locking out.' },
  { id: 'lateral-raise', name: 'Dumbbell lateral raise', primary: ['deltoids'], secondary: [], needs: [['dumbbells']], compound: false, cue: 'Lead with the elbows, stop at shoulder height.' },
  { id: 'cable-lateral', name: 'Cable lateral raise', primary: ['deltoids'], secondary: [], needs: [['cable_station']], compound: false, cue: 'Handle low and across the body; raise out to the side.' },
  { id: 'face-pull', name: 'Face pull', primary: ['deltoids', 'trapezius'], secondary: ['upper-back'], needs: [['cable_station']], compound: false, cue: 'Rope at eye height, pull to your forehead, elbows high.' },
  { id: 'pike-push-up', name: 'Pike push-up', primary: ['deltoids'], secondary: ['triceps'], needs: BODY, compound: true, cue: 'Hips high, lower your head between your hands.' },
  // Arms
  { id: 'db-curl', name: 'Dumbbell curl', primary: ['biceps'], secondary: ['forearm'], needs: [['dumbbells']], compound: false, cue: 'Elbows pinned to your sides, no swinging.' },
  { id: 'bb-curl', name: 'Barbell curl', primary: ['biceps'], secondary: ['forearm'], needs: [['barbells']], compound: false, cue: 'Shoulder-width grip, lower all the way down.' },
  { id: 'cable-curl', name: 'Cable curl', primary: ['biceps'], secondary: [], needs: [['cable_station']], compound: false, cue: 'Constant tension: pause at the top.' },
  { id: 'hammer-curl', name: 'Hammer curl', primary: ['biceps', 'forearm'], secondary: [], needs: [['dumbbells']], compound: false, cue: 'Palms facing each other the whole way.' },
  { id: 'pushdown', name: 'Cable triceps pushdown', primary: ['triceps'], secondary: [], needs: [['cable_station']], compound: false, cue: 'Elbows by your ribs, straighten fully.' },
  { id: 'overhead-ext', name: 'Overhead dumbbell extension', primary: ['triceps'], secondary: [], needs: [['dumbbells']], compound: false, cue: 'Elbows point up; lower behind your head.' },
  { id: 'close-grip', name: 'Close-grip bench press', primary: ['triceps'], secondary: ['chest'], needs: [['barbells', 'bench']], compound: true, cue: 'Hands just inside shoulder width, elbows tucked.' },
  { id: 'bench-dip', name: 'Bench dip', primary: ['triceps'], secondary: ['chest'], needs: [['bench']], compound: true, cue: 'Hands on the bench edge, lower until elbows reach 90°.' },
  { id: 'farmer-carry', name: "Farmer's carry", primary: ['forearm', 'trapezius'], secondary: ['abs'], needs: [['dumbbells']], compound: true, cue: 'Heavy, tall and slow; walk 30–40 m.' },
  { id: 'wrist-curl', name: 'Wrist curl', primary: ['forearm'], secondary: [], needs: [['dumbbells']], compound: false, cue: 'Forearms on your thighs, curl only at the wrist.' },
  // Back
  { id: 'pulldown', name: 'Lat pulldown', primary: ['upper-back'], secondary: ['biceps'], needs: [['lat_pulldown']], compound: true, cue: 'Pull the bar to your upper chest, chest up.' },
  { id: 'pull-up', name: 'Pull-up', primary: ['upper-back'], secondary: ['biceps', 'forearm'], needs: [['power_rack']], compound: true, cue: 'Most power racks have a pull-up bar. Full hang to chin over.' },
  { id: 'cable-row', name: 'Seated cable row', primary: ['upper-back'], secondary: ['biceps', 'trapezius'], needs: [['cable_station']], compound: true, cue: 'Pull to your belly button, squeeze shoulder blades.' },
  { id: 'db-row', name: 'One-arm dumbbell row', primary: ['upper-back'], secondary: ['biceps'], needs: [['dumbbells', 'bench']], compound: true, cue: 'Knee and hand on the bench; row to your hip.' },
  { id: 'bb-row', name: 'Barbell row', primary: ['upper-back'], secondary: ['lower-back', 'biceps'], needs: [['barbells']], compound: true, cue: 'Hinge to about 45°, flat back, bar to your belly.' },
  { id: 'inverted-row', name: 'Inverted row', primary: ['upper-back'], secondary: ['biceps'], needs: [['smith_machine'], ['barbells', 'power_rack']], compound: true, cue: 'Bar at hip height, body straight, chest to the bar.' },
  { id: 'db-shrug', name: 'Dumbbell shrug', primary: ['trapezius'], secondary: ['forearm'], needs: [['dumbbells']], compound: false, cue: 'Straight up to your ears, hold a second.' },
  { id: 'bb-shrug', name: 'Barbell shrug', primary: ['trapezius'], secondary: ['forearm'], needs: [['barbells']], compound: false, cue: 'No rolling; straight up and down.' },
  { id: 'deadlift', name: 'Deadlift', primary: ['lower-back', 'hamstring', 'gluteal'], secondary: ['trapezius', 'forearm', 'quadriceps'], needs: [['barbells']], compound: true, cue: 'Bar over mid-foot, brace, push the floor away.' },
  { id: 'rdl', name: 'Romanian deadlift', primary: ['hamstring', 'gluteal'], secondary: ['lower-back'], needs: [['barbells'], ['dumbbells']], compound: true, cue: 'Soft knees, push hips back until you feel the hamstrings.' },
  { id: 'good-morning', name: 'Good morning', primary: ['lower-back', 'hamstring'], secondary: ['gluteal'], needs: [['barbells', 'squat_rack'], ['barbells', 'power_rack']], compound: true, cue: 'Light bar on your back, hinge with a flat back.' },
  { id: 'superman', name: 'Superman hold', primary: ['lower-back'], secondary: ['gluteal'], needs: BODY, compound: false, cue: 'Face down, lift arms and legs, hold 3 seconds.' },
  // Legs
  { id: 'back-squat', name: 'Barbell back squat', primary: ['quadriceps', 'gluteal'], secondary: ['hamstring', 'lower-back', 'adductors'], needs: [['barbells', 'squat_rack'], ['barbells', 'power_rack']], compound: true, cue: 'Brace, sit between your heels, knees track your toes.' },
  { id: 'front-squat', name: 'Front squat', primary: ['quadriceps'], secondary: ['gluteal', 'abs'], needs: [['barbells', 'squat_rack'], ['barbells', 'power_rack']], compound: true, cue: 'Elbows high, stay tall.' },
  { id: 'smith-squat', name: 'Smith machine squat', primary: ['quadriceps', 'gluteal'], secondary: ['hamstring'], needs: [['smith_machine']], compound: true, cue: 'Feet slightly forward of the bar.' },
  { id: 'hack-squat', name: 'Hack squat', primary: ['quadriceps'], secondary: ['gluteal'], needs: [['hack_squat']], compound: true, cue: 'Full depth, drive through the whole foot.' },
  { id: 'leg-press', name: 'Leg press', primary: ['quadriceps', 'gluteal'], secondary: ['hamstring', 'adductors'], needs: [['leg_press']], compound: true, cue: "Lower until your hips want to curl; don't lock the knees." },
  { id: 'goblet-squat', name: 'Goblet squat', primary: ['quadriceps', 'gluteal'], secondary: ['adductors', 'abs'], needs: [['dumbbells']], compound: true, cue: 'Hold one dumbbell at your chest, elbows inside the knees.' },
  { id: 'split-squat', name: 'Bulgarian split squat', primary: ['quadriceps', 'gluteal'], secondary: ['adductors'], needs: [['dumbbells', 'bench']], compound: true, cue: 'Back foot on the bench, drop straight down.' },
  { id: 'lunge', name: 'Walking lunge', primary: ['quadriceps', 'gluteal'], secondary: ['hamstring'], needs: [['dumbbells'], []], compound: true, cue: 'Long steps, back knee kisses the floor.' },
  { id: 'air-squat', name: 'Body-weight squat', primary: ['quadriceps'], secondary: ['gluteal'], needs: BODY, compound: true, cue: 'Arms forward, hips below knees.' },
  { id: 'hip-thrust', name: 'Hip thrust', primary: ['gluteal'], secondary: ['hamstring'], needs: [['barbells', 'bench'], ['dumbbells', 'bench']], compound: true, cue: 'Upper back on the bench, chin tucked, squeeze at the top.' },
  { id: 'glute-bridge', name: 'Glute bridge', primary: ['gluteal'], secondary: ['hamstring'], needs: BODY, compound: false, cue: 'Heels close, drive hips up, pause.' },
  { id: 'cable-kickback', name: 'Cable kickback', primary: ['gluteal'], secondary: [], needs: [['cable_station']], compound: false, cue: 'Ankle strap, kick back without arching.' },
  { id: 'pull-through', name: 'Cable pull-through', primary: ['gluteal', 'hamstring'], secondary: [], needs: [['cable_station']], compound: true, cue: 'Face away, hinge and snap the hips forward.' },
  { id: 'nordic', name: 'Nordic curl', primary: ['hamstring'], secondary: [], needs: BODY, compound: false, cue: 'Anchor your heels, lower as slowly as you can.' },
  { id: 'sumo-squat', name: 'Dumbbell sumo squat', primary: ['adductors', 'gluteal'], secondary: ['quadriceps'], needs: [['dumbbells']], compound: true, cue: 'Wide stance, toes out, dumbbell hanging between the legs.' },
  { id: 'copenhagen', name: 'Copenhagen plank', primary: ['adductors'], secondary: ['obliques'], needs: [['bench']], compound: false, cue: 'Top leg on the bench, hold your hips up.' },
  { id: 'cossack', name: 'Cossack squat', primary: ['adductors'], secondary: ['quadriceps', 'gluteal'], needs: BODY, compound: true, cue: 'Shift side to side, the straight leg stays long.' },
  { id: 'calf-raise', name: 'Standing calf raise', primary: ['calves'], secondary: [], needs: [['dumbbells'], []], compound: false, cue: 'Full stretch at the bottom, pause at the top.' },
  { id: 'leg-press-calf', name: 'Leg-press calf raise', primary: ['calves'], secondary: [], needs: [['leg_press']], compound: false, cue: 'Balls of your feet on the plate edge.' },
  { id: 'smith-calf', name: 'Smith machine calf raise', primary: ['calves'], secondary: [], needs: [['smith_machine']], compound: false, cue: 'Stand on a plate for extra range.' },
  { id: 'sled-push', name: 'Sled push', primary: ['quadriceps', 'gluteal'], secondary: ['calves'], needs: [['turf_sled']], compound: true, cue: 'Low body angle, short fast steps.' },
  // Core
  { id: 'plank', name: 'Plank', primary: ['abs'], secondary: ['obliques'], needs: BODY, compound: false, cue: 'Squeeze glutes, ribs down, hold.' },
  { id: 'hanging-knee', name: 'Hanging knee raise', primary: ['abs'], secondary: ['forearm'], needs: [['power_rack']], compound: false, cue: 'From the rack’s pull-up bar; curl knees to chest, no swinging.' },
  { id: 'cable-crunch', name: 'Cable crunch', primary: ['abs'], secondary: [], needs: [['cable_station']], compound: false, cue: 'Kneel, rope by your head, curl down.' },
  { id: 'dead-bug', name: 'Dead bug', primary: ['abs'], secondary: [], needs: BODY, compound: false, cue: 'Lower back pressed into the floor the whole time.' },
  { id: 'side-plank', name: 'Side plank', primary: ['obliques'], secondary: ['abs'], needs: BODY, compound: false, cue: 'Stack your feet, hips high.' },
  { id: 'pallof', name: 'Pallof press', primary: ['obliques', 'abs'], secondary: [], needs: [['cable_station']], compound: false, cue: 'Stand side-on to the cable, press out and resist the twist.' },
  { id: 'woodchop', name: 'Cable woodchop', primary: ['obliques'], secondary: ['abs'], needs: [['cable_station']], compound: false, cue: 'Rotate through the trunk, arms long.' },
  { id: 'russian-twist', name: 'Russian twist', primary: ['obliques'], secondary: ['abs'], needs: [['dumbbells'], []], compound: false, cue: 'Lean back, rotate side to side.' },
  // Finishers
  { id: 'row-intervals', name: 'Rower intervals', primary: [], secondary: ['upper-back', 'quadriceps'], needs: [['rower']], compound: false, cardio: true, cue: '6 × 250 m hard, 1 minute easy between.' },
  { id: 'bike-intervals', name: 'Air bike sprints', primary: [], secondary: ['quadriceps'], needs: [['assault_bike']], compound: false, cardio: true, cue: '8 × 15 seconds all-out, 45 seconds easy.' },
  { id: 'incline-walk', name: 'Incline treadmill walk', primary: [], secondary: ['calves', 'gluteal'], needs: [['treadmill']], compound: false, cardio: true, cue: '10 minutes at a steep incline, brisk pace.' },
];

// --- Generating --------------------------------------------------------------

export type Goal = 'strength' | 'muscle' | 'endurance';
export type Length = 4 | 6 | 8;

export const GOALS: Array<{ id: Goal; label: string }> = [
  { id: 'strength', label: 'Strength' },
  { id: 'muscle', label: 'Build muscle' },
  { id: 'endurance', label: 'Endurance' },
];

export interface PlannedExercise {
  exercise: Exercise;
  sets: number;
  reps: string;
  restSeconds: number;
  /** The kit this plan uses for it ([] = body weight). */
  uses: Kit[];
  /** Every piece of that kit is confirmed at this gym. */
  confirmed: boolean;
}

export interface Workout {
  items: PlannedExercise[];
  /** Muscles picked that nothing available could train. */
  uncovered: Muscle[];
}

const DOSE: Record<Goal, { compound: [number, string, number]; isolation: [number, string, number] }> = {
  strength: { compound: [5, '5', 150], isolation: [3, '8', 75] },
  muscle: { compound: [4, '8–10', 90], isolation: [3, '10–15', 60] },
  endurance: { compound: [3, '15–20', 45], isolation: [3, '15–20', 30] },
};

/** Small deterministic random, so "Shuffle" gives a new plan and tests are stable. */
function random(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

/** The first way of doing it that the available kit allows, or null. */
export function wayToDo(exercise: Exercise, available: Set<Kit>): Kit[] | null {
  for (const option of exercise.needs) if (option.every((kit) => available.has(kit))) return option;
  return null;
}

export function generateWorkout(options: {
  muscles: Muscle[];
  available: Kit[];
  /** The subset of `available` that is confirmed at this gym. */
  confirmed: Kit[];
  goal: Goal;
  length: Length;
  seed?: number;
}): Workout {
  const { muscles, goal, length } = options;
  const available = new Set(options.available);
  const confirmed = new Set(options.confirmed);
  const rand = random(options.seed ?? 1);
  if (muscles.length === 0) return { items: [], uncovered: [] };

  const doable = EXERCISES.filter((exercise) => !exercise.cardio && wayToDo(exercise, available));
  const score = (exercise: Exercise, muscle: Muscle) => {
    const way = wayToDo(exercise, available) ?? [];
    let value = rand() * 2;
    if (exercise.primary[0] === muscle) value += 3;
    if (exercise.compound) value += 2;
    // Loaded moves beat body weight when the kit is there.
    if (way.length > 0) value += 1.5;
    // Moves that also hit other picked muscles earn their place.
    value += exercise.primary.filter((item) => item !== muscle && muscles.includes(item)).length;
    return value;
  };

  const chosen: Exercise[] = [];
  const uncovered: Muscle[] = [];
  // Round-robin over the picked muscles until the session is full, so each
  // gets its fair share, big compound moves first.
  const queues = muscles.map((muscle) => ({
    muscle,
    options: doable
      .filter((exercise) => exercise.primary.includes(muscle))
      .map((exercise) => ({ exercise, value: score(exercise, muscle) }))
      .sort((a, b) => b.value - a.value)
      .map((item) => item.exercise),
  }));
  for (const queue of queues) if (queue.options.length === 0) uncovered.push(queue.muscle);

  let added = true;
  while (chosen.length < length && added) {
    added = false;
    for (const queue of queues) {
      if (chosen.length >= length) break;
      const next = queue.options.find((exercise) => !chosen.includes(exercise));
      if (next) {
        chosen.push(next);
        added = true;
      }
    }
  }

  // Compounds first, then isolation, then core.
  const core = (exercise: Exercise) => exercise.primary.every((muscle) => muscle === 'abs' || muscle === 'obliques');
  chosen.sort((a, b) => Number(core(a)) - Number(core(b)) || Number(b.compound) - Number(a.compound));

  const items: PlannedExercise[] = chosen.map((exercise) => {
    const [sets, reps, restSeconds] = DOSE[goal][exercise.compound ? 'compound' : 'isolation'];
    const uses = wayToDo(exercise, available) ?? [];
    const timed = exercise.id === 'plank' || exercise.id === 'side-plank' || exercise.id === 'superman' || exercise.id === 'copenhagen';
    return {
      exercise,
      sets,
      reps: timed ? (goal === 'endurance' ? '45–60 s' : '30–45 s') : exercise.id === 'farmer-carry' ? '30–40 m' : reps,
      restSeconds,
      uses,
      confirmed: uses.every((kit) => confirmed.has(kit)),
    };
  });

  // A conditioning finisher, when there's room and a machine for it.
  if (goal === 'endurance' || length === 8) {
    const finisher = EXERCISES.filter((exercise) => exercise.cardio && wayToDo(exercise, available));
    const pick = finisher[Math.floor(rand() * finisher.length)];
    if (pick) {
      const uses = wayToDo(pick, available) ?? [];
      items.push({ exercise: pick, sets: 1, reps: 'see cue', restSeconds: 0, uses, confirmed: uses.every((kit) => confirmed.has(kit)) });
    }
  }

  return { items, uncovered };
}

/** Plain-text version for sharing. */
export function workoutText(workout: Workout, gymName: string | null): string {
  const lines = workout.items.map(
    (item, index) =>
      `${index + 1}. ${item.exercise.name}: ${item.exercise.cardio ? item.exercise.cue : `${item.sets} × ${item.reps}, rest ${item.restSeconds} s`}`,
  );
  return [`Workout${gymName ? ` at ${gymName}` : ''} (made with GymGO)`, ...lines].join('\n');
}
