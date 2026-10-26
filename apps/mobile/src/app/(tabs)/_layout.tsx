/**
 * The four tabs: Home, Explore (the map), Saved and Profile.
 *
 * Styled after Instagram on iOS 26: a floating Liquid Glass capsule above the
 * home indicator, icons only (outline, filled when selected, your initial for
 * Profile once you're signed in), and a glass lens behind the tab you're on.
 * The lens springs to the tab you tap, and you can drag it along the bar to
 * switch, the way iOS 26's tab bars work; it swells while your finger is on
 * it.
 *
 * The same bar on every platform, so it looks the same whatever iOS version
 * the phone runs:
 *  - iOS 26: Apple's own Liquid Glass material (UIGlassEffect), which bends
 *    and lights what's behind it and flexes under a finger;
 *  - older iPhones: the system's ultra-thin blur, with a sheen and rim;
 *  - Android: a bright wash with the same sheen and rim;
 *  - the web: blur, specular edges and, in Chrome and Edge, real refraction
 *    (liquidGlass.web.ts).
 *
 * In the wide layout (a laptop's browser window, lib/layout.tsx) the tabs are
 * a sidebar on the left instead, named as well as drawn, with the training
 * pages under them: the room beside a phone-width page was going spare.
 */

import { TabList, TabSlot, TabTrigger, Tabs, defaultTabsSlotRender, type TabTriggerSlotProps } from 'expo-router/ui';
import { router, useFocusEffect, usePathname, type Href } from 'expo-router';
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { ARRIVE, LIQUID, Pressable } from '@/components/motion';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Glass, HAS_LIQUID_GLASS, useGlassLevel } from '@/components/Glass';
import { PIcon, type PhosphorName } from '@/components/PIcon';
import { Redrawn, useThemeVersion } from '@/components/Redrawn';
import { glassMark, installLiquidGlass, sizeRefraction } from '@/components/liquidGlass';
import { HeldWhileAway, useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { TabBarInset, tabBarBottom, useWide } from '@/lib/layout';
import { CHILD_TOUCH, NO_TOUCH, color, currentTheme, face, radius, shadow, solidSurfaces, space, themed } from '@/lib/theme';
import { Avatar } from '@/components/Avatar';
import { BrandFill } from '@/components/BrandFill';
import { Wordmark } from '@/components/BrandMark';
import { EmojiIcon } from '@/components/Emoji';
import type { IconName } from '@/components/Icon';
import { Txt } from '@/components/ui';

const BAR_HEIGHT = 64;
// The same 16 pt edge as the sheets and the controls over the map.
const SIDE_MARGIN = 16;
const MAX_WIDTH = 400;
const PAD = 5;
const LENS_INSET = 5;
const SPRING = LIQUID;
/** The lens following a finger: close behind it, never past it. */
const FOLLOW = { damping: 28, stiffness: 600, mass: 0.4, overshootClamping: true };

/** How wide the sidebar is, in the wide layout. */
const SIDEBAR = 248;

/** The training pages, under the tabs in the sidebar. */
const TRAINING: Array<{ label: string; icon: IconName; href: Href }> = [
  { label: 'Build a workout', icon: 'workout', href: { pathname: '/workout/[id]', params: { id: 'any' } } },
  { label: 'Templates', icon: 'list', href: '/templates' },
  { label: 'Progress', icon: 'chart', href: '/progress' },
  { label: 'Exercises', icon: 'book', href: '/exercises' },
  { label: 'Interval timer', icon: 'timer', href: '/timer' },
  { label: 'Plate calculator', icon: 'plates', href: '/plates' },
];

const TABS: Array<{ name: string; href: '/' | '/explore' | '/saved' | '/profile'; label: string; icon: PhosphorName }> = [
  { name: 'index', href: '/', label: 'Home', icon: 'house' },
  { name: 'explore', href: '/explore', label: 'Explore', icon: 'map-trifold' },
  { name: 'saved', href: '/saved', label: 'Saved', icon: 'bookmark-simple' },
  { name: 'profile', href: '/profile', label: 'Profile', icon: 'user-circle' },
];

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  // The bar is drawn again in new colours; each tab's screen redraws itself (below).
  useThemeVersion();
  // The first time GymGO opens, it asks which country is yours: Free covers it.
  // Only once you're on a tab: a gym opened from a link shows first.
  const { prefsReady, prefs } = useApp();
  const asked = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!prefsReady || prefs.country || prefs.demo || asked.current) return;
      asked.current = true;
      router.push({ pathname: '/country', params: { first: '1' } });
    }, [prefsReady, prefs.country, prefs.demo]),
  );
  // Like iOS 26, the bar floats just above the home indicator; on Android,
  // clear of the navigation bar.
  const bottom = tabBarBottom(insets.bottom);
  // With Android's keyboard up the bar steps aside, and nothing needs to clear it.
  const keyboardUp = useAndroidKeyboard();
  const wide = useWide();
  return (
    <TabBarInset.Provider value={wide ? 0 : keyboardUp ? 8 : bottom + BAR_HEIGHT + 8}>
      <Tabs style={[styles.root, wide && styles.rootWide]}>
        {wide && <SideBar />}
        {/* Its own container defaults to never shrinking, which lets a
            screen grow past the window so nothing scrolls. */}
        <TabSlot
          style={styles.slot}
          // Drawn again when the colours change, without leaving the tab;
          // a tab you're not on waits for you to come back to catch up.
          renderFn={(descriptor, options) =>
            defaultTabsSlotRender(
              {
                ...descriptor,
                render: () => (
                  <Redrawn kind="tab" focused={options.isFocused}>
                    <HeldWhileAway here={options.isFocused}>{descriptor.render()}</HeldWhileAway>
                  </Redrawn>
                ),
              },
              options,
            )
          }
        />
        {/* Declares the routes; the visible bar is GymGO's own. */}
        <TabList style={styles.hidden}>
          {TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} />
          ))}
        </TabList>
        {!keyboardUp && !wide && <GlassTabBar bottom={bottom} />}
      </Tabs>
    </TabBarInset.Provider>
  );
}

