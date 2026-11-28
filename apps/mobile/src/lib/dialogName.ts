/**
 * In a browser, React Native's Modal is a dialog with no name, and a screen
 * reader says only "dialog" as it opens. This gives it one: put the ref on
 * anything inside the Modal. Phones name a modal by what's in it, so it does
 * nothing there.
 */

import { useCallback } from 'react';
import { Platform } from 'react-native';

export function useDialogName(name: string): (node: unknown) => void {
  return useCallback(
    (node: unknown) => {
      if (Platform.OS !== 'web' || !node) return;
      const inside = node as { closest?: (selector: string) => { setAttribute(name: string, value: string): void } | null };
      // The Modal's own element: the one React Native for Web marks as modal.
      inside.closest?.('[aria-modal="true"]')?.setAttribute('aria-label', name);
    },
    [name],
  );
}
