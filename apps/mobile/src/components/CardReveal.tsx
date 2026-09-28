/**
 * The moment a card is pulled: when you collect a gym, or a visit rolls
 * better than its card had, the card rises into the middle of the screen
 * in a glow of its gem's colour, with its rarity above it.
 */

import { BlurView } from 'expo-blur';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, ReduceMotion, ZoomIn } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import type { GymRecord } from '@gymgo/domain';
import { GemCard } from './GemCard';
import { PrimaryButton, Txt } from './ui';
import type { CollectedGym } from '@/lib/collection';
import { PRISM, cardFor, gemInfo, rarityLabel, rarityRank, type Rarity } from '@/lib/rarity';
import { face, space, themed } from '@/lib/theme';

const CARD_IN =
  Platform.OS === 'web'
    ? ZoomIn.duration(420).reduceMotion(ReduceMotion.System)
    : ZoomIn.springify().damping(12).stiffness(160).reduceMotion(ReduceMotion.System);
const TEXT_IN = FadeIn.duration(300).delay(250).reduceMotion(ReduceMotion.System);

export interface Pull {
  entry: CollectedGym;
  /** Set when a visit rolled better than the card was. */
  upgradedFrom: Rarity | null;
  /** Just looking at a card you already have (its Show button), not pulling one. */
  viewing?: boolean;
}

export function CardReveal({ pull, record, cover, onClose, onOpenCollection }: {
  pull: Pull | null;
  record: GymRecord | null;
  cover: string | null;
  onClose: () => void;
  onOpenCollection: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  if (!pull) return null;
  const look = cardFor(pull.entry);
  const gem = gemInfo(look.gem);
  const cardWidth = Math.min(280, width - space[6] * 2);
  // A shorter window on a short screen, so the card, its heading and the
  // buttons fit without scrolling on most phones (and scroll on the rest).
  const windowHeight = height < 700 ? 132 : 196;
  const glow = Math.min(width, height) * 1.1;
  const legendary = look.rarity === 'legendary';
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <View style={styles.backdrop}>
        {/* The page behind, blurred out of the way. */}
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <Svg width={glow} height={glow} style={styles.glow} pointerEvents="none">
          <Defs>
            <RadialGradient id="pullGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={legendary ? PRISM[1] : gem.colors[0]} stopOpacity={0.75} />
              <Stop offset="0.45" stopColor={legendary ? PRISM[5] : gem.colors[1]} stopOpacity={0.35} />
              <Stop offset="1" stopColor={gem.colors[2]} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={glow / 2} cy={glow / 2} r={glow / 2} fill="url(#pullGlow)" />
        </Svg>

        <ScrollView
          style={StyleSheet.absoluteFill}
          contentContainerStyle={[styles.column, { paddingTop: insets.top + space[4], paddingBottom: insets.bottom + space[4] }]}
        >
          <Animated.View entering={TEXT_IN} style={styles.heading} accessibilityLiveRegion="polite">
            <Txt variant="caption" color="rgba(255, 255, 255, 0.75)" style={[face('bold'), styles.eyebrow]}>
              {pull.viewing ? 'YOUR CARD' : pull.upgradedFrom ? `UPGRADED FROM ${rarityLabel(pull.upgradedFrom).toUpperCase()}` : 'NEW CARD'}
            </Txt>
            <Txt variant="largeTitle" color={legendary ? PRISM[1] : gem.colors[0]} style={styles.center}>
              {/* Only a rare pull gets the exclamation mark. */}
              {rarityRank(look.rarity) >= rarityRank('rare') ? `${rarityLabel(look.rarity)}!` : `${rarityLabel(look.rarity)} card`}
            </Txt>
            <Txt variant="subhead" color="rgba(255, 255, 255, 0.85)" style={styles.center}>
              {`${gem.label}${look.foil ? ' · Foil' : ''} · ${pull.entry.name}`}
            </Txt>
          </Animated.View>

          <Animated.View entering={CARD_IN}>
            <GemCard entry={pull.entry} record={record} cover={cover} width={cardWidth} big windowHeight={windowHeight} />
          </Animated.View>

          <Animated.View entering={TEXT_IN} style={[styles.buttons, { width: cardWidth }]}>
            <PrimaryButton label={pull.viewing ? 'Done' : 'Nice!'} onPress={onClose} />
            {/* White, not the brand colour, which is too dark to read on this backdrop. */}
            <Pressable onPress={onOpenCollection} accessibilityRole="button" hitSlop={8} style={styles.link}>
              <Txt variant="headline" color="#FFFFFF">
                See your collection ›
              </Txt>
            </Pressable>
            <Txt variant="caption" color="rgba(255, 255, 255, 0.7)" style={styles.center}>
              Each day you check in rolls again, and the card keeps its best. Rarity is luck, not a rating of the gym.
            </Txt>
          </Animated.View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(8, 8, 16, 0.86)' },
    glow: { position: 'absolute' },
    // Grows to the screen and centres, so it sits in the middle when it fits and scrolls when it doesn't.
    column: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: space[4], paddingHorizontal: space[6] },
    heading: { alignItems: 'center', gap: 2 },
    eyebrow: { letterSpacing: 1.2 },
    center: { textAlign: 'center' },
    buttons: { gap: space[2] },
    link: { alignSelf: 'center', paddingVertical: space[2] },
  }),
);