function GlassTabBar({ bottom }: { bottom: number }) {
  // Liquid Glass at 0% makes the bar solid; any other level, glass again.
  useGlassLevel();
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const barWidth = Math.min(width - SIDE_MARGIN * 2, MAX_WIDTH);
  const tabWidth = (barWidth - PAD * 2) / TABS.length;
  // The tab you're on. A page or sheet opened over the tabs is on no tab's
  // path: the lens stays where it was, rather than sliding to Home under it
  // and springing back when you return.
  const found = TABS.findIndex((tab) => (tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)));
  const onTab = useRef(Math.max(0, found));
  if (found >= 0) onTab.current = found;
  const index = onTab.current;

  // In a browser: the bar's glass styles are there for its first frame, not added after it.
  installLiquidGlass();
  useEffect(() => sizeRefraction(barWidth, BAR_HEIGHT), [barWidth]);

  // The lens: where it is, and how lifted (0 resting, 1 under a finger).
  const x = useSharedValue(index * tabWidth);
  const lift = useSharedValue(0);
  useEffect(() => {
    x.value = withSpring(index * tabWidth, SPRING);
  }, [index, tabWidth, x]);

  const go = (target: number) => {
    const tab = TABS[target];
    if (!tab || target === index) return;
    haptic.select();
    router.navigate(tab.href);
  };

  // Drag the lens along the bar to switch tabs. With a mouse, the browser
  // follows a drag with a click on the tab it started on; that click mustn't
  // take you back, so presses just after a drag are ignored.
  const dragEndedAt = useRef(0);
  const markDragEnd = () => {
    dragEndedAt.current = Date.now();
  };
  // Only a browser's mouse follows a drag with a click; on a touch screen a tap just after a drag is a tap.
  const justDragged = () => Platform.OS === 'web' && Date.now() - dragEndedAt.current < 400;
  const last = TABS.length - 1;
  const drag = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onBegin(() => {
      lift.value = withTiming(1, { ...ARRIVE, duration: 170 });
    })
    .onUpdate((event) => {
      // Glides after the finger: a drag begun on another tab used to jump the lens there in one frame.
      x.value = withSpring(Math.min(Math.max(event.x - PAD - tabWidth / 2, 0), tabWidth * last), FOLLOW);
    })
    .onEnd(() => {
      const target = Math.min(Math.max(Math.round(x.value / tabWidth), 0), last);
      x.value = withSpring(target * tabWidth, SPRING);
      runOnJS(markDragEnd)();
      runOnJS(go)(target);
    })
    .onFinalize(() => {
      lift.value = withTiming(0, { ...ARRIVE, duration: 320 });
    });

  const lensStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { scaleX: 1 + lift.value * 0.12 }, { scaleY: 1 + lift.value * 0.16 }],
  }));
  const liftStyle = useAnimatedStyle(() => ({ opacity: lift.value }));

  // A look drawn in solid plates, or Liquid Glass at 0%: a plain bar with
  // the look's corners and shadow, and a lens tinted with the accent
  // (painted, for Rainbow or Camo).
  const solid = solidSurfaces();
  const lens = solid ? (
    <Animated.View style={[styles.lens, { width: tabWidth }, lensStyle, { pointerEvents: 'none' }]}>
      <View style={[StyleSheet.absoluteFill, styles.lensShape, styles.lensSolid]}>
        <BrandFill opacity={0.45} />
      </View>
    </Animated.View>
  ) : (
    <Animated.View style={[styles.lens, { width: tabWidth }, lensStyle, { pointerEvents: 'none' }]}>
      <View {...glassMark('lens')} style={[StyleSheet.absoluteFill, styles.lensShape, Platform.OS !== 'web' && styles.lensNative]} />
      <Animated.View
        {...glassMark('lift')}
        style={[StyleSheet.absoluteFill, styles.lensShape, Platform.OS !== 'web' && styles.liftNative, liftStyle]}
      />
    </Animated.View>
  );

  return (
    <View style={[CHILD_TOUCH, styles.dock, { bottom }]}>
      <GestureDetector gesture={drag}>
        <View style={[styles.shadow, { width: barWidth }]} accessibilityRole="tablist">
          {/* The glass, clipped to the capsule… */}
          {Platform.OS === 'web' && !solid ? (
            <View {...glassMark('bar')} style={[StyleSheet.absoluteFill, styles.capsule]}>
              {/* As solid as the bar on phones (see Glass.tsx), under the browser's glass highlights. */}
              <View style={[StyleSheet.absoluteFill, styles.wash]} />
              <View {...glassMark('shine')} style={StyleSheet.absoluteFill} />
            </View>
          ) : solid ? (
            // A plain plate: its shadow is on the view around it, as a clipped
            // view hides its own (iPhone), and an Android elevation would
            // have drawn it over the lens and the tabs.
            <View style={[StyleSheet.absoluteFill, styles.capsule, styles.plate]} />
          ) : (
            <Glass kind="control" interactive style={[StyleSheet.absoluteFill, styles.capsule]} />
          )}
          {/* …and the lens above it, free to swell past the edge like iOS 26's. */}
          {lens}
          <View style={styles.row}>
            {TABS.map((tab) => (
              <TabTrigger key={tab.name} name={tab.name} asChild>
                <TabButton icon={tab.icon} label={tab.label} width={tabWidth} ignorePress={justDragged} />
              </TabTrigger>
            ))}
          </View>
        </View>
      </GestureDetector>
    </View>
  );
}

