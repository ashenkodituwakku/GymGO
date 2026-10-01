/**
 * A collected gym as a trading card: a gem-coloured frame, its rarity and
 * gem, and the gym's own logo or a member's photo in the window. Rarer
 * cards catch the light (a shine sweeps across Epic, Legendary and Foil
 * cards), Legendary cards have a rainbow frame and sparkles, and Foil ones
 * a rainbow sheen over the picture.
 *
 * The frame and shine are decoration around the gym's real picture, never a
 * stand-in for it: a gym with no logo or photo says "No photo supplied" in
 * the window. Rarity is luck (see lib/rarity.ts), not a rating of the gym.
 */

import { useEffect, useId } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { GymRecord } from '@gymgo/domain';
import { MarkImage, useGymMark } from './BrandLogo';
import { Icon } from './Icon';
import { NoPhoto, Txt } from './ui';
import { photoUrl } from '@/lib/api';
import { flag, tierFor, type CollectedGym } from '@/lib/collection';
import { haptic } from '@/lib/haptics';
import { PRISM, cardFor, gemInfo, rarityLabel, rarityRank, type CardLook } from '@/lib/rarity';
import { color, face, radius, space, themed } from '@/lib/theme';
import type { Tier } from '@/lib/collection';

const WINDOW_TOP = 44;
const WINDOW_SIDE = 12;

/** Each visit tier's medal: the metal it's named after. */
export const TIER_METAL = themed(() => ({
  bronze: '#B0713A',
  silver: '#8E959E',
  gold: '#C9971C',
  platinum: '#3E9DB8',
})) as Record<Tier, string>;

