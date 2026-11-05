/**
 * The head of a plan (one just built, or one saved): a card of the accent
 * with its name, how many exercises and sets, roughly how long it takes, and
 * a strip of its exercises' icons.
 */

import { StyleSheet, View } from 'react-native';
import { color, radius, space, themed } from '@/lib/theme';
import { planMinutes, planSets, type PlanLine } from '@/lib/workoutStats';
import { BrandFill, Sheen, accentGlow } from './BrandFill';
import { ExerciseGlyph } from './ExerciseGlyph';
import { Txt } from './ui';

export function PlanSummary({
  eyebrow,
  title,
  detail,
  items,
  level = 2,
}: {
  eyebrow: string;
  title: string;
  /** Its title's heading level: 2 under a page's own title, 1 when it is the page's title (a saved workout). */
  level?: 1 | 2;
  detail?: string | null;
  items: Array<PlanLine & { exerciseId: string }>;
}) {
  const minutes = planMinutes(items);
  const sets = planSets(items);
  const stats = [
    { value: String(items.length), label: items.length === 1 ? 'exercise' : 'exercises', spoken: `${items.length} ${items.length === 1 ? 'exercise' : 'exercises'}` },
    { value: String(sets), label: sets === 1 ? 'set' : 'sets', spoken: `${sets} ${sets === 1 ? 'set' : 'sets'}` },
    { value: `~${minutes}`, label: 'min', spoken: `about ${minutes} minutes` },
  ];
  return (
    <View style={[styles.hero, accentGlow(color.brandFill)]}>
      <BrandFill round={radius.xl} />
      <Sheen round={radius.xl} />
      <Txt variant="eyebrow" color={color.onBrandSoft}>
        {eyebrow}
      </Txt>
      <Txt variant="title2" color={color.onBrand} numberOfLines={2} accessibilityRole="header" level={level}>
        {title}
      </Txt>
      {detail ? (
        <Txt variant="footnote" color={color.onBrandSoft} numberOfLines={2}>
          {detail}
        </Txt>
      ) : null}
      <View style={styles.stats} accessible accessibilityLabel={stats.map((stat) => stat.spoken).join(', ')}>
        {stats.map((stat, at) => (
          <View key={stat.label} style={[styles.stat, at > 0 && styles.statLine]}>
            <Txt variant="figure" color={color.onBrand}>
              {stat.value}
            </Txt>
            <Txt variant="caption" color={color.onBrandSoft}>
              {stat.label}
            </Txt>
          </View>
        ))}
      </View>
      {items.length > 0 && (
        <View style={styles.strip} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
          {items.map((item, at) => (
            <View key={`${item.exerciseId}-${at}`} style={styles.mini}>
              <ExerciseGlyph exerciseId={item.exerciseId} size={34} ink={color.onBrand} accent={color.onBrand} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    hero: {
      gap: space[1],
      padding: space[4],
      paddingTop: space[4] + 2,
      borderRadius: radius.xl,
      borderCurve: 'continuous',
      backgroundColor: color.brandFill,
    },
    stats: { flexDirection: 'row', marginTop: space[3] },
    stat: { flex: 1, gap: 0 },
    statLine: { paddingLeft: space[3], borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: color.onBrandFaint },
    strip: { flexDirection: 'row', flexWrap: 'wrap', gap: space[1] + 2, marginTop: space[3] },
    mini: { width: 40, height: 40, borderRadius: Math.min(12, radius.sm + 2), borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: color.onBrandFaint },
  }),
);