/** The wide layout's tabs: the logo, each tab named, then the training pages. */
function SideBar() {
  return (
    <View style={styles.side} role="navigation" aria-label="GymGO">
      <View style={styles.sideBrand}>
        <Wordmark height={30} />
      </View>
      <View accessibilityRole="tablist" style={styles.sideList}>
        {TABS.map((tab) => (
          <TabTrigger key={tab.name} name={tab.name} asChild>
            <SideTab icon={tab.icon} label={tab.label} />
          </TabTrigger>
        ))}
      </View>
      <Txt variant="eyebrow" color={color.labelSecondary} style={styles.sideHead} accessibilityRole="header">
        Training
      </Txt>
      <View style={styles.sideList}>
        {TRAINING.map((item) => (
          <Pressable
            key={item.label}
            onPress={() => router.push(item.href)}
            accessibilityRole="link"
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.sideItem, (pressed || hovered) && styles.sideItemHover]}
          >
            <View style={styles.sideIcon}>
              <EmojiIcon name={item.icon} size={18} />
            </View>
            <Txt variant="body">{item.label}</Txt>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

type SideTabProps = TabTriggerSlotProps & { icon: PhosphorName; label: string };

const SideTab = forwardRef<View, SideTabProps>(function SideTab({ icon, label, isFocused, onPress, ...props }, ref) {
  const { account } = useApp();
  const me = icon === 'user-circle' ? account.face : null;
  return (
    <Pressable
      ref={ref}
      {...props}
      onLongPress={undefined}
      onPress={onPress}
      accessibilityRole="tab"
      aria-selected={isFocused}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.sideItem, isFocused ? styles.sideItemOn : (pressed || hovered) && styles.sideItemHover]}
    >
      <View style={styles.sideIcon}>
        {me ? <Avatar account={me} size={24} variant="subhead" /> : <PIcon name={icon} weight={isFocused ? 'fill' : 'regular'} size={24} color={color.label} />}
      </View>
      <Txt variant="body" style={isFocused && face('semibold')}>
        {label}
      </Txt>
    </Pressable>
  );
});

type TabButtonProps = TabTriggerSlotProps & { icon: PhosphorName; label: string; width: number; ignorePress: () => boolean };

const TabButton = forwardRef<View, TabButtonProps>(function TabButton(
  { icon, label, width, ignorePress, isFocused, onPress, ...props },
  ref,
) {
  const { account } = useApp();
  const me = icon === 'user-circle' ? account.face : null;
  return (
    <Pressable
      ref={ref}
      {...props}
      // A held tab switched silently; a tap switches (with its tick), a drag moves the lens.
      onLongPress={undefined}
      onPress={(event) => {
        if (ignorePress()) {
          event.preventDefault();
          return;
        }
        if (!isFocused) haptic.select();
        onPress?.(event);
      }}
      accessibilityRole="tab"
      aria-selected={isFocused}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.tab, { width }, pressed && styles.pressed]}
    >
      {me ? (
        // Your picture (or initial) for Profile, ringed when selected, as Instagram shows your photo.
        <View style={[styles.avatarRing, isFocused && styles.avatarRingOn]}>
          <Avatar account={me} size={26} variant="subhead" />
        </View>
      ) : (
        <PIcon name={icon} weight={isFocused ? 'fill' : 'regular'} size={isFocused ? 28 : 27} color={color.label} />
      )}
    </Pressable>
  );
});

