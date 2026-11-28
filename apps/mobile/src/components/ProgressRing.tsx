/**
 * A ring that fills clockwise from the top as `progress` goes from 0 to 1,
 * round-ended, with whatever sits inside it: the interval timer's clock,
 * the rest timer's icon.
 */

import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

export function ProgressRing({
  size,
  stroke,
  progress,
  track,
  tint,
  children,
}: {
  size: number;
  stroke: number;
  progress: number;
  track: string;
  tint: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const around = 2 * Math.PI * r;
  const shown = Math.min(1, Math.max(0, progress));
  const middle = size / 2;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill} aria-hidden>
        <Circle cx={middle} cy={middle} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        {shown > 0 && (
          <Circle
            cx={middle}
            cy={middle}
            r={r}
            stroke={tint}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${around} ${around}`}
            strokeDashoffset={around * (1 - shown)}
            transform={`rotate(-90 ${middle} ${middle})`}
          />
        )}
      </Svg>
      {children}
    </View>
  );
}
