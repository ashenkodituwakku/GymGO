/**
 * Welcome back: straight after signing in again (a new account has the
 * welcome tour instead). Your name, when you last trained, and where you
 * are: this week against your goal, your weeks in a row, your last workout
 * and the gyms you've collected (lib/welcomeBack.ts), each card arriving in
 * turn. Then on to wherever you were going (a link opened before signing
 * in), or Home; or straight to a workout.
 *
 * On the tour's background of soft colour (components/Aurora.tsx). With
 * Reduce Motion everything is simply there.
 */

import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useMemo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown, ReduceMotion, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Aurora } from '@/components/Aurora';
import { Avatar } from '@/components/Avatar';
import { CountUp } from '@/components/CountUp';
import { Icon, type IconName } from '@/components/Icon';
import { EASE_OUT, Pressable } from '@/components/motion';
import { ProgressRing } from '@/components/ProgressRing';
import { useGlassRedraw } from '@/components/Redrawn';
import { ScreenOptions } from '@/components/ScreenOptions';
import { PrimaryButton, Txt } from '@/components/ui';
import { useApp } from '@/lib/app-state';
import { collectionStats } from '@/lib/collection';
import { haptic } from '@/lib/haptics';
import { usePageTitle } from '@/lib/pageTitle';
import { color, dropShadow, face, radius, space, themed } from '@/lib/theme';
import { useCollection } from '@/lib/useCollection';
import { useTrainingLog } from '@/lib/useTraining';
import { recapOf } from '@/lib/welcomeBack';

/** Each piece's arrival: down into place, a beat after the one before. */
const arrive = (delay: number) => FadeInDown.duration(560).delay(delay).easing(EASE_OUT).reduceMotion(ReduceMotion.System);

export default function WelcomeBackScreen() {
  useGlassRedraw();
  usePageTitle('Welcome back');
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { account, prefs } = useApp();
  const log = useTrainingLog(account.token);
  const collection = useCollection();
  const me = account.account;
  const ready = log.status !== 'loading';
  const recap = useMemo(
    () => recapOf({ name: me?.displayName ?? null, sessions: log.sessions, weeklyGoal: prefs.weeklyGoal, gyms: collectionStats(collection.gyms).gyms }),
    [me?.displayName, log.sessions, prefs.weeklyGoal, collection.gyms],
  );
  const words = recap.greeting.split(' ');
  const titleSize = width >= 700 ? 56 : width >= 380 ? 38 : 32;

  const onward = () => {
    haptic.success();
    router.replace((next && next.startsWith('/') && !next.startsWith('//') ? next : '/') as Href);
  };

  return (
    <View style={[styles.page, { paddingTop: insets.top, paddingBottom: insets.bottom + space[3] }]}>
      <Aurora />
      <ScreenOptions options={{ headerShown: false }} />
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={ZoomIn.springify().damping(14).stiffness(140).reduceMotion(ReduceMotion.System)} style={styles.avatar}>
          {me ? <Avatar account={me} size={92} variant="largeTitle" /> : null}
        </Animated.View>
        <View style={styles.title} accessible accessibilityRole="header" accessibilityLabel={recap.greeting}>
          {words.map((word, index) => (
            <Animated.View key={`${word}-${index}`} entering={arrive(180 + index * 110)}>
              <Txt variant="largeTitle" color={index === words.length - 1 && words.length > 2 ? color.brand : color.label} style={[styles.titleWord, { fontSize: titleSize, lineHeight: Math.round(titleSize * 1.12) }]}>
                {word}
              </Txt>
            </Animated.View>
          ))}
        </View>
        <Animated.View entering={arrive(520)}>
          <Txt variant="body" color={color.labelSecondary} style={styles.center}>
            {ready ? recap.line : 'Loading your workouts…'}
          </Txt>
        </Animated.View>

        <View style={styles.grid}>
          <Card delay={700} half label={recap.week.goal ? `This week: ${recap.week.done} of ${recap.week.goal} workouts` : `This week: ${recap.week.done} workouts`}>
            <ProgressRing size={54} stroke={6} progress={recap.week.goal ? Math.min(1, recap.week.done / recap.week.goal) : recap.week.done > 0 ? 1 : 0} track={color.fill} tint={color.brand}>
              <Icon name="calendar" size={18} color={color.brand} />
            </ProgressRing>
            <View style={styles.flex}>
              <Txt variant="footnote" color={color.labelSecondary}>
                This week
              </Txt>
              <View style={styles.figureRow}>
                <Figure id="welcomeBack.week" value={recap.week.done} ready={ready} />
                <Txt variant="subhead" color={color.labelSecondary}>
                  {recap.week.goal ? `of ${recap.week.goal}` : recap.week.done === 1 ? 'workout' : 'workouts'}
                </Txt>
              </View>
            </View>
          </Card>
          <Card delay={800} half label={`${recap.streak} ${recap.streak === 1 ? 'week' : 'weeks'} in a row`}>
            <Badge icon="flame" tint={color.maybeTint} ink={color.maybeInk} />
            <View style={styles.flex}>
              <Txt variant="footnote" color={color.labelSecondary}>
                In a row
              </Txt>
              <View style={styles.figureRow}>
                <Figure id="welcomeBack.streak" value={recap.streak} ready={ready} />
                <Txt variant="subhead" color={color.labelSecondary}>
                  {recap.streak === 1 ? 'week' : 'weeks'}
                </Txt>
              </View>
            </View>
          </Card>
          {recap.last && (
            <Card delay={900} label={`Last workout: ${recap.last.name}, ${recap.last.when}, ${recap.last.detail}`} onPress={() => router.push({ pathname: '/feed/[id]', params: { id: recap.last!.id } })}>
              <Badge icon="workout" tint={color.brandWash} ink={color.brand} />
              <View style={styles.flex}>
                <Txt variant="footnote" color={color.labelSecondary}>
                  {`Last workout · ${recap.last.when}`}
                </Txt>
                <Txt variant="headline" numberOfLines={1}>
                  {recap.last.name}
                </Txt>
                <Txt variant="footnote" color={color.labelSecondary}>
                  {recap.last.detail}
                </Txt>
              </View>
              <Icon name="chevron" size={13} color={color.labelTertiary} />
            </Card>
          )}
          <Card delay={recap.last ? 1000 : 900} label={recap.gyms > 0 ? `${recap.gyms} ${recap.gyms === 1 ? 'gym' : 'gyms'} collected` : 'Your collection. Check in at a gym to get your first card.'} onPress={() => router.push('/collection')}>
            <Badge icon="cards" tint={color.goodTint} ink={color.goodInk} />
            <View style={styles.flex}>
              <Txt variant="footnote" color={color.labelSecondary}>
                Your collection
              </Txt>
              {recap.gyms > 0 ? (
                <View style={styles.figureRow}>
                  <Figure id="welcomeBack.gyms" value={recap.gyms} ready />
                  <Txt variant="subhead" color={color.labelSecondary}>
                    {recap.gyms === 1 ? 'gym collected' : 'gyms collected'}
                  </Txt>
                </View>
              ) : (
                // None yet: how to get the first, not a zero.
                <Txt variant="subhead" style={face('semibold')}>
                  Check in at a gym to get your first card
                </Txt>
              )}
            </View>
            <Icon name="chevron" size={13} color={color.labelTertiary} />
          </Card>
        </View>
      </ScrollView>

      <Animated.View entering={arrive(1050)} style={styles.actions}>
        <PrimaryButton label="Continue" icon="check" onPress={onward} />
        <PrimaryButton
          label="Start workout"
          tone="quiet"
          onPress={() => {
            haptic.select();
            router.replace('/train');
          }}
        />
      </Animated.View>
    </View>
  );
}

