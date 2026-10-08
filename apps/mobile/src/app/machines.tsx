/**
 * Find a machine: pick the machines you want and how far you'll go, and see
 * the gyms near your search that have them, by the gym's record or by what
 * members who train there have ticked. Every line says which ("From the
 * gym", "3 members say so"); a gym nobody has said anything about isn't
 * listed, since unknown isn't yes.
 *
 * Members' reports come from the server in one request for the machines
 * picked, with no position sent: the gyms near the search are picked out
 * here, on the phone.
 */

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Pressable } from '@/components/motion';
import { EQUIPMENT_TYPES, equipmentLabel, findMachines, type EquipmentCategory, type MachineHit, type ReportedEquipment } from '@gymgo/domain';
import { MarkImage, useGymMark } from '@/components/BrandLogo';
import { Icon } from '@/components/Icon';
import { Illustration } from '@/components/Illustration';
import { PageScroll } from '@/components/PageScroll';
import { Card, Chip, NoPhoto, PrimaryButton, Txt } from '@/components/ui';
import { api } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { demoPicture } from '@/lib/gymPicture';
import { haptic } from '@/lib/haptics';
import { MAX_MACHINES, evidenceLine, foundLabel } from '@/lib/machines';
import { usePageTitle } from '@/lib/pageTitle';
import { distanceLabel, radiusChoices } from '@/lib/places';
import { THIS_AREA, YOUR_LOCATION, nearLabel } from '@/lib/query';
import { color, face, radius, space, themed } from '@/lib/theme';

const GROUPS: Array<{ category: EquipmentCategory; label: string }> = [
  { category: 'racks_and_platforms', label: 'Racks and platforms' },
  { category: 'free_weights', label: 'Free weights' },
  { category: 'machines', label: 'Machines' },
  { category: 'cardio', label: 'Cardio' },
  { category: 'functional', label: 'Functional' },
];

/** Members' reports: still asking, had, or the server couldn't be reached. */
type Reports = { state: 'loading' } | { state: 'ready'; gyms: ReportedEquipment } | { state: 'offline' };

export default function MachinesScreen() {
  usePageTitle('Find a machine');
  const params = useLocalSearchParams<{ type?: string }>();
  const router = useRouter();
  const { data, filters } = useApp();
  const choices = radiusChoices(filters.countryCode);
  const [picked, setPicked] = useState<string[]>(() =>
    params.type && EQUIPMENT_TYPES.some((type) => type.id === params.type) ? [params.type] : [],
  );
  // The distance the search uses, if it's one of the choices; else the nearest one above it.
  const [radiusKm, setRadiusKm] = useState(() => (choices.find((choice) => choice.km >= filters.radiusKm - 0.01) ?? choices[choices.length - 1]!).km);
  const [reports, setReports] = useState<Reports>({ state: 'ready', gyms: {} });
  // The full list of machines, or (once some are picked and you tap Done) just those, so the gyms come up the page.
  const [choosing, setChoosing] = useState(picked.length === 0);

  const key = [...picked].sort().join(',');
  useEffect(() => {
    if (!key) return setReports({ state: 'ready', gyms: {} });
    let live = true;
    setReports({ state: 'loading' });
    api
      .reportedEquipment(key.split(','))
      .then((answer) => live && setReports({ state: 'ready', gyms: answer.gyms }))
      .catch(() => live && setReports({ state: 'offline' }));
    return () => {
      live = false;
    };
  }, [key]);

  const hits = useMemo(
    () =>
      findMachines({
        records: data.records,
        centre: filters.centre,
        radiusKm,
        equipmentTypeIds: picked,
        reported: reports.state === 'ready' ? reports.gyms : undefined,
      }),
    [data.records, filters.centre, radiusKm, picked, reports],
  );

  const toggle = (id: string) => {
    haptic.select();
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : current.length >= MAX_MACHINES ? current : [...current, id]));
  };

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Find a machine' }} />

      {choosing || picked.length === 0 ? (
        <Card style={styles.card}>
          <View style={styles.cardHead}>
            <Txt variant="headline" style={styles.flex}>
              What do you need?
            </Txt>
            {picked.length > 0 && (
              <Pressable onPress={() => setChoosing(false)} accessibilityRole="button" hitSlop={10}>
                <Txt variant="body" color={color.brand} style={face('semibold')}>
                  Done
                </Txt>
              </Pressable>
            )}
          </View>
          {GROUPS.map((group) => (
            <View key={group.category} style={styles.group}>
              <Txt variant="footnote" color={color.labelSecondary} style={face('semibold')}>
                {group.label}
              </Txt>
              <View style={styles.chips}>
                {EQUIPMENT_TYPES.filter((type) => type.category === group.category).map((type) => (
                  <Chip key={type.id} label={type.label} selected={picked.includes(type.id)} onPress={() => toggle(type.id)} />
                ))}
              </View>
            </View>
          ))}
          {picked.length >= MAX_MACHINES && (
            <Txt variant="footnote" color={color.labelSecondary}>
              {`That’s ${MAX_MACHINES}, the most for one search.`}
            </Txt>
          )}
          {picked.length > 0 && <PrimaryButton label={`Show the gyms (${picked.length} picked)`} onPress={() => setChoosing(false)} />}
        </Card>
      ) : (
        <Card style={styles.card}>
          <View style={styles.cardHead}>
            <Txt variant="headline" style={styles.flex}>
              Looking for
            </Txt>
            <Pressable onPress={() => setChoosing(true)} accessibilityRole="button" accessibilityLabel="Change the machines" hitSlop={10}>
              <Txt variant="body" color={color.brand} style={face('semibold')}>
                Change
              </Txt>
            </Pressable>
          </View>
          <View style={styles.chips}>
            {picked.map((id) => (
              <Chip
                key={id}
                label={equipmentLabel(id)}
                icon="close"
                accessibilityLabel={`${equipmentLabel(id)}. Remove`}
                selected
                onPress={() => {
                  toggle(id);
                  if (picked.length === 1) setChoosing(true);
                }}
              />
            ))}
          </View>
        </Card>
      )}

      <Card style={styles.card}>
        <Txt variant="headline">How far</Txt>
        <View style={styles.chips}>
          {choices.map((choice) => (
            <Chip key={choice.label} label={choice.label} selected={Math.abs(radiusKm - choice.km) < 0.01} onPress={() => setRadiusKm(choice.km)} />
          ))}
        </View>
        <Txt variant="footnote" color={color.labelSecondary}>
          {`From ${fromWhere(filters.placeName)}, as the crow flies. Change the place in Explore.`}
        </Txt>
      </Card>

      {picked.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="workout" size={36} color={color.brand} />
          <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
            Pick a machine or two, and the gyms known to have them show up here.
          </Txt>
        </View>
      ) : (
        <>
          <View style={styles.summary}>
            <Txt variant="title2">
              {reports.state === 'loading' && hits.length === 0
                ? 'Looking…'
                : hits.length === 0
                  ? 'None known yet'
                  : `${hits.length} gym${hits.length === 1 ? '' : 's'} ${lowerFirst(nearLabel(filters.placeName))}`}
            </Txt>
            {reports.state === 'offline' && (
              <Txt variant="footnote" color={color.maybeInk}>
                Couldn’t reach GymGO for members’ reports, so this is only what gyms’ records say.
              </Txt>
            )}
          </View>
          {hits.length === 0 && reports.state !== 'loading' ? (
            <Txt variant="subhead" color={color.labelSecondary}>
              No gym within reach is known to have that. Try further out, or fewer machines. If your gym has it, tick it on the gym’s page so
              the next person knows.
            </Txt>
          ) : (
            <Card style={styles.list}>
              {hits.map((hit, index) => (
                <MachineRow
                  key={hit.record.location.id}
                  hit={hit}
                  last={index === hits.length - 1}
                  onPress={() => router.push({ pathname: '/gym/[id]', params: { id: hit.record.location.id } })}
                />
              ))}
            </Card>
          )}
          <Txt variant="footnote" color={color.labelSecondary}>
            A gym whose own record says it hasn’t got one is left out. Members count only when more say yes than no. Check before you go:
            machines move, and break.
          </Txt>
        </>
      )}
    </PageScroll>
  );
}

