/**
 * Training reminders: which days, what time, on or off (lib/reminders.ts).
 * A change is kept and the phone's notifications reset straight away, the
 * way iOS's own settings work: there's no Save.
 */

import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { HeroMark } from '@/components/HeroMark';
import { Icon } from '@/components/Icon';
import { EmojiIcon } from '@/components/Emoji';
import { Group, Row, TILE } from '@/components/ios';
import { PageScroll } from '@/components/PageScroll';
import { useGlassRedraw } from '@/components/Redrawn';
import { ScreenOptions } from '@/components/ScreenOptions';
import { Chip, Txt } from '@/components/ui';
import { timeLabel } from '@/lib/copy';
import { haptic } from '@/lib/haptics';
import { usePageTitle } from '@/lib/pageTitle';
import {
  DEFAULT_REMINDERS,
  WEEK_ORDER,
  applyReminders,
  loadReminders,
  remindersLine,
  remindersPossible,
  sortDays,
  type ReminderOutcome,
  type Reminders,
} from '@/lib/reminders';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';

const DAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const STEP = 15;
/** Times people train at, one tap away. */
const QUICK = [6 * 60, 7 * 60, 12 * 60, 17 * 60, 18 * 60, 19 * 60];

export default function RemindersScreen() {
  useGlassRedraw();
  usePageTitle('Reminders');
  const possible = remindersPossible();
  const [reminders, setReminders] = useState<Reminders | null>(null);
  const [outcome, setOutcome] = useState<ReminderOutcome | null>(null);
  useEffect(() => {
    let live = true;
    void loadReminders().then((kept) => live && setReminders(kept));
    return () => {
      live = false;
    };
  }, []);

  // Each change goes to the phone; a quick run of taps (the time stepped up four times) sends only the last.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const change = (next: Reminders) => {
    setReminders(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void applyReminders(next).then((result) => {
        setOutcome(result);
        // Refused: the switch goes back off, as the phone's answer says.
        if (result === 'denied') setReminders((current) => (current ? { ...current, on: false } : current));
      });
    }, 350);
  };
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const current = reminders ?? DEFAULT_REMINDERS;
  const toggleDay = (day: number) => {
    haptic.select();
    const days = current.days.includes(day) ? current.days.filter((d) => d !== day) : sortDays([...current.days, day]);
    // The last day off turns reminders off; the days stay as they are for next time.
    change({ ...current, days, on: current.on && days.length > 0 });
  };
  const setMinute = (minute: number) => change({ ...current, minute: ((minute % 1440) + 1440) % 1440 });

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content}>
      <ScreenOptions options={{ title: 'Reminders' }} />
      <View style={styles.hero}>
        <HeroMark icon="bell" />
        <Txt variant="title2" style={styles.center}>
          A nudge on training days
        </Txt>
        <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
          GymGO reminds you on the days you pick, even when it’s closed. Set on this phone: nothing is sent from a server.
        </Txt>
      </View>

      {!possible ? (
        <View style={styles.notice} accessible>
          <Icon name="info" size={18} color={color.labelSecondary} />
          <Txt variant="subhead" color={color.labelSecondary} style={styles.flex}>
            {/* The web, or Expo Go on Android, which can't load notifications. */}
            Reminders come from the GymGO app on your phone. This version of GymGO can’t send them.
          </Txt>
        </View>
      ) : (
        <>
          <Group footer={current.on ? `${remindersLine(current)}.` : current.days.length === 0 ? 'Pick at least one day.' : undefined}>
            <Row
              icon="bell"
              tile={TILE.red}
              title="Remind me to train"
              toggle={{
                value: current.on,
                onChange: (on) => {
                  if (on && current.days.length === 0) {
                    change({ ...current, on: true, days: DEFAULT_REMINDERS.days });
                    return;
                  }
                  change({ ...current, on });
                },
              }}
            />
          </Group>

          {outcome === 'denied' && (
            <View style={styles.notice}>
              <Icon name="warning" size={18} color={color.maybe} />
              <View style={styles.flex}>
                <Txt variant="subhead">Notifications are off for GymGO</Txt>
                <Txt variant="footnote" color={color.labelSecondary}>
                  Turn them on in your phone’s Settings, then switch reminders on again.
                </Txt>
                <Pressable onPress={() => void Linking.openSettings()} accessibilityRole="button" hitSlop={6} style={({ pressed }) => [styles.settings, pressed && { opacity: 0.6 }]}>
                  <Txt variant="subhead" color={color.brand} style={face('semibold')}>
                    Open Settings
                  </Txt>
                </Pressable>
              </View>
            </View>
          )}

          <Txt variant="footnote" color={color.labelSecondary} style={styles.section}>
            DAYS
          </Txt>
          <View style={styles.days}>
            {WEEK_ORDER.map((day) => {
              const on = current.days.includes(day);
              return (
                <Pressable
                  key={day}
                  onPress={() => toggleDay(day)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={DAY_NAME[day]}
                  hitSlop={4}
                  style={({ pressed }) => [styles.day, on && styles.dayOn, pressed && { opacity: 0.7 }]}
                >
                  <Txt variant="subhead" color={on ? color.onBrand : color.label} style={face('semibold')}>
                    {DAY_LETTER[day]}
                  </Txt>
                </Pressable>
              );
            })}
          </View>

          <Txt variant="footnote" color={color.labelSecondary} style={styles.section}>
            TIME
          </Txt>
          <View style={styles.time}>
            <View style={styles.clock}>
              <Stepper icon="minus" label={`Earlier: ${timeLabel((current.minute - STEP + 1440) % 1440)}`} onPress={() => setMinute(current.minute - STEP)} />
              <Txt variant="largeTitle" style={[styles.clockText, face('bold')]}>
                {timeLabel(current.minute)}
              </Txt>
              <Stepper icon="plus" label={`Later: ${timeLabel((current.minute + STEP) % 1440)}`} onPress={() => setMinute(current.minute + STEP)} />
            </View>
            <View style={styles.quick}>
              {QUICK.map((minute) => (
                <Chip key={minute} label={timeLabel(minute)} selected={current.minute === minute} onPress={() => setMinute(minute)} />
              ))}
            </View>
          </View>
          <Txt variant="footnote" color={color.labelSecondary} style={styles.note}>
            On your phone’s own clock, wherever you are.
          </Txt>
        </>
      )}
    </PageScroll>
  );
}

