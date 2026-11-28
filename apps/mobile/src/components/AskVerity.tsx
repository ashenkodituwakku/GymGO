/**
 * "Ask Verity" on a screen: a row with his face that opens the chat and
 * asks `question` at once, telling him what this screen shows (`context`,
 * named `about` in the chat; lib/verityBus.ts). On the workout you built,
 * an exercise's page, a gym's questions to ask, the templates, Pro and
 * Profile.
 */

import { StyleSheet, View } from 'react-native';
import { useApp } from '@/lib/app-state';
import { haptic } from '@/lib/haptics';
import { openVerity, type VerityRequest } from '@/lib/verityBus';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';
import { VerityMark } from './Verity';
import { Icon } from './Icon';
import { Pressable } from './motion';
import { Txt } from './ui';

export function AskVerity({
  title,
  detail,
  request,
  onOpen,
  flat = false,
}: {
  title: string;
  detail?: string;
  request: VerityRequest;
  /** Inside a card of its own: no plate of its own. */
  flat?: boolean;
  /** Before the chat opens: a sheet closing itself, say. */
  onOpen?: () => void;
}) {
  const { prefs } = useApp();
  // Switched off in Settings: nowhere to ask.
  if (!prefs.verity) return null;
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onOpen?.();
        openVerity(request);
      }}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={detail ? `${detail}. Opens a chat with Verity, GymGO’s AI assistant.` : 'Opens a chat with Verity, GymGO’s AI assistant.'}
      style={({ pressed }) => [styles.row, flat ? styles.flat : styles.plate, pressed && styles.pressed]}
    >
      <VerityMark size={36} still />
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
