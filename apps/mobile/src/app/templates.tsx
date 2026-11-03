/**
 * Templates: well-known plans (lib/templates.ts) to start from. Each card
 * shows its days and their exercises, and starts the day after the last
 * one you did; any other day can be started too. Starting one makes it
 * the workout in progress, as Build a workout does.
 */

import { programmeTitle } from '@/lib/programmes';
import { useProgramme } from '@/lib/programmeStore';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Pressable } from '@/components/motion';
import { BrandFill, Sheen, accentGlow } from '@/components/BrandFill';
import { ExerciseTile } from '@/components/ExerciseGlyph';
import { Icon, type IconName } from '@/components/Icon';
import { AskGymPal } from '@/components/AskGymPal';
import { PageScroll } from '@/components/PageScroll';
import { useGlassRedraw } from '@/components/Redrawn';
import { Card, Chip, PrimaryButton, Txt } from '@/components/ui';
import { ScreenOptions } from '@/components/ScreenOptions';
import { startSession, useActiveSessionGlance } from '@/lib/activeSession';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { usePageTitle } from '@/lib/pageTitle';
import { TEMPLATES, nextTemplateDay, templateDayName, templateOfSplit, type WorkoutTemplate } from '@/lib/templates';
import { useOwnTraining } from '@/lib/ownTraining';
import { color, face, radius, space, themed } from '@/lib/theme';
import { unitFor } from '@/lib/training';
import { useTrainingLog } from '@/lib/useTraining';
import { groupName, groupOf } from '@/lib/supersets';
import { exerciseName } from '@/lib/workout';

export default function TemplatesScreen() {
  useGlassRedraw();
  usePageTitle('Templates');
  const router = useRouter();
  const { account, prefs, billing, openPro } = useApp();
  // Your own splits (Pro), above GymGO's, taking turns the same way.
  const own = useOwnTraining();
  const mine = useMemo(() => own.splits.map(templateOfSplit), [own.splits]);
  const log = useTrainingLog(account.token);
  const active = useActiveSessionGlance();
  const programme = useProgramme();
  const [level, setLevel] = useState<WorkoutTemplate['level'] | null>(null);
  const shown = TEMPLATES.filter((template) => level === null || template.level === level);

  const start = (template: WorkoutTemplate, index: number) => {
    const day = template.days[index]!;
    haptic.success();
    startSession({ name: templateDayName(template, day), workoutId: null, gymId: null, gymName: null, unit: unitFor(prefs.country), items: day.items });
    router.push('/train');
  };

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content}>
      <ScreenOptions options={{ title: 'Templates' }} />
      <Txt variant="subhead" color={color.labelSecondary}>
        Well-known plans, ready to go. Each takes turns through its days: start one and you get the day after the last you did.
      </Txt>
      {active && (
        <Card style={styles.busy}>
          <Txt variant="headline">{`${active.name} is still going`}</Txt>
          <Txt variant="footnote" color={color.labelSecondary}>
            Finish it or discard it before starting another.
          </Txt>
          <PrimaryButton label="Back to your workout" icon="play" onPress={() => router.push('/train')} />
        </Card>
      )}
      <Pressable
        onPress={() => router.push('/programme')}
        accessibilityRole="link"
        accessibilityLabel={programme ? `Your ${programmeTitle(programme.goal)}` : 'Training programme: weeks planned for you, with easier weeks'}
        style={({ pressed }) => [styles.programme, pressed && { opacity: 0.8 }]}
      >
        <Icon name="workout" size={18} color={color.brand} />
        <View style={styles.flex}>
          <Txt variant="headline">{programme ? `Your ${programmeTitle(programme.goal).toLowerCase()}` : 'Training programme'}</Txt>
          <Txt variant="footnote" color={color.labelSecondary}>
            {programme ? 'Its week, its next day and what to lift' : 'A goal and days a week, planned over 6 to 12 weeks, with an easier week every fourth'}
          </Txt>
        </View>
        <Icon name="chevron" size={13} color={color.labelTertiary} />
      </Pressable>
      <Txt variant="eyebrow" color={color.labelSecondary} accessibilityRole="header" level={2} style={styles.eyebrow}>
        {mine.length > 0 ? `YOUR SPLITS · ${mine.length}` : 'YOUR SPLITS'}
      </Txt>
      {mine.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          next={nextTemplateDay(template, log.sessions)}
          logged={log.status === 'ready' ? (log.sessions[0]?.id ?? '') : null}
          disabled={Boolean(active)}
          onStart={(index) => start(template, index)}
          onChange={() => (billing.isPro ? router.push({ pathname: '/split-edit', params: { id: template.id.slice('own-'.length) } }) : openPro('splits'))}
        />
      ))}
      <Pressable
        onPress={() => (billing.isPro ? router.push('/split-edit') : openPro('splits'))}
        accessibilityRole="button"
        accessibilityLabel={billing.isPro ? 'Make a split of your own' : 'Making your own splits is part of GymGO Pro'}
        style={({ pressed }) => [styles.programme, pressed && { opacity: 0.8 }]}
      >
        <Icon name="plus" size={18} color={color.brand} />
        <View style={styles.flex}>
          <Txt variant="headline">{billing.isPro ? 'Make your own split' : 'Make your own split · Pro'}</Txt>
          <Txt variant="footnote" color={color.labelSecondary}>
            Your days and exercises, taking turns like the templates below
          </Txt>
        </View>
        <Icon name="chevron" size={13} color={color.labelTertiary} />
      </Pressable>
      <Txt variant="eyebrow" color={color.labelSecondary} accessibilityRole="header" level={2} style={styles.eyebrow}>
        GYMGO’S TEMPLATES
      </Txt>
      <View style={styles.levels} accessibilityLabel="Level">
        {([null, 'Beginner', 'Intermediate'] as const).map((each) => (
          <Chip
            key={each ?? 'all'}
            label={`${each ?? 'All'} ${TEMPLATES.filter((template) => each === null || template.level === each).length}`}
            accessibilityLabel={`${each ?? 'All levels'}, ${TEMPLATES.filter((template) => each === null || template.level === each).length} templates`}
            selected={level === each}
            onPress={() => setLevel(each)}
          />
        ))}
      </View>
      {shown.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          next={nextTemplateDay(template, log.sessions)}
          // Which workout is newest in your log: a new one means you've trained since a pick.
          logged={log.status === 'ready' ? (log.sessions[0]?.id ?? '') : null}
          disabled={Boolean(active)}
          onStart={(index) => start(template, index)}
        />
      ))}
      <AskGymPal
        title="Not sure which? Ask GymPal"
        detail="Which suits you, and how to start"
        request={{
          question: 'Which of these templates should I start with?',
          about: 'the templates',
          context: TEMPLATES.map(
            (template) => `${template.name} (${template.level}, ${template.perWeek}): ${template.summary} Days: ${template.days.map((day) => day.name).join(', ')}.`,
          ).join('\n'),
        }}
      />
      <Txt variant="footnote" color={color.labelSecondary} style={styles.note}>
        These are general plans, not advice for you. Start lighter than you think, leave a rep or two in the tank, and add weight when every set
        feels good. Swap anything that hurts.
      </Txt>
    </PageScroll>
  );
}

