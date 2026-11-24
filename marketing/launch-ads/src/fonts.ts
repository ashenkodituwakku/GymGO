/**
 * Inter, the app's own typeface (SIL Open Font Licence, public/fonts/OFL.txt),
 * loaded from the project before any frame is drawn, so no frame shows a
 * stand-in font. The emoji come from the machine's Noto Color Emoji.
 */

import { continueRender, delayRender, staticFile } from 'remotion';

const FACES: Array<[string, string]> = [
  ['600', 'Inter_600SemiBold.ttf'],
  ['700', 'Inter_700Bold.ttf'],
  ['800', 'Inter_800ExtraBold.ttf'],
  ['900', 'Inter_900Black.otf'],
];

const waiting = delayRender('Loading Inter');

Promise.all(
  FACES.map(async ([weight, file]) => {
    const face = new FontFace('Inter', `url(${staticFile(`fonts/${file}`)})`, { weight });
    await face.load();
    document.fonts.add(face);
  }),
).then(
  () => continueRender(waiting),
  (error) => {
    // A missing font is a broken render, not a quiet fallback.
    throw error;
  },
);
