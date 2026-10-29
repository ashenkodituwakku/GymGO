/**
 * An address GymGO doesn't have: an old or mistyped link. Says so plainly and
 * offers the way home, instead of the router's developer page.
 */

import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { HeroMark } from '@/components/HeroMark';
import { useGlassRedraw } from '@/components/Redrawn';
import { PrimaryButton, Txt } from '@/components/ui';
import { ScreenOptions } from '@/components/ScreenOptions';
import { usePageTitle } from '@/lib/pageTitle';
import { color, space, themed } from '@/lib/theme';

export default function NotFound() {
  useGlassRedraw();
  usePageTitle('Not found');
  const router = useRouter();
  return (
    <View style={styles.page}>
      <ScreenOptions options={{ headerShown: true, title: '' }} />
      <HeroMark icon="search" />
      <Txt variant="title2" style={styles.center} accessibilityRole="header" level={1}>
        This page isn’t in GymGO
      </Txt>
      <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
        The link may be old or mistyped. Every gym is a search away from Home.
      </Txt>
      <View style={styles.button}>
        <PrimaryButton label="Go to Home" icon="home" onPress={() => router.replace('/')} />
      </View>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    page: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3], padding: space[6], backgroundColor: color.groupedBackground },
    center: { textAlign: 'center' },
    // Centred like the words above it: stretched, a capped width sat at the left edge of a wide window.
    button: { alignSelf: 'center', maxWidth: 360, width: '100%', marginTop: space[2] },
  }),
);
