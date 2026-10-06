/**
 * Across the top of every screen on the demo-only website (lib/demoOnly.ts):
 * the gyms are invented, and the full version is coming soon.
 */

import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, face, space, themed } from '@/lib/theme';
import { Txt } from './ui';

export function DemoBanner() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + space[2] }]} accessibilityRole="summary">
      <Txt variant="footnote" color={color.brand} style={styles.text}>
        <Txt variant="footnote" color={color.brand} style={face('semibold')}>
          GymGO demo
        </Txt>
        {' · Every gym here is invented. The full version is coming soon.'}
      </Txt>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  bar: {
    paddingBottom: space[2],
    paddingHorizontal: space[4],
    backgroundColor: color.brandTint,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.brandBorder,
  },
  text: { textAlign: 'center' },
}));
