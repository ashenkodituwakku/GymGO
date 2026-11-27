/**
 * A short list to pick one from, rising from the foot of the screen as
 * iPhone's action sheet does, with a check on the one that's on. For the
 * sort order on Android and in a browser, where tapping the order used to
 * step it along one at a time (four taps to see them all); iPhone shows
 * Apple's own sheet.
 *
 * Cancel, a tap outside it, Android's back gesture or Escape closes it.
 * A screen reader hears each choice as a radio button, and which is on.
 *
 * It can also hold actions (an exercise's menu, Remove set): buttons in a
 * group of their own, a destructive one in red. With no choices, it's a
 * menu of actions alone.
 */

import { useCallback, useEffect, useRef } from 'react';
import { ActionSheetIOS, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Backdrop } from './Backdrop';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDialogName } from '@/lib/dialogName';
import { haptic } from '@/lib/haptics';
import { HIT, color, face, radius, space, themed } from '@/lib/theme';
import { Icon } from './Icon';
import { ARRIVE, LEAVE } from './motion';
import { SHEET_SIDE } from './SheetBackground';
import { SteadyTxt, Txt } from './ui';

/** A button in the sheet: what it does, and whether it destroys something (shown in red). */
export interface SheetAction<A extends string> {
  key: A;
  label: string;
  destructive?: boolean;
}

/**
 * iPhone: a menu of actions as Apple's own action sheet. Returns false
 * elsewhere, where GymGO's sheet (ChoiceSheet with `actions`) is shown.
 */
export function askActionsNatively<A extends string>(title: string, actions: ReadonlyArray<SheetAction<A>>, onPick: (key: A) => void, message?: string): boolean {
  if (Platform.OS !== 'ios') return false;
  const destructive = actions.findIndex((action) => action.destructive);
  ActionSheetIOS.showActionSheetWithOptions(
    {
      title,
      ...(message ? { message } : {}),
      options: [...actions.map((action) => action.label), 'Cancel'],
      cancelButtonIndex: actions.length,
      ...(destructive >= 0 ? { destructiveButtonIndex: destructive } : {}),
      tintColor: color.brand,
    },
    (chosen) => {
      const action = actions[chosen];
      if (action) onPick(action.key);
    },
  );
  return true;
}

export function ChoiceSheet<K extends string, A extends string = never>({
  title,
  message,
  options = [],
  selected,
  onPick,
  actions = [],
  onAction,
  onClose,
}: {
  title: string;
  /** A line under the title, as iPhone's sheet has: what the choice does. */
  message?: string;
  options?: ReadonlyArray<{ key: K; label: string }>;
  selected?: K;
  onPick?: (key: K) => void;
  /** Buttons below the choices (or alone, as a menu). */
  actions?: ReadonlyArray<SheetAction<A>>;
  onAction?: (key: A) => void;
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
      if (key !== selected) onPick?.(key);
      onClose();
    });
  };
  const act = (key: A) => {
    haptic.select();
    leave(() => {
      onAction?.(key);
      onClose();
    });
  };
  const heading = (
    <View style={styles.title}>
      <Txt variant="footnote" color={color.labelSecondary} style={[styles.center, !!message && face('semibold')]}>
        {title}
      </Txt>
      {!!message && (
        <Txt variant="footnote" color={color.labelSecondary} style={styles.center}>
          {message}
        </Txt>
      )}
    </View>
  );

  const dialogName = useDialogName(title);
  const dim = useAnimatedStyle(() => ({ opacity: shown.value }));
  const rise = useAnimatedStyle(() => ({ opacity: Math.min(1, shown.value * 1.6), transform: [{ translateY: (1 - shown.value) * 48 }] }));

  return (
    <Modal visible transparent animationType="none" onRequestClose={close} statusBarTranslucent navigationBarTranslucent>
      <View style={styles.root} ref={dialogName}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.dim, dim]}>
          <Backdrop style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>
        <Animated.View style={[styles.column, { paddingBottom: insets.bottom + space[2] }, rise]} accessibilityViewIsModal>
          {options.length > 0 && (
            <View style={styles.group} role="radiogroup" accessibilityLabel={title}>
              {heading}
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
                      <SteadyTxt on={on} variant="body" color={on ? color.brand : color.label} boxStyle={styles.label}>
                        {option.label}
                      </SteadyTxt>
                      {on ? <Icon name="check" size={18} color={color.brandOnTint} /> : null}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
          {actions.length > 0 && (
            <View style={styles.group} role="group" accessibilityLabel={options.length > 0 ? undefined : title}>
              {options.length === 0 && heading}
              {actions.map((action, index) => (
                <View key={action.key}>
                  {(options.length === 0 || index > 0) && <View style={styles.rule} />}
                  <Pressable onPress={() => act(action.key)} accessibilityRole="button" style={({ pressed }) => [styles.row, styles.action, pressed && styles.pressed]}>
                    <Txt variant="body" color={action.destructive ? color.dangerInk : color.brandOnTint}>
                      {action.label}
                    </Txt>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          <Pressable onPress={close} accessibilityRole="button" style={({ pressed }) => [styles.group, styles.row, styles.cancel, pressed && styles.pressed]}>
            <Txt variant="body" color={color.brandOnTint} style={face('semibold')}>
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
  title: { gap: 2, paddingHorizontal: space[4], paddingVertical: space[3] },
  center: { textAlign: 'center' },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: color.separator },
  row: { minHeight: HIT + 12, flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[5] },
  label: { flex: 1 },
  cancel: { justifyContent: 'center' },
  action: { justifyContent: 'center' },
  pressed: { backgroundColor: color.fill },
}));
