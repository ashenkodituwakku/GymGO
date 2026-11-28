/**
 * The welcome tour's questions, after its story (app/welcome.tsx): only the
 * ones whose answers change something, one to a screen, each skippable.
 *
 *   1. Where do you train? Your country (chooseCountry), so GymGO opens
 *      there and Home doesn't ask again.
 *   2. What do you train for? `prefs.goal`, where the workout builder and
 *      programmes start.
 *   3. How many days a week? `prefs.weeklyGoal`, the week Home and Progress
 *      count towards.
 *   4. Find gyms near you? Asks the phone (or browser) for your location
 *      now, while it's clear why. Only while location is on in Settings.
 *
 * Then what you said, and Get started. Skipping a question leaves it as it
 * was: the country is asked for again on Home, as before.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInLeft, FadeInRight, ReduceMotion } from 'react-native-reanimated';
import { Flag } from './Flag';
import { Icon, type IconName } from './Icon';
import { EASE_OUT, Pressable } from './motion';
import { PrimaryButton, Txt } from './ui';
import { useApp } from '@/lib/app-state';
import { COUNTRIES, FOCUS_COUNTRY, builtInCountries, countryByCode, deviceCountry, searchCountries, type Country } from '@/lib/country';
import { haptic } from '@/lib/haptics';
import { LIMITED } from '@/lib/limited';
import { FIELD_FRAME, NO_WEB_OUTLINE, color, dropShadow, face, radius, space, themed } from '@/lib/theme';
import { daysLine, spreadDays } from '@/lib/onboarding';
import { GOALS, type Goal } from '@/lib/workout';

type Step = 'country' | 'goal' | 'days' | 'location' | 'done';

/** Each goal, as the builder plans it (lib/workout.ts DOSE). */
const GOAL_ABOUT: Record<Goal, { icon: IconName; title: string; line: string }> = {
  muscle: { icon: 'body', title: 'Build muscle', line: '8 to 15 reps, 60 to 90 s rest' },
  strength: { icon: 'trophy', title: 'Get stronger', line: 'Heavier weights, sets of 5, longer rests' },
  endurance: { icon: 'bolt', title: 'Endurance', line: '15 to 20 reps, short rests' },
};

