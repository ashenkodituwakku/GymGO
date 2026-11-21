/**
 * Whether Home is being customised (components/HomeEditor.tsx): GymPal's
 * tab keeps out of the way meanwhile, as the editing bar sits where it does.
 */

import { useSyncExternalStore } from 'react';

let editing = false;
const listeners = new Set<() => void>();

export function setHomeEditing(next: boolean): void {
  if (next === editing) return;
  editing = next;
  for (const listener of listeners) listener();
}

export const useHomeEditing = (): boolean =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => editing,
    () => editing,
  );
