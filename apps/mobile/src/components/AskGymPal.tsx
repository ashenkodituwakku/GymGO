/**
 * "Ask GymPal" on a screen: a row with his face that opens the chat and
 * asks `question` at once, telling him what this screen shows (`context`,
 * named `about` in the chat; lib/gymPalBus.ts). On the workout you built,
 * an exercise's page, a gym's questions to ask, the templates, Pro and
 * Profile.
 */

import { StyleSheet, View } from 'react-native';
import { haptic } from '@/lib/haptics';
import { openGymPal, type GymPalRequest } from '@/lib/gymPalBus';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';
import { GymPalFace } from './GymPal';
import { Icon } from './Icon';
import { Pressable } from './motion';
import { Txt } from './ui';

export function AskGymPal({
  title,
  detail,
  request,
  onOpen,
  flat = false,
}: {
  title: string;
  detail?: string;
  request: GymPalRequest;
  /** Inside a card of its own: no plate of its own. */
  flat?: boolean;
  /** Before the chat opens: a sheet closing itself, say. */
  onOpen?: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onOpen?.();
        openGymPal(request);
      }}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={detail ? `${detail}. Opens a chat with GymPal, GymGO’s AI assistant.` : 'Opens a chat with GymPal, GymGO’s AI assistant.'}
      style={({ pressed }) => [styles.row, flat ? styles.flat : styles.plate, pressed && styles.pressed]}
    >
      <GymPalFace size={36} still />
      <View style={styles.flex}>
        <Txt variant="subhead" color={color.brand} style={face('semibold')}>
          {title}
        </Txt>
        {!!detail && (
          <Txt variant="footnote" color={color.labelSecondary}>
            {detail}
          </Txt>
        )}
      </View>
      <Icon name="chevron" size={13} color={color.labelTertiary} />
    </Pressable>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
    },
    plate: {
      paddingVertical: space[3],
      paddingHorizontal: space[4],
      borderRadius: radius.lg,
      borderCurve: 'continuous',
      backgroundColor: color.plate,
      ...shadow.plate,
    },
    flat: { paddingVertical: space[2] },
    pressed: { opacity: 0.75 },
    flex: { flex: 1, minWidth: 0, gap: 2 },
  }),
);
