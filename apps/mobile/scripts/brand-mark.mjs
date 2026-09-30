/**
 * The GymGO logo, in every size and form the app and the web site need.
 *
 * The logo is a white G whose crossbar turns into an arrow heading out (a
 * gym, and going to it) on a blue-to-violet gradient. The original is a
 * picture, assets/brand/gymgo-logo.jpg, and everything else is made from it:
 * the icons that are the whole picture are it resized, and those that want
 * the G alone (iOS dark and tinted, Android's layers and themed icon) lift
 * the G off its background, which is easy, as the G is white and the
 * background saturated blue.
 *
 * The wordmark's letters are Inter ExtraBold (SIL Open Font Licence, which
 * allows this), already turned into outlines below, so nothing here needs
 * the font installed.
 *
 *   node scripts/brand-mark.mjs
 *
 * writes assets/images/*.png (what app.json points at, and the badge the app
 * shows), the web site's icons in apps/web/src/app, and
 * src/components/brandPaths.ts (the wordmark's letters and the logo's
 * violet). To change the logo, replace gymgo-logo.jpg and run it again;
 * don't edit the outputs by hand.
 */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const logoFile = join(here, '..', 'assets', 'brand', 'gymgo-logo.jpg');
const imageDir = join(here, '..', 'assets', 'images');
const webDir = join(here, '..', '..', 'web', 'src', 'app');
const pathsFile = join(here, '..', 'src', 'components', 'brandPaths.ts');

const { data: rgb, info } = await sharp(logoFile).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const N = info.width;
if (info.height !== N) throw new Error(`The logo should be square, not ${info.width}x${info.height}.`);
const count = N * N;
const clamp01 = (v) => Math.min(1, Math.max(0, v));

// --- The G, lifted off its background -------------------------------------------

// The lesser of a pixel's red and green is low in the saturated blue
// background and high in the white G. It's no simple cut-off, though: the
// background is lightest (121) in its top-left corner, and the G's fold,
// shaded blue, is as dark as 101 in places. What sets them apart is the G's
// sharp outline. So the background is found by spreading out from the
// picture's edges and its darkest pixels, which only the background has, to
// each neighbour only a little lighter or darker, never across the outline.
const bright = new Uint8Array(count);
for (let i = 0; i < count; i++) bright[i] = Math.min(rgb[3 * i], rgb[3 * i + 1]);
const SURELY_BACKGROUND = 70; // the G is never this dark
const SURELY_G = 150; // nor the background this light
const SMOOTH = 12; // the most the background changes from one pixel to the next

const neighbours = (i) => {
  const x = i % N;
  return [x > 0 ? i - 1 : -1, x < N - 1 ? i + 1 : -1, i - N, i + N].filter((j) => j >= 0 && j < count);
};

const queue = new Int32Array(count);
/** Marks in `into` the pixels reached from `from`, crossing to each neighbour `joins` allows, and returns them. */
function spread(from, joins, into) {
  let tail = 0;
  for (const i of from) (into[i] = 1), (queue[tail++] = i);
  for (let head = 0; head < tail; head++) {
    for (const j of neighbours(queue[head])) if (!into[j] && joins(queue[head], j)) (into[j] = 1), (queue[tail++] = j);
  }
  return queue.slice(0, tail);
}

const background = new Uint8Array(count);
{
  const seeds = [];
  for (let i = 0; i < count; i++) {
    const x = i % N;
    const y = (i - x) / N;
    const edge = x === 0 || y === 0 || x === N - 1 || y === N - 1;
    if (bright[i] < SURELY_G && (edge || bright[i] < SURELY_BACKGROUND)) seeds.push(i);
  }
  spread(seeds, (i, j) => bright[j] < SURELY_G && Math.abs(bright[j] - bright[i]) <= SMOOTH, background);
}
// Specks in the background that it didn't spread over (noise from the
// picture's compression) aren't G: the G is one piece, the biggest.
{
  const seen = Uint8Array.from(background);
  const pieces = [];
  for (let i = 0; i < count; i++) if (!seen[i]) pieces.push(spread([i], (_, j) => !background[j], seen));
  pieces.sort((p, q) => q.length - p.length);
  for (const piece of pieces.slice(1)) for (const i of piece) background[i] = 1;
}

