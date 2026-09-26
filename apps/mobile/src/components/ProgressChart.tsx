/**
 * Your estimated one-rep max over time, one point per day you trained it: a
 * plain line chart of your own logged numbers. Nothing is smoothed or
 * projected. The weights sit on the gridlines at the right, as in Health.
 */

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { color, space, themed } from '@/lib/theme';
import { formatWeight, fromKg, type WeightUnit } from '@/lib/training';
import { Txt } from './ui';

const HEIGHT = 170;
const PAD = 10;
/** Room at the right for the gridlines' weights. */
const GUTTER = 58;

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
    if (points.length === 1) return (width - GUTTER) / 2;
    const at = Date.parse(points[index]!.date);
    return PAD + ((at - first) / Math.max(1, last - first)) * (width - GUTTER - PAD * 2);
  };
  const y = (value: number) => PAD + (1 - (value - base) / span) * (HEIGHT - PAD * 2);
  // The gridlines, top to bottom, and the weight each marks.
  const grid = [0, 0.5, 1].map((share) => ({ at: PAD + share * (HEIGHT - PAD * 2), value: base + span * (1 - share) }));
  // Whole numbers, unless the lines are closer together than that.
  const gridLabel = (value: number) => formatWeight(span >= 4 ? Math.round(value) : Math.round(value * 10) / 10, unit);
  const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const change = values.length > 1 ? values[values.length - 1]! - values[0]! : 0;

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityLabel={`Estimated one-rep max, ${points.length} ${points.length === 1 ? 'day' : 'days'}, from ${formatWeight(Math.round(values[0] ?? 0), unit)} to ${formatWeight(Math.round(values[values.length - 1] ?? 0), unit)}`}
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
            {grid.map((line) => (
              <Line key={line.at} x1={0} x2={width - GUTTER + space[2]} y1={line.at} y2={line.at} stroke={color.separator} strokeWidth={1} />
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
        {width > 0 &&
          grid.map((line) => (
            <Txt key={line.at} variant="caption" color={color.labelTertiary} numberOfLines={1} style={[styles.gridLabel, { top: line.at - 8 }]}>
              {gridLabel(line.value)}
            </Txt>
          ))}
      </View>
      <View style={[styles.axis, { marginRight: GUTTER }, points.length === 1 && styles.axisSingle]}>
        <Txt variant="caption" color={color.labelTertiary}>
          {points[0] ? day(points[0].date) : ''}
        </Txt>
        {points.length > 1 && (
          <Txt variant="caption" color={color.labelTertiary}>
            {day(points[points.length - 1]!.date)}
          </Txt>
        )}
      </View>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  wrap: { gap: space[2] },
  legend: { flexDirection: 'row', justifyContent: 'space-between' },
  chart: { height: HEIGHT, width: '100%' },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  // One day: its date under its point, in the middle.
  axisSingle: { justifyContent: 'center' },
  gridLabel: { position: 'absolute', right: 0, width: GUTTER - space[2], textAlign: 'right', lineHeight: 16 },
}));
