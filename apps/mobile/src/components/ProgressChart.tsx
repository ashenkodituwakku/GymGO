/**
 * A weight over time (your estimated one-rep max, a point per day you
 * trained it; or your body weight): a plain line chart of your own logged
 * numbers. Nothing is smoothed or
 * projected. The weights sit on the gridlines at the right, as in Health.
 * The line is shaded down to the foot in the accent, fading out, and the
 * latest day's point has a soft halo.
 */

import { useId, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Polyline, Stop } from 'react-native-svg';
import { alpha } from '@/lib/looks';
import { color, space, themed } from '@/lib/theme';
import { formatWeight, fromKg, type WeightUnit } from '@/lib/training';
import { Txt } from './ui';
import { dateLabel } from '@/lib/copy';

const HEIGHT = 170;
const PAD = 10;
/** Room at the right for the gridlines' weights. */
const GUTTER = 58;

export function ProgressChart({
  points,
  unit,
  title = 'Estimated 1-rep max',
  legend = true,
}: {
  /** A workout's finish time, or a calendar date (YYYY-MM-DD). */
  points: Array<{ date: string; kg: number }>;
  unit: WeightUnit;
  /** What's drawn, for its legend and screen readers. */
  title?: string;
  /** The title and change above the chart: off where the card above says them. */
  legend?: boolean;
}) {
  const [width, setWidth] = useState(0);
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
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
  // A time on the phone's clock; a calendar date (a weigh-in) as written.
  const day = (iso: string) => dateLabel(iso);
  // To a tenth, as it's shown: no change reads as that, not a green "+0".
  const change = values.length > 1 ? Math.round((values[values.length - 1]! - values[0]!) * 10) / 10 : 0;

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityLabel={`${title}, ${points.length} ${points.length === 1 ? 'day' : 'days'}, from ${formatWeight(Math.round(values[0] ?? 0), unit)} to ${formatWeight(Math.round(values[values.length - 1] ?? 0), unit)}`}
    >
      {legend && (
        <View style={styles.legend}>
          <Txt variant="caption" color={color.labelSecondary}>
            {title}
          </Txt>
          {values.length > 1 && (
            <Txt variant="caption" color={change > 0 ? color.goodInk : change < 0 ? color.maybeInk : color.labelSecondary}>
              {change === 0 ? `No change since ${day(points[0]!.date)}` : `${change > 0 ? '+' : '−'}${formatWeight(Math.abs(change), unit)} since ${day(points[0]!.date)}`}
            </Txt>
          )}
        </View>
      )}
      <View style={styles.chart} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {width > 0 && (
          <Svg width={width} height={HEIGHT}>
            <Defs>
              <LinearGradient id={`shade${id}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color.brand} stopOpacity={0.24} />
                <Stop offset="1" stopColor={color.brand} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {grid.map((line, index) => (
              <Line
                key={line.at}
                x1={0}
                x2={width - GUTTER + space[2]}
                y1={line.at}
                y2={line.at}
                stroke={color.separator}
                strokeWidth={1}
                // The foot solid, the lines above it dashed and quieter.
                strokeDasharray={index === grid.length - 1 ? undefined : '3 5'}
              />
            ))}
            {points.length > 1 && (
              <Path
                d={`M ${x(0)} ${HEIGHT - PAD} ${values.map((value, index) => `L ${x(index)} ${y(value)}`).join(' ')} L ${x(values.length - 1)} ${HEIGHT - PAD} Z`}
                fill={`url(#shade${id})`}
              />
            )}
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
            {values.length > 0 && <Circle cx={x(values.length - 1)} cy={y(values[values.length - 1]!)} r={11} fill={alpha(color.brand, 0.16)} />}
            {values.map((value, index) =>
              index === values.length - 1 ? (
                <Circle key={index} cx={x(index)} cy={y(value)} r={5.5} fill={color.brand} stroke={color.plateSolid} strokeWidth={2.5} />
              ) : (
                <Circle key={index} cx={x(index)} cy={y(value)} r={3.5} fill={color.plateSolid} stroke={color.brand} strokeWidth={2} />
              ),
            )}
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
