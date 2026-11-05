/**
 * What a key does to a switch drawn in a browser (components/Toggle.tsx).
 * Enter already presses it (react-native-web's Pressable); Space is a
 * switch's own key, and it flips once per press: a key held down repeats,
 * and each repeat would flip it again, leaving it in whatever state the
 * last one landed on.
 */
export function switchKey(event: { key?: string; repeat?: boolean }): 'flip' | null {
  if (event.key !== ' ' && event.key !== 'Spacebar') return null;
  return event.repeat ? null : 'flip';
}
