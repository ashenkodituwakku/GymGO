/**
 * What shows if part of GymGO breaks while drawing: a plain apology, a way
 * to try again, and a one-tap bug report with the error attached.
 *
 * It stands alone on purpose. Whatever broke may be the account, the
 * settings or the navigation, so this uses none of them: the report goes
 * without an account, and nothing here needs the rest of the app to work.
 */

import Constants from 'expo-constants';
import type { ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { AppBadge } from './BrandMark';
import { PrimaryButton, TextField, Txt } from './ui';
import { api, problemText } from '@/lib/api';
import { browserName } from '@/lib/bugReport';
import { color, radius, space, themed } from '@/lib/theme';

export function CrashScreen({ error, retry }: ErrorBoundaryProps) {
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [problem, setProblem] = useState<string | null>(null);

  // A crash before the first screen drew would otherwise leave the splash up.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  const send = async () => {
    setState('sending');
    setProblem(null);
    const message = (error?.message || String(error)).slice(0, 200);
    const where = (error?.stack ?? '').split('\n').slice(1, 4).map((line) => line.trim()).join(' | ').slice(0, 200);
    const device =
      Platform.OS === 'web' && typeof navigator !== 'undefined'
        ? `Web browser, ${browserName(navigator.userAgent)}`
        : `${Platform.OS === 'ios' ? 'iPhone (iOS)' : 'Android'}, ${String(Platform.Version)}`;
    try {
      await api.reportBug(null, {
        description: `The app crashed and showed its error screen.\n\nWhat they were doing: ${note.trim() || 'not said'}`,
        replyTo: null,
        context: [
          { label: 'Error', value: message },
          ...(where ? [{ label: 'Where in the code', value: where }] : []),
          { label: 'App version', value: `${Constants.expoConfig?.version ?? 'unknown'} (pilot)` },
          { label: 'Device', value: device },
        ],
      });
      setState('sent');
    } catch (caught) {
      setState('idle');
      setProblem(problemText(caught, 'That didn’t send. Try again?'));
    }
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <AppBadge size={56} />
      <Txt variant="title2" style={styles.center} accessibilityRole="header">
        Something went wrong
      </Txt>
      <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
        GymGO hit a problem it didn’t expect. Trying again usually fixes it; your saved gyms and workouts are safe.
      </Txt>
      <View style={styles.button}>
        <PrimaryButton label="Try again" onPress={() => void retry()} />
      </View>

      <View style={styles.card}>
        {state === 'sent' ? (
          <Txt variant="subhead" color={color.goodInk} style={styles.center}>
            Thanks, the team has the details.
          </Txt>
        ) : (
          <>
            <Txt variant="headline">Tell the team</Txt>
            <Txt variant="footnote" color={color.labelSecondary}>
              Sends the error, the app’s version and the kind of device. Nothing about you, where you are or your gyms.
            </Txt>
            <TextField
              label="What were you doing? (optional)"
              inSheet={false}
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={1000}
              style={styles.note}
              textAlignVertical="top"
            />
            {problem && (
              <Txt variant="footnote" color={color.dangerInk}>
                {problem}
              </Txt>
            )}
            <PrimaryButton label={state === 'sending' ? 'Sending…' : 'Send a bug report'} icon="bug" tone="quiet" busy={state === 'sending'} onPress={() => void send()} />
          </>
        )}
      </View>

      {__DEV__ && error?.message ? (
        <Txt variant="caption" color={color.labelTertiary} style={styles.center}>
          {error.message}
        </Txt>
      ) : null}
    </ScrollView>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: space[3], padding: space[6], width: '100%', maxWidth: 460, alignSelf: 'center' },
    center: { textAlign: 'center' },
    button: { alignSelf: 'stretch', marginTop: space[1] },
    card: { alignSelf: 'stretch', backgroundColor: color.card, borderRadius: radius.lg, borderCurve: 'continuous', padding: space[4], gap: space[2], marginTop: space[4] },
    note: { minHeight: 80, paddingTop: space[3] },
  }),
);
