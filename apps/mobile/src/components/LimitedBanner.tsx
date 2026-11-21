/**
 * Across the top of every screen on the limited website (lib/limited.ts):
 * what it carries (real gyms in the cities built in) and what it doesn't.
 *
 * On the website that picks its version (gymgo.site, lib/website.ts), the
 * same place offers the other version once the server has come on, or gone
 * off, since the page opened. Switching opens the page again, which asks
 * afresh; it's never done for you, in case you're in the middle of
 * something.
 */

import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptic } from '@/lib/haptics';
import { LIMITED } from '@/lib/limited';
import { mix, readable } from '@/lib/looks';
import { CITY_LIST } from '@/lib/places';
import { color, currentTheme, face, radius, space, themed } from '@/lib/theme';
import { WEBSITE_AUTO, askAgainAfter, latestAnswer, onServerAnswer, serverAnswered } from '@/lib/website';
import { Pressable } from './motion';
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

/** The top of every screen on the website: the limited version's bar, or the offer of the other version. */
export function WebsiteBanner() {
  const offer = useOtherVersion();
  if (offer) return <SwitchBanner />;
  return LIMITED ? <LimitedBanner /> : null;
}

/** Asked again when you come back to the tab, and every five minutes while it's in view. */
const BACK_GAP = 30_000;
const EVERY = 5 * 60_000;

/** Whether the server's latest answer is a different version from the one this page is. */
function useOtherVersion(): boolean {
  const differs = () => {
    const latest = latestAnswer();
    return latest !== null && latest !== serverAnswered();
  };
  const [offer, setOffer] = useState(() => WEBSITE_AUTO && differs());
  useEffect(() => {
    if (!WEBSITE_AUTO || typeof document === 'undefined') return;
    const stop = onServerAnswer(() => setOffer(differs()));
    const inView = () => document.visibilityState === 'visible';
    const back = () => {
      if (inView()) askAgainAfter(BACK_GAP);
    };
    document.addEventListener('visibilitychange', back);
    const timer = setInterval(() => {
      if (inView()) askAgainAfter(EVERY - 1000);
    }, EVERY);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', back);
      clearInterval(timer);
    };
  }, []);
  return offer;
}

function SwitchBanner() {
  const insets = useSafeAreaInsets();
  const toFull = LIMITED;
  const text = toFull
    ? 'The full GymGO is on now: accounts, reviews, members’ photos and GymPal.'
    : 'GymGO’s server has gone offline. Until it’s back, the limited version works without it.';
  const label = toFull ? 'Switch to the full version' : 'Switch to the limited version';
  return (
    <View style={[styles.bar, styles.row, { paddingTop: insets.top + space[2] }]} aria-live="polite">
      <Txt variant="footnote" color={ink()} style={styles.grow}>
        {text}
      </Txt>
      <Pressable
        onPress={() => {
          haptic.tap();
          if (typeof window !== 'undefined') window.location.reload();
        }}
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={8}
        style={({ pressed }) => [styles.switch, pressed && styles.pressed]}
      >
        <Txt variant="footnote" color={color.onBrand} style={face('semibold')}>
          Switch
        </Txt>
      </Pressable>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  grow: { flex: 1, minWidth: 0 },
  switch: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: space[3],
    borderRadius: radius.pill,
    backgroundColor: color.brandFill,
  },
  pressed: { opacity: 0.85 },
}));
