/**
 * Which gym a workout was at: for the workout you're doing (`session=active`)
 * or one you logged (`session=<id>`). Your usual gyms first (the ones your
 * workouts were at), then the ones you've saved and visited, then the ones
 * around the place you're looking; or search any of them by name or suburb.
 *
 * The gym is named as GymGO knows it, never typed; friends see it on the
 * workout when you share your workouts (apps/server/src/feed.ts).
 */

import { haversineKm, type GymRecord } from '@gymgo/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Pressable } from '@/components/motion';
import { PageScroll } from '@/components/PageScroll';
import { useGlassRedraw } from '@/components/Redrawn';
import { ScreenOptions } from '@/components/ScreenOptions';
import { Input, LiveLine, Txt } from '@/components/ui';
import { updateSession, useActiveSession } from '@/lib/activeSession';
import { api, problemText } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { usePageTitle } from '@/lib/pageTitle';
import { color, face, radius, space, themed } from '@/lib/theme';
import { useCollection } from '@/lib/useCollection';
import { useTrainingLog } from '@/lib/useTraining';

interface Choice {
  id: string;
  name: string;
  /** Where it is: "Fitzroy", "Fitzroy · 1.2 km". */
  where: string;
}

/** Gyms in each list before searching. */
const SHOWN = 8;

export default function GymTagScreen() {
  useGlassRedraw();
  usePageTitle('Which gym?');
  const router = useRouter();
  const { session: which = 'active' } = useLocalSearchParams<{ session?: string }>();
  const { account, data, filters } = useApp();
  const token = account.token;
  const log = useTrainingLog(token);
  const active = useActiveSession();
  const collected = useCollection().gyms;
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const logged = which === 'active' ? null : (log.sessions.find((session) => session.id === which) ?? null);
  const currentId = which === 'active' ? (active?.gymId ?? null) : (logged?.gymId ?? null);

  const choose = async (gym: { id: string; name: string } | null) => {
    setProblem(null);
    if (which === 'active') {
      updateSession((current) => ({ ...current, gymId: gym?.id ?? null, gymName: gym?.name ?? null }));
      haptic.tap();
      router.back();
      return;
    }
    if (!token || !logged) return;
    setSaving(true);
    try {
      const { session } = await api.tagTrainingGym(token, logged.id, gym?.id ?? null);
      log.update(session);
      haptic.success();
      router.back();
    } catch (error) {
      haptic.warn();
      setProblem(problemText(error));
    } finally {
      setSaving(false);
    }
  };

  const lists = useMemo(() => {
    const byId = new Map<string, GymRecord>(data.records.map((record) => [record.location.id, record]));
    const where = (id: string, suburb?: string) => {
      const record = byId.get(id);
      const place = record?.location.address.suburb ?? suburb ?? '';
      const km = record ? haversineKm(filters.centre, record.location.position) : null;
      return [place, km !== null && km < 100 ? `${km < 10 ? km.toFixed(1) : Math.round(km)} km` : null].filter(Boolean).join(' · ');
    };
    const choice = (id: string, name: string, suburb?: string): Choice => ({ id, name, where: where(id, suburb) });
    // The gyms your workouts were at, most used first.
    const counts = new Map<string, { name: string; count: number }>();
    for (const session of log.sessions) {
      if (!session.gymId || !session.gymName) continue;
      const had = counts.get(session.gymId);
      counts.set(session.gymId, { name: session.gymName, count: (had?.count ?? 0) + 1 });
    }
    const yours = [...counts.entries()].sort((a, b) => b[1].count - a[1].count).map(([id, gym]) => choice(id, gym.name));
    const saved = account.saved.flatMap((id) => {
      const record = byId.get(id);
      return record ? [choice(id, record.location.name)] : [];
    });
    const visited = Object.values(collected)
      .sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1))
      .map((gym) => choice(gym.id, gym.name, gym.suburb));
    const nearby = [...data.records]
      .sort((a, b) => haversineKm(filters.centre, a.location.position) - haversineKm(filters.centre, b.location.position))
      .map((record) => choice(record.location.id, record.location.name));
    return { yours, saved, visited, nearby };
  }, [data.records, filters.centre, log.sessions, account.saved, collected]);

  const searching = query.trim().length > 0;
  const found = useMemo(() => {
    if (!searching) return [];
    const words = query.trim().toLowerCase().split(/\s+/);
    const seen = new Set<string>();
    return [...lists.yours, ...lists.saved, ...lists.visited, ...lists.nearby]
      .filter((gym) => {
        if (seen.has(gym.id)) return false;
        seen.add(gym.id);
        const text = `${gym.name} ${gym.where}`.toLowerCase();
        return words.every((word) => text.includes(word));
      })
      .slice(0, 30);
  }, [searching, query, lists]);

  // Each gym once, in the first list it's in.
  const sections = useMemo(() => {
    const seen = new Set<string>();
    const take = (items: Choice[]) => items.filter((gym) => !seen.has(gym.id) && seen.add(gym.id)).slice(0, SHOWN);
    return [
      { title: 'Your gyms', items: take(lists.yours) },
      { title: 'Saved', items: take(lists.saved) },
      { title: 'Visited', items: take(lists.visited) },
      { title: `Near ${filters.placeName}`, items: take(lists.nearby) },
    ].filter((section) => section.items.length > 0);
  }, [lists, filters.placeName]);

  const row = (gym: Choice) => (
    <GymRow key={gym.id} gym={gym} selected={gym.id === currentId} disabled={saving} onPress={() => void choose({ id: gym.id, name: gym.name })} />
  );

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScreenOptions options={{ title: 'Which gym?' }} />
      <Input value={query} onChangeText={setQuery} placeholder="Search gyms" autoCorrect={false} accessibilityLabel="Search gyms by name or suburb" style={styles.search} />
      <LiveLine>
        {problem && (
          <Txt variant="footnote" color={color.noInk}>
            {problem}
          </Txt>
        )}
      </LiveLine>

      {currentId && !searching && (
        <View style={styles.group}>
          <Pressable onPress={() => void choose(null)} disabled={saving} accessibilityRole="button" accessibilityLabel="No gym. Remove the gym tag" style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <Icon name="close" size={16} color={color.labelSecondary} />
            <Txt variant="body" color={color.labelSecondary} style={styles.flex}>
              No gym
            </Txt>
          </Pressable>
        </View>
      )}

      {searching ? (
        found.length > 0 ? (
          <View style={styles.group}>{found.map(row)}</View>
        ) : (
          <Txt variant="subhead" color={color.labelSecondary} style={styles.empty}>
            No gym by that name here. Look it up on Explore first, then it shows up.
          </Txt>
        )
      ) : (
        sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Txt variant="eyebrow" color={color.labelSecondary} accessibilityRole="header" level={2} style={styles.sectionTitle}>
              {section.title.toUpperCase()}
            </Txt>
            <View style={styles.group}>{section.items.map(row)}</View>
          </View>
        ))
      )}
      {!searching && sections.length === 0 && (
        <Txt variant="subhead" color={color.labelSecondary} style={styles.empty}>
          Look around on Explore, and the gyms near you show up here.
        </Txt>
      )}
    </PageScroll>
  );
}

