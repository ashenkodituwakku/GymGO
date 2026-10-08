/**
 * One trip: the gyms near there that let visitors in on its days (the
 * domain's tripShortlist), the most days first. When a gym's answer changes
 * over the trip, each day is a dot: green when a visitor is admitted at a
 * usual time (morning, lunch or evening), amber when it needs confirming,
 * grey when not. "Search there" moves the
 * map to the trip's place and first day, for everything else Explore does.
 */

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Pressable } from '@/components/motion';
import { tripDates, tripShortlist, type TripDay, type TripPick } from '@gymgo/domain';
import { MarkImage, useGymMark } from '@/components/BrandLogo';
import { Icon } from '@/components/Icon';
import { Illustration } from '@/components/Illustration';
import { PageScroll } from '@/components/PageScroll';
import { Card, NoPhoto, PrimaryButton, Txt } from '@/components/ui';
import { useApp } from '@/lib/app-state';
import { timeLabel } from '@/lib/copy';
import { countryInSentence } from '@/lib/country';
import { demoPicture } from '@/lib/gymPicture';
import { haptic } from '@/lib/haptics';
import { usePageTitle } from '@/lib/pageTitle';
import { distanceLabel } from '@/lib/places';
import { moveTo, nowIn } from '@/lib/query';
import { daysToPlan, todayThere, tripDatesLabel, tripWhen, useTrips } from '@/lib/trips';
import { color, face, radius, space, themed } from '@/lib/theme';

/** How far from the trip's place to look. */
const TRIP_RADIUS_KM = 10;
/** The most gyms listed for one trip. */
const SHOWN = 12;

export default function TripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, setFilters, requestExplore, mayExplore, openPro } = useApp();
  const today = nowIn(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC').date;
  const { trips, loaded } = useTrips(today);
  const trip = trips.find((item) => item.id === id) ?? null;
  usePageTitle(trip ? `Trip to ${trip.placeName}` : 'Trip');

  const plan = trip ? daysToPlan(trip, todayThere(trip)) : null;
  const asOf = useMemo(() => new Date(), [trip]);
  const picks = useMemo(
    () => (trip && plan ? tripShortlist({ records: data.records, centre: trip.centre, from: plan.from, to: plan.to, radiusKm: TRIP_RADIUS_KM, asOf }) : []),
    [trip, plan?.from, plan?.to, data.records, asOf],
  );
  const carried = useMemo(
    () => (trip ? data.records.some((record) => Math.abs(record.location.position.lat - trip.centre.lat) < 0.1 && Math.abs(record.location.position.lng - trip.centre.lng) < 0.15) : false),
    [trip, data.records],
  );

  if (!trip || !plan) {
    return (
      <View style={styles.missing}>
        <Stack.Screen options={{ title: 'Trip' }} />
        {loaded && (
          <>
            <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
              This trip isn’t on this phone any more: it may be over, or removed.
            </Txt>
            <PrimaryButton label="Your trips" onPress={() => router.replace('/trips')} />
          </>
        )}
      </View>
    );
  }

  const days = tripDates(plan.from, plan.to);
  const searchThere = () => {
    haptic.select();
    setFilters((current) => ({
      ...moveTo(current, { centre: trip.centre, placeName: trip.placeName, timezone: trip.timezone, countryCode: trip.countryCode }),
      visitDate: plan.from,
      visitMinuteOfDay: 7 * 60,
      visitPicked: true,
    }));
    requestExplore({ recentre: true });
    router.navigate('/explore');
  };
  const locked = !mayExplore(trip.countryCode);
  const yes = picks.filter((pick) => pick.admitted > 0);

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: trip.placeName }} />
      <View style={styles.head}>
        <Txt variant="eyebrow" color={color.brand}>
          {tripWhen(trip, todayThere(trip)).toUpperCase()}
        </Txt>
        <Txt variant="title2">{`Gyms in ${trip.placeName}`}</Txt>
        <Txt variant="subhead" color={color.labelSecondary}>
          {`${tripDatesLabel(trip)}${plan.from !== trip.from ? ` (from today)` : ''} · within ${distanceLabel(TRIP_RADIUS_KM, trip.countryCode)}`}
        </Txt>
      </View>

      {locked ? (
        <Card style={styles.card}>
          <Txt variant="headline">{`Gyms in ${countryInSentence(trip.countryCode)} are part of GymGO Pro`}</Txt>
          <Txt variant="subhead" color={color.labelSecondary}>
            Your trip is saved. With Pro, this lists the gyms there that let visitors in on your days.
          </Txt>
          <PrimaryButton label="See GymGO Pro" icon="crown" onPress={() => openPro('worldwide')} />
        </Card>
      ) : !carried ? (
        <Card style={styles.card}>
          <Txt variant="headline">GymGO hasn’t read the map there yet</Txt>
          <Txt variant="subhead" color={color.labelSecondary}>
            {`Open ${trip.placeName} in Explore and tap Search this area. The gyms it finds stay on this phone, and this list fills in.`}
          </Txt>
          <PrimaryButton label={`Search ${trip.placeName}`} icon="map" onPress={searchThere} />
        </Card>
      ) : (
        <>
          <Txt variant="subhead" color={color.labelSecondary}>
            {yes.length
              ? `${yes.length} gym${yes.length === 1 ? '' : 's'} let visitors in on at least one of your days, by the hours they publish.`
              : picks.length
                ? 'None publish visitor hours that cover your days, but these may let you in: ask first.'
                : 'No gym near there is known to let visitors in on your days.'}
          </Txt>
          {picks.length > 0 && (
            <Card style={styles.list}>
              {picks.slice(0, SHOWN).map((pick, index) => (
                <TripRow
                  key={pick.record.location.id}
                  pick={pick}
                  total={days.length}
                  last={index === Math.min(picks.length, SHOWN) - 1}
                  onPress={() => router.push({ pathname: '/gym/[id]', params: { id: pick.record.location.id } })}
                />
              ))}
            </Card>
          )}
          {picks.slice(0, SHOWN).some(mixedDays) && (
            <View style={styles.legend}>
              <Legend tone="yes" label="Visitors in" />
              <Legend tone="maybe" label="Ask first" />
              <Legend tone="no" label="Not then" />
            </View>
          )}
          <Txt variant="footnote" color={color.labelSecondary}>
            Checked at 7 am, noon and 6 pm on each day, on the gym’s clock. Hours change on public holidays: check before you go.
          </Txt>
          <PrimaryButton label={`Search ${trip.placeName} on the map`} tone="quiet" icon="map" onPress={searchThere} />
        </>
      )}
    </PageScroll>
  );
}

