/**
 * Sign in, or make an account: with Apple or Google where they're set up,
 * or with an email and password. Opened from Profile, and from anything
 * that needs an account.
 */

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { FADE_IN, FADE_OUT, GLIDE, rise } from '@/components/motion';
import { Icon, type IconName } from '@/components/Icon';
import { OrDivider, SocialButtons, useAnySocial, type TokenHandler } from '@/components/SocialSignIn';
import { PrimaryButton, Segmented, Txt } from '@/components/ui';
import { ApiError, OfflineError } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { NO_WEB_OUTLINE, color, face, radius, space, themed } from '@/lib/theme';

type Mode = 'sign_in' | 'create';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function messageFor(error: unknown): string {
  if (error instanceof OfflineError) return 'Can’t reach the GymGO server. Start it on your computer with the gymgo command, then try again.';
  if (error instanceof ApiError) return error.message;
  return 'Something went wrong. Try again.';
}

export default function SignInScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const { account } = useApp();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(params.mode === 'create' ? 'create' : 'sign_in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
  const ready = emailOk && passwordOk && nameOk;

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === 'create') await account.signUp(name.trim(), email.trim(), password);
      else await account.signIn(email.trim(), password);
      done();
    } catch (caught) {
      fail(messageFor(caught));
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
      fail(messageFor(caught));
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      contentInsetAdjustmentBehavior="automatic"
    >
      <Stack.Screen options={{ title: '' }} />
      <Animated.View entering={rise(0)} style={styles.hero}>
        <View style={styles.badge}>
          <Icon name="workout" size={30} color={color.onBrand} />
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

      <Txt variant="caption" color={color.labelSecondary} style={styles.small}>
        Your account lives on the GymGO server on your own computer. Passwords are stored only as a salted hash. With Apple
        or Google, GymGO gets your name and email from them, never your password. GymGO sends no emails.
      </Txt>
    </ScrollView>
  );
}

/** "or use email", only when there's something above it to be an alternative to. */
function SocialDivider() {
  return useAnySocial() ? <OrDivider /> : null;
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
    content: { padding: space[5], paddingBottom: space[8], gap: space[4], width: '100%', maxWidth: 460, alignSelf: 'center' },
    hero: { alignItems: 'center', gap: space[2], marginTop: space[2], marginBottom: space[1] },
    badge: {
      width: 64,
      height: 64,
      borderRadius: 18,
      borderCurve: 'continuous',
      backgroundColor: color.brandFill,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space[2],
    },
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
    fieldInput: { flex: 1, height: '100%', fontSize: 17, color: color.label, ...NO_WEB_OUTLINE, ...face('regular') },
    fieldHint: { marginLeft: space[4] },
    rule: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginLeft: space[1] },
    error: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2], padding: space[3], borderRadius: radius.md, backgroundColor: color.dangerTint },
    small: { textAlign: 'center', marginTop: space[2] },
  }),
);