/** Android lifts everything above the keyboard; the bar steps aside instead. */
function useAndroidKeyboard(): boolean {
  const [up, setUp] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', () => setUp(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setUp(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return up;
}

/** A corner no rounder than the look allows (8-bit is square), up to a full pill. */
const round = (size: number) => Math.min(size / 2, radius.pill);

const styles = themed(() => StyleSheet.create({
  root: { flex: 1 },
  rootWide: { flexDirection: 'row' },
  side: {
    width: SIDEBAR,
    paddingHorizontal: space[3],
    paddingTop: space[6],
    gap: space[1],
    backgroundColor: color.plate,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: color.separator,
  },
  sideBrand: { paddingHorizontal: space[3], marginBottom: space[5] },
  sideList: { gap: 2 },
  sideHead: { paddingHorizontal: space[3], marginTop: space[6], marginBottom: space[1] },
  sideItem: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 44, paddingHorizontal: space[3], borderRadius: radius.md, borderCurve: 'continuous' },
  sideItemOn: { backgroundColor: color.fill },
  sideItemHover: { backgroundColor: color.fill, opacity: 0.85 },
  sideIcon: { width: 26, alignItems: 'center' },
  slot: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minHeight: 0 },
  hidden: { display: 'none' },
  dock: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  shadow: {
    height: BAR_HEIGHT,
    borderRadius: round(BAR_HEIGHT),
    // Real Liquid Glass casts its own soft shadow, and a browser's glass bar
    // has one in its CSS; the phones' imitation needs one; a solid bar takes the look's own.
    ...(solidSurfaces()
      ? shadow.float
      : { boxShadow: Platform.OS === 'web' ? undefined : HAS_LIQUID_GLASS ? '0 6px 18px rgba(0, 0, 0, 0.08)' : '0 12px 30px rgba(0, 0, 0, 0.16), 0 2px 8px rgba(0, 0, 0, 0.07)' }),
  },
  plate: { backgroundColor: color.card },
  capsule: { borderRadius: round(BAR_HEIGHT), overflow: 'hidden' },
  wash: { backgroundColor: color.glassWashThin },
  row: { flexDirection: 'row', alignItems: 'center', height: BAR_HEIGHT, paddingHorizontal: PAD },
  lens: {
    position: 'absolute',
    left: PAD,
    top: LENS_INSET,
    height: BAR_HEIGHT - LENS_INSET * 2,
  },
  lensShape: { borderRadius: round(BAR_HEIGHT - LENS_INSET * 2), borderCurve: 'continuous' },
  lensSolid: { backgroundColor: color.brandTint, overflow: 'hidden' },
  lensNative: {
    backgroundColor: color.fill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.glassEdge,
  },
  liftNative: {
    backgroundColor: currentTheme().scheme === 'dark' ? 'rgba(120, 120, 128, 0.36)' : 'rgba(255, 255, 255, 0.72)',
    borderWidth: 1,
    borderColor: currentTheme().scheme === 'dark' ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.95)',
    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.14)',
  },
  // Rounded like the bar, so the keyboard's focus ring is a pill, not a box.
  tab: { height: BAR_HEIGHT, alignItems: 'center', justifyContent: 'center', borderRadius: round(BAR_HEIGHT) },
  pressed: { transform: [{ scale: 0.9 }] },
  avatarRing: { width: 32, height: 32, borderRadius: round(32), alignItems: 'center', justifyContent: 'center' },
  avatarRingOn: { borderWidth: 2, borderColor: color.label },
}));
