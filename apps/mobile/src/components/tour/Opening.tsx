/**
 * The tour's first two parts (app/welcome.tsx).
 *
 * The opening: the badge, GymGO's name and its three words, with three
 * tokens (a door, a lifter, a card) floating round it. Scrolling flies you
 * through it: the badge grows past you, the tokens scatter outward and the
 * name lifts away.
 *
 * The statement: what GymGO does, in one large paragraph whose words light
 * up one after another as you scroll, the key ones in GymGO's violet.
 */

import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion, interpolate, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import { AppBadge } from '../BrandMark';
import { Icon, type IconName } from '../Icon';
import { EASE_IN_OUT, EASE_OUT } from '../motion';
import { Txt } from '../ui';
import { Pinned, eased, smooth } from './kit';
import { color, face, space, themed } from '@/lib/theme';

const TOKENS: Array<{ icon: IconName; angle: number }> = [
  { icon: 'door', angle: -150 },
  { icon: 'workout', angle: -30 },
  { icon: 'cards', angle: 90 },
];

export function Opening({ screen, scrollY, calm, width, onPlace }: { screen: number; scrollY: SharedValue<number>; calm: boolean; width: number; onPlace: (top: number, height: number) => void }) {
  return (
    <Pinned screen={screen} scrollY={scrollY} calm={calm} length={1.35} onPlace={onPlace}>
      {({ progress }) => <OpeningStage progress={progress} calm={calm} width={width} screen={screen} />}
    </Pinned>
  );
}

