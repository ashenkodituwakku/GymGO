/**
 * A partner day pass on a gym's page (apps/server/src/perks.ts): shown only
 * when GymGO has an agreement with the gym and an admin has added the pass,
 * so for nearly every gym this draws nothing. The pass price and GymGO's
 * booking fee are shown apart, with the total, before Stripe's page; once
 * paid, the pass code to show at reception sits here too.
 */

import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { formatPlanPrice, passTotal } from '@gymgo/domain';
import { api, problemText, type PartnerPass, type PassBooking } from '@/lib/api';
import { CAN_BUY_HERE, startPassBooking } from '@/lib/purchase';
import { addDays, nowIn } from '@/lib/query';
import type { AccountApi } from '@/lib/useAccount';
import { color, face, radius, space, themed } from '@/lib/theme';
import { Icon } from './Icon';
import { ChoiceChip, PrimaryButton, Txt } from './ui';

const dayLabel = (date: string, today: string) =>
  date === today ? 'Today' : date === addDays(today, 1) ? 'Tomorrow' : new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', timeZone: 'UTC' });

export function DayPass({ gymId, timezone, account, onSignIn }: { gymId: string; timezone: string; account: AccountApi; onSignIn: () => void }) {
  const token = account.state === 'signed_in' ? account.token : null;
  const [passes, setPasses] = useState<PartnerPass[]>([]);
  const [available, setAvailable] = useState(false);
  const [mine, setMine] = useState<PassBooking[]>([]);
  const today = nowIn(timezone).date;
  const [date, setDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .gymPasses(gymId)
      .then((answer) => {
        setPasses(answer.passes);
        setAvailable(answer.available);
      })
      .catch(() => setPasses([]));
    if (token) api.myPasses(token).then((answer) => setMine(answer.bookings.filter((booking) => booking.gymId === gymId && booking.forDate >= today))).catch(() => undefined);
  }, [gymId, token, today]);
  useEffect(load, [load]);

  if (passes.length === 0 && mine.length === 0) return null;

  const book = async (pass: PartnerPass) => {
    if (!token) return onSignIn();
    setBusy(true);
    setProblem(null);
    try {
      const outcome = await startPassBooking(token, pass.id, date, gymId);
      if (outcome !== 'left') load();
    } catch (error) {
      setProblem(problemText(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      {mine.map((booking) => (
        <View key={booking.id} style={styles.ticket} accessible accessibilityLabel={`${booking.label} for ${dayLabel(booking.forDate, today)}: show code ${booking.code} at reception`}>
          <Icon name="good" size={20} color={color.goodInk} />
          <View style={styles.flex}>
            <Txt variant="headline">{`${booking.label}, ${dayLabel(booking.forDate, today)}`}</Txt>
            <Txt variant="footnote" color={color.labelSecondary}>
              Show this code at reception
            </Txt>
          </View>
          <Txt variant="title2" style={styles.code}>
            {booking.code}
          </Txt>
        </View>
      ))}
      {passes.map((pass) => (
        <View key={pass.id} style={styles.pass}>
          <View style={styles.head}>
            <Icon name="door" size={20} color={color.brand} />
            <Txt variant="headline" style={styles.flex}>{`${pass.label} through GymGO`}</Txt>
          </View>
          <Txt variant="subhead" color={color.labelSecondary}>
            {`${formatPlanPrice(pass.priceMinor, pass.currency)} for the pass${pass.feeMinor > 0 ? ` + ${formatPlanPrice(pass.feeMinor, pass.currency)} GymGO booking fee` : ''} = ${formatPlanPrice(passTotal(pass), pass.currency)}, tax included. Agreed with the gym.`}
          </Txt>
          <View style={styles.chips}>
            {Array.from({ length: 7 }, (_, offset) => addDays(today, offset)).map((option) => (
              <ChoiceChip key={option} label={dayLabel(option, today)} selected={date === option} onPress={() => setDate(option)} />
            ))}
          </View>
          {CAN_BUY_HERE && (
            <PrimaryButton
              label={!available ? 'Not on sale yet' : busy ? 'Opening Stripe…' : token ? `Book for ${dayLabel(date, today)} · ${formatPlanPrice(passTotal(pass), pass.currency)}` : 'Sign in to book'}
              icon="door"
              disabled={!available || busy}
              onPress={() => void book(pass)}
            />
          )}
        </View>
      ))}
      {problem && (
        <Txt variant="footnote" color={color.dangerInk}>
          {problem}
        </Txt>
      )}
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    wrap: { gap: space[2] },
    pass: { gap: space[2], padding: space[4], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.card },
    head: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    flex: { flex: 1, minWidth: 0 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    ticket: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[4], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.goodTint },
    code: { ...face('bold'), letterSpacing: 2 },
  }),
);
