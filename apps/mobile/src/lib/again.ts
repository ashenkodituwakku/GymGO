/**
 * "Do it again": a workout you logged, as a plan to start. The same
 * exercises in the same order, as many sets of each as you did, the reps you
 * got (a range when they varied), and the builder's usual rest. The weights
 * come from your log as you train, as for any workout ("Last time: …").
 *
 * No React Native here, so it is unit-tested in Node.
 */

import { isTimedSet, workingSets, type TrainingSession } from './training';
import { doseFor, exerciseById } from './workout';

export interface AgainPlan {
  name: string;
  workoutId: string | null;
  gymId: string | null;
  items: Array<{ exerciseId: string; sets: number; reps: string; restSeconds: number }>;
}


/** Rest for an exercise GymGO doesn't know (one you named yourself). */
const OWN_REST = 60;

export function againPlan(session: TrainingSession): AgainPlan | null {
  const items = session.exercises
    // Warm-ups are done before the plan, not part of it.
    .filter((logged) => workingSets(logged.sets).length > 0)
    .map((logged) => {
      const exercise = exerciseById(logged.exerciseId);
      const sets = workingSets(logged.sets).length;
      // A finisher (rower, bike) is done as its cue says, once.
      if (exercise?.cardio) return { exerciseId: logged.exerciseId, sets: 1, reps: 'see cue', restSeconds: 0 };
      const dose = exercise ? doseFor(exercise, 'muscle') : null;
      // A hold or a carry keeps its time or distance; reps are what you got.
      if (dose && dose.measure !== 'reps') return { exerciseId: logged.exerciseId, sets, reps: dose.reps, restSeconds: dose.restSeconds };
      // One of your own done by the clock or the tape: its times or distances, as a plan writes them ("45–60 s").
      const timed = workingSets(logged.sets).filter(isTimedSet);
      if (timed.length > 0) {
        const metres = timed.every((set) => set.metres);
        const values = timed.map((set) => (metres ? set.metres! : (set.seconds ?? 0))).filter((value) => value > 0);
        const low = Math.min(...values);
        const high = Math.max(...values);
        const end = metres ? 'm' : 's';
        return { exerciseId: logged.exerciseId, sets, reps: low === high ? `${low} ${end}` : `${low}–${high} ${end}`, restSeconds: dose?.restSeconds ?? OWN_REST };
      }
      const got = workingSets(logged.sets).map((set) => set.reps);
      const low = Math.min(...got);
      const high = Math.max(...got);
      const reps = got.length === 0 ? (dose?.reps ?? '8–10') : low === high ? String(low) : `${low}–${high}`;
      return { exerciseId: logged.exerciseId, sets, reps, restSeconds: dose?.restSeconds ?? OWN_REST };
    });
  if (items.length === 0) return null;
  return { name: session.name, workoutId: session.workoutId, gymId: session.gymId, items };
}
