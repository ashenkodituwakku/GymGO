/**
 * Small building blocks shared by every screen.
 */

import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
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
  accessibilityRole,
}: {
  variant?: Variant;
  color?: string;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  numberOfLines?: number;
  accessibilityRole?: 'header';
}) {
  return (
    <Text
      style={[type[variant] as TextStyle, { color: tint }, style]}
      numberOfLines={numberOfLines}
      accessibilityRole={accessibilityRole}
    >
      {children}
    </Text>
  );
}

// --- Evidence tiers ---------------------------------------------------------

export const TIER_COLOUR: Record<ResultTier, { fill: string; ink: string; tint: string; icon: IconName }> = {
  confirmed: { fill: color.good, ink: color.goodInk, tint: color.goodTint, icon: 'good' },
  needs_confirmation: { fill: color.maybe, ink: color.maybeInk, tint: color.maybeTint, icon: 'call' },
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

/** A small one-of-several choice ("Walked in", "Last week"), for the members' report forms. */
export function ChoiceChip({ label, selected, onPress, icon }: { label: string; selected: boolean; onPress: () => void; icon?: IconName }) {
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => [styles.choiceChip, selected && styles.choiceChipOn, pressed && { opacity: 0.7 }]}
    >
      {icon && <Icon name={icon} size={13} color={selected ? color.onBrand : color.label} />}
      <Txt variant="footnote" color={selected ? color.onBrand : color.label} style={face('medium')}>
        {label}
      </Txt>
    </Pressable>
  );
}

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

/**
 * A section that starts folded: an emoji, a title and a one-line summary.
 * Tap to open. Keeps a gym's card short until you want the detail.
 */
