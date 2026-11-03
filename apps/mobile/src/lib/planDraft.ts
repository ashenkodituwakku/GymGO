/**
 * A plan handed to the workout editor (app/workout-edit.tsx) by the screen
 * that opened it: the builder's "Edit this plan". Taken once; a reload
 * starts the editor afresh.
 */

import type { PlanItem } from './planEdit';

export interface HandedPlan {
  name: string;
  gymId: string | null;
  gymName: string | null;
  items: PlanItem[];
}

let handed: HandedPlan | null = null;

export function handPlan(plan: HandedPlan): void {
  handed = { ...plan, items: plan.items.map((item) => ({ ...item })) };
}

export function takePlan(): HandedPlan | null {
  const plan = handed;
  handed = null;
  return plan;
}
