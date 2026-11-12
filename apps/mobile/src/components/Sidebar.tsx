/**
 * The sidebar layout (Appearance → Layout → Sidebar; lib/navLayout.ts):
 * GymGO's places in a menu down the left: the four tabs, then your
 * training, then you. On a wide screen it stays open beside every page
 * (`DockedSidebar`, placed by app/_layout.tsx, so opening Progress from it
 * doesn't cover it); on a phone a Menu button at the foot slides it in over
 * the page (`MenuButton`, `SidebarDrawer`), and choosing a place, a tap
 * beside it, Escape or Android's back closes it.
 *
 * Either way it's a pane of Liquid Glass floating clear of the window's
 * edges, as iPadOS 26 draws its sidebars: the tab bar's own glass (Apple's
 * on iOS 26, the imitation on older phones, the browser's with a bend along
 * its rim), or the look's plain plate in a solid look or at 0% Liquid Glass.
 * The place you're on is a pill of the accent, lit like the glass it sits in.
 */

import { router, usePathname, type Href } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BackHandler, Platform, ScrollView, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { LIMITED } from '@/lib/limited';
import { MENU_BUTTON, SIDEBAR_TABS, SIDEBAR_TRAINING, SIDEBAR_WIDTH, SIDEBAR_YOU, tabFor, type SidebarItem } from '@/lib/navLayout';
import { CHILD_TOUCH, color, currentTheme, face, radius, shadow, solidSurfaces, space, themed } from '@/lib/theme';
import { Avatar } from './Avatar';
import { Wordmark } from './BrandMark';
import { Glass, HAS_LIQUID_GLASS, useGlassLevel } from './Glass';
import { Icon } from './Icon';
import { glassMark, installLiquidGlass, panelRefraction } from './liquidGlass';
import { ARRIVE, LEAVE, Pressable } from './motion';
import { PIcon, type PhosphorName } from './PIcon';
import { Txt } from './ui';

/** Every place's icon, from the tab bar's set: outline, filled for the place you're on. */
const ICON: Record<string, PhosphorName> = {
  '/': 'house',
  '/explore': 'map-trifold',
  '/saved': 'bookmark-simple',
  '/profile': 'user-circle',
  '/train': 'barbell',
  '/progress': 'chart-line-up',
  '/workouts': 'clipboard-text',
  '/programme': 'calendar-dots',
  '/collection': 'cards',
  '/friends': 'users-three',
  '/appearance': 'palette',
};

/** How far the pane floats in from the window's edges. */
const EDGE = 12;
/** A row's height: a full touch target. */
const ROW = 44;

/** What the sidebar lists: on the limited website, only what it has. */
function sections(): Array<{ title: string | null; items: readonly SidebarItem[] }> {
  if (LIMITED) return [{ title: null, items: SIDEBAR_TABS }, { title: null, items: SIDEBAR_YOU.filter((item) => item.href === '/appearance') }];
  return [
    { title: null, items: SIDEBAR_TABS },
    { title: 'Training', items: SIDEBAR_TRAINING },
    { title: 'You', items: SIDEBAR_YOU },
  ];
}

