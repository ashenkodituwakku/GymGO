/**
 * How getting in went for members who visited as guests, and a way to add
 * your own visit.
 *
 * Whether a visitor can walk in is the question GymGO exists to answer, and
 * most gyms don't publish it. So members say what happened when they went:
 * walked straight in, had to book first, or were turned away. Shown as
 * counts, labelled as theirs, and never as the gym's rule: it never makes a
 * gym "Good to go". Door rules change, so only the last year counts.
 */

import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { api, problemText, type AccessOutcome, type AccessSummary } from '@/lib/api';
import { haptic } from '@/lib/haptics';
import { WHEN_CHOICES, localDateDaysAgo } from '@/lib/present';
import type { AccountApi } from '@/lib/useAccount';
import { color, face, space } from '@/lib/theme';
import { Icon, type IconName } from './Icon';
import { ChoiceChip, PrimaryButton, Txt } from './ui';

type Load = { state: 'loading' } | { state: 'offline' } | { state: 'ready'; summary: AccessSummary };

const OUTCOMES: Array<{ id: AccessOutcome; label: string; icon: IconName; ink: string }> = [
  { id: 'walked_in', label: 'Walked in', icon: 'good', ink: color.goodInk },
  { id: 'booked_first', label: 'Had to book first', icon: 'calendar', ink: color.maybeInk },
  { id: 'turned_away', label: 'Turned away', icon: 'no', ink: color.noInk },
];

export function MemberAccess({
  gymId,
  isDemo,
  account,
  onSignIn,
}: {
  gymId: string;
  isDemo: boolean;
  account: AccountApi;
  onSignIn: () => void;
}) {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const token = account.state === 'signed_in' ? account.token : null;

  const refresh = useCallback(() => {
    api
      .access(gymId, token)
      .then((summary) => setLoad({ state: 'ready', summary }))
      .catch(() => setLoad({ state: 'offline' }));
  }, [gymId, token]);

  useEffect(() => {
    setLoad({ state: 'loading' });
    setEditing(false);
    setNotice(null);
    refresh();
  }, [refresh]);

  if (isDemo || load.state !== 'ready') return null;
  const { summary } = load;
  const fail = (error: unknown) => {
    haptic.warn();
    setNotice(problemText(error));
  };
  const counts: Record<AccessOutcome, number> = {
    walked_in: summary.walkedIn,
    booked_first: summary.bookedFirst,
    turned_away: summary.turnedAway,
  };

  return (
    <View style={styles.wrap}>
      <Txt variant="headline">What visiting members found</Txt>
      {summary.count === 0 ? (
        <Txt variant="subhead" color={color.labelSecondary}>
          No member has said how getting in went yet.
        </Txt>
      ) : (
        <>
          <View style={styles.counts}>
            {OUTCOMES.filter((outcome) => counts[outcome.id] > 0).map((outcome) => (
              <View key={outcome.id} style={styles.count}>
                <Icon name={outcome.icon} size={14} color={outcome.ink} />
                <Txt variant="subhead">
                  {outcome.label} <Txt variant="subhead" style={face('bold')}>{counts[outcome.id]}</Txt>
                </Txt>
              </View>
            ))}
          </View>
          <Txt variant="caption" color={color.labelSecondary}>
            From {summary.count} member{summary.count === 1 ? '' : 's'} in the last year, latest{' '}
            {new Date(summary.latestVisitOn!).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}. Their visits, not the
            gym’s rule: still call first.
          </Txt>
        </>
      )}

      {notice && (
        <Txt variant="footnote" color={color.labelSecondary}>
          {notice}
        </Txt>
      )}

      {editing && token ? (
        <Editor
          initial={summary.mine?.outcome ?? null}
          onCancel={() => setEditing(false)}
          onRemove={
            summary.mine
              ? async () => {
                  try {
                    await api.deleteAccess(token, gymId);
                    haptic.success();
                    setEditing(false);
                    setNotice('Your report is gone.');
                    refresh();
                  } catch (error) {
                    fail(error);
                  }
                }
              : undefined
          }
          onSave={async (outcome, visitedOn) => {
            try {
              await api.reportAccess(token, gymId, { outcome, visitedOn });
              haptic.success();
              setEditing(false);
              setNotice('Thanks! It shows as one member’s visit, next to anyone else’s.');
              refresh();
            } catch (error) {
              fail(error);
            }
          }}
        />
      ) : (
        <PrimaryButton
          label={token ? (summary.mine ? 'Change how your visit went' : 'Visited as a guest? Say how it went') : 'Sign in to say how getting in went'}
          tone="quiet"
          onPress={() => (token ? setEditing(true) : onSignIn())}
        />
      )}
    </View>
  );
}

function Editor({
  initial,
  onCancel,
  onRemove,
  onSave,
}: {
  initial: AccessOutcome | null;
  onCancel: () => void;
  onRemove?: () => Promise<void>;
  onSave: (outcome: AccessOutcome, visitedOn: string) => Promise<void>;
}) {
  const [outcome, setOutcome] = useState<AccessOutcome | null>(initial);
  const [when, setWhen] = useState(0);
  const [saving, setSaving] = useState(false);

  const chip = (key: string, label: string, on: boolean, onPress: () => void, icon?: IconName) => (
    <ChoiceChip key={key} label={label} selected={on} onPress={onPress} icon={icon} />
  );

  return (
    <View style={styles.editor}>
      <Txt variant="footnote" color={color.labelSecondary}>
        When you went as a visitor (not as a member), what happened?
      </Txt>
      <View style={styles.chips}>
        {OUTCOMES.map((item) => chip(item.id, item.label, outcome === item.id, () => setOutcome(item.id), item.icon))}
      </View>
      <Txt variant="footnote" color={color.labelSecondary}>
        When?
      </Txt>
      <View style={styles.chips}>
        {WHEN_CHOICES.map((option, index) => chip(option.label, option.label, when === index, () => setWhen(index)))}
      </View>
      <Txt variant="caption" color={color.labelSecondary}>
        Only your own visit. Others see what happened and roughly when, never your name.
      </Txt>
      <View style={styles.buttons}>
        <View style={styles.flex}>
          <PrimaryButton
            label={saving ? 'Saving…' : 'Save visit'}
            disabled={saving || outcome === null}
            onPress={async () => {
              if (!outcome) return;
              setSaving(true);
              await onSave(outcome, localDateDaysAgo(WHEN_CHOICES[when]!.days));
              setSaving(false);
            }}
          />
        </View>
        <View style={styles.flex}>
          <PrimaryButton label="Cancel" tone="quiet" onPress={onCancel} />
        </View>
      </View>
      {onRemove && <PrimaryButton label="Remove my report" tone="quiet" onPress={() => void onRemove()} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[2], paddingTop: space[3], borderTopWidth: StyleSheet.hairlineWidth, borderColor: color.separator },
  flex: { flex: 1 },
  counts: { gap: space[1] },
  count: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  editor: { gap: space[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  buttons: { flexDirection: 'row', gap: space[2] },
});