/** Where the distances are measured from, in a sentence. */
function fromWhere(placeName: string): string {
  if (placeName === YOUR_LOCATION) return 'where you are';
  if (placeName === THIS_AREA) return 'the middle of the area you searched';
  return placeName;
}

/** "Near Melbourne CBD" to go after a count: "near Melbourne CBD", the place keeping its capitals. */
const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

function MachineRow({ hit, last, onPress }: { hit: MachineHit; last: boolean; onPress: () => void }) {
  const location = hit.record.location;
  const mark = useGymMark(location);
  const illustration = demoPicture(location);
  const all = hit.found === hit.machines.length;
  const where = [location.address.suburb, distanceLabel(hit.distanceKm, location.address.countryCode)].filter(Boolean).join(' · ');
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${location.name}, ${where}. ${foundLabel(hit)}. ${hit.machines.map((machine) => evidenceLine(machine).text).join('. ')}`}
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
        <View style={[styles.pill, { backgroundColor: all ? color.goodTint : color.maybeTint }]}>
          <Txt variant="caption" color={all ? color.goodInk : color.maybeInk} style={face('semibold')}>
            {foundLabel(hit)}
          </Txt>
        </View>
        {hit.machines.map((machine) => {
          const line = evidenceLine(machine);
          return (
            <View key={machine.equipmentTypeId} style={styles.evidence}>
              <Icon name={line.known ? 'check' : 'question'} size={13} color={line.known ? color.goodInk : color.labelTertiary} />
              <Txt variant="footnote" color={line.known ? color.label : color.labelSecondary} style={styles.shrink}>
                {line.text}
              </Txt>
            </View>
          );
        })}
      </View>
      <Icon name="chevron" size={16} color={color.labelTertiary} />
    </Pressable>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], paddingBottom: space[8], gap: space[3], width: '100%', maxWidth: 640, alignSelf: 'center' },
    card: { gap: space[3] },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    flex: { flex: 1, minWidth: 0 },
    group: { gap: space[2] },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    empty: { alignItems: 'center', gap: space[3], paddingVertical: space[6], paddingHorizontal: space[4] },
    center: { textAlign: 'center' },
    summary: { gap: space[1], marginTop: space[2] },
    list: { paddingVertical: space[1], paddingHorizontal: 0 },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3], paddingVertical: space[3], paddingHorizontal: space[3] },
    rowRule: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.separator },
    thumb: { width: 48, height: 48, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: color.fill },
    tile: { alignItems: 'center', justifyContent: 'center' },
    middle: { flex: 1, minWidth: 0, gap: 3 },
    pill: { alignSelf: 'flex-start', paddingHorizontal: space[2], paddingVertical: 2, borderRadius: radius.pill, marginVertical: 2 },
    evidence: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
    shrink: { flexShrink: 1 },
  }),
);
