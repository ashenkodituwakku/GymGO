/**
 * A gentle reminder about GymGO Pro for a free account (lib/proNudge.ts):
 * a small card on Home (at the top on a phone, clear of the tab bar; at the
 * foot of the page beside a docked sidebar, clear of the greeting), at most once every
 * three days and never on your first day, after a random wait of 8 to 20
 * seconds there. It doesn't block anything: the page under it still works,
 * it goes away by itself after 20 seconds, and Not now or See Pro closes it.
 *
 * Never during a workout, never on the limited website, and only where Pro
 * can be bought (as the Profile and sidebar cards).
 */

import { usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown, FadeInUp, FadeOutDown, FadeOutUp, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActiveSessionGlance } from '@/lib/activeSession';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { LIMITED } from '@/lib/limited';
import { navMode, sidebarInset } from '@/lib/navLayout';
import { nudgeDue, nudgeStore, nudgeWait } from '@/lib/proNudge';
import { CAN_BUY_HERE } from '@/lib/purchase';
import { useThemeChoice } from '@/lib/themePrefs';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';
import { BrandFill } from './BrandFill';
import { Icon } from './Icon';
import { EASE_OUT, Pressable } from './motion';
import { useThemeVersion } from './Redrawn';
import { Txt } from './ui';

/** How long it stays if left alone. */
const SHOWN_FOR = 20_000;

export function ProNudge() {
  // Your accent: drawn again when it changes.
  useThemeVersion();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { nav } = useThemeChoice();
  const { account, billing, openPro } = useApp();
  const active = useActiveSessionGlance();
  const state = nudgeStore.use();
  const [shown, setShown] = useState(false);
  const canBuy = CAN_BUY_HERE && billing.sale === 'on';
  const eligible = !LIMITED && Boolean(account.token) && billing.planKnown && !billing.isPro && canBuy;
  const onHome = pathname === '/';
  const trialDays = billing.trial?.days ?? null;

  // The first day this device sees a free account it could remind: the clock for "not on day one" starts.
  useEffect(() => {
    if (!eligible) return;
    void nudgeStore.ready().then(() => {
      if (nudgeStore.get().firstSeen === null) nudgeStore.update((now) => ({ ...now, firstSeen: Date.now() }));
    });
  }, [eligible]);

  // Due, on Home, nothing going on: wait a while, then show (and count it as shown then).
  const due = eligible && onHome && !active && nudgeDue(state, Date.now());
  useEffect(() => {
    if (!due || shown) return;
    const timer = setTimeout(() => {
      nudgeStore.update((now) => ({ ...now, lastShown: Date.now() }));
      setShown(true);
    }, nudgeWait(Math.random()));
    return () => clearTimeout(timer);
  }, [due, shown]);

  // Gone by itself after a while, or as soon as you leave Home or start a workout.
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!shown) return;
    leaveTimer.current = setTimeout(() => setShown(false), SHOWN_FOR);
    return () => {
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
    };
  }, [shown]);
  useEffect(() => {
    if (shown && (!onHome || active || !eligible)) setShown(false);
  }, [shown, onHome, active, eligible]);

  if (!shown) return null;
  const mode = navMode(nav, width, Platform.OS === 'web');
  const left = insets.left + sidebarInset(mode, pathname, true);
  // Beside a docked sidebar the page's foot is free (Verity's button is in the corner, past the card); on a phone, the top.
  const atFoot = mode === 'docked';
  const place = atFoot ? { bottom: insets.bottom + space[5] } : { top: insets.top + space[3] };
  const line = trialDays ? `Try it free for ${trialDays} days. Gyms in every country, and no limit on saved gyms.` : 'Gyms in every country, no limit on saved gyms, and a chart for every exercise.';

  return (
    <View pointerEvents="box-none" style={[styles.layer, place, { left: left + space[3], right: insets.right + space[3] }]}>
      <Animated.View
        entering={(atFoot ? FadeInDown : FadeInUp).duration(380).easing(EASE_OUT).reduceMotion(ReduceMotion.System)}
        exiting={(atFoot ? FadeOutDown : FadeOutUp).duration(240).reduceMotion(ReduceMotion.System)}
        style={styles.card}
        accessibilityLiveRegion="polite"
        role="region"
        accessibilityLabel="GymGO Pro"
      >
        <BrandFill round={radius.lg} />
        <View style={styles.mark}>
          <Icon name="crown" size={18} color={color.onBrand} />
        </View>
        <View style={styles.flex}>
          <Txt variant="headline" color={color.onBrand} style={face('bold')}>
            GymGO Pro
          </Txt>
          <Txt variant="footnote" color={color.onBrandSoft}>
            {line}
          </Txt>
          <View style={styles.actions}>
            <Pressable
              onPress={() => {
                haptic.select();
                setShown(false);
                openPro();
              }}
              accessibilityRole="button"
              style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]}
            >
              <Txt variant="subhead" color={color.brandFill} style={face('bold')}>
                See Pro
              </Txt>
            </Pressable>
            <Pressable
              onPress={() => {
                haptic.select();
                setShown(false);
              }}
              accessibilityRole="button"
              hitSlop={6}
              style={({ pressed }) => [styles.quiet, pressed && { opacity: 0.7 }]}
            >
              <Txt variant="subhead" color={color.onBrand} style={face('semibold')}>
                Not now
              </Txt>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    // Over the top of Home, centred in the page beside any sidebar.
    layer: { position: 'absolute', alignItems: 'center', zIndex: 50 },
    card: {
      flexDirection: 'row',
      gap: space[3],
      width: '100%',
      maxWidth: 440,
      padding: space[4],
      borderRadius: radius.lg,
      borderCurve: 'continuous',
      backgroundColor: color.brandFill,
      ...shadow.float,
    },
    mark: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.2)' },
    flex: { flex: 1, minWidth: 0, gap: 2 },
    actions: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginTop: space[2] },
    primary: { minHeight: 36, justifyContent: 'center', paddingHorizontal: space[4], borderRadius: radius.pill, backgroundColor: color.onBrand },
    quiet: { minHeight: 36, justifyContent: 'center', paddingHorizontal: space[2], borderRadius: radius.pill },
  }),
);
