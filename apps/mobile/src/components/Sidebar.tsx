/**
 * The sidebar layout (Appearance → Layout → Sidebar; lib/navLayout.ts):
 * GymGO's places in a menu down the left: the four tabs, then your
 * training, then you. On a wide screen it stays open, hovering over the
 * left of every page (`SidebarFrame`, around the navigator in
 * app/_layout.tsx, so opening Progress from it doesn't cover it); on a
 * phone a Menu button at the foot slides it in over
 * the page (`MenuButton`, `SidebarDrawer`), and choosing a place, a tap
 * beside it, Escape or Android's back closes it. On the map the docked
 * sidebar folds away to a small glass capsule with an arrow at the top left,
 * leaving the map the room; the arrow unfolds it, the pane growing out of
 * the capsule while the map's panels move across beside it
 * (`useSidebarOpening`), and the arrow at its top or Escape folds it back.
 *
 * Either way it's a pane of Liquid Glass floating clear of the window's
 * edges, over the page rather than beside it, as iPadOS 26 draws its
 * sidebars: the page's header and background run on underneath (Explore's
 * map too), while its content keeps clear (`ClearOfSidebar`). It's the tab bar's own glass (Apple's
 * on iOS 26, the imitation on older phones, the browser's with a bend along
 * its rim), or the look's plain plate in a solid look or at 0% Liquid Glass.
 * The place you're on is a pill of the accent, lit like the glass it sits in.
 */

