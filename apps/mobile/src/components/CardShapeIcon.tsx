/**
 * A card's rarity as a small picture of its card: the rarity's shape
 * (lib/cardShape.ts) in its metal. Beside a card's name in a list or a
 * line, and in Collection's rarity filter.
 */

import { useId } from 'react';
import { Platform } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import type { Rarity } from '@gymgo/domain';
import { CARD_FRAMES, cardPath } from '@/lib/cardShape';

/** Drawn at 120 × 160 and scaled, so the corners keep their proportions at any size. */
const WIDE = 120;
const TALL = 160;

export function CardShapeIcon({ rarity, height = 17 }: { rarity: Rarity; height?: number }) {
  const [light, base, deep] = CARD_FRAMES[rarity].metal;
  const id = `shape${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg
      width={(height * WIDE) / TALL}
      height={height}
      viewBox={`0 0 ${WIDE} ${TALL}`}
      // A browser reads pass-through from the style; the prop is for a phone's SVG view.
      {...(Platform.OS === 'web' ? null : { pointerEvents: 'none' as const })}
      style={{ pointerEvents: 'none' }}
      aria-hidden
    >
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={light} />
          <Stop offset="0.5" stopColor={base} />
          <Stop offset="1" stopColor={deep} />
        </LinearGradient>
      </Defs>
      <Path d={cardPath(rarity, WIDE, TALL)} fill={`url(#${id})`} stroke={deep} strokeWidth={6} />
    </Svg>
  );
}
