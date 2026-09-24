/**
 * The iOS building blocks the Home, Saved and Profile tabs are made of: a
 * large-title screen, inset grouped sections, and Settings-style rows with a
 * coloured icon tile, a value and a chevron.
 */

import type { ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptic } from '@/lib/haptics';
import { useBottomClearance } from '@/lib/layout';
import { color, radius, space } from '@/lib/theme';
import { Icon, type IconName } from './Icon';
import { Txt } from './ui';


/**
 * A tab's screen: its own safe area (so the tab bar counts), a scrolling
 * page on the grouped background, and a large title at the top.
 */
export function TabScreen(props: {
  title: string;
  eyebrow?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <SafeAreaProvider>
      <TabScreenInner {...props} />
    </SafeAreaProvider>
  );
}

function TabScreenInner({ title, eyebrow, right, children }: { title: string; eyebrow?: string; right?: ReactNode; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const clearance = useBottomClearance();
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + (Platform.OS === 'web' ? space[6] : space[3]), paddingBottom: clearance + space[8] },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.titleRow}>
        <View style={styles.flex}>
          {eyebrow ? (
            <Txt variant="eyebrow" color={color.labelSecondary}>
              {eyebrow}
            </Txt>
          ) : null}
          <Txt variant="largeTitle" accessibilityRole="header">
            {title}
          </Txt>
        </View>
        {right}
      </View>
      {children}
    </ScrollView>
  );
}

/** A section heading with an optional action on the right ("See all"). */
export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Txt variant="title2" style={styles.flex}>
        {title}
      </Txt>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <Txt variant="body" color={color.brand}>
            {action}
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

/** An inset grouped list section, as in Settings. */
export function Group({ header, footer, children }: { header?: string; footer?: string; children: ReactNode }) {
  const rows = (Array.isArray(children) ? children : [children]).filter(Boolean);
  return (
    <View style={styles.group}>
      {header ? (
        <Txt variant="footnote" color={color.labelSecondary} style={styles.groupHeader}>
          {header.toUpperCase()}
        </Txt>
      ) : null}
      <View style={styles.groupBody}>
        {rows.map((row, index) => (
          <View key={index}>
            {index > 0 && <View style={styles.separator} />}
            {row}
          </View>
        ))}
      </View>
      {footer ? (
        <Txt variant="footnote" color={color.labelSecondary} style={styles.groupFooter}>
          {footer}
        </Txt>
      ) : null}
    </View>
  );
}

/** Settings-style icon tile colours. */
export const TILE = {
  indigo: color.brand,
  green: '#34C759',
  orange: '#FF9500',
  red: '#FF3B30',
  blue: '#007AFF',
  teal: '#30B0C7',
  grey: '#8E8E93',
  pink: '#FF2D55',
} as const;

export function Row({
  icon,
  emoji,
  tile = TILE.indigo,
  title,
  subtitle,
  value,
  onPress,
  chevron = Boolean(onPress),
  destructive = false,
  toggle,
}: {
  icon?: IconName;
  emoji?: string;
  tile?: string;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  /** A switch on the right instead of a value. */
  toggle?: { value: boolean; onChange: (value: boolean) => void };
}) {
  const body = (
    <View style={styles.row}>
      {icon ? (
        <View style={[styles.tile, { backgroundColor: tile }]}>
          <Icon name={icon} size={16} color="#FFFFFF" />
        </View>
      ) : emoji ? (
        <View style={[styles.tile, styles.emojiTile]}>
          <Txt style={styles.emoji}>{emoji}</Txt>
        </View>
      ) : null}
      <View style={styles.rowText}>
        <Txt variant="body" color={destructive ? color.dangerInk : color.label} numberOfLines={1}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt variant="footnote" color={color.labelSecondary} numberOfLines={2}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {value ? (
        <Txt variant="body" color={color.labelSecondary} numberOfLines={1} style={styles.value}>
          {value}
        </Txt>
      ) : null}
      {toggle ? (
        <Switch
          value={toggle.value}
          onValueChange={(next) => {
            haptic.select();
            toggle.onChange(next);
          }}
          trackColor={{ true: '#34C759', false: undefined }}
          accessibilityLabel={title}
        />
      ) : null}
      {chevron ? <Icon name="chevron" size={13} color={color.labelTertiary} /> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="button"
      style={({ pressed }) => pressed && { backgroundColor: color.fill }}
    >
      {body}
    </Pressable>
  );
}

/** A search field that is really a button: it takes you to the search. */
export function SearchButton({ placeholder, onPress }: { placeholder: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="search"
      accessibilityLabel={placeholder}
      style={({ pressed }) => [styles.search, pressed && { opacity: 0.75 }]}
    >
      <Icon name="search" size={17} color={color.labelSecondary} />
      <Txt variant="body" color={color.labelTertiary} style={styles.flex}>
        {placeholder}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: color.groupedBackground },
  content: { paddingHorizontal: space[4], gap: space[5], width: '100%', maxWidth: 760, alignSelf: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space[3] },

  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', gap: space[2], marginBottom: -space[2] },

  group: { gap: 6 },
  groupHeader: { paddingHorizontal: space[4], letterSpacing: 0.3 },
  groupFooter: { paddingHorizontal: space[4] },
  groupBody: { backgroundColor: color.background, borderRadius: 12, borderCurve: 'continuous', overflow: 'hidden' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: color.separator, marginLeft: 16 + 29 + 12 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 50, paddingVertical: 8 },
  tile: { width: 29, height: 29, borderRadius: 7, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  emojiTile: { backgroundColor: color.fill },
  emoji: { fontSize: 17, lineHeight: 22 },
  rowText: { flex: 1, gap: 1 },
  value: { maxWidth: '45%' },

  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    height: 44,
    paddingHorizontal: space[3],
    borderRadius: radius.pill,
    backgroundColor: 'rgba(118, 118, 128, 0.12)',
  },
});