/** How much of each pixel is G, and the G's own colour there. */
const alpha = new Float32Array(count);
const ink = new Uint8Array(count * 3);
for (let y = 0; y < N; y++) {
  for (let x = 0; x < N; x++) {
    const i = y * N + x;
    // Along the outline a pixel is part G, part background: how much of
    // each, from the G and the background beside it. It takes the colour
    // of the G's.
    let lo = 255;
    let hi = -1;
    let from = i;
    let outline = false;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const j = Math.min(N - 1, Math.max(0, y + dy)) * N + Math.min(N - 1, Math.max(0, x + dx));
        if (background[j] !== background[i]) outline = true;
        if (!background[j] && bright[j] > hi) (hi = bright[j]), (from = j);
        if (background[j] && bright[j] < lo) lo = bright[j];
      }
    }
    if (!outline) {
      if (!background[i]) (alpha[i] = 1), ink.set(rgb.subarray(3 * i, 3 * i + 3), 3 * i);
      continue;
    }
    alpha[i] = hi > lo ? clamp01((bright[i] - lo) / (hi - lo)) : 0;
    ink.set(rgb.subarray(3 * from, 3 * from + 3), 3 * i);
  }
}

const luminance = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
let deepest = 255;
for (let i = 0; i < count; i++) {
  if (alpha[i] === 1) deepest = Math.min(deepest, luminance(ink[3 * i], ink[3 * i + 1], ink[3 * i + 2]));
}
/** The G's shading at a pixel: 0 in the deepest fold, 1 where it's whitest. */
const shade = (i) => clamp01((luminance(ink[3 * i], ink[3 * i + 1], ink[3 * i + 2]) - deepest) / (255 - deepest));

// --- The background, without the G ------------------------------------------------

// A smooth fit to the gradient, a cubic in x and y for each colour, from
// every pixel well clear of the G and the shadow it casts.
const CLEAR = 64;
const nearG = new Uint8Array(count);
{
  const across = new Uint8Array(count);
  for (let y = 0; y < N; y++) {
    for (let x = 0, last = -Infinity; x < N; x++) (last = alpha[y * N + x] > 0 ? x : last), x - last <= CLEAR && (across[y * N + x] = 1);
    for (let x = N - 1, last = Infinity; x >= 0; x--) (last = alpha[y * N + x] > 0 ? x : last), last - x <= CLEAR && (across[y * N + x] = 1);
  }
  for (let x = 0; x < N; x++) {
    for (let y = 0, last = -Infinity; y < N; y++) (last = across[y * N + x] ? y : last), y - last <= CLEAR && (nearG[y * N + x] = 1);
    for (let y = N - 1, last = Infinity; y >= 0; y--) (last = across[y * N + x] ? y : last), last - y <= CLEAR && (nearG[y * N + x] = 1);
  }
}

/** Across the picture, -1 to 1. */
const unit = (p) => (2 * p + 1) / N - 1;
const terms = (u, v) => [1, u, v, u * u, u * v, v * v, u * u * u, u * u * v, u * v * v, v * v * v];
const K = terms(0, 0).length;

/** Least squares, by the normal equations: A x = b for each colour. */
const A = Array.from({ length: K }, () => new Float64Array(K));
const b = Array.from({ length: 3 }, () => new Float64Array(K));
for (let y = 0; y < N; y += 2) {
  for (let x = 0; x < N; x += 2) {
    const i = y * N + x;
    if (nearG[i]) continue;
    const t = terms(unit(x), unit(y));
    for (let r = 0; r < K; r++) {
      for (let c = 0; c < K; c++) A[r][c] += t[r] * t[c];
      for (let ch = 0; ch < 3; ch++) b[ch][r] += t[r] * rgb[3 * i + ch];
    }
  }
}

function solve(matrix, rhs) {
  const m = matrix.map((row, r) => [...row, rhs[r]]);
  for (let col = 0; col < K; col++) {
    let pivot = col;
    for (let r = col + 1; r < K; r++) if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    [m[col], m[pivot]] = [m[pivot], m[col]];
    for (let r = 0; r < K; r++) {
      if (r === col) continue;
      const f = m[r][col] / m[col][col];
      for (let c = col; c <= K; c++) m[r][c] -= f * m[col][c];
    }
  }
  return m.map((row, r) => row[K] / row[r]);
}
const fit = b.map((rhs) => solve(A, rhs));

/** The background's colour at (u, v), each -1 to 1; outside the picture, its nearest edge's. */
function sky(u, v) {
  const t = terms(Math.min(1, Math.max(-1, u)), Math.min(1, Math.max(-1, v)));
  return fit.map((w) => Math.round(Math.min(255, Math.max(0, w.reduce((sum, wk, k) => sum + wk * t[k], 0)))));
}

// --- Colours for the app ------------------------------------------------------------

