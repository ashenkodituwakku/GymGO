/**
 * Skeletons: soft grey shapes where content is on its way, so a screen shows
 * its layout at once instead of a spinner, and doesn't jump when the content
 * arrives. They pulse gently; with Reduce Motion on, they hold still.
 *
 * `Skeleton` pulses everything inside it together (one animation for the
 * lot), `Bone` is one shape, and the ready-made ones below are drawn to the
 * size of what they stand in for: a gym's page, rows of gyms, gym cards,
 * reviews, and list rows.
 */

import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, ReduceMotion, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { CURVES } from '@/components/motion';
import { color, radius, shadow, space, themed } from '@/lib/theme';

export function Skeleton({ children, label = 'Loading', style }: { children: ReactNode; label?: string; style?: StyleProp<ViewStyle> }) {
  const glow = useSharedValue(1);
  useEffect(() => {
    glow.value = withRepeat(
      withTiming(0.45, { duration: 850, ...(CURVES ? { easing: Easing.inOut(Easing.quad) } : {}), reduceMotion: ReduceMotion.System }),
      -1,
      true,
      undefined,
      ReduceMotion.System,
    );
    return () => cancelAnimation(glow);
  }, [glow]);
  const pulse = useAnimatedStyle(() => ({ opacity: glow.value }));
  return (
    <Animated.View style={[pulse, style]} accessible accessibilityRole="progressbar" accessibilityLabel={label} aria-busy>
      {children}
    </Animated.View>
  );
}

/** One grey shape. */
export function Bone({ width = '100%', height = 14, round = 6, style }: { width?: DimensionValue; height?: number; round?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ width, height, borderRadius: round, backgroundColor: color.fill }, style]} />;
}

/** A gym's page while it's found: the photo, its name, the answer pills, then a card of facts. */
export function GymPageSkeleton() {
  return (
    <Skeleton label="Loading this gym" style={styles.page}>
      <Bone height={230} round={0} />
      <View style={styles.pageBody}>
        <Bone width="72%" height={30} round={8} />
        <Bone width="46%" height={16} />
        <View style={styles.pills}>
          <Bone width={96} height={30} round={15} />
          <Bone width={80} height={30} round={15} />
          <Bone width={110} height={30} round={15} />
        </View>
        <View style={styles.card}>
          {[0.8, 0.65, 0.72, 0.5].map((share, index) => (
            <View key={index} style={styles.row}>
              <Bone width={29} height={29} round={7} />
              <View style={styles.lines}>
                <Bone width={`${share * 100}%`} height={15} />
                <Bone width={`${share * 60}%`} height={12} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </Skeleton>
  );
}

/** Rows of gyms, as in the results list: photo, name, place, the answer, the price. */
export function GymRowsSkeleton({ count = 3, label = 'Finding gyms' }: { count?: number; label?: string }) {
  return (
    <Skeleton label={label} style={styles.rows}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={styles.gymRow}>
          <Bone width={62} height={62} round={12} />
          <View style={styles.lines}>
            <Bone width={`${70 - index * 8}%`} height={17} />
            <Bone width="45%" height={13} />
            <Bone width={84} height={22} round={11} />
          </View>
          <Bone width={44} height={20} />
        </View>
      ))}
    </Skeleton>
  );
}

/** Gym cards side by side, as on Home. */
export function GymCardsSkeleton({ count = 2, width = 216, label = 'Finding gyms' }: { count?: number; width?: number; label?: string }) {
  return (
    <Skeleton label={label} style={styles.cards}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={[styles.gymCard, { width }]}>
          <Bone height={118} round={0} />
          <View style={styles.cardBody}>
            <Bone width="75%" height={17} />
            <Bone width="50%" height={13} />
            <Bone width={78} height={22} round={11} />
          </View>
        </View>
      ))}
    </Skeleton>
  );
}

/** Reviews: who, their stars, and a few lines. */
export function ReviewsSkeleton({ count = 2 }: { count?: number }) {
  return (
    <Skeleton label="Loading reviews" style={styles.reviews}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={styles.review}>
          <View style={styles.reviewHead}>
            <Bone width={32} height={32} round={16} />
            <View style={styles.lines}>
              <Bone width="40%" height={14} />
              <Bone width={84} height={12} />
            </View>
          </View>
          <Bone width="100%" height={13} />
          <Bone width="92%" height={13} />
          <Bone width="64%" height={13} />
        </View>
      ))}
    </Skeleton>
  );
}

/** Rows in a grouped list, as on Progress and My workouts. */
export function ListSkeleton({ rows = 4, label = 'Loading', card = true }: { rows?: number; label?: string; card?: boolean }) {
  return (
    <Skeleton label={label} style={card ? styles.card : styles.bare}>
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={styles.row}>
          <Bone width={29} height={29} round={7} />
          <View style={styles.lines}>
            <Bone width={`${66 - (index % 3) * 12}%`} height={15} />
            <Bone width={`${40 - (index % 2) * 10}%`} height={12} />
          </View>
        </View>
      ))}
    </Skeleton>
  );
}

/** A few lines of text, for a small spot on a page. */
export function LinesSkeleton({ lines = 2, label = 'Loading' }: { lines?: number; label?: string }) {
  return (
    <Skeleton label={label} style={styles.textLines}>
      {Array.from({ length: lines }, (_, index) => (
        <Bone key={index} width={index === lines - 1 ? '60%' : '100%'} height={13} />
      ))}
    </Skeleton>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    pageBody: { padding: space[4], gap: space[3] },
    pills: { flexDirection: 'row', gap: space[2], flexWrap: 'wrap' },
    card: { gap: space[4], padding: space[4], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.card, ...shadow.plate },
    bare: { gap: space[4] },
    row: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
    lines: { flex: 1, gap: 7 },
    rows: { gap: space[1] },
    gymRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3], paddingHorizontal: space[3] },
    cards: { flexDirection: 'row', gap: space[3] },
    gymCard: { borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: color.card, ...shadow.plate },
    cardBody: { padding: space[3], gap: 8 },
    reviews: { gap: space[4] },
    review: { gap: 8 },
    reviewHead: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginBottom: 2 },
    textLines: { gap: 8 },
  }),
);
