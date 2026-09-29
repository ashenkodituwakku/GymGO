/**
 * "Collect this gym" on a gym's page. At the gym, tap I'm here: GymGO takes
 * one location fix, compares it with the gym's map position on the phone,
 * and adds the gym to your collection (or a visit, once a day). Your
 * position is never sent or kept. Collected, the card shows the gym's tier
 * and how far the next one is.
 *
 * The dev Pro account on a local server (GYMGO_DEV_PRO=on) can collect from
 * anywhere, to try the collection without going to gyms. The server marks
 * only that account, and never makes it on a hosted GymGO.
 */

import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { ReduceMotion, ZoomIn } from 'react-native-reanimated';
import type { GymRecord } from '@gymgo/domain';
import { useApp } from '@/lib/app-state';
import { TIERS, checkIn, collectionStats, localDay, tierFor } from '@/lib/collection';
import { cardFor, cardName, gemInfo, rarityLabel, rarityRank, rollFor, type Rarity } from '@/lib/rarity';
import { haptic } from '@/lib/haptics';
import { currentFix, type Fix } from '@/lib/location';
import { distanceLabel } from '@/lib/places';
import { color, face, radius, space, themed } from '@/lib/theme';
import { useCollection } from '@/lib/useCollection';
import { CardReveal, type Pull } from './CardReveal';
import { TIER_METAL } from './GemCard';
import { Icon } from './Icon';
import { Pressy } from './motion';
import { PrimaryButton, Txt } from './ui';


type Step =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'problem'; text: string }
  | { kind: 'collected'; fresh: 'new' | 'visit' | 'again-today'; rolled: Rarity | null };

