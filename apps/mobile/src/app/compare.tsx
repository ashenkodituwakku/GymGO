/**
 * Compare: two gyms side by side (four with GymGO Pro) for the current search, row by row
 * (answer, price, guest entry, what you need to bring, machines, rating,
 * distance). Unknowns stay unknown here too: a blank is never a "no".
 */

import { Stack, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { summariseWeek, type GymSearchResult, type Tri } from '@gymgo/domain';
import { Icon } from '@/components/Icon';
import { PrimaryButton, TIER_COLOUR, Txt } from '@/components/ui';
import { useApp } from '@/lib/app-state';
import { distanceLabel, moneyLabel } from '@/lib/places';
import { TIER, accessShort, timeLabel, visitWhen } from '@/lib/copy';
import { visitIsLater } from '@/lib/query';
import { priceLine } from '@/lib/present';
import { resultsById } from '@/lib/results';
import { color, face, radius, space, themed } from '@/lib/theme';
import { usePageTitle } from '@/lib/pageTitle';

type Cell = { text: string; ink?: string; strong?: boolean };

const tri = (value: Tri): Cell =>
  value === 'yes' ? { text: 'Yes' } : value === 'no' ? { text: 'No' } : { text: 'Not known', ink: color.maybeInk };


/** Small counts in words, as in running text ("two to four gyms"). */
const NUMBER_WORD: Record<number, string> = { 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six' };
export default function Compare() {
  usePageTitle('Compare');
  const { data, filters, compare, toggleCompare, clearCompare, billing, openPro, prefsReady } = useApp();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const asOf = useMemo(() => new Date(), [filters, data.records]);
  const byId = useMemo(() => resultsById(filters, data.records, asOf, data.ratings), [filters, data.records, asOf, data.ratings]);
  const gyms = compare.map((id) => byId.get(id)).filter((result): result is GymSearchResult => result !== undefined);

  // Every row is worked out for your visit and place, so a cold link waits for your settings.
  if (!prefsReady) {
    return (
      <View style={styles.empty}>
        <Stack.Screen options={{ title: 'Compare' }} />
      </View>
    );
  }

  if (gyms.length < 2) {
    return (
      <View style={styles.empty}>
        <Stack.Screen options={{ title: 'Compare' }} />
        <Icon name="compare" size={44} color={color.brand} />
        <Txt variant="title2">Pick {billing.limits.compare === 2 ? 'two' : `two to ${NUMBER_WORD[billing.limits.compare] ?? billing.limits.compare}`} gyms</Txt>
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
      cells: gyms.map((result) => ({ text: TIER[result.tier].label, ink: TIER_COLOUR[result.tier].ink, strong: true })),
    },
    {
      label: 'A visit costs',
      cells: gyms.map((result, index) => {
        const price = priceLine(result.offers);
        return { text: `${price.headline} ${price.caption}`, strong: prices[index] === cheapest, ink: price.confirmed ? undefined : color.maybeInk };
      }),
    },
    {
      // Members' reports, never the gym's price: shown apart, and never bold.
      label: 'Members paid',
      cells: gyms.map((result) => {
        const members = data.memberPrices[result.record.location.id];
        return members
          ? {
              text: `~${moneyLabel(Math.round(members.typicalMinor / 100) * 100, result.record.location.address.countryCode)} (${members.count} member${members.count === 1 ? '' : 's'})`,
            }
          : { text: 'No reports', ink: color.labelSecondary };
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
              style={styles.clear}
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
          For a visit {visitWhen(filters.visitMinuteOfDay, visitIsLater(filters))}. The cheapest confirmed price is in bold.
        </Txt>
        {/* Wider than the screen with four gyms: it scrolls sideways. */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableScroll}>
          <View style={[styles.table, { width: Math.max(Math.min(width, 760) - space[4] * 2, gyms.length * 150) }]}>
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
                      style={[styles.cell, cell.strong && face('semibold')]}
                    >
                      {cell.text}
                    </Txt>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
        {!billing.isPro && (
          <Pressable onPress={() => openPro('compare')} accessibilityRole="button" style={styles.upsell}>
            <Txt variant="subhead" color={color.brand} style={face('semibold')}>
              Compare up to 4 gyms with GymGO Pro ›
            </Txt>
          </Pressable>
        )}
      </ScrollView>
    </>
  );
}

const styles = themed(() => StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  // iOS and Android inset header buttons themselves; a browser doesn't.
  clear: { paddingHorizontal: Platform.OS === 'web' ? space[4] : 0 },
  page: { flex: 1, backgroundColor: color.groupedBackground },
  content: { padding: space[4], gap: space[3], width: '100%', maxWidth: 760, alignSelf: 'center', paddingBottom: space[8] },
  tableScroll: { marginHorizontal: -space[4] },
  table: { gap: space[3], marginHorizontal: space[4] },
  upsell: { alignSelf: 'center', paddingVertical: space[2] },
  headRow: { flexDirection: 'row', gap: space[3] },
  head: {
    flex: 1,
    flexDirection: 'row',
    gap: space[1],
    padding: space[3],
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: color.card,
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
    backgroundColor: color.card,
  },
  cells: { flexDirection: 'row', gap: space[3] },
  cell: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3], padding: space[6], backgroundColor: color.groupedBackground },
}));