export function WelcomeSetup({ onDone }: { onDone: () => void }) {
  const { prefs, chooseCountry, setPref, locate, billing } = useApp();
  const { width } = useWindowDimensions();
  const steps = useMemo<Step[]>(() => ['country', 'goal', 'days', ...(prefs.location ? (['location'] as const) : []), 'done'], [prefs.location]);
  const [at, setAt] = useState(0);
  const [forward, setForward] = useState(true);
  const suggested = useMemo(() => deviceCountry() ?? FOCUS_COUNTRY, []);
  const [country, setCountry] = useState<string | null>(prefs.country ?? suggested);
  const [query, setQuery] = useState('');
  const [goal, setGoal] = useState<Goal | null>(prefs.goal);
  const [days, setDays] = useState<number | null>(prefs.weeklyGoal);
  const [where, setWhere] = useState<'idle' | 'asking' | 'on' | 'denied' | 'unavailable'>('idle');
  // What was answered (not skipped), for the summary at the end.
  const [answered, setAnswered] = useState<Partial<Record<Step, boolean>>>({});
  const step = steps[at]!;
  const questions = steps.length - 1;

  const go = (delta: number) => {
    haptic.select();
    setForward(delta > 0);
    setAt((current) => Math.min(steps.length - 1, Math.max(0, current + delta)));
  };
  const keep = () => {
    if (step === 'country' && country) chooseCountry(country);
    if (step === 'goal' && goal) setPref('goal', goal);
    if (step === 'days' && days) setPref('weeklyGoal', days);
    setAnswered((current) => ({ ...current, [step]: true }));
    go(1);
  };
  const askWhere = async () => {
    setWhere('asking');
    const result = await locate(true);
    if (result.kind === 'denied') setWhere('denied');
    else if (result.kind === 'unavailable') setWhere('unavailable');
    else if (result.kind === 'off') setWhere('idle');
    else {
      setWhere('on');
      haptic.success();
      setAnswered((current) => ({ ...current, location: true }));
      setTimeout(() => go(1), 650);
    }
  };

  // The countries to pick from: a search's matches, else those with cities built in (the limited website has only those).
  const offered = useMemo(() => {
    const builtIn = builtInCountries().map((code) => countryByCode(code)).filter((item): item is Country => item !== null);
    const pool = LIMITED ? builtIn : COUNTRIES;
    const list = query.trim() ? searchCountries(query, pool).slice(0, 8) : builtIn;
    return list.filter((item) => query.trim() || item.code !== suggested);
  }, [query, suggested]);
  const suggestedCountry = countryByCode(suggested);
  const dot = Math.min(44, Math.floor((Math.min(width, 520) - space[6] * 2 - 6 * space[2]) / 7));

  const enter = (forward ? FadeInRight : FadeInLeft).duration(320).easing(EASE_OUT).reduceMotion(ReduceMotion.System);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        {at > 0 && step !== 'done' ? (
          <Pressable onPress={() => go(-1)} accessibilityRole="button" accessibilityLabel="Back to the last question" hitSlop={10} style={styles.headButton}>
            <Icon name="chevronBack" size={18} color={color.brand} />
          </Pressable>
        ) : (
          <View style={styles.headButton} />
        )}
        {/* How far through the questions: a bar each, filled up to this one. */}
        <View style={styles.progress} accessible accessibilityLabel={step === 'done' ? 'All questions done' : `Question ${at + 1} of ${questions}`}>
          {Array.from({ length: questions }, (_, index) => (
            <View key={index} style={[styles.progressBar, index <= at && styles.progressOn]} />
          ))}
        </View>
        {step !== 'done' ? (
          <Pressable onPress={() => go(1)} accessibilityRole="button" accessibilityLabel="Skip this question" hitSlop={10} style={styles.headButton}>
            <Txt variant="body" color={color.brand} style={face('semibold')}>
              Skip
            </Txt>
          </Pressable>
        ) : (
          <View style={styles.headButton} />
        )}
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Animated.View key={step} entering={enter} style={styles.step}>
          {step === 'country' && (
            <>
              <Heading title="Where do you train?" line={LIMITED ? 'GymGO opens here.' : billing.isPro ? 'Pro covers every country. GymGO opens here.' : 'Free covers one country. Change it any time in Profile.'} />
              {suggestedCountry && !query.trim() && (
                <Choice selected={country === suggestedCountry.code} onPress={() => setCountry(suggestedCountry.code)} big label={suggestedCountry.name} note="Suggested" lead={<Flag code={suggestedCountry.code} size={30} />} />
              )}
              <View {...FIELD_FRAME} style={styles.search}>
                <Icon name="search" size={16} color={color.labelSecondary} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search countries"
                  placeholderTextColor={color.labelSecondaryOnFill}
                  autoCorrect={false}
                  accessibilityLabel="Search countries"
                  style={styles.searchInput}
                />
              </View>
              <View style={styles.list} role="radiogroup" accessibilityLabel="Countries">
                {offered.map((item) => (
                  <Choice key={item.code} selected={country === item.code} onPress={() => setCountry(item.code)} label={item.name} lead={<Flag code={item.code} size={22} />} />
                ))}
                {query.trim() !== '' && offered.length === 0 && (
                  <Txt variant="subhead" color={color.labelSecondary}>
                    No matches.
                  </Txt>
                )}
              </View>
            </>
          )}

          {step === 'goal' && (
            <>
              <Heading title="What do you train for?" line="Your workouts start from this. Change it any time." />
              <View style={styles.list} role="radiogroup" accessibilityLabel="Your goal">
                {GOALS.map((item) => {
                  const about = GOAL_ABOUT[item.id];
                  return (
                    <Choice
                      key={item.id}
                      big
                      selected={goal === item.id}
                      onPress={() => setGoal(item.id)}
                      label={about.title}
                      note={about.line}
                      lead={
                        <View style={[styles.goalIcon, goal === item.id && styles.goalIconOn]}>
                          <Icon name={about.icon} size={22} color={goal === item.id ? color.onBrand : color.brand} />
                        </View>
                      }
                    />
                  );
                })}
              </View>
            </>
          )}

          {step === 'days' && (
            <>
              <Heading title="How many days a week?" line="Sets your weekly goal on Home and Progress." />
              <View style={styles.days} role="radiogroup" accessibilityLabel="Days a week">
                {[1, 2, 3, 4, 5, 6, 7].map((count) => (
                  <Pressable
                    key={count}
                    onPress={() => {
                      haptic.select();
                      setDays(count);
                    }}
                    accessibilityRole="radio"
                    aria-checked={days === count}
                    accessibilityState={{ selected: days === count }}
                    accessibilityLabel={`${count} ${count === 1 ? 'day' : 'days'} a week`}
                    style={[styles.day, { width: dot, height: dot, borderRadius: dot / 2 }, days === count && styles.dayOn]}
                  >
                    <Txt variant="headline" color={days === count ? color.onBrand : color.label}>
                      {String(count)}
                    </Txt>
                  </Pressable>
                ))}
              </View>
              {days !== null && (
                <Animated.View key={days} entering={FadeInRight.duration(220).reduceMotion(ReduceMotion.System)} style={styles.week} accessible accessibilityLabel={`${days} ${days === 1 ? 'day' : 'days'} a week. ${daysLine(days)}`}>
                  <View style={styles.weekRow}>
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((letter, index) => (
                      <View key={index} style={styles.weekDay}>
                        <View style={[styles.weekDot, spreadDays(days)[index] && styles.weekDotOn]} />
                        <Txt variant="caption" color={color.labelSecondary}>
                          {letter}
                        </Txt>
                      </View>
                    ))}
                  </View>
                  <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
                    {daysLine(days)}
                  </Txt>
                </Animated.View>
              )}
            </>
          )}

          {step === 'location' && (
            <>
              <View style={styles.locateMark}>
                <Icon name="locate" size={40} color={color.brand} />
              </View>
              <Heading
                title="Find gyms near you"
                line={`See the closest gyms first and check in when you arrive. Your exact location stays on your ${Platform.OS === 'web' ? 'device' : 'phone'} and is never saved or sent to GymGO.`}
              />
              {where === 'denied' && <Note tone="maybe" text="Location is off for GymGO. Turn it on in Settings, or search by place." />}
              {where === 'unavailable' && <Note tone="maybe" text="Couldn’t get your location. You can try again later." />}
              {where === 'on' && <Note tone="good" text="Location on. Nearby gyms show first." />}
            </>
          )}

          {step === 'done' && (
            <>
              <View style={styles.doneMark}>
                <Icon name="check" size={40} color={color.onBrand} />
              </View>
              <Heading title="You’re all set" line="You can change these any time." />
              <View style={styles.summary}>
                {answered.country && country && countryByCode(country) && <Chip lead={<Flag code={country} size={16} />} label={countryByCode(country)!.name} />}
                {answered.goal && goal && <Chip icon={GOAL_ABOUT[goal].icon} label={GOAL_ABOUT[goal].title} />}
                {answered.days && days && <Chip icon="calendar" label={`${days} ${days === 1 ? 'day' : 'days'} a week`} />}
                {answered.location && <Chip icon="locate" label="Gyms near you" />}
              </View>
            </>
          )}
        </Animated.View>
      </ScrollView>

      <View style={styles.actions}>
        {step === 'location' ? (
          where === 'on' ? null : (
            <>
              <PrimaryButton label={where === 'asking' ? 'Asking…' : 'Use my location'} icon="locate" busy={where === 'asking'} onPress={() => void askWhere()} />
              <PrimaryButton label="Not now" tone="quiet" onPress={() => go(1)} />
            </>
          )
        ) : step === 'done' ? (
          <PrimaryButton label="Get started" icon="check" onPress={onDone} />
        ) : (
          <PrimaryButton
            label="Continue"
            disabled={(step === 'country' && !country) || (step === 'goal' && !goal) || (step === 'days' && !days)}
            onPress={keep}
          />
        )}
      </View>
    </View>
  );
}

