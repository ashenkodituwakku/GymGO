/**
 * Report a bug: what went wrong, in your words, sent to the people who make
 * GymGO. It's kept on the GymGO server and emailed to the team.
 *
 * Signed in or not. The app and device details that go with it are listed
 * here before anything is sent, and can be left out; nothing about where you
 * are or what you searched is ever included.
 */

import Constants from 'expo-constants';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { Icon } from '@/components/Icon';
import { Group, Row, TILE } from '@/components/ios';
import { FADE_IN, rise } from '@/components/motion';
import { PrimaryButton, TextField, Txt } from '@/components/ui';
import { api, problemText } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { deviceDetails } from '@/lib/bugReport';
import { haptic } from '@/lib/haptics';
import { usePageTitle } from '@/lib/pageTitle';
import { ACCENTS, color, radius, space, themed } from '@/lib/theme';
import { useThemeChoice } from '@/lib/themePrefs';

const MIN_CHARS = 10;
const MAX_CHARS = 4000;
const APPEARANCE: Record<string, string> = { system: 'Automatic', light: 'Light', dark: 'Dark' };
const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

/** Where the device's language and clock are set to, when the engine says. */
function languageAndZone(): { locale: string | null; timeZone: string | null } {
  try {
    const options = Intl.DateTimeFormat().resolvedOptions();
    return { locale: options.locale ?? null, timeZone: options.timeZone ?? null };
  } catch {
    return { locale: null, timeZone: null };
  }
}

