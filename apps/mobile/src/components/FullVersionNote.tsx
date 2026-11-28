/**
 * In place of something the limited website can't have without a server
 * (lib/limited.ts): reviews, members' reports, an account. One line saying
 * it comes with the full version, rather than a "Sign in" that can't work.
 */

import { StyleSheet, View } from 'react-native';
import { color, space, themed } from '@/lib/theme';
import { Icon } from './Icon';
import { Txt } from './ui';

export function FullVersionNote({ what }: { what: string }) {
  return (
    <View style={styles.note} accessible>
      <Icon name="info" size={14} color={color.labelTertiary} />
      <Txt variant="footnote" color={color.labelSecondary} style={styles.flex}>
        {`${what} come with the full version of GymGO.`}
      </Txt>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    note: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingVertical: space[1] },
    flex: { flex: 1, minWidth: 0 },
  }),
);
