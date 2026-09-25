/**
 * What members say a gym has, and a tick-list to add what you saw.
 *
 * Gyms rarely publish their equipment, and Google has no list of it either,
 * so the people who train there are the source. Their reports are shown as
 * tallies, kept apart from anything the gym publishes, and labelled as
 * members' reports. They never make a gym "Good to go" on their own.
 */

import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { EQUIPMENT_TYPES, equipmentLabel } from '@gymgo/domain';
import { api, ApiError, OfflineError, type EquipmentReportItem, type EquipmentTally } from '@/lib/api';
import { haptic } from '@/lib/haptics';
import type { AccountApi } from '@/lib/useAccount';
import { color, face, radius, space, themed } from '@/lib/theme';
import { Icon, type IconName } from './Icon';
import { PrimaryButton, TextField, Txt } from './ui';
import { FADE_IN, GLIDE } from './motion';

type Load = { state: 'loading' } | { state: 'offline' } | { state: 'ready'; reporters: number; items: EquipmentTally[]; mine: EquipmentReportItem[] };
type Answer = 'yes' | 'no' | null;

export function MemberKit({
  gymId,
  isDemo,
  account,
  inSheet,
  onSignIn,
}: {
  gymId: string;
  isDemo: boolean;
  account: AccountApi;
  inSheet: boolean;
  onSignIn: () => void;
}) {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const token = account.state === 'signed_in' ? account.token : null;

  const refresh = useCallback(() => {
    api
      .equipment(gymId, token)
      .then((data) => setLoad({ state: 'ready', ...data }))
      .catch(() => setLoad({ state: 'offline' }));
  }, [gymId, token]);

  useEffect(() => {
    setLoad({ state: 'loading' });
    setEditing(false);
    setNotice(null);
    refresh();
  }, [refresh]);

  if (isDemo) return null;
  if (load.state === 'loading') {
    return (
      <Txt variant="footnote" color={color.labelSecondary}>
        Checking what members say…
      </Txt>
    );
  }
  if (load.state === 'offline') {
    return (
      <Txt variant="footnote" color={color.labelSecondary}>
        Members’ reports come from the GymGO server, which isn’t reachable right now.
      </Txt>
    );
  }

  const tallies = [...load.items].filter((item) => item.yes + item.no > 0).sort((a, b) => b.yes - a.yes || a.no - b.no);
  const last = load.items.reduce((latest, item) => (item.lastReportedAt > latest ? item.lastReportedAt : latest), '');

  return (
    <Animated.View style={styles.wrap} layout={GLIDE}>
      <Txt variant="headline">Members say</Txt>
      {tallies.length === 0 ? (
        <Txt variant="subhead" color={color.labelSecondary}>
          Nobody has said what’s here yet. Trained here? You could be the first.
        </Txt>
      ) : (
        <View style={styles.tallies}>
          {tallies.map((item) => (
            <View key={item.equipmentTypeId} style={[styles.tally, item.yes === 0 && styles.tallyNo]}>
              <Txt variant="footnote" style={face('semibold')}>
                {equipmentLabel(item.equipmentTypeId)}
                {item.maxWeightKg ? ` to ${item.maxWeightKg} kg` : ''}
              </Txt>
              {item.yes > 0 && (
                <View style={styles.count}>
                  <Icon name="thumbsUp" size={12} color={color.goodInk} />
                  <Txt variant="footnote" color={color.labelSecondary}>
                    {item.yes}
                  </Txt>
                </View>
              )}
              {item.no > 0 && (
                <View style={styles.count}>
                  <Icon name="thumbsDown" size={12} color={color.noInk} />
                  <Txt variant="footnote" color={color.labelSecondary}>
                    {item.no}
                  </Txt>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
      {tallies.length > 0 && (
        <Txt variant="caption" color={color.labelSecondary}>
          From {load.reporters} member{load.reporters === 1 ? '' : 's'}, last on{' '}
          {new Date(last).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}. Not checked by GymGO or the gym.
        </Txt>
      )}

      {notice && (
        <Animated.View entering={FADE_IN}>
          <Txt variant="footnote" color={color.labelSecondary}>
            {notice}
          </Txt>
        </Animated.View>
      )}

      {editing && token ? (
        <Editor
          initial={load.mine}
          inSheet={inSheet}
          onCancel={() => setEditing(false)}
          onSave={async (items) => {
            try {
              await api.reportEquipment(token, gymId, items);
              haptic.success();
              setEditing(false);
              setNotice('Thanks! Your report is in. It shows as one member’s view, next to anyone else’s.');
              refresh();
            } catch (error) {
              haptic.warn();
              setNotice(
                error instanceof OfflineError
                  ? 'Can’t reach the GymGO server right now.'
                  : error instanceof ApiError
                    ? error.message
                    : 'That didn’t save. Try again?',
              );
            }
          }}
        />
      ) : (
        <PrimaryButton
          label={token ? (load.mine.length ? 'Update what you saw' : 'Trained here? Tick what they have') : 'Sign in to say what’s here'}
          tone="quiet"
          onPress={() => (token ? setEditing(true) : onSignIn())}
        />
      )}
    </Animated.View>
  );
}

function Editor({
  initial,
  inSheet,
  onCancel,
  onSave,
}: {
  initial: EquipmentReportItem[];
  inSheet: boolean;
  onCancel: () => void;
  onSave: (items: EquipmentReportItem[]) => Promise<void>;
}) {
  const [answers, setAnswers] = useState<Record<string, Answer>>(() =>
    Object.fromEntries(initial.map((item) => [item.equipmentTypeId, item.presence])),
  );
  const [dumbbellKg, setDumbbellKg] = useState(() => {
    const kg = initial.find((item) => item.equipmentTypeId === 'dumbbells')?.maxWeightKg;
    return kg ? String(kg) : '';
  });
  const [saving, setSaving] = useState(false);

  const set = (id: string, answer: Answer) => {
    haptic.select();
    setAnswers((current) => ({ ...current, [id]: current[id] === answer ? null : answer }));
  };

  const kg = dumbbellKg.trim() ? Number(dumbbellKg) : null;
  const kgInvalid = kg !== null && (!Number.isInteger(kg) || kg < 1 || kg > 200);
  const chosen = Object.entries(answers).filter((entry): entry is [string, 'yes' | 'no'] => entry[1] !== null);

  return (
    <Animated.View style={styles.editor} entering={FADE_IN}>
      <Txt variant="footnote" color={color.labelSecondary}>
        Only tick what you’ve seen yourself. Leave anything you’re not sure about.
      </Txt>
      {EQUIPMENT_TYPES.map((type) => (
        <View key={type.id} style={styles.row}>
          <Txt variant="subhead" style={styles.flex} numberOfLines={1}>
            {type.label}
          </Txt>
          <Choice label="Yes" icon="thumbsUp" on={answers[type.id] === 'yes'} onPress={() => set(type.id, 'yes')} name={`${type.label}: yes`} />
          <Choice label="No" icon="thumbsDown" on={answers[type.id] === 'no'} onPress={() => set(type.id, 'no')} name={`${type.label}: no`} />
        </View>
      ))}
      {answers.dumbbells === 'yes' && (
        <TextField
          label="Heaviest dumbbells, in kg (if you know)"
          value={dumbbellKg}
          onChangeText={setDumbbellKg}
          keyboardType="number-pad"
          inSheet={inSheet}
        />
      )}
      {kgInvalid && (
        <Txt variant="footnote" color={color.noInk}>
          Use a whole number of kg, up to 200.
        </Txt>
      )}
      <View style={styles.buttons}>
        <View style={styles.flex}>
          <PrimaryButton
            label={saving ? 'Saving…' : chosen.length ? `Save ${chosen.length}` : 'Save'}
            disabled={saving || kgInvalid}
            onPress={async () => {
              setSaving(true);
              await onSave(
                chosen.map(([equipmentTypeId, presence]) => ({
                  equipmentTypeId,
                  presence,
                  ...(equipmentTypeId === 'dumbbells' && presence === 'yes' && kg !== null ? { maxWeightKg: kg } : {}),
                })),
              );
              setSaving(false);
            }}
          />
        </View>
        <View style={styles.flex}>
          <PrimaryButton label="Cancel" tone="quiet" onPress={onCancel} />
        </View>
      </View>
    </Animated.View>
  );
}

function Choice({ label, icon, on, onPress, name }: { label: string; icon: IconName; on: boolean; onPress: () => void; name: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={name}
      hitSlop={4}
      style={({ pressed }) => [styles.choice, on && styles.choiceOn, pressed && { opacity: 0.7 }]}
    >
      <Icon name={icon} size={13} color={on ? color.onBrand : color.label} />
      <Txt variant="footnote" color={on ? color.onBrand : color.label} style={face('medium')}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = themed(() => StyleSheet.create({
  wrap: { gap: space[2], paddingTop: space[3], borderTopWidth: StyleSheet.hairlineWidth, borderColor: color.separator },
  flex: { flex: 1 },
  tallies: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  count: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  tally: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: color.goodTint,
  },
  tallyNo: { backgroundColor: color.noTint },
  editor: { gap: space[2] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: color.fill,
  },
  choiceOn: { backgroundColor: color.brandFill },
  buttons: { flexDirection: 'row', gap: space[2], marginTop: space[1] },
}));
