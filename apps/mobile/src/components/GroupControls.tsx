/**
 * Under an exercise in the builder and in a workout: make it a superset with
 * the next one (or add the next to its circuit), or take it out of its
 * group (lib/supersets.ts).
 */

import { StyleSheet, View } from 'react-native';
import { haptic } from '@/lib/haptics';
import { groupName, type GroupInfo } from '@/lib/supersets';
import { color, face, radius, space, themed } from '@/lib/theme';
import { Icon } from './Icon';
import { Pressable } from './motion';
import { Txt } from './ui';

export function GroupControls({
  name,
  group,
  nextName,
  onLink,
  onUnlink,
}: {
  name: string;
  group: GroupInfo | null;
  /** The next exercise, when it could join this one; null when it's last or already in the group. */
  nextName: string | null;
  onLink: () => void;
  onUnlink: () => void;
}) {
  if (!group && !nextName) return null;
  return (
    <View style={styles.row}>
      {nextName && (
        <Pressable
          onPress={() => {
            haptic.select();
            onLink();
          }}
          accessibilityRole="button"
          accessibilityLabel={group ? `Add ${nextName} to ${groupName(group)}` : `Superset ${name} with ${nextName}`}
          accessibilityHint="Do them one after the other, resting once each has had its set."
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Icon name="source" size={13} color={color.brand} />
          <Txt variant="footnote" color={color.brand} style={face('semibold')}>
            {group ? 'Add the next to this group' : 'Superset with the next'}
          </Txt>
        </Pressable>
      )}
      {group && (
        <Pressable
          onPress={() => {
            haptic.select();
            onUnlink();
          }}
          accessibilityRole="button"
          accessibilityLabel={`Take ${name} out of ${groupName(group)}`}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Icon name="close" size={13} color={color.labelSecondary} />
          <Txt variant="footnote" color={color.labelSecondary} style={face('semibold')}>
            Take out of {groupName(group)}
          </Txt>
        </Pressable>
      )}
    </View>
  );
}

/** "Superset A (1/2)", for the line above an exercise's name. */
export const groupTag = (group: GroupInfo) => `${groupName(group)} (${group.position}/${group.members.length})`;

/**
 * The next exercise's name when it could join exercise `index`: there is a
 * next, and it isn't already in the same group.
 */
export function joinableNext(items: ReadonlyArray<{ group?: string }>, index: number, nameAt: (at: number) => string): string | null {
  const item = items[index];
  const next = items[index + 1];
  if (!item || !next) return null;
  if (item.group && item.group === next.group) return null;
  return nameAt(index + 1);
}

const styles = themed(() =>
  StyleSheet.create({
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 32,
      paddingHorizontal: space[3],
      borderRadius: radius.pill,
      backgroundColor: color.fill,
    },
    pressed: { opacity: 0.6 },
  }),
);
