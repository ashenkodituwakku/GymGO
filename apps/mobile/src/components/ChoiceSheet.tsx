/**
 * A short list to pick one from, rising from the foot of the screen as
 * iPhone's action sheet does, with a check on the one that's on. For the
 * sort order on Android and in a browser, where tapping the order used to
 * step it along one at a time (four taps to see them all); iPhone shows
 * Apple's own sheet.
 *
 * Cancel, a tap outside it, Android's back gesture or Escape closes it.
 * A screen reader hears each choice as a radio button, and which is on.
 */

import { useCallback, useEffect, useRef } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptic } from '@/lib/haptics';
import { HIT, color, face, radius, space, themed } from '@/lib/theme';
import { Icon } from './Icon';
import { ARRIVE, LEAVE } from './motion';
import { SHEET_SIDE } from './SheetBackground';
import { Txt } from './ui';

export function ChoiceSheet<K extends string>({
  title,
  options,
  selected,
  onPick,
  onClose,
}: {
  title: string;
  options: ReadonlyArray<{ key: K; label: string }>;
  selected: K;
  onPick: (key: K) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const shown = useSharedValue(0);
  const leaving = useRef(false);
  useEffect(() => {
    shown.value = withTiming(1, ARRIVE);
  }, [shown]);

  /** Slides away, then hands over: the choice made, or none. */
  const leave = useCallback(
    (then: () => void) => {
      if (leaving.current) return;
      leaving.current = true;
      shown.value = withTiming(0, LEAVE, (finished) => {
        if (finished) runOnJS(then)();
      });
    },
    [shown],
  );
  const close = () => leave(onClose);
  const pick = (key: K) => {
    haptic.select();
    leave(() => {
      if (key !== selected) onPick(key);
      onClose();
    });
  };

  const dim = useAnimatedStyle(() => ({ opacity: shown.value }));
  const rise = useAnimatedStyle(() => ({ opacity: Math.min(1, shown.value * 1.6), transform: [{ translateY: (1 - shown.value) * 48 }] }));

  return (
    <Modal visible transparent animationType="none" onRequestClose={close} statusBarTranslucent navigationBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.dim, dim]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessible={false} />
        </Animated.View>
        <Animated.View style={[styles.column, { paddingBottom: insets.bottom + space[2] }, rise]} accessibilityViewIsModal>
          <View style={styles.group} role="radiogroup" accessibilityLabel={title}>
            <Txt variant="footnote" color={color.labelSecondary} style={styles.title}>
              {title}
            </Txt>
            {options.map((option) => {
              const on = option.key === selected;
              return (
                <View key={option.key}>
                  <View style={styles.rule} />
                  <Pressable
                    onPress={() => pick(option.key)}
                    accessibilityRole="radio"
                    aria-checked={on}
                    accessibilityLabel={option.label}
                    style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  >
                    <Txt variant="body" color={on ? color.brand : color.label} style={[styles.label, on && face('semibold')]}>
                      {option.label}
                    </Txt>
                    {on ? <Icon name="check" size={18} color={color.brand} /> : null}
                  </Pressable>
                </View>
              );
            })}
          </View>
          <Pressable onPress={close} accessibilityRole="button" style={({ pressed }) => [styles.group, styles.row, styles.cancel, pressed && styles.pressed]}>
            <Txt variant="body" color={color.brand} style={face('semibold')}>
              Cancel
            </Txt>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = themed(() => StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  dim: { backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  // As wide as the screen allows, less the sheets' side margin; a phone's width at most in a browser.
  column: { width: '100%', maxWidth: 440, alignSelf: 'center', paddingHorizontal: SHEET_SIDE, gap: space[2] },
  // No shadow: the page is dimmed behind it, as behind iPhone's own (and an iPhone clips a shadow to these corners).
  group: { backgroundColor: color.card, borderRadius: radius.xl, borderCurve: 'continuous', overflow: 'hidden' },
  title: { textAlign: 'center', paddingHorizontal: space[4], paddingVertical: space[3] },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: color.separator },
  row: { minHeight: HIT + 12, flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[5] },
  label: { flex: 1 },
  cancel: { justifyContent: 'center' },
  pressed: { backgroundColor: color.fill },
}));
