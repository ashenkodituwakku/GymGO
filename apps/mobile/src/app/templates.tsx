/**
 * Templates: well-known plans (lib/templates.ts) to start from. Each card
 * shows its days and their exercises, and starts the day after the last
 * one you did; any other day can be started too. Starting one makes it
 * the workout in progress, as Build a workout does.
 */

import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { PageScroll } from '@/components/PageScroll';
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
        <TemplateCard key={template.id} template={template} next={nextTemplateDay(template, log.sessions)} disabled={Boolean(active)} onStart={(index) => start(template, index)} />
      ))}
      <Txt variant="footnote" color={color.labelSecondary} style={styles.note}>
        These are general plans, not advice for you. Start lighter than you think, leave a rep or two in the tank, and add weight when every set
        feels good. Swap anything that hurts.
      </Txt>
    </PageScroll>
  );
}

function TemplateCard({ template, next, disabled, onStart }: { template: WorkoutTemplate; next: number; disabled: boolean; onStart: (index: number) => void }) {
  const [day, setDay] = useState(next);
  const [open, setOpen] = useState(false);
  const shown = template.days[day]!;
  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <View style={styles.flex}>
          <Txt variant="title2">{template.name}</Txt>
          <Txt variant="footnote" color={color.brand} style={face('semibold')}>
            {`${template.level} · ${template.perWeek}`}
          </Txt>
        </View>
        <Icon name="list" size={20} color={color.brand} />
      </View>
      <Txt variant="subhead" color={color.labelSecondary}>
        {template.summary}
      </Txt>
      <View style={styles.chips}>
        {template.days.map((option, index) => (
          <Chip key={option.name} label={index === next ? `${option.name} (next)` : option.name} selected={day === index} onPress={() => setDay(index)} />
        ))}
      </View>
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
              <Txt variant="subhead" style={styles.flex} numberOfLines={1}>
                {exerciseName(item.exerciseId)}
              </Txt>
              <Txt variant="footnote" color={color.labelSecondary}>
                {`${item.sets} × ${item.reps}`}
              </Txt>
            </View>
          ))}
        </View>
      )}
      <PrimaryButton label={`Start ${shown.name}`} icon="play" disabled={disabled} onPress={() => onStart(day)} />
    </Card>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], paddingBottom: space[8], gap: space[3], width: '100%', maxWidth: 560, alignSelf: 'center' },
    busy: { gap: space[2] },
    card: { gap: space[3] },
    head: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
    flex: { flex: 1, minWidth: 0 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    toggle: { flexDirection: 'row', alignItems: 'center', gap: space[1], alignSelf: 'flex-start' },
    list: { gap: 2, padding: space[2], borderRadius: radius.md, backgroundColor: color.fill },
    row: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingVertical: 6, paddingHorizontal: space[2] },
    note: { paddingHorizontal: space[4], textAlign: 'center' },
  }),
);
