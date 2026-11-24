/**
 * A collectable card's shape, for showing what cards look like (the welcome
 * tour, the sign-up page): its rarity's metal or gem as a gradient, a
 * dumbbell where a gym's picture goes, bars where its name and suburb go,
 * and the rarity's name. No gym in particular, so no words for one.
 * `children` draw over it (the tour's sweep of light).
 */

import { useId, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Icon } from './Icon';
import { Txt } from './ui';
import { face, radius, space } from '@/lib/theme';

/** Common's steel, Rare's sapphire and Legendary's gold, light to deep (as the collection draws them). */
export const SAMPLE_CARDS: Array<{ label: string; colors: [string, string, string] }> = [
  { label: 'Common', colors: ['#D5DAE0', '#8E959E', '#5B626B'] },
  { label: 'Legendary', colors: ['#FFE08A', '#F0B323', '#9A5B07'] },
  { label: 'Rare', colors: ['#8EC5FF', '#2563EB', '#1E2A8A'] },
];

export function SampleCard({ width, height, label, colors, children }: { width: number; height: number; label: string; colors: [string, string, string]; children?: ReactNode }) {
  const id = `sample${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={[styles.card, { width, height }]} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors[0]} />
            <Stop offset="0.55" stopColor={colors[1]} />
            <Stop offset="1" stopColor={colors[2]} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
      <View style={styles.face}>
        <View style={styles.window}>
          <Icon name="gym" size={width * 0.24} color="rgba(255, 255, 255, 0.95)" />
        </View>
        <View style={[styles.bar, { width: '72%' }]} />
        <View style={[styles.bar, styles.barSoft, { width: '48%' }]} />
        <View style={styles.flex} />
        <Txt variant="caption" color="#FFFFFF" style={[face('bold'), styles.label]}>
          {label.toUpperCase()}
        </Txt>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden' },
  face: { flex: 1, padding: space[3], gap: 6 },
  window: { height: '46%', borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.18)', marginBottom: 4 },
  bar: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255, 255, 255, 0.85)' },
  barSoft: { backgroundColor: 'rgba(255, 255, 255, 0.5)' },
  flex: { flex: 1 },
  label: { letterSpacing: 1.2 },
});
