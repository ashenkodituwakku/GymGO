/**
 * Opening GymPal from anywhere in the app: a screen calls `openGymPal`, and
 * the chat (components/GymPal.tsx, always there while signed in) opens,
 * asking the question at once if there is one.
 *
 * `context` is what that screen shows, in a few plain lines (the workout you
 * built, an exercise, what a gym hasn't confirmed), sent along with the
 * question and the conversation's next ones until Start over or another
 * screen's. `about` names it, so the chat can say what GymPal was told.
 * Nothing about a real gym goes beyond what GymGO itself shows.
 */

export interface GymPalRequest {
  question?: string;
  context?: string;
  about?: string;
}

type Listener = (request: GymPalRequest) => void;
const listeners = new Set<Listener>();

export function openGymPal(request: GymPalRequest = {}): void {
  for (const listener of listeners) listener(request);
}

/** For the chat: called with each request; returns the way to stop listening. */
export function onGymPalRequest(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
