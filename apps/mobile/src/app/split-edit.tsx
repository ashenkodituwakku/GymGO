/**
 * A split of your own (Pro): a name and up to seven days, each a workout of
 * its own (components/PlanEditor.tsx). Kept on your account; Templates
 * lists it under Your splits, and it takes turns through its days like
 * GymGO's templates do. `id` opens one you made, to change or delete it.
 *
 * Leaving with changes not kept asks first.
 */

import { cleanSplit } from '@gymgo/domain';
import { useLocalSearchParams, usePreventRemove, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { PageScroll } from '@/components/PageScroll';
import { PlanEditor } from '@/components/PlanEditor';
import { useGlassRedraw } from '@/components/Redrawn';
import { ScreenOptions } from '@/components/ScreenOptions';
import { Card, Chip, PrimaryButton, TextField, Txt } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { askToDiscard } from '@/lib/askToDiscard';
import { haptic } from '@/lib/haptics';
import { addSplit, changeSplit, deleteSplit, useOwnTraining } from '@/lib/ownTraining';
import { usePageTitle } from '@/lib/pageTitle';
import type { PlanItem } from '@/lib/planEdit';
import { TEMPLATES } from '@/lib/templates';
import { color, face, radius, space, themed } from '@/lib/theme';
import { Icon, type IconName } from '@/components/Icon';
import { Pressable } from '@/components/motion';

interface DraftDay {
  name: string;
  items: PlanItem[];
}
interface Draft {
  name: string;
  days: DraftDay[];
}

const MOST_DAYS = 7;
/** A name for a new day that no day has yet: Day 1, Day 2… */
const freshDayName = (days: readonly DraftDay[]) => {
  for (let n = days.length + 1; ; n += 1) if (!days.some((day) => day.name.trim().toLowerCase() === `day ${n}`)) return `Day ${n}`;
};

export default function SplitEditScreen() {
  useGlassRedraw();
  const { id } = useLocalSearchParams<{ id?: string }>();
  usePageTitle(id ? 'Change split' : 'Your own split');
  const router = useRouter();
  const { account, billing, openPro } = useApp();
  const token = account.token;
  const own = useOwnTraining();
  const existing = id ? (own.splits.find((split) => split.id === id) ?? null) : null;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [original, setOriginal] = useState<string | null>(null);
  const [day, setDay] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // A new one starts with two days to fill; one you made, as you made it.
  useEffect(() => {
    if (draft) return;
    if (id && !existing) return;
    const filled: Draft = existing
      ? { name: existing.name, days: existing.days.map((each) => ({ name: each.name, items: each.items.map((item) => ({ ...item })) })) }
      : { name: '', days: [{ name: 'Day 1', items: [] }, { name: 'Day 2', items: [] }] };
    setDraft(filled);
    setOriginal(JSON.stringify(filled));
  }, [id, existing, draft]);

  const changed = draft !== null && original !== null && JSON.stringify(draft) !== original;
  const stopAsking = usePreventRemove(changed && !leaving, ({ repeat }) =>
    askToDiscard(id ? 'this split' : 'your split', () => {
      setLeaving(true);
      repeat();
    }),
  );

  if (!draft) {
    return (
      <PageScroll style={styles.page} contentContainerStyle={styles.content}>
        <ScreenOptions options={{ title: '' }} />
        <Txt variant="title2" accessibilityRole="header" level={1}>
          {own.fresh || !token ? 'That split isn’t in your account' : 'Loading your split…'}
        </Txt>
        <PrimaryButton label="Templates" tone="quiet" onPress={() => router.replace('/templates')} />
      </PageScroll>
    );
  }

  const shown = draft.days[Math.min(day, draft.days.length - 1)]!;
  const shownAt = draft.days.indexOf(shown);
  const changeDay = (patch: Partial<DraftDay>) => setDraft({ ...draft, days: draft.days.map((each, at) => (at === shownAt ? { ...each, ...patch } : each)) });

  const save = async () => {
    if (!billing.isPro || !token) return openPro('splits');
    const checked = cleanSplit(draft);
    if (!checked.ok) {
      haptic.warn();
      return setProblem(checked.problem);
    }
    // A template's name would make its days' workouts look like the template's.
    if (TEMPLATES.some((template) => template.name.toLowerCase() === checked.value.name.toLowerCase())) {
      haptic.warn();
      return setProblem(`“${checked.value.name}” is one of GymGO’s templates: give yours a name of its own.`);
    }
    setProblem(null);
    setSaving(true);
    try {
      if (existing) await changeSplit(token, existing.id, checked.value);
      else await addSplit(token, checked.value);
      haptic.success();
      setLeaving(true);
      stopAsking();
      router.canGoBack() ? router.back() : router.replace('/templates');
    } catch (error) {
      setProblem(error instanceof ApiError ? error.message : 'Couldn’t reach the GymGO server. Your split is still here; try again.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!existing || !token) return;
    if (!deleting) return setDeleting(true);
    try {
      await deleteSplit(token, existing.id);
      haptic.success();
      setLeaving(true);
      stopAsking();
      router.canGoBack() ? router.back() : router.replace('/templates');
    } catch {
      setProblem('Couldn’t delete it just now. Try again.');
    }
  };

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScreenOptions options={{ title: '' }} />
      <View style={styles.intro}>
        <Txt variant="largeTitle" accessibilityRole="header" level={1}>
          {id ? 'Change split' : 'Your own split'}
        </Txt>
        <Txt variant="subhead" color={color.labelSecondary}>
          Days that take turns, like the templates: each time, it offers the day after the one you did last.
        </Txt>
      </View>
      <Card style={styles.nameCard}>
        <TextField label="Split’s name" inSheet={false} value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} maxLength={60} placeholder="My push, pull, legs" />
      </Card>

      <Txt variant="eyebrow" color={color.labelSecondary} style={styles.section}>
        {`DAYS · ${draft.days.length} OF UP TO ${MOST_DAYS}`}
      </Txt>
      <View style={styles.days} accessibilityLabel="Days of the split">
        {draft.days.map((each, at) => (
          <Chip
            key={at}
            label={each.name.trim() || `Day ${at + 1}`}
            selected={at === shownAt}
            accessibilityLabel={`${each.name.trim() || `Day ${at + 1}`}, ${each.items.length} exercise${each.items.length === 1 ? '' : 's'}${at === shownAt ? ', shown' : ''}`}
            onPress={() => setDay(at)}
          />
        ))}
        {draft.days.length < MOST_DAYS && (
          <Chip
            label="Add a day"
            icon="plus"
            action
            selected={false}
            onPress={() => {
              setDraft({ ...draft, days: [...draft.days, { name: freshDayName(draft.days), items: [] }] });
              setDay(draft.days.length);
            }}
          />
        )}
      </View>

      <Card style={styles.dayCard}>
        <TextField label="Day’s name" inSheet={false} value={shown.name} onChangeText={(name) => changeDay({ name })} maxLength={40} placeholder="Push, Upper A…" />
        <View style={styles.dayButtons}>
          {shownAt > 0 && (
            <DayButton
              icon="chevronBack"
              label="Move earlier"
              spoken={`Move ${shown.name.trim() || 'this day'} earlier in the split`}
              onPress={() => {
                const days = [...draft.days];
                [days[shownAt - 1], days[shownAt]] = [days[shownAt]!, days[shownAt - 1]!];
                setDraft({ ...draft, days });
                setDay(shownAt - 1);
              }}
            />
          )}
          {draft.days.length > 1 && (
            <DayButton
              icon="trash"
              label="Remove this day"
              spoken={`Remove ${shown.name.trim() || 'this day'} from the split`}
              danger
              onPress={() => {
                setDraft({ ...draft, days: draft.days.filter((_, at) => at !== shownAt) });
                setDay(Math.max(0, shownAt - 1));
              }}
            />
          )}
        </View>
      </Card>

      <PlanEditor key={shownAt} items={shown.items} onChange={(items) => changeDay({ items })} where={shown.name.trim() || `day ${shownAt + 1}`} />

      <View style={styles.actions}>
        {problem && (
          <Txt variant="footnote" color={color.dangerInk} style={styles.center}>
            {problem}
          </Txt>
        )}
        <PrimaryButton label={saving ? 'Saving…' : existing ? 'Save changes' : billing.isPro ? 'Keep this split' : 'Keep this split · Pro'} icon="save" disabled={saving} onPress={() => void save()} />
        {existing && <PrimaryButton label={deleting ? 'Tap again to delete it' : 'Delete this split'} icon="trash" tone="danger" onPress={() => void remove()} />}
        {existing && (
          <Txt variant="footnote" color={color.labelSecondary} style={styles.center}>
            Workouts you’ve done with it stay in your log either way.
          </Txt>
        )}
      </View>
    </PageScroll>
  );
}

function DayButton({ icon, label, spoken, onPress, danger = false }: { icon: IconName; label: string; spoken: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={spoken}
      style={({ pressed }) => [styles.dayButton, danger && styles.dayButtonDanger, pressed && { opacity: 0.6 }]}
    >
      <Icon name={icon} size={13} color={danger ? color.dangerInk : color.brand} />
      <Txt variant="footnote" color={danger ? color.dangerInk : color.brand} style={face('semibold')}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], paddingBottom: space[8], gap: space[3], width: '100%', maxWidth: 640, alignSelf: 'center' },
    intro: { gap: space[1] },
    nameCard: { gap: space[2] },
    section: { marginTop: space[2], marginLeft: space[4] },
    days: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    dayCard: { gap: space[3] },
    dayButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    dayButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space[3], paddingVertical: 7, borderRadius: radius.pill, backgroundColor: color.brandTint },
    dayButtonDanger: { backgroundColor: color.dangerTint },
    actions: { gap: space[2], marginTop: space[2] },
    center: { textAlign: 'center' },
  }),
);
