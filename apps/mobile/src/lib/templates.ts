/**
 * Workout templates: well-known plans to start from, rather than building
 * one muscle by muscle. Each is a few days that take turns: start a
 * template and you get the day after the last one you did.
 *
 * They're common, general programmes, written out with GymGO's own
 * exercises; not advice for anyone in particular. The screen says to start
 * light and leave reps in the tank.
 *
 * No React Native imports here, so it is unit-tested in Node.
 */

import type { TrainingSession } from './training';

export interface TemplateItem {
  exerciseId: string;
  sets: number;
  /** "5", "8–10". */
  reps: string;
  restSeconds: number;
  /** Its superset or circuit: a letter shared with its neighbours (lib/supersets.ts). */
  group?: string;
}

export interface TemplateDay {
  name: string;
  items: TemplateItem[];
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  /** Who it suits, in a few words. */
  level: 'Beginner' | 'Intermediate';
  /** Days a week it's meant for. */
  perWeek: string;
  summary: string;
  days: TemplateDay[];
}

const item = (exerciseId: string, sets: number, reps: string, restSeconds: number): TemplateItem => ({ exerciseId, sets, reps, restSeconds });
/** Neighbours done as a superset (two) or circuit (more): one set of each in turn, the rest after the round. */
const together = (group: string, ...items: TemplateItem[]): TemplateItem[] => items.map((each) => ({ ...each, group }));