const hex = (c) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
const channel = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const relative = ([r, g, bl]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(bl);
const contrast = (p, q) => (Math.max(relative(p), relative(q)) + 0.05) / (Math.min(relative(p), relative(q)) + 0.05);
const toward = (c, to, t) => c.map((v, k) => v + (to[k] - v) * t);

// The violet in the middle of the logo, for "GO" in the wordmark, and a
// lighter one for dark backgrounds, each made just light or dark enough to
// read as text (4.5:1) on the app's background.
const middle = sky(0, 0);
let violet = middle;
for (let t = 0.05; contrast(violet, [255, 255, 255]) < 4.5; t += 0.05) violet = toward(middle, [0, 0, 0], t);
let violetDark = middle;
for (let t = 0.05; contrast(violetDark, [28, 28, 30]) < 4.5; t += 0.05) violetDark = toward(middle, [255, 255, 255], t);

// --- Write ----------------------------------------------------------------------------

/** A picture the size of the logo, painted where the G is. */
function lifted(paint) {
  const out = Buffer.alloc(count * 4);
  for (let i = 0; i < count; i++) {
    if (alpha[i] === 0) continue;
    const [r, g, bl] = paint(i);
    out[4 * i] = r;
    out[4 * i + 1] = g;
    out[4 * i + 2] = bl;
    out[4 * i + 3] = Math.round(alpha[i] * 255);
  }
  return out;
}

/** The G as it is, with a shadow of its own, as the logo has, for the background it's lifted off. */
function withShadow() {
  const own = lifted((i) => ink.subarray(3 * i, 3 * i + 3));
  return sharp(Buffer.from(alpha.map((a) => Math.round(a * 255))), { raw: { width: N, height: N, channels: 1 } })
    .blur(18)
    .raw()
    .toBuffer()
    .then((blurred) => {
      const DROP = Math.round(N * 0.012);
      const SHADOW = [22, 10, 150];
      const out = Buffer.alloc(count * 4);
      for (let i = 0; i < count; i++) {
        const above = i - DROP * N;
        const s = above >= 0 ? (blurred[above] / 255) * 0.6 : 0;
        const g = own[4 * i + 3] / 255;
        const a = g + s * (1 - g);
        if (a === 0) continue;
        for (let ch = 0; ch < 3; ch++) out[4 * i + ch] = Math.round((own[4 * i + ch] * g + SHADOW[ch] * s * (1 - g)) / a);
        out[4 * i + 3] = Math.round(a * 255);
      }
      return out;
    });
}

const raw = (buffer) => sharp(buffer, { raw: { width: N, height: N, channels: 4 } });
const png = (image, file) => image.png({ compressionLevel: 9 }).toFile(file);

/** Square, `size` across, as a launcher shows it. */
async function square(buffer, size, file) {
  await png(raw(buffer).resize(size, size), file);
}

// Android shows a launcher icon's middle 72 of 108 dp, and anything of it
// in any mask shape within the middle 66: the logo takes the middle 72, as
// it fills an iPhone's icon, and the G, well inside it, is inside the 66.
const ANDROID = 1024;
const SHOWN = Math.round((ANDROID * 72) / 108);
async function android(buffer, file) {
  const edge = (ANDROID - SHOWN) / 2;
  await png(
    sharp(await raw(buffer).resize(SHOWN, SHOWN).png().toBuffer()).extend({
      top: Math.floor(edge),
      left: Math.floor(edge),
      bottom: Math.ceil(edge),
      right: Math.ceil(edge),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    }),
    file,
  );
}

/** The whole logo as a tile with rounded corners, as a home screen shows it, for places that don't round it themselves. */
async function tile(size, file) {
  const corners = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size * 0.225}"/></svg>`;
  await png(sharp(logoFile).resize(size, size).composite([{ input: Buffer.from(corners), blend: 'dest-in' }]), file);
}

const white = [255, 255, 255];

// iOS: the logo as it is; dark mode's G in the logo's own colours, lit as the
// white one is; the tinted icon's in grey, which iOS colours.
await png(sharp(logoFile).resize(1024, 1024), join(imageDir, 'icon.png'));
await square(
  lifted((i) => toward(sky(unit(i % N), unit(Math.floor(i / N))), white, 0.3).map((v) => Math.round(v * (0.72 + 0.28 * shade(i))))),
  1024,
  join(imageDir, 'icon-dark.png'),
);
await square(lifted((i) => white.map((v) => Math.round(v * (0.66 + 0.34 * shade(i))))), 1024, join(imageDir, 'icon-tinted.png'));

