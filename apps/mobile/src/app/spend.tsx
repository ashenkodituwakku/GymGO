/**
 * What you pay (lib/visitCost.ts): enter a membership or something paid
 * once, and see what each visit really costs over the last 30 or 90 days or
 * the year, from your check-ins and workouts logged at a gym. For a
 * membership at a gym that publishes a visit price, when the membership
 * beats paying each time. The amounts are yours, kept on this device only.
 */

import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { COUNTRY_CURRENCY, priceLabel } from '@gymgo/domain';
import { Icon } from '@/components/Icon';
import { Pressable } from '@/components/motion';
import { PageScroll } from '@/components/PageScroll';
import { useGlassRedraw } from '@/components/Redrawn';
import { ScreenOptions } from '@/components/ScreenOptions';
import { Card, ChoiceChip, PrimaryButton, Segmented, TextField, Txt } from '@/components/ui';
import { useApp } from '@/lib/app-state';
import { dateLabel } from '@/lib/copy';
import { haptic } from '@/lib/haptics';
import { usePageTitle } from '@/lib/pageTitle';
import { spends } from '@/lib/spendStore';
import { color, space, themed } from '@/lib/theme';
import { useCollection } from '@/lib/useCollection';
import { useTrainingLog } from '@/lib/useTraining';
import { EVERY, compareLine, localDay, spendReports, totals, visitDays, visitPrice, addDays, type Every, type Spend } from '@/lib/visitCost';
import { useTapAgain } from '@/lib/tapAgain';

const PERIODS = [
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 365, label: 'Year' },
];

export default function SpendScreen() {
  useGlassRedraw();
  usePageTitle('What you pay');
  const router = useRouter();
  const { account, data } = useApp();
  const list = spends.use();
  const collection = useCollection();
  const log = useTrainingLog(account.token);
  const [days, setDays] = useState(30);
  const [adding, setAdding] = useState(false);
  const today = localDay(new Date().toISOString());
  const reports = useMemo(() => spendReports(list, collection.gyms, log.sessions, today, days), [list, collection.gyms, log.sessions, today, days]);
  const sums = totals(reports);

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content}>
      <ScreenOptions options={{ title: '' }} />
      <View style={styles.intro}>
        <Txt variant="largeTitle" accessibilityRole="header" level={1}>
          What each visit costs
        </Txt>
        <Txt variant="subhead" color={color.labelSecondary}>
          Add what you pay; your check-ins and workouts logged at a gym are the visits. What you enter stays on this device.
        </Txt>
      </View>

      {list.length > 0 && (
        <>
          <Segmented options={PERIODS} value={days} onChange={(value: number) => setDays(value)} />
          {sums.map((sum) => (
            <Card key={sum.currency} style={styles.card}>
              <Txt variant="label" color={color.labelSecondary}>
                {`Last ${days === 365 ? 'year' : `${days} days`}${sums.length > 1 ? ` · ${sum.currency}` : ''}`}
              </Txt>
              <Txt variant="largeTitle">{sum.perVisitMinor !== null ? `${priceLabel(sum.perVisitMinor, sum.currency)} a visit` : 'No visits yet'}</Txt>
              <Txt variant="subhead" color={color.labelSecondary}>
                {`${priceLabel(sum.spentMinor, sum.currency)} over ${sum.visits} visit${sum.visits === 1 ? '' : 's'}`}
              </Txt>
            </Card>
          ))}
          {reports.map((report) => (
            <SpendCard
              key={report.spend.id}
              report={report}
              line={
                report.spend.kind === 'membership' && report.spend.gymId
                  ? compareLine(
                      report.spend,
                      visitPrice(data.records.find((record) => record.location.id === report.spend.gymId) ?? null, report.spend.currency, today),
                      visitDays(collection.gyms, log.sessions, report.spend.gymId).filter((day) => day > addDays(today, -30) && day <= today && day >= report.spend.startedOn).length,
                      (iso) => dateLabel(iso, { day: 'numeric', month: 'short', year: 'numeric' }),
                    )
                  : null
              }
              onOpenGym={report.spend.gymId ? () => router.push({ pathname: '/gym/[id]', params: { id: report.spend.gymId! } }) : null}
            />
          ))}
        </>
      )}

      {adding ? (
        <AddSpend onDone={() => setAdding(false)} />
      ) : (
        <PrimaryButton label={list.length ? 'Add something else you pay' : 'Add what you pay'} icon="plus" tone={list.length ? 'quiet' : 'brand'} onPress={() => setAdding(true)} />
      )}
      <Txt variant="footnote" color={color.labelSecondary} style={styles.note}>
        A membership counts by the day it ran; something paid once counts in the period you paid. Visits are the days you checked in or logged a workout at
        that gym. Different currencies are never added together.
      </Txt>
    </PageScroll>
  );
}

