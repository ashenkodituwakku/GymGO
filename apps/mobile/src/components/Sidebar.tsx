/**
 * The sidebar layout (Appearance → Layout → Sidebar; lib/navLayout.ts):
 * GymGO's places in a menu down the left: the four tabs, then your
 * training, then you. On a wide screen it stays open beside the page
 * (`DockedSidebar`); on a phone a Menu button at the foot slides it in over
 * the page (`MenuButton`, `SidebarDrawer`), and choosing a place, a tap
 * beside it, Escape or Android's back closes it.
 */

import { router, usePathname, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { BackHandler, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { LIMITED } from '@/lib/limited';
import { MENU_BUTTON, SIDEBAR_TABS, SIDEBAR_TRAINING, SIDEBAR_WIDTH, SIDEBAR_YOU, tabFor, type SidebarItem } from '@/lib/navLayout';
import { CHILD_TOUCH, color, face, radius, shadow, space, themed } from '@/lib/theme';
import { Avatar } from './Avatar';
import { Wordmark } from './BrandMark';
import { Glass } from './Glass';
import { Icon, type IconName } from './Icon';
import { ARRIVE, LEAVE, Pressable } from './motion';
import { PIcon, type PhosphorName } from './PIcon';
import { Txt } from './ui';

/** The tabs' icons, as the tab bar draws them. */
const TAB_ICON: Record<string, PhosphorName> = { '/': 'house', '/explore': 'map-trifold', '/saved': 'bookmark-simple', '/profile': 'user-circle' };
const PAGE_ICON: Record<string, IconName> = {
  '/train': 'workout',
  '/progress': 'chart',
  '/workouts': 'list',
  '/programme': 'calendar',
  '/collection': 'cards',
  '/friends': 'people',
  '/appearance': 'palette',
};

/** What the sidebar lists: on the limited website, only what it has. */
function sections(): Array<{ title: string | null; items: readonly SidebarItem[] }> {
  if (LIMITED) return [{ title: null, items: SIDEBAR_TABS }, { title: null, items: SIDEBAR_YOU.filter((item) => item.href === '/appearance') }];
  return [
    { title: null, items: SIDEBAR_TABS },
    { title: 'TRAINING', items: SIDEBAR_TRAINING },
    { title: 'YOU', items: SIDEBAR_YOU },
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
            <Txt variant="eyebrow" color={color.labelSecondary} style={styles.sectionTitle}>
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
                style={({ pressed }) => [styles.item, on && styles.itemOn, pressed && styles.itemPressed]}
              >
                <View style={styles.itemIcon}>
                  {me ? (
                    <Avatar account={me} size={24} variant="subhead" />
                  ) : item.tab ? (
                    <PIcon name={TAB_ICON[item.href]!} weight={on ? 'fill' : 'regular'} size={22} color={on ? color.brand : color.label} />
                  ) : (
                    <Icon name={PAGE_ICON[item.href] ?? 'chevron'} size={18} color={on ? color.brand : color.labelSecondary} />
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

/** Beside the page on a wide screen: always there, the page taking the rest of the width. */
export function DockedSidebar() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.docked, { paddingTop: insets.top + space[4], paddingBottom: insets.bottom + space[4] }]}>
      <ScrollView contentContainerStyle={styles.dockedContent} showsVerticalScrollIndicator={false}>
        <View style={styles.brand}>
          <Wordmark height={26} />
        </View>
        <SidebarList />
      </ScrollView>
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
  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: (shown.value - 1) * (SIDEBAR_WIDTH + 24) }] }));
  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.dim, dim]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel="Close the menu" />
      </Animated.View>
      <Animated.View style={[styles.drawer, { paddingTop: insets.top + space[4], paddingBottom: insets.bottom + space[4] }, slide]} accessibilityViewIsModal role="dialog" aria-modal accessibilityLabel="Menu">
        <View style={styles.drawerHead}>
          <Wordmark height={24} />
          <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close the menu" hitSlop={10} style={({ pressed }) => [styles.close, pressed && styles.itemPressed]}>
            <Icon name="close" size={16} color={color.labelSecondary} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.dockedContent} showsVerticalScrollIndicator={false}>
          <SidebarList onGo={close} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    docked: { width: SIDEBAR_WIDTH, backgroundColor: color.background, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: color.separator },
    dockedContent: { paddingHorizontal: space[3], gap: space[2] },
    brand: { paddingHorizontal: space[3], paddingBottom: space[4] },
    section: { gap: 2, paddingBottom: space[3] },
    sectionTitle: { paddingHorizontal: space[3], paddingTop: space[2], paddingBottom: space[1] },
    item: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 44, paddingHorizontal: space[3], borderRadius: radius.md, borderCurve: 'continuous' },
    itemOn: { backgroundColor: color.brandTint },
    itemPressed: { opacity: 0.7 },
    itemIcon: { width: 26, alignItems: 'center' },
    menuDock: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
    menuShadow: { height: MENU_BUTTON, borderRadius: MENU_BUTTON / 2, ...shadow.float },
    menuCapsule: { borderRadius: MENU_BUTTON / 2, overflow: 'hidden' },
    menuRow: { height: MENU_BUTTON, flexDirection: 'row', alignItems: 'center', gap: space[2], paddingHorizontal: space[5] },
    dim: { backgroundColor: 'rgba(0, 0, 0, 0.35)' },
    drawer: { position: 'absolute', top: 0, bottom: 0, left: 0, width: SIDEBAR_WIDTH + 24, maxWidth: '86%', backgroundColor: color.background, ...shadow.float },
    drawerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[5], paddingBottom: space[4] },
    close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: color.fill },
  }),
);
