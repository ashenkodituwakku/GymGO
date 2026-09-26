/**
 * The GymGO logo, drawn once here and exported to every size the app needs.
 *
 * The mark is a G made from a weight plate, whose crossbar is an arrow on its
 * way out: a gym, and going to it. It is one colour, so it survives as a
 * tinted iOS icon and an Android themed icon, and it is simple enough to
 * read at favicon size.
 *
 * The wordmark's letters are Inter ExtraBold (SIL Open Font Licence, which
 * allows this), already turned into outlines below, so nothing here needs
 * the font installed.
 *
 *   node scripts/brand-mark.mjs
 *
 * writes assets/brand/*.svg (the sources) and assets/images/*.png (what
 * app.json points at), and src/components/brandPaths.ts, the same shapes
 * for the app to draw itself.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const brandDir = join(here, '..', 'assets', 'brand');
const imageDir = join(here, '..', 'assets', 'images');
const pathsFile = join(here, '..', 'src', 'components', 'brandPaths.ts');

/** GymGO indigo (the app's brand colour), and its dark-mode tint. */
const INDIGO = '#5856D6';
const INDIGO_DARK = '#7D7AFF';
/** The icon's background: the same indigo, lit from above. */
const TOP = '#7472F2';
const BOTTOM = '#4B49C4';
const INK = '#1C1C1E';

// --- The mark, on a 1024 square ----------------------------------------------

const C = { x: 452, y: 512 }; // the ring's centre, left of middle to make room for the arrow
const R = 232; // the ring's radius, to the middle of its stroke
const STROKE = 136; // a plate's thickness
const OPEN = -58; // where the G's top end stops, in degrees from three o'clock
const HEAD = 150; // half the arrowhead's height
const BASE = C.x + 262; // where the arrowhead starts
const TIP = C.x + 432; // its point
const SOFT = 22; // rounding on the arrow's corners
// How much of an app icon the mark fills: room to breathe, as Apple's grid has.
const ICON = 0.86;
const h = STROKE / 2;

const at = (degrees) => {
  const a = (degrees * Math.PI) / 180;
  return `${(C.x + R * Math.cos(a)).toFixed(1)} ${(C.y + R * Math.sin(a)).toFixed(1)}`;
};

/** The plate: from the G's top end, the long way round to three o'clock. */
export const PLATE = `M ${at(OPEN)} A ${R} ${R} 0 1 0 ${at(0)}`;
/** The crossbar, heading out as an arrow. */
export const ARROW = `M ${C.x} ${C.y - h} H ${BASE} V ${C.y - HEAD} L ${TIP} ${C.y} L ${BASE} ${C.y + HEAD} V ${C.y + h} H ${C.x} Z`;

/** The mark in one colour, as SVG elements on the 1024 square. */
function mark(fill) {
  return (
    `<path d="${PLATE}" fill="none" stroke="${fill}" stroke-width="${STROKE}" stroke-linecap="round"/>` +
    `<path d="${ARROW}" fill="${fill}" stroke="${fill}" stroke-width="${SOFT}" stroke-linejoin="round"/>`
  );
}

/** The mark's own box on the 1024 square, for cropping. */
const BOX = { x: C.x - R - h, y: C.y - R - h, width: TIP + SOFT / 2 - (C.x - R - h), height: 2 * (R + h) };

