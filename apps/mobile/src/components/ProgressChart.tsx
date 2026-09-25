/**
 * Your estimated one-rep max over time, one point per session: a plain line
 * chart of your own logged numbers. Nothing is smoothed or projected.
 */

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { color, space } from '@/lib/theme';
import { formatWeight, fromKg, type WeightUnit } from '@/lib/training';
import { Txt } from './ui';

const HEIGHT = 170;
const PAD = 10;

export function ProgressChart({ points, unit }: { points: Array<{ date: string; kg: number }>; unit: WeightUnit }) {
  const [width, setWidth] = useState(0);
  const values = points.map((point) => fromKg(point.kg, unit));
  const low = Math.min(...values);
  const high = Math.max(...values);
  // A flat line sits in the middle rather than on an edge.
  const span = high - low || Math.max(1, high * 0.1);
  const base = high - low ? low : low - span / 2;
  const first = Date.parse(points[0]?.date ?? '');
  const last = Date.parse(points[points.length - 1]?.date ?? '');
  const x = (index: number) => {
    if (points.length === 1) return width / 2;
    const at = Date.parse(points[index]!.date);
    return PAD + ((at - first) / Math.max(1, last - first)) * (width - PAD * 2);
  };
  const y = (value: number) => PAD + (1 - (value - base) / span) * (HEIGHT - PAD * 2);
  const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const change = values.length > 1 ? values[values.length - 1]! - values[0]! : 0;

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityLabel={`Estimated one-rep max, ${points.length} sessions, from ${formatWeight(Math.round(values[0] ?? 0), unit)} to ${formatWeight(Math.round(values[values.length - 1] ?? 0), unit)}`}
    >
      <View style={styles.legend}>
        <Txt variant="caption" color={color.labelSecondary}>
          Estimated 1-rep max
        </Txt>
        {values.length > 1 && (
          <Txt variant="caption" color={change >= 0 ? color.goodInk : color.maybeInk}>
            {change >= 0 ? '+' : '−'}
            {formatWeight(Math.abs(Math.round(change * 10) / 10), unit)} since {day(points[0]!.date)}
          </Txt>
        )}
      </View>
      <View style={styles.chart} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {width > 0 && (
          <Svg width={width} height={HEIGHT}>
            {[0, 0.5, 1].map((share) => (
              <Line key={share} x1={0} x2={width} y1={PAD + share * (HEIGHT - PAD * 2)} y2={PAD + share * (HEIGHT - PAD * 2)} stroke={color.separator} strokeWidth={1} />
            ))}
            {points.length > 1 && (
              <Polyline
                points={values.map((value, index) => `${x(index)},${y(value)}`).join(' ')}
                fill="none"
                stroke={color.brand}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            {values.map((value, index) => (
              <Circle key={index} cx={x(index)} cy={y(value)} r={index === values.length - 1 ? 5 : 3.5} fill={index === values.length - 1 ? color.brand : color.card} stroke={color.brand} strokeWidth={2} />
            ))}
          </Svg>
        )}
      </View>
      <View style={styles.axis}>
        <Txt variant="caption" color={color.labelTertiary}>
          {points[0] ? day(points[0].date) : ''}
        </Txt>
        <Txt variant="caption" color={color.labelTertiary}>
          {formatWeight(Math.round(base), unit)} – {formatWeight(Math.round(base + span), unit)}
        </Txt>
        <Txt variant="caption" color={color.labelTertiary}>
          {points.length > 1 ? day(points[points.length - 1]!.date) : ''}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[2] },
  legend: { flexDirection: 'row', justifyContent: 'space-between' },
  chart: { height: HEIGHT, width: '100%' },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
});
