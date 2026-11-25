/**
 * GymGO Pro, small, at the foot of the sidebar (components/Sidebar.tsx): a
 * crown, what Pro adds in a line, and Go Pro, which opens the Pro page.
 * Only for a signed-in free account, once the plan is known, and only where
 * Pro can be bought (a store build that can't sell it shows nothing, as the
 * Profile card does). Never on the limited website.
 *
 * A dark card in every look and mode, with a warm button, so it reads as
 * one thing apart from the places above it.
 */

import { StyleSheet, View } from 'react-native';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { LIMITED } from '@/lib/limited';
import { CAN_BUY_HERE } from '@/lib/purchase';
import { face, radius, space, themed } from '@/lib/theme';
import { Icon } from './Icon';
import { Pressable } from './motion';
import { Txt } from './ui';

/** Pro's warm colour here, and the ink on it (6.6 to 1). */
export const PRO_WARM = '#FF6B4A';
export const PRO_WARM_INK = '#1E110B';

/** The line on the card: the free trial when there is one, else what Pro adds. */
export function sidebarProLine(trialDays: number | null): string {
  return trialDays ? `Try it free for ${trialDays} days.` : 'Gyms in every country, and no limit on saved gyms.';
}

export function SidebarPro({ onGo }: { onGo?: () => void }) {
  const { account, billing, openPro } = useApp();
  const canBuy = CAN_BUY_HERE && billing.sale === 'on';
  if (LIMITED || !account.token || !billing.planKnown || billing.isPro || !canBuy) return null;
  const line = sidebarProLine(billing.trial?.days ?? null);
  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.head}>
          <Icon name="crown" size={17} color={PRO_WARM} />
          <Txt variant="headline" color="#FFFFFF" style={face('bold')}>
            GymGO Pro
          </Txt>
        </View>
        <Txt variant="footnote" color="rgba(255, 255, 255, 0.78)">
          {line}
        </Txt>
        <Pressable
          onPress={() => {
            haptic.select();
            onGo?.();
            openPro();
          }}
          accessibilityRole="button"
          accessibilityLabel={`Go Pro. ${line}`}
          style={({ pressed, hovered }) => [styles.button, hovered && styles.buttonHover, pressed && { opacity: 0.85 }]}
        >
          <Txt variant="subhead" color={PRO_WARM_INK} style={face('bold')}>
            Go Pro
          </Txt>
        </Pressable>
      </View>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    // At the foot of the sidebar, under its list, in from the pane's edges as the rows are.
    wrap: { paddingTop: space[2], paddingHorizontal: space[3] + 2, paddingBottom: space[3] + 2 },
    card: {
      gap: space[1] + 2,
      padding: space[3] + 2,
      borderRadius: radius.lg,
      borderCurve: 'continuous',
      backgroundColor: '#1D1A3A',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    head: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    button: { alignItems: 'center', justifyContent: 'center', minHeight: 38, marginTop: space[1], borderRadius: radius.pill, backgroundColor: PRO_WARM },
    buttonHover: { backgroundColor: '#FF7D60' },
  }),
);