const svg = (viewBox, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`;
const scaled = (scale, body) => `<g transform="translate(512 512) scale(${scale}) translate(-512 -512)">${body}</g>`;
const background =
  `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${TOP}"/>` +
  `<stop offset="1" stop-color="${BOTTOM}"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#sky)"/>`;

// --- The wordmark: the mark, then "GymGO" --------------------------------------

// Inter ExtraBold at 100 px, baseline at 0, tracked -2%.
const GYM = 'M38.92 0.98L38.92 0.98Q28.56 0.98 20.70-3.54Q12.84-8.06 8.42-16.41Q4.00-24.76 4.00-36.23L4.00-36.23Q4.00-48.14 8.67-56.52Q13.33-64.89 21.17-69.31Q29.00-73.73 38.72-73.73L38.72-73.73Q45.02-73.73 50.42-71.92Q55.81-70.12 60.03-66.80Q64.26-63.48 66.87-58.96Q69.48-54.44 70.17-49.02L70.17-49.02L52.73-49.02Q52.10-51.27 50.90-53.05Q49.71-54.83 47.95-56.08Q46.19-57.32 43.97-57.96Q41.75-58.59 39.01-58.59L39.01-58.59Q33.74-58.59 29.81-56.01Q25.88-53.42 23.75-48.46Q21.63-43.51 21.63-36.47L21.63-36.47Q21.63-29.39 23.71-24.41Q25.78-19.43 29.69-16.80Q33.59-14.16 39.06-14.16L39.06-14.16Q43.99-14.16 47.39-15.77Q50.78-17.38 52.54-20.39Q54.30-23.39 54.30-27.44L54.30-27.44L57.57-27.00L39.75-27.00L39.75-39.65L70.95-39.65L70.95-30.08Q70.95-20.36 66.85-13.40Q62.74-6.45 55.49-2.73Q48.24 0.98 38.92 0.98ZM78.71 19.14L78.71 19.14L82.52 6.69L84.67 7.28Q87.75 8.06 90.07 7.71Q92.38 7.37 93.63 6.01Q94.88 4.64 94.73 2.39L94.73 2.39L94.68 0.10L74.32-54.59L92.29-54.59L100.44-27.88Q102.10-22.41 103.05-16.89Q104.01-11.38 105.32-5.03L105.32-5.03L101.81-5.03Q103.13-11.38 104.45-16.94Q105.76-22.51 107.47-27.88L107.47-27.88L116.21-54.59L133.99-54.59L111.09 5.76Q109.43 10.16 106.74 13.55Q104.05 16.94 99.88 18.87Q95.71 20.80 89.55 20.80L89.55 20.80Q86.43 20.80 83.52 20.34Q80.62 19.87 78.71 19.14ZM155.72 0L138.68 0L138.68-54.59L154.35-54.59L155.33-40.43L154.15-40.43Q155.42-45.75 157.94-49.02Q160.45-52.29 163.80-53.81Q167.14-55.32 170.85-55.32L170.85-55.32Q176.71-55.32 180.30-51.56Q183.89-47.80 185.84-39.26L185.84-39.26L183.94-39.26Q185.26-44.97 188.09-48.54Q190.92-52.10 194.73-53.71Q198.54-55.32 202.64-55.32L202.64-55.32Q207.77-55.32 211.70-53.10Q215.63-50.88 217.88-46.75Q220.12-42.63 220.12-36.82L220.12-36.82L220.12 0L203.13 0L203.13-32.96Q203.13-37.11 200.96-39.26Q198.78-41.41 195.41-41.41L195.41-41.41Q193.02-41.41 191.24-40.33Q189.46-39.26 188.53-37.33Q187.60-35.40 187.60-32.76L187.60-32.76L187.60 0L171.24 0L171.24-33.20Q171.24-36.96 169.14-39.18Q167.04-41.41 163.63-41.41L163.63-41.41Q161.28-41.41 159.50-40.33Q157.72-39.26 156.72-37.28Q155.72-35.30 155.72-32.42L155.72-32.42L155.72 0Z';
const GO = 'M262.70 0.98L262.70 0.98Q252.35 0.98 244.49-3.54Q236.63-8.06 232.21-16.41Q227.79-24.76 227.79-36.23L227.79-36.23Q227.79-48.14 232.45-56.52Q237.12-64.89 244.95-69.31Q252.79-73.73 262.51-73.73L262.51-73.73Q268.80-73.73 274.20-71.92Q279.60-70.12 283.82-66.80Q288.04-63.48 290.66-58.96Q293.27-54.44 293.95-49.02L293.95-49.02L276.52-49.02Q275.88-51.27 274.69-53.05Q273.49-54.83 271.73-56.08Q269.98-57.32 267.75-57.96Q265.53-58.59 262.80-58.59L262.80-58.59Q257.53-58.59 253.59-56.01Q249.66-53.42 247.54-48.46Q245.42-43.51 245.42-36.47L245.42-36.47Q245.42-29.39 247.49-24.41Q249.57-19.43 253.47-16.80Q257.38-14.16 262.85-14.16L262.85-14.16Q267.78-14.16 271.17-15.77Q274.57-17.38 276.32-20.39Q278.08-23.39 278.08-27.44L278.08-27.44L281.35-27.00L263.53-27.00L263.53-39.65L294.73-39.65L294.73-30.08Q294.73-20.36 290.63-13.40Q286.53-6.45 279.28-2.73Q272.03 0.98 262.70 0.98ZM335.70 0.98L335.70 0.98Q325.89 0.98 318.05-3.37Q310.21-7.71 305.62-16.06Q301.03-24.41 301.03-36.33L301.03-36.33Q301.03-48.34 305.62-56.69Q310.21-65.04 318.05-69.38Q325.89-73.73 335.70-73.73L335.70-73.73Q345.47-73.73 353.30-69.38Q361.14-65.04 365.71-56.69Q370.27-48.34 370.27-36.33L370.27-36.33Q370.27-24.37 365.71-16.02Q361.14-7.67 353.30-3.34Q345.47 0.98 335.70 0.98ZM335.70-14.16L335.70-14.16Q340.97-14.16 344.78-16.70Q348.59-19.24 350.64-24.19Q352.69-29.15 352.69-36.33L352.69-36.33Q352.69-43.55 350.64-48.54Q348.59-53.52 344.78-56.05Q340.97-58.59 335.70-58.59L335.70-58.59Q330.38-58.59 326.57-56.03Q322.76-53.47 320.71-48.51Q318.66-43.55 318.66-36.33L318.66-36.33Q318.66-29.15 320.71-24.22Q322.76-19.29 326.57-16.72Q330.38-14.16 335.70-14.16Z';
const TEXT_WIDTH = 374.32;
const CAP = 72.75;
const DESCENT = 20.80;

function wordmark(markFill, gymFill, goFill) {
  // The mark stands a little taller than the capitals, centred on them.
  const markHeight = CAP * 1.3;
  const s = markHeight / BOX.height;
  const markWidth = BOX.width * s;
  const gap = CAP * 0.28;
  const baseline = (markHeight + CAP) / 2;
  const pad = 4;
  const width = pad + markWidth + gap + TEXT_WIDTH + pad;
  const height = pad + Math.max(markHeight, baseline + DESCENT) + pad;
  const markAt = `translate(${pad} ${pad}) scale(${s.toFixed(5)}) translate(${-BOX.x} ${-BOX.y})`;
  const textAt = `translate(${(pad + markWidth + gap).toFixed(2)} ${(pad + baseline).toFixed(2)})`;
  return svg(
    `0 0 ${width.toFixed(1)} ${height.toFixed(1)}`,
    `<g transform="${markAt}">${mark(markFill)}</g>` +
      `<g transform="${textAt}"><path d="${GYM}" fill="${gymFill}"/><path d="${GO}" fill="${goFill}"/></g>`,
  );
}

// --- Write ----------------------------------------------------------------------

mkdirSync(brandDir, { recursive: true });
mkdirSync(imageDir, { recursive: true });

const icon = svg('0 0 1024 1024', background + scaled(ICON, mark('#FFFFFF')));
const sources = {
  'gymgo-icon.svg': icon,
  'gymgo-mark.svg': svg(`${BOX.x} ${BOX.y} ${BOX.width} ${BOX.height}`, mark(INDIGO)),
  'gymgo-wordmark.svg': wordmark(INDIGO, INK, INDIGO),
  'gymgo-wordmark-dark.svg': wordmark(INDIGO_DARK, '#FFFFFF', INDIGO_DARK),
};
for (const [name, body] of Object.entries(sources)) writeFileSync(join(brandDir, name), `${body}\n`);

// The same shapes for the app to draw itself (src/components/BrandMark.tsx).
const markHeight = CAP * 1.3;
writeFileSync(
  pathsFile,
  `/** Written by scripts/brand-mark.mjs: GymGO's mark and wordmark, as paths. Edit the script, not this. */

/** The mark on the app icon's 1024 square: the plate (a stroke) and the arrow (a fill). */
export const MARK = {
  plate: '${PLATE}',
  plateWidth: ${STROKE},
  arrow: '${ARROW}',
  arrowRounding: ${SOFT},
  box: { x: ${BOX.x}, y: ${BOX.y}, width: ${BOX.width}, height: ${BOX.height} },
  /** How much of the app icon it fills. */
  iconScale: ${ICON},
} as const;

/** The app icon's background, top to bottom. */
export const ICON_SKY = ['${TOP}', '${BOTTOM}'] as const;

/** "GymGO" in Inter ExtraBold at 100 px, baseline at 0. */
export const WORDMARK = {
  gym: '${GYM}',
  go: '${GO}',
  width: ${TEXT_WIDTH},
  cap: ${CAP},
  descent: ${DESCENT},
  /** The mark beside it: this tall, this far from the G, centred on the capitals. */
  markHeight: ${markHeight.toFixed(2)},
  gap: ${(CAP * 0.28).toFixed(2)},
} as const;
`,
);

/** A square PNG from SVG, drawn large and scaled down for clean edges. */
async function png(name, body, size) {
  await sharp(Buffer.from(body), { density: Math.max(72, (72 * size * 2) / 1024) })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(join(imageDir, name));
}

// Android shows a launcher icon's middle two-thirds whatever its mask, so the
// mark sits inside that circle.
const safe = (body) => scaled(0.76, body);

await png('icon.png', icon, 1024);
// iOS dark and tinted icons: the system draws the background.
await png('icon-dark.png', svg('0 0 1024 1024', scaled(ICON, mark(INDIGO_DARK))), 1024);
await png('icon-tinted.png', svg('0 0 1024 1024', scaled(ICON, mark('#FFFFFF'))), 1024);
await png('adaptive-icon.png', svg('0 0 1024 1024', safe(mark('#FFFFFF'))), 1024);
await png('adaptive-background.png', svg('0 0 1024 1024', background), 1024);
await png('monochrome-icon.png', svg('0 0 1024 1024', safe(mark('#FFFFFF'))), 1024);
await png('splash-icon.png', svg('0 0 1024 1024', mark(INDIGO)), 512);
await png('splash-icon-dark.png', svg('0 0 1024 1024', mark(INDIGO_DARK)), 512);
// The browser tab: the whole icon with the rounded corners a tab doesn't
// add, and the mark a little bigger, since a tab shows it at 16 px.
await png(
  'favicon.png',
  svg('0 0 1024 1024', `<clipPath id="round"><rect width="1024" height="1024" rx="230"/></clipPath><g clip-path="url(#round)">${background}${scaled(0.94, mark('#FFFFFF'))}</g>`),
  48,
);

console.log(`wrote ${Object.keys(sources).length} SVGs to assets/brand and 9 PNGs to assets/images`);