export function GemCard({
  entry,
  record,
  cover,
  width,
  big = false,
  windowHeight,
  onPress,
}: {
  entry: CollectedGym;
  record: GymRecord | null;
  cover: string | null;
  width: number;
  /** The reveal: a bigger card with a taller window. */
  big?: boolean;
  /** The picture window's height, when the space calls for another. */
  windowHeight?: number;
  onPress?: () => void;
}) {
  const look = cardFor(entry);
  const gem = gemInfo(look.gem);
  const visits = entry.days.length;
  const tier = tierFor(visits);
  const metal = TIER_METAL[tier.tier];
  const toNext = tier.next ? visits / (visits + tier.next.visits) : 1;
  const legendary = look.rarity === 'legendary';
  const shines = look.foil || rarityRank(look.rarity) >= rarityRank('epic');
  const ids = useSvgIds();
  const frame = 3;
  const artHeight = windowHeight ?? (big ? 196 : 128);
  const label = `${entry.name}, ${entry.city}. ${rarityLabel(look.rarity)} ${gem.label}${look.foil ? ' foil' : ''} card. ${tier.label}, ${visits} visit${visits === 1 ? '' : 's'}${tier.next ? `, ${tier.next.visits} more to ${tier.next.label}` : ''}`;
  // Rarer cards glow in their gem's colour. The glow is on the outer view,
  // which doesn't clip, so a phone draws it (a clipping view hides its own shadow).
  const glow = rarityRank(look.rarity) >= rarityRank('rare') ? { boxShadow: `0 6px ${legendary ? 26 : 16}px ${gem.colors[1]}${legendary ? '88' : '55'}` } : null;
  const outer = [styles.outer, { width, borderRadius: radius.lg + frame }, glow];

  const body = (
    <View style={[styles.frame, { padding: frame, borderRadius: radius.lg + frame }]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={ids.frame} x1="0" y1="0" x2="1" y2="1">
            {legendary
              ? PRISM.map((stop, at) => <Stop key={stop} offset={at / (PRISM.length - 1)} stopColor={stop} />)
              : [gem.colors[0], gem.colors[1], gem.colors[2], gem.colors[1], gem.colors[0]].map((stop, at) => <Stop key={at} offset={at / 4} stopColor={stop} />)}
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${ids.frame})`} />
      </Svg>

      <View style={[styles.inner, { borderRadius: radius.lg }]}>
        <View style={[styles.window, { height: artHeight }]}>
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
            <Defs>
              <LinearGradient id={ids.window} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={gem.colors[1]} />
                <Stop offset="1" stopColor={gem.colors[2]} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${ids.window})`} />
          </Svg>
          <CardArt record={record} cover={cover} name={entry.name} width={width - frame * 2 - WINDOW_SIDE * 2} height={artHeight - WINDOW_TOP - WINDOW_SIDE} />
          {look.foil && <Foil id={ids.foil} />}
          {legendary && <Sparkles big={big} />}
          {/* The rarity and the gem share one row, so on a narrow card they give way rather than overlap. */}
          <View style={[styles.topRow, { pointerEvents: 'none' }]}>
            <RarityTag look={look} />
            <GemBadge gem={look.gem} foil={look.foil} id={ids.ring} big={big} />
          </View>
        </View>

        <View style={styles.body}>
          <Txt variant={big ? 'title2' : 'headline'} numberOfLines={2}>
            {entry.name}
          </Txt>
          <Txt variant="footnote" color={color.labelSecondary} numberOfLines={1}>
            {`${flag(entry.countryCode)} ${entry.city}`.trim()}
          </Txt>
          <View style={styles.tierRow}>
            <View style={[styles.metalDot, { backgroundColor: metal }]} />
            <Txt variant="caption" color={color.labelSecondary} numberOfLines={2} style={styles.flex}>
              {`${tier.label} · ${visits} visit${visits === 1 ? '' : 's'}${look.foil ? ' · Foil' : ''}`}
            </Txt>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(toNext * 100)}%`, backgroundColor: metal }]} />
          </View>
        </View>

        {shines && <Shine id={ids.shine} width={width} />}
      </View>
    </View>
  );

  if (!onPress) {
    return (
      <View style={outer} accessible accessibilityLabel={label}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      // Fills its row's height, so cards side by side line up when one name takes two lines.
      style={({ pressed }) => [outer, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

/** Ids for this card's SVG gradients: unique on the page, and safe inside url(#…). */
function useSvgIds() {
  const base = useId().replace(/[^a-zA-Z0-9]/g, '');
  return { frame: `f${base}`, window: `w${base}`, foil: `o${base}`, shine: `s${base}`, ring: `r${base}` };
}

/** "RARE" and its pips, one per step up from Common. */
function RarityTag({ look }: { look: CardLook }) {
  const rank = rarityRank(look.rarity);
  return (
    <View style={styles.rarity}>
      <Txt variant="caption" color="#FFFFFF" numberOfLines={1} style={[face('bold'), styles.rarityText]}>
        {rarityLabel(look.rarity).toUpperCase()}
      </Txt>
      <View style={styles.pips}>
        {[0, 1, 2, 3, 4].map((at) => (
          <View key={at} style={[styles.pip, at <= rank && styles.pipOn]} />
        ))}
      </View>
    </View>
  );
}

/** The card's gem; a Foil card's has a rainbow ring. */
function GemBadge({ gem, foil, id, big }: { gem: CardLook['gem']; foil: boolean; id: string; big: boolean }) {
  const colors = gemInfo(gem).colors;
  const size = big ? 30 : 24;
  return (
    <View style={[styles.gemBadge, { width: size, height: size, borderRadius: size / 2 }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            {(foil ? PRISM : [colors[2], colors[2]]).map((stop, at, all) => (
              <Stop key={`${stop}${at}`} offset={at / (all.length - 1)} stopColor={stop} />
            ))}
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
        <Circle cx={size / 2} cy={size / 2} r={size / 2 - (foil ? 2.5 : 1.5)} fill={colors[0]} />
      </Svg>
      <Icon name="gem" size={big ? 15 : 12} color={colors[2]} />
    </View>
  );
}

/** The gym's own logo on a plate, else a member's photo, else "No photo supplied". */
function CardArt({ record, cover, name, width, height }: { record: GymRecord | null; cover: string | null; name: string; width: number; height: number }) {
  const uri = cover ? photoUrl(cover) : null;
  if (uri) return <Image source={{ uri }} style={styles.photo} resizeMode="cover" accessibilityLabel={`A member’s photo of ${name}`} />;
  return <Plate record={record} name={name} width={width} height={height} />;
}

function Plate({ record, name, width, height }: { record: GymRecord | null; name: string; width: number; height: number }) {
  if (!record) return <NoPhoto style={styles.noPhoto} />;
  return <RecordPlate record={record} name={name} width={width} height={height} />;
}

function RecordPlate({ record, name, width, height }: { record: GymRecord; name: string; width: number; height: number }) {
  const mark = useGymMark(record.location);
  if (!mark) return <NoPhoto style={styles.noPhoto} />;
  return (
    <View style={[styles.plate, { width, height }]}>
      <MarkImage mark={mark} name={name} width={width - space[6]} height={height - space[4]} area={width * height * 0.32} />
    </View>
  );
}

/** A Foil card's rainbow sheen over its window. */
function Foil({ id }: { id: string }) {
  return (
    <Svg style={[StyleSheet.absoluteFill, styles.noTouch]} width="100%" height="100%" preserveAspectRatio="none" pointerEvents="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="1" x2="1" y2="0">
          {PRISM.map((stop, at) => (
            <Stop key={stop} offset={at / (PRISM.length - 1)} stopColor={stop} stopOpacity={0.32} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

/** A band of light that sweeps across the card now and then (still, with Reduce Motion). */
function Shine({ id, width }: { id: string; width: number }) {
  const reduceMotion = useReducedMotion();
  const x = useSharedValue(-width);
  useEffect(() => {
    if (reduceMotion) return;
    x.value = withRepeat(
      withSequence(withDelay(1600 + Math.random() * 1400, withTiming(width * 1.4, { duration: 1100, easing: Easing.inOut(Easing.quad) })), withTiming(-width, { duration: 0 })),
      -1,
    );
  }, [reduceMotion, width, x]);
  const move = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { rotate: '18deg' }] }));
  if (reduceMotion) return null;
  return (
    <Animated.View style={[styles.shine, { width: width * 0.45 }, move, { pointerEvents: 'none' }]}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
            <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.42} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

/** A Legendary card's sparkles, twinkling in turn. */
function Sparkles({ big }: { big: boolean }) {
  const spots = [
    { top: '58%', left: '8%', size: big ? 16 : 12, delay: 0 },
    { top: '18%', left: '78%', size: big ? 12 : 9, delay: 500 },
    { top: '70%', left: '84%', size: big ? 14 : 10, delay: 1000 },
  ] as const;
  return (
    <>
      {spots.map((spot) => (
        <Twinkle key={spot.delay} {...spot} />
      ))}
    </>
  );
}

function Twinkle({ top, left, size, delay }: { top: `${number}%`; left: `${number}%`; size: number; delay: number }) {
  const reduceMotion = useReducedMotion();
  const glow = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    glow.value = withDelay(delay, withRepeat(withSequence(withTiming(0.25, { duration: 700 }), withTiming(1, { duration: 700 })), -1));
  }, [reduceMotion, delay, glow]);
  const style = useAnimatedStyle(() => ({ opacity: glow.value, transform: [{ scale: 0.8 + glow.value * 0.3 }] }));
  return (
    <Animated.View style={[styles.sparkle, { top, left }, style, { pointerEvents: 'none' }]}>
      <Icon name="sparkle" size={size} color="#FFFFFF" />
    </Animated.View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    // flexGrow, not flex: 1, so a card is as tall as its content on a phone too, and grows to
    // match its row in the collection's grid.
    outer: { flexGrow: 1 },
    frame: { flexGrow: 1, overflow: 'hidden' },
    inner: { flexGrow: 1, backgroundColor: color.card, overflow: 'hidden', borderCurve: 'continuous' },
    // Room at the top for the rarity tag, so it never covers the logo.
    window: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', paddingTop: WINDOW_TOP, paddingHorizontal: WINDOW_SIDE, paddingBottom: WINDOW_SIDE },
    photo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    plate: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: color.logoPlate },
    noPhoto: { alignSelf: 'stretch', flex: 1, borderRadius: radius.md, backgroundColor: color.card },
    topRow: { position: 'absolute', top: space[2], left: space[2], right: space[2], flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space[1] },
    rarity: {
      flexShrink: 1,
      gap: 3,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: radius.sm,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    rarityText: { fontSize: 10, lineHeight: 12, letterSpacing: 0.8 },
    pips: { flexDirection: 'row', gap: 3 },
    pip: { width: 5, height: 5, transform: [{ rotate: '45deg' }], backgroundColor: 'rgba(255, 255, 255, 0.3)' },
    pipOn: { backgroundColor: '#FFFFFF' },
    gemBadge: { alignItems: 'center', justifyContent: 'center' },
    body: { flexGrow: 1, gap: 2, padding: space[2], paddingHorizontal: space[3], paddingBottom: space[3] },
    tierRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    metalDot: { width: 8, height: 8, borderRadius: 4 },
    flex: { flex: 1 },
    track: { height: 5, borderRadius: 3, backgroundColor: color.fill, overflow: 'hidden', marginTop: 'auto' },
    fill: { height: '100%', borderRadius: 3 },
    shine: { position: 'absolute', top: '-50%', bottom: '-50%', left: 0 },
    sparkle: { position: 'absolute' },
    noTouch: { pointerEvents: 'none' },
    pressed: { transform: [{ scale: 0.97 }] },
  }),
);
