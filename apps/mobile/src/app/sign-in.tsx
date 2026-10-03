/**
 * Sign in, or make an account: with Apple or Google where they're set up,
 * or with an email and password. Opened from Profile, and from anything
 * that needs an account.
 */

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { Platform, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { serverOfflineLine } from '@/lib/copy';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { FADE_IN, FADE_OUT, GLIDE, Pressable } from '@/components/motion';
import { AppBadge } from '@/components/BrandMark';
import { Icon, type IconName } from '@/components/Icon';
import { OrDivider, SocialButtons, useAnySocial, type TokenHandler } from '@/components/SocialSignIn';
import { PrimaryButton, Segmented, Txt } from '@/components/ui';
import { ApiError, OfflineError, api } from '@/lib/api';
import { accountCreationLocked, formatBirthMonthInput, lockAccountCreation, parseBirthMonth, takePendingSignIn, type PendingSignIn } from '@/lib/ageGate';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { NO_WEB_OUTLINE, color, dropShadow, face, radius, space, themed } from '@/lib/theme';
import { usePageTitle } from '@/lib/pageTitle';
import { PageScroll } from '@/components/PageScroll';
import { LegalText } from '@/components/LegalText';

type Mode = 'sign_in' | 'create';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** What someone too young for an account is told, once, and on this device for a day after. */
const TOO_YOUNG = 'Sorry, you can’t make a GymGO account. You can still find gyms and use everything that doesn’t need one.';

const tooYoung = (error: unknown) => error instanceof ApiError && error.code === 'too_young';

function messageFor(error: unknown): string {
  if (error instanceof OfflineError) return serverOfflineLine(Platform.OS);
  if (error instanceof ApiError) return error.message;
  return 'Something went wrong. Try again.';
}

export default function SignInScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const { account } = useApp();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(params.mode === 'create' ? 'create' : 'sign_in');
  usePageTitle(mode === 'create' ? 'Create an account' : 'Sign in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // The age question (see ageGate.ts): typed as MM / YYYY.
  const [born, setBorn] = useState('');
  const birthMonth = parseBirthMonth(born);
  const [locked, setLocked] = useState(false);
  // The terms and privacy policy, agreed to before an account is made.
  const [agreed, setAgreed] = useState(false);
  // A Google or Apple sign-in that would make a new account, waiting on the age question.
  const [pendingSocial, setPendingSocial] = useState<PendingSignIn | null>(() => takePendingSignIn());
  useEffect(() => {
    void accountCreationLocked().then(setLocked);
  }, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // "Forgot your password?": the address a reset link went to, once asked.
  const [resetSentTo, setResetSentTo] = useState<string | null>(null);
  const [resetBusy, setResetBusy] = useState(false);

  const forgot = async () => {
    if (resetBusy) return;
    if (!EMAIL.test(email.trim())) {
      fail('Type your account’s email address above, then tap Forgot your password? again.');
      return;
    }
    setResetBusy(true);
    setError(null);
    try {
      await api.forgotPassword(email.trim());
      haptic.success();
      setResetSentTo(email.trim());
    } catch (caught) {
      fail(messageFor(caught));
    } finally {
      setResetBusy(false);
    }
  };
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  // Once only: signing in here and the account noticing it both land here.
  const closed = useRef(false);
  const done = useCallback(() => {
    if (closed.current) return;
    closed.current = true;
    haptic.success();
    if (router.canGoBack()) router.back();
    else router.replace('/profile');
  }, [router]);

  // Signed in (here, or by a Google popup finishing): nothing more to do on this screen.
  useEffect(() => {
    if (account.state === 'signed_in' && !busy) done();
  }, [account.state, busy, done]);

  const fail = useCallback(
    (message: string) => {
      haptic.warn();
      setError(message);
      shake.value = withSequence(
        withTiming(-8, { duration: 50, reduceMotion: ReduceMotion.System }),
        withTiming(8, { duration: 70, reduceMotion: ReduceMotion.System }),
        withTiming(-5, { duration: 60, reduceMotion: ReduceMotion.System }),
        withTiming(3, { duration: 50, reduceMotion: ReduceMotion.System }),
        withTiming(0, { duration: 40, reduceMotion: ReduceMotion.System }),
      );
    },
    [shake],
  );

  const emailOk = EMAIL.test(email.trim());
  const passwordOk = password.length >= (mode === 'create' ? 8 : 1);
  const nameOk = mode === 'sign_in' || name.trim().length > 0;
  const bornOk = mode === 'sign_in' || birthMonth !== null;
  const agreedOk = mode === 'sign_in' || agreed;
  const ready = emailOk && passwordOk && nameOk && bornOk && agreedOk && !(mode === 'create' && locked);

  const refuseYoung = () => {
    void lockAccountCreation();
    setLocked(true);
    setPendingSocial(null);
    fail(TOO_YOUNG);
  };

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === 'create') await account.signUp(name.trim(), email.trim(), password, birthMonth ?? '');
      else await account.signIn(email.trim(), password);
      done();
    } catch (caught) {
      if (tooYoung(caught)) refuseYoung();
      else fail(messageFor(caught));
    } finally {
      setBusy(false);
    }
  };

  /** Finish a Google or Apple sign-in that was waiting on the age question. */
  const finishSocial = async () => {
    if (!pendingSocial || !birthMonth || !agreed || busy) return;
    setBusy(true);
    setError(null);
    try {
      await account.signInWith(pendingSocial.provider, pendingSocial.idToken, pendingSocial.nonce, pendingSocial.name, birthMonth);
      done();
    } catch (caught) {
      if (tooYoung(caught)) refuseYoung();
      else fail(messageFor(caught));
    } finally {
      setBusy(false);
    }
  };

  const withProvider: TokenHandler = async (provider, idToken, nonce, providedName) => {
    setBusy(true);
    setError(null);
    try {
      await account.signInWith(provider, idToken, nonce, providedName);
      done();
    } catch (caught) {
      if (caught instanceof ApiError && (caught.code === 'age_needed' || caught.code === 'terms_needed')) {
        // A new account: ask the age question and for the terms first, then finish with the same sign-in.
        if (locked) fail(TOO_YOUNG);
        else setPendingSocial({ provider, idToken, nonce, name: providedName ?? null });
      } else if (tooYoung(caught)) refuseYoung();
      else fail(messageFor(caught));
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setResetSentTo(null);
  };

  return (
    <PageScroll
      style={styles.page}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <Stack.Screen options={{ title: '' }} />
      <Animated.View style={styles.hero}>
        <View style={styles.badge}>
          <AppBadge size={64} />
        </View>
        <Txt variant="largeTitle" style={styles.center} accessibilityRole="header">
          {mode === 'create' ? 'Join GymGO' : 'Welcome back'}
        </Txt>
        <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
          {mode === 'create'
            ? 'Keep your saved gyms and workouts on every device, log your training, and review gyms you’ve tried.'
            : 'Sign in to pick up your saved gyms, workouts and training log.'}
        </Txt>
      </Animated.View>

      <Segmented
        options={[
          { value: 'sign_in', label: 'Sign in' },
          { value: 'create', label: 'Create account' },
        ]}
        value={mode}
        onChange={switchMode}
      />

      <SocialButtons onToken={withProvider} onError={fail} />
      <Animated.View layout={GLIDE}>
        <SocialDivider />
      </Animated.View>

      {pendingSocial ? (
        <Animated.View entering={FADE_IN} style={[styles.form, styles.pending, shakeStyle]}>
          <Txt variant="headline">One more thing before GymGO makes your account</Txt>
          <BornField value={born} onChange={setBorn} onSubmit={() => void finishSocial()} autoFocus />
          <TermsBox agreed={agreed} onChange={setAgreed} />
          <PrimaryButton label="Continue" busy={busy} disabled={!birthMonth || !agreed} onPress={() => void finishSocial()} />
          <PrimaryButton label="Cancel" tone="quiet" onPress={() => setPendingSocial(null)} />
        </Animated.View>
      ) : mode === 'create' && locked ? (
        <View style={[styles.form, styles.pending]}>
          <Txt variant="subhead" color={color.labelSecondary}>
            {TOO_YOUNG}
          </Txt>
        </View>
      ) : (
      <>
      <Animated.View layout={GLIDE} style={[styles.form, shakeStyle]}>
        {mode === 'create' && (
          <Animated.View entering={FADE_IN} exiting={FADE_OUT}>
            <AuthField
              icon="person"
              label="Your name"
              value={name}
              onChangeText={setName}
              placeholder="Your name, as reviewers see it"
              autoComplete="name"
              textContentType="name"
              maxLength={40}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />
          </Animated.View>
        )}
        <AuthField
          ref={emailRef}
          icon="mail"
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          inputMode="email"
          autoComplete="email"
          textContentType={mode === 'create' ? 'username' : 'emailAddress'}
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          problem={email.trim().length > 4 && !emailOk ? 'That email doesn’t look right yet.' : null}
        />
        <AuthField
          ref={passwordRef}
          icon="lock"
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder={mode === 'create' ? 'At least 8 characters' : 'Your password'}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
          textContentType={mode === 'create' ? 'newPassword' : 'password'}
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
          accessory={
            <Pressable
              onPress={() => {
                haptic.select();
                setShowPassword((shown) => !shown);
              }}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              hitSlop={10}
            >
              <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} color={color.labelSecondary} />
            </Pressable>
          }
        />
        {mode === 'create' && (
          <Animated.View entering={FADE_IN} style={styles.rule}>
            <Icon name={password.length >= 8 ? 'done' : 'todo'} size={15} color={password.length >= 8 ? color.good : color.labelTertiary} />
            <Txt variant="footnote" color={password.length >= 8 ? color.goodInk : color.labelSecondary}>
              8 characters or more
            </Txt>
          </Animated.View>
        )}
        {mode === 'create' && <BornField value={born} onChange={setBorn} onSubmit={() => void submit()} />}
        {mode === 'create' && <TermsBox agreed={agreed} onChange={setAgreed} />}
      </Animated.View>

      {error && (
        <Animated.View entering={FADE_IN} style={styles.error} accessibilityLiveRegion="assertive">
          <Icon name="info" size={16} color={color.dangerInk} />
          <Txt variant="footnote" color={color.dangerInk} style={styles.flex}>
            {error}
          </Txt>
        </Animated.View>
      )}

      <Animated.View layout={GLIDE}>
        <PrimaryButton label={mode === 'create' ? 'Create account' : 'Sign in'} busy={busy} disabled={!ready} onPress={() => void submit()} />
      </Animated.View>

      {mode === 'sign_in' &&
        (resetSentTo ? (
          <Animated.View entering={FADE_IN} style={styles.resetSent} accessibilityLiveRegion="polite">
            <Icon name="mail" size={16} color={color.brand} />
            <Txt variant="footnote" color={color.labelSecondary} style={styles.flex}>
              If there’s a GymGO account for {resetSentTo}, we’ve emailed it a link to choose a new password. It works for 30
              minutes. Check your junk folder if it doesn’t arrive.
            </Txt>
          </Animated.View>
        ) : (
          <Pressable onPress={() => void forgot()} accessibilityRole="button" hitSlop={8} style={styles.forgot} disabled={resetBusy}>
            <Txt variant="subhead" color={color.brand} style={face('medium')}>
              {resetBusy ? 'Sending…' : 'Forgot your password?'}
            </Txt>
          </Pressable>
        ))}
      </>
      )}

      <PrivacyNote />
    </PageScroll>
  );
}