function Heading({ title, line }: { title: string; line: string }) {
  return (
    <View style={styles.heading}>
      <Txt variant="largeTitle" accessibilityRole="header" level={2} style={styles.center}>
        {title}
      </Txt>
      <Txt variant="body" color={color.labelSecondary} style={styles.center}>
        {line}
      </Txt>
    </View>
  );
}

/** One answer to pick: a row (or a big tile) with a lead (a flag, an icon), ticked when it's the one. */
function Choice({ selected, onPress, label, note, lead, big = false }: { selected: boolean; onPress: () => void; label: string; note?: string; lead?: ReactNode; big?: boolean }) {
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onPress();
      }}
      accessibilityRole="radio"
      aria-checked={selected}
      accessibilityState={{ selected }}
      accessibilityLabel={note ? `${label}. ${note}` : label}
      style={({ pressed }) => [styles.choice, big && styles.choiceBig, selected && styles.choiceOn, pressed && { opacity: 0.85 }]}
    >
      {lead}
      <View style={styles.flex}>
        <Txt variant={big ? 'headline' : 'body'} style={!big && face('medium')}>
          {label}
        </Txt>
        {note && (
          <Txt variant="footnote" color={color.labelSecondary}>
            {note}
          </Txt>
        )}
      </View>
      <View style={[styles.radio, selected && styles.radioOn]}>{selected && <Icon name="check" size={13} color={color.onBrand} />}</View>
    </Pressable>
  );
}

