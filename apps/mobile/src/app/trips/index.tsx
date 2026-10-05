/**
 * Travel mode: your trips, and a new one. A trip is a place and a run of
 * days; open one to see the gyms there that let visitors in on those days.
 * Trips stay on this phone (src/lib/trips.ts).
 */

import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Pressable } from '@/components/motion';
import { Icon } from '@/components/Icon';
import { PageScroll } from '@/components/PageScroll';
import { Card, Input, PrimaryButton, Txt } from '@/components/ui';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { usePageTitle } from '@/lib/pageTitle';
import { countryName } from '@/lib/country';
import { placeContext, suggestPlaces, suggestWorldCities } from '@/lib/places';
import { addDays, atPlace, atWorldCity, nowIn, type Whereabouts } from '@/lib/query';
import { MAX_NIGHTS, todayThere, tripDatesLabel, tripWhen, useTrips } from '@/lib/trips';
import { color, face, radius, space, themed } from '@/lib/theme';

/** Furthest ahead a trip can start: a year. */
const MAX_AHEAD_DAYS = 365;

export default function TripsScreen() {
  usePageTitle('Trips');
  const router = useRouter();
  const { prefs } = useApp();
  const today = nowIn(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC').date;
  const { trips, loaded, addTrip, removeTrip } = useTrips(today);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
  const [where, setWhere] = useState<Whereabouts | null>(null);
  const [from, setFrom] = useState(addDays(today, 1));
  const [stay, setStay] = useState(2);
  // The trip whose bin was tapped once: a second tap removes it.
  const [removing, setRemoving] = useState<string | null>(null);

  const suggestions = useMemo(() => {
    if (!query.trim() || where) return [];
    const places = suggestPlaces(query, 5).map((place) => ({ key: `${place.city}:${place.name}`, title: place.name, detail: placeContext(place), where: atPlace(place) }));
    const world = suggestWorldCities(query, Math.max(0, 6 - places.length), prefs.country).map((city) => ({
      key: `${city.country}:${city.name}`,
      title: city.name,
      detail: countryName(city.country),
      where: atWorldCity(city),
    }));
    return [...places, ...world];
  }, [query, where, prefs.country]);

  const startOver = () => {
    setAdding(false);
    setQuery('');
    setWhere(null);
    setFrom(addDays(today, 1));
    setStay(2);
  };

  const save = () => {
    if (!where) return;
    haptic.success();
    const trip = addTrip({ placeName: where.placeName, centre: where.centre, timezone: where.timezone, countryCode: where.countryCode, from, to: addDays(from, stay) });
    startOver();
    router.push({ pathname: '/trips/[id]', params: { id: trip.id } });
  };

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Trips' }} />

      {loaded && trips.length === 0 && !adding && (
        <View style={styles.empty}>
          <Icon name="globe" size={40} color={color.brand} />
          <Txt variant="title2" style={styles.center}>
            Training away from home?
          </Txt>
          <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
            Add where you’re going and when, and GymGO lists the gyms there that let visitors in on those days.
          </Txt>
        </View>
      )}

      {trips.map((trip) => (
        // The trip and its remove button side by side: a button can't hold another.
        <View key={trip.id} style={styles.trip}>
          <Pressable
            onPress={() => {
              haptic.tap();
              router.push({ pathname: '/trips/[id]', params: { id: trip.id } });
            }}
            accessibilityRole="button"
            accessibilityLabel={`${trip.placeName}, ${tripDatesLabel(trip)}, ${tripWhen(trip, todayThere(trip))}`}
            style={({ pressed }) => [styles.tripMain, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.tripIcon}>
              <Icon name="globe" size={20} color={color.brand} />
            </View>
            <View style={styles.flex}>
              <Txt variant="headline" numberOfLines={1}>
                {trip.placeName}
              </Txt>
              <Txt variant="footnote" color={color.labelSecondary}>
                {`${tripDatesLabel(trip)} · ${tripWhen(trip, todayThere(trip))}`}
              </Txt>
            </View>
            <Icon name="chevron" size={14} color={color.labelTertiary} />
          </Pressable>
          {removing === trip.id ? (
            <Pressable
              onPress={() => {
                haptic.warn();
                setRemoving(null);
                removeTrip(trip.id);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Tap again to remove the trip to ${trip.placeName}`}
              hitSlop={8}
              style={({ pressed }) => [styles.confirm, pressed && { opacity: 0.7 }]}
            >
              <Txt variant="footnote" color={color.onBrand} style={face('semibold')}>
                Remove
              </Txt>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => {
                haptic.tap();
                setRemoving(trip.id);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Remove the trip to ${trip.placeName}`}
              hitSlop={8}
              style={({ pressed }) => [styles.remove, pressed && { opacity: 0.6 }]}
            >
              <Icon name="trash" size={17} color={color.labelTertiary} />
            </Pressable>
          )}
        </View>
      ))}

      {adding ? (
        <Card style={styles.form}>
          <Txt variant="headline">Where to?</Txt>
          {where ? (
            <Pressable onPress={() => setWhere(null)} accessibilityRole="button" accessibilityLabel={`${where.placeName}. Change`} style={styles.picked}>
              <Icon name="pin" size={16} color={color.brand} />
              <Txt variant="body" style={[styles.flex, face('semibold')]}>
                {where.placeName}
              </Txt>
              <Txt variant="footnote" color={color.brand}>
                Change
              </Txt>
            </Pressable>
          ) : (
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder="A city or suburb"
              autoCorrect={false}
              autoFocus
              accessibilityLabel="Where you’re going"
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={() => suggestions[0] && setWhere(suggestions[0].where)}
            />
          )}
          {!where && query.trim().length >= 2 && suggestions.length === 0 && (
            <Txt variant="footnote" color={color.labelSecondary}>
              No town by that name on GymGO’s list yet. Try the nearest city.
            </Txt>
          )}
          {suggestions.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => {
                haptic.select();
                setWhere(item.where);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}, ${item.detail}`}
              style={({ pressed }) => [styles.suggestion, pressed && { backgroundColor: color.fill }]}
            >
              <Txt variant="body">{item.title}</Txt>
              <Txt variant="footnote" color={color.labelSecondary}>
                {item.detail}
              </Txt>
            </Pressable>
          ))}

          <Txt variant="headline">When?</Txt>
          <Stepper
            label="Arriving"
            value={tripDatesLabel({ from, to: from })}
            onLess={from > today ? () => setFrom(addDays(from, -1)) : undefined}
            onMore={from < addDays(today, MAX_AHEAD_DAYS) ? () => setFrom(addDays(from, 1)) : undefined}
          />
          <Stepper
            label="Staying"
            value={stay === 0 ? 'Day trip' : `${stay} night${stay === 1 ? '' : 's'}`}
            onLess={stay > 0 ? () => setStay(stay - 1) : undefined}
            onMore={stay < MAX_NIGHTS ? () => setStay(stay + 1) : undefined}
          />
          <Txt variant="footnote" color={color.labelSecondary}>
            {`${tripDatesLabel({ from, to: addDays(from, stay) })}. Kept on this phone only.`}
          </Txt>
          <PrimaryButton label="Add trip" icon="plus" disabled={!where} onPress={save} />
          <PrimaryButton label="Cancel" tone="quiet" onPress={startOver} />
        </Card>
      ) : (
        <PrimaryButton label={trips.length ? 'Add another trip' : 'Add a trip'} icon="plus" onPress={() => setAdding(true)} />
      )}
    </PageScroll>
  );
}

function Stepper({ label, value, onLess, onMore }: { label: string; value: string; onLess?: () => void; onMore?: () => void }) {
  return (
    <View style={styles.stepper}>
      <Txt variant="subhead" color={color.labelSecondary} style={styles.stepperLabel}>
        {label}
      </Txt>
      <StepButton icon="minus" label={`Earlier or shorter: ${label}`} onPress={onLess} />
      <Txt variant="body" style={[styles.stepperValue, face('semibold')]}>
        {value}
      </Txt>
      <StepButton icon="plus" label={`Later or longer: ${label}`} onPress={onMore} />
    </View>
  );
}

function StepButton({ icon, label, onPress }: { icon: 'minus' | 'plus'; label: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={() => {
        if (!onPress) return;
        haptic.select();
        onPress();
      }}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-disabled={!onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.step, !onPress && { opacity: 0.35 }, pressed && { opacity: 0.6 }]}
    >
      <Icon name={icon} size={16} color={color.brand} />
    </Pressable>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], paddingBottom: space[8], gap: space[3], width: '100%', maxWidth: 560, alignSelf: 'center' },
    empty: { alignItems: 'center', gap: space[3], paddingVertical: space[6], paddingHorizontal: space[4] },
    center: { textAlign: 'center' },
    flex: { flex: 1, minWidth: 0 },
    trip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[1],
      paddingRight: space[2],
      borderRadius: radius.lg,
      borderCurve: 'continuous',
      backgroundColor: color.card,
    },
    tripIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: color.brandTint },
    tripMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3] },
    remove: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
    confirm: { paddingHorizontal: space[3], paddingVertical: space[2], borderRadius: radius.pill, backgroundColor: color.danger },
    form: { gap: space[3] },
    input: {
      height: 44,
      paddingHorizontal: space[3],
      borderRadius: radius.md,
      backgroundColor: color.fill,
      color: color.label,
      fontSize: 17,
    },
    picked: { flexDirection: 'row', alignItems: 'center', gap: space[2], padding: space[3], borderRadius: radius.md, backgroundColor: color.brandTint },
    suggestion: { paddingVertical: space[2], paddingHorizontal: space[2], borderRadius: radius.sm },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    stepperLabel: { width: 72 },
    stepperValue: { flex: 1, textAlign: 'center' },
    step: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: color.fill },
  }),
);
