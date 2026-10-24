/**
 * Across the top of every screen on the limited website (lib/limited.ts):
 * what it carries (real gyms in the cities built in) and what it doesn't.
 */

import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mix, readable } from '@/lib/looks';
import { CITY_LIST } from '@/lib/places';
import { color, currentTheme, face, space, themed } from '@/lib/theme';
import { Txt } from './ui';

/** The real cities built into the app (the invented demo city aside). */
const BUILT_IN_CITIES = CITY_LIST.filter((city) => !city.demo).length;

export function LimitedBanner() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + space[2] }]}>
      <Txt variant="footnote" color={ink()} style={styles.text}>
        <Txt variant="footnote" color={ink()} style={face('semibold')}>
          GymGO limited version
        </Txt>
        {` · Gyms in ${BUILT_IN_CITIES} cities, built in. Accounts and reviews come with the full version.`}
      </Txt>
    </View>
  );
}

// The accent's tint, made solid, and the accent darkened (or lightened) just
// enough to read on it: as a see-through tint the small text fell short of
// the 4.5 : 1 contrast small text needs.
const ground = () => mix(color.background, color.brand, currentTheme().scheme === 'dark' ? 0.2 : 0.12);
const ink = () => readable(color.brand, [ground()], currentTheme().scheme);

const styles = themed(() => StyleSheet.create({
  bar: {
    paddingBottom: space[2],
    paddingHorizontal: space[4],
    backgroundColor: ground(),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.brandBorder,
  },
  text: { textAlign: 'center' },
}));