export function Fold({
  emoji,
  icon,
  title,
  summary,
  initiallyOpen = false,
  children,
}: {
  emoji?: string;
  /** A symbol in a tinted circle; preferred over an emoji. */
  icon?: IconName;
  title: string;
  summary?: string;
  initiallyOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View style={styles.fold}>
      <Pressable
        onPress={() => {
          haptic.select();
          setOpen(!open);
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${title}${summary ? `, ${summary}` : ''}`}
        style={({ pressed }) => [styles.foldHead, pressed && { opacity: 0.7 }]}
      >
        {icon ? (
          <View style={styles.foldIcon}>
            <Icon name={icon} size={17} color={color.brand} />
          </View>
        ) : (
          <Txt variant="title2" style={styles.foldEmoji}>
            {emoji}
          </Txt>
        )}
        <View style={styles.foldText}>
          <Txt variant="headline">{title}</Txt>
          {summary ? (
            <Txt variant="footnote" color={color.labelSecondary} numberOfLines={1}>
              {summary}
            </Txt>
          ) : null}
        </View>
        <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
          <Icon name="chevron" size={14} color={color.labelTertiary} />
        </View>
      </Pressable>
      {open && <View style={styles.foldBody}>{children}</View>}
    </View>
  );
}

/** An iOS segmented control: a grey track with the chosen segment raised. */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented} accessibilityRole="tablist">
      {options.map((option) => {
        const on = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => {
              if (on) return;
              haptic.select();
              onChange(option.value);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[styles.segment, on && styles.segmentOn]}
          >
            <Txt variant="footnote" color={color.label} style={on ? face('bold') : face('medium')} numberOfLines={1}>
              {option.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export interface CapsuleButton {
  icon: IconName;
  accessibilityLabel: string;
  onPress: () => void;
}

/**
 * The map's floating controls, stacked in one glass capsule with hairlines
 * between them, as Maps stacks its own. Real Liquid Glass on iOS 26, which
 * flexes under a finger.
 */
export function ControlCapsule({ buttons }: { buttons: CapsuleButton[] }) {
  return (
    <View style={styles.capsuleShadow}>
      <Glass style={styles.capsule} interactive>
        {buttons.map((button, index) => (
          <View key={button.accessibilityLabel}>
            {index > 0 && <View style={styles.capsuleDivider} />}
            <Pressable
              onPress={() => {
                haptic.tap();
                button.onPress();
              }}
              accessibilityRole="button"
              accessibilityLabel={button.accessibilityLabel}
              style={({ pressed }) => [styles.capsuleButton, pressed && styles.capsulePressed]}
            >
              <Icon name={button.icon} size={18} color={color.brand} />
            </Pressable>
          </View>
        ))}
      </Glass>
    </View>
  );
}

/** The round glass close button that sits in a sheet's corner. */
export function CloseButton({ onPress }: { onPress: () => void }) {
  return (
    <Glass style={styles.close} interactive>
      <Pressable
        onPress={() => {
          haptic.tap();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel="Close"
        hitSlop={10}
        style={styles.closeHit}
      >
        <Icon name="close" size={13} color={color.labelSecondary} weight="bold" />
      </Pressable>
    </Glass>
  );
}

/** A round glass toggle beside the close button: compare this gym, say. */
export function RoundToggle({ icon, on, label, onPress }: { icon: IconName; on: boolean; label: string; onPress: () => void }) {
  return (
    <Glass style={styles.close} tint={on ? color.brand : undefined} interactive>
      <Pressable
        onPress={() => {
          haptic.select();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: on }}
        hitSlop={10}
        style={styles.closeHit}
      >
        <Icon name={icon} size={14} color={on ? color.onBrand : color.brand} />
      </Pressable>
    </Glass>
  );
}

/**
 * The Maps action button: icon over a short label, equal widths in a row, in
 * glass. `primary` is tinted glass in the brand colour, the way iOS 26 marks
 * the one action that matters most.
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
  const ink = primary ? color.onBrand : color.brand;
  return (
    <Glass style={styles.action} tint={primary ? color.brand : undefined} interactive>
      <Pressable
        onPress={() => {
          haptic.tap();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        style={({ pressed }) => [styles.actionHit, pressed && { opacity: 0.6 }]}
      >
        <Icon name={icon} size={19} color={ink} />
        <Txt variant="caption" color={ink} style={styles.actionLabel}>
          {label}
        </Txt>
      </Pressable>
    </Glass>
  );
}

/**
 * A labelled text field. Inside a bottom sheet it must be the sheet's own
 * input, so the sheet can move out of the keyboard's way; in the desktop
 * panels it's a plain one.
 */
export function TextField({
  label,
  inSheet,
  ...props
}: TextInputProps & { label: string; inSheet: boolean }) {
  // The sheet-aware input keeps the keyboard and sheet in step on phones. In
  // a browser it calls a phone-only API and throws, so use a plain input there.
  const Input = inSheet && Platform.OS !== 'web' ? BottomSheetTextInput : TextInput;
  return (
    <View style={styles.field}>
      <Txt variant="footnote" color={color.labelSecondary} style={styles.fieldLabel}>
        {label}
      </Txt>
      <Input
        placeholderTextColor={color.labelTertiary}
        accessibilityLabel={label}
        {...props}
        style={[styles.fieldInput, props.style]}
      />
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  tone = 'brand',
  icon,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'brand' | 'quiet' | 'danger';
}) {
  const fill = tone === 'brand' ? color.brand : tone === 'danger' ? color.dangerTint : color.fill;
  const ink = tone === 'brand' ? color.onBrand : tone === 'danger' ? color.dangerInk : color.brand;
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.primary, { backgroundColor: fill }, pressed && { opacity: 0.8 }, disabled && { opacity: 0.45 }]}
    >
      {icon ? <Icon name={icon} size={17} color={ink} /> : null}
      <Txt variant="headline" color={ink}>
        {label}
      </Txt>
    </Pressable>
  );
}


const styles = StyleSheet.create({
  choiceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: space[3],
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: color.fill,
  },
  choiceChipOn: { backgroundColor: color.brand },
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

  capsuleShadow: { borderRadius: 22, ...shadow.float },
  capsule: { width: HIT, borderRadius: HIT / 2, overflow: 'hidden' },
  capsuleButton: { width: HIT, height: HIT, alignItems: 'center', justifyContent: 'center' },
  capsulePressed: { backgroundColor: 'rgba(0, 0, 0, 0.06)' },
  capsuleDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 10, backgroundColor: color.separator },

  close: { width: 30, height: 30, borderRadius: 15, marginTop: 2 },
  closeHit: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  action: { flex: 1, height: 58, borderRadius: radius.lg },
  actionHit: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  actionLabel: face('medium'),

  primary: {
    height: 52,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  fold: {
    borderRadius: radius.lg + 4,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    overflow: 'hidden',
  },
  foldHead: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3] },
  foldEmoji: { width: 30, textAlign: 'center' },
  foldIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: color.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foldText: { flex: 1, gap: 1 },
  foldBody: { paddingHorizontal: space[4], paddingBottom: space[4], gap: space[3] },

  segmented: { flexDirection: 'row', padding: 2, borderRadius: 9, backgroundColor: 'rgba(118, 118, 128, 0.12)' },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 7, paddingHorizontal: 6, borderRadius: 7 },
  segmentOn: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  field: { gap: 6 },
  fieldLabel: face('medium'),
  fieldInput: {
    height: 48,
    paddingHorizontal: space[4],
    borderRadius: radius.md,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.separator,
    fontSize: 17,
    color: color.label,
    ...face('regular'),
    ...(Platform.OS === 'web' ? { outlineWidth: 0 } : null),
  },
});
