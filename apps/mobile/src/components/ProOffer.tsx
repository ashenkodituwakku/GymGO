/**
 * A GymGO Pro feature offered where it would be used (a chart on an
 * exercise's page, the muscle balance on Progress, warm-ups on Plates): its
 * icon on a tile of the accent's tint, what it does, a PRO tag, and a tap
 * to the Pro page. One look for every such offer.
 */

import { StyleSheet, View } from 'react-native';
import { color, face, radius, shadow, space, themed } from '@/lib/theme';
import { Icon, type IconName } from './Icon';
import { EmojiIcon } from './Emoji';
import { Pressable } from './motion';
import { Txt } from './ui';

export function ProOffer({ icon, title, body, onPress }: { icon: IconName; title: string; body: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, with GymGO Pro. ${body}`}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
    >
      <View style={styles.mark}>
        <EmojiIcon name={icon} size={20} />
      </View>
      <View style={styles.flex}>
        <View style={styles.tag}>
          <EmojiIcon name="crown" size={10} />
          <Txt variant="caption" color={color.brand} style={face('bold')}>
            PRO
          </Txt>
        </View>
        <Txt variant="headline">{title}</Txt>
        <Txt variant="footnote" color={color.labelSecondary}>
          {body}
        </Txt>
      </View>
      <Icon name="chevron" size={13} color={color.labelTertiary} />
    </Pressable>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      padding: space[4],
      borderRadius: radius.lg,
      borderCurve: 'continuous',
      backgroundColor: color.plate,
      ...shadow.plate,
    },
    mark: { width: 40, height: 40, borderRadius: radius.md, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: color.fill },
    flex: { flex: 1, minWidth: 0, gap: 2 },
    tag: { alignSelf: 'flex-start', marginBottom: 2, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: space[2], paddingVertical: 2, borderRadius: radius.pill, backgroundColor: color.brandTint },
  }),
);
