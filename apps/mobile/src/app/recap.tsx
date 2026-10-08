/**
 * Your week, as a picture to share (components/RecapCard.tsx): this week's,
 * or last week's while this one is still empty. Opened from Progress.
 */

import { Stack, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { PageScroll } from '@/components/PageScroll';
import { RecapCard } from '@/components/RecapCard';
import { ListSkeleton } from '@/components/Skeleton';
import { PrimaryButton, Txt } from '@/components/ui';
import { useApp } from '@/lib/app-state';
import { weekRecap } from '@/lib/insights';
import { usePageTitle } from '@/lib/pageTitle';
import { imageShareLine, shareViewAsImage } from '@/lib/shareImage';
import { color, space, themed } from '@/lib/theme';
import { unitFor } from '@/lib/training';
import { useCollection } from '@/lib/useCollection';
import { useTrainingLog } from '@/lib/useTraining';

export default function RecapScreen() {
  usePageTitle('Your week');
  const router = useRouter();
  const { account, prefs, data } = useApp();
  const log = useTrainingLog(account.token);
  const { gyms } = useCollection();
  const recap = useMemo(() => weekRecap(log.sessions, gyms), [log.sessions, gyms]);
  const shot = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const [line, setLine] = useState<string | null>(null);

  const share = async () => {
    setBusy(true);
    setLine(null);
    const outcome = await shareViewAsImage(shot, { name: recap?.which === 'last' ? 'my-last-week' : 'my-week', title: 'My week on GymGO' });
    setBusy(false);
    setLine(imageShareLine(outcome));
  };

  const best = recap?.bestCard ?? null;
  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Your week' }} />
      {log.status === 'loading' && <ListSkeleton rows={3} label="Adding up your week" />}
      {log.status !== 'loading' && !recap && (
        <View style={styles.empty}>
          <Icon name="calendar" size={36} color={color.brand} />
          <Txt variant="title2" style={styles.centre}>
            Nothing this week yet
          </Txt>
          <Txt variant="subhead" color={color.labelSecondary} style={styles.centre}>
            Log a workout or check in at a gym, and your week shows here, ready to share.
          </Txt>
          <View style={styles.button}>
            <PrimaryButton label="Build a workout" icon="workout" onPress={() => router.push('/workout/any')} />
          </View>
        </View>
      )}
      {recap && (
        <>
          {/* What's captured: the card and a little room round it. */}
          <View ref={shot} collapsable={false} style={styles.shot}>
            <RecapCard
              recap={recap}
              unit={unitFor(prefs.country)}
              record={best ? (data.records.find((record) => record.location.id === best.id) ?? null) : null}
              cover={best ? (data.covers[best.id] ?? null) : null}
            />
          </View>
          <View style={styles.actions}>
            <PrimaryButton label="Share as a picture" icon="share" busy={busy} onPress={() => void share()} />
            {line && (
              <Txt variant="footnote" color={color.labelSecondary} style={styles.centre}>
                {line}
              </Txt>
            )}
            <Txt variant="footnote" color={color.labelSecondary} style={styles.centre}>
              The picture shows the week’s totals and your best card. Never which days you went, or when.
            </Txt>
          </View>
        </>
      )}
    </PageScroll>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], paddingBottom: space[8], gap: space[4], alignItems: 'center' },
    shot: { padding: space[3], alignItems: 'center' },
    actions: { alignSelf: 'stretch', gap: space[3], width: '100%', maxWidth: 420, marginHorizontal: 'auto' },
    empty: { alignItems: 'center', gap: space[3], paddingVertical: space[8], maxWidth: 420 },
    button: { alignSelf: 'stretch', marginTop: space[2] },
    centre: { textAlign: 'center' },
  }),
);
