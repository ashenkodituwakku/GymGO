/**
 * An address GymGO doesn't have: an old or mistyped link. Says so plainly and
 * offers the way home, instead of the router's developer page.
 */

import { Stack, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { PrimaryButton, Txt } from '@/components/ui';
import { usePageTitle } from '@/lib/pageTitle';
import { color, space, themed } from '@/lib/theme';

export default function NotFound() {
  usePageTitle('Not found');
  const router = useRouter();
  return (
    <View style={styles.page}>
      <Stack.Screen options={{ headerShown: true, title: '' }} />
      <Icon name="search" size={40} color={color.brand} />
      <Txt variant="title2" style={styles.center}>
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
    button: { alignSelf: 'stretch', maxWidth: 360, width: '100%', marginTop: space[2] },
  }),
);