// Android: the G over the background, as two layers; the themed icon's G in
// one colour, which Android picks.
await android(await withShadow(), join(imageDir, 'adaptive-icon.png'));
await android(lifted(() => white), join(imageDir, 'monochrome-icon.png'));
{
  const background = Buffer.alloc(ANDROID * ANDROID * 3);
  const edge = (ANDROID - SHOWN) / 2;
  for (let y = 0; y < ANDROID; y++) {
    for (let x = 0; x < ANDROID; x++) {
      const at = (p) => (2 * (p - edge) + 1) / SHOWN - 1;
      background.set(sky(at(x), at(y)), 3 * (y * ANDROID + x));
    }
  }
  await png(sharp(background, { raw: { width: ANDROID, height: ANDROID, channels: 3 } }), join(imageDir, 'adaptive-background.png'));
}

// The splash screen, on light and dark alike, and the browser tab.
await tile(512, join(imageDir, 'splash-icon.png'));
await tile(48, join(imageDir, 'favicon.png'));

// The badge the app shows (src/components/BrandMark.tsx), up to 64 points
// across on a 3x screen; the app rounds its corners.
await png(sharp(logoFile).resize(192, 192), join(imageDir, 'badge.png'));

// The web site: its tab icon, the icon an iPhone saves to its home screen
// (iOS rounds it), and the one beside "GymGO" in its header.
await tile(192, join(webDir, 'icon.png'));
await png(sharp(logoFile).resize(180, 180), join(webDir, 'apple-icon.png'));

// --- The wordmark: the badge, then "GymGO" ----------------------------------------------

