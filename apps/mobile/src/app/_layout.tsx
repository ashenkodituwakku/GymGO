import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useNavigationContainerRef } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Appearance, Platform, StyleSheet } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from '@/lib/app-state';
import {
  NO_TOUCH,
  BUNDLED_FACES,
  FREE_ACCENT,
  NEEDS_BUNDLED_FACES,
  applyTheme,
  color,
  currentTheme,
  face,
  subscribeTheme,
  themeVersion,
  themed,
  type AccentId,
  type Scheme,
} from '@/lib/theme';
import { loadThemeChoice, schemeFor, useSystemScheme, useThemeChoice } from '@/lib/themePrefs';

// Hold the splash screen until the typeface is ready, so nothing draws in the
// wrong font first. iPhone draws in SF Pro, built in, and loads nothing.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

// Browser: real weights only (never a bold faked from a regular cut), and
// text smoothed the way macOS draws SF Pro in Apple's own pages.
// Keyboard focus is a ring in the accent colour with a band of the page's
// own colour inside it, laid over the control's edge. The browser's own ring
// is near-black (lost in dark mode) and drawn outside, where rounded cards
// and glass buttons cut it to fragments; drawn over the top, a gym card's
// photo can't hide it, and the inner band keeps it visible on a button
// filled with the accent. Text fields draw their own focus, so they're left
// alone.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const css = document.createElement('style');
  css.textContent =
    '*{font-synthesis:none}body{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility}' +
    ':not(input):not(textarea):focus-visible{outline:none}' +
    ':not(input):not(textarea):focus-visible::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:10;' +
    'box-shadow:inset 0 0 0 2px var(--gg-focus),inset 0 0 0 4px var(--gg-focus-inner)}';
  document.head.appendChild(css);
}

const FACES = NEEDS_BUNDLED_FACES ? BUNDLED_FACES : {};

/**
 * Four tabs (Home, Explore, Saved, Profile), with a gym's own page pushed on
 * top of them and Compare as a sheet. Light or dark follows your choice in
 * Settings → Appearance (the phone's, to start).
 */
// A page opened straight from a link (a shared gym, say) sits on top of the
// tabs, so it has a way back rather than being the whole app.
export const unstable_settings = { initialRouteName: '(tabs)' };

// If drawing any screen throws, this shows instead of a blank or developer page.
export { CrashScreen as ErrorBoundary } from '@/components/CrashScreen';