function daysLine(pick: TripPick, total: number): string {
  if (pick.admitted === total) return total === 1 ? 'Lets visitors in' : `Lets visitors in all ${total} days`;
  if (pick.admitted > 0) return `Lets visitors in ${pick.admitted} of ${total} days`;
  return pick.maybe === total ? 'Ask first, every day' : `Ask first: ${pick.maybe} of ${total} days`;
}

/** Whether a gym's answer changes from day to day over the trip. */
const mixedDays = (pick: TripPick) => new Set(pick.days.map(tone)).size > 1;

const tone = (day: TripDay): 'yes' | 'maybe' | 'no' =>
  day.verdict === 'admits_visitor' ? 'yes' : day.verdict === 'needs_confirmation' || day.verdict === 'unknown' ? 'maybe' : 'no';

function TripRow({ pick, total, last, onPress }: { pick: TripPick; total: number; last: boolean; onPress: () => void }) {
  const location = pick.record.location;
  const mark = useGymMark(location);
  const illustration = demoPicture(location);
  const where = [location.address.suburb, distanceLabel(pick.distanceKm, location.address.countryCode)].filter(Boolean).join(' · ');
  const first = pick.days.find((day) => day.verdict === 'admits_visitor');
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${location.name}, ${where}. ${daysLine(pick, total)}.`}
      style={({ pressed }) => [styles.row, !last && styles.rowRule, pressed && { backgroundColor: color.fill }]}
    >
      {illustration ? (
        <Illustration picture={illustration} style={styles.thumb} />
      ) : mark ? (
        <View style={[styles.thumb, styles.tile, { backgroundColor: color.logoPlate }]}>
          <MarkImage mark={mark} name={location.name} width={40} height={36} area={900} />
        </View>
      ) : (
        <NoPhoto compact style={styles.thumb} />
      )}
      <View style={styles.middle}>
        <Txt variant="headline" numberOfLines={2}>
          {location.name}
        </Txt>
        <Txt variant="footnote" color={color.labelSecondary} numberOfLines={1}>
          {where}
        </Txt>
        <Txt variant="footnote" color={pick.admitted ? color.goodInk : color.maybeInk} style={face('semibold')}>
          {daysLine(pick, total)}
          {first?.minute != null && first.minute !== 7 * 60 ? ` (from ${timeLabel(first.minute)})` : ''}
        </Txt>
        {/* A dot a day only when the days differ: the same answer every day is the line above. */}
        {mixedDays(pick) && (
          <View style={styles.dots} aria-hidden>
            {pick.days.map((day) => (
              <View key={day.date} style={[styles.dot, styles[tone(day)]]}>
                <Txt variant="caption" color={tone(day) === 'no' ? color.labelSecondary : color.onBrand} style={styles.dotText}>
                  {new Date(`${day.date}T12:00:00Z`).toLocaleDateString(undefined, { weekday: 'narrow', timeZone: 'UTC' })}
                </Txt>
              </View>
            ))}
          </View>
        )}
      </View>
      <Icon name="chevron" size={16} color={color.labelTertiary} />
    </Pressable>
  );
}

function Legend({ tone: kind, label }: { tone: 'yes' | 'maybe' | 'no'; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, styles[kind]]} />
      <Txt variant="caption" color={color.labelSecondary}>
        {label}
      </Txt>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], paddingBottom: space[8], gap: space[3], width: '100%', maxWidth: 640, alignSelf: 'center' },
    missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3], padding: space[6], backgroundColor: color.groupedBackground },
    center: { textAlign: 'center' },
    head: { gap: space[1] },
    card: { gap: space[3] },
    list: { paddingVertical: space[1], paddingHorizontal: 0 },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3], paddingVertical: space[3], paddingHorizontal: space[3] },
    rowRule: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.separator },
    thumb: { width: 48, height: 48, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: color.fill },
    tile: { alignItems: 'center', justifyContent: 'center' },
    middle: { flex: 1, minWidth: 0, gap: 3 },
    dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
    dot: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    dotText: { fontSize: 10, lineHeight: 12, ...face('semibold') },
    yes: { backgroundColor: color.good },
    maybe: { backgroundColor: color.maybe },
    no: { backgroundColor: color.fill },
    legend: { flexDirection: 'row', gap: space[4], flexWrap: 'wrap' },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
  }),
);
