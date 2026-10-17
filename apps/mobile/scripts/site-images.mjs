/**
 * The website's own pictures, from the app icon (assets/images/icon.png):
 * the preview a link to the site shows when it's shared (og.png), and the
 * icons a phone or browser uses when the site is added to a home screen.
 *
 *   node scripts/site-images.mjs
 *
 * writes them to public/, which the web export copies to the site's root.
 * They say what GymGO is and nothing more: no gym, no price, no demo.
 */

import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const require = createRequire(join(root, 'package.json'));

// Inter, the app's typeface, given to the SVG renderer as in demo-pictures.mjs.
const interDir = dirname(require.resolve('@expo-google-fonts/inter/package.json'));
const fontsDir = mkdtempSync(join(tmpdir(), 'gymgo-fonts-'));
writeFileSync(
  join(fontsDir, 'fonts.conf'),
  `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>${interDir}</dir><dir>/usr/share/fonts</dir><dir>/System/Library/Fonts</dir><cachedir>${fontsDir}/cache</cachedir></fontconfig>`,
);
process.env.FONTCONFIG_FILE = join(fontsDir, 'fonts.conf');
const { default: sharp } = await import('sharp');

const ICON = join(root, 'assets', 'images', 'icon.png');
const OUT = join(root, 'public');
mkdirSync(join(OUT, 'icons'), { recursive: true });

// --- The share preview: 1200 x 630, the size every site that shows one expects.

const W = 1200;
const H = 630;
const MARK = 300;
const background = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7594fb"/>
      <stop offset="0.55" stop-color="#5441fb"/>
      <stop offset="1" stop-color="#1d0fb0"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.22" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <g font-family="Inter" fill="#ffffff">
    <text x="470" y="292" font-size="120" font-weight="800" letter-spacing="-3">GymGO</text>
    <text x="474" y="372" font-size="40" font-weight="500" opacity="0.94">Find a gym that fits your workout,</text>
    <text x="474" y="424" font-size="40" font-weight="500" opacity="0.94">budget and visit time.</text>
  </g>
</svg>`;

// The icon, rounded as a phone shows it, over its soft shadow.
const corner = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${MARK}" height="${MARK}"><rect width="${MARK}" height="${MARK}" rx="68" fill="#fff"/></svg>`);
const mark = await sharp(ICON).resize(MARK, MARK).composite([{ input: corner, blend: 'dest-in' }]).png().toBuffer();
const PAD = 60;
const shade = await sharp(
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${MARK + PAD * 2}" height="${MARK + PAD * 2}"><rect x="${PAD}" y="${PAD}" width="${MARK}" height="${MARK}" rx="68" fill="#0d0660" opacity="0.45"/></svg>`,
  ),
)
  .blur(22)
  .png()
  .toBuffer();
await sharp(Buffer.from(background))
  .composite([
    { input: shade, left: 96 - PAD, top: (H - MARK) / 2 - PAD + 18 },
    { input: mark, left: 96, top: (H - MARK) / 2 },
  ])
  .png({ compressionLevel: 9, palette: false })
  .toFile(join(OUT, 'og.png'));

// --- Home-screen icons: the web manifest's two sizes, and Apple's own.

for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  await sharp(ICON).resize(size, size).png({ compressionLevel: 9 }).toFile(join(OUT, 'icons', name));
}

console.log('Wrote public/og.png and public/icons/');