function Note({ tone, text }: { tone: 'good' | 'maybe'; text: string }) {
  return (
    <View style={[styles.note, { backgroundColor: tone === 'good' ? color.goodTint : color.maybeTint }]} accessibilityLiveRegion="polite">
      <Icon name={tone === 'good' ? 'good' : 'info'} size={16} color={tone === 'good' ? color.goodInk : color.maybeInk} />
      <Txt variant="subhead" color={tone === 'good' ? color.goodInk : color.maybeInk} style={styles.flex}>
        {text}
      </Txt>
    </View>
  );
}

function Chip({ icon, lead, label }: { icon?: IconName; lead?: ReactNode; label: string }) {
  return (
    <View style={styles.chip}>
      {lead ?? (icon ? <Icon name={icon} size={15} color={color.brand} /> : null)}
      <Txt variant="subhead" style={face('semibold')}>
        {label}
      </Txt>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    wrap: { flex: 1 },
    flex: { flex: 1, minWidth: 0 },
    center: { textAlign: 'center' },
    head: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], height: 48, width: '100%', maxWidth: 640, alignSelf: 'center' },
    headButton: { minWidth: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    progress: { flex: 1, flexDirection: 'row', gap: 6 },
    progressBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: color.fill },
    progressOn: { backgroundColor: color.brand },
    body: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: space[6], paddingVertical: space[6] },
    step: { gap: space[4], width: '100%', maxWidth: 520, alignSelf: 'center' },
    heading: { gap: space[2], marginBottom: space[2] },
    list: { gap: space[2] },
    choice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      minHeight: 52,
      paddingHorizontal: space[4],
      paddingVertical: space[2],
      borderRadius: radius.lg,
      borderCurve: 'continuous',
      backgroundColor: color.plate,
      borderWidth: 1.5,
      borderColor: 'transparent',
      ...dropShadow(0.06, 10, 3, 2),
    },
    choiceBig: { minHeight: 76, paddingVertical: space[3] },
    choiceOn: { borderColor: color.brand, backgroundColor: color.brandWash },
    radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: color.separator, alignItems: 'center', justifyContent: 'center' },
    radioOn: { backgroundColor: color.brand, borderColor: color.brand },
    goalIcon: { width: 44, height: 44, borderRadius: 14, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: color.brandWash },
    goalIconOn: { backgroundColor: color.brand },
    search: { flexDirection: 'row', alignItems: 'center', gap: space[2], height: 46, paddingHorizontal: space[3], borderRadius: radius.md, backgroundColor: color.fill },
    searchInput: { flex: 1, minWidth: 0, height: '100%', fontSize: 16, color: color.label, ...NO_WEB_OUTLINE, ...face('regular') },
    days: { flexDirection: 'row', justifyContent: 'center', gap: space[2] },
    day: { alignItems: 'center', justifyContent: 'center', backgroundColor: color.plate, borderWidth: 1.5, borderColor: color.separator },
    dayOn: { backgroundColor: color.brand, borderColor: color.brand, transform: [{ scale: 1.08 }] },
    week: { gap: space[3], marginTop: space[2], padding: space[4], borderRadius: radius.lg, backgroundColor: color.plate, ...dropShadow(0.06, 10, 3, 2) },
    weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
    weekDay: { alignItems: 'center', gap: 6, width: 28 },
    weekDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: color.fill },
    weekDotOn: { backgroundColor: color.brand },
    locateMark: { alignSelf: 'center', width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: color.brandWash },
    doneMark: { alignSelf: 'center', width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: color.good },
    note: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2], padding: space[3], borderRadius: radius.md },
    summary: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space[2] },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space[3], paddingVertical: space[2], borderRadius: radius.pill, backgroundColor: color.plate, ...dropShadow(0.06, 8, 2, 2) },
    actions: { gap: space[2], paddingHorizontal: space[4], paddingTop: space[2], width: '100%', maxWidth: 480, alignSelf: 'center' },
  }),
);