export function CollectCard({ record, onOpenCollection }: { record: GymRecord; onOpenCollection: () => void }) {
  const { gyms, collect } = useCollection();
  const { account, data } = useApp();
  const [pull, setPull] = useState<Pull | null>(null);
  // The local dev account skips the "are you there?" check.
  const anywhere = account.account?.devTools === true;
  const [step, setStep] = useState<Step>({ kind: 'idle' });
  const location = record.location;
  const mine = gyms[location.id];
  const visits = mine?.days.length ?? 0;
  const tier = visits ? tierFor(visits) : null;

  const add = () => {
    const before = mine ? cardFor(mine) : null;
    const result = collect({
      id: location.id,
      name: location.name,
      suburb: location.address.suburb,
      countryCode: location.address.countryCode,
      brand: location.brand ?? null,
      position: location.position,
    });
    haptic.success();
    const after = cardFor(result.entry);
    const today = result.entry.days[result.entry.days.length - 1]!;
    setStep({ kind: 'collected', fresh: result.fresh, rolled: result.fresh === 'visit' ? rollFor(result.entry, today) : null });
    // A new card, or a visit that rolled better than the card was: show it off.
    if (result.fresh === 'new') setPull({ entry: result.entry, upgradedFrom: null });
    else if (result.fresh === 'visit' && before && rarityRank(after.rarity) > rarityRank(before.rarity)) setPull({ entry: result.entry, upgradedFrom: before.rarity });
  };

  const tryCollect = async () => {
    if (anywhere) return add();
    // Trying again after "not there yet": ask the phone anew, not the position that said so.
    const again = step.kind === 'problem';
    setStep({ kind: 'checking' });
    const fix = await currentFix(true, again);
    if (fix === 'denied') return setStep({ kind: 'problem', text: 'Collecting needs your location, just this once, to check you’re at the gym. It never leaves your phone.' });
    if (fix === 'unavailable') return setStep({ kind: 'problem', text: 'Couldn’t find where you are just now. Step outside or by a window, then try again.' });
    const where = checkIn(fix, location.position);
    if (where.kind === 'far') {
      haptic.warn();
      return setStep({ kind: 'problem', text: `You’re ${distanceLabel(where.metres / 1000, location.address.countryCode)} away. Collect it when you’re there.` });
    }
    if (where.kind === 'rough') {
      return setStep({ kind: 'problem', text: `Your location is only good to about ${distanceLabel(where.accuracyM / 1000, location.address.countryCode)} here, too rough to tell you’re inside. Try again in a moment.` });
    }
    add();
  };

  const celebrate = step.kind === 'collected' && step.fresh !== 'again-today';
  const look = mine ? cardFor(mine) : null;
  const title =
    step.kind === 'collected' && step.fresh === 'new'
      ? 'Collected!'
      : step.kind === 'collected' && step.fresh === 'visit'
        ? `Visit ${visits} logged`
        : mine
          ? 'In your collection'
          : 'Collect this gym';
  const detail = tier
    ? `${tier.label} · ${visits} visit${visits === 1 ? '' : 's'}${tier.next ? ` · ${tier.next.visits} more to ${tier.next.label}` : ''}`
    : anywhere
      ? 'Dev account: collect it from anywhere, to try the collection.'
      : 'At the gym? Check in to add it to your collection.';

  return (
    <View style={[styles.card, tier && { borderColor: TIER_METAL[tier.tier] }]}>
      <View style={styles.head}>
        <Animated.View
          key={celebrate ? 'pop' : 'still'}
          entering={celebrate ? ZoomIn.springify().damping(10).stiffness(200).reduceMotion(ReduceMotion.System) : undefined}
          style={[styles.medal, { backgroundColor: tier ? TIER_METAL[tier.tier] : color.fill }]}
        >
          <Icon name={tier ? 'trophy' : 'pin'} size={22} color={tier ? color.onBrand : color.labelSecondary} />
        </Animated.View>
        <View style={styles.flex}>
          <Txt variant="headline">{title}</Txt>
          <Txt variant="footnote" color={color.labelSecondary}>
            {detail}
          </Txt>
        </View>
      </View>

      {look && (
        <Pressable
          onPress={() => setPull({ entry: mine!, upgradedFrom: null, viewing: true })}
          accessibilityRole="button"
          accessibilityLabel={`Your card: ${cardName(look)}. Show it`}
          style={styles.cardLine}
        >
          <View style={[styles.gemDot, { backgroundColor: gemInfo(look.gem).colors[1] }]}>
            <Icon name="gem" size={11} color="#FFFFFF" />
          </View>
          <Txt variant="subhead" style={[styles.flex, face('semibold')]}>
            {`${cardName(look)} card`}
          </Txt>
          <Txt variant="footnote" color={color.brand}>
            Show
          </Txt>
        </Pressable>
      )}
      {step.kind === 'collected' && step.rolled && look && step.rolled !== look.rarity && (
        <Txt variant="footnote" color={color.labelSecondary}>
          {`Today’s roll: ${rarityLabel(step.rolled)}. Your card keeps its best, ${rarityLabel(look.rarity)}.`}
        </Txt>
      )}
      {step.kind === 'problem' && (
        <Txt variant="footnote" color={color.maybeInk}>
          {step.text}
        </Txt>
      )}
      {anywhere && mine && step.kind !== 'collected' && (
        <Txt variant="footnote" color={color.labelSecondary}>
          Dev account: checking in works from anywhere.
        </Txt>
      )}
      {step.kind === 'collected' && step.fresh === 'again-today' && (
        <Txt variant="footnote" color={color.labelSecondary}>
          Already checked in here today. One visit a day counts.
        </Txt>
      )}

      <View style={styles.buttons}>
        {!(step.kind === 'collected') && (
          <View style={styles.flex}>
            <PrimaryButton
              // Short, so two buttons side by side fit on a phone without wrapping.
              label={step.kind === 'checking' ? 'Checking…' : mine ? 'Check in' : anywhere ? 'Collect' : 'I’m here'}
              icon={anywhere ? 'flask' : 'pin'}
              busy={step.kind === 'checking'}
              onPress={() => void tryCollect()}
            />
          </View>
        )}
        {(mine || step.kind === 'collected') && (
          <View style={styles.flex}>
            <PrimaryButton label="Collection" icon="trophy" tone="quiet" onPress={onOpenCollection} />
          </View>
        )}
      </View>
      <CardReveal
        pull={pull}
        record={record}
        cover={data.covers[location.id] ?? null}
        onClose={() => setPull(null)}
        onOpenCollection={() => {
          setPull(null);
          onOpenCollection();
        }}
      />
    </View>
  );
}

