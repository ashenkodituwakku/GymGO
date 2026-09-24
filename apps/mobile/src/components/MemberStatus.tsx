/**
 * Whether a gym is still there, from members.
 *
 * Map data can be years old and nobody has checked every gym is trading. So
 * members who went by can say it has closed, or that it's still open. When
 * more say closed than open, the card warns at the top, on their word and
 * labelled as theirs; the report form sits under "Where this comes from".
 * Only the last six months count.
 */

import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { api, ApiError, OfflineError, type GymStatusSummary } from '@/lib/api';
import { haptic } from '@/lib/haptics';
import { WHEN_CHOICES, localDateDaysAgo } from '@/lib/present';
import type { AccountApi } from '@/lib/useAccount';
import { color, face, radius, space } from '@/lib/theme';
import { Icon } from './Icon';
import { PrimaryButton, Txt } from './ui';

// Both parts of the card read the same answer; a report refreshes both.
const listeners = new Map<string, Set<() => void>>();
const changed = (gymId: string) => listeners.get(gymId)?.forEach((listen) => listen());

function useGymStatus(gymId: string, token: string | null, skip: boolean) {
  const [summary, setSummary] = useState<GymStatusSummary | null>(null);
  const load = useCallback(() => {
    if (skip) return;
    api
      .gymStatus(gymId, token)
      .then(setSummary)
      .catch(() => setSummary(null));
  }, [gymId, token, skip]);
  useEffect(() => {
    setSummary(null);
    load();
    const set = listeners.get(gymId) ?? new Set();
    set.add(load);
    listeners.set(gymId, set);
    return () => {
      set.delete(load);
    };
  }, [gymId, load]);
  return summary;
}

const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** The warning at the top of the card, only when members mostly say it has closed. */
export function StatusWarning({ gymId, isDemo, token }: { gymId: string; isDemo: boolean; token: string | null }) {
  const summary = useGymStatus(gymId, token, isDemo);
  if (!summary || summary.closed === 0 || summary.closed <= summary.open) return null;
  return (
    <View style={styles.warning} accessibilityRole="alert">
      <Icon name="no" size={18} color={color.noInk} />
      <View style={styles.flex}>
        <Txt variant="headline" color={color.noInk}>
          Members say this gym has closed
        </Txt>
        <Txt variant="footnote" color={color.labelSecondary}>
          {summary.closed} member{summary.closed === 1 ? '' : 's'}, latest {shortDate(summary.latestClosedOn!)}
          {summary.open > 0 ? `; ${summary.open} say${summary.open === 1 ? 's' : ''} it’s still open` : ''}. Not checked by GymGO: check
          before you go.
        </Txt>
      </View>
    </View>
  );
}

/** Saying it has closed, or that it's still open, under "Where this comes from". */
export function MemberStatus({ gymId, isDemo, account, onSignIn }: { gymId: string; isDemo: boolean; account: AccountApi; onSignIn: () => void }) {
  const token = account.state === 'signed_in' ? account.token : null;
  const summary = useGymStatus(gymId, token, isDemo);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<'closed' | 'open' | null>(null);
  const [when, setWhen] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  if (isDemo || !summary) return null;

  const fail = (error: unknown) => {
    haptic.warn();
    setNotice(error instanceof OfflineError ? 'Can’t reach the GymGO server right now.' : error instanceof ApiError ? error.message : 'That didn’t save. Try again?');
  };
  const save = async () => {
    if (!token || !status) return;
    try {
      await api.reportGymStatus(token, gymId, { status, seenOn: localDateDaysAgo(WHEN_CHOICES[when]!.days) });
      haptic.success();
      setEditing(false);
      setNotice('Thanks! It shows as one member’s report, next to anyone else’s.');
      changed(gymId);
    } catch (error) {
      fail(error);
    }
  };
  const remove = async () => {
    if (!token) return;
    try {
      await api.deleteGymStatus(token, gymId);
      haptic.success();
      setEditing(false);
      setNotice('Your report is gone.');
      changed(gymId);
    } catch (error) {
      fail(error);
    }
  };
  const chip = (key: string, label: string, on: boolean, onPress: () => void) => (
    <Pressable
      key={key}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && { opacity: 0.7 }]}
    >
      <Txt variant="footnote" color={on ? color.onBrand : color.label} style={face('medium')}>
        {label}
      </Txt>
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      <Txt variant="headline">Is it still there?</Txt>
      <Txt variant="footnote" color={color.labelSecondary}>
        {summary.closed + summary.open === 0
          ? 'The map can be out of date, and no member has said yet.'
          : `In the last six months, ${summary.closed} member${summary.closed === 1 ? '' : 's'} said it has closed and ${summary.open} said it’s still open.`}
      </Txt>
      {notice && (
        <Txt variant="footnote" color={color.labelSecondary}>
          {notice}
        </Txt>
      )}
      {editing && token ? (
        <View style={styles.editor}>
          <View style={styles.chips}>
            {chip('closed', 'It has closed', status === 'closed', () => setStatus('closed'))}
            {chip('open', 'It’s still open', status === 'open', () => setStatus('open'))}
          </View>
          <Txt variant="footnote" color={color.labelSecondary}>
            When did you see it?
          </Txt>
          <View style={styles.chips}>{WHEN_CHOICES.slice(0, 4).map((option, index) => chip(option.label, option.label, when === index, () => setWhen(index)))}</View>
          <View style={styles.buttons}>
            <View style={styles.flex}>
              <PrimaryButton label="Save" disabled={!status} onPress={() => void save()} />
            </View>
            <View style={styles.flex}>
              <PrimaryButton label="Cancel" tone="quiet" onPress={() => setEditing(false)} />
            </View>
          </View>
          {summary.mine && <PrimaryButton label="Remove my report" tone="quiet" onPress={() => void remove()} />}
        </View>
      ) : (
        <PrimaryButton
          label={token ? (summary.mine ? 'Change what you saw' : 'Closed, or still open? Say so') : 'Sign in to say if it has closed'}
          tone="quiet"
          onPress={() => {
            if (!token) return onSignIn();
            setStatus(summary.mine?.status ?? null);
            setEditing(true);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  warning: {
    flexDirection: 'row',
    gap: space[3],
    alignItems: 'flex-start',
    padding: space[3],
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: color.noTint,
  },
  wrap: { gap: space[2], paddingTop: space[3], marginTop: space[2], borderTopWidth: StyleSheet.hairlineWidth, borderColor: color.separator },
  editor: { gap: space[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  chip: { paddingHorizontal: space[3], paddingVertical: 6, borderRadius: radius.pill, backgroundColor: color.fill },
  chipOn: { backgroundColor: color.brand },
  buttons: { flexDirection: 'row', gap: space[2] },
});