export default function RootLayout() {
  const [loaded, error] = useFonts(FACES);
  const [themeReady, setThemeReady] = useState(Platform.OS === 'web');
  // If the faces fail to load, carry on in the system font rather than
  // leaving someone on a splash screen.
  const ready = (loaded || error !== null) && themeReady;

  useEffect(() => {
    if (!themeReady) void loadThemeChoice().then(() => setThemeReady(true));
  }, [themeReady]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AppProvider>
          <ThemedStack />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** The colours your choice comes to now: Pro accents only while you have Pro. */
function useWantedTheme(): { scheme: Scheme; accent: AccentId } {
  const choice = useThemeChoice();
  const { billing } = useApp();
  const phone = useSystemScheme(choice.appearance === 'system');
  // Tell the phone, so its own parts (keyboards, menus, Liquid Glass) match.
  useEffect(() => {
    if (Platform.OS !== 'web') Appearance.setColorScheme(choice.appearance === 'system' ? 'unspecified' : choice.appearance);
  }, [choice.appearance]);
  // A lapsed Pro goes back to Indigo, but only once the server has said so.
  const accent = choice.accent === FREE_ACCENT || billing.isPro || !billing.planKnown ? choice.accent : FREE_ACCENT;
  return { scheme: schemeFor(choice.appearance, phone), accent };
}

/**
 * The navigator, drawn in the current colours. When they change, a veil in
 * the new background fades in, the screens are drawn again underneath it
 * (in the same places: the navigation state is put back), and it fades
 * out: about a third of a second, and instant with Reduce Motion.
 */
function ThemedStack() {
  const wanted = useWantedTheme();
  const version = useSyncExternalStore(subscribeTheme, themeVersion, themeVersion);
  const navigation = useNavigationContainerRef();
  const reduceMotion = useReducedMotion();
  const veil = useSharedValue(0);
  const [veilColour, setVeilColour] = useState<string | null>(null);
  const savedState = useRef<ReturnType<typeof navigation.getRootState> | null>(null);

  const switchNow = useCallback(
    (scheme: Scheme, accent: AccentId) => {
      savedState.current = navigation.isReady() ? navigation.getRootState() : null;
      applyTheme(scheme, accent);
    },
    [navigation],
  );

  useEffect(() => {
    const { scheme, accent } = currentTheme();
    if (scheme === wanted.scheme && accent === wanted.accent) return;
    if (reduceMotion) {
      switchNow(wanted.scheme, wanted.accent);
      return;
    }
    setVeilColour(paletteBackground(wanted.scheme));
    veil.value = withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) }, (finished) => {
      if (finished) runOnJS(switchNow)(wanted.scheme, wanted.accent);
    });
  }, [wanted.scheme, wanted.accent, reduceMotion, switchNow, veil]);

  // Drawn again: put the screens back where they were, then lift the veil.
  useEffect(() => {
    if (version === 0) return;
    const state = savedState.current;
    savedState.current = null;
    if (state) {
      requestAnimationFrame(() => {
        try {
          navigation.resetRoot(state);
        } catch {
          // A route that can't be restored leaves you on Home.
        }
      });
    }
    veil.value = withDelay(60, withTiming(0, { duration: 240, easing: Easing.out(Easing.cubic) }, (finished) => {
      if (finished) runOnJS(setVeilColour)(null);
    }));
    if (Platform.OS === 'web' && typeof document !== 'undefined') paintPage();
  }, [version, navigation, veil]);

  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));
  const dark = currentTheme().scheme === 'dark';
  const navTheme = {
    ...(dark ? DarkTheme : DefaultTheme),
    colors: {
      ...(dark ? DarkTheme : DefaultTheme).colors,
      primary: color.brand,
      background: color.groupedBackground,
      card: color.background,
      text: color.label,
      border: color.separator,
      notification: color.danger,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        key={version}
        screenOptions={{
          headerShown: false,
          headerTintColor: color.brand,
          headerTitleStyle: { ...face('semibold'), color: color.label },
          headerStyle: { backgroundColor: color.background },
          contentStyle: { backgroundColor: color.groupedBackground },
          headerBackTitle: 'Back',
          // iPhone: swipe back from anywhere on the screen, not just the edge.
          fullScreenGestureEnabled: true,
          // Android: the same slide-over as iPhone, rather than a fade-up.
          animation: Platform.OS === 'android' ? 'ios_from_right' : 'default',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="gym/[id]"
          options={{
            headerShown: true,
            title: '',
            // iOS: the header is frosted glass over the photo, as in Maps.
            headerTransparent: Platform.OS === 'ios',
            headerBlurEffect: dark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight',
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen name="compare" options={{ ...MODAL, headerShown: true, title: 'Compare' }} />
        <Stack.Screen name="workout/[id]" options={{ headerShown: true, title: 'Workout' }} />
        <Stack.Screen name="workouts/index" options={{ headerShown: true, title: 'My workouts' }} />
        <Stack.Screen name="workouts/[id]" options={{ headerShown: true, title: 'Workout' }} />
        <Stack.Screen name="train" options={{ headerShown: true, title: 'Workout', gestureEnabled: false }} />
        <Stack.Screen name="plates" options={{ ...MODAL, headerShown: true, title: 'Plates' }} />
        <Stack.Screen name="progress/index" options={{ headerShown: true, title: 'Progress' }} />
        <Stack.Screen name="progress/[exercise]" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="pro" options={{ ...MODAL, headerShown: true, title: 'GymGO Pro' }} />
        <Stack.Screen name="country" options={{ ...MODAL, headerShown: true, title: 'Country' }} />
        <Stack.Screen name="appearance" options={{ headerShown: true, title: 'Appearance' }} />
        <Stack.Screen name="sign-in" options={{ ...MODAL, headerShown: true, title: '' }} />
        <Stack.Screen name="account" options={{ headerShown: true, title: 'Account' }} />
        <Stack.Screen name="report-bug" options={{ ...MODAL, headerShown: true, title: 'Report a bug' }} />
      </Stack>
      {veilColour && <Animated.View style={[NO_TOUCH, StyleSheet.absoluteFill, { backgroundColor: veilColour }, veilStyle]} />}
    </ThemeProvider>
  );
}

/** A sheet from below, on every platform. */
const MODAL = { presentation: 'modal', animation: Platform.OS === 'android' ? 'slide_from_bottom' : 'default' } as const;

/** The page behind the app in a browser, so overscroll and the address bar match. */
function paintPage() {
  document.documentElement.dataset.ggScheme = currentTheme().scheme;
  document.documentElement.style.colorScheme = currentTheme().scheme;
  document.documentElement.style.setProperty('--gg-focus', color.brand);
  document.documentElement.style.setProperty('--gg-focus-inner', color.card);
  document.body.style.backgroundColor = color.groupedBackground;
}
if (Platform.OS === 'web' && typeof document !== 'undefined') paintPage();

const paletteBackground = (scheme: Scheme) => (scheme === 'dark' ? '#000000' : '#F2F2F7');

const styles = themed(() => StyleSheet.create({
  root: { flex: 1, backgroundColor: color.groupedBackground },
}));