/** The box ticked to agree to the terms and privacy policy, which a new account needs. */
function TermsBox({ agreed, onChange }: { agreed: boolean; onChange: (agreed: boolean) => void }) {
  return (
    <View style={styles.terms}>
      <Pressable
        onPress={() => {
          haptic.select();
          onChange(!agreed);
        }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: agreed }}
        accessibilityLabel="I agree to GymGO’s Terms of Service and Privacy Policy"
        hitSlop={10}
        style={[styles.box, agreed && styles.boxOn]}
      >
        {agreed ? <Icon name="check" size={15} color={color.onBrand} /> : null}
      </Pressable>
      <LegalText
        variant="footnote"
        tint={color.labelSecondary}
        style={styles.flex}
        text="I agree to GymGO’s [Terms of Service](terms) and [Privacy Policy](privacy)."
      />
    </View>
  );
}

/** "or use email", only when there's something above it to be an alternative to. */
function SocialDivider() {
  return useAnySocial() ? <OrDivider /> : null;
}

/** How sign-in details are kept; Apple and Google only where their buttons show. */
function PrivacyNote() {
  const social = useAnySocial() ? ' With Apple or Google, GymGO gets your name and email from them, never your password.' : '';
  return (
    <LegalText
      variant="caption"
      tint={color.labelSecondary}
      style={styles.small}
      text={`Passwords are kept only as a salted hash, never readable.${social} The [Privacy Policy](privacy) says what GymGO keeps and why.`}
    />
  );
}