function GymRow({ gym, selected, disabled, onPress }: { gym: Choice; selected: boolean; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${gym.name}${gym.where ? `, ${gym.where}` : ''}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.pin}>
        <Icon name="pin" size={15} color={color.brand} />
      </View>
      <View style={styles.flex}>
        <Txt variant="body" numberOfLines={1} style={selected ? face('semibold') : undefined}>
          {gym.name}
        </Txt>
        {!!gym.where && (
          <Txt variant="footnote" color={color.labelSecondary} numberOfLines={1}>
            {gym.where}
          </Txt>
        )}
      </View>
      {selected && <Icon name="check" size={18} color={color.brand} />}
    </Pressable>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], gap: space[3], paddingBottom: space[8] * 2, width: '100%', maxWidth: 560, alignSelf: 'center' },
    search: { height: 44, paddingHorizontal: space[3], borderRadius: radius.md, backgroundColor: color.fill, color: color.label, fontSize: 17 },
    section: { gap: space[2] },
    sectionTitle: { marginLeft: space[4] },
    group: { backgroundColor: color.plate, borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 52, paddingHorizontal: space[4], paddingVertical: space[2] },
    pressed: { backgroundColor: color.pressed },
    pin: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: color.brandTint },
    flex: { flex: 1, minWidth: 0 },
    empty: { textAlign: 'center', paddingVertical: space[6], paddingHorizontal: space[4] },
  }),
);