function SpendCard({ report, line, onOpenGym }: { report: ReturnType<typeof spendReports>[number]; line: string | null; onOpenGym: (() => void) | null }) {
  const { spend } = report;
  const [confirm, setConfirm] = useTapAgain();
  const every = EVERY.find((entry) => entry.id === spend.every);
  const today = localDay(new Date().toISOString());
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Txt variant="headline">{spend.label}</Txt>
          <Txt variant="footnote" color={color.labelSecondary}>
            {`${spend.gymName ?? 'Any gym'} · ${priceLabel(spend.amountMinor, spend.currency)}${every ? ` ${every.label}` : ', paid once'} · since ${dateLabel(spend.startedOn)}${spend.endedOn ? `, ended ${dateLabel(spend.endedOn)}` : ''}`}
          </Txt>
        </View>
        {onOpenGym && (
          <Pressable onPress={onOpenGym} accessibilityRole="link" accessibilityLabel={`Open ${spend.gymName}`} hitSlop={8}>
            <Icon name="chevron" size={14} color={color.labelTertiary} />
          </Pressable>
        )}
      </View>
      <Txt variant="subhead">
        {report.perVisitMinor !== null
          ? `${priceLabel(report.perVisitMinor, spend.currency)} a visit: ${priceLabel(report.spentMinor, spend.currency)} over ${report.visits} visit${report.visits === 1 ? '' : 's'}`
          : report.spentMinor > 0
            ? `${priceLabel(report.spentMinor, spend.currency)} so far, and no visits in this time`
            : 'Nothing paid in this time'}
      </Txt>
      {line && (
        <Txt variant="footnote" color={color.labelSecondary}>
          {line}
        </Txt>
      )}
      <View style={styles.actions}>
        {spend.kind === 'membership' && !spend.endedOn && (
          <PrimaryButton
            label="It ended today"
            tone="quiet"
            onPress={() => {
              haptic.select();
              spends.update((now) => now.map((each) => (each.id === spend.id ? { ...each, endedOn: today } : each)));
            }}
          />
        )}
        <PrimaryButton
          label={confirm ? 'Tap again to remove it' : 'Remove'}
          tone="danger"
          onPress={() => {
            if (!confirm) return setConfirm(true);
            spends.update((now) => now.filter((each) => each.id !== spend.id));
          }}
        />
      </View>
    </Card>
  );
}