import { router, usePathname, type Href } from 'expo-router';
import { createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { BackHandler, Platform, ScrollView, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent, type StyleProp, type ViewInstance, type ViewStyle } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { LIMITED } from '@/lib/limited';
import { MENU_BUTTON, SIDEBAR_FOLDED, SIDEBAR_TABS, SIDEBAR_TRAINING, SIDEBAR_WIDTH, SIDEBAR_YOU, foldedOn, navMode, sidebarInset, tabFor, type SidebarItem } from '@/lib/navLayout';
import { useThemeChoice } from '@/lib/themePrefs';
import { CHILD_TOUCH, NO_TOUCH, color, currentTheme, face, radius, shadow, solidSurfaces, space, themed } from '@/lib/theme';
import { Avatar } from './Avatar';
import { Wordmark } from './BrandMark';
import { Glass, HAS_LIQUID_GLASS, useGlassLevel } from './Glass';
import { Icon } from './Icon';
import { glassMark, installLiquidGlass, panelRefraction } from './liquidGlass';
import { ARRIVE, LEAVE, Pressable, SETTLE, SLIDE } from './motion';
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

/**
 * How far the pane floats in from the window's edges: the same as Explore's
 * panels (PANEL_GAP there), so beside them the two line up at the top and
 * the foot, with the same gap between them as round the window's edge.
 */
const EDGE = 16;
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
  const isOn = (item: SidebarItem) => (item.tab ? onTab === item.href : pathname === item.href);
  const here = sections().flatMap((section) => section.items).find(isOn)?.href ?? null;

  // The pill under the place you're on glides from place to place as you
  // go, rather than jumping: each row's place in the list is measured as it
  // lays out (a frame's worth of measurements is one redraw).
  const sectionTops = useRef<number[]>([]);
  const rowTops = useRef<Record<string, { section: number; y: number }>>({});
  const [, setMeasured] = useState(0);
  const pending = useRef(false);
  const measured = () => {
    if (pending.current) return;
    pending.current = true;
    requestAnimationFrame(() => {
      pending.current = false;
      setMeasured((n) => n + 1);
    });
  };
  const row = here ? rowTops.current[here] : undefined;
  const sectionTop = row ? sectionTops.current[row.section] : undefined;
  const target = row && sectionTop !== undefined ? sectionTop + row.y : null;
  const pillY = useSharedValue(target ?? 0);
  const pillShown = useSharedValue(target === null ? 0 : 1);
  const placed = useRef(target !== null);
  useEffect(() => {
    if (target === null) {
      pillShown.value = withTiming(0, LEAVE);
      return;
    }
    // Its first place, or back from a page with no row (a gym's page): there at once, fading up.
    if (!placed.current || pillShown.value < 0.01) pillY.value = target;
    else pillY.value = withSpring(target, SETTLE);
    placed.current = true;
    pillShown.value = withTiming(1, ARRIVE);
  }, [target, pillY, pillShown]);
  const pill = useAnimatedStyle(() => ({ opacity: pillShown.value, transform: [{ translateY: pillY.value }] }));

  const go = (item: SidebarItem) => {
    haptic.select();
    // A tab is switched to; a page opens over the tabs, with its back button.
    if (item.tab) router.navigate(item.href as Href);
    else router.push(item.href as Href);
    onGo?.();
  };
  return (
    <View role="navigation" accessibilityLabel="GymGO">
      <Animated.View {...glassMark('pill')} style={[NO_TOUCH, styles.pill, styles.pillGlide, pill]} />
      {sections().map((section, index) => (
        <View
          key={section.title ?? index}
          style={styles.section}
          onLayout={(event) => {
            sectionTops.current[index] = event.nativeEvent.layout.y;
            measured();
          }}
        >
          {section.title && (
            <Txt variant="footnote" color={color.labelSecondary} style={[styles.sectionTitle, face('semibold')]}>
              {section.title}
            </Txt>
          )}
          {section.items.map((item) => {
            const on = isOn(item);
            const me = item.href === '/profile' ? account.face : null;
            return (
              <Pressable
                key={item.href}
                onLayout={(event) => {
                  rowTops.current[item.href] = { section: index, y: event.nativeEvent.layout.y };
                  measured();
                }}
                onPress={() => go(item)}
                accessibilityRole="link"
                aria-current={on ? 'page' : undefined}
                accessibilityState={{ selected: on }}
                accessibilityLabel={item.label}
                style={({ pressed, hovered }) => [styles.item, !on && hovered && styles.itemHover, pressed && styles.itemPressed]}
              >
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

/** How far in from the left the docked sidebar reaches over the page (0 without it), for content to keep clear of. */
const SidebarInset = createContext(0);
export const useSidebarInset = (): number => useContext(SidebarInset);

/** How much further the map's sidebar reaches open than folded to its capsule: the room the map's panels make for it. */
export const FOLD_SHIFT = SIDEBAR_WIDTH - SIDEBAR_FOLDED;

/*
 * Whether the map's sidebar is open from its capsule. Kept outside React's
 * tree so GymPal, drawn over the frame rather than in it, can keep clear of
 * it too. Arriving on any page starts it folded.
 */
let unfolded = false;
const unfoldWatchers = new Set<() => void>();
function setUnfolded(next: boolean) {
  if (next === unfolded) return;
  unfolded = next;
  unfoldWatchers.forEach((watcher) => watcher());
}
const watchUnfolded = (watcher: () => void) => {
  unfoldWatchers.add(watcher);
  return () => {
    unfoldWatchers.delete(watcher);
  };
};
/** Whether the map's sidebar is open from its capsule (false anywhere else). */
export function useSidebarUnfolded(): boolean {
  return useSyncExternalStore(watchUnfolded, () => unfolded, () => false);
}

/**
 * How far the docked sidebar is open as it moves, from 0 (its capsule, on
 * the map) to 1: what moves aside for it on the map follows this, so the
 * two travel together. Null where it doesn't fold (any other page, no
 * docked sidebar, or folding turned off in Appearance).
 */
const SidebarOpening = createContext<SharedValue<number> | null>(null);
export const useSidebarOpening = (): SharedValue<number> | null => useContext(SidebarOpening);

/**
 * The pages, with the docked sidebar hovering over their left edge on a
 * wide screen. Pages are as wide as the window, so their header and
 * background run on under the glass; anything that reads the safe area
 * (the page header's back button and title) is moved in by the sidebar's
 * width, and `ClearOfSidebar` moves each page's content in. Its own
 * component, so moving from page to page redraws only this, not the
 * navigator inside it.
 */
export function SidebarFrame({ signedIn, children }: { signedIn: boolean; children: ReactNode }) {
  const { layout, foldOnMap } = useThemeChoice();
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const mode = navMode(layout, width);
  // All of the sidebar, its capsule on the map, or nothing.
  const inset = sidebarInset(mode, pathname, signedIn, foldOnMap);
  const foldable = foldedOn(mode, pathname, signedIn, foldOnMap);
  const unfoldedNow = useSidebarUnfolded();
  // Arriving on a page starts the map's sidebar folded, so coming back to the map folds it away again.
  useEffect(() => {
    setUnfolded(false);
  }, [pathname]);
  const open = inset > 0 && (!foldable || unfoldedNow);
  // One value moves the pane and everything that makes room for it.
  const opening = useSharedValue(open ? 1 : 0);
  useEffect(() => {
    opening.value = withSpring(open ? 1 : 0, SLIDE);
  }, [open, opening]);
  const insets = useSafeAreaInsets();
  const shifted = useMemo(() => ({ ...insets, left: insets.left + inset }), [insets, inset]);
  return (
    <SidebarInset.Provider value={inset}>
      {/* Only where it folds: elsewhere (or with folding off) nothing moves aside for it. */}
      <SidebarOpening.Provider value={foldable ? opening : null}>
        <View style={styles.fill}>
          <SafeAreaInsetsContext.Provider value={shifted}>{children}</SafeAreaInsetsContext.Provider>
          {inset > 0 ? <DockedSidebar foldable={foldable} open={open} opening={opening} /> : null}
        </View>
      </SidebarOpening.Provider>
    </SidebarInset.Provider>
  );
}

/** A page's content, kept clear of the docked sidebar hovering over its left edge (as wide as ever without it). */
export function ClearOfSidebar({ children }: { children: ReactNode }) {
  const inset = useSidebarInset();
  return <View style={[styles.fill, inset > 0 && { paddingLeft: inset }]}>{children}</View>;
}

/** How long the pane takes to come to rest: when the menu (or the arrow) leaves the tab order, and the glass's bend comes in. */
const SETTLED_MS = 360;

/**
 * Over the page's left edge on a wide screen, the page running on
 * underneath. On the map (`foldable`) it folds away to a small glass
 * capsule with an arrow: the arrow unfolds it, the pane growing out of the
 * capsule as the map's panels move across to make room, and the arrow at
 * its top (or Escape) folds it back. It's one pane either way, drawn by
 * the frame around every page, so going between the map and another page
 * folds or unfolds it instead of swapping one for another.
 *
 * Only the pane's size and corners move; the menu inside stays the full
 * size and is clipped, fading up once there's room for it, so nothing in
 * it reflows. In a browser the glass bends at its rim only once it has
 * come to rest open (the bend is drawn for one size).
 */
function DockedSidebar({ foldable, open, opening }: { foldable: boolean; open: boolean; opening: SharedValue<number> }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  useGlassLevel();
  const solid = solidSurfaces();
  const paneWidth = SIDEBAR_WIDTH - EDGE;
  const paneHeight = Math.max(FOLD_HEIGHT, height - insets.top - insets.bottom - EDGE * 2);
  const capsuleRadius = Math.min(FOLD_WIDTH / 2, radius.pill);
  const paneRadius = radius.xl + 4;

  const size = useAnimatedStyle(() => ({
    width: interpolate(opening.value, [0, 1], [FOLD_WIDTH, paneWidth], Extrapolation.CLAMP),
    height: interpolate(opening.value, [0, 1], [FOLD_HEIGHT, paneHeight], Extrapolation.CLAMP),
    borderRadius: interpolate(opening.value, [0, 1], [capsuleRadius, paneRadius], Extrapolation.CLAMP),
  }));
  const corners = useAnimatedStyle(() => ({
    borderRadius: interpolate(opening.value, [0, 1], [capsuleRadius, paneRadius], Extrapolation.CLAMP),
  }));
  // The menu fades up once the pane has room for it, and out before the pane closes over it; the arrow the other way round.
  const menu = useAnimatedStyle(() => ({ opacity: interpolate(opening.value, [0.45, 1], [0, 1], Extrapolation.CLAMP) }));
  const arrow = useAnimatedStyle(() => ({ opacity: interpolate(opening.value, [0, 0.3], [1, 0], Extrapolation.CLAMP) }));

  // While it moves, and until each has faded, both the menu and the arrow
  // are there; at rest, the one out of sight leaves the tab order.
  const [moving, setMoving] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setMoving(true);
    const timer = setTimeout(() => setMoving(false), SETTLED_MS);
    return () => clearTimeout(timer);
  }, [open]);
  const menuGone = !open && !moving;
  const arrowGone = open && !moving;

  // Opened or folded from the keyboard: focus goes to the button that undoes it. Escape folds it.
  const frame = useRef<ViewInstance>(null);
  const foldButton = useRef<ViewInstance>(null);
  const unfoldButton = useRef<ViewInstance>(null);
  const handOff = useRef<'fold' | 'unfold' | null>(null);
  useEffect(() => {
    if (Platform.OS !== 'web' || handOff.current === null) return;
    const to = handOff.current === 'fold' ? foldButton.current : unfoldButton.current;
    handOff.current = null;
    // Without scrolling: the pane is still narrow as it opens, and a browser would scroll its clipped menu sideways to show the button.
    (to as unknown as HTMLElement | null)?.focus?.({ preventScroll: true });
  }, [open]);
  useEffect(() => {
    if (Platform.OS !== 'web' || !foldable || !open || typeof window === 'undefined') return;
    const onKey = (event: KeyboardEvent) => {
      // A gym's card or Filters, if open, takes Escape first (explore.tsx marks it handled).
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      const inside = (frame.current as unknown as HTMLElement | null)?.contains(document.activeElement);
      if (inside) handOff.current = 'unfold';
      setUnfolded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [foldable, open]);

  // The glass: the look's plate, Apple's (or the imitation) on a phone, or the browser's, bent at the rim once at rest open.
  const web = Platform.OS === 'web' && !solid;
  if (web) installLiquidGlass();
  const bend = web && open && !moving ? panelRefraction(paneWidth, paneHeight) : { dataSet: { glass: 'panel' } };

  return (
    <Animated.View ref={frame} style={[styles.frame, { top: insets.top + EDGE, left: insets.left + EDGE }, solid ? styles.plate : web ? null : styles.paneShadow, size]}>
      {web ? (
        <Animated.View {...bend} style={[StyleSheet.absoluteFill, styles.clip, corners]}>
          {/* As solid as the tab bar (your Liquid Glass level), under the glass's own light. */}
          <View style={[StyleSheet.absoluteFill, styles.wash]} />
          <View {...glassMark('panel-shine')} style={StyleSheet.absoluteFill} />
        </Animated.View>
      ) : !solid ? (
        <Animated.View style={[StyleSheet.absoluteFill, styles.clip, corners]}>
          <Glass kind="control" style={StyleSheet.absoluteFill} />
        </Animated.View>
      ) : null}

      <Animated.View style={[StyleSheet.absoluteFill, styles.clip, corners]}>
        <Animated.View
          style={[styles.menu, { width: paneWidth, height: paneHeight }, menu, !open && NO_TOUCH, menuGone && styles.gone]}
          aria-hidden={!open || undefined}
          accessibilityElementsHidden={!open}
          importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
        >
          <ScrollView style={styles.scroller} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            <View style={styles.brand}>
              <Wordmark height={24} />
              {foldable ? (
                <Pressable
                  ref={foldButton}
                  onPress={() => {
                    haptic.select();
                    handOff.current = 'unfold';
                    setUnfolded(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Fold the sidebar away"
                  aria-expanded
                  hitSlop={10}
                  style={({ pressed, hovered }) => [styles.close, hovered && styles.closeHover, pressed && styles.itemPressed]}
                >
                  <Icon name="chevronBack" size={16} color={color.labelSecondary} />
                </Pressable>
              ) : null}
            </View>
            <SidebarList />
          </ScrollView>
        </Animated.View>

        {foldable ? (
          <Animated.View
            style={[styles.capsule, arrow, open && NO_TOUCH, arrowGone && styles.gone]}
            aria-hidden={open || undefined}
            accessibilityElementsHidden={open}
            importantForAccessibility={open ? 'no-hide-descendants' : 'auto'}
          >
            <Pressable
              ref={unfoldButton}
              onPress={() => {
                haptic.select();
                handOff.current = 'fold';
                setUnfolded(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Show the sidebar"
              aria-expanded={false}
              style={({ pressed, hovered }) => [styles.capsuleButton, hovered && styles.itemHover, pressed && styles.itemPressed]}
            >
              <Icon name="chevron" size={18} color={color.label} />
            </Pressable>
          </Animated.View>
        ) : null}
      </Animated.View>
    </Animated.View>
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
    // In on the pane's own glide; out quicker, on a timer, so it's gone when the page is back.
    shown.value = withSpring(1, SLIDE);
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
      <Animated.View
        style={[styles.drawer, { top: insets.top + EDGE, bottom: insets.bottom + EDGE }, slide]}
        accessibilityViewIsModal
        role="dialog"
        aria-modal
        accessibilityLabel="Menu"
      >
        <Pane style={styles.fill}>
          <View style={styles.drawerHead}>
            <Wordmark height={24} />
            <Pressable
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel="Close the menu"
              hitSlop={10}
              style={({ pressed }) => [styles.close, pressed && styles.itemPressed]}
            >
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
/** The map's folded sidebar, a capsule standing on end, a full touch target wide (SIDEBAR_FOLDED in navLayout.ts is its gap and width). */
const FOLD_WIDTH = 44;
const FOLD_HEIGHT = 72;
/** A pill no rounder than the look allows (8-bit is square). */
const pillRadius = () => Math.min(ROW / 2, radius.pill);

const styles = themed(() =>
  StyleSheet.create({
    // Over the page's left edge, floating in from the window's. Open it reaches to SIDEBAR_WIDTH, where
    // content beside it (and Explore's panels, past a gap) begins; folded, it's the capsule.
    frame: { position: 'absolute', borderCurve: 'continuous' },
    clip: { overflow: 'hidden', borderCurve: 'continuous' },
    // Out of sight at rest, and in a browser out of the Tab order too.
    gone: Platform.OS === 'web' ? ({ visibility: 'hidden' } as object) : { opacity: 0 },
    // The folded capsule's arrow, filling the capsule.
    // The menu at its full size, pinned to the pane's top left while the pane grows round it (so nothing reflows).
    menu: { position: 'absolute', top: 0, left: 0 },
    capsule: { position: 'absolute', top: 0, left: 0, width: FOLD_WIDTH, height: FOLD_HEIGHT },
    capsuleButton: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    fill: { flex: 1 },
    // Explore's panels' corners, so the panes side by side are one family.
    pane: { borderRadius: radius.xl + 4, borderCurve: 'continuous' },
    paneClip: { borderRadius: radius.xl + 4, borderCurve: 'continuous', overflow: 'hidden' },
    // The look's plate: its card colour and shadow (a solid look, or 0% Liquid Glass).
    plate: { backgroundColor: color.card, ...shadow.float },
    // Real Liquid Glass casts a soft shadow of its own; the older phones' imitation needs a deeper one.
    paneShadow: {
      boxShadow: HAS_LIQUID_GLASS ? '0 8px 24px rgba(0, 0, 0, 0.08)' : '0 16px 40px rgba(0, 0, 0, 0.16), 0 2px 10px rgba(0, 0, 0, 0.07)',
    },
    wash: { backgroundColor: color.glassWashThin },
    // The list scrolls inside the pane's rounded corners.
    scroller: { borderRadius: radius.xl + 4, overflow: 'hidden' },
    list: { paddingHorizontal: space[2] + 2, paddingTop: space[4], paddingBottom: space[3], gap: space[1] },
    // The wordmark, and on the map the fold arrow: the same height either way, so the rows don't move.
    brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 30 + space[4] - 3, paddingLeft: space[3], paddingBottom: space[4] - 3 },
    section: { gap: 2, paddingBottom: space[3] },
    sectionTitle: { paddingHorizontal: space[3], paddingTop: space[2], paddingBottom: space[1] },
    item: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: ROW, paddingHorizontal: space[3], borderRadius: pillRadius(), borderCurve: 'continuous' },
    pill: { backgroundColor: color.brandTint, borderRadius: pillRadius(), borderCurve: 'continuous' },
    // The pill gliding under the rows, from the top of the list.
    pillGlide: { position: 'absolute', top: 0, left: 0, right: 0, height: ROW },
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
    closeHover: { backgroundColor: color.fillStrong },
  }),
);
