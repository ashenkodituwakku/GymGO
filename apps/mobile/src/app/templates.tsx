/**
 * Templates: well-known plans (lib/templates.ts) to start from. Each card
 * shows its days and their exercises, and starts the day after the last
 * one you did; any other day can be started too. Starting one makes it
 * the workout in progress, as Build a workout does.
 */

import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Pressable } from '@/components/motion';
import { BrandFill, Sheen, accentGlow } from '@/components/BrandFill';
import { ExerciseTile } from '@/components/ExerciseGlyph';
import { Icon, type IconName } from '@/components/Icon';
import { PageScroll } from '@/components/PageScroll';
import { useGlassRedraw } from '@/components/Redrawn';
import { Card, Chip, PrimaryButton, Txt } from '@/components/ui';
import { startSession, useActiveSession } from '@/lib/activeSession';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { usePageTitle } from '@/lib/pageTitle';
import { TEMPLATES, nextTemplateDay, templateDayName, type WorkoutTemplate } from '@/lib/templates';
import { color, face, radius, space, themed } from '@/lib/theme';
import { unitFor } from '@/lib/training';
import { useTrainingLog } from '@/lib/useTraining';
import { exerciseName } from '@/lib/workout';

export default function TemplatesScreen() {
  useGlassRedraw();
  usePageTitle('Templates');
  const router = useRouter();
  const { account, prefs } = useApp();
  const log = useTrainingLog(account.token);
  const active = useActiveSession();

  const start = (template: WorkoutTemplate, index: number) => {
    const day = template.days[index]!;
    haptic.success();
    startSession({ name: templateDayName(template, day), workoutId: null, gymId: null, gymName: null, unit: unitFor(prefs.country), items: day.items });
    router.push('/train');
  };

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Templates' }} />
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
      {TEMPLATES.map((template) => (
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
      <Txt variant="footnote" color={color.labelSecondary} style={styles.note}>
        These are general plans, not advice for you. Start lighter than you think, leave a rep or two in the tank, and add weight when every set
        feels good. Swap anything that hurts.
      </Txt>
    </PageScroll>
  );
}

/** Each plan's mark: the whole body, the barbell, the three-way split. */
const TEMPLATE_ICON: Record<string, IconName> = { 'full-body': 'body', 'five-by-five': 'plates', ppl: 'shuffle' };
/** The marks' corners, the look's own (square in 8-bit and Classic). */
const markRound = () => Math.min(13, radius.lg);

function TemplateCard({
  template,
  next,
  logged,
  disabled,
  onStart,
}: {
  template: WorkoutTemplate;
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
  const shown = template.days[day]!;
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
      </View>
      <Txt variant="subhead" color={color.labelSecondary}>
        {template.summary}
      </Txt>
      <View style={styles.chips}>
        {template.days.map((option, index) => (
          <Chip key={option.name} label={index === next ? `${option.name} (next)` : option.name} selected={day === index} onPress={() => setDay(index)} />
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
          {shown.items.map((item) => (
            <View key={item.exerciseId} style={styles.row}>
              <ExerciseTile exerciseId={item.exerciseId} size={40} />
              <Txt variant="subhead" style={styles.flex} numberOfLines={2}>
                {exerciseName(item.exerciseId)}
              </Txt>
              <Txt variant="footnote" color={color.labelSecondary}>
                {`${item.sets} × ${item.reps}`}
              </Txt>
            </View>
          ))}
        </View>
      )}
      <PrimaryButton
        label={`Start ${shown.name}`}
        icon="play"
        disabled={disabled}
        onPress={() => onStart(day)}
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
    note: { paddingHorizontal: space[4], textAlign: 'center' },
  }),
);
