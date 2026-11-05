/**
 * Done, in the corner of a screen that opens as a sheet on iPhone. A sheet
 * there has no back button, so a swipe down was the only way out of
 * Plates, a card, Compare, Report a bug and signing in; Apple's own sheets
 * show a way to close. (A browser and Android have their own back.)
 */

import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { color, face } from '@/lib/theme';
import { Txt } from './ui';

export function SheetDone() {
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      accessibilityRole="button"
      hitSlop={10}
      style={({ pressed }) => [styles.done, pressed && styles.pressed]}
    >
      <Txt variant="body" color={color.brand} style={face('semibold')}>
        Done
      </Txt>
    </Pressable>
  );
}

/** The header options that put it there: iPhone only. */
export const SHEET_DONE = Platform.OS === 'ios' ? { headerRight: () => <SheetDone /> } : {};

const styles = StyleSheet.create({
  done: { paddingHorizontal: 4 },
  pressed: { opacity: 0.5 },
});