function OpeningStage({ progress, calm, width, screen }: { progress: SharedValue<number>; calm: boolean; width: number; screen: number }) {
  const big = width >= 700;
  const titleSize = big ? 84 : width >= 380 ? 50 : 42;
  const orbit = big ? 170 : Math.min(130, width * 0.32);
  // Flying through: the badge grows past you as the name lifts away.
  // With Reduce Motion the opening is shown as it opens (finished, for it, would be flown past and gone).
  const badge = useAnimatedStyle(() => {
    if (calm) return {};
    // Still there as the statement comes up under it: it fades only once it's well past you.
    const t = smooth(progress.value, 0, 1);
    return { opacity: interpolate(progress.value, [0.55, 1], [1, 0], 'clamp'), transform: [{ scale: 1 + t * 3.2 }] };
  });
  const title = useAnimatedStyle(() => {
    if (calm) return {};
    const t = eased(progress.value, 0, 0.75);
    return { opacity: 1 - t, transform: [{ translateY: -t * 70 }, { scale: 1 + t * 0.15 }] };
  });
  const hint = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0, 0.12], [1, 0], 'clamp') }));
  // "Scroll" nods until you do.
  const nod = useSharedValue(0);
  useEffect(() => {
    if (!calm) nod.value = withDelay(1600, withRepeat(withSequence(withTiming(7, { duration: 650, easing: EASE_OUT }), withTiming(0, { duration: 650 })), -1));
  }, [calm, nod]);
  const nodding = useAnimatedStyle(() => ({ transform: [{ translateY: nod.value }] }));
  const arrive = FadeInDown.duration(700).easing(EASE_OUT).reduceMotion(ReduceMotion.System);
  const words = ['Find a gym.', 'Train.', 'Collect it.'];

  return (
    <View style={styles.stage}>
      <View style={[styles.core, { height: orbit * 2 + 40 }]}>
        {TOKENS.map((token, index) => (
          <Token key={token.icon} icon={token.icon} angle={token.angle} orbit={orbit} index={index} progress={progress} calm={calm} />
        ))}
        <Animated.View entering={arrive} style={[styles.badge, badge]}>
          <AppBadge size={big ? 120 : 96} />
        </Animated.View>
      </View>
      <Animated.View style={[styles.words, title]}>
        <Animated.View entering={FadeInDown.duration(700).delay(150).easing(EASE_OUT).reduceMotion(ReduceMotion.System)}>
          <Txt variant="largeTitle" style={[styles.title, { fontSize: titleSize, lineHeight: Math.round(titleSize * 1.08) }]} accessibilityRole="header" level={2}>
            Welcome to GymGO
          </Txt>
        </Animated.View>
        <View style={styles.tagline} accessible accessibilityLabel={words.join(' ')}>
          {words.map((word, index) => (
            <Animated.View key={word} entering={FadeInDown.duration(560).delay(450 + index * 200).easing(EASE_OUT).reduceMotion(ReduceMotion.System)}>
              <Txt variant="title2" color={index === 2 ? color.brand : color.labelSecondary} style={face('semibold')}>
                {word}
              </Txt>
            </Animated.View>
          ))}
        </View>
      </Animated.View>
      {/* Only where there's room under the words for it. */}
      {!calm && screen >= 620 && (
        <Animated.View style={[styles.hint, hint]} aria-hidden>
          <Txt variant="footnote" color={color.labelSecondary} style={face('medium')}>
            Scroll to explore
          </Txt>
          <Animated.View style={[styles.down, nodding]}>
            <Icon name="chevron" size={14} color={color.labelSecondary} />
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

/** One of the three tokens round the badge: floating gently, then scattering outward as you scroll. */
function Token({ icon, angle, orbit, index, progress, calm }: { icon: IconName; angle: number; orbit: number; index: number; progress: SharedValue<number>; calm: boolean }) {
  const bob = useSharedValue(0);
  useEffect(() => {
    if (!calm) bob.value = withDelay(index * 400, withRepeat(withTiming(1, { duration: 2600, easing: EASE_IN_OUT }), -1, true));
  }, [bob, calm, index]);
  const radians = (angle * Math.PI) / 180;
  const x = Math.cos(radians) * orbit;
  const y = Math.sin(radians) * orbit * 0.72;
  const style = useAnimatedStyle(() => {
    if (calm) return { transform: [{ translateX: x }, { translateY: y }] };
    const out = smooth(progress.value, 0, 0.7);
    return {
      opacity: 1 - eased(progress.value, 0.25, 0.65),
      transform: [{ translateX: x * (1 + out * 1.8) }, { translateY: y * (1 + out * 1.8) - bob.value * 8 }, { scale: 1 + out * 0.6 }],
    };
  });
  return (
    <Animated.View entering={FadeInDown.duration(600).delay(250 + index * 120).easing(EASE_OUT).reduceMotion(ReduceMotion.System)} style={styles.tokenSlot}>
      <Animated.View style={[styles.token, style]}>
        <Icon name={icon} size={24} color={color.brand} />
      </Animated.View>
    </Animated.View>
  );
}

// --- The statement ----------------------------------------------------------------

/** What GymGO does, in a paragraph. Words between asterisks light up in violet. */
const STATEMENT = 'Find gyms that will *let you in,* and what a visit *costs.* Know *what to do* when you get there. And *collect a card* for every gym you visit.';

export function Statement({ screen, scrollY, calm, width, onPlace }: { screen: number; scrollY: SharedValue<number>; calm: boolean; width: number; onPlace: (top: number, height: number) => void }) {
  // Between asterisks, the words that light up violet: split on them, then into words.
  const clean = STATEMENT.split('*').flatMap((segment, part) =>
    segment
      .split(' ')
      .filter(Boolean)
      .map((word) => ({ word, key: part % 2 === 1 })),
  );
  const size = width >= 900 ? 50 : width >= 380 ? 31 : 27;
  return (
    <Pinned screen={screen} scrollY={scrollY} calm={calm} length={1.7} overlap={0.45} onPlace={onPlace}>
      {({ progress }) => (
        <View style={styles.statementStage}>
          <View style={styles.statement} accessible accessibilityLabel={clean.map((item) => item.word).join(' ')}>
            {clean.map((item, index) => (
              <Word key={index} word={item.word} highlight={item.key} index={index} count={clean.length} progress={progress} size={size} />
            ))}
          </View>
        </View>
      )}
    </Pinned>
  );
}

function Word({ word, highlight, index, count, progress, size }: { word: string; highlight: boolean; index: number; count: number; progress: SharedValue<number>; size: number }) {
  const at = 0.05 + (index / count) * 0.8;
  const style = useAnimatedStyle(() => ({ opacity: 0.16 + eased(progress.value, at, at + 0.07) * 0.84 }));
  return (
    <Animated.Text aria-hidden style={[styles.word, { fontSize: size, lineHeight: Math.round(size * 1.22), color: highlight ? color.brand : color.label }, face('bold'), style]}>
      {`${word} `}
    </Animated.Text>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    stage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[4], paddingHorizontal: space[6] },
    core: { width: '100%', alignItems: 'center', justifyContent: 'center' },
    badge: { borderRadius: 26, shadowColor: '#2A1E73', shadowOpacity: 0.35, shadowRadius: 30, shadowOffset: { width: 0, height: 14 }, elevation: 12 },
    tokenSlot: { position: 'absolute' },
    token: {
      width: 58,
      height: 58,
      borderRadius: 20,
      borderCurve: 'continuous',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: color.plate,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color.separator,
      shadowColor: '#000000',
      shadowOpacity: 0.1,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    words: { alignItems: 'center', gap: space[3] },
    title: { textAlign: 'center', letterSpacing: -1, ...face('bold') },
    tagline: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: space[2] },
    hint: { position: 'absolute', bottom: space[6], alignSelf: 'center', alignItems: 'center', gap: 2 },
    down: { transform: [{ rotate: '90deg' }] },
    statementStage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[6] },
    statement: { flexDirection: 'row', flexWrap: 'wrap', maxWidth: 860 },
    word: { letterSpacing: -0.4 },
  }),
);