/** The age question: the month and year you were born, typed on a number pad. */
function BornField({ value, onChange, onSubmit, autoFocus }: { value: string; onChange: (value: string) => void; onSubmit: () => void; autoFocus?: boolean }) {
  const complete = value.replace(/\D/g, '').length === 6;
  return (
    <View style={styles.bornWrap}>
      <AuthField
        icon="calendar"
        label="Month and year you were born"
        value={value}
        onChangeText={(typed) => onChange(formatBirthMonthInput(typed))}
        placeholder="MM / YYYY"
        keyboardType="number-pad"
        inputMode="numeric"
        autoComplete="off"
        maxLength={9}
        autoFocus={autoFocus}
        returnKeyType="go"
        onSubmitEditing={onSubmit}
        problem={complete && !parseBirthMonth(value) ? 'That isn’t a month and year yet.' : null}
      />
      <Txt variant="caption" color={color.labelSecondary}>
        The month and year you were born: asked before any account is made, to check GymGO suits your age. It isn’t kept.
      </Txt>
    </View>
  );
}

function AuthField({
  ref,
  icon,
  label,
  accessory,
  problem = null,
  ...props
}: TextInputProps & { ref?: Ref<TextInput>; icon: IconName; label: string; accessory?: ReactNode; problem?: string | null }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <View style={[styles.fieldBox, focused && styles.fieldFocused, problem && styles.fieldProblem]}>
        <Icon name={icon} size={17} color={focused ? color.brand : color.labelTertiary} />
        <TextInput
          ref={ref}
          placeholderTextColor={color.labelTertiary}
          accessibilityLabel={label}
          {...props}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          style={styles.fieldInput}
        />
        {accessory}
      </View>
      {problem && (
        <Txt variant="footnote" color={color.maybeInk} style={styles.fieldHint}>
          {problem}
        </Txt>
      )}
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: color.groupedBackground },
    content: { padding: space[4], paddingBottom: space[8], gap: space[4], width: '100%', maxWidth: 460, alignSelf: 'center' },
    hero: { alignItems: 'center', gap: space[2], marginTop: space[2], marginBottom: space[1] },
    badge: { borderRadius: 14.4, marginBottom: space[2], ...dropShadow(0.18, 12, 6, 6) },
    center: { textAlign: 'center' },
    flex: { flex: 1 },
    form: { gap: space[3] },
    field: { gap: 4 },
    fieldBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      height: 52,
      paddingHorizontal: space[4],
      borderRadius: radius.md,
      borderCurve: 'continuous',
      backgroundColor: color.card,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    fieldFocused: { borderColor: color.brand },
    fieldProblem: { borderColor: color.maybe },
    // The box's border shows focus, in the accent, instead of the browser's own ring.
    // minWidth 0: a browser text field won't otherwise shrink below its own width, and ran past a narrow phone's edge.
    fieldInput: { flex: 1, minWidth: 0, height: '100%', fontSize: 17, color: color.label, ...NO_WEB_OUTLINE, ...face('regular') },
    fieldHint: { marginLeft: space[4] },
    pending: { gap: space[3] },
    bornWrap: { gap: space[1] },
    rule: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginLeft: space[1] },
    error: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2], padding: space[3], borderRadius: radius.md, backgroundColor: color.dangerTint },
    small: { textAlign: 'center', marginTop: space[2] },
    terms: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginLeft: space[1], marginTop: space[1] },
    forgot: { alignSelf: 'center', paddingVertical: space[1] },
    resetSent: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2], padding: space[3], borderRadius: radius.md, backgroundColor: color.brandWash },
    box: {
      width: 24,
      height: 24,
      borderRadius: 7,
      borderCurve: 'continuous',
      borderWidth: 1.5,
      borderColor: color.labelTertiary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    boxOn: { backgroundColor: color.brand, borderColor: color.brand },
  }),
);
