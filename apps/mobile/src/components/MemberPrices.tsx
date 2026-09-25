/**
 * What members paid for one casual visit, and a way to add what you paid.
 *
 * Most gyms on the map don't publish a visit price, so the people who've
 * paid are the next-best source. Their reports are shown as theirs: the
 * typical figure (the median, so one odd report can't move it far), the
 * range, how many and how recent. They never count as the gym's price, and
 * never make a gym "Good to go".
 */

import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { api, problemText, type PriceSummary } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { moneyLabel, tracksPrices } from '@/lib/places';
import { WHEN_CHOICES as WHEN, localDateDaysAgo as dateDaysAgo, parseAmount } from '@/lib/present';
import type { AccountApi } from '@/lib/useAccount';
import { color, space } from '@/lib/theme';
import { ChoiceChip, PrimaryButton, TextField, Txt } from './ui';
import { FADE_IN, GLIDE } from './motion';

type Load = { state: 'loading' } | { state: 'offline' } | { state: 'ready'; summary: PriceSummary };

export function MemberPrices({
  gymId,
  isDemo,
  country,
  account,
  inSheet,
  onSignIn,
}: {
  gymId: string;
  isDemo: boolean;
  country: string;
  account: AccountApi;
  inSheet: boolean;
  onSignIn: () => void;
}) {
  const { data } = useApp();
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const token = account.state === 'signed_in' ? account.token : null;

  const kept = tracksPrices(country);
  const refresh = useCallback(() => {
    if (!kept) return;
    api
      .prices(gymId, token)
      .then((summary) => setLoad({ state: 'ready', summary }))
      .catch(() => setLoad({ state: 'offline' }));
  }, [gymId, token, kept]);

  useEffect(() => {
    setLoad({ state: 'loading' });
    setEditing(false);
    setNotice(null);
    refresh();
  }, [refresh]);

  if (isDemo) return null;
  if (!kept) {
    return (
      <Animated.View style={styles.wrap} layout={GLIDE}>
        <Txt variant="headline">What members paid</Txt>
        <Txt variant="subhead" color={color.labelSecondary}>
          GymGO keeps visit prices in Australia, the US, the UK, Switzerland and the euro countries for now, so ask what a visit costs when you call.
        </Txt>
      </Animated.View>
    );
  }
  if (load.state === 'loading') return null;
  if (load.state === 'offline') return null;

  const { summary } = load;
  const money = (minor: number) => moneyLabel(minor, country);
  const fail = (error: unknown) => {
    haptic.warn();
    setNotice(problemText(error));
  };

  return (
    <Animated.View style={styles.wrap} layout={GLIDE}>
      <Txt variant="headline">What members paid</Txt>
      {summary.count === 0 || summary.typicalMinor === null ? (
        <Txt variant="subhead" color={color.labelSecondary}>
          No member has said what a casual visit cost here yet.
        </Txt>
      ) : (
        <>
          <Txt variant="subhead">
            {/* "About", so whole dollars: the median of two reports can land on odd cents. */}
            About <Txt variant="headline">{money(Math.round(summary.typicalMinor / 100) * 100)}</Txt> for a casual visit
          </Txt>
          <Txt variant="caption" color={color.labelSecondary}>
            {summary.count === 1
              ? 'From one member'
              : `From ${summary.count} members, ${money(summary.lowMinor!)} to ${money(summary.highMinor!)}`}
            , last paid{' '}
            {new Date(summary.latestPaidOn!).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}. Not checked
            by GymGO or the gym, so ask before you go.
          </Txt>
        </>
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
          country={country}
          initial={summary.mine}
          inSheet={inSheet}
          onCancel={() => setEditing(false)}
          onRemove={
            summary.mine
              ? async () => {
                  try {
                    await api.deletePrice(token, gymId);
                    haptic.success();
                    setEditing(false);
                    setNotice('Your report is gone.');
                    refresh();
                    data.refreshMemberPrices();
                  } catch (error) {
                    fail(error);
                  }
                }
              : undefined
          }
          onSave={async (amountMinor, paidOn) => {
            try {
              await api.reportPrice(token, gymId, { amountMinor, paidOn });
              haptic.success();
              setEditing(false);
              setNotice('Thanks! It shows as one member’s report, next to anyone else’s.');
              refresh();
              data.refreshMemberPrices();
            } catch (error) {
              fail(error);
            }
          }}
        />
      ) : (
        <PrimaryButton
          label={token ? (summary.mine ? `You said ${money(summary.mine.amountMinor)}. Change it` : 'Paid for a visit? Say how much') : 'Sign in to say what you paid'}
          tone="quiet"
          onPress={() => (token ? setEditing(true) : onSignIn())}
        />
      )}
    </Animated.View>
  );
}

function Editor({
  country,
  initial,
  inSheet,
  onCancel,
  onRemove,
  onSave,
}: {
  country: string;
  initial: PriceSummary['mine'];
  inSheet: boolean;
  onCancel: () => void;
  onRemove?: () => Promise<void>;
  onSave: (amountMinor: number, paidOn: string) => Promise<void>;
}) {
  const [amount, setAmount] = useState(initial ? (initial.amountMinor / 100).toFixed(initial.amountMinor % 100 ? 2 : 0) : '');
  const [when, setWhen] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const minor = parseAmount(amount);
  const invalid = amount.trim() !== '' && (minor === null || minor < 100 || minor > 50000);
  // "A$", "$", "€", "£", "CHF": the label's own symbol, without the number.
  const symbol = moneyLabel(100, country).replace(/\s?1$/, '');

  return (
    <Animated.View style={styles.editor} entering={FADE_IN}>
      <TextField
        label={`What one casual visit cost, in ${symbol}`}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="25"
        inSheet={inSheet}
      />
      {invalid && (
        <Txt variant="footnote" color={color.noInk}>
          Enter an amount between {symbol}1 and {symbol}500, like 25 or 24.50.
        </Txt>
      )}
      <Txt variant="footnote" color={color.labelSecondary}>
        When did you pay?
      </Txt>
      <View style={styles.chips}>
        {WHEN.map((option, index) => (
          <ChoiceChip key={option.label} label={option.label} selected={when === index} onPress={() => setWhen(index)} />
        ))}
      </View>
      <Txt variant="caption" color={color.labelSecondary}>
        Only what you paid yourself, for one visit. Others see the amount and roughly when, never your name.
      </Txt>
      <View style={styles.buttons}>
        <View style={styles.flex}>
          <PrimaryButton
            label={saving ? 'Saving…' : 'Save price'}
            disabled={saving || minor === null || invalid}
            onPress={async () => {
              if (minor === null) return;
              setSaving(true);
              await onSave(minor, dateDaysAgo(WHEN[when]!.days));
              setSaving(false);
            }}
          />
        </View>
        <View style={styles.flex}>
          <PrimaryButton label="Cancel" tone="quiet" onPress={onCancel} />
        </View>
      </View>
      {onRemove && <PrimaryButton label="Remove my report" tone="quiet" onPress={() => void onRemove()} />}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[2], paddingTop: space[3], borderTopWidth: StyleSheet.hairlineWidth, borderColor: color.separator },
  flex: { flex: 1 },
  editor: { gap: space[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  buttons: { flexDirection: 'row', gap: space[2] },
});
