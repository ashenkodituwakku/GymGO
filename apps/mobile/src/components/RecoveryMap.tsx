/**
 * On Progress: the recovery map (lib/recovery.ts). The body, front and
 * back, each muscle in a heat colour for how long since you last trained it
 * as a main muscle, from your log (hottest for today); the same as a list underneath, so nothing rests on
 * colour alone. It shows what you've trained, not whether a muscle is
 * recovered: GymGO can't know that.
 */

import { useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { mix } from '@/lib/looks';
import { BANDS, recoveryMap, restLine, type RestBand } from '@/lib/recovery';
import { color, radius, shadow, space, themed } from '@/lib/theme';
import type { TrainingSession } from '@/lib/training';
import { MUSCLES, type Muscle } from '@/lib/workout';
import { BodyFigure } from './body/BodyFigure';
import { Pressable } from './motion';
import { Txt } from './ui';

const isMuscle = (slug: string): slug is Muscle => MUSCLES.some((muscle) => muscle.id === slug);

/**
 * A heat scale, hottest for today: deep red, then orange, then amber, then
 * a faint warmth for four days or more; muscles never logged stay the
 * body's own grey. Warm colours only: green would read as "ready", which
 * GymGO can't know (the list below says it in words, so nothing rests on
 * colour alone).
 */
export const HEAT = { today: '#E5484D', yesterday: '#F76B15', days: '#F5A524' } as const;
const shade = (band: RestBand) => {
  switch (band) {
    case 'today':
      return HEAT.today;
    case 'yesterday':
      return HEAT.yesterday;
    case 'days':
      return HEAT.days;
    case 'longer':
      return mix(color.bodyIdle, HEAT.days, 0.38);
    case 'never':
      return color.bodyIdle;
  }
};

export function RecoveryMap({ sessions, maxWidth }: { sessions: TrainingSession[]; maxWidth?: number }) {
  const window = useWindowDimensions();
  const map = useMemo(() => recoveryMap(sessions), [sessions]);
  const byMuscle = useMemo(() => new Map(map.map((rest) => [rest.muscle, rest])), [map]);
  const [picked, setPicked] = useState<Muscle | null>(null);
  const room = Math.min(maxWidth ?? window.width, 560) - space[4] * 4;
  const figureWidth = Math.max(110, Math.min(200, room / 2));
  const pickedRest = picked ? byMuscle.get(picked) : null;
  return (
    <View style={styles.card}>
      <View>
        <Txt variant="headline">Recovery map</Txt>
        <Txt variant="footnote" color={color.labelSecondary}>
          How long since you last trained each muscle, from your log
        </Txt>
      </View>
      <View style={styles.figures}>
        {(['front', 'back'] as const).map((side) => (
          <BodyFigure
            key={side}
            gender="male"
            side={side}
            width={figureWidth}
            height={figureWidth * 2}
            fillFor={(slug) => (isMuscle(slug) ? shade(byMuscle.get(slug)?.band ?? 'never') : color.bodyInert)}
            pickable={isMuscle}
            selected={(slug) => slug === picked}
            labelFor={(slug) => {
              const rest = isMuscle(slug) ? byMuscle.get(slug) : undefined;
              return rest ? restLine(rest) : slug;
            }}
            onPress={(slug) => setPicked(isMuscle(slug) && slug !== picked ? slug : null)}
          />
        ))}
      </View>
      {pickedRest && (
        <Txt variant="subhead" style={styles.center} aria-live="polite">
          {restLine(pickedRest)}
        </Txt>
      )}
      <View style={styles.legend} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
        {BANDS.map((band) => (
          <View key={band.id} style={styles.key}>
            <View style={[styles.swatch, { backgroundColor: shade(band.id) }]} />
            <Txt variant="caption" color={color.labelSecondary}>
              {band.label}
            </Txt>
          </View>
        ))}
      </View>
      <View style={styles.list}>
        {map
          .filter((rest) => rest.days !== null)
          .map((rest) => (
            <Pressable key={rest.muscle} onPress={() => setPicked(rest.muscle === picked ? null : rest.muscle)} accessibilityRole="button" accessibilityLabel={restLine(rest)} style={[styles.chip, rest.muscle === picked && styles.chipOn]}>
              <View style={[styles.dot, { backgroundColor: shade(rest.band) }]} />
              <Txt variant="footnote">{restLine(rest)}</Txt>
            </Pressable>
          ))}
      </View>
      <Txt variant="caption" color={color.labelSecondary}>
        Counted for the muscles an exercise mainly works. It shows what you’ve trained, not whether a muscle has recovered: only you can tell that.
      </Txt>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    card: { backgroundColor: color.plate, borderRadius: radius.lg, borderCurve: 'continuous', padding: space[4], gap: space[3], ...shadow.plate },
    figures: { flexDirection: 'row', justifyContent: 'center', gap: space[2] },
    center: { textAlign: 'center' },
    legend: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3], justifyContent: 'center' },
    key: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    swatch: { width: 14, height: 14, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: color.separator },
    list: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space[3], paddingVertical: 6, borderRadius: radius.pill, backgroundColor: color.fill },
    chipOn: { backgroundColor: color.brandTint },
    dot: { width: 10, height: 10, borderRadius: 5 },
  }),
);
