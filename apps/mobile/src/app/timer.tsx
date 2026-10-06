/**
 * Interval timer: work, rest, rounds, with a big clock you can read from
 * the floor. Tabata and EMOM are free as they come. With Pro you set your
 * own work, rest and rounds, and keep up to ten timers of your own.
 *
 * The time comes from the clock, not from counting ticks, so pausing, a
 * slow phone or switching apps never makes it drift. The screen stays on
 * while it runs; each change of phase buzzes (and beeps in a browser).
 */

import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Pressable } from '@/components/motion';
import { Icon, type IconName } from '@/components/Icon';
import { PageScroll } from '@/components/PageScroll';
import { BrandFill } from '@/components/BrandFill';
import { ChoiceChip, Input, PrimaryButton, Txt } from '@/components/ui';
import { useApp } from '@/lib/app-state';
import { beep, primeBeep } from '@/lib/beep';
import { haptic } from '@/lib/haptics';
import { LIMITS, MAX_OWN_TIMERS, STANDARD_TIMERS, describePlan, phaseAt, totalSeconds, withinLimits, type IntervalPlan, type PhaseKind } from '@/lib/intervals';
import { usePageTitle } from '@/lib/pageTitle';
import { color, face, radius, shadow, space, themed, type } from '@/lib/theme';
import { clockLabel } from '@/lib/training';

const PHASE_WORD: Record<PhaseKind, string> = { ready: 'GET READY', work: 'WORK', rest: 'REST', done: 'DONE' };
const KEEP_AWAKE = 'gymgo-timer';

