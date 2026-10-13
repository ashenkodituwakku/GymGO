/**
 * The iOS building blocks the Home, Saved and Profile tabs are made of: a
 * large-title screen, inset grouped sections, and Settings-style rows with a
 * coloured icon tile, a value and a chevron.
 */

import { useId, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Pressable } from './motion';
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptic } from '@/lib/haptics';
import { useBottomClearance, useOverhang } from '@/lib/layout';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { LOOKS, PAGE_COLUMN, ambientGlow, backgroundImage, color, currentLook, currentTheme, face, heroGlowStops, radius, shadow, space, themed } from '@/lib/theme';
import { Glass } from './Glass';
import { Icon, type IconName } from './Icon';
import { PIcon, type PhosphorName } from './PIcon';
import { Toggle } from './Toggle';
import { Txt } from './ui';


/**
 * A tab's screen: its own safe area (so the tab bar counts), a scrolling
 * page on the grouped background, and a large title at the top.
 */
export function TabScreen(props: {
  title: string;
  eyebrow?: string;
  right?: ReactNode;
  /** A soft glow of the accent behind the title (Home), fading as the page scrolls. */
  glow?: boolean;
  /** Room between the page's blocks, when they're groups of their own (Home). */
  gap?: number;
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

function TabScreenInner({
  title,
  eyebrow,
  right,
  glow = false,
  gap,
  children,
}: {
  title: string;
  eyebrow?: string;
  right?: ReactNode;
  glow?: boolean;
  gap?: number;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const clearance = useBottomClearance();
  // Past the tab bar, plus any of the tab the phone has laid out below the screen.
  const { measureRef, onLayout, overhang } = useOverhang();
  const bottom = clearance + overhang;
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
  // Only the glass look glows (ambientGlow is null in the others, which have
  // grounds of their own: pixels, bevels, tones). Behind every tab, a glow
  // that stays put, as strong as your Liquid Glass level; behind the title
  // (Home, Profile), a brighter one that fades as the page scrolls.
  const ambient = ambientGlow();
  const glowing = glow && ambient !== null;
  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 280], [1, 0], 'clamp'),
    transform: [{ translateY: interpolate(scrollY.value, [0, 280], [0, -70], 'clamp') }],
  }));
  return (
    <View ref={measureRef} onLayout={onLayout} style={[styles.flex, ambient && styles.ground, ambient]}>
      {glowing && (
        <Animated.View style={[styles.glow, { height: insets.top + 440 }, glowStyle, { pointerEvents: 'none' }]} aria-hidden>
          <HeroGlow />
        </Animated.View>
      )}
      <Animated.ScrollView
        style={[styles.screen, ambient && styles.clear]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        // The page scrolls under the floating tab bar, so it makes its own room
        // for it rather than letting iOS guess at insets.
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[styles.content, gap !== undefined && { gap }, { paddingTop: top, paddingBottom: bottom + space[8] }]}
        // The scroll bar stops above the tab bar too.
        scrollIndicatorInsets={{ bottom }}
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
      <Animated.View style={[styles.bar, { height: insets.top + BAR }, barStyle, { pointerEvents: 'none' }]}>
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

/**
 * Two soft pools of the accent, one at the top right and a fainter one at
 * the left, fading to nothing well inside their box so no edge ever shows.
 * Stronger in dark, where a faint one would be lost, and the glassier your
 * Liquid Glass level.
 */
function HeroGlow() {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  // Its strengths live in the theme, which keeps the cards over it readable (glowPeak).
  const { scheme, glass } = currentTheme();
  const stops = heroGlowStops(glass, scheme);
  return (
    <Svg width="100%" height="100%">
      <Defs>
        <RadialGradient id={`gm${id}`} cx="82%" cy="6%" r="62%">
          <Stop offset="0" stopColor={color.brand} stopOpacity={stops.main} />
          <Stop offset="0.55" stopColor={color.brand} stopOpacity={stops.mainMid} />
          <Stop offset="1" stopColor={color.brand} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={`gs${id}`} cx="8%" cy="30%" r="48%">
          <Stop offset="0" stopColor={color.brand} stopOpacity={stops.side} />
          <Stop offset="1" stopColor={color.brand} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#gm${id})`} />
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#gs${id})`} />
    </Svg>
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
      {/* The words line up on their baselines; an icon has none, so it's centred on the heading instead of sitting high. */}
      {icon ? (
        <View style={styles.sectionIcon}>
          <PIcon name={icon} size={26} color={color.brand} accent={color.brand} />
        </View>
      ) : null}
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

/**
 * A settings row's icon on its coloured tile. In the glass look the tile is
 * lit from the top and rimmed, like the iPhone's own; the solid looks keep
 * it flat. `children` in place of the icon: a brand's own mark.
 */
export function SettingsTile({ icon, tile, children }: { icon?: IconName; tile: string; children?: ReactNode }) {
  const lit = currentLook() === LOOKS.standard;
  // A white tile (Google's) on a white card needs an edge to be a tile at all.
  const white = tile.toUpperCase() === '#FFFFFF';
  return (
    <View style={[styles.tile, { backgroundColor: tile }, lit && styles.tileLit, white && styles.tileEdge]}>
      {children ?? (icon ? <Icon name={icon} size={16} color={color.onBrand} /> : null)}
    </View>
  );
}

/** A settings row's measures, shared by Profile's rows and Account's own. */
export const ROW = { gap: 12, paddingHorizontal: 16, paddingVertical: 8, minHeight: 50, tile: 29 };
/** Where the rule between rows starts: at the text, past the tile. */
export const ROW_RULE_INSET = ROW.paddingHorizontal + ROW.tile + ROW.gap;

/** The chevron at a row's end: pointing on, or down while what it opens is open. */
export function RowChevron({ expanded }: { expanded?: boolean }) {
  return (
    <View style={expanded ? styles.chevronOpen : undefined}>
      <Icon name="chevron" size={13} color={color.labelTertiary} />
    </View>
  );
}

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
  expanded,
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
  /** For a row that opens something under it: whether it's open (its chevron turns down). */
  expanded?: boolean;
}) {
  const body = (
    <View style={styles.row}>
      {icon ? <SettingsTile icon={icon} tile={tile} /> : null}
      <View style={styles.rowText}>
        {/* Two lines before it shortens: on a narrow phone a one-line title lost its last word. */}
        <Txt variant="body" color={destructive ? color.dangerInk : color.label} numberOfLines={2}>
          {title}
        </Txt>
        {/* Wraps as far as it needs: cut short, an explanation loses its point. */}
        {subtitle ? (
          <Txt variant="footnote" color={color.labelSecondary}>
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
        <Toggle
          value={toggle.value}
          onValueChange={(next) => {
            haptic.select();
            toggle.onChange(next);
          }}
          accessibilityLabel={title}
        />
      ) : null}
      {chevron ? <RowChevron expanded={expanded} /> : null}
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
      aria-expanded={expanded}
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
      accessibilityLabel={placeholder || 'Search'}
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
  ground: { backgroundColor: color.groupedBackground },
  clear: { backgroundColor: 'transparent' },
  glow: { position: 'absolute', top: 0, left: 0, right: 0 },
  content: { paddingHorizontal: space[4], gap: space[5], width: '100%', maxWidth: PAGE_COLUMN, alignSelf: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space[3] },
  bar: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  barTitle: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[8] + space[6] },

  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', gap: space[2], marginBottom: -space[2] },
  sectionIcon: { alignSelf: 'center' },

  group: { gap: 6 },
  // Semibold and opened up a little, so a section's name reads as a heading over its card.
  groupHeader: { paddingHorizontal: space[4], letterSpacing: 0.5, ...face('semibold') },
  groupFooter: { paddingHorizontal: space[4] },
  // The same corners as the app's other cards, so a list sits flush with the card above it.
  groupBody: { backgroundColor: color.plate, borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', ...shadow.plate },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: color.separator, marginLeft: ROW_RULE_INSET },

  row: { flexDirection: 'row', alignItems: 'center', gap: ROW.gap, paddingHorizontal: ROW.paddingHorizontal, minHeight: ROW.minHeight, paddingVertical: ROW.paddingVertical },
  tile: { width: ROW.tile, height: ROW.tile, borderRadius: 7, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  // Lit from the top (the gradient paints over the tile's colour) and rimmed.
  tileLit: {
    boxShadow: 'inset 0px 0.5px 0px rgba(255, 255, 255, 0.4), inset 0px -0.5px 0px rgba(0, 0, 0, 0.12), 0px 1px 2px rgba(0, 0, 0, 0.12)',
    ...backgroundImage('linear-gradient(180deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0) 60%, rgba(0, 0, 0, 0.08) 100%)'),
  },
  tileEdge: { borderWidth: StyleSheet.hairlineWidth, borderColor: color.separator },
  chevronOpen: { transform: [{ rotate: '90deg' }] },
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