/** Each plan's mark: what sets it apart at a glance. */
const TEMPLATE_ICON: Record<string, IconName> = {
  'full-body': 'body',
  'full-body-3': 'calendar',
  'five-by-five': 'plates',
  'body-weight': 'person',
  ppl: 'shuffle',
  'upper-lower': 'sort',
  arnold: 'trophy',
  'body-part': 'target',
};
/** The marks' corners, the look's own (square in 8-bit and Classic). */
const markRound = () => Math.min(13, radius.lg);

function TemplateCard({
  template,
  next,
  logged,
  disabled,
  onStart,
  onChange,
}: {
  template: WorkoutTemplate;
  /** One of yours: a way to change it. */
  onChange?: () => void;
  next: number;
  /** The newest workout in your log, or null while it loads. */
  logged: string | null;
  disabled: boolean;
  onStart: (index: number) => void;
}) {
  // The day you picked, else the next one (known only once your log has
  // loaded, so it isn't copied in at first draw). A pick lasts until a
  // workout is logged, however it was started: then the card offers the next
  // day, not the one just done. One started and discarded keeps it.
  const [picked, setPicked] = useState<{ day: number; logged: string | null } | null>(null);
  const day = picked && (picked.logged === null || picked.logged === logged) ? picked.day : next;
  const setDay = (chosen: number) => setPicked({ day: chosen, logged });
  // A pick made while the log loaded belongs to the log as it arrives.
  useEffect(() => {
    if (logged !== null) setPicked((now) => (now && now.logged === null ? { ...now, logged } : now));
  }, [logged]);
  const [open, setOpen] = useState(false);
  // A split of yours can lose a day while a later one was picked.
  const at = Math.min(day, template.days.length - 1);
  const shown = template.days[at]!;
  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <View style={[styles.mark, accentGlow(color.brandFill)]}>
          <BrandFill round={markRound()} />
          <Sheen round={markRound()} />
          <Icon name={TEMPLATE_ICON[template.id] ?? 'workout'} size={22} color={color.onBrand} />
        </View>
        <View style={styles.flex}>
          <Txt variant="title2">{template.name}</Txt>
          <Txt variant="footnote" color={color.brand} style={face('semibold')}>
            {`${template.level} · ${template.perWeek}`}
          </Txt>
        </View>
        {onChange && (
          <Pressable onPress={onChange} accessibilityRole="button" accessibilityLabel={`Change ${template.name}`} hitSlop={8} style={({ pressed }) => [styles.change, pressed && { opacity: 0.6 }]}>
            <Txt variant="footnote" color={color.brand} style={face('semibold')}>
              Change
            </Txt>
          </Pressable>
        )}
      </View>
      {template.summary !== '' && (
        <Txt variant="subhead" color={color.labelSecondary}>
          {template.summary}
        </Txt>
      )}
      <View style={styles.chips}>
        {template.days.map((option, index) => (
          <Chip key={option.name} label={index === next ? `${option.name} (next)` : option.name} selected={at === index} onPress={() => setDay(index)} />
        ))}
      </View>
      {!open && (
        <View style={styles.strip} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
          {shown.items.map((item) => (
            <ExerciseTile key={item.exerciseId} exerciseId={item.exerciseId} size={38} />
          ))}
        </View>
      )}
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityLabel={open ? 'Hide the exercises' : `Show the exercises for ${shown.name}`} style={styles.toggle}>
        <Txt variant="footnote" color={color.brand} style={face('semibold')}>
          {open ? 'Hide exercises' : `${shown.items.length} exercises`}
        </Txt>
        <Icon name={open ? 'collapse' : 'expand'} size={14} color={color.brand} />
      </Pressable>
      {open && (
        <View style={styles.list}>
          {shown.items.map((item, index) => {
            const group = groupOf(shown.items, index);
            return (
              <View key={item.exerciseId} style={[styles.row, group && styles.grouped, group?.position === 1 && styles.groupStart]}>
                <ExerciseTile exerciseId={item.exerciseId} size={40} />
                <View style={styles.flex}>
                  <Txt variant="subhead" numberOfLines={2}>
                    {exerciseName(item.exerciseId)}
                  </Txt>
                  {group && (
                    <Txt variant="caption" color={color.brand} style={face('semibold')}>
                      {`${groupName(group)} · ${group.position} of ${group.members.length}`}
                    </Txt>
                  )}
                </View>
                <Txt variant="footnote" color={color.labelSecondary}>
                  {`${item.sets} × ${item.reps}`}
                </Txt>
              </View>
            );
          })}
        </View>
      )}
      <PrimaryButton
        label={`Start ${shown.name}`}
        icon="play"
        disabled={disabled}
        onPress={() => onStart(at)}
      />
    </Card>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], paddingBottom: space[8], gap: space[3], width: '100%', maxWidth: 560, alignSelf: 'center' },
    busy: { gap: space[2] },
    card: { gap: space[3] },
    head: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
    mark: { width: 46, height: 46, borderRadius: markRound(), borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: color.brandFill },
    flex: { flex: 1, minWidth: 0 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    toggle: { flexDirection: 'row', alignItems: 'center', gap: space[1], alignSelf: 'flex-start' },
    strip: { flexDirection: 'row', flexWrap: 'wrap', gap: space[1] + 2 },
    list: { gap: 2, padding: space[2], borderRadius: radius.md, backgroundColor: color.fill },
    row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: 5, paddingHorizontal: space[1] },
    // A superset's exercises share a bar down their left, as in a workout.
    grouped: { borderLeftWidth: 3, borderLeftColor: color.brand, paddingLeft: space[2] },
    groupStart: { marginTop: space[1] },
    levels: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    eyebrow: { marginTop: space[2], marginLeft: space[4] },
    change: { paddingHorizontal: space[3], paddingVertical: 6, borderRadius: radius.pill, backgroundColor: color.brandTint },
    note: { paddingHorizontal: space[4], textAlign: 'center' },
    programme: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[4], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.plate },
  }),
);