export default function TimerScreen() {
  usePageTitle('Interval timer');
  const { billing, prefs, setPref, openPro } = useApp();
  const pro = billing.isPro;
  const own = pro ? prefs.timers : [];
  const [plan, setPlan] = useState<IntervalPlan>(STANDARD_TIMERS[0]!);
  // Running: when it (re)started, and the seconds run before that.
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [banked, setBanked] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [naming, setNaming] = useState<string | null>(null);
  // Delete was tapped once: a second tap deletes the timer.
  const [deleting, setDeleting] = useState(false);

  const running = startedAt !== null;
  const elapsed = banked + (running ? (now - startedAt) / 1000 : 0);
  const phase = phaseAt(plan, elapsed);
  const started = elapsed > 0;
  const isOwn = own.some((item) => item.id === plan.id);

  // Tick while running; the clock, not the tick count, says where we are.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (!running) return;
    void activateKeepAwakeAsync(KEEP_AWAKE).catch(() => undefined);
    return () => void deactivateKeepAwake(KEEP_AWAKE).catch(() => undefined);
  }, [running]);

  // A buzz (and a beep) as each phase begins, and on the last three seconds of each.
  const last = useRef({ kind: phase.kind, round: phase.round, second: Math.ceil(phase.remaining) });
  useEffect(() => {
    const before = last.current;
    const second = Math.ceil(phase.remaining);
    last.current = { kind: phase.kind, round: phase.round, second };
    if (!running) return;
    if (phase.kind !== before.kind || phase.round !== before.round) {
      if (phase.kind === 'work') {
        haptic.success();
        beep(true);
      } else if (phase.kind === 'rest') {
        haptic.tap();
        beep();
      } else if (phase.kind === 'done') {
        haptic.success();
        beep(true);
        setBanked(totalSeconds(plan));
        setStartedAt(null);
      }
    } else if (second !== before.second && second >= 1 && second <= 3 && phase.length > 5) {
      haptic.select();
      beep();
    }
  }, [phase.kind, phase.round, phase.remaining, phase.length, running, plan]);

  const start = () => {
    primeBeep();
    haptic.tap();
    if (phase.kind === 'done') setBanked(0);
    const at = Date.now();
    setNow(at);
    setStartedAt(at);
  };
  const pause = () => {
    haptic.tap();
    setBanked(elapsed);
    setStartedAt(null);
  };
  const reset = () => {
    haptic.select();
    setStartedAt(null);
    setBanked(0);
  };
  const choose = (next: IntervalPlan) => {
    reset();
    setNaming(null);
    setDeleting(false);
    setPlan(next);
  };
  const adjust = (key: 'work' | 'rest' | 'rounds', by: number) => {
    if (!pro) return openPro('timers');
    haptic.select();
    reset();
    setDeleting(false);
    // A change to a standard timer makes it your own, unsaved until you save it.
    setPlan((current) => withinLimits({ ...current, id: isOwn ? current.id : 'custom', name: isOwn ? current.name : 'Custom', [key]: current[key] + by }));
  };
  const save = (name: string) => {
    const kept = { ...plan, id: isOwn ? plan.id : `t${Date.now().toString(36)}`, name: name.trim().slice(0, 40) || 'My timer' };
    setPref('timers', isOwn ? own.map((item) => (item.id === kept.id ? kept : item)) : [...own, kept].slice(-MAX_OWN_TIMERS));
    setPlan(kept);
    setNaming(null);
    haptic.success();
  };
  const remove = () => {
    if (!deleting) {
      haptic.select();
      return setDeleting(true);
    }
    haptic.warn();
    setPref(
      'timers',
      own.filter((item) => item.id !== plan.id),
    );
    choose(STANDARD_TIMERS[0]!);
  };

  const working = phase.kind === 'work';
  const progress = phase.length > 0 ? 1 - phase.remaining / phase.length : 1;
  const bigClock = { fontSize: Math.round(type.largeTitle.fontSize * 2.3), lineHeight: Math.round(type.largeTitle.fontSize * 2.3 * 1.15) };

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Interval timer' }} />

      <View
        style={[styles.clock, working && styles.clockWork]}
        accessible
        accessibilityRole="timer"
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${PHASE_WORD[phase.kind]}. ${phase.kind === 'done' ? 'Finished' : `${Math.ceil(phase.remaining)} seconds`}${phase.round ? `, round ${phase.round} of ${plan.rounds}` : ''}`}
      >
        {working && <BrandFill />}
        <Txt variant="eyebrow" color={working ? color.onBrand : color.labelSecondary}>
          {started || running ? PHASE_WORD[phase.kind] : plan.name.toUpperCase()}
        </Txt>
        <Txt variant="largeTitle" color={working ? color.onBrand : color.label} style={[bigClock, styles.digits]}>
          {phase.kind === 'done' ? clockLabel(totalSeconds(plan, 0)) : clockLabel(started ? phase.remaining : plan.work)}
        </Txt>
        <Txt variant="subhead" color={working ? color.onBrandSoft : color.labelSecondary}>
          {phase.kind === 'done'
            ? `${plan.rounds} round${plan.rounds === 1 ? '' : 's'} done`
            : phase.round
              ? `Round ${phase.round} of ${plan.rounds}`
              : started
                ? `${plan.rounds} round${plan.rounds === 1 ? '' : 's'} to go`
                : describePlan(plan)}
        </Txt>
        <View style={[styles.bar, working && styles.barOnBrand]}>
          <View style={[styles.barFill, working && styles.barFillOnBrand, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      </View>

      <View style={styles.controls}>
        <View style={styles.flex}>
          {running ? (
            <PrimaryButton label="Pause" icon="pause" onPress={pause} />
          ) : (
            <PrimaryButton label={phase.kind === 'done' ? 'Again' : started ? 'Resume' : 'Start'} icon="play" onPress={start} />
          )}
        </View>
        {started && (
          <View style={styles.flex}>
            <PrimaryButton label="Reset" icon="refresh" tone="quiet" onPress={reset} />
          </View>
        )}
      </View>

      <Txt variant="footnote" color={color.labelSecondary} style={styles.caps}>
        TIMERS
      </Txt>
      <View style={styles.card}>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {[...STANDARD_TIMERS, ...own].map((item) => (
            <ChoiceChip key={item.id} label={item.name} selected={plan.id === item.id} onPress={() => choose(item)} />
          ))}
          {plan.id === 'custom' && <ChoiceChip label="Custom" selected onPress={() => undefined} />}
        </View>
        <Txt variant="footnote" color={color.labelSecondary}>
          Tabata: 20 seconds as hard as you can, 10 seconds rest, eight rounds. EMOM: every minute on the minute; do your reps and rest for what’s left of the minute.
        </Txt>
      </View>

      <Txt variant="footnote" color={color.labelSecondary} style={styles.caps}>
        {pro ? 'SETTINGS' : 'SETTINGS · PRO'}
      </Txt>
      <View style={styles.card}>
        <Setting icon="bolt" label="Work" value={seconds(plan.work)} locked={!pro} canLess={plan.work > LIMITS.work.min} canMore={plan.work < LIMITS.work.max} onChange={(by) => adjust('work', by * 5)} />
        <Setting icon="clock" label="Rest" value={plan.rest ? seconds(plan.rest) : 'None'} locked={!pro} canLess={plan.rest > LIMITS.rest.min} canMore={plan.rest < LIMITS.rest.max} onChange={(by) => adjust('rest', by * 5)} />
        <Setting icon="refresh" label="Rounds" value={String(plan.rounds)} locked={!pro} canLess={plan.rounds > LIMITS.rounds.min} canMore={plan.rounds < LIMITS.rounds.max} onChange={(by) => adjust('rounds', by)} />
        {!pro ? (
          <Pressable onPress={() => openPro('timers')} accessibilityRole="button" style={({ pressed }) => [styles.pro, pressed && { opacity: 0.7 }]}>
            <Icon name="crown" size={18} color={color.brand} />
            <Txt variant="subhead" color={color.brand} style={[styles.flex, face('medium')]}>
              Set your own work, rest and rounds, and keep up to {MAX_OWN_TIMERS} timers, with GymGO Pro
            </Txt>
            <Icon name="chevron" size={13} color={color.labelTertiary} />
          </Pressable>
        ) : naming !== null ? (
          <View style={styles.naming}>
            <Input
              value={naming}
              onChangeText={setNaming}
              placeholder="Name, like Hill sprints"
              placeholderTextColor={color.labelTertiary}
              autoFocus
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={() => save(naming)}
              accessibilityLabel="Timer name"
              style={styles.input}
            />
            <PrimaryButton label="Save" onPress={() => save(naming)} />
            <PrimaryButton label="Cancel" tone="quiet" onPress={() => setNaming(null)} />
          </View>
        ) : (
          <View style={styles.controls}>
            {(plan.id === 'custom' || isOwn) && !deleting && (
              <View style={styles.flex}>
                <PrimaryButton
                  label={isOwn ? 'Rename' : 'Save as my timer'}
                  tone="quiet"
                  icon="plus"
                  disabled={!isOwn && own.length >= MAX_OWN_TIMERS}
                  onPress={() => {
                    setDeleting(false);
                    setNaming(isOwn ? plan.name : '');
                  }}
                />
              </View>
            )}
            {isOwn && (
              <View style={styles.flex}>
                <PrimaryButton label={deleting ? 'Tap again to delete' : 'Delete'} tone="danger" icon="trash" onPress={remove} />
              </View>
            )}
          </View>
        )}
        {pro && !isOwn && own.length >= MAX_OWN_TIMERS && (
          <Txt variant="footnote" color={color.labelSecondary}>
            You’ve kept {MAX_OWN_TIMERS} timers. Delete one to save another.
          </Txt>
        )}
        {pro && (
          <Txt variant="footnote" color={color.labelSecondary}>
            Your timers are kept on this device.
          </Txt>
        )}
      </View>
    </PageScroll>
  );
}

function seconds(value: number): string {
  if (value < 60) return `${value} s`;
  return value % 60 ? `${Math.floor(value / 60)} min ${value % 60} s` : `${value / 60} min`;
}

function Setting({
  icon,
  label,
  value,
  locked,
  canLess,
  canMore,
  onChange,
}: {
  icon: IconName;
  label: string;
  value: string;
  locked: boolean;
  canLess: boolean;
  canMore: boolean;
  onChange: (by: 1 | -1) => void;
}) {
  return (
    <View style={styles.setting}>
      <Icon name={icon} size={18} color={color.brand} />
      <Txt variant="body" style={styles.flex}>
        {label}
      </Txt>
      <Step icon="minus" label={`Less ${label.toLowerCase()}`} disabled={!locked && !canLess} locked={locked} onPress={() => onChange(-1)} />
      <Txt variant="headline" style={styles.value}>
        {value}
      </Txt>
      <Step icon="plus" label={`More ${label.toLowerCase()}`} disabled={!locked && !canMore} locked={locked} onPress={() => onChange(1)} />
    </View>
  );
}

function Step({ icon, label, disabled, locked, onPress }: { icon: IconName; label: string; disabled: boolean; locked: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={locked ? `${label} (GymGO Pro)` : label}
      aria-disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => [styles.step, (disabled || locked) && { opacity: 0.4 }, pressed && { opacity: 0.6 }]}
    >
      <Icon name={icon} size={16} color={color.brand} />
    </Pressable>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], paddingBottom: space[8], gap: space[3], width: '100%', maxWidth: 560, alignSelf: 'center' },
    flex: { flex: 1 },
    clock: {
      alignItems: 'center',
      gap: space[1],
      paddingVertical: space[5],
      paddingHorizontal: space[4],
      borderRadius: radius.xl,
      borderCurve: 'continuous',
      backgroundColor: color.card,
      overflow: 'hidden',
      ...shadow.plate,
    },
    clockWork: { backgroundColor: color.brandFill },
    digits: { fontVariant: ['tabular-nums'], textAlign: 'center' },
    bar: { alignSelf: 'stretch', height: 6, marginTop: space[2], borderRadius: 3, backgroundColor: color.fill, overflow: 'hidden' },
    barOnBrand: { backgroundColor: color.onBrandFaint },
    barFill: { height: '100%', borderRadius: 3, backgroundColor: color.brand },
    barFillOnBrand: { backgroundColor: color.onBrand },
    controls: { flexDirection: 'row', gap: space[3] },
    caps: { marginTop: space[2], paddingHorizontal: space[4], letterSpacing: 0.3 },
    card: { gap: space[3], padding: space[4], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.card, ...shadow.plate },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    setting: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 44 },
    value: { minWidth: 86, textAlign: 'center', fontVariant: ['tabular-nums'] },
    step: { width: 36, height: 36, borderRadius: Math.min(18, radius.pill), alignItems: 'center', justifyContent: 'center', backgroundColor: color.brandTint },
    pro: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3], borderRadius: radius.md, backgroundColor: color.brandTint },
    naming: { gap: space[2] },
    input: { height: 44, paddingHorizontal: space[3], borderRadius: radius.md, backgroundColor: color.fill, color: color.label, fontSize: 17 },
  }),
);
