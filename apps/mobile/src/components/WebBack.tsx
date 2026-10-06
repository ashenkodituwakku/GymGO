/**
 * The back button at the top left of a page, in a browser: a soft capsule
 * with a chevron and the page it goes back to ("‹ Profile"), rather than the
 * bare arrow a browser gets by default. A phone keeps its own (iPhone's
 * chevron and the word Back, Android's arrow).
 *
 * A page opened straight from a link, with nothing behind it, goes to the
 * start: Home, or the sign-in screen when signed out (`home` names it).
 */

import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { haptic } from '@/lib/haptics';
import { HEADER_EDGE, color, face, space, themed } from '@/lib/theme';
import { Icon } from './Icon';
import { Pressable } from './motion';
import { Txt } from './ui';

export function WebBack({
  label,
  canGoBack,
  onPress,
  home = { label: 'Home', href: '/' },
}: {
  label: string;
  canGoBack: boolean;
  onPress?: () => void;
  home?: { label: string; href: '/' | '/sign-in' };
}) {
  const where = canGoBack ? label : home.label;
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        if (canGoBack && onPress) onPress();
        else router.replace(home.href);
      }}
      accessibilityRole="button"
      accessibilityLabel={where === 'Back' ? 'Back' : `Back to ${where}`}
      hitSlop={6}
      // Hover fills it; a press dims it (kept apart, so the press's fade never holds the colour).
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.pill, hovered && styles.pillOn, pressed && styles.pillDown]}
    >
      <Icon name="chevronBack" size={20} color={color.brand} />
      <Txt variant="subhead" color={color.brand} numberOfLines={1} style={styles.label}>
        {where}
      </Txt>
    </Pressable>
  );
}

const styles = themed(() => StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 34,
    paddingLeft: space[1],
    paddingRight: space[3] + 2,
    marginLeft: HEADER_EDGE,
    borderRadius: 17,
    backgroundColor: color.brandWash,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.brandTint,
  },
  pillOn: { backgroundColor: color.brandTint },
  pillDown: { opacity: 0.6 },
  label: { ...face('semibold'), maxWidth: 180 },
}));
