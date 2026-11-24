/**
 * Share a workout of yours as a picture (components/WorkoutShareCard.tsx):
 * the card as it'll be, and Share. From the finished workout's summary and
 * your workout's page in the feed. `id` is a workout in your log.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type ViewInstance } from 'react-native';
import { PageScroll } from '@/components/PageScroll';
import { useGlassRedraw } from '@/components/Redrawn';
import { ScreenOptions } from '@/components/ScreenOptions';
import { ListSkeleton } from '@/components/Skeleton';
import { LiveLine, PrimaryButton, Txt } from '@/components/ui';
import { WorkoutShareCard } from '@/components/WorkoutShareCard';
import { shareText } from '@/lib/actions';
import { useApp } from '@/lib/app-state';
import { workoutShareText } from '@/lib/insights';
import { usePageTitle } from '@/lib/pageTitle';
import { imageShareLine, shareViewAsImage } from '@/lib/shareImage';
import { recordsBroken } from '@/lib/training';
import { color, space, themed } from '@/lib/theme';
import { useTrainingLog } from '@/lib/useTraining';

export default function ShareWorkoutScreen() {
  useGlassRedraw();
  usePageTitle('Share your workout');
  const router = useRouter();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { account } = useApp();
  const log = useTrainingLog(account.token);
  const session = log.sessions.find((item) => item.id === id) ?? null;
  const records = useMemo(() => (session ? recordsBroken(session, log.sessions) : []), [session, log.sessions]);
  const card = useRef<ViewInstance>(null);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string | null>(null);

  const sharePicture = async () => {
    if (!session) return;
    setBusy(true);
    const outcome = await shareViewAsImage(card, { name: `workout-${session.name}`, title: session.name });
    setBusy(false);
    setSaid(imageShareLine(outcome));
  };

  return (
    <PageScroll style={styles.page} contentContainerStyle={styles.content}>
      <ScreenOptions options={{ title: 'Share' }} />
      {!session && log.status === 'loading' && <ListSkeleton rows={3} card label="Loading the workout" />}
      {!session && log.status !== 'loading' && (
        <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
          That workout isn’t in your log any more.
        </Txt>
      )}
      {session && (
        <>
          <WorkoutShareCard ref={card} session={session} records={records} />
          <View style={styles.actions}>
            <PrimaryButton label={busy ? 'Making the picture…' : 'Share the picture'} icon="share" busy={busy} onPress={() => void sharePicture()} />
            <PrimaryButton
              label="Share as text"
              tone="quiet"
              onPress={() => void shareText(workoutShareText(session, records), session.name).then((outcome) => setSaid(outcome === 'copied' ? 'Copied, ready to paste.' : null))}
            />
            <PrimaryButton label="Done" tone="quiet" onPress={() => (router.canGoBack() ? router.back() : router.replace('/progress'))} />
          </View>
          <LiveLine>
            {said && (
              <Txt variant="footnote" color={color.labelSecondary} style={styles.center}>
                {said}
              </Txt>
            )}
          </LiveLine>
        </>
      )}
    </PageScroll>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], gap: space[4], paddingBottom: space[8] * 2, width: '100%', maxWidth: 480, alignSelf: 'center' },
    actions: { gap: space[2] },
    center: { textAlign: 'center' },
  }),
);
