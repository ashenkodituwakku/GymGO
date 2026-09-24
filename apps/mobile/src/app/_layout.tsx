import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from '@/lib/app-state';
import { BUNDLED_FACES, NEEDS_BUNDLED_FACES, color, face } from '@/lib/theme';

// Hold the splash screen until the typeface is ready, so nothing draws in the
// wrong font first. iPhone has Helvetica built in and loads nothing.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

const FACES = NEEDS_BUNDLED_FACES ? BUNDLED_FACES : {};

/**
 * Four tabs (Home, Explore, Saved, Profile), with a gym's own page pushed on
 * top of them and Compare as a sheet. Light appearance is fixed in app.json;
 * the status bar is dark to match.
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
        <AppProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              headerTintColor: color.brand,
              headerTitleStyle: { ...face('bold'), color: color.label },
              headerBackTitle: 'Back',
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
                headerBlurEffect: 'systemChromeMaterialLight',
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen name="compare" options={{ headerShown: true, title: 'Compare', presentation: 'modal' }} />
          </Stack>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
