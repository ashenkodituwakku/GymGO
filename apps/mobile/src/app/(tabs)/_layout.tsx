/**
 * The four tabs: Home, Explore (the map), Saved and Profile.
 *
 * Styled after iOS 26, the way Instagram does it: a floating Liquid Glass
 * capsule at the bottom, icons only (outline, filling in when selected), with
 * a glass highlight behind the tab you're on.
 *
 * On iPhone and Android this is the system's own tab bar, so on iOS 26 it is
 * Apple's real Liquid Glass bar. In the browser, GymGO draws the same capsule
 * itself, with the highlight sliding between tabs.
 */

import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { usePathname } from 'expo-router';
import { forwardRef, useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Glass } from '@/components/Glass';
import { Icon, type IconName } from '@/components/Icon';
import { haptic } from '@/lib/haptics';
import { WebTabBarInset } from '@/lib/layout';
import { color } from '@/lib/theme';

export default function TabsLayout() {
  if (Platform.OS === 'web') return <BrowserTabs />;
  // Labels are hidden, as in Instagram; they're still read out by VoiceOver.
  return (
    <NativeTabs tintColor={color.label} iconColor={color.label} labelVisibilityMode="unlabeled">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
        <NativeTabs.Trigger.Label hidden>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Icon sf={{ default: 'map', selected: 'map.fill' }} md="map" />
        <NativeTabs.Trigger.Label hidden>Explore</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="saved">
        <NativeTabs.Trigger.Icon sf={{ default: 'bookmark', selected: 'bookmark.fill' }} md="bookmark" />
        <NativeTabs.Trigger.Label hidden>Saved</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} md="person" />
        <NativeTabs.Trigger.Label hidden>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

/** The browser capsule, sized like iOS 26's floating tab bar. */
const BAR_HEIGHT = 62;
const BAR_GAP = 14;
const PAD = 6;
const TAB_WIDTH = 66;

const TABS: Array<{ name: string; href: '/' | '/explore' | '/saved' | '/profile'; label: string; icon: IconName }> = [
  { name: 'index', href: '/', label: 'Home', icon: 'home' },
  { name: 'explore', href: '/explore', label: 'Explore', icon: 'map' },
  { name: 'saved', href: '/saved', label: 'Saved', icon: 'saved' },
  { name: 'profile', href: '/profile', label: 'Profile', icon: 'account' },
];

function BrowserTabs() {
  const pathname = usePathname();
  const index = Math.max(
    0,
    TABS.findIndex((tab) => (tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href))),
  );

  // The highlight glides to the selected tab, like the droplet in iOS 26.
  const x = useSharedValue(index * TAB_WIDTH);
  useEffect(() => {
    x.value = withSpring(index * TAB_WIDTH, { damping: 17, stiffness: 190, mass: 0.8 });
  }, [index, x]);
  const lens = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <WebTabBarInset.Provider value={BAR_HEIGHT + BAR_GAP * 2}>
      <Tabs style={styles.root}>
        <TabSlot />
        {/* Declares the routes; the visible bar below is GymGO's own. */}
        <TabList style={styles.hidden}>
          {TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} />
          ))}
        </TabList>
        <View style={styles.bar} pointerEvents="box-none">
          <View style={styles.shadow}>
            <Glass kind="control" style={styles.capsule}>
              <Animated.View style={[styles.lens, lens]} pointerEvents="none" />
              {TABS.map((tab) => (
                <TabTrigger key={tab.name} name={tab.name} asChild>
                  <TabButton icon={tab.icon} label={tab.label} />
                </TabTrigger>
              ))}
            </Glass>
          </View>
        </View>
      </Tabs>
    </WebTabBarInset.Provider>
  );
}

const TabButton = forwardRef<View, TabTriggerSlotProps & { icon: IconName; label: string }>(function TabButton(
  { icon, label, isFocused, onPress, ...props },
  ref,
) {
  return (
    <Pressable
      ref={ref}
      {...props}
      onPress={(event) => {
        haptic.select();
        onPress?.(event);
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.tab, pressed && { transform: [{ scale: 0.9 }] }]}
    >
      <Icon name={icon} size={26} color={isFocused ? color.label : 'rgba(0, 0, 0, 0.72)'} weight={isFocused ? 'bold' : 'regular'} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  hidden: { display: 'none' },
  bar: { position: 'absolute', left: 0, right: 0, bottom: BAR_GAP, alignItems: 'center' },
  shadow: {
    borderRadius: BAR_HEIGHT / 2,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
  },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    height: BAR_HEIGHT,
    paddingHorizontal: PAD,
    borderRadius: BAR_HEIGHT / 2,
  },
  lens: {
    position: 'absolute',
    left: PAD,
    top: 5,
    width: TAB_WIDTH,
    height: BAR_HEIGHT - 10,
    borderRadius: (BAR_HEIGHT - 10) / 2,
    backgroundColor: 'rgba(118, 118, 128, 0.16)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  tab: { width: TAB_WIDTH, height: BAR_HEIGHT, alignItems: 'center', justifyContent: 'center' },
});
