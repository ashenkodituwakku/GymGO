/**
 * An on/off switch, the iPhone's on every platform.
 *
 * On iPhone it is the system's own (UISwitch). A browser and Android drew
 * React Native's stand-in: a Material thumb in teal on the green track, and
 * when off no track at all, a white dot floating on the card. Here they get
 * the same pill as the iPhone's instead: green when on, a grey track when
 * off, a white thumb that glides across on a spring.
 *
 * A screen reader hears a switch and whether it's on; in a browser, Space
 * and Enter flip it from the keyboard.
 */

import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Switch, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { currentTheme } from '@/lib/theme';
import { SETTLE } from './motion';

/** The iPhone's switch green, the same in every accent: on is on. */
export const SWITCH_ON = '#34C759';

const TRACK = { width: 51, height: 31 };
const THUMB = 27;
const INSET = (TRACK.height - THUMB) / 2;
const TRAVEL = TRACK.width - THUMB - INSET * 2;

export function Toggle({
  value,
  onValueChange,
  accessibilityLabel,
  disabled = false,
  tint = SWITCH_ON,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
  /** The track's colour when on. */
  tint?: string;
}) {
  if (Platform.OS === 'ios') {
    return (
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: tint, false: undefined }}
        accessibilityLabel={accessibilityLabel}
      />
    );
  }
  return <DrawnToggle value={value} onValueChange={onValueChange} accessibilityLabel={accessibilityLabel} disabled={disabled} tint={tint} />;
}

function DrawnToggle({
  value,
  onValueChange,
  accessibilityLabel,
  disabled,
  tint,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled: boolean;
  tint: string;
}) {
  const on = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    on.value = withSpring(value ? 1 : 0, SETTLE);
  }, [value, on]);
  const off = currentTheme().scheme === 'dark' ? OFF_DARK : OFF_LIGHT;
  const track = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(on.value, [0, 1], [off, tint]) }));
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: on.value * TRAVEL }] }));
  const flip = () => {
    if (!disabled) onValueChange(!value);
  };
  // In a browser, Enter presses it already; Space is a switch's own key.
  const keys = {
    onKeyDown: (event: { key?: string; preventDefault?: () => void }) => {
      if (event.key !== ' ' && event.key !== 'Spacebar') return;
      event.preventDefault?.();
      flip();
    },
  };
  return (
    <Pressable
      {...keys}
      onPress={flip}
      disabled={disabled}
      role="switch"
      aria-checked={value}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      style={[styles.press, disabled && styles.disabled]}
    >
      <Animated.View style={[styles.track, track]}>
        <View style={styles.trackShade} />
        <Animated.View style={[styles.thumb, thumb]} />
      </Animated.View>
    </Pressable>
  );
}

/** The track when off: the iPhone's own greys. */
const OFF_LIGHT = '#E3E3E8';
const OFF_DARK = '#39393D';

const styles = StyleSheet.create({
  press: { borderRadius: TRACK.height / 2 },
  disabled: { opacity: 0.45 },
  track: { width: TRACK.width, height: TRACK.height, borderRadius: TRACK.height / 2, justifyContent: 'center' },
  // A faint inner shadow along the top: the track is set into the card.
  trackShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: TRACK.height / 2, boxShadow: 'inset 0px 1px 2px rgba(0, 0, 0, 0.08)' },
  thumb: {
    position: 'absolute',
    left: INSET,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: '#FFFFFF',
    boxShadow: '0px 3px 8px rgba(0, 0, 0, 0.15), 0px 1px 1px rgba(0, 0, 0, 0.16)',
  },
});
