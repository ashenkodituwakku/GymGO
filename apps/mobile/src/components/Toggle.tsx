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
 * and Enter flip it from the keyboard. Its grey when off is the look's own,
 * and it takes taps across a full 44 points.
 */

import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Switch } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { mix } from '@/lib/looks';
import { switchKey } from '@/lib/switchKeys';
import { HIT, color } from '@/lib/theme';
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
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
}) {
  if (Platform.OS === 'ios') {
    return (
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: SWITCH_ON, false: undefined }}
        accessibilityLabel={accessibilityLabel}
      />
    );
  }
  return <DrawnToggle value={value} onValueChange={onValueChange} accessibilityLabel={accessibilityLabel} disabled={disabled} />;
}

function DrawnToggle({
  value,
  onValueChange,
  accessibilityLabel,
  disabled,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled: boolean;
}) {
  const on = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    on.value = withSpring(value ? 1 : 0, SETTLE);
  }, [value, on]);
  // Off: a grey of the look's own card and text, a step darker than the card (light) or lighter (dark).
  const off = mix(color.card, color.label, OFF_STEP);
  const track = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(on.value, [0, 1], [off, SWITCH_ON]) }));
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: on.value * TRAVEL }] }));
  const flip = () => {
    if (!disabled) onValueChange(!value);
  };
  // In a browser: Space flips it once per press (see lib/switchKeys.ts).
  const keys = {
    onKeyDown: (event: { key?: string; repeat?: boolean; preventDefault?: () => void }) => {
      if (event.key === ' ' || event.key === 'Spacebar') event.preventDefault?.();
      if (switchKey(event) === 'flip') flip();
    },
  };
  return (
    <Pressable
      {...keys}
      onPress={flip}
      disabled={disabled}
      role="switch"
      aria-checked={value}
      aria-disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      // A full 44-point target round the 31-point pill (hitSlop does nothing in a browser).
      style={[styles.press, disabled && styles.disabled]}
    >
      <Animated.View style={[styles.track, track]}>
        <Animated.View style={[styles.thumb, thumb]} />
      </Animated.View>
    </Pressable>
  );
}

/** How far the off track is from the card towards the text colour. */
const OFF_STEP = 0.17;
/** Padding that makes the target 44 points tall, taken back off the layout. */
const PAD = { v: (HIT - TRACK.height) / 2, h: 4 };

const styles = StyleSheet.create({
  press: { paddingVertical: PAD.v, paddingHorizontal: PAD.h, marginVertical: -PAD.v, marginHorizontal: -PAD.h, borderRadius: HIT / 2 },
  disabled: { opacity: 0.45 },
  // A faint inner shadow along the top: the track is set into the card.
  track: { width: TRACK.width, height: TRACK.height, borderRadius: TRACK.height / 2, justifyContent: 'center', boxShadow: 'inset 0px 1px 2px rgba(0, 0, 0, 0.08)' },
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
