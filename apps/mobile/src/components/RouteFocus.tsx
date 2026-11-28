/**
 * Moving between pages in a browser, as a website should behave.
 *
 * In a one-page app the browser does neither of the things it does between
 * real pages. A screen reader wasn't told the page had changed (a new title
 * isn't read out), and going back left focus on the page itself rather than
 * on the row you'd opened, so Tab started again from the top.
 *
 * So, on each change of page: the new page's name is said, politely, by a
 * line nobody sees. And the control you left a page from is remembered: come
 * back to that page with nothing focused, and focus goes back to it.
 *
 * A phone's screen reader does both itself; this draws nothing there.
 */

import { usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text } from 'react-native';

export function RouteFocus() {
  const pathname = usePathname();
  const [said, setSaid] = useState('');
  // The control last focused (anywhere), and the one each page was left from.
  const lastFocused = useRef<HTMLElement | null>(null);
  const leftFrom = useRef(new Map<string, HTMLElement>());
  const shown = useRef(pathname);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && target !== document.body) lastFocused.current = target;
    };
    document.addEventListener('focusin', onIn);
    return () => document.removeEventListener('focusin', onIn);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const was = shown.current;
    if (was === pathname) return;
    shown.current = pathname;
    if (lastFocused.current?.isConnected) leftFrom.current.set(was, lastFocused.current);
    // Once the page has drawn and set its title.
    const timer = setTimeout(() => {
      setSaid(document.title.replace(/ · GymGO$/, ''));
      const back = leftFrom.current.get(pathname);
      const lost = !document.activeElement || document.activeElement === document.body;
      if (lost && back?.isConnected && back.getClientRects().length > 0) back.focus();
    }, 350);
    return () => clearTimeout(timer);
  }, [pathname]);

  if (Platform.OS !== 'web') return null;
  return (
    <Text aria-live="polite" style={styles.unseen}>
      {said}
    </Text>
  );
}

const styles = StyleSheet.create({
  // Read by a screen reader, never seen: the usual visually-hidden box.
  unseen: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', pointerEvents: 'none' } as object,
});