/** The menu itself, the same docked or slid in. `onGo` runs after a place is chosen (the drawer closes). */
function SidebarList({ onGo }: { onGo?: () => void }) {
  const pathname = usePathname();
  const { account } = useApp();
  const onTab = tabFor(pathname);
  const go = (item: SidebarItem) => {
    haptic.select();
    // A tab is switched to; a page opens over the tabs, with its back button.
    if (item.tab) router.navigate(item.href as Href);
    else router.push(item.href as Href);
    onGo?.();
  };
  return (
    <View role="navigation" accessibilityLabel="GymGO">
      {sections().map((section, index) => (
        <View key={section.title ?? index} style={styles.section}>
          {section.title && (
            <Txt variant="footnote" color={color.labelSecondary} style={[styles.sectionTitle, face('semibold')]}>
              {section.title}
            </Txt>
          )}
          {section.items.map((item) => {
            const on = item.tab ? onTab === item.href : pathname === item.href;
            const me = item.href === '/profile' ? account.face : null;
            return (
              <Pressable
                key={item.href}
                onPress={() => go(item)}
                accessibilityRole="link"
                aria-current={on ? 'page' : undefined}
                accessibilityState={{ selected: on }}
                accessibilityLabel={item.label}
                style={({ pressed, hovered }) => [styles.item, !on && hovered && styles.itemHover, pressed && styles.itemPressed]}
              >
                {on && <View {...glassMark('pill')} style={[StyleSheet.absoluteFill, styles.pill]} />}
                <View style={styles.itemIcon}>
                  {me ? (
                    <View style={[styles.avatarRing, on && styles.avatarRingOn]}>
                      <Avatar account={me} size={24} variant="subhead" />
                    </View>
                  ) : (
                    <PIcon name={ICON[item.href] ?? 'house'} weight={on ? 'fill' : 'regular'} size={22} color={on ? color.brand : color.label} />
                  )}
                </View>
                <Txt variant="body" color={on ? color.brand : color.label} style={on ? face('semibold') : undefined} numberOfLines={1}>
                  {item.label}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/**
 * The pane the menu sits on: Liquid Glass, as the tab bar is, or the look's
 * plate. In a browser it's the tab bar's glass CSS, with a bend sized to
 * the pane; on a phone the Glass component (Apple's on iOS 26).
 */
function Pane({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  // Drawn again when your Liquid Glass level changes (0% is a plate).
  useGlassLevel();
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const solid = solidSurfaces();
  if (solid) return <View style={[styles.pane, styles.plate, style]}>{children}</View>;
  if (Platform.OS === 'web') {
    installLiquidGlass();
    const onLayout = (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      if (!size || Math.abs(size.width - width) >= 4 || Math.abs(size.height - height) >= 4) setSize({ width, height });
    };
    return (
      <View style={[styles.pane, style]} onLayout={onLayout}>
        <View {...panelRefraction(size?.width ?? 0, size?.height ?? 0)} style={[StyleSheet.absoluteFill, styles.paneClip]}>
          {/* As solid as the tab bar (your Liquid Glass level), under the glass's own light. */}
          <View style={[StyleSheet.absoluteFill, styles.wash]} />
          <View {...glassMark('panel-shine')} style={StyleSheet.absoluteFill} />
        </View>
        {children}
      </View>
    );
  }
  return (
    <View style={[styles.pane, styles.paneShadow, style]}>
      <Glass kind="control" style={[StyleSheet.absoluteFill, styles.paneClip]} />
      {children}
    </View>
  );
}

/** Beside the page on a wide screen: always there, the page taking the rest of the width. */
export function DockedSidebar() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.docked, { paddingTop: insets.top + EDGE, paddingBottom: insets.bottom + EDGE }]}>
      <Pane style={styles.fill}>
        <ScrollView style={styles.scroller} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <View style={styles.brand}>
            <Wordmark height={24} />
          </View>
          <SidebarList />
        </ScrollView>
      </Pane>
    </View>
  );
}

/** On a phone: a small glass Menu button at the foot, naming the tab you're on. */
export function MenuButton({ bottom, onPress }: { bottom: number; onPress: () => void }) {
  const pathname = usePathname();
  const here = SIDEBAR_TABS.find((tab) => tab.href === tabFor(pathname))?.label ?? 'Menu';
  return (
    <View style={[CHILD_TOUCH, styles.menuDock, { bottom }]}>
      <Pressable
        onPress={() => {
          haptic.select();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={`Menu. On ${here}`}
        style={({ pressed }) => [styles.menuShadow, pressed && styles.itemPressed]}
      >
        <Glass kind="control" style={[StyleSheet.absoluteFill, styles.menuCapsule]} />
        <View style={styles.menuRow}>
          <Icon name="menu" size={18} color={color.label} />
          <Txt variant="subhead" style={face('semibold')}>
            {here}
          </Txt>
        </View>
      </Pressable>
    </View>
  );
}

/** On a phone: the menu slid in from the left over a dimmed page. */
export function SidebarDrawer({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const shown = useSharedValue(0);
  const leaving = useRef(false);
  useEffect(() => {
    shown.value = withTiming(1, ARRIVE);
  }, [shown]);
  const close = () => {
    if (leaving.current) return;
    leaving.current = true;
    shown.value = withTiming(0, LEAVE);
    setTimeout(onClose, 220);
  };
  // Android's back closes it; in a browser, Escape does.
  useEffect(() => {
    if (Platform.OS === 'android') {
      const listener = BackHandler.addEventListener('hardwareBackPress', () => {
        close();
        return true;
      });
      return () => listener.remove();
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const onKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape') close();
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const dim = useAnimatedStyle(() => ({ opacity: shown.value }));
  // Slid in from beyond the left edge, clearing the pane's own shadow.
  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: (shown.value - 1) * (DRAWER_WIDTH + EDGE * 3) }] }));
  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.dim, dim]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel="Close the menu" />
      </Animated.View>
      <Animated.View style={[styles.drawer, { top: insets.top + EDGE, bottom: insets.bottom + EDGE }, slide]} accessibilityViewIsModal role="dialog" aria-modal accessibilityLabel="Menu">
        <Pane style={styles.fill}>
          <View style={styles.drawerHead}>
            <Wordmark height={24} />
            <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close the menu" hitSlop={10} style={({ pressed }) => [styles.close, pressed && styles.itemPressed]}>
              <Icon name="close" size={14} color={color.labelSecondary} />
            </Pressable>
          </View>
          <ScrollView style={styles.scroller} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            <SidebarList onGo={close} />
          </ScrollView>
        </Pane>
      </Animated.View>
    </View>
  );
}

/** The slid-in pane's width on a phone: the docked one's, a little wider for a thumb. */
const DRAWER_WIDTH = SIDEBAR_WIDTH + 24;
/** A pill no rounder than the look allows (8-bit is square). */
const pillRadius = () => Math.min(ROW / 2, radius.pill);

const styles = themed(() =>
  StyleSheet.create({
    // The pane floats in from the window's edges; the page's own grey shows round it.
    docked: { width: SIDEBAR_WIDTH, paddingLeft: EDGE, paddingRight: space[1] },
    fill: { flex: 1 },
    pane: { borderRadius: radius.xl, borderCurve: 'continuous' },
    paneClip: { borderRadius: radius.xl, borderCurve: 'continuous', overflow: 'hidden' },
    // The look's plate: its card colour and shadow (a solid look, or 0% Liquid Glass).
    plate: { backgroundColor: color.card, ...shadow.float },
    // Real Liquid Glass casts a soft shadow of its own; the older phones' imitation needs a deeper one.
    paneShadow: {
      boxShadow: HAS_LIQUID_GLASS ? '0 8px 24px rgba(0, 0, 0, 0.08)' : '0 16px 40px rgba(0, 0, 0, 0.16), 0 2px 10px rgba(0, 0, 0, 0.07)',
    },
    wash: { backgroundColor: color.glassWashThin },
    // The list scrolls inside the pane's rounded corners.
    scroller: { borderRadius: radius.xl, overflow: 'hidden' },
    list: { paddingHorizontal: space[2] + 2, paddingTop: space[4], paddingBottom: space[3], gap: space[1] },
    brand: { paddingHorizontal: space[3], paddingBottom: space[4] },
    section: { gap: 2, paddingBottom: space[3] },
    sectionTitle: { paddingHorizontal: space[3], paddingTop: space[2], paddingBottom: space[1] },
    item: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: ROW, paddingHorizontal: space[3], borderRadius: pillRadius(), borderCurve: 'continuous' },
    pill: { backgroundColor: color.brandTint, borderRadius: pillRadius(), borderCurve: 'continuous' },
    itemHover: { backgroundColor: color.fill },
    itemPressed: { opacity: 0.7 },
    itemIcon: { width: 26, alignItems: 'center' },
    avatarRing: { width: 28, height: 28, borderRadius: Math.min(14, radius.pill), alignItems: 'center', justifyContent: 'center' },
    avatarRingOn: { borderWidth: 2, borderColor: color.brand },
    menuDock: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
    menuShadow: { height: MENU_BUTTON, borderRadius: MENU_BUTTON / 2, ...shadow.float },
    menuCapsule: { borderRadius: MENU_BUTTON / 2, overflow: 'hidden' },
    menuRow: { height: MENU_BUTTON, flexDirection: 'row', alignItems: 'center', gap: space[2], paddingHorizontal: space[5] },
    // Lighter than a sheet's: the page should still show through the glass.
    dim: { backgroundColor: currentTheme().scheme === 'dark' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.22)' },
    drawer: { position: 'absolute', left: EDGE, width: DRAWER_WIDTH, maxWidth: '84%' },
    drawerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: space[5], paddingRight: space[3], paddingTop: space[4], paddingBottom: space[1] },
    close: { width: 30, height: 30, borderRadius: Math.min(15, radius.pill), alignItems: 'center', justifyContent: 'center', backgroundColor: color.fill },
  }),
);
