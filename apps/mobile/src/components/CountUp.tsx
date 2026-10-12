/**
 * A figure that counts up to its value, quickly and easing out, the first
 * time it's shown and whenever it changes after (a check-in, a workout):
 * from what this figure last showed, so coming back to a screen, or the
 * screen being drawn again for new colours, doesn't run it again. With
 * Reduce Motion on it's simply the number.
 */

import { useEffect, useRef, useState } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { Txt } from './ui';

/** What each figure last showed, by its key, for this run of the app. */
const shown = new Map<string, number>();

const DURATION = 650;
const easeOut = (t: number) => 1 - (1 - t) ** 3;

export function CountUp({
  id,
  value,
  variant = 'title',
  color,
  style,
}: {
  /** Names the figure (say 'collection.gyms'), so it knows what it last showed. */
  id: string;
  value: number;
  variant?: 'title' | 'figure' | 'largeTitle' | 'title2';
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  const calm = useReducedMotion();
  const from = shown.get(id) ?? 0;
  const [now, setNow] = useState(calm || !Number.isInteger(value) ? value : from);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const start = shown.get(id) ?? 0;
    shown.set(id, value);
    if (calm || start === value || !Number.isInteger(value)) {
      setNow(value);
      return;
    }
    const began = Date.now();
    const step = () => {
      const t = Math.min(1, (Date.now() - began) / DURATION);
      setNow(Math.round(start + (value - start) * easeOut(t)));
      if (t < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [id, value, calm]);

  return (
    <Txt variant={variant} color={color} style={[{ fontVariant: ['tabular-nums'] }, style]}>
      {now.toLocaleString()}
    </Txt>
  );
}
