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
 */

import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { router, usePathname } from 'expo-router';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Glass, HAS_LIQUID_GLASS } from '@/components/Glass';
import { PIcon, type PhosphorName } from '@/components/PIcon';
import { glassMark, installLiquidGlass, sizeRefraction } from '@/components/liquidGlass';
import { Txt } from '@/components/ui';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { TabBarInset } from '@/lib/layout';
import { color, currentTheme, face, themed } from '@/lib/theme';

const BAR_HEIGHT = 64;
const SIDE_MARGIN = 22;
const MAX_WIDTH = 400;
const PAD = 5;
const LENS_INSET = 5;
const SPRING = { damping: 18, stiffness: 210, mass: 0.7 };

const TABS: Array<{ name: string; href: '/' | '/explore' | '/saved' | '/profile'; label: string; icon: PhosphorName }> = [
  { name: 'index', href: '/', label: 'Home', icon: 'house' },
  { name: 'explore', href: '/explore', label: 'Explore', icon: 'map-trifold' },
  { name: 'saved', href: '/saved', label: 'Saved', icon: 'bookmark-simple' },
  { name: 'profile', href: '/profile', label: 'Profile', icon: 'user-circle' },
];

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  // The first time GymGO opens, it asks which country is yours: Free covers it.
  const { prefsReady, prefs } = useApp();
  const asked = useRef(false);
  useEffect(() => {
    if (!prefsReady || prefs.country || prefs.demo || asked.current) return;
    asked.current = true;
    router.push({ pathname: '/country', params: { first: '1' } });
  }, [prefsReady, prefs.country, prefs.demo]);
  // Like iOS 26, the bar floats just above the home indicator.
  const bottom = Math.max(insets.bottom - 12, 14);
  return (
    <TabBarInset.Provider value={bottom + BAR_HEIGHT + 8}>
      <Tabs style={styles.root}>
        {/* Its own container defaults to never shrinking, which lets a
            screen grow past the window so nothing scrolls. */}
        <TabSlot style={styles.slot} />
        {/* Declares the routes; the visible bar is GymGO's own. */}
        <TabList style={styles.hidden}>
          {TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} />
          ))}
        </TabList>
        <GlassTabBar bottom={bottom} />
      </Tabs>
    </TabBarInset.Provider>
  );
}

function GlassTabBar({ bottom }: { bottom: number }) {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const keyboardUp = useAndroidKeyboard();
  const barWidth = Math.min(width - SIDE_MARGIN * 2, MAX_WIDTH);
  const tabWidth = (barWidth - PAD * 2) / TABS.length;
  const index = Math.max(
    0,
    TABS.findIndex((tab) => (tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href))),
  );

  useEffect(installLiquidGlass, []);
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
  const justDragged = () => Date.now() - dragEndedAt.current < 400;
  const last = TABS.length - 1;
  const drag = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onBegin(() => {
      lift.value = withTiming(1, { duration: 140 });
    })
    .onUpdate((event) => {
      x.value = Math.min(Math.max(event.x - PAD - tabWidth / 2, 0), tabWidth * last);
    })
    .onEnd(() => {
      const target = Math.min(Math.max(Math.round(x.value / tabWidth), 0), last);
      x.value = withSpring(target * tabWidth, SPRING);
      runOnJS(markDragEnd)();
      runOnJS(go)(target);
    })
    .onFinalize(() => {
      lift.value = withTiming(0, { duration: 260 });
    });

  const lensStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { scaleX: 1 + lift.value * 0.12 }, { scaleY: 1 + lift.value * 0.16 }],
  }));
  const liftStyle = useAnimatedStyle(() => ({ opacity: lift.value }));

  if (keyboardUp) return null;

  const lens = (
    <Animated.View pointerEvents="none" style={[styles.lens, { width: tabWidth }, lensStyle]}>
      <View {...glassMark('lens')} style={[StyleSheet.absoluteFill, styles.lensShape, Platform.OS !== 'web' && styles.lensNative]} />
      <Animated.View
        {...glassMark('lift')}
        style={[StyleSheet.absoluteFill, styles.lensShape, Platform.OS !== 'web' && styles.liftNative, liftStyle]}
      />
    </Animated.View>
  );

  return (
    <View style={[styles.dock, { bottom }]} pointerEvents="box-none">
      <GestureDetector gesture={drag}>
        <View style={[styles.shadow, { width: barWidth }]} accessibilityRole="tablist">
          {/* The glass, clipped to the capsule… */}
          {Platform.OS === 'web' ? (
            <View {...glassMark('bar')} style={[StyleSheet.absoluteFill, styles.capsule]}>
              <View {...glassMark('shine')} style={StyleSheet.absoluteFill} />
            </View>
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

type TabButtonProps = TabTriggerSlotProps & { icon: PhosphorName; label: string; width: number; ignorePress: () => boolean };

const TabButton = forwardRef<View, TabButtonProps>(function TabButton(
  { icon, label, width, ignorePress, isFocused, onPress, ...props },
  ref,
) {
  const { account } = useApp();
  const initial = icon === 'user-circle' && account.account ? account.account.displayName.slice(0, 1).toUpperCase() : null;
  return (
    <Pressable
      ref={ref}
      {...props}
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
      {initial ? (
        // Your own initial for Profile, ringed when selected, as Instagram shows your photo.
        <View style={[styles.avatarRing, isFocused && styles.avatarRingOn]}>
          <View style={styles.avatar}>
            <Txt variant="subhead" color={color.onBrand} style={face('semibold')}>
              {initial}
            </Txt>
          </View>
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

const styles = themed(() => StyleSheet.create({
  root: { flex: 1 },
  slot: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minHeight: 0 },
  hidden: { display: 'none' },
  dock: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  shadow: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    // Real Liquid Glass casts its own soft shadow; the imitations need one.
    boxShadow: HAS_LIQUID_GLASS ? '0 6px 18px rgba(0, 0, 0, 0.08)' : '0 12px 30px rgba(0, 0, 0, 0.16), 0 2px 8px rgba(0, 0, 0, 0.07)',
  },
  capsule: { borderRadius: BAR_HEIGHT / 2, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', height: BAR_HEIGHT, paddingHorizontal: PAD },
  lens: {
    position: 'absolute',
    left: PAD,
    top: LENS_INSET,
    height: BAR_HEIGHT - LENS_INSET * 2,
  },
  lensShape: { borderRadius: (BAR_HEIGHT - LENS_INSET * 2) / 2, borderCurve: 'continuous' },
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
  tab: { height: BAR_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  pressed: { transform: [{ scale: 0.9 }] },
  avatarRing: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarRingOn: { borderWidth: 2, borderColor: color.label },
  avatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: color.brandFill, alignItems: 'center', justifyContent: 'center' },
}));
