/**
 * Holds back content that loads from Google until you ask for it, and says
 * why (see lib/googleConsent.ts). Nothing is sent to Google while this shows.
 */

import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Pressable } from './motion';
import { setAlwaysShowGoogle, useAlwaysShowGoogle } from '@/lib/googleConsent';
import { haptic } from '@/lib/haptics';
import { color, radius, space, themed } from '@/lib/theme';
import { Icon } from './Icon';
import { PrimaryButton, Txt } from './ui';

export function GoogleGate({ what, children }: { what: string; children: ReactNode }) {
  const always = useAlwaysShowGoogle();
  const [shown, setShown] = useState(false);
  if (always || shown) return <>{children}</>;
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Icon name="globe" size={18} color={color.labelSecondary} />
        <Txt variant="subhead" style={styles.flex}>
          {what} from Google
        </Txt>
      </View>
      <Txt variant="footnote" color={color.labelSecondary}>
        Not loaded yet. It comes straight from Google, which sees your device’s IP address, as any website does.
      </Txt>
      <PrimaryButton label={`Show ${what}`} tone="quiet" onPress={() => setShown(true)} />
      <Pressable
        onPress={() => {
          haptic.select();
          setAlwaysShowGoogle(true);
        }}
        accessibilityRole="button"
        hitSlop={8}
        style={styles.always}
      >
        <Txt variant="footnote" color={color.brand}>
          Always show Google content
        </Txt>
      </Pressable>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    card: { gap: space[2], padding: space[4], borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: color.fill },
    head: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    flex: { flex: 1 },
    always: { alignSelf: 'center', paddingVertical: space[1] },
  }),
);