function AddSpend({ onDone }: { onDone: () => void }) {
  const { account, data, prefs } = useApp();
  const collection = useCollection();
  // Your gyms: saved ones, then ones you've checked in at.
  const gyms = useMemo(() => {
    const names = new Map<string, { name: string; country: string | null }>();
    for (const id of account.saved) {
      const record = data.records.find((each) => each.location.id === id);
      if (record) names.set(id, { name: record.location.name, country: record.location.address.countryCode });
    }
    for (const gym of Object.values(collection.gyms)) if (!names.has(gym.id)) names.set(gym.id, { name: gym.name, country: gym.countryCode });
    return [...names].slice(0, 10).map(([id, gym]) => ({ id, ...gym }));
  }, [account.saved, data.records, collection.gyms]);
  const [gymId, setGymId] = useState<string | null>(gyms[0]?.id ?? null);
  const gym = gyms.find((each) => each.id === gymId) ?? null;
  const [kind, setKind] = useState<Spend['kind']>('membership');
  const [every, setEvery] = useState<Every>('week');
  const [amount, setAmount] = useState('');
  const defaultCurrency = COUNTRY_CURRENCY[gym?.country ?? prefs.country ?? ''] ?? '';
  const [currency, setCurrency] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [startedOn, setStartedOn] = useState(localDay(new Date().toISOString()));
  const [problem, setProblem] = useState<string | null>(null);

  const save = () => {
    const value = Number(amount.replace(/[^0-9.]/g, ''));
    const code = (currency ?? defaultCurrency).trim().toUpperCase();
    if (!amount.trim() || !Number.isFinite(value) || value <= 0) return setProblem('Type what you pay, as a number.');
    if (!/^[A-Z]{3}$/.test(code)) return setProblem('Type the currency as three letters: AUD, USD, EUR, GBP…');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startedOn) || Number.isNaN(Date.parse(startedOn))) return setProblem('Type the date as year-month-day, like 2026-10-01.');
    haptic.success();
    spends.update((now) => [
      ...now,
      {
        id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        gymId,
        gymName: gym?.name ?? null,
        kind,
        label: label.trim().slice(0, 60) || (kind === 'membership' ? 'Membership' : 'Pass'),
        amountMinor: Math.round(value * 100),
        currency: code,
        every: kind === 'membership' ? every : null,
        startedOn,
        endedOn: null,
      },
    ]);
    onDone();
  };

  return (
    <Card style={styles.card}>
      <Txt variant="headline">Add what you pay</Txt>
      <Txt variant="footnote" color={color.labelSecondary}>
        For
      </Txt>
      <View style={styles.chips} accessibilityRole="radiogroup">
        {gyms.map((each) => (
          <ChoiceChip key={each.id} label={each.name} selected={gymId === each.id} onPress={() => setGymId(each.id)} />
        ))}
        <ChoiceChip label="Any gym (a chain’s, say)" selected={gymId === null} onPress={() => setGymId(null)} />
      </View>
      <Segmented
        options={[
          { value: 'membership', label: 'Membership' },
          { value: 'once', label: 'Paid once' },
        ]}
        value={kind}
        onChange={(value: Spend['kind']) => setKind(value)}
      />
      {kind === 'membership' && <Segmented options={EVERY.map((entry) => ({ value: entry.id, label: entry.label.replace('a ', '') }))} value={every} onChange={(value: Every) => setEvery(value)} />}
      <View style={styles.fields}>
        <View style={styles.flex}>
          <TextField label="Amount" inSheet={false} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="19.99" />
        </View>
        <View style={styles.currency}>
          <TextField label="Currency" inSheet={false} value={currency ?? defaultCurrency} onChangeText={(text) => setCurrency(text.toUpperCase())} autoCapitalize="characters" maxLength={3} placeholder="AUD" />
        </View>
      </View>
      <TextField label={kind === 'membership' ? 'Started on' : 'Paid on'} inSheet={false} value={startedOn} onChangeText={setStartedOn} placeholder="2026-10-01" />
      <TextField label="Name (optional)" inSheet={false} value={label} onChangeText={setLabel} placeholder={kind === 'membership' ? 'Membership' : '10-visit pass'} maxLength={60} />
      {problem && (
        <Txt variant="footnote" color={color.dangerInk}>
          {problem}
        </Txt>
      )}
      <View style={styles.actions}>
        <PrimaryButton label="Add it" icon="check" onPress={save} />
        <PrimaryButton label="Cancel" tone="quiet" onPress={onDone} />
      </View>
    </Card>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], paddingBottom: space[8], gap: space[3], width: '100%', maxWidth: 560, alignSelf: 'center' },
    intro: { gap: space[1] },
    card: { gap: space[2] },
    row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    flex: { flex: 1, minWidth: 0, gap: 2 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    fields: { flexDirection: 'row', gap: space[2] },
    currency: { width: 110 },
    actions: { gap: space[2] },
    note: { paddingHorizontal: space[4], textAlign: 'center' },
  }),
);
