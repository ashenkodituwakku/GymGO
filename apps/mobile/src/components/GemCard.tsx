/**
 * A collected gym as a trading card. Its shape and metal say its rarity
 * (lib/cardShape.ts): rounded steel for Common, cut green corners for
 * Uncommon, notched blue for Rare, scooped purple with a second line for
 * Epic, and for Legendary scooped gold with a raised crest, a crown and
 * studs. Its colour is the gym's own: the face and the picture box take the
 * colour of the gym's logo or website icon (useBrandColour), or the card's
 * gem when that's black, white or grey or there's none. Rarer cards glow
 * and catch the light (a shine sweeps across Epic, Legendary and Foil
 * pictures), Legendary ones sparkle, and Foil ones have a rainbow sheen.
 *
 * The frame and shine are decoration around the gym's real picture, never a
 * stand-in for it: a gym with no logo or photo says "No photo supplied" in
 * the box. (A demo gym, being invented, shows its illustration, badged as
 * one.) Rarity is luck (see lib/rarity.ts), not a rating of the gym.
 */

import { useEffect, useId, useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { Pressable } from './motion';
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
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { cardPalette, type GymRecord, type Rarity } from '@gymgo/domain';
import { MarkImage, useBrandColour, useGymMark } from './BrandLogo';
import { Icon } from './Icon';
import { Illustration } from './Illustration';
import { NoPhoto, Txt } from './ui';
import { photoUrl } from '@/lib/api';
import { demoPicture } from '@/lib/gymPicture';
import { tierFor, type CollectedGym } from '@/lib/collection';
import { CARD_FRAMES, GLOW_ROOM, cardPadding, cardPath } from '@/lib/cardShape';
import { Flag } from './Flag';
import { haptic } from '@/lib/haptics';
import { PRISM, cardFor, gemInfo, rarityLabel, rarityRank, type CardLook } from '@/lib/rarity';
import { color, currentTheme, face, radius, space, themed } from '@/lib/theme';
import type { Tier } from '@/lib/collection';

/** Each visit tier's medal: the metal it's named after. */
export const TIER_METAL = themed(() => ({
  bronze: '#B0713A',
  silver: '#8E959E',
  gold: '#C9971C',
  platinum: '#3E9DB8',
})) as Record<Tier, string>;

/** A browser reads pass-through from the style; the prop is for a phone's SVG view, which doesn't. */
const SVG_NO_TOUCH = Platform.OS === 'web' ? null : { pointerEvents: 'none' as const };

export function GemCard({
  entry,
  record,
  cover,
  width,
  big = false,
  windowHeight,
  onPress,
  look: lookOverride,
  visits: visitsOverride,
}: {
  entry: CollectedGym;
  record: GymRecord | null;
  cover: string | null;
  width: number;
  /** The reveal and the card's own page: a bigger card with a taller picture. */
  big?: boolean;
  /** The picture box's height, when the space calls for another. */
  windowHeight?: number;
  onPress?: () => void;
  /** A friend's card: its look and visit count as their account worked them out, without the days. */
  look?: CardLook;
  visits?: number;
}) {
  const look = lookOverride ?? cardFor(entry);
  const gem = gemInfo(look.gem);
  const visits = visitsOverride ?? entry.days.length;
  const tier = tierFor(visits);
  const metal = TIER_METAL[tier.tier];
  const toNext = tier.next ? visits / (visits + tier.next.visits) : 1;
  const legendary = look.rarity === 'legendary';
  const shines = look.foil || rarityRank(look.rarity) >= rarityRank('epic');
  const spec = CARD_FRAMES[look.rarity];
  const pad = cardPadding(look.rarity);
  const brand = useBrandColour(record?.location ?? null);
  // The gym's own colour when its mark has one; the gem's otherwise.
  const palette = (brand ? cardPalette(brand) : null) ?? gem.colors;
  const ids = useSvgIds();
  const [height, setHeight] = useState(0);
  const artHeight = windowHeight ?? (big ? 150 : 92);
  const artWidth = width - pad.side * 2;
  // The header and the footer keep clear of the corners' curves and cuts.
  const clear = Math.max(0, pad.corner - pad.side);
  const label = `${entry.name}, ${entry.city}. ${rarityLabel(look.rarity)} ${gem.label}${look.foil ? ' foil' : ''} card. ${tier.label}, ${visits} visit${visits === 1 ? '' : 's'}${tier.next ? `, ${tier.next.visits} more to ${tier.next.label}` : ''}`;

  const body = (
    <View style={styles.fill} onLayout={(event) => setHeight(Math.round(event.nativeEvent.layout.height))}>
      {height > 0 && <CardFrame rarity={look.rarity} width={width} height={height} palette={palette} ids={ids} />}
      <View style={[styles.content, { paddingTop: pad.top, paddingHorizontal: pad.side, paddingBottom: pad.bottom }]}>
        {/* The rarity and the gem share one row, so on a narrow card they give way rather than overlap. */}
        <View style={[styles.header, { marginHorizontal: clear }]}>
          <RarityTag rarity={look.rarity} big={big} narrow={width < 156} />
          <GemBadge gem={look.gem} foil={look.foil} id={ids.ring} big={big} />
        </View>

        <View style={[styles.art, { height: artHeight, borderColor: spec.metal[legendary ? 1 : 2] }]}>
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" {...SVG_NO_TOUCH}>
            <Defs>
              <LinearGradient id={ids.window} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={palette[1]} />
                <Stop offset="1" stopColor={palette[2]} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${ids.window})`} />
          </Svg>
          <CardArt record={record} cover={cover} name={entry.name} width={artWidth - space[3] * 2} height={artHeight - space[3] * 2} />
          {look.foil && <Foil id={ids.foil} />}
          {legendary && <Sparkles big={big} />}
          {shines && <Shine id={ids.shine} width={artWidth} />}
        </View>

        <View style={styles.body}>
          <Txt variant={big ? 'title2' : 'headline'} numberOfLines={2}>
            {entry.name}
          </Txt>
          <View style={styles.place}>
            <Flag code={entry.countryCode} size={16} />
            <Txt variant="footnote" color={color.labelSecondary} numberOfLines={1} style={styles.flex}>
              {entry.city}
            </Txt>
          </View>
          <View style={styles.tierRow}>
            <View style={[styles.medal, { borderColor: metal }]}>
              <View style={[styles.medalDot, { backgroundColor: metal }]} />
              <Txt variant="caption" color={color.label} numberOfLines={1} style={face('semibold')}>
                {tier.label}
              </Txt>
            </View>
            {/* On a narrow card the count moves under the medal rather than being cut short. */}
            <Txt variant="caption" color={color.labelSecondary} numberOfLines={1}>
              {`${visits} visit${visits === 1 ? '' : 's'}${look.foil ? ' · Foil' : ''}`}
            </Txt>
          </View>
          <View style={[styles.progress, { marginHorizontal: clear / 2 }]}>
            <View style={styles.track}>
              <View style={[styles.trackFill, { width: `${Math.round(toNext * 100)}%`, backgroundColor: metal }]} />
            </View>
            <Txt variant="caption" color={color.labelSecondary} numberOfLines={1} style={styles.toNext}>
              {tier.next ? `${tier.next.visits} to ${tier.next.label}` : 'Top tier'}
            </Txt>
          </View>
        </View>
      </View>
    </View>
  );

  const outer = [styles.outer, { width }];
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
  return { metal: `m${base}`, face: `c${base}`, prism: `p${base}`, window: `w${base}`, foil: `o${base}`, shine: `s${base}`, ring: `r${base}` };
}

/**
 * The card's shape, drawn behind its content: a glow for Rare and up, the
 * metal frame with a bright bevel, the face in the card's colour, and each
 * rarity's own marks. Drawn a little bigger than the card, so the glow has
 * room; it never takes a touch.
 */
function CardFrame({ rarity, width, height, palette, ids }: { rarity: Rarity; width: number; height: number; palette: readonly [string, string, string]; ids: ReturnType<typeof useSvgIds> }) {
  const spec = CARD_FRAMES[rarity];
  const at = GLOW_ROOM;
  const outline = cardPath(rarity, width, height, 0, at, at);
  const faceLine = cardPath(rarity, width, height, spec.frame, at, at);
  const dark = currentTheme().scheme === 'dark';
  const [light, base, deep] = spec.metal;
  const legendary = rarity === 'legendary';
  // The face takes the gym's colour, enough to tell, never enough to fight the words on it.
  const tint = dark ? 0.24 : 0.13;
  return (
    <Svg style={[styles.frame, { left: -at, top: -at }]} width={width + at * 2} height={height + at * 2} {...SVG_NO_TOUCH}>
      <Defs>
        <LinearGradient id={ids.metal} x1="0" y1="0" x2="1" y2="1">
          {[light, base, deep, base, light].map((stop, index) => (
            <Stop key={index} offset={index / 4} stopColor={stop} />
          ))}
        </LinearGradient>
        <LinearGradient id={ids.face} x1="0" y1="0" x2="0.4" y2="1">
          <Stop offset="0" stopColor={palette[0]} stopOpacity={tint} />
          <Stop offset="0.55" stopColor={palette[1]} stopOpacity={tint * 0.55} />
          <Stop offset="1" stopColor={palette[2]} stopOpacity={tint * 0.3} />
        </LinearGradient>
        {legendary && (
          <LinearGradient id={ids.prism} x1="0" y1="0" x2="1" y2="1">
            {PRISM.map((stop, index) => (
              <Stop key={stop} offset={index / (PRISM.length - 1)} stopColor={stop} />
            ))}
          </LinearGradient>
        )}
      </Defs>

      {/* The glow: the outline drawn wide and faint a few times, so it follows the shape. */}
      {spec.glow > 0 &&
        [
          [18, 0.05],
          [12, 0.08],
          [7, 0.12],
        ].map(([strokeWidth, opacity]) => (
          <Path key={strokeWidth} d={outline} fill="none" stroke={base} strokeWidth={strokeWidth} strokeOpacity={opacity! * spec.glow * (dark ? 1.6 : 1)} strokeLinejoin="round" />
        ))}

      <Path d={outline} fill={`url(#${ids.metal})`} />
      {/* A bright bevel just inside the outline. */}
      <Path d={cardPath(rarity, width, height, 1, at, at)} fill="none" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={1} />
      <Path d={faceLine} fill={color.card} />
      <Path d={faceLine} fill={`url(#${ids.face})`} />
      <Path d={faceLine} fill="none" stroke={deep} strokeOpacity={0.55} strokeWidth={1} />

      {/* Rare: a fine line round the face. Epic: a second, brighter one. Legendary: a rainbow one. */}
      {rarity === 'rare' && <Path d={cardPath(rarity, width, height, spec.frame + 2.5, at, at)} fill="none" stroke={base} strokeOpacity={0.35} strokeWidth={1} />}
      {rarity === 'epic' && <Path d={cardPath(rarity, width, height, spec.frame + 3, at, at)} fill="none" stroke={base} strokeOpacity={0.6} strokeWidth={1.25} />}
      {legendary && <Path d={cardPath(rarity, width, height, spec.frame + 2.5, at, at)} fill="none" stroke={`url(#${ids.prism})`} strokeOpacity={0.85} strokeWidth={1.25} />}

      {legendary && <LegendaryMarks width={width} height={height} at={at} />}
    </Svg>
  );
}

/** A Legendary card's crown on its crest, and a stud in each scooped corner. */
function LegendaryMarks({ width, height, at }: { width: number; height: number; at: number }) {
  const spec = CARD_FRAMES.legendary;
  const [light, base, deep] = spec.metal;
  const crest = spec.crest ?? 0;
  const middle = at + width / 2;
  const crownWidth = 19;
  const crownHeight = 13;
  const crownTop = at + (crest + spec.frame - crownHeight) / 2 + 1;
  const left = middle - crownWidth / 2;
  const crown = [
    `M ${left} ${crownTop + crownHeight}`,
    `L ${left} ${crownTop + 3}`,
    `L ${left + crownWidth * 0.27} ${crownTop + 6.5}`,
    `L ${middle} ${crownTop}`,
    `L ${left + crownWidth * 0.73} ${crownTop + 6.5}`,
    `L ${left + crownWidth} ${crownTop + 3}`,
    `L ${left + crownWidth} ${crownTop + crownHeight}`,
    'Z',
  ].join(' ');
  // Each stud sits in the frame where a corner's scoop is deepest.
  const reach = (spec.corners.top.size + spec.frame / 2) / Math.SQRT2;
  const top = at + crest;
  const studs = [
    [at + reach, top + reach],
    [at + width - reach, top + reach],
    [at + width - reach, at + height - reach],
    [at + reach, at + height - reach],
  ];
  return (
    <G>
      <Path d={crown} fill={base} stroke={deep} strokeWidth={1.2} strokeLinejoin="round" />
      <Path d={`M ${left + 2} ${crownTop + crownHeight - 3.5} L ${left + crownWidth - 2} ${crownTop + crownHeight - 3.5}`} stroke={light} strokeWidth={1.2} />
      <Circle cx={middle} cy={crownTop + 1} r={1.6} fill={light} stroke={deep} strokeWidth={0.8} />
      {studs.map(([cx, cy]) => (
        <G key={`${cx}-${cy}`}>
          <Circle cx={cx} cy={cy} r={2.8} fill={base} stroke={deep} strokeWidth={0.9} />
          <Circle cx={cx! - 0.8} cy={cy! - 0.8} r={1} fill={light} />
        </G>
      ))}
    </G>
  );
}

/** "RARE" on the rarity's own metal, and on a big card its pips, one per step up from Common. */
function RarityTag({ rarity, big, narrow }: { rarity: Rarity; big: boolean; narrow: boolean }) {
  const rank = rarityRank(rarity);
  const [, base, deep] = CARD_FRAMES[rarity].metal;
  return (
    <View style={[styles.rarity, narrow && styles.rarityNarrow, { backgroundColor: deep, borderColor: base }]}>
      <Txt variant="caption" color="#FFFFFF" numberOfLines={1} style={[face('bold'), styles.rarityText, narrow && styles.rarityTextNarrow, big && styles.rarityTextBig]}>
        {rarityLabel(rarity).toUpperCase()}
      </Txt>
      {/* On a small card the shape and metal say it already, and the word needs the room. */}
      {big && (
        <View style={styles.pips}>
          {[0, 1, 2, 3, 4].map((step) => (
            <View key={step} style={[styles.pip, step <= rank && styles.pipOn]} />
          ))}
        </View>
      )}
    </View>
  );
}

/** The card's gem; a Foil card's has a rainbow ring. */
function GemBadge({ gem, foil, id, big }: { gem: CardLook['gem']; foil: boolean; id: string; big: boolean }) {
  const colors = gemInfo(gem).colors;
  const size = big ? 28 : 22;
  return (
    <View style={[styles.gemBadge, { width: size, height: size, borderRadius: size / 2 }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill} {...SVG_NO_TOUCH}>
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
      <Icon name="gem" size={big ? 14 : 11} color={colors[2]} />
    </View>
  );
}

/** A member's photo, else a demo gym's illustration, else the gym's own logo on a plate, else "No photo supplied". */
function CardArt({ record, cover, name, width, height }: { record: GymRecord | null; cover: string | null; name: string; width: number; height: number }) {
  const uri = cover ? photoUrl(cover) : null;
  if (uri) return <Image source={{ uri }} style={styles.photo} resizeMode="cover" accessibilityLabel={`A member’s photo of ${name}`} />;
  const illustration = demoPicture(record?.location);
  if (illustration) return <Illustration picture={illustration} style={styles.photo} />;
  return <Plate record={record} name={name} width={width} height={height} />;
}

/** Below this, "No photo supplied" goes without its picture icon, which wouldn't fit. */
const ROOM_FOR_ICON = 64;

function Plate({ record, name, width, height }: { record: GymRecord | null; name: string; width: number; height: number }) {
  if (!record) return <NoPhoto compact={height < ROOM_FOR_ICON} name={name} onColour style={styles.noPhoto} />;
  return <RecordPlate record={record} name={name} width={width} height={height} />;
}

function RecordPlate({ record, name, width, height }: { record: GymRecord; name: string; width: number; height: number }) {
  const mark = useGymMark(record.location);
  if (!mark) return <NoPhoto compact={height < ROOM_FOR_ICON} name={name} onColour style={styles.noPhoto} />;
  return (
    <View style={[styles.plate, { width, height }]}>
      <MarkImage mark={mark} name={name} width={width - space[5]} height={height - space[3]} area={width * height * 0.34} />
    </View>
  );
}

/** A Foil card's rainbow sheen over its picture. */
function Foil({ id }: { id: string }) {
  return (
    <Svg style={[StyleSheet.absoluteFill, styles.noTouch]} width="100%" height="100%" preserveAspectRatio="none" {...SVG_NO_TOUCH}>
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

/** A band of light that sweeps across the picture now and then (still, with Reduce Motion). */
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
    <Animated.View style={[styles.shine, { width: width * 0.45 }, move, styles.noTouch]}>
      <Svg width="100%" height="100%" preserveAspectRatio="none" {...SVG_NO_TOUCH}>
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
    { top: '62%', left: '6%', size: big ? 16 : 12, delay: 0 },
    { top: '10%', left: '82%', size: big ? 12 : 9, delay: 500 },
    { top: '70%', left: '86%', size: big ? 14 : 10, delay: 1000 },
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
    <Animated.View style={[styles.sparkle, { top, left }, style, styles.noTouch]}>
      <Icon name="sparkle" size={size} color="#FFFFFF" />
    </Animated.View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    // flexGrow, not flex: 1, so a card is as tall as its content on a phone too, and grows to
    // match its row in the collection's grid.
    outer: { flexGrow: 1 },
    fill: { flexGrow: 1 },
    frame: { position: 'absolute', pointerEvents: 'none' },
    content: { flexGrow: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space[1], marginBottom: 6, minHeight: 22 },
    art: {
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderRadius: radius.md,
      borderCurve: 'continuous',
      borderWidth: 1,
      padding: space[3],
    },
    photo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    plate: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, borderCurve: 'continuous', backgroundColor: color.logoPlate },
    noPhoto: { alignSelf: 'stretch', flex: 1, borderRadius: radius.sm },
    rarity: {
      flexShrink: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 999,
      borderWidth: 1,
    },
    rarityText: { fontSize: 10, lineHeight: 12, letterSpacing: 0.8, flexShrink: 1 },
    rarityTextBig: { fontSize: 11, lineHeight: 13 },
    // A phone 320 points wide: "LEGENDARY" still fits beside the gem.
    rarityNarrow: { paddingHorizontal: 5 },
    rarityTextNarrow: { letterSpacing: 0.2 },
    pips: { flexDirection: 'row', gap: 2.5 },
    pip: { width: 4.5, height: 4.5, transform: [{ rotate: '45deg' }], backgroundColor: 'rgba(255, 255, 255, 0.3)' },
    pipOn: { backgroundColor: '#FFFFFF' },
    gemBadge: { alignItems: 'center', justifyContent: 'center' },
    body: { flexGrow: 1, gap: 2, paddingTop: space[2], paddingHorizontal: 2 },
    place: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    tierRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 6, rowGap: 2, marginTop: 4 },
    medal: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999, borderWidth: 1 },
    medalDot: { width: 7, height: 7, borderRadius: 4 },
    flex: { flex: 1 },
    progress: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 'auto', paddingTop: 6 },
    track: { flex: 1, height: 5, borderRadius: 3, backgroundColor: color.fill, overflow: 'hidden' },
    trackFill: { height: '100%', borderRadius: 3 },
    toNext: { fontSize: 11 },
    shine: { position: 'absolute', top: '-50%', bottom: '-50%', left: 0 },
    sparkle: { position: 'absolute' },
    noTouch: { pointerEvents: 'none' },
    pressed: { transform: [{ scale: 0.97 }] },
  }),
);
