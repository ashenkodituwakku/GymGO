/**
 * One of your requirements against what this gym has: a state glyph, the
 * item, and — when it is not a clean yes — the reason in words.
 */

import { StyleSheet, View } from 'react-native';
import { equipmentMatchStateLabel, type EquipmentMatchState } from '@gymgo/domain';
import { color, face, space, themed } from '@/lib/theme';
import { Icon } from './Icon';
import { Txt } from './ui';

export function StateGlyphRow({ state, label, detail }: { state: EquipmentMatchState; label: string; detail: string }) {
  const good = state === 'confirmed';
  const ruledOut = state === 'missing' || state === 'below_requirement';
  const icon = good ? 'good' : ruledOut ? 'no' : 'maybe';
  const fill = good ? color.good : ruledOut ? color.no : color.maybe;

  return (
    <View style={styles.row}>
      <Icon name={icon} size={18} color={fill} />
      <View style={styles.text}>
        <Txt variant="subhead" style={styles.label}>
          {label}
          {!good && (
            <Txt variant="subhead" color={ruledOut ? color.noInk : color.maybeInk}>
              {`  ${equipmentMatchStateLabel(state)}`}
            </Txt>
          )}
        </Txt>
        {!good && (
          <Txt variant="footnote" color={color.labelSecondary}>
            {detail}
          </Txt>
        )}
      </View>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  row: { flexDirection: 'row', gap: space[2], alignItems: 'flex-start' },
  text: { flex: 1 },
  label: face('medium'),
}));
