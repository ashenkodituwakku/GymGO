/**
 * "Is it busy?" on a gym's page, from members there now (domain busy.ts).
 *
 * A level shows only once 3 members have said so in the last hour, labelled
 * as theirs and how recent; until then it says how many have, and nothing
 * is guessed. To say how busy it is you have to be there: the same one-off
 * location check as collecting the gym (on the phone; the position is
 * never sent). The dev account can say so from anywhere, to try it.
 */

import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { BUSY_LEVELS, type BusyLevel, type GymLocation } from '@gymgo/domain';
import { api, problemText, type BusySummary } from '@/lib/api';
import { checkIn } from '@/lib/collection';
import { haptic } from '@/lib/haptics';
import { currentFix } from '@/lib/location';
import { distanceLabel } from '@/lib/places';
import type { AccountApi } from '@/lib/useAccount';
import { color, face, radius, space, themed } from '@/lib/theme';
import { Icon } from './Icon';
import { FADE_IN, GLIDE } from './motion';
import { ChoiceChip, PrimaryButton, Txt } from './ui';

const TONE: Record<BusyLevel, 'good' | 'maybe' | 'no'> = { quiet: 'good', steady: 'good', busy: 'maybe', packed: 'no' };

/** "12 min ago", "just now". */
export function minutesAgo(iso: string, now: number = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  return minutes < 1 ? 'just now' : `${minutes} min ago`;
}

export function MemberBusy({ location, account, onSignIn }: { location: GymLocation; account: AccountApi; onSignIn: () => void }) {
  const token = account.state === 'signed_in' ? account.token : null;
  const anywhere = account.account?.devTools === true;
  const [summary, setSummary] = useState<BusySummary | null>(null);
  const [picking, setPicking] = useState(false);
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .busy(location.id, token)
      .then(setSummary)
      .catch(() => setSummary(null));
  }, [location.id, token]);
  useEffect(() => {
    if (!location.isDemoData) load();
  }, [load, location.isDemoData]);

  if (location.isDemoData || !summary) return null;

  /** Before the levels show: are you there? */
  const start = async () => {
    if (!token) return onSignIn();
    setNotice(null);
    if (anywhere) return setPicking(true);
    setChecking(true);
    const fix = await currentFix(true, true);
    setChecking(false);
    if (fix === 'denied') return setNotice('Saying how busy it is needs your location, just this once, to check you’re there. It never leaves your phone.');
    if (fix === 'unavailable') return setNotice('Couldn’t find where you are just now. Try again in a moment.');
    const where = checkIn(fix, location.position);
    if (where.kind === 'far') return setNotice(`You’re ${distanceLabel(where.metres / 1000, location.address.countryCode)} away. Say how busy it is when you’re there.`);
    if (where.kind === 'rough') return setNotice('Your location is too rough here to tell you’re inside. Try again in a moment.');
    setPicking(true);
  };

  const say = async (level: BusyLevel) => {
    if (!token) return;
    try {
      await api.reportBusy(token, location.id, level);
      haptic.success();
      setPicking(false);
      setNotice('Thanks! It counts for the next hour, alongside other members’.');
      load();
    } catch (error) {
      haptic.warn();
      setNotice(problemText(error));
    }
  };

  const level = summary.level ? BUSY_LEVELS.find((item) => item.id === summary.level)! : null;
  const tone = summary.level ? TONE[summary.level] : null;
  const ink = tone === 'good' ? color.goodInk : tone === 'maybe' ? color.maybeInk : tone === 'no' ? color.noInk : color.labelSecondary;
  const tint = tone === 'good' ? color.goodTint : tone === 'maybe' ? color.maybeTint : tone === 'no' ? color.noTint : color.fill;

  // Nothing to show yet (most gyms, most of the time): one slim row, not a whole card.
  if (!level && !picking && !notice && !checking) {
    return (
      <Animated.View style={[styles.wrap, styles.slim]} layout={GLIDE}>
        <View style={[styles.badge, styles.badgeSmall, { backgroundColor: tint }]}>
          <Icon name="people" size={15} color={ink} />
        </View>
        <View style={styles.flex}>
          <Txt variant="subhead" style={styles.title}>
            Is it busy?
          </Txt>
          <Txt variant="caption" color={color.labelSecondary} numberOfLines={2}>
            {summary.count > 0
              ? `${summary.count} member${summary.count === 1 ? ' has' : 's have'} said in the last hour; it shows once ${summary.minimum} have.`
              : 'No one here has said in the last hour.'}
          </Txt>
        </View>
        <Pressable
          onPress={() => void start()}
          accessibilityRole="button"
          accessibilityLabel={token ? (summary.mine ? `You said ${summary.mine.level}. Change it` : 'Here now? Say how busy it is') : 'Sign in to say how busy it is'}
          style={({ pressed }) => [styles.pill, pressed && { opacity: 0.7 }]}
        >
          <Txt variant="footnote" color={color.brand} style={styles.title}>
            {!token ? 'Sign in' : summary.mine ? 'Change' : 'I’m here'}
          </Txt>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={styles.wrap} layout={GLIDE}>
      <View style={styles.head}>
        <View style={[styles.badge, { backgroundColor: tint }]}>
          <Icon name="people" size={18} color={ink} />
        </View>
        <View style={styles.flex}>
          <Txt variant="headline">{level ? `${level.label} right now` : 'Is it busy?'}</Txt>
          <Txt variant="footnote" color={color.labelSecondary}>
            {level
              ? `${level.detail}, say ${summary.count} members here in the last hour (latest ${minutesAgo(summary.latestAt!)}).`
              : summary.count > 0
                ? `${summary.count} member${summary.count === 1 ? ' has' : 's have'} said in the last hour. It shows once ${summary.minimum} have.`
                : 'No one here has said in the last hour.'}
          </Txt>
        </View>
      </View>
      {notice && (
        <Animated.View entering={FADE_IN}>
          <Txt variant="footnote" color={color.labelSecondary}>
            {notice}
          </Txt>
        </Animated.View>
      )}
      {picking ? (
        <Animated.View entering={FADE_IN} style={styles.levels}>
          {BUSY_LEVELS.map((item) => (
            <ChoiceChip key={item.id} label={item.label} selected={summary.mine?.level === item.id} onPress={() => void say(item.id)} />
          ))}
        </Animated.View>
      ) : (
        <PrimaryButton
          label={!token ? 'Sign in to say how busy it is' : checking ? 'Checking you’re here…' : summary.mine ? `You said ${summary.mine.level}: change it` : 'Here now? Say how busy it is'}
          tone="quiet"
          busy={checking}
          onPress={() => void start()}
        />
      )}
      {anywhere && !picking && (
        <Txt variant="caption" color={color.labelTertiary}>
          Dev account: you can say so from anywhere, to try it.
        </Txt>
      )}
    </Animated.View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    wrap: { gap: space[2], padding: space[4], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.card },
    head: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
    badge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    slim: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3] },
    badgeSmall: { width: 32, height: 32, borderRadius: 16 },
    pill: { paddingHorizontal: space[3], paddingVertical: 6, borderRadius: radius.pill, backgroundColor: color.brandTint },
    flex: { flex: 1, minWidth: 0, gap: 2 },
    levels: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    title: face('semibold'),
  }),
);
