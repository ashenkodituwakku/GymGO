/**
 * The iOS building blocks the Home, Saved and Profile tabs are made of: a
 * large-title screen, inset grouped sections, and Settings-style rows with a
 * coloured icon tile, a value and a chevron.
 */

import { useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Switch, View } from 'react-native';
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptic } from '@/lib/haptics';
import { useBottomClearance } from '@/lib/layout';
import { color, radius, space, themed } from '@/lib/theme';
import { Glass } from './Glass';
import { Icon, type IconName } from './Icon';
import { PIcon, type PhosphorName } from './PIcon';
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

/** How tall the compact bar is, below the status bar. */
const BAR = 44;

function TabScreenInner({ title, eyebrow, right, children }: { title: string; eyebrow?: string; right?: ReactNode; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const clearance = useBottomClearance();
  const top = insets.top + (Platform.OS === 'web' ? space[6] : space[3]);
  // Where the large title ends: once it has scrolled under the bar, the
  // compact title fades in on a strip of glass, as in iOS.
  const [titleBottom, setTitleBottom] = useState(96);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const barStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [titleBottom - insets.top - BAR - 8, titleBottom - insets.top - BAR + 12], [0, 1], 'clamp'),
  }));
  return (
    <View style={styles.flex}>
      <Animated.ScrollView
        style={styles.screen}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.content, { paddingTop: top, paddingBottom: clearance + space[8] }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.titleRow} onLayout={(event) => setTitleBottom(event.nativeEvent.layout.y + event.nativeEvent.layout.height)}>
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
      </Animated.ScrollView>
      <Animated.View pointerEvents="none" style={[styles.bar, { height: insets.top + BAR }, barStyle]}>
        <Glass kind="bar" style={StyleSheet.absoluteFill} />
        {/* The large title is the heading; this is the same words, for the eye only. */}
        <View
          style={[styles.barTitle, { paddingTop: insets.top }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          aria-hidden
        >
          <Txt variant="headline" numberOfLines={1}>
            {title}
          </Txt>
        </View>
      </Animated.View>
    </View>
  );
}

/** A section heading with an optional action on the right ("See all"). */
export function SectionHeader({
  title,
  action,
  onAction,
  icon,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  /** A two-tone Phosphor icon before the title. */
  icon?: PhosphorName;
}) {
  return (
    <View style={styles.sectionHeader}>
      {icon ? <PIcon name={icon} size={26} color={color.brand} accent={color.brand} /> : null}
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
export const TILE = themed(() => ({
  indigo: color.brandFill,
  green: '#34C759',
  orange: '#FF9500',
  red: '#FF3B30',
  blue: '#007AFF',
  teal: '#30B0C7',
  grey: '#8E8E93',
  pink: '#FF2D55',
}));

export function Row({
  icon,
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
          <Icon name={icon} size={16} color={color.onBrand} />
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
      <Txt variant="body" color={color.labelSecondary} style={styles.flex}>
        {placeholder}
      </Txt>
    </Pressable>
  );
}

const styles = themed(() => StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: color.groupedBackground },
  content: { paddingHorizontal: space[4], gap: space[5], width: '100%', maxWidth: 760, alignSelf: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space[3] },
  bar: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  barTitle: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[8] + space[6] },

  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', gap: space[2], marginBottom: -space[2] },

  group: { gap: 6 },
  groupHeader: { paddingHorizontal: space[4], letterSpacing: 0.3 },
  groupFooter: { paddingHorizontal: space[4] },
  groupBody: { backgroundColor: color.card, borderRadius: 12, borderCurve: 'continuous', overflow: 'hidden' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: color.separator, marginLeft: 16 + 29 + 12 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 50, paddingVertical: 8 },
  tile: { width: 29, height: 29, borderRadius: 7, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 1 },
  value: { maxWidth: '45%' },

  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    height: 44,
    paddingHorizontal: space[3],
    borderRadius: radius.pill,
    backgroundColor: color.fill,
  },
}));
