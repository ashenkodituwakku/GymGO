/**
 * Verity's face, in three layers, so it can blink and grin
 * (src/components/Verity.tsx).
 *
 * Takes the picture the owner chose, assets/verity/verity.png (a yellow
 * smiley, supplied by the owner on 27 October 2026), and writes, at the same
 * size:
 *  - face.png: the face with its eyes and mouth filled with its own yellow;
 *  - eyes.png and mouth.png: just those, in the picture's own black, see-through
 *    elsewhere, so laid over the face they give back the picture exactly.
 *
 * Nothing new is drawn: the eyes close by squashing the picture's own eyes,
 * and the grin is its own mouth, widened. The features are found as the dark
 * pixels: eyes above the middle, mouth below.
 *
 *   node scripts/verity-face.mjs
 *
 * Uses the server's copy of sharp (apps/server), as the app doesn't need one.
 */

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, '..', 'assets', 'verity');
const sharp = createRequire(join(here, '..', '..', 'server', 'package.json'))('sharp');

const { data, info } = await sharp(join(dir, 'verity.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;
const at = (x, y) => (y * width + x) * 4;

// The face's colour: the commonest solid one.
const counts = new Map();
for (let i = 0; i < data.length; i += 4) {
  if (data[i + 3] < 255) continue;
  const key = `${data[i]},${data[i + 1]},${data[i + 2]}`;
  counts.set(key, (counts.get(key) ?? 0) + 1);
}
const yellow = [...counts].sort((a, b) => b[1] - a[1])[0][0].split(',').map(Number);
const [fr, fg, fb] = yellow;

/** How much of a pixel is the black of a feature, from its brightness against the face's. */
const ink = (i) => (data[i + 3] < 200 ? 0 : Math.max(0, Math.min(1, 1 - (data[i] + data[i + 1] + data[i + 2]) / (fr + fg + fb))));

// Each feature's box: every pixel more than a little dark, eyes above the middle and mouth below.
const box = () => ({ left: width, top: height, right: -1, bottom: -1 });
const eyes = box();
const mouth = box();
for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    if (ink(at(x, y)) < 0.08) continue;
    const b = y < height * 0.5 ? eyes : mouth;
    b.left = Math.min(b.left, x);
    b.right = Math.max(b.right, x);
    b.top = Math.min(b.top, y);
    b.bottom = Math.max(b.bottom, y);
  }
}
const inside = (b, x, y, pad = 2) => x >= b.left - pad && x <= b.right + pad && y >= b.top - pad && y <= b.bottom + pad;

const face = Buffer.from(data);
const eyesLayer = Buffer.alloc(data.length);
const mouthLayer = Buffer.alloc(data.length);
for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const i = at(x, y);
    const layer = inside(eyes, x, y) ? eyesLayer : inside(mouth, x, y) ? mouthLayer : null;
    if (!layer) continue;
    // The feature, as black at its own strength...
    layer[i + 3] = Math.round(ink(i) * 255);
    // ...and the face under it, yellow.
    face[i] = fr;
    face[i + 1] = fg;
    face[i + 2] = fb;
    face[i + 3] = 255;
  }
}

const save = (pixels, name) => sharp(pixels, { raw: { width, height, channels: 4 } }).png({ compressionLevel: 9 }).toFile(join(dir, name));
await save(face, 'face.png');
await save(eyesLayer, 'eyes.png');
await save(mouthLayer, 'mouth.png');

// Where each feature's middle is, as a share of the picture, for the app to squash and widen around.
const middle = (b) => ({ x: +((b.left + b.right) / 2 / width).toFixed(3), y: +((b.top + b.bottom) / 2 / height).toFixed(3) });
console.log(JSON.stringify({ size: [width, height], face: yellow, eyes: { ...eyes, middle: middle(eyes) }, mouth: { ...mouth, middle: middle(mouth) } }));