function Stepper({ icon, label, onPress }: { icon: 'minus' | 'plus'; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [styles.stepper, pressed && { opacity: 0.6 }]}
    >
      <EmojiIcon name={icon} size={16} />
    </Pressable>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], paddingBottom: space[8], width: '100%', maxWidth: 560, alignSelf: 'center' },
    hero: { alignItems: 'center', gap: space[2], paddingVertical: space[4], paddingHorizontal: space[2] },
    center: { textAlign: 'center' },
    flex: { flex: 1, minWidth: 0 },
    notice: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3], padding: space[4], marginBottom: space[4], borderRadius: radius.lg, backgroundColor: color.plate, ...shadow.plate },
    settings: { alignSelf: 'flex-start', marginTop: space[2], paddingVertical: space[1] },
    // As every settings list's headings (components/ios.tsx's Group).
    section: { marginLeft: space[4], marginBottom: space[2], marginTop: space[2], letterSpacing: 0.5, ...face('semibold') },
    days: { flexDirection: 'row', justifyContent: 'space-between', gap: 4, padding: space[3], marginBottom: space[4], borderRadius: radius.lg, backgroundColor: color.plate, ...shadow.plate },
    // Up to 40 points, smaller where seven don't fit (a 320-point phone has 264 for them).
    day: { flex: 1, maxWidth: 40, aspectRatio: 1, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: color.fill },
    dayOn: { backgroundColor: color.brandFill },
    time: { gap: space[3], padding: space[4], borderRadius: radius.lg, backgroundColor: color.plate, ...shadow.plate },
    clock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    clockText: { fontVariant: ['tabular-nums'] },
    stepper: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: color.brandTint },
    quick: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], justifyContent: 'center' },
    note: { marginHorizontal: space[4], marginTop: space[2] },
  }),
);
