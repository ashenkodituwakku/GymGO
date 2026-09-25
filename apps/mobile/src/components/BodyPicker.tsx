/**
 * Tap the muscles you want to train, on a front and a back view of the body.
 *
 * Only muscle groups can be picked; the head, hands, feet and joints stay
 * pale. The same muscles are listed underneath as chips, for anyone who'd
 * rather not aim at a forearm, and for VoiceOver and TalkBack.
 */

import { useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { haptic } from '@/lib/haptics';
import { color, face, space, themed } from '@/lib/theme';
import { MUSCLES, muscleLabel, type Muscle } from '@/lib/workout';
import { BodyFigure } from './body/BodyFigure';
import type { Gender } from './body/shapes';
import { Chip, Txt } from './ui';

const isMuscle = (slug: string): slug is Muscle => MUSCLES.some((muscle) => muscle.id === slug);

export function BodyPicker({
  selected,
  onToggle,
  gender,
  maxWidth,
}: {
  selected: Muscle[];
  onToggle: (muscle: Muscle) => void;
  gender: Gender;
  /** Room available; the two figures share it. */
  maxWidth?: number;
}) {
  const window = useWindowDimensions();
  const [listOpen, setListOpen] = useState(false);
  const room = Math.min(maxWidth ?? window.width, 560) - space[4] * 4;
  // Each figure is drawn 1 wide by 2 tall.
  const figureWidth = Math.max(120, Math.min(240, room / 2));
  const isSelected = (slug: string) => isMuscle(slug) && selected.includes(slug);
  const press = (slug: string) => {
    if (!isMuscle(slug)) return;
    haptic.select();
    onToggle(slug);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {(['front', 'back'] as const).map((side) => (
          <View key={side} style={styles.figure}>
            <BodyFigure
              gender={gender}
              side={side}
              width={figureWidth}
              height={figureWidth * 2}
              fillFor={(slug) => (!isMuscle(slug) ? color.bodyInert : isSelected(slug) ? color.brand : color.bodyIdle)}
              pickable={isMuscle}
              selected={isSelected}
              labelFor={(slug) => (isMuscle(slug) ? muscleLabel(slug) : slug)}
              onPress={press}
            />
            <Txt variant="caption" color={color.labelSecondary}>
              {side === 'front' ? 'Front' : 'Back'}
            </Txt>
          </View>
        ))}
      </View>
      <Pressable
        onPress={() => setListOpen((open) => !open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: listOpen }}
        hitSlop={8}
        style={styles.listToggle}
      >
        <Txt variant="subhead" color={color.brand} style={face('semibold')}>
          {listOpen ? 'Hide the muscle list' : 'Pick from a list instead'}
        </Txt>
      </Pressable>
      {listOpen && (
        <View style={styles.chips}>
          {MUSCLES.map((muscle) => (
            <Chip key={muscle.id} label={muscle.label} selected={selected.includes(muscle.id)} onPress={() => onToggle(muscle.id)} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  wrap: { gap: space[2] },
  row: { flexDirection: 'row', justifyContent: 'center', gap: space[3] },
  figure: { alignItems: 'center', gap: space[1] },
  listToggle: { alignSelf: 'center', paddingVertical: space[1] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], justifyContent: 'center' },
}));
