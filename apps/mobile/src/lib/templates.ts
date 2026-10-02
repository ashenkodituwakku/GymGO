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
];

/** What a template day's workout is called in your log: "Push · Push, pull, legs". */
export const templateDayName = (template: WorkoutTemplate, day: TemplateDay) => `${day.name} · ${template.name}`;

/** A workout's name as a title: a template day's is split into the day and, apart, its plan. */
export function workoutTitle(name: string): { title: string; plan: string | null } {
  const at = name.lastIndexOf(' · ');
  const plan = at > 0 ? name.slice(at + 3) : null;
  return plan && TEMPLATES.some((template) => template.name === plan) ? { title: name.slice(0, at), plan } : { title: name, plan: null };
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
