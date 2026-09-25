/**
 * Continue with Apple and Continue with Google.
 *
 * Each button hands back an ID token from Apple or Google, and a one-time
 * nonce the token must carry; the GymGO server checks both (see
 * apps/server/src/identity.ts). A button shows only where it can work:
 *  - Apple: on an iPhone, when the server is set up for it and the app was
 *    built with the Sign in with Apple capability (a paid developer account);
 *  - Google: when the server has a Google client id for this platform.
 * Neither is shown otherwise, rather than a button that can only fail.
 *
 * Apple's button is Apple's own. Google's follows Google's sign-in button
 * guidelines: the standard "G" mark on white (or dark grey in dark mode).
 */

import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { api, type SignInProvider, type SignInProviders } from '@/lib/api';
import { haptic } from '@/lib/haptics';
import { color, currentTheme, face, radius, space, themed } from '@/lib/theme';
import { Pressy } from './motion';
import { Txt } from './ui';

// In a browser, Google's sign-in comes back into a popup, which hands the result here.
WebBrowser.maybeCompleteAuthSession();

let providersAsked: Promise<SignInProviders | null> | null = null;

/** Which of Google and Apple the server offers; null until known, or if it can't be reached. */
export function useSignInProviders(): SignInProviders | null {
  const [providers, setProviders] = useState<SignInProviders | null>(null);
  useEffect(() => {
    providersAsked ??= api.providers().catch(() => {
      providersAsked = null;
      return null;
    });
    let live = true;
    void providersAsked.then((value) => live && setProviders(value));
    return () => {
      live = false;
    };
  }, []);
  return providers;
}

export type TokenHandler = (provider: SignInProvider, idToken: string, nonce: string | null, name?: string | null) => Promise<void>;

/** The client id Google gives this platform, if the server has one. */
function googleIdHere(providers: SignInProviders | null): string | null {
  const google = providers?.google;
  if (!google) return null;
  return Platform.OS === 'ios' ? google.ios : Platform.OS === 'android' ? google.android : google.web;
}

/** Apple's capability is in the build only when it was made with GYMGO_APPLE_SIGN_IN=on. */
const BUILT_WITH_APPLE = Constants.expoConfig?.ios?.usesAppleSignIn === true;

export function useAppleAvailable(providers: SignInProviders | null): boolean {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios' || !BUILT_WITH_APPLE || !providers?.apple) return;
    AppleAuthentication.isAvailableAsync()
      .then(setAvailable)
      .catch(() => setAvailable(false));
  }, [providers?.apple]);
  return available;
}

/** Both buttons, stacked, for whichever are available. Renders nothing when neither is. */
export function SocialButtons({
  onToken,
  intent = 'continue',
  hide = [],
  onError,
}: {
  onToken: TokenHandler;
  intent?: 'continue' | 'connect';
  /** Providers already connected, when connecting. */
  hide?: SignInProvider[];
  onError: (message: string) => void;
}) {
  const providers = useSignInProviders();
  const apple = useAppleAvailable(providers) && !hide.includes('apple');
  const googleId = hide.includes('google') ? null : googleIdHere(providers);
  if (!apple && !googleId) return null;
  return (
    <View style={styles.stack}>
      {apple && <AppleButton onToken={onToken} intent={intent} onError={onError} />}
      {googleId && providers?.google && <GoogleButton ids={providers.google} onToken={onToken} intent={intent} onError={onError} />}
    </View>
  );
}

/** True when at least one of the buttons will show. */
export function useAnySocial(): boolean {
  const providers = useSignInProviders();
  const apple = useAppleAvailable(providers);
  return apple || googleIdHere(providers) !== null;
}

function AppleButton({ onToken, intent, onError }: { onToken: TokenHandler; intent: 'continue' | 'connect'; onError: (message: string) => void }) {
  const dark = currentTheme().scheme === 'dark';
  const press = async () => {
    haptic.tap();
    // The token carries this nonce's SHA-256; the server gets the nonce and checks.
    const nonce = `${Crypto.randomUUID()}${Crypto.randomUUID()}`;
    try {
      const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
        nonce: hashed,
      });
      if (!credential.identityToken) throw new Error('no token');
      // Apple shares the name only the first time; the server keeps it then.
      const name = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ') || null;
      await onToken('apple', credential.identityToken, nonce, name);
    } catch (error) {
      if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') return;
      onError('Sign in with Apple didn’t finish. Try again.');
    }
  };
  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={intent === 'connect' ? AppleAuthentication.AppleAuthenticationButtonType.CONTINUE : AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
      buttonStyle={dark ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={radius.md}
      style={styles.apple}
      onPress={() => void press()}
    />
  );
}

function GoogleButton({
  ids,
  onToken,
  intent,
  onError,
}: {
  ids: NonNullable<SignInProviders['google']>;
  onToken: TokenHandler;
  intent: 'continue' | 'connect';
  onError: (message: string) => void;
}) {
  const [request, response, prompt] = Google.useIdTokenAuthRequest({
    webClientId: ids.web ?? undefined,
    iosClientId: ids.ios ?? undefined,
    androidClientId: ids.android ?? undefined,
    selectAccount: true,
  });
  const [busy, setBusy] = useState(false);
  const handled = useRef<unknown>(null);

  useEffect(() => {
    if (!response || handled.current === response) return;
    handled.current = response;
    if (response.type !== 'success') {
      setBusy(false);
      if (response.type === 'error') onError('Sign in with Google didn’t finish. Try again.');
      return;
    }
    const idToken = response.params.id_token || response.authentication?.idToken;
    if (!idToken) {
      setBusy(false);
      onError('Google didn’t send a sign-in token. Try again.');
      return;
    }
    // The browser flow asks Google for a nonce; the phone flow proves itself with PKCE instead.
    void onToken('google', idToken, request?.nonce ?? null).finally(() => setBusy(false));
  }, [response, request, onToken, onError]);

  const dark = currentTheme().scheme === 'dark';
  return (
    <Pressy
      scaleTo={0.97}
      disabled={!request || busy}
      onPress={() => {
        haptic.tap();
        setBusy(true);
        void prompt().catch(() => setBusy(false));
      }}
      accessibilityRole="button"
      accessibilityLabel={intent === 'connect' ? 'Connect Google' : 'Continue with Google'}
      style={[styles.google, dark ? styles.googleDark : styles.googleLight]}
    >
      {busy ? (
        <ActivityIndicator color={dark ? '#E3E3E3' : '#1F1F1F'} />
      ) : (
        <>
          <GoogleMark />
          <Txt variant="headline" color={dark ? '#E3E3E3' : '#1F1F1F'} style={face('medium')}>
            {intent === 'connect' ? 'Connect Google' : 'Continue with Google'}
          </Txt>
        </>
      )}
    </Pressy>
  );
}

/** Google's "G", as its sign-in button guidelines publish it. */
function GoogleMark() {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

/** "or" between the buttons and the email form. */
export function OrDivider({ label = 'or use email' }: { label?: string }) {
  return (
    <View style={styles.divider} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.line} />
      <Txt variant="footnote" color={color.labelSecondary}>
        {label}
      </Txt>
      <View style={styles.line} />
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    stack: { gap: space[2] },
    apple: { height: 50, width: '100%' },
    google: {
      height: 50,
      borderRadius: radius.md,
      borderCurve: 'continuous',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space[3],
      borderWidth: 1,
    },
    googleLight: { backgroundColor: '#FFFFFF', borderColor: '#747775' },
    googleDark: { backgroundColor: '#131314', borderColor: '#8E918F' },
    divider: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginVertical: space[1] },
    line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: color.separator },
  }),
);