/** Home's line about your collection, once it has a gym in it. */
export function CollectionStrip({ onPress }: { onPress: () => void }) {
  const { gyms } = useCollection();
  const stats = collectionStats(gyms);
  if (stats.gyms === 0) return null;
  const metal = stats.topTier ? TIER_METAL[stats.topTier] : color.fill;
  const best = TIERS.find((item) => item.tier === stats.topTier)?.label;
  const line = `${stats.gyms} gym${stats.gyms === 1 ? '' : 's'} · ${stats.cities} cit${stats.cities === 1 ? 'y' : 'ies'} · ${stats.countries} countr${stats.countries === 1 ? 'y' : 'ies'}`;
  return (
    <Pressy
      scaleTo={0.97}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`Your collection: ${line}${best ? `, best ${best}` : ''}`}
      style={styles.strip}
    >
      <View style={[styles.stripMedal, { backgroundColor: metal }]}>
        <Icon name="trophy" size={16} color={color.onBrand} />
      </View>
      <View style={styles.flex}>
        <Txt variant="headline">Your collection</Txt>
        <Txt variant="footnote" color={color.labelSecondary} numberOfLines={1}>
          {line}
        </Txt>
      </View>
      <Icon name="chevron" size={14} color={color.labelTertiary} />
    </Pressy>
  );
}

/**
 * On Home, when your last known position puts you at a real gym you haven't
 * checked in at today: a nudge to collect it. Its page takes a fresh fix
 * before collecting, so an old position can't collect anything by itself.
 */
export function HereNudge({ here, records, onOpen }: { here: Fix | null; records: GymRecord[]; onOpen: (id: string) => void }) {
  const { gyms } = useCollection();
  if (!here) return null;
  const today = localDay(new Date());
  let best: { record: GymRecord; metres: number } | null = null;
  for (const record of records) {
    if (record.location.isDemoData) continue;
    const where = checkIn(here, record.location.position);
    if (where.kind !== 'here') continue;
    if (gyms[record.location.id]?.days.includes(today)) continue;
    if (!best || where.metres < best.metres) best = { record, metres: where.metres };
  }
  if (!best) return null;
  const { location } = best.record;
  const collected = Boolean(gyms[location.id]);
  return (
    <Pressy
      scaleTo={0.97}
      onPress={() => {
        haptic.select();
        onOpen(location.id);
      }}
      accessibilityRole="button"
      accessibilityLabel={`You're at ${location.name}. ${collected ? 'Check in for today' : 'Collect it'}`}
      style={[styles.strip, styles.nudge]}
    >
      <View style={[styles.stripMedal, { backgroundColor: color.brandFill }]}>
        <Icon name="pin" size={16} color={color.onBrand} />
      </View>
      <View style={styles.flex}>
        <Txt variant="headline" numberOfLines={1}>{`You’re at ${location.name}`}</Txt>
        <Txt variant="footnote" color={color.labelSecondary}>
          {collected ? 'Check in to count today’s visit' : 'Collect it for your collection'}
        </Txt>
      </View>
      <Icon name="chevron" size={14} color={color.labelTertiary} />
    </Pressy>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    card: {
      marginTop: space[3],
      gap: space[3],
      padding: space[4],
      borderRadius: radius.lg,
      borderCurve: 'continuous',
      borderWidth: 2,
      borderColor: 'transparent',
      backgroundColor: color.card,
    },
    head: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
    medal: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    flex: { flex: 1, gap: 2 },
    buttons: { flexDirection: 'row', gap: space[2] },
    strip: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.card },
    stripMedal: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    nudge: { borderWidth: 2, borderColor: color.brand },
    cardLine: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingVertical: 2 },
    gemDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  }),
);