// Inter ExtraBold at 100 px, baseline at 0, tracked -2%.
const GYM = 'M38.92 0.98L38.92 0.98Q28.56 0.98 20.70-3.54Q12.84-8.06 8.42-16.41Q4.00-24.76 4.00-36.23L4.00-36.23Q4.00-48.14 8.67-56.52Q13.33-64.89 21.17-69.31Q29.00-73.73 38.72-73.73L38.72-73.73Q45.02-73.73 50.42-71.92Q55.81-70.12 60.03-66.80Q64.26-63.48 66.87-58.96Q69.48-54.44 70.17-49.02L70.17-49.02L52.73-49.02Q52.10-51.27 50.90-53.05Q49.71-54.83 47.95-56.08Q46.19-57.32 43.97-57.96Q41.75-58.59 39.01-58.59L39.01-58.59Q33.74-58.59 29.81-56.01Q25.88-53.42 23.75-48.46Q21.63-43.51 21.63-36.47L21.63-36.47Q21.63-29.39 23.71-24.41Q25.78-19.43 29.69-16.80Q33.59-14.16 39.06-14.16L39.06-14.16Q43.99-14.16 47.39-15.77Q50.78-17.38 52.54-20.39Q54.30-23.39 54.30-27.44L54.30-27.44L57.57-27.00L39.75-27.00L39.75-39.65L70.95-39.65L70.95-30.08Q70.95-20.36 66.85-13.40Q62.74-6.45 55.49-2.73Q48.24 0.98 38.92 0.98ZM78.71 19.14L78.71 19.14L82.52 6.69L84.67 7.28Q87.75 8.06 90.07 7.71Q92.38 7.37 93.63 6.01Q94.88 4.64 94.73 2.39L94.73 2.39L94.68 0.10L74.32-54.59L92.29-54.59L100.44-27.88Q102.10-22.41 103.05-16.89Q104.01-11.38 105.32-5.03L105.32-5.03L101.81-5.03Q103.13-11.38 104.45-16.94Q105.76-22.51 107.47-27.88L107.47-27.88L116.21-54.59L133.99-54.59L111.09 5.76Q109.43 10.16 106.74 13.55Q104.05 16.94 99.88 18.87Q95.71 20.80 89.55 20.80L89.55 20.80Q86.43 20.80 83.52 20.34Q80.62 19.87 78.71 19.14ZM155.72 0L138.68 0L138.68-54.59L154.35-54.59L155.33-40.43L154.15-40.43Q155.42-45.75 157.94-49.02Q160.45-52.29 163.80-53.81Q167.14-55.32 170.85-55.32L170.85-55.32Q176.71-55.32 180.30-51.56Q183.89-47.80 185.84-39.26L185.84-39.26L183.94-39.26Q185.26-44.97 188.09-48.54Q190.92-52.10 194.73-53.71Q198.54-55.32 202.64-55.32L202.64-55.32Q207.77-55.32 211.70-53.10Q215.63-50.88 217.88-46.75Q220.12-42.63 220.12-36.82L220.12-36.82L220.12 0L203.13 0L203.13-32.96Q203.13-37.11 200.96-39.26Q198.78-41.41 195.41-41.41L195.41-41.41Q193.02-41.41 191.24-40.33Q189.46-39.26 188.53-37.33Q187.60-35.40 187.60-32.76L187.60-32.76L187.60 0L171.24 0L171.24-33.20Q171.24-36.96 169.14-39.18Q167.04-41.41 163.63-41.41L163.63-41.41Q161.28-41.41 159.50-40.33Q157.72-39.26 156.72-37.28Q155.72-35.30 155.72-32.42L155.72-32.42L155.72 0Z';
const GO = 'M262.70 0.98L262.70 0.98Q252.35 0.98 244.49-3.54Q236.63-8.06 232.21-16.41Q227.79-24.76 227.79-36.23L227.79-36.23Q227.79-48.14 232.45-56.52Q237.12-64.89 244.95-69.31Q252.79-73.73 262.51-73.73L262.51-73.73Q268.80-73.73 274.20-71.92Q279.60-70.12 283.82-66.80Q288.04-63.48 290.66-58.96Q293.27-54.44 293.95-49.02L293.95-49.02L276.52-49.02Q275.88-51.27 274.69-53.05Q273.49-54.83 271.73-56.08Q269.98-57.32 267.75-57.96Q265.53-58.59 262.80-58.59L262.80-58.59Q257.53-58.59 253.59-56.01Q249.66-53.42 247.54-48.46Q245.42-43.51 245.42-36.47L245.42-36.47Q245.42-29.39 247.49-24.41Q249.57-19.43 253.47-16.80Q257.38-14.16 262.85-14.16L262.85-14.16Q267.78-14.16 271.17-15.77Q274.57-17.38 276.32-20.39Q278.08-23.39 278.08-27.44L278.08-27.44L281.35-27.00L263.53-27.00L263.53-39.65L294.73-39.65L294.73-30.08Q294.73-20.36 290.63-13.40Q286.53-6.45 279.28-2.73Q272.03 0.98 262.70 0.98ZM335.70 0.98L335.70 0.98Q325.89 0.98 318.05-3.37Q310.21-7.71 305.62-16.06Q301.03-24.41 301.03-36.33L301.03-36.33Q301.03-48.34 305.62-56.69Q310.21-65.04 318.05-69.38Q325.89-73.73 335.70-73.73L335.70-73.73Q345.47-73.73 353.30-69.38Q361.14-65.04 365.71-56.69Q370.27-48.34 370.27-36.33L370.27-36.33Q370.27-24.37 365.71-16.02Q361.14-7.67 353.30-3.34Q345.47 0.98 335.70 0.98ZM335.70-14.16L335.70-14.16Q340.97-14.16 344.78-16.70Q348.59-19.24 350.64-24.19Q352.69-29.15 352.69-36.33L352.69-36.33Q352.69-43.55 350.64-48.54Q348.59-53.52 344.78-56.05Q340.97-58.59 335.70-58.59L335.70-58.59Q330.38-58.59 326.57-56.03Q322.76-53.47 320.71-48.51Q318.66-43.55 318.66-36.33L318.66-36.33Q318.66-29.15 320.71-24.22Q322.76-19.29 326.57-16.72Q330.38-14.16 335.70-14.16Z';
const TEXT_WIDTH = 374.32;
const CAP = 72.75;
const DESCENT = 20.80;

writeFileSync(
  pathsFile,
  `/** Written by scripts/brand-mark.mjs: the logo's violet and GymGO's wordmark. Edit the script, not this. */

/** The violet in the middle of the logo, as dark as text on white needs, and as light as text on black does. */
export const LOGO_VIOLET = { light: '${hex(violet)}', dark: '${hex(violetDark)}' } as const;

/** "GymGO" in Inter ExtraBold at 100 px, baseline at 0. */
export const WORDMARK = {
  gym: '${GYM}',
  go: '${GO}',
  width: ${TEXT_WIDTH},
  cap: ${CAP},
  descent: ${DESCENT},
  /** The badge beside it: this tall, this far from the G, centred on the capitals. */
  badge: ${(CAP * 1.4).toFixed(2)},
  gap: ${(CAP * 0.3).toFixed(2)},
} as const;
`,
);

console.log(`wrote 8 PNGs to assets/images, 2 to apps/web/src/app, and brandPaths.ts (the logo's middle is ${hex(middle)})`);
