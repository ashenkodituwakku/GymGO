/**
 * Compare: up to three gyms side by side for the current search, row by row
 * (answer, price, guest entry, what you need to bring, machines, rating,
 * distance). Unknowns stay unknown here too: a blank is never a "no".
 */

import { Stack, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { summariseWeek, type GymSearchResult, type Tri } from '@gymgo/domain';
import { Icon } from '@/components/Icon';
import { PrimaryButton, TIER_COLOUR, Txt } from '@/components/ui';
import { useApp } from '@/lib/app-state';
import { distanceLabel } from '@/lib/places';
import { TIER, accessShort, timeLabel } from '@/lib/copy';
import { priceLine } from '@/lib/present';
import { resultsById } from '@/lib/results';
import { color, face, radius, space } from '@/lib/theme';

type Cell = { text: string; ink?: string; strong?: boolean };

const tri = (value: Tri): Cell =>
  value === 'yes' ? { text: 'Yes' } : value === 'no' ? { text: 'No' } : { text: 'Not known', ink: color.maybeInk };

export default function Compare() {
  const { data, filters, compare, toggleCompare, clearCompare } = useApp();
  const router = useRouter();
  const asOf = useMemo(() => new Date(), [filters, data.records]);
  const byId = useMemo(() => resultsById(filters, data.records, asOf), [filters, data.records, asOf]);
  const gyms = compare.map((id) => byId.get(id)).filter((result): result is GymSearchResult => result !== undefined);

  if (gyms.length < 2) {
    return (
      <View style={styles.empty}>
        <Stack.Screen options={{ title: 'Compare' }} />
        <Txt style={styles.emoji}>⚖️</Txt>
        <Txt variant="title2">Pick two or three gyms</Txt>
        <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
          Tick them in Saved, or tap the compare button on a gym’s page. On iPhone you can also press and hold a gym on Home.
        </Txt>
        <PrimaryButton label="Go to Saved" onPress={() => router.navigate('/saved')} />
      </View>
    );
  }

  const at = timeLabel(filters.visitMinuteOfDay);
  const prices = gyms.map((result) => result.offers.confirmed?.cost.totalNonRefundableMinor ?? null);
  const cheapest = Math.min(...prices.filter((value): value is number => value !== null));

  const rows: Array<{ label: string; cells: Cell[] }> = [
    {
      label: 'Answer',
      cells: gyms.map((result) => ({ text: `${TIER[result.tier].emoji} ${TIER[result.tier].label}`, ink: TIER_COLOUR[result.tier].ink, strong: true })),
    },
    {
      label: 'A visit costs',
      cells: gyms.map((result, index) => {
        const price = priceLine(result.offers);
        return { text: `${price.headline} ${price.caption}`, strong: prices[index] === cheapest, ink: price.confirmed ? undefined : color.maybeInk };
      }),
    },
    {
      label: `Guests at ${at}`,
      cells: gyms.map((result) => ({
        text: accessShort(result.access.verdict),
        ink: result.access.verdict === 'admits_visitor' ? color.goodInk : result.access.verdict === 'not_admitted' ? color.noInk : color.maybeInk,
      })),
    },
    {
      label: 'Guest hours',
      cells: gyms.map((result) =>
        result.access.visitorSchedule ? { text: summariseWeek(result.access.visitorSchedule).join('\n') } : { text: 'Not published', ink: color.maybeInk },
      ),
    },
    { label: 'Book ahead', cells: gyms.map((result) => tri(result.record.prerequisites.advanceBookingRequired)) },
    { label: 'Induction first visit', cells: gyms.map((result) => tri(result.record.prerequisites.inductionRequired)) },
    { label: 'Photo ID', cells: gyms.map((result) => tri(result.record.prerequisites.photoIdRequired)) },
    {
      label: 'Machines the gym lists',
      cells: gyms.map((result) => {
        const count = result.record.equipment.filter((item) => item.presence === 'yes').length;
        return count ? { text: String(count) } : { text: 'None listed', ink: color.maybeInk };
      }),
    },
    {
      label: 'Rating',
      cells: gyms.map((result) =>
        result.rating.average === null ? { text: 'No reviews yet', ink: color.labelSecondary } : { text: `★ ${result.rating.average.toFixed(1)} (${result.rating.count})` },
      ),
    },
    {
      label: 'Distance',
      cells: gyms.map((result) => ({
        text: result.distanceKm === null ? '—' : distanceLabel(result.distanceKm, result.record.location.address.countryCode),
      })),
    },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Compare',
          headerRight: () => (
            <Pressable
              onPress={() => {
                clearCompare();
                router.back();
              }}
              accessibilityRole="button"
              hitSlop={8}
            >
              <Txt variant="body" color={color.brand}>
                Clear
              </Txt>
            </Pressable>
          ),
        }}
      />
      <ScrollView style={styles.page} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        <Txt variant="footnote" color={color.labelSecondary}>
          For a visit at {at}. The cheapest confirmed price is in bold.
        </Txt>
        <View style={styles.headRow}>
          {gyms.map((result) => (
            <View key={result.record.location.id} style={styles.head}>
              <Pressable
                onPress={() => router.push({ pathname: '/gym/[id]', params: { id: result.record.location.id } })}
                accessibilityRole="link"
                style={styles.flex}
              >
                <Txt variant="headline" numberOfLines={2}>
                  {result.record.location.name}
                </Txt>
                <Txt variant="footnote" color={color.labelSecondary} numberOfLines={1}>
                  {result.record.location.address.suburb}
                </Txt>
              </Pressable>
              <Pressable
                onPress={() => toggleCompare(result.record.location.id)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${result.record.location.name}`}
                hitSlop={8}
                style={styles.remove}
              >
                <Icon name="close" size={11} color={color.labelSecondary} weight="bold" />
              </Pressable>
            </View>
          ))}
        </View>
        {rows.map((row) => (
          <View key={row.label} style={styles.row}>
            <Txt variant="eyebrow" color={color.labelSecondary}>
              {row.label.toUpperCase()}
            </Txt>
            <View style={styles.cells}>
              {row.cells.map((cell, index) => (
                <Txt
                  key={index}
                  variant="subhead"
                  color={cell.ink ?? color.label}
                  style={[styles.cell, cell.strong && face('bold')]}
                >
                  {cell.text}
                </Txt>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  page: { flex: 1, backgroundColor: color.groupedBackground },
  content: { padding: space[4], gap: space[3], width: '100%', maxWidth: 760, alignSelf: 'center', paddingBottom: space[8] },
  headRow: { flexDirection: 'row', gap: space[3] },
  head: {
    flex: 1,
    flexDirection: 'row',
    gap: space[1],
    padding: space[3],
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: color.background,
  },
  remove: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: color.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    gap: space[2],
    padding: space[3],
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: color.background,
  },
  cells: { flexDirection: 'row', gap: space[3] },
  cell: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3], padding: space[6], backgroundColor: color.groupedBackground },
  emoji: { fontSize: 48, lineHeight: 58 },
});
