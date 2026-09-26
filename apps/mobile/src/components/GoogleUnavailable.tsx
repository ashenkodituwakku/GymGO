/**
 * What a Google embed shows instead of a broken or blank frame when Google
 * can't be reached (see lib/googleReach.ts): says so, and offers another try.
 */

import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { color, radius, space, themed } from '@/lib/theme';
import type { GoogleReach } from '@/lib/googleReach';
import { Icon } from './Icon';
import { Chip, Txt } from './ui';

export function GoogleUnavailable({ what, height, reach, onRetry }: { what: string; height: number; reach: Exclude<GoogleReach, 'ok'>; onRetry: () => void }) {
  return (
    <View style={[styles.box, { height }]} aria-live="polite">
      {reach === 'checking' ? (
        <ActivityIndicator size="small" color={color.labelSecondary} accessibilityLabel={`Loading ${what}`} />
      ) : (
        <>
          <Icon name="map" size={22} color={color.labelTertiary} />
          <Txt variant="subhead" color={color.labelSecondary} style={styles.center}>
            {what} isn’t available right now: Google didn’t load. Check you’re online, then try again.
          </Txt>
          <Chip icon="refresh" label="Try again" selected={false} onPress={onRetry} />
        </>
      )}
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[3],
    padding: space[4],
    borderRadius: radius.lg + 4,
    borderCurve: 'continuous',
    backgroundColor: color.fill,
  },
  center: { textAlign: 'center' },
}));
