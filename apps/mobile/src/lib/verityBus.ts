/**
 * Opening Verity from anywhere in the app: a screen calls `openVerity`, and
 * the chat (components/Verity.tsx, always there while signed in) opens,
 * asking the question at once if there is one.
 *
 * `context` is what that screen shows, in a few plain lines (the workout you
 * built, an exercise, what a gym hasn't confirmed), sent along with the
 * question and the conversation's next ones until Start over or another
 * screen's. `about` names it, so the chat can say what Verity was told.
 * Nothing about a real gym goes beyond what GymGO itself shows.
 */

export interface VerityRequest {
  question?: string;
  context?: string;
  about?: string;
  /** Ask with their training log, when they have Pro (a training programme, say). */
  withLog?: boolean;
}

type Listener = (request: VerityRequest) => void;
const listeners = new Set<Listener>();

export function openVerity(request: VerityRequest = {}): void {
  for (const listener of listeners) listener(request);
}

/** For the chat: called with each request; returns the way to stop listening. */
export function onVerityRequest(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
