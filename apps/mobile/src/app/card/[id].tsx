/**
 * One of your cards, big: share it as a picture (lib/shareImage.ts), or go
 * to the gym's page. A finished set's reward card (components/SetCard.tsx)
 * opens here too (`/card/set:<its key>`), so it can be shared the same way.
 */

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { GemCard } from '@/components/GemCard';
import { PageScroll } from '@/components/PageScroll';
import { SetReward } from '@/components/SetCard';
import { PrimaryButton, Txt } from '@/components/ui';
import { useApp } from '@/lib/app-state';
import { usePageTitle } from '@/lib/pageTitle';
import { cardFor, cardName } from '@/lib/rarity';
import { collectionSets } from '@/lib/sets';
import { imageShareLine, shareViewAsImage } from '@/lib/shareImage';
import { color, space, themed } from '@/lib/theme';
import { useCollection } from '@/lib/useCollection';

export default function CardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data } = useApp();
  const { loaded, gyms } = useCollection();
  const { width } = useWindowDimensions();
  const shot = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const [line, setLine] = useState<string | null>(null);
  const cardWidth = Math.min(300, width - space[4] * 4);

  const entry = id && !id.startsWith('set:') ? gyms[id] ?? null : null;
  const set = useMemo(
    () => (id?.startsWith('set:') ? collectionSets(gyms, data.listed).find((item) => item.key === id.slice(4) && item.complete) ?? null : null),
    [id, data.listed, gyms],
  );
  const title = entry ? cardName(cardFor(entry)) : set ? `${set.name} set` : 'Card';
  usePageTitle(title);

  const share = async () => {
    setBusy(true);
    setLine(null);
    const outcome = await shareViewAsImage(shot, { name: entry?.name ?? set?.name ?? 'card', title: 'My GymGO card' });
    setBusy(false);
    setLine(imageShareLine(outcome));
  };

  if (!entry && !set) {
    return (
      <View style={styles.missing}>
        <Stack.Screen options={{ title: 'Card' }} />
        {loaded && (
          <Txt variant="subhead" color={color.labelSecondary} style={styles.centre}>
            This card isn’t in your collection.
          </Txt>
        )}
      </View>
    );
  }

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title }} />
      {/* What's captured: the card and a little room round it. */}
      <View ref={shot} collapsable={false} style={styles.shot}>
        {entry ? (
          <GemCard
            entry={entry}
            record={data.records.find((record) => record.location.id === entry.id) ?? null}
            cover={data.covers[entry.id] ?? null}
            width={cardWidth}
            big
          />
        ) : (
          <View style={{ width: Math.max(cardWidth, 280) }}>
            <SetReward set={set!} />
          </View>
        )}
      </View>
      <View style={styles.actions}>
        <PrimaryButton label="Share as a picture" icon="share" busy={busy} onPress={() => void share()} />
        {entry && <PrimaryButton label="Open the gym" tone="quiet" icon="gym" onPress={() => router.push({ pathname: '/gym/[id]', params: { id: entry.id } })} />}
        {line && (
          <Txt variant="footnote" color={color.labelSecondary} style={styles.centre}>
            {line}
          </Txt>
        )}
        <Txt variant="footnote" color={color.labelSecondary} style={styles.centre}>
          {entry
            ? 'The picture shows what’s on the card: the gym, its city and the card’s look. Never the days you went.'
            : 'The picture shows what’s on the card: the place and the day you finished the set.'}
        </Txt>
      </View>
    </PageScroll>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], paddingBottom: space[8], gap: space[4], alignItems: 'center' },
    shot: { padding: space[4], alignItems: 'center' },
    actions: { alignSelf: 'stretch', gap: space[3], width: '100%', maxWidth: 420, marginHorizontal: 'auto' },
    missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[6], backgroundColor: color.groupedBackground },
    centre: { textAlign: 'center' },
  }),
);
