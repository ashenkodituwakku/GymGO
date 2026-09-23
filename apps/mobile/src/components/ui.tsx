/**
 * Small building blocks shared by every screen.
 */

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import type { ResultTier } from '@gymgo/domain';
import { TIER } from '@/lib/copy';
import { haptic } from '@/lib/haptics';
import { HIT, color, face, radius, shadow, space, type } from '@/lib/theme';
import { Glass } from './Glass';
import { Icon, type IconName } from './Icon';

// --- Text -------------------------------------------------------------------

type Variant = keyof typeof type;

export function Txt({
  variant = 'body',
  color: tint = color.label,
  style,
  children,
  numberOfLines,
}: {
  variant?: Variant;
  color?: string;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  numberOfLines?: number;
}) {
  return (
    <Text style={[type[variant] as TextStyle, { color: tint }, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

// --- Evidence tiers ---------------------------------------------------------

export const TIER_COLOUR: Record<ResultTier, { fill: string; ink: string; tint: string; icon: IconName }> = {
  confirmed: { fill: color.good, ink: color.goodInk, tint: color.goodTint, icon: 'good' },
  needs_confirmation: { fill: color.maybe, ink: color.maybeInk, tint: color.maybeTint, icon: 'maybe' },
  ruled_out: { fill: color.no, ink: color.noInk, tint: color.noTint, icon: 'no' },
};

export function TierPill({ tier }: { tier: ResultTier }) {
  const tone = TIER_COLOUR[tier];
  return (
    <View style={[styles.pill, { backgroundColor: tone.tint }]}>
      <Icon name={tone.icon} size={13} color={tone.fill} />
      <Txt variant="caption" color={tone.ink} style={styles.pillText}>
        {TIER[tier].label}
      </Txt>
    </View>
  );
}

// --- Chips ------------------------------------------------------------------

export function Chip({
  label,
  selected,
  onPress,
  icon,
  accessibilityLabel,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconName;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onPress();
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && { transform: [{ scale: 0.96 }] },
      ]}
    >
      {icon && <Icon name={icon} size={14} color={selected ? color.onBrand : color.label} />}
      <Txt variant="subhead" color={selected ? color.onBrand : color.label} style={styles.chipText}>
        {label}
      </Txt>
    </Pressable>
  );
}

// --- Cards and sections ----------------------------------------------------

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children, trailing }: { children: ReactNode; trailing?: ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <Txt variant="title2">{children}</Txt>
      {trailing}
    </View>
  );
}

export function Divider({ inset = 0 }: { inset?: number }) {
  return <View style={[styles.divider, { marginLeft: inset }]} />;
}

// --- Buttons ----------------------------------------------------------------

/** A round floating control over the map. */
export function RoundButton({
  icon,
  onPress,
  accessibilityLabel,
  tint = color.brand,
  children,
}: {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  tint?: string;
  children?: ReactNode;
}) {
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.round, pressed && { transform: [{ scale: 0.92 }] }]}
    >
      <Glass style={styles.roundGlass}>
        <Icon name={icon} size={18} color={tint} />
        {children}
      </Glass>
    </Pressable>
  );
}

/**
 * The Maps action button: icon over a short label, equal widths in a row.
 * `primary` is the filled brand button; the rest are tinted.
 */
export function ActionButton({
  icon,
  label,
  onPress,
  primary = false,
  accessibilityLabel,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  primary?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.action,
        primary ? styles.actionPrimary : styles.actionTinted,
        pressed && { transform: [{ scale: 0.95 }], opacity: 0.9 },
      ]}
    >
      <Icon name={icon} size={19} color={primary ? color.onBrand : color.brand} />
      <Txt variant="caption" color={primary ? color.onBrand : color.brand} style={styles.actionLabel}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="button"
      style={({ pressed }) => [styles.primary, pressed && { backgroundColor: color.brandPressed }]}
    >
      <Txt variant="headline" color={color.onBrand}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    height: 24,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  pillText: face('bold'),

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: color.fill,
  },
  chipSelected: { backgroundColor: color.brand },
  chipText: face('medium'),

  card: {
    backgroundColor: color.card,
    borderRadius: radius.lg,
    padding: space[4],
    ...shadow.card,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: space[6],
    marginBottom: space[2],
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: color.separator },

  round: {
    width: HIT,
    height: HIT,
    borderRadius: HIT / 2,
    ...shadow.float,
  },
  roundGlass: {
    flex: 1,
    borderRadius: HIT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.glassBorder,
  },

  action: {
    flex: 1,
    height: 58,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  actionPrimary: { backgroundColor: color.brand },
  actionTinted: { backgroundColor: color.brandTint },
  actionLabel: face('medium'),

  primary: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: color.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
