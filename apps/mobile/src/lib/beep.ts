/**
 * A short tone for the interval timer, in a browser. A phone buzzes instead
 * (haptics): playing sound there needs an audio module this build hasn't got.
 *
 * Browsers only let a page make sound after a tap, so the timer's Start
 * button calls primeBeep() first.
 */

import { Platform } from 'react-native';

let context: AudioContext | null = null;

export function primeBeep(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !('AudioContext' in window)) return;
  try {
    context ??= new AudioContext();
    void context.resume();
  } catch {
    context = null;
  }
}

/** A quarter-second tone: high for "go", low for the count-down and rest. */
export function beep(high = false): void {
  if (!context) return;
  try {
    const now = context.currentTime;
    const tone = context.createOscillator();
    const level = context.createGain();
    tone.frequency.value = high ? 880 : 587;
    level.gain.setValueAtTime(0.18, now);
    level.gain.exponentialRampToValueAtTime(0.001, now + (high ? 0.4 : 0.2));
    tone.connect(level).connect(context.destination);
    tone.start(now);
    tone.stop(now + 0.45);
  } catch {
    // No sound, then; the screen still shows the change.
  }
}