/** A figure that counts up once the log is in (a dash until then). */
function Figure({ id, value, ready }: { id: string; value: number; ready: boolean }) {
  return ready ? (
    <CountUp id={id} value={value} variant="title" style={[face('bold'), styles.tabular]} />
  ) : (
    <Txt variant="title" color={color.labelTertiary} style={face('bold')}>
      –
    </Txt>
  );
}

function Badge({ icon, tint, ink }: { icon: IconName; tint: string; ink: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: tint }]}>
      <Icon name={icon} size={22} color={ink} />
    </View>
  );
}

/** One card of the recap, arriving in its turn; a link when it goes somewhere. */
function Card({ delay, half = false, label, onPress, children }: { delay: number; half?: boolean; label: string; onPress?: () => void; children: ReactNode }) {
  const body = <View style={styles.cardBody}>{children}</View>;
  return (
    <Animated.View entering={arrive(delay)} style={[styles.cardSlot, half && styles.half]}>
      {onPress ? (
        <Pressable
          onPress={() => {
            haptic.select();
            onPress();
          }}
          accessibilityRole="link"
          accessibilityLabel={label}
          style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
        >
          {body}
        </Pressable>
      ) : (
        <View style={styles.card} accessible accessibilityLabel={label}>
          {body}
        </View>
      )}
    </Animated.View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    flex: { flex: 1, minWidth: 0 },
    center: { textAlign: 'center' },
    tabular: { fontVariant: ['tabular-nums'] },
    content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', gap: space[4], padding: space[6], width: '100%', maxWidth: 560, alignSelf: 'center' },
    avatar: { borderRadius: 60, shadowColor: '#2A1E73', shadowOpacity: 0.3, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
    title: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 10 },
    titleWord: { letterSpacing: -0.8, ...face('bold') },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3], width: '100%', marginTop: space[2] },
    cardSlot: { width: '100%' },
    half: { width: '48%', flexGrow: 1 },
    card: { borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: color.plate, borderWidth: StyleSheet.hairlineWidth, borderColor: color.separator, ...dropShadow(0.08, 20, 6, 3) },
    cardBody: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[4] },
    badge: { width: 48, height: 48, borderRadius: 16, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
    figureRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
    actions: { gap: space[2], paddingHorizontal: space[4], paddingTop: space[2], width: '100%', maxWidth: 480, alignSelf: 'center' },
  }),
);
