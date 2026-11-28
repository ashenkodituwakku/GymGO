/**
 * GymGO Pro, small, at the foot of the sidebar (components/Sidebar.tsx): a
 * crown, what Pro adds in a line, and Go Pro, which opens the Pro page.
 * Only for a signed-in free account, once the plan is known, and only where
 * Pro can be bought (a store build that can't sell it shows nothing, as the
 * Profile card does). Never on the limited website.
 *
 * Filled with your accent (its gradient or pattern too: Rainbow, Camo),
 * white words and a white Go Pro in the accent, so it stands out from the
 * places above it in every look, as Profile's Pro card does.
 */

import { StyleSheet, View } from 'react-native';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { LIMITED } from '@/lib/limited';
import { CAN_BUY_HERE } from '@/lib/purchase';
import { color, dropShadow, face, radius, space, themed } from '@/lib/theme';
import { BrandFill } from './BrandFill';
import { Icon } from './Icon';
import { Pressable } from './motion';
import { useThemeVersion } from './Redrawn';
import { Txt } from './ui';

/** The line on the card: the free trial when there is one, else what Pro adds. */
export function sidebarProLine(trialDays: number | null): string {
  return trialDays ? `Try it free for ${trialDays} days.` : 'Gyms in every country, and no limit on saved gyms.';
}

export function SidebarPro({ onGo }: { onGo?: () => void }) {
  // Drawn again when the accent changes.
  useThemeVersion();
  const { account, billing, openPro } = useApp();
  const canBuy = CAN_BUY_HERE && billing.sale === 'on';
  if (LIMITED || !account.token || !billing.planKnown || billing.isPro || !canBuy) return null;
  const line = sidebarProLine(billing.trial?.days ?? null);
  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <BrandFill round={radius.lg} />
        <View style={styles.head}>
          <Icon name="crown" size={17} color={color.onBrand} />
          <Txt variant="headline" color={color.onBrand} style={face('bold')}>
            GymGO Pro
          </Txt>
        </View>
        <Txt variant="footnote" color={color.onBrandSoft}>
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
          <Txt variant="subhead" color={color.brandFill} style={face('bold')}>
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
      backgroundColor: color.brandFill,
      // A soft lift, so the accent card sits forward of the sidebar.
      ...dropShadow(0.16, 14, 6, 4),
    },
    head: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
    button: { alignItems: 'center', justifyContent: 'center', minHeight: 38, marginTop: space[1], borderRadius: radius.pill, backgroundColor: color.onBrand },
    buttonHover: { opacity: 0.92 },
  }),
);
