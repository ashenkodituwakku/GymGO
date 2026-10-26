/**
 * Emoji as pictures: Google's Noto 3D set (assets/emoji and assets/flags,
 * copied by scripts/noto-emoji.mjs), so an emoji and a country's flag look
 * the same on an iPhone, an Android phone, Windows and the website. Noto's
 * files are named by an emoji's code points; these work the names out.
 *
 * No React Native here, so it is unit-tested in Node.
 */

/** The variation selector that asks for emoji presentation ("🕹️"); Noto's names leave it out. */
const EMOJI_PRESENTATION = 0xfe0f;

/** Noto's name for an emoji: its code points in hex, at least four digits, joined by "_" ("1f4aa", "1f3cb_200d_2642"). */
export function emojiKey(text: string): string {
  return [...text]
    .map((char) => char.codePointAt(0)!)
    .filter((point) => point !== EMOJI_PRESENTATION)
    .map((point) => point.toString(16).padStart(4, '0'))
    .join('_');
}

/** A country's flag as an emoji (regional indicator letters), or '' for anything but a two-letter code. */
export function flagEmoji(code: string): string {
  const upper = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return '';
  return String.fromCodePoint(...[...upper].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65));
}
