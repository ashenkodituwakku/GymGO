/**
 * An emoji, or a country's flag, as Google's Noto 3D picture (lib/emoji.ts,
 * assets/emoji/LICENSE.txt), so it looks the same on every phone, computer
 * and the website. An emoji or a flag the app doesn't carry is drawn as
 * text, as the system draws it.
 *
 * Decoration unless given a label: the row or button it sits in says what
 * it is.
 */

import { Image, Text } from 'react-native';
import { emojiKey, flagEmoji } from '@/lib/emoji';
import { EMOJI_IMAGES, FLAG_IMAGES } from '@/lib/emojiImages';

const HIDDEN = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants', 'aria-hidden': true } as const;

const labelled = (label: string | undefined) => (label ? ({ accessible: true, accessibilityRole: 'image', accessibilityLabel: label } as const) : HIDDEN);

export function Emoji({ char, size, label }: { char: string; size: number; label?: string }) {
  const source = EMOJI_IMAGES[emojiKey(char)];
  if (!source) {
    return (
      <Text style={{ fontSize: size * 0.85, lineHeight: size }} {...labelled(label)}>
        {char}
      </Text>
    );
  }
  return <Image source={source} style={{ width: size, height: size }} resizeMode="contain" {...labelled(label)} />;
}

/** Whether there's a flag picture for this country. */
export const hasFlag = (code: string): boolean => Boolean(FLAG_IMAGES[code.toUpperCase()]);

export function Flag({ code, size, label }: { code: string; size: number; label?: string }) {
  const source = FLAG_IMAGES[code.toUpperCase()];
  if (!source) return flagEmoji(code) ? <Emoji char={flagEmoji(code)} size={size} label={label} /> : null;
  return <Image source={source} style={{ width: size, height: size }} resizeMode="contain" {...labelled(label)} />;
}