export const TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'full-body',
    name: 'Beginner full body',
    level: 'Beginner',
    perWeek: '3 days a week',
    summary: 'Two whole-body days, A and B, taking turns with a day off between. The simplest way to learn the main lifts.',
    days: [
      {
        name: 'Full body A',
        items: [item('goblet-squat', 3, '8–10', 90), item('db-bench', 3, '8–10', 90), item('pulldown', 3, '10–12', 90), item('rdl', 3, '8–10', 90), item('plank', 3, '30–45 s', 45)],
      },
      {
        name: 'Full body B',
        items: [item('leg-press', 3, '10–12', 90), item('db-shoulder', 3, '8–10', 90), item('cable-row', 3, '10–12', 90), item('glute-bridge', 3, '10–12', 60), item('dead-bug', 3, '10', 45)],
      },
    ],
  },
  {
    id: 'full-body-3',
    name: 'Full body, 3 days',
    level: 'Beginner',
    perWeek: '3 days a week',
    summary: 'Three different whole-body days, A, B and C, with a day off between. More variety than two days, the same main lifts each week.',
    days: [
      {
        name: 'Full body A',
        items: [item('back-squat', 3, '6–8', 150), item('bench-press', 3, '6–8', 150), item('cable-row', 3, '10–12', 90), item('lateral-raise', 2, '12–15', 60), item('plank', 3, '30–45 s', 45)],
      },
      {
        name: 'Full body B',
        items: [item('deadlift', 3, '5', 180), item('ohp', 3, '6–8', 150), item('pulldown', 3, '10–12', 90), item('split-squat', 2, '10', 90), item('hanging-knee', 3, '10–12', 60)],
      },
      {
        name: 'Full body C',
        items: [item('front-squat', 3, '6–8', 150), item('incline-db', 3, '8–10', 90), item('chest-supported-row', 3, '10–12', 90), item('hip-thrust', 3, '8–10', 90), item('bicycle-crunch', 3, '12–16', 45)],
      },
    ],
  },
  {
    id: 'five-by-five',
    name: '5×5 strength',
    level: 'Beginner',
    perWeek: '3 days a week',
    summary: 'Five sets of five on the big barbell lifts, two days taking turns. Add a little weight each time every set is done.',
    days: [
      { name: '5×5 A', items: [item('back-squat', 5, '5', 180), item('bench-press', 5, '5', 180), item('bb-row', 5, '5', 180)] },
      { name: '5×5 B', items: [item('back-squat', 5, '5', 180), item('ohp', 5, '5', 180), item('deadlift', 1, '5', 240)] },
    ],
  },
  {
    id: 'body-weight',
    name: 'Body weight, anywhere',
    level: 'Beginner',
    perWeek: '3 days a week',
    summary: 'No equipment at all: two days taking turns, for a hotel room, a park or a gym with no free space. Make it harder with slower reps, not faster.',
    days: [
      {
        name: 'Body weight A',
        items: [item('air-squat', 3, '15–20', 60), item('push-up', 3, '8–15', 60), item('glute-bridge', 3, '12–15', 60), item('dead-bug', 3, '10', 45), item('mountain-climber', 3, '30–45 s', 45)],
      },
      {
        name: 'Body weight B',
        items: [item('lunge', 3, '10', 60), item('pike-push-up', 3, '8–12', 60), item('single-leg-rdl', 3, '10', 60), item('superman', 3, '30–45 s', 45), item('hollow-hold', 3, '20–30 s', 45)],
      },
    ],
  },
  {
    id: 'ppl',
    name: 'Push, pull, legs',
    level: 'Intermediate',
    perWeek: '3 or 6 days a week',
    summary: 'Pushing muscles, pulling muscles, then legs, in turn. Run it once a week, or twice for more volume.',
    days: [
      {
        name: 'Push',
        items: [item('bench-press', 4, '6–8', 150), item('ohp', 3, '8–10', 120), item('incline-db', 3, '8–12', 90), item('lateral-raise', 3, '12–15', 60), item('pushdown', 3, '10–12', 60)],
      },
      {
        name: 'Pull',
        items: [item('pull-up', 3, '6–10', 120), item('bb-row', 4, '6–8', 150), item('cable-row', 3, '10–12', 90), item('face-pull', 3, '12–15', 60), item('db-curl', 3, '10–12', 60)],
      },
      {
        name: 'Legs',
        items: [item('back-squat', 4, '6–8', 180), item('rdl', 3, '8–10', 120), item('leg-press', 3, '10–12', 90), item('split-squat', 3, '10', 90), item('calf-raise', 4, '12–15', 60)],
      },
    ],
  },
  {
    id: 'upper-lower',
    name: 'Upper / lower',
    level: 'Intermediate',
    perWeek: '4 days a week',
    summary: 'Upper body, then lower body, twice a week: a heavier day and a lighter, higher-rep day for each. Each muscle trained twice a week.',
    days: [
      {
        name: 'Upper A',
        items: [item('bench-press', 4, '6–8', 150), item('bb-row', 4, '6–8', 150), item('ohp', 3, '8–10', 120), item('pulldown', 3, '10–12', 90), ...together('A', item('skull-crusher', 3, '10–12', 60), item('db-curl', 3, '10–12', 60))],
      },
      {
        name: 'Lower A',
        items: [item('back-squat', 4, '6–8', 180), item('rdl', 3, '8–10', 120), item('split-squat', 3, '10', 90), item('seated-calf', 4, '12–15', 60), item('hanging-leg-raise', 3, '10–12', 60)],
      },
      {
        name: 'Upper B',
        items: [item('incline-db', 4, '8–10', 120), item('chest-supported-row', 4, '8–10', 120), item('arnold-press', 3, '10–12', 90), item('chin-up', 3, '6–10', 120), ...together('A', item('lateral-raise', 3, '12–15', 60), item('hammer-curl', 3, '10–12', 60))],
      },
      {
        name: 'Lower B',
        items: [item('deadlift', 3, '5', 180), item('front-squat', 3, '6–8', 150), item('hip-thrust', 3, '8–10', 90), item('calf-raise', 4, '12–15', 60), item('cable-crunch', 3, '12–15', 60)],
      },
    ],
  },
  {
    id: 'arnold',
    name: 'Arnold split',
    level: 'Intermediate',
    perWeek: '3 or 6 days a week',
    summary: 'Chest with back, shoulders with arms, then legs. Opposite muscles share a day, so one rests while the other works. Once a week, or twice for more.',
    days: [
      {
        name: 'Chest and back',
        items: [item('incline-bench', 4, '6–8', 150), item('pull-up', 4, '6–10', 120), item('db-pullover', 3, '10–12', 90), ...together('A', item('cable-fly', 3, '12–15', 60), item('cable-row', 3, '10–12', 60))],
      },
      {
        name: 'Shoulders and arms',
        items: [item('ohp', 4, '6–8', 150), item('lateral-raise', 3, '12–15', 60), ...together('A', item('bb-curl', 3, '8–10', 90), item('skull-crusher', 3, '8–10', 90)), ...together('B', item('hammer-curl', 3, '10–12', 60), item('pushdown', 3, '10–12', 60))],
      },
      {
        name: 'Legs',
        items: [item('back-squat', 4, '6–8', 180), item('rdl', 3, '8–10', 120), item('lunge', 3, '10', 90), item('calf-raise', 4, '12–15', 60), item('hanging-leg-raise', 3, '10–12', 60)],
      },
    ],
  },
  {
    id: 'body-part',
    name: 'Body-part split',
    level: 'Intermediate',
    perWeek: '5 days a week',
    summary: 'One muscle group a day: chest, back, shoulders, legs, then arms. Plenty of sets for each, and a whole week for it to recover.',
    days: [
      {
        name: 'Chest',
        items: [item('bench-press', 4, '6–8', 150), item('incline-bench', 3, '8–10', 120), item('db-pullover', 3, '10–12', 90), item('cable-fly', 3, '12–15', 60), item('decline-push-up', 2, '10–15', 60)],
      },
      {
        name: 'Back',
        items: [item('deadlift', 3, '5', 180), item('pull-up', 4, '6–10', 120), item('cable-row', 3, '10–12', 90), item('straight-arm-pulldown', 3, '12–15', 60), item('db-shrug', 3, '10–12', 60)],
      },
      {
        name: 'Shoulders',
        items: [item('ohp', 4, '6–8', 150), item('arnold-press', 3, '8–10', 90), item('lateral-raise', 4, '12–15', 60), item('rear-delt-fly', 3, '12–15', 60), item('upright-row', 3, '10–12', 60)],
      },
      {
        name: 'Legs',
        items: [item('back-squat', 4, '6–8', 180), item('leg-press', 3, '10–12', 120), item('single-leg-rdl', 3, '10', 90), item('step-up', 3, '10', 90), item('seated-calf', 4, '12–15', 60)],
      },
      {
        name: 'Arms',
        items: [
          item('close-grip', 3, '8–10', 120),
          item('bb-curl', 3, '8–10', 90),
          ...together('A', item('incline-curl', 3, '10–12', 60), item('cable-overhead-ext', 3, '10–12', 60)),
          item('concentration-curl', 2, '12', 45),
        ],
      },
    ],
  },
];

