/**
 * GymGO's logo: a white G whose crossbar turns into an arrow heading out, on
 * a blue-to-violet gradient. scripts/brand-mark.mjs makes the badge here and
 * the app icons from the original, assets/brand/gymgo-logo.jpg.
 *
 * `AppBadge` is the app icon itself, and `Wordmark` the icon with "GymGO".
 * Both are decoration: the text beside them says what the screen is, and the
 * wordmark reads as "GymGO".
 */

import { Image, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LOGO_VIOLET, WORDMARK } from './brandPaths';
import { color, currentTheme } from '@/lib/theme';

const badge = require('../../assets/images/badge.png');

/** The logo's violet, for text, whatever colour theme the app is in: a logo doesn't change. */
export function logoViolet(): string {
  return currentTheme().scheme === 'dark' ? LOGO_VIOLET.dark : LOGO_VIOLET.light;
}

const hidden = { 'aria-hidden': true, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;

/** The app icon, `size` points square, with the corners iOS gives it. */
export function AppBadge({ size }: { size: number }) {
  return (
    <View {...hidden} style={[styles.badge, { width: size, height: size, borderRadius: size * 0.225 }]}>
      <Image source={badge} style={{ width: size, height: size }} />
    </View>
  );
}

/** The app icon and "GymGO", `height` points tall. */
export function Wordmark({ height }: { height: number }) {
  const w = WORDMARK;
  // The badge is centred on the capitals; the letters' tails may reach below it.
  const baseline = (w.badge + w.cap) / 2;
  const tall = Math.max(w.badge, baseline + w.descent);
  const scale = height / tall;
  return (
    <View aria-label="GymGO" role="img" accessible accessibilityLabel="GymGO" style={styles.row}>
      <AppBadge size={w.badge * scale} />
      <Svg width={w.width * scale} height={height} viewBox={`0 ${-baseline} ${w.width} ${tall}`} style={{ marginLeft: w.gap * scale }}>
        <Path d={w.gym} fill={color.label} />
        <Path d={w.go} fill={logoViolet()} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { overflow: 'hidden', borderCurve: 'continuous' },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
});
