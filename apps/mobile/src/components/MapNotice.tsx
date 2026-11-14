/**
 * Over a map whose own pictures didn't come (offline, or a network that
 * blocks them): says so, rather than leave it blank, with a way to try
 * again. The pins and the gym list work regardless. The browser's map and
 * Android's map page both show it; Apple's map on iPhone has its own.
 */

import { StyleSheet, View } from 'react-native';
import { Glass } from './Glass';
import { Pressable } from './motion';
import { Txt } from './ui';
import { CHILD_TOUCH, color, face, radius, space, themed } from '@/lib/theme';

/** Taken round the pill, so "Try again" is a full 44 points to tap on a phone. */
const RETRY_SLOP = { top: 10, bottom: 10, left: 8, right: 8 };

export function MapNotice({ top, bottom, left = 0, onRetry }: { top: number; bottom: number; left?: number; onRetry: () => void }) {
  return (
    <View style={[styles.notice, { top, bottom, left }, CHILD_TOUCH]}>
      <Glass kind="control" style={styles.card}>
        <Txt variant="subhead" style={[face('semibold'), styles.center]}>
          The map didn’t load
        </Txt>
        <Txt variant="footnote" color={color.labelSecondary} style={styles.center}>
          The gym list still works.
        </Txt>
        <Pressable onPress={onRetry} hitSlop={RETRY_SLOP} accessibilityRole="button" style={({ pressed }) => [styles.retry, pressed && { opacity: 0.7 }]}>
          <Txt variant="footnote" color={color.brand} style={face('semibold')}>
            Try again
          </Txt>
        </Pressable>
      </Glass>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  notice: { position: 'absolute', right: 0, alignItems: 'center', justifyContent: 'center', padding: space[4] },
  card: { alignItems: 'center', gap: 2, paddingHorizontal: space[5], paddingVertical: space[3], borderRadius: radius.xl, maxWidth: 300 },
  center: { textAlign: 'center' },
  retry: { marginTop: space[1], paddingHorizontal: space[3], paddingVertical: space[1], borderRadius: radius.pill, backgroundColor: color.brandTint },
}));