/** Training programmes' names (lib/programmes.ts, which checks they match), for telling their workouts apart in the log. */
export const PROGRAMME_TITLES = ['Strength programme', 'Muscle programme', 'Fitness programme'];

/** What a template day's workout is called in your log: "Push · Push, pull, legs". */
export const templateDayName = (template: WorkoutTemplate, day: TemplateDay) => `${day.name} · ${template.name}`;

/** A workout's name as a title: a template day's is split into the day and, apart, its plan. */
export function workoutTitle(name: string): { title: string; plan: string | null } {
  const at = name.lastIndexOf(' · ');
  const plan = at > 0 ? name.slice(at + 3) : null;
  return plan && (TEMPLATES.some((template) => template.name === plan) || PROGRAMME_TITLES.includes(plan)) ? { title: name.slice(0, at), plan } : { title: name, plan: null };
}

/**
 * The day to do next: the one after the last of this template's days in
 * your log, or the first if you haven't done any.
 */
export function nextTemplateDay(template: WorkoutTemplate, sessions: readonly TrainingSession[]): number {
  const names = template.days.map((day) => templateDayName(template, day));
  const last = [...sessions].sort((a, b) => b.finishedAt.localeCompare(a.finishedAt)).find((session) => names.includes(session.name));
  if (!last) return 0;
  return (names.indexOf(last.name) + 1) % template.days.length;
}

/**
 * The plan you're following and its next day: the template of the latest
 * template workout in your log. Null until you've done one, so Home only
 * offers "Up next" to someone already on a plan.
 */
export function upNext(sessions: readonly TrainingSession[]): { template: WorkoutTemplate; day: number } | null {
  // A template's workout, not a training programme's (Home shows a programme's next day itself).
  const latest = [...sessions]
    .sort((a, b) => b.finishedAt.localeCompare(a.finishedAt))
    .find((session) => {
      const plan = workoutTitle(session.name).plan;
      return plan !== null && TEMPLATES.some((template) => template.name === plan);
    });
  if (!latest) return null;
  const plan = workoutTitle(latest.name).plan;
  const template = TEMPLATES.find((candidate) => candidate.name === plan);
  return template ? { template, day: nextTemplateDay(template, sessions) } : null;
}
