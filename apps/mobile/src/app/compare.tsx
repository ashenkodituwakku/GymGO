/**
 * Compare: two gyms side by side (four with GymGO Pro) for the current search, row by row
 * (answer, price, guest entry, what you need to bring, machines, rating,
 * distance). Unknowns stay unknown here too: a blank is never a "no".
 */

import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Pressable } from '@/components/motion';
import { summariseWeek, type GymSearchResult, type Tri } from '@gymgo/domain';
import { Icon } from '@/components/Icon';
import { membershipLine } from '@/components/JoinGym';
import { Glass } from '@/components/Glass';
import { HeroMark } from '@/components/HeroMark';
import { useGlassRedraw } from '@/components/Redrawn';
import { PrimaryButton, TIER_COLOUR, Txt } from '@/components/ui';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { distanceLabel, moneyLabel } from '@/lib/places';
import { TIER, accessShort, timeLabel, visitWhen } from '@/lib/copy';
import { visitIsLater } from '@/lib/query';
import { priceLine, priceText } from '@/lib/present';
import { resultsById } from '@/lib/results';
import { HEADER_EDGE, PAGE_COLUMN, color, face, radius, solidSurfaces, space, themed } from '@/lib/theme';
import { usePageTitle } from '@/lib/pageTitle';
import { PageScroll } from '@/components/PageScroll';
import { SheetDone } from '@/components/SheetDone';
import { ScreenOptions } from '@/components/ScreenOptions';

type Cell = { text: string; ink?: string; strong?: boolean };

const tri = (value: Tri): Cell =>
  value === 'yes' ? { text: 'Yes' } : value === 'no' ? { text: 'No' } : { text: 'Not known', ink: color.maybeInk };

