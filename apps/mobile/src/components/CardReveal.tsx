/**
 * The moment a card is pulled: when you collect a gym, or a visit rolls
 * better than its card had. A pop-up rises in the middle of the screen,
 * the page still there behind it, dimmed; the card flips in over a glow of
 * its gem's colour, its rarity above it. It's sized to its content (a
 * smaller card, the buttons side by side), so on a phone it takes part of
 * the screen rather than all of it, and scrolls inside itself on the
 * smallest.
 *
 * Closing plays it out (the pop-up sinks and fades, then goes) instead of
 * vanishing mid-frame.
 *
 * It moves with plain animated values, not Reanimated's entering
 * animations: inside a Modal on iPhone those can fail to start, which left
 * the card and its buttons invisible and the dark backdrop over the whole
 * screen with no way out. A close button in the corner, and a tap on the
 * backdrop, always close it.
 */

import { BlurView } from 'expo-blur';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, ReduceMotion, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import type { GymRecord } from '@gymgo/domain';
import { GemCard } from './GemCard';
import { Icon } from './Icon';
import { Pressy } from './motion';
import { PrimaryButton, Txt } from './ui';
import type { CollectedGym } from '@/lib/collection';
import { haptic } from '@/lib/haptics';
import { imageShareLine, shareViewAsImage } from '@/lib/shareImage';
import { PRISM, cardFor, gemInfo, rarityLabel, rarityRank, type Rarity } from '@/lib/rarity';
import { face, radius, space, themed } from '@/lib/theme';

const SYSTEM = ReduceMotion.System;
/** The pop-up rising into place: quick, with the faintest settle. */
const RISE = { damping: 24, stiffness: 260, mass: 0.9, reduceMotion: SYSTEM };
/** The card turning face up: a little more give, so it lands. */
const FLIP = { damping: 17, stiffness: 190, mass: 0.9, reduceMotion: SYSTEM };
const EASE_OUT = Easing.out(Easing.cubic);
const EASE_IN = Easing.in(Easing.cubic);

/**
 * How the pop-up comes and goes. `shown` drives the dimming and the panel,
 * `card` the flip, `words` the heading and buttons, `glow` the colour
 * behind the card. `leave` plays it all out, then calls `then`.
 */
