/**
 * The mark at the head of an empty page: its icon's emoji, large, so a page
 * with nothing on it yet still has somewhere for the eye to land. It takes
 * the room the old tile and its glow took, so nothing round it moves.
 */

import { StyleSheet, View } from 'react-native';
import { themed } from '@/lib/theme';
import { EmojiIcon } from './Emoji';
import type { IconName } from './Icon';

/** The room round the emoji on each side. */
const REACH = 18;

export function HeroMark({ icon, size = 64 }: { icon: IconName; size?: number }) {
  return (
    <View
      style={[styles.mark, { width: size + REACH * 2, height: size + REACH * 2 }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
    >
      {/* EmojiIcon draws an emoji a fifth larger than the size it's given. */}
      <EmojiIcon name={icon} size={Math.round(size / 1.2)} />
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    mark: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  }),
);
