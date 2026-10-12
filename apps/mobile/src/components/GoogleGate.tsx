/**
 * Holds back content that loads from Google until you ask for it, and says
 * why (see lib/googleConsent.ts). Nothing is sent to Google while this shows.
 */

import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Pressable, Pressy } from './motion';
import { setAlwaysShowGoogle, useAlwaysShowGoogle } from '@/lib/googleConsent';
import { haptic } from '@/lib/haptics';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';
import { Icon } from './Icon';
import { Txt } from './ui';

export function GoogleGate({ what, children }: { what: string; children: ReactNode }) {
  const always = useAlwaysShowGoogle();
  const [shown, setShown] = useState(false);
  if (always || shown) return <>{children}</>;
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.glyph}>
          <Icon name="globe" size={18} color={color.brand} />
        </View>
        <View style={styles.flex}>
          <Txt variant="headline">{what} from Google</Txt>
          <Txt variant="footnote" color={color.labelSecondary}>
            Not loaded yet. It comes straight from Google, which sees your device’s IP address, as any website does.
          </Txt>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressy
          scaleTo={0.96}
          onPress={() => {
            haptic.tap();
            setShown(true);
          }}
          accessibilityRole="button"
          style={styles.show}
        >
          <Icon name="eye" size={15} color={color.onBrand} />
          <Txt variant="subhead" color={color.onBrand} style={face('semibold')}>
            Show {what}
          </Txt>
        </Pressy>
        <Pressable
          onPress={() => {
            haptic.select();
            setAlwaysShowGoogle(true);
          }}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.always}
        >
          <Txt variant="footnote" color={color.brand} style={face('semibold')}>
            Always show
          </Txt>
        </Pressable>
      </View>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    card: { gap: space[3], padding: space[4], borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: color.plate, ...shadow.plate },
    head: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
    glyph: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: color.brandTint },
    flex: { flex: 1, gap: 2 },
    // Wraps on a narrow phone, where "Always show" ran off the card.
    actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space[4], rowGap: space[2], paddingLeft: 36 + space[3] },
    show: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space[4], paddingVertical: space[2], borderRadius: radius.pill, backgroundColor: color.brandFill },
    always: { paddingVertical: space[1] },
  }),
);