export default function ReportBug() {
  usePageTitle('Report a bug');
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { account, prefs, billing } = useApp();
  const theme = useThemeChoice();
  const window = useWindowDimensions();
  const signedIn = account.state === 'signed_in';
  const accountEmail = account.account?.email ?? null;

  const [description, setDescription] = useState('');
  const [wantReply, setWantReply] = useState(true);
  const [replyEmail, setReplyEmail] = useState('');
  const [includeDetails, setIncludeDetails] = useState(true);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [sent, setSent] = useState<{ emailed: boolean; replyTo: string | null } | null>(null);

  const details = useMemo(
    () =>
      deviceDetails({
        appVersion: `${Constants.expoConfig?.version ?? 'unknown'} (pilot)`,
        platform: Platform.OS,
        osVersion: Platform.OS === 'web' ? null : Platform.Version,
        userAgent: Platform.OS === 'web' && typeof navigator !== 'undefined' ? navigator.userAgent : null,
        screen: { width: window.width, height: window.height, scale: window.scale },
        from: typeof from === 'string' && from.length <= 40 ? from : null,
        country: prefs.country,
        appearance: APPEARANCE[theme.appearance] ?? theme.appearance,
        accent: ACCENTS[theme.accent]?.name ?? theme.accent,
        demo: prefs.demo,
        signedIn,
        pro: billing.isPro,
        ...languageAndZone(),
      }),
    [window.width, window.height, window.scale, from, prefs.country, prefs.demo, theme.appearance, theme.accent, signedIn, billing.isPro],
  );

  const typed = description.trim();
  const replyTo = signedIn ? (wantReply ? accountEmail : null) : replyEmail.trim() || null;
  const replyProblem = !signedIn && replyTo !== null && !looksLikeEmail(replyTo);
  const ready = typed.length >= MIN_CHARS && typed.length <= MAX_CHARS && !replyProblem && !busy;

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    setProblem(null);
    try {
      const token = account.state === 'signed_in' ? account.token : null;
      const answer = await api.reportBug(token, { description: typed, replyTo, context: includeDetails ? details : [] });
      haptic.success();
      setSent({ emailed: answer.emailed, replyTo });
    } catch (error) {
      haptic.warn();
      // What you wrote stays in the box, to send again.
      setProblem(problemText(error, 'That didn’t send. Try again?'));
    } finally {
      setBusy(false);
    }
  };

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/profile'));

  if (sent) {
    return (
      <View style={styles.page}>
        <Stack.Screen options={{ title: 'Report a bug' }} />
        <Animated.View entering={FADE_IN} style={styles.done}>
          <View style={styles.doneIcon}>
            <Icon name="good" size={34} color={color.onBrand} />
          </View>
          <Txt variant="title2" style={styles.center} accessibilityRole="header">
            Thanks, that’s sent
          </Txt>
          <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
            {sent.emailed ? 'It’s with the GymGO team now.' : 'It’s saved for the GymGO team, and emailed to them as soon as the server can.'}
            {sent.replyTo ? ` If they need to know more, they’ll write to ${sent.replyTo}.` : ''}
          </Txt>
          <View style={styles.doneButton}>
            <PrimaryButton label="Done" onPress={leave} />
          </View>
        </Animated.View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Stack.Screen options={{ title: 'Report a bug' }} />
      <Animated.View entering={rise(0)} style={styles.intro}>
        <View style={styles.badge}>
          <Icon name="bug" size={24} color={color.onBrand} />
        </View>
        <Txt variant="subhead" color={color.labelSecondary} style={styles.introText}>
          Something not working, or not right? Say what happened and it goes straight to the people who make GymGO.
        </Txt>
      </Animated.View>

      <View style={styles.card}>
        <TextField
          label="What went wrong?"
          inSheet={false}
          value={description}
          onChangeText={setDescription}
          placeholder="What you did, what you expected, and what happened instead."
          multiline
          maxLength={MAX_CHARS}
          autoFocus={Platform.OS !== 'web'}
          style={styles.description}
          textAlignVertical="top"
        />
        <Txt variant="caption" color={typed.length > 0 && typed.length < MIN_CHARS ? color.maybeInk : color.labelTertiary} style={styles.count}>
          {typed.length > 0 && typed.length < MIN_CHARS ? 'A few more words, please · ' : ''}
          {description.length.toLocaleString('en-US')} / {MAX_CHARS.toLocaleString('en-US')}
        </Txt>
      </View>

      {signedIn ? (
        <Group footer={wantReply ? `The team can reply to ${accountEmail ?? 'your account’s email'}.` : 'The team won’t reply, but will still read it.'}>
          <Row icon="mail" tile={TILE.blue} title="Email me about this" toggle={{ value: wantReply, onChange: setWantReply }} />
        </Group>
      ) : (
        <View style={styles.card}>
          <TextField
            label="Your email, if you’d like a reply"
            inSheet={false}
            value={replyEmail}
            onChangeText={setReplyEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
          />
          {replyProblem && (
            <Txt variant="footnote" color={color.maybeInk}>
              That email address doesn’t look right.
            </Txt>
          )}
        </View>
      )}

      <Group header="Sent with your report" footer="Never your location, your searches or your gyms.">
        <Row icon="info" tile={TILE.grey} title="App and device details" toggle={{ value: includeDetails, onChange: setIncludeDetails }} />
        {includeDetails ? (
          <View style={styles.details} accessible accessibilityLabel={`Details sent: ${details.map((line) => `${line.label}, ${line.value}`).join('; ')}`}>
            {details.map((line) => (
              <View key={line.label} style={styles.detail}>
                <Txt variant="footnote" color={color.labelSecondary} style={styles.detailLabel}>
                  {line.label}
                </Txt>
                <Txt variant="footnote" style={styles.detailValue}>
                  {line.value}
                </Txt>
              </View>
            ))}
          </View>
        ) : null}
      </Group>

      {problem && (
        <View style={styles.problem}>
          <Icon name="info" size={16} color={color.dangerInk} />
          <Txt variant="footnote" color={color.dangerInk} style={styles.flex}>
            {problem}
          </Txt>
        </View>
      )}

      <PrimaryButton label={busy ? 'Sending…' : 'Send report'} icon="bug" onPress={() => void submit()} disabled={!ready} busy={busy} />
      <Txt variant="footnote" color={color.labelTertiary} style={styles.center}>
        Reports are kept on the GymGO server and emailed to the team. Please leave out passwords and card details.
      </Txt>
    </ScrollView>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], paddingBottom: space[8], gap: space[4], width: '100%', maxWidth: 560, alignSelf: 'center' },
    intro: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
    introText: { flex: 1 },
    badge: {
      width: 44,
      height: 44,
      borderRadius: 12,
      borderCurve: 'continuous',
      backgroundColor: TILE.red,
      alignItems: 'center',
      justifyContent: 'center',
    },
    card: { backgroundColor: color.card, borderRadius: radius.lg, borderCurve: 'continuous', padding: space[4], gap: space[2] },
    description: { minHeight: 150, paddingTop: space[3], paddingBottom: space[3] },
    count: { textAlign: 'right' },
    details: { paddingHorizontal: space[4], paddingBottom: space[3], gap: 6 },
    detail: { flexDirection: 'row', gap: space[3] },
    detailLabel: { width: 140 },
    detailValue: { flex: 1 },
    problem: { flexDirection: 'row', gap: space[2], alignItems: 'center', padding: space[3], borderRadius: radius.md, backgroundColor: color.dangerTint },
    flex: { flex: 1 },
    center: { textAlign: 'center' },
    done: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3], padding: space[6], maxWidth: 460, alignSelf: 'center' },
    doneIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: color.good, alignItems: 'center', justifyContent: 'center', marginBottom: space[1] },
    doneButton: { alignSelf: 'stretch', marginTop: space[2] },
  }),
);
