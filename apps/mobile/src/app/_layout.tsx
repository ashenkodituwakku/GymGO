import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BUNDLED_FACES, NEEDS_BUNDLED_FACES } from '@/lib/theme';

// Hold the splash screen until the typeface is ready, so nothing draws in the
// wrong font first. iPhone has Helvetica built in and loads nothing.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

const FACES = NEEDS_BUNDLED_FACES ? BUNDLED_FACES : {};

/**
 * The app is one screen, like Maps: the map, and sheets over it. Light
 * appearance is fixed in app.json; the status bar is dark to match.
 */
export default function RootLayout() {
  const [loaded, error] = useFonts(FACES);
  // If the faces fail to load, carry on in the system font rather than
  // leaving someone on a splash screen.
  const ready = loaded || error !== null;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }} />
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
