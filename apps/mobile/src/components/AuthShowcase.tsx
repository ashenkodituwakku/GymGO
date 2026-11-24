/**
 * Beside the sign-in form on a wide screen: what GymGO is, on the logo's
 * deep violet, with its three things and three sample cards drifting at
 * the foot (components/SampleCard.tsx, no gym in particular). On a phone,
 * `AuthPerks` says the same in a line of three under the heading, when
 * making an account. Decoration and a summary: the form beside it is what
 * matters, so a screen reader hears the panel as one short passage.
 */

import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { AppBadge } from './BrandMark';
import { Icon, type IconName } from './Icon';
import { EASE_IN_OUT, EASE_OUT, useCalm } from './motion';
import { SAMPLE_CARDS, SampleCard } from './SampleCard';
import { Txt } from './ui';
import { color, face, radius, space, themed } from '@/lib/theme';

const THINGS: Array<{ icon: IconName; title: string; line: string }> = [
  { icon: 'door', title: 'Gyms that let you in', line: 'Visit prices, guest hours and what to bring, as each gym publishes them.' },
  { icon: 'workout', title: 'A plan for the kit there', line: 'Tap the muscles you want, tick off your sets, and watch your records climb.' },
  { icon: 'cards', title: 'A card for every gym', line: 'Check in for its card. Every visit rolls a rarity.' },
];

const SOFT = 'rgba(255, 255, 255, 0.74)';

export function AuthShowcase({ mode }: { mode: 'sign_in' | 'create' }) {
  const summary = `GymGO. ${THINGS.map((thing) => `${thing.title}: ${thing.line}`).join(' ')}`;
  return (
    <View style={styles.panel} accessible accessibilityLabel={summary}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="authPanel" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#4A35B5" />
            <Stop offset="0.55" stopColor="#2A1E73" />
            <Stop offset="1" stopColor="#0E0A22" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#authPanel)" />
      </Svg>
      <View style={styles.brand}>
        <AppBadge size={40} />
        <Txt variant="title2" color="#FFFFFF" style={face('bold')}>
          GymGO
        </Txt>
      </View>
      <Txt variant="largeTitle" color="#FFFFFF" style={styles.headline}>
        {mode === 'create' ? 'Find a gym. Train. Collect it.' : 'Good to see you again.'}
      </Txt>
      <View style={styles.things}>
        {THINGS.map((thing, index) => (
          <Animated.View key={thing.title} entering={FadeInDown.duration(480).delay(200 + index * 140).easing(EASE_OUT).reduceMotion(ReduceMotion.System)} style={styles.thing}>
            <View style={styles.thingIcon}>
              <Icon name={thing.icon} size={20} color="#FFFFFF" />
            </View>
            <View style={styles.flex}>
              <Txt variant="headline" color="#FFFFFF">
                {thing.title}
              </Txt>
              <Txt variant="subhead" color={SOFT}>
                {thing.line}
              </Txt>
            </View>
          </Animated.View>
        ))}
      </View>
      <View style={styles.flex} />
      <View style={styles.cards}>
        {SAMPLE_CARDS.map((card, index) => (
          <Drifting key={card.label} index={index} label={card.label} colors={card.colors} />
        ))}
      </View>
    </View>
  );
}

/** One of the three cards at the foot, fanned, rising and falling a little out of step with the others. */
function Drifting({ index, label, colors }: { index: number; label: string; colors: [string, string, string] }) {
  const calm = useCalm();
  const lift = useSharedValue(0);
  useEffect(() => {
    if (calm) return;
    lift.value = withDelay(index * 500, withRepeat(withSequence(withTiming(1, { duration: 2400, easing: EASE_IN_OUT }), withTiming(0, { duration: 2400, easing: EASE_IN_OUT })), -1));
  }, [calm, index, lift]);
  const side = index - 1;
  const style = useAnimatedStyle(() => ({
    zIndex: side === 0 ? 2 : 1,
    transform: [{ translateX: side * 84 }, { translateY: (side === 0 ? -14 : 10) - lift.value * 8 }, { rotate: `${side * 12}deg` }],
  }));
  return (
    <Animated.View style={[styles.card, style]}>
      <SampleCard width={118} height={166} label={label} colors={colors} />
    </Animated.View>
  );
}

/** On a phone, making an account: what comes with one, free, in three. */
export function AuthPerks() {
  const perks: Array<{ icon: IconName; label: string }> = [
    { icon: 'saved', label: 'Save gyms' },
    { icon: 'workout', label: 'Log workouts' },
    { icon: 'cards', label: 'Collect cards' },
  ];
  return (
    <View style={styles.perks} accessible accessibilityLabel="Free with an account: save gyms, log workouts, collect cards">
      {perks.map((perk, index) => (
        <Animated.View key={perk.label} entering={FadeInDown.duration(420).delay(120 + index * 110).easing(EASE_OUT).reduceMotion(ReduceMotion.System)} style={styles.perk}>
          <Icon name={perk.icon} size={13} color={color.brand} />
          <Txt variant="caption" color={color.label} style={face('semibold')}>
            {perk.label}
          </Txt>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    panel: { flex: 1, minHeight: 600, padding: space[8], gap: space[6], borderRadius: radius.xl * 1.5, borderCurve: 'continuous', overflow: 'hidden' },
    brand: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
    headline: { fontSize: 44, lineHeight: 50, letterSpacing: -0.6, maxWidth: 440, ...face('bold') },
    things: { gap: space[4], maxWidth: 440 },
    thing: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
    thingIcon: { width: 40, height: 40, borderRadius: 12, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.14)' },
    flex: { flex: 1, minWidth: 0 },
    cards: { height: 200, alignItems: 'center', justifyContent: 'center' },
    card: { position: 'absolute' },
    perks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: space[1] },
    // Three to a line on a 360-point phone.
    perk: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: color.brandWash },
  }),
);
