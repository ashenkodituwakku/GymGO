/**
 * GymPal's coach's note on the workout just finished (GymGO Max), on the
 * workout summary: asked for with a tap, never on its own, as each one is a
 * question to GymPal. The server reads this workout and the ones before it
 * (never its gym or your note) and GymPal says what went well and what to
 * aim for next (apps/server/src/gymPalMax.ts).
 *
 * Without Max, one quiet line says what it is and leads to the Pro page.
 */

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { api, apiBase, problemText } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { color, face, radius, space, themed } from '@/lib/theme';
import { Icon } from './Icon';
import { MaxBadge } from './MaxBadge';
import { Pressable } from './motion';
import { LiveLine, PrimaryButton, Txt } from './ui';

export function CoachNote({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { account, billing } = useApp();
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  // GymPal needs a server, and an account to ask as.
  if (apiBase() === null || account.state !== 'signed_in') return null;

  if (!billing.isMax) {
    return (
      <Pressable
        onPress={() => router.push({ pathname: '/pro', params: { reason: 'max' } })}
        accessibilityRole="button"
        accessibilityLabel="AI coach notes, with GymGO Max. See Max"
        style={({ pressed }) => [styles.teaser, pressed && { backgroundColor: color.fill }]}
      >
        <Icon name="sparkle" size={18} color={color.brand} />
        <View style={styles.flex}>
          <View style={styles.titleRow}>
            <Txt variant="subhead" style={face('semibold')}>
              AI coach notes
            </Txt>
            <MaxBadge />
          </View>
          <Txt variant="footnote" color={color.labelSecondary}>
            Get personal feedback after every workout.
          </Txt>
        </View>
        <Icon name="chevron" size={13} color={color.labelTertiary} />
      </Pressable>
    );
  }

  const ask = async () => {
    setBusy(true);
    setProblem(null);
    try {
      const answer = await api.gymPalNote(sessionId);
      setNote(answer.note);
      haptic.success();
    } catch (error) {
      setProblem(problemText(error, 'Couldn’t get a note right now. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Icon name="sparkle" size={18} color={color.brand} />
        <Txt variant="headline" accessibilityRole="header" level={2}>
          Coach note
        </Txt>
      </View>
      <LiveLine>
        {note ? (
          <Txt variant="body">{note}</Txt>
        ) : (
          <Txt variant="footnote" color={color.labelSecondary}>
            Get feedback on this workout based on your recent training. Uses 1 GymPal message.
          </Txt>
        )}
      </LiveLine>
      {!note && <PrimaryButton label={busy ? 'Writing…' : 'Get coach note'} tone="quiet" busy={busy} onPress={() => void ask()} />}
      <LiveLine>
        {problem && (
          <Txt variant="footnote" color={color.dangerInk}>
            {problem}
          </Txt>
        )}
      </LiveLine>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    card: { gap: space[2], padding: space[4], borderRadius: radius.lg, backgroundColor: color.card, borderWidth: StyleSheet.hairlineWidth, borderColor: color.separator },
    teaser: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[4], borderRadius: radius.lg, backgroundColor: color.card },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    flex: { flex: 1, minWidth: 0, gap: 2 },
  }),
);
