/**
 * The four tabs: Home, Explore (the map), Saved and Profile.
 *
 * On iPhone and Android this is the system's own tab bar, so on iOS 26 it is
 * Apple's Liquid Glass bar and behaves exactly like every other app's. In
 * the browser, GymGO draws a floating glass bar in the same spirit: at the
 * bottom on a narrow window, at the top right on a wide one (where the
 * bottom-left belongs to the map's side panels).
 */

import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { forwardRef } from 'react';
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Glass } from '@/components/Glass';
import { Icon, type IconName } from '@/components/Icon';
import { Txt } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { WebTabBarInset } from '@/lib/layout';
import { color, face, shadow, space } from '@/lib/theme';

export default function TabsLayout() {
  if (Platform.OS === 'web') return <BrowserTabs />;
  return (
    <NativeTabs tintColor={color.brand} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Icon sf={{ default: 'map', selected: 'map.fill' }} md="map" />
        <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="saved">
        <NativeTabs.Trigger.Icon sf={{ default: 'bookmark', selected: 'bookmark.fill' }} md="bookmark" />
        <NativeTabs.Trigger.Label>Saved</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} md="person" />
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

/** Height of the browser tab bar plus the gap under it, on narrow windows. */
const BAR_HEIGHT = 64;
const BAR_GAP = 12;
const WIDE = 900;

const TABS: Array<{ name: string; href: '/' | '/explore' | '/saved' | '/profile'; label: string; icon: IconName }> = [
  { name: 'index', href: '/', label: 'Home', icon: 'home' },
  { name: 'explore', href: '/explore', label: 'Explore', icon: 'map' },
  { name: 'saved', href: '/saved', label: 'Saved', icon: 'saved' },
  { name: 'profile', href: '/profile', label: 'Profile', icon: 'account' },
];

function BrowserTabs() {
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  return (
    <WebTabBarInset.Provider value={wide ? 0 : BAR_HEIGHT + BAR_GAP * 2}>
      <Tabs style={styles.root}>
        <TabSlot />
        {/* Declares the routes; the visible bar below is GymGO's own. */}
        <TabList style={styles.hidden}>
          {TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} />
          ))}
        </TabList>
        <View style={[styles.bar, wide ? styles.barWide : styles.barNarrow]} pointerEvents="box-none">
          <Glass kind="control" style={[styles.capsule, wide && styles.capsuleWide]}>
            {TABS.map((tab) => (
              <TabTrigger key={tab.name} name={tab.name} asChild>
                <TabButton icon={tab.icon} label={tab.label} compact={wide} />
              </TabTrigger>
            ))}
          </Glass>
        </View>
      </Tabs>
    </WebTabBarInset.Provider>
  );
}

const TabButton = forwardRef<View, TabTriggerSlotProps & { icon: IconName; label: string; compact: boolean }>(
  function TabButton({ icon, label, compact, isFocused, onPress, ...props }, ref) {
    const tint = isFocused ? color.brand : color.labelSecondary;
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
        style={({ pressed }) => [
          styles.tab,
          compact && styles.tabCompact,
          isFocused && styles.tabFocused,
          pressed && { opacity: 0.7 },
        ]}
      >
        <Icon name={icon} size={compact ? 17 : 22} color={tint} />
        <Txt variant="caption" color={tint} style={[styles.tabLabel, isFocused && face('bold')]}>
          {label}
        </Txt>
      </Pressable>
    );
  },
);

const styles = StyleSheet.create({
  root: { flex: 1 },
  hidden: { display: 'none' },
  bar: { position: 'absolute', alignItems: 'center' },
  barNarrow: { left: space[4], right: space[4], bottom: BAR_GAP },
  barWide: { top: 16, right: 16 + 56 + 12 },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    height: BAR_HEIGHT,
    paddingHorizontal: 6,
    borderRadius: BAR_HEIGHT / 2,
    ...shadow.float,
  },
  capsuleWide: { height: 48, borderRadius: 24, paddingHorizontal: 4 },
  tab: {
    minWidth: 72,
    height: BAR_HEIGHT - 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: space[3],
    borderRadius: (BAR_HEIGHT - 12) / 2,
  },
  tabCompact: { flexDirection: 'row', gap: 6, height: 40, borderRadius: 20, minWidth: 0 },
  tabFocused: { backgroundColor: 'rgba(88, 86, 214, 0.12)' },
  tabLabel: { fontSize: 11 },
});
