import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, router, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { EASE_IN_OUT, EASE_OUT } from '@/components/motion';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Redrawn, useThemeVersion } from '@/components/Redrawn';
import { setGlassLevel } from '@/components/liquidGlass';
import { AppProvider, useApp } from '@/lib/app-state';
import {
  BUNDLED_FACES,
  FREE_ACCENT,
  FREE_LOOK,
  NEEDS_BUNDLED_FACES,
  applyTheme,
  paletteFor,
  color,
  currentTheme,
  face,
  themed,
  type AccentId,
  type LookId,
  type Scheme,
} from '@/lib/theme';
import { loadLookFonts } from '@/lib/lookFonts';
import { loadThemeChoice, schemeFor, useSystemScheme, useThemeChoice } from '@/lib/themePrefs';
import { rememberOpeningLink, takeWanted } from '@/lib/afterSignIn';

// A link opened while signed out goes there once you've signed in (lib/afterSignIn.ts).
void rememberOpeningLink();

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
  // The app's own background (behind sheets, and where a page bounces) follows the theme too.
  useThemeVersion();
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

/** The colours and look your choice comes to now: Pro accents and looks only while you have Pro. */
function useWantedTheme(): { scheme: Scheme; accent: AccentId; look: LookId; glass: number } {
  const choice = useThemeChoice();
  const { billing } = useApp();
  // The phone's own parts (keyboards, menus, Liquid Glass) are told as soon
  // as you choose (lib/themePrefs.ts), so this reads the phone's real scheme.
  const phone = useSystemScheme(choice.appearance === 'system');
  // A lapsed Pro goes back to Indigo, but only once the server has said so.
  const accent = choice.accent === FREE_ACCENT || billing.isPro || !billing.planKnown ? choice.accent : FREE_ACCENT;
  const look = choice.look === FREE_LOOK || billing.isPro || !billing.planKnown ? choice.look : FREE_LOOK;
  return { scheme: schemeFor(choice.appearance, phone, look), accent, look, glass: choice.glass };
}

/**
 * The navigator, drawn in the current colours. When they change, a veil in
 * the new background fades in, each screen's content is drawn again
 * underneath it (see Redrawn: the navigator and where you are in it stay
 * put), and it fades out: about a third of a second, and instant with
 * Reduce Motion.
 */
