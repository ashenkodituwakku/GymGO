/**
 * The moment a card is pulled: when you collect a gym, or a visit rolls
 * better than its card had, the card rises into the middle of the screen
 * in a glow of its gem's colour, with its rarity above it.
 *
 * It moves with plain animated values, not Reanimated's entering
 * animations: inside a Modal on iPhone those can fail to start, which left
 * the card and its buttons invisible and the dark backdrop over the whole
 * screen with no way out. A close button in the corner, and a tap on the
 * backdrop, always close it.
 */

import { BlurView } from 'expo-blur';
import { useEffect } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import type { GymRecord } from '@gymgo/domain';
import { GemCard } from './GemCard';
import { Icon } from './Icon';
import { PrimaryButton, Txt } from './ui';
import type { CollectedGym } from '@/lib/collection';
import { PRISM, cardFor, gemInfo, rarityLabel, rarityRank, type Rarity } from '@/lib/rarity';
import { face, space, themed } from '@/lib/theme';

/** The card grows in with a little give; the words fade in just after. */
function useArrival() {
  const card = useSharedValue(0);
  const words = useSharedValue(0);
  useEffect(() => {
    card.value = withSpring(1, { damping: 14, stiffness: 170, reduceMotion: ReduceMotion.System });
    words.value = withDelay(200, withTiming(1, { duration: 260, reduceMotion: ReduceMotion.System }));
  }, [card, words]);
  const cardStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, card.value * 1.6), transform: [{ scale: 0.6 + card.value * 0.4 }] }));
  const wordsStyle = useAnimatedStyle(() => ({ opacity: words.value }));
  return { cardStyle, wordsStyle };
}

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
  if (!pull) return null;
  return <Reveal pull={pull} record={record} cover={cover} onClose={onClose} onOpenCollection={onOpenCollection} />;
}

function Reveal({ pull, record, cover, onClose, onOpenCollection }: {
  pull: Pull;
  record: GymRecord | null;
  cover: string | null;
  onClose: () => void;
  onOpenCollection: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { cardStyle, wordsStyle } = useArrival();
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
          contentContainerStyle={[styles.column, { paddingTop: insets.top + space[8], paddingBottom: insets.bottom + space[4] }]}
        >
          {/* A tap anywhere off the card closes it. */}
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessible={false} />
          <Animated.View style={[styles.heading, wordsStyle]} accessibilityLiveRegion="polite" pointerEvents="none">
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

          <Animated.View style={cardStyle}>
            <GemCard entry={pull.entry} record={record} cover={cover} width={cardWidth} big windowHeight={windowHeight} />
          </Animated.View>

          <Animated.View style={[styles.buttons, { width: cardWidth }, wordsStyle]}>
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
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={8}
          style={[styles.close, { top: insets.top + space[2], right: space[4] }]}
        >
          <Icon name="close" size={18} color="#FFFFFF" />
        </Pressable>
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
    close: {
      position: 'absolute',
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.18)',
    },
  }),
);