function useChoreography() {
  const shown = useSharedValue(0);
  const card = useSharedValue(0);
  const words = useSharedValue(0);
  const glow = useSharedValue(0);
  const leaving = useRef(false);

  useEffect(() => {
    shown.value = withSpring(1, RISE);
    card.value = withDelay(90, withSpring(1, FLIP));
    words.value = withDelay(160, withTiming(1, { duration: 280, easing: EASE_OUT, reduceMotion: SYSTEM }));
    glow.value = withDelay(60, withTiming(1, { duration: 620, easing: EASE_OUT, reduceMotion: SYSTEM }));
  }, [shown, card, words, glow]);

  const leave = useCallback(
    (then: () => void) => {
      if (leaving.current) return;
      leaving.current = true;
      words.value = withTiming(0, { duration: 120, easing: EASE_IN, reduceMotion: SYSTEM });
      glow.value = withTiming(0, { duration: 160, easing: EASE_IN, reduceMotion: SYSTEM });
      shown.value = withTiming(0, { duration: 190, easing: EASE_IN, reduceMotion: SYSTEM }, (finished) => {
        if (finished) runOnJS(then)();
      });
    },
    [shown, words, glow],
  );

  const dim = useAnimatedStyle(() => ({ opacity: Math.min(1, shown.value * 1.4) }));
  const panel = useAnimatedStyle(() => ({
    opacity: Math.min(1, shown.value * 1.8),
    transform: [{ translateY: (1 - shown.value) * 36 }, { scale: 0.92 + shown.value * 0.08 }],
  }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, card.value * 2.2),
    transform: [{ perspective: 900 }, { rotateY: `${(1 - card.value) * 75}deg` }, { scale: 0.88 + card.value * 0.12 }],
  }));
  const wordsStyle = useAnimatedStyle(() => ({ opacity: words.value, transform: [{ translateY: (1 - words.value) * 8 }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value, transform: [{ scale: 0.55 + glow.value * 0.45 }] }));
  return { leave, dim, panel, cardStyle, wordsStyle, glowStyle };
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
  const { leave, dim, panel, cardStyle, wordsStyle, glowStyle } = useChoreography();
  const look = cardFor(pull.entry);
  const gem = gemInfo(look.gem);
  const legendary = look.rarity === 'legendary';
  const panelWidth = Math.min(340, width - space[4] * 2);
  const cardWidth = Math.min(210, panelWidth - space[8] * 2);
  // A shorter picture window on a short screen, so it all fits without scrolling on nearly every phone.
  const windowHeight = height < 700 ? 92 : 116;
  const maxHeight = height - insets.top - insets.bottom - space[6];
  const glow = panelWidth * 1.25;
  const close = () => leave(onClose);
  const shot = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const [shareLine, setShareLine] = useState<string | null>(null);
  const share = async () => {
    haptic.tap();
    setSharing(true);
    setShareLine(null);
    const outcome = await shareViewAsImage(shot, { name: pull.entry.name, title: 'My GymGO card' });
    setSharing(false);
    setShareLine(imageShareLine(outcome));
  };
  const openCollection = () => {
    haptic.tap();
    leave(onOpenCollection);
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={close} statusBarTranslucent navigationBarTranslucent>
      <View style={styles.root}>
        {/* The page stays in view behind, dimmed; a tap on it closes the pop-up. */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.dim, dim]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessible={false} />
        </Animated.View>

        <View style={[styles.centre, { paddingTop: insets.top + space[3], paddingBottom: insets.bottom + space[3] }, { pointerEvents: 'box-none' }]}>
          <Animated.View style={[styles.panel, { width: panelWidth, maxHeight }, panel]} accessibilityViewIsModal>
            <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, styles.tint]} />
            <Animated.View style={[styles.glow, { width: glow, height: glow, top: -glow * 0.12, left: (panelWidth - glow) / 2 }, glowStyle, { pointerEvents: 'none' }]}>
              <Svg width={glow} height={glow}>
                <Defs>
                  <RadialGradient id="pullGlow" cx="50%" cy="50%" r="50%">
                    <Stop offset="0" stopColor={legendary ? PRISM[1] : gem.colors[0]} stopOpacity={0.7} />
                    <Stop offset="0.45" stopColor={legendary ? PRISM[5] : gem.colors[1]} stopOpacity={0.3} />
                    <Stop offset="1" stopColor={gem.colors[2]} stopOpacity={0} />
                  </RadialGradient>
                </Defs>
                <Circle cx={glow / 2} cy={glow / 2} r={glow / 2} fill="url(#pullGlow)" />
              </Svg>
            </Animated.View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.content} bounces={false} showsVerticalScrollIndicator={false}>
              <Animated.View style={[styles.heading, wordsStyle]} accessibilityLiveRegion="polite">
                <Txt variant="caption" color="rgba(255, 255, 255, 0.72)" style={[face('bold'), styles.eyebrow]}>
                  {pull.viewing ? 'YOUR CARD' : pull.upgradedFrom ? `UPGRADED FROM ${rarityLabel(pull.upgradedFrom).toUpperCase()}` : 'NEW CARD'}
                </Txt>
                <Txt variant="title" color={legendary ? PRISM[1] : gem.colors[0]} style={styles.centreText}>
                  {/* Only a rare pull gets the exclamation mark. */}
                  {rarityRank(look.rarity) >= rarityRank('rare') ? `${rarityLabel(look.rarity)}!` : `${rarityLabel(look.rarity)} card`}
                </Txt>
                <Txt variant="footnote" color="rgba(255, 255, 255, 0.82)" style={styles.centreText} numberOfLines={2}>
                  {`${gem.label}${look.foil ? ' · Foil' : ''} · ${pull.entry.name}`}
                </Txt>
              </Animated.View>

              <Animated.View style={cardStyle}>
                {/* Captured as it is for Share card: just the card. */}
                <View ref={shot} collapsable={false}>
                  <GemCard entry={pull.entry} record={record} cover={cover} width={cardWidth} big windowHeight={windowHeight} />
                </View>
              </Animated.View>

              <Animated.View style={[styles.actions, wordsStyle]}>
                <View style={styles.buttons}>
                  <View style={styles.flex}>
                    <PrimaryButton label={pull.viewing ? 'Done' : 'Nice!'} onPress={close} />
                  </View>
                  {/* White on glass, not the brand colour, which is too dark to read here. */}
                  <Pressy scaleTo={0.97} onPress={openCollection} accessibilityRole="button" style={[styles.flex, styles.ghost]}>
                    <Icon name="trophy" size={16} color="#FFFFFF" />
                    <Txt variant="headline" color="#FFFFFF">
                      Collection
                    </Txt>
                  </Pressy>
                </View>
                <Pressy scaleTo={0.97} onPress={() => void share()} accessibilityRole="button" disabled={sharing} style={[styles.ghost, styles.shareButton]}>
                  <Icon name="share" size={16} color="#FFFFFF" />
                  <Txt variant="headline" color="#FFFFFF">
                    {sharing ? 'Making the picture…' : 'Share card'}
                  </Txt>
                </Pressy>
                {shareLine && (
                  <Txt variant="caption" color="rgba(255, 255, 255, 0.8)" style={styles.centreText}>
                    {shareLine}
                  </Txt>
                )}
                <Txt variant="caption" color="rgba(255, 255, 255, 0.62)" style={styles.centreText}>
                  Each day you check in rolls again, and the card keeps its best. Rarity is luck, not a rating of the gym.
                </Txt>
              </Animated.View>
            </ScrollView>

            <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} style={styles.close}>
              <Icon name="close" size={15} color="#FFFFFF" />
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    root: { flex: 1 },
    dim: { backgroundColor: 'rgba(0, 0, 0, 0.5)' },
    centre: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[4] },
    panel: {
      borderRadius: radius.sheet,
      borderCurve: 'continuous',
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255, 255, 255, 0.16)',
      boxShadow: '0px 18px 48px rgba(0, 0, 0, 0.45)',
    },
    tint: { backgroundColor: 'rgba(16, 16, 26, 0.78)' },
    glow: { position: 'absolute' },
    scroll: { flexGrow: 0 },
    content: { alignItems: 'center', gap: space[3], paddingHorizontal: space[5], paddingTop: space[6], paddingBottom: space[5] },
    heading: { alignItems: 'center', gap: 2, paddingHorizontal: space[4] },
    eyebrow: { letterSpacing: 1.2 },
    centreText: { textAlign: 'center' },
    actions: { alignSelf: 'stretch', gap: space[3], marginTop: space[1] },
    buttons: { flexDirection: 'row', gap: space[2] },
    flex: { flex: 1 },
    shareButton: { height: 44, alignSelf: 'stretch' },
    ghost: {
      height: 52,
      borderRadius: radius.lg,
      borderCurve: 'continuous',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space[2],
      backgroundColor: 'rgba(255, 255, 255, 0.14)',
    },
    close: {
      position: 'absolute',
      top: space[3],
      right: space[3],
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.16)',
    },
  }),
);