/** Small counts in words, as in running text ("two to four gyms"). */
const NUMBER_WORD: Record<number, string> = { 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six' };
export default function Compare() {
  useGlassRedraw();
  usePageTitle('Compare');
  const { data, account, filters, compare, toggleCompare, clearCompare, billing, openPro, prefsReady } = useApp();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const asOf = useMemo(() => new Date(), [filters, data.records]);
  const byId = useMemo(
    () => resultsById(filters, data.records, asOf, data.ratings, [...compare, ...account.saved]),
    [filters, data.records, asOf, data.ratings, compare, account.saved],
  );
  const gyms = compare.map((id) => byId.get(id)).filter((result): result is GymSearchResult => result !== undefined);
  // Room for every gym across, at 150 points each, or it scrolls sideways.
  const room = Math.min(width, 760) - space[4] * 2;
  const fits = gyms.length * 150 <= room;
  const tableWidth = Math.max(room, gyms.length * 150);
  // Whether the rows have reached the pinned names and pass under them:
  // scrolled past the line above the names (measured there, as a browser
  // measures a pinned header inside a wrapper of its own).
  const [stuck, setStuck] = useState(false);
  const headAt = useRef(0);
  const scrolled = useRef(0);
  // Whether the names pin at all can change without a scroll (a window made wider or narrower).
  useEffect(() => setStuck(fits && scrolled.current > headAt.current), [fits]);

  // Every row is worked out for your visit and place, so a cold link waits for your settings.
  if (!prefsReady) {
    return (
      <View style={styles.empty}>
        <ScreenOptions options={{ title: 'Compare' }} />
      </View>
    );
  }

  if (gyms.length < 2) {
    // One picked: say which, so it's clear the next pick completes the pair.
    const only = gyms[0]?.record.location.name;
    // Your saved gyms, to tick right here rather than going back to Saved.
    const pickable = account.saved.map((id) => byId.get(id)).filter((result): result is GymSearchResult => result !== undefined).slice(0, 6);
    return (
      <View style={styles.empty}>
        <ScreenOptions options={{ title: 'Compare' }} />
        <HeroMark icon="compare" />
        <Txt variant="title2" style={styles.center}>
          {only ? 'Pick one more gym' : `Pick ${billing.limits.compare === 2 ? 'two' : `two to ${NUMBER_WORD[billing.limits.compare] ?? billing.limits.compare}`} gyms`}
        </Txt>
        <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
          {pickable.length > 0
            ? only
              ? `${only} is picked. Tick another of your saved gyms, or tap the compare button on another gym’s page.`
              : 'Tick them from your saved gyms here, or tap the compare button on a gym’s page.'
            : only
              ? `${only} is picked. Tick another in Saved, or tap the compare button on another gym’s page.`
              : 'Tick them in Saved, or tap the compare button on a gym’s page. On iPhone you can also press and hold a gym on Home.'}
        </Txt>
        {pickable.length > 0 && (
          <View style={styles.pickList}>
            {pickable.map((result, index) => {
              const id = result.record.location.id;
              const on = compare.includes(id);
              return (
                <Pressable
                  key={id}
                  onPress={() => {
                    haptic.select();
                    toggleCompare(id);
                  }}
                  accessibilityRole="checkbox"
                  aria-checked={on}
                  accessibilityLabel={`Compare ${result.record.location.name}`}
                  style={({ pressed }) => [styles.pickRow, index > 0 && styles.pickRule, pressed && { backgroundColor: color.fill }]}
                >
                  <View style={styles.pickText}>
                    <Txt variant="headline" numberOfLines={1}>
                      {result.record.location.name}
                    </Txt>
                    <Txt variant="footnote" color={color.labelSecondary} numberOfLines={1}>
                      {[result.record.location.address.suburb, TIER[result.tier].label].filter(Boolean).join(' · ')}
                    </Txt>
                  </View>
                  <View style={[styles.pickTick, on && styles.pickTickOn]}>{on && <Icon name="check" size={13} color={color.onBrand} weight="bold" />}</View>
                </Pressable>
              );
            })}
          </View>
        )}
        <PrimaryButton label="Go to Saved" tone={pickable.length > 0 ? 'quiet' : 'brand'} onPress={() => router.navigate('/saved')} />
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
        return { text: priceText(price), strong: prices[index] === cheapest, ink: price.confirmed ? undefined : color.maybeInk };
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
      // What joining costs, as the gym page's Join this gym says it; not compared in bold, as plans differ.
      label: 'Membership',
      cells: gyms.map((result) => {
        const line = membershipLine(result.record);
        const disputed = result.record.offers.some((offer) => offer.productType === 'membership' && offer.provenance.status === 'conflicting');
        return line ? { text: disputed ? `${line} (pages disagree)` : line, ink: disputed ? color.maybeInk : undefined } : { text: 'Not published', ink: color.labelSecondary };
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


  const head = (
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
  );

  const body = rows.map((row) => (
    <View key={row.label} style={styles.row}>
      <Txt variant="eyebrow" color={color.labelSecondary}>
        {row.label.toUpperCase()}
      </Txt>
      <View style={styles.cells}>
        {row.cells.map((cell, index) => (
          <Txt key={index} variant="subhead" color={cell.ink ?? color.label} style={[styles.cell, cell.strong && face('semibold')]}>
            {cell.text}
          </Txt>
        ))}
      </View>
    </View>
  ));

  return (
    <>
      <ScreenOptions
        options={{
          title: 'Compare',
          // Clear takes the right, where a sheet's Done goes on iPhone (components/SheetDone.tsx), so Done moves left.
          ...(Platform.OS === 'ios' ? { headerLeft: () => <SheetDone /> } : {}),
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
      <PageScroll
        style={styles.page}
        contentContainerStyle={styles.content}
        // When every gym fits across, their names stay at the top as the rows scroll under them.
        stickyHeaderIndices={fits ? [1] : undefined}
        onScroll={(event) => {
          scrolled.current = event.nativeEvent.contentOffset.y;
          if (fits) setStuck(scrolled.current > headAt.current);
        }}
      >
        <View onLayout={(event) => (headAt.current = event.nativeEvent.layout.y + event.nativeEvent.layout.height)}>
          <Txt variant="footnote" color={color.labelSecondary}>
            For a visit {visitWhen(filters.visitMinuteOfDay, visitIsLater(filters))}. The cheapest confirmed price is in bold.
          </Txt>
        </View>
        {fits ? (
          // A phone moves a pinned header's own style onto a wrapper, so the
          // padding sits inside, where the glass behind reaches it.
          <View style={styles.stickyHead}>
            {/* Nothing behind the names until rows pass under them (the page's glow shows), then frosted glass, or the page's grey when nothing is glass. */}
            {stuck && (solidSurfaces() ? <View style={[styles.stickyGlass, styles.stickySolid]} /> : <Glass kind="bar" style={styles.stickyGlass} />)}
            <View style={styles.stickyPad}>{head}</View>
          </View>
        ) : (
          // Wider than the screen (four gyms on a phone): it scrolls sideways, names and all.
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableScroll}>
            <View style={[styles.table, { width: tableWidth }]}>
              {head}
              {body}
            </View>
          </ScrollView>
        )}
        {fits && <View style={styles.tableFits}>{body}</View>}
        {!billing.isPro && (
          <Pressable onPress={() => openPro('compare')} accessibilityRole="button" style={styles.upsell}>
            <Txt variant="subhead" color={color.brand} style={face('semibold')}>
              Compare up to 4 gyms with GymGO Pro ›
            </Txt>
          </Pressable>
        )}
      </PageScroll>
    </>
  );
}

const styles = themed(() => StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  // iOS and Android inset header buttons themselves; a browser doesn't.
  clear: { paddingHorizontal: HEADER_EDGE },
  page: { flex: 1, backgroundColor: color.groupedBackground },
  content: { padding: space[4], gap: space[3], width: '100%', maxWidth: PAGE_COLUMN, alignSelf: 'center', paddingBottom: space[8] },
  tableScroll: { marginHorizontal: -space[4] },
  table: { gap: space[3], marginHorizontal: space[4] },
  tableFits: { gap: space[3] },
  // Covers the rows scrolling under the names, edge to edge of the column.
  stickyHead: { marginVertical: -space[2] },
  stickyPad: { paddingVertical: space[2] },
  stickyGlass: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: radius.md },
  stickySolid: { backgroundColor: color.groupedBackground },
  upsell: { alignSelf: 'center', paddingVertical: space[2] },
  headRow: { flexDirection: 'row', gap: space[3] },
  head: {
    flex: 1,
    flexDirection: 'row',
    gap: space[1],
    padding: space[3],
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: color.plate,
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
    backgroundColor: color.plate,
  },
  cells: { flexDirection: 'row', gap: space[3] },
  cell: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3], padding: space[6], backgroundColor: color.groupedBackground },
  pickList: { alignSelf: 'stretch', maxWidth: 480, width: '100%', backgroundColor: color.plate, borderRadius: radius.xl, borderCurve: 'continuous', overflow: 'hidden' },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3] },
  pickRule: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: color.separator },
  pickText: { flex: 1, minWidth: 0 },
  pickTick: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: color.separator, alignItems: 'center', justifyContent: 'center' },
  pickTickOn: { backgroundColor: color.brandFill, borderColor: color.brand },
}));