function ThemedStack() {
  useEscapeClosesSheets();
  // GymGO needs an account: without one, only signing in and the legal pages are open.
  const { account } = useApp();
  const gate = account.gate;
  const signedIn = gate === 'in';
  // Opened already signed in: the link opens as it is, with nothing to come back to later.
  const decided = useRef(false);
  useEffect(() => {
    if (gate === 'wait' || decided.current) return;
    decided.current = true;
    if (gate === 'in') takeWanted();
  }, [gate]);
  const wanted = useWantedTheme();
  const version = useThemeVersion();
  const reduceMotion = useReducedMotion();
  const veil = useSharedValue(0);
  const [veilColour, setVeilColour] = useState<string | null>(null);

  const switchNow = useCallback((scheme: Scheme, accent: AccentId, look: LookId, glass: number) => {
    applyTheme(scheme, accent, look, glass);
  }, []);

  useEffect(() => {
    const { scheme, accent, look, glass } = currentTheme();
    if (scheme === wanted.scheme && accent === wanted.accent && look === wanted.look && glass === wanted.glass) return;
    // Only Liquid Glass changed: no veil and no redraw; the glass draws itself again.
    if (scheme === wanted.scheme && accent === wanted.accent && look === wanted.look) {
      switchNow(scheme, accent, look, wanted.glass);
      setGlassLevel(wanted.glass);
      return;
    }
    let cancelled = false;
    // A look's own typefaces arrive first, so no text is drawn in a face that isn't loaded.
    void loadLookFonts(wanted.look).then(() => {
      if (cancelled) return;
      if (reduceMotion) {
        switchNow(wanted.scheme, wanted.accent, wanted.look, wanted.glass);
        return;
      }
      setVeilColour(paletteFor(wanted.scheme, wanted.accent, wanted.look).groupedBackground);
      veil.value = withTiming(1, { duration: 150, easing: EASE_IN_OUT }, (finished) => {
        if (finished) runOnJS(switchNow)(wanted.scheme, wanted.accent, wanted.look, wanted.glass);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [wanted.scheme, wanted.accent, wanted.look, wanted.glass, reduceMotion, switchNow, veil]);

  // Drawn again: lift the veil.
  useEffect(() => {
    if (version === 0) return;
    veil.value = withDelay(60, withTiming(0, { duration: 300, easing: EASE_OUT }, (finished) => {
      if (finished) runOnJS(setVeilColour)(null);
    }));
    if (Platform.OS === 'web' && typeof document !== 'undefined') paintPage();
  }, [version, veil]);

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

  // The moment it takes to read this device's sign-in: the page's colour, rather than a flash of the sign-in screen.
  if (gate === 'wait') return <View style={styles.root} />;

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        // Each screen's content is drawn again in the new colours; the tabs
        // redraw their own screens (app/(tabs)/_layout.tsx), so the tab
        // you're on stays chosen.
        screenLayout={({ route, children }) => (route.name === '(tabs)' ? children : <Redrawn>{children}</Redrawn>)}
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
        <Stack.Protected guard={signedIn}>
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
          <Stack.Screen name="timer" options={{ headerShown: true, title: 'Interval timer' }} />
          <Stack.Screen name="strength" options={{ headerShown: true, title: '1-rep max' }} />
          <Stack.Screen name="progress/index" options={{ headerShown: true, title: 'Progress' }} />
          <Stack.Screen name="collection" options={{ headerShown: true, title: 'Collection' }} />
          <Stack.Screen name="machines" options={{ headerShown: true, title: 'Find a machine' }} />
          <Stack.Screen name="trips/index" options={{ headerShown: true, title: 'Trips' }} />
          <Stack.Screen name="trips/[id]" options={{ headerShown: true, title: 'Trip' }} />
          <Stack.Screen name="card/[id]" options={{ ...MODAL, headerShown: true, title: 'Card' }} />
          <Stack.Screen name="friends/index" options={{ headerShown: true, title: 'Friends' }} />
          <Stack.Screen name="friends/[id]" options={{ headerShown: true, title: 'Friend' }} />
          <Stack.Screen name="leaderboard" options={{ headerShown: true, title: 'Leaderboard' }} />
          <Stack.Screen name="templates" options={{ headerShown: true, title: 'Templates' }} />
          <Stack.Screen name="moderation" options={{ headerShown: true, title: 'Moderation' }} />
          <Stack.Screen name="progress/[exercise]" options={{ headerShown: true, title: '' }} />
          <Stack.Screen name="pro" options={{ ...MODAL, headerShown: true, title: 'GymGO Pro' }} />
          <Stack.Screen name="country" options={{ ...MODAL, headerShown: true, title: 'Country' }} />
          <Stack.Screen name="appearance" options={{ headerShown: true, title: 'Appearance' }} />
          <Stack.Screen name="account" options={{ headerShown: true, title: 'Account' }} />
        </Stack.Protected>
        {/* Open without an account: signing in (signed out, it's the whole app rather than a sheet over it),
            the legal pages, and Report a bug, so someone who can't get in can still say so. */}
        <Stack.Screen name="sign-in" options={signedIn ? { ...MODAL, headerShown: true, title: '' } : { headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="legal/[doc]" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="report-bug" options={{ ...MODAL, headerShown: true, title: 'Report a bug' }} />
      </Stack>
      {veilColour && <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: veilColour }, veilStyle, { pointerEvents: 'none' }]} />}
    </ThemeProvider>
  );
}

/** A sheet from below, on every platform. */
const MODAL = { presentation: 'modal', animation: Platform.OS === 'android' ? 'slide_from_bottom' : 'default' } as const;

/** The screens above that open as a sheet. */
const SHEET_PATHS = new Set(['/compare', '/plates', '/pro', '/country', '/sign-in', '/report-bug']);

/**
 * In a browser, Escape closes a screen that opened as a sheet, as it would a
 * dialog. In a text field with something typed in it, the first press only
 * leaves the field, so a stray one can't throw away a half-written report.
 */
function useEscapeClosesSheets() {
  const pathname = usePathname();
  useEffect(() => {
    if (Platform.OS !== 'web' || !SHEET_PATHS.has(pathname)) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      const field = document.activeElement;
      const typed =
        field instanceof HTMLTextAreaElement || (field instanceof HTMLInputElement && field.type !== 'checkbox' && field.type !== 'radio');
      if (typed && field.value) {
        field.blur();
        return;
      }
      event.preventDefault();
      if (router.canGoBack()) router.back();
      else router.replace('/');
    };
    // On the way down, before a text field sees it: they stop key presses
    // from travelling any further.
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [pathname]);
}

/** The page behind the app in a browser, so overscroll and the address bar match. */
function paintPage() {
  document.documentElement.dataset.ggScheme = currentTheme().scheme;
  document.documentElement.style.colorScheme = currentTheme().scheme;
  document.documentElement.style.setProperty('--gg-focus', color.brand);
  document.documentElement.style.setProperty('--gg-focus-inner', color.card);
  document.body.style.backgroundColor = color.groupedBackground;
  setGlassLevel(currentTheme().glass);
}
if (Platform.OS === 'web' && typeof document !== 'undefined') paintPage();


const styles = themed(() => StyleSheet.create({
  root: { flex: 1, backgroundColor: color.groupedBackground },
}));
