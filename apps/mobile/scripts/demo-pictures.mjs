/**
 * Pictures for the demo's invented gyms: an illustration of each one's
 * floor, drawn here in SVG from what the demo says it has (its racks,
 * platforms, pool or turf, its walls, its view) and its name on the wall.
 *
 * They're illustrations, and look it: flat shapes, never a photograph and
 * never passed off as one. They exist only for the demo's invented gyms
 * (packages/demo-data), each credited in the app as "Illustration made for
 * the GymGO demo". No real gym ever gets one.
 *
 *   node scripts/demo-pictures.mjs
 *
 * writes assets/demo/<gym id>.webp and src/lib/demoPictures.ts (the app's
 * map from a gym to its picture). To change a picture, change it here and
 * run it again; don't edit the outputs. The signs are set in Inter, the
 * app's own typeface, from the copy installed with the app.
 */

import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const require = createRequire(join(root, 'package.json'));

// The signs' typeface: Inter, from @expo-google-fonts/inter, given to the
// SVG renderer through a fontconfig file of its own.
const interDir = dirname(require.resolve('@expo-google-fonts/inter/package.json'));
const fontsDir = mkdtempSync(join(tmpdir(), 'gymgo-fonts-'));
writeFileSync(
  join(fontsDir, 'fonts.conf'),
  `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>${interDir}</dir><dir>/usr/share/fonts</dir><dir>/System/Library/Fonts</dir><cachedir>${fontsDir}/cache</cachedir></fontconfig>`,
);
process.env.FONTCONFIG_FILE = join(fontsDir, 'fonts.conf');
const { default: sharp } = await import('sharp');

const W = 1200;
const H = 800;
/** Where the back wall meets the floor. */
const HORIZON = 500;
const OUT = join(root, 'assets', 'demo');

// --- Small helpers -----------------------------------------------------------

const f = (n) => Math.round(n * 10) / 10;
function rand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const rect = (x, y, w, h, fill, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}" ${extra}/>`;
const round = (x, y, w, h, r, fill, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(r)}" fill="${fill}" ${extra}/>`;
const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}" ${extra}/>`;
const poly = (points, fill, extra = '') => `<polygon points="${points.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}" fill="${fill}" ${extra}/>`;
const line = (x1, y1, x2, y2, stroke, width, extra = '') => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${stroke}" stroke-width="${f(width)}" ${extra}/>`;
/** A soft shadow on the floor under something. */
const shadow = (cx, y, w, depth = 0.22) => `<ellipse cx="${f(cx)}" cy="${f(y)}" rx="${f(w / 2)}" ry="${f(Math.max(6, w * 0.06))}" fill="#000" opacity="${depth}" filter="url(#soft)"/>`;
/** How big something standing at floor height y is: smaller towards the wall. */
const scaleAt = (y) => 0.62 + ((y - HORIZON) / (H - HORIZON)) * 0.62;

// Steel, rubber and the colours bumper plates come in (by weight, as in competition).
const STEEL = '#2A2D34';
const STEEL_LIGHT = '#454A55';
const CHROME = '#C9CED6';
const PLATE = { red: '#D23A3A', blue: '#2F62C9', yellow: '#E8B92E', green: '#2E9E5B', black: '#24262B' };

// --- Equipment, each standing at (x, y) on the floor --------------------------

function barbell(x, y, s, half, plates = ['red', 'blue']) {
  let out = round(x - half * s, y - 3 * s, half * 2 * s, 6 * s, 3 * s, CHROME);
  for (const side of [-1, 1]) {
    let at = half * s - 26 * s;
    plates.forEach((colour, i) => {
      const t = (i === 0 ? 16 : 13) * s;
      const h = (i === 0 ? 92 : 84) * s;
      out += round(x + side * at - t / 2, y - h / 2, t, h, 4 * s, PLATE[colour]);
      out += round(x + side * at - t / 2 + 2 * s, y - h / 2 + 4 * s, 3 * s, h - 8 * s, 2 * s, '#fff', 'opacity="0.18"');
      at -= t + 2 * s;
    });
    out += rect(x + side * (at + 2 * s) - 4 * s, y - 7 * s, 8 * s, 14 * s, STEEL_LIGHT);
  }
  return out;
}

function powerRack(x, y, frame = STEEL, plates = ['red', 'blue', 'yellow']) {
  const s = scaleAt(y);
  const hgt = 330 * s;
  const half = 118 * s;
  let out = shadow(x, y, 300 * s);
  // Back uprights, a little in, for depth.
  for (const side of [-1, 1]) out += rect(x + side * (half - 22 * s) - 7 * s, y - hgt - 6 * s, 14 * s, hgt, frame, 'opacity="0.75"');
  out += rect(x - half + 18 * s, y - hgt - 6 * s, half * 2 - 36 * s, 12 * s, frame, 'opacity="0.75"');
  // Front uprights with their holes, the top bar, feet and safety arms.
  for (const side of [-1, 1]) {
    const ux = x + side * half - 9 * s;
    out += rect(ux, y - hgt, 18 * s, hgt, frame);
    for (let k = 1; k < 16; k++) out += circle(ux + 9 * s, y - hgt + k * 19 * s, 2.2 * s, '#fff', 'opacity="0.35"');
    out += rect(x + side * half - 26 * s, y - 8 * s, 52 * s, 8 * s, frame);
    out += rect(x + side * (half - 30 * s) - 20 * s, y - 112 * s, 40 * s, 8 * s, STEEL_LIGHT);
    out += rect(x + side * half - 15 * s, y - 214 * s, 30 * s, 10 * s, STEEL_LIGHT);
  }
  out += rect(x - half - 9 * s, y - hgt, half * 2 + 18 * s, 16 * s, frame);
  out += barbell(x, y - 214 * s, s, 190, plates);
  return out;
}

function squatStand(x, y, frame = STEEL, plates = ['blue', 'green']) {
  const s = scaleAt(y);
  const half = 96 * s;
  let out = shadow(x, y, 240 * s);
  for (const side of [-1, 1]) {
    out += rect(x + side * half - 8 * s, y - 250 * s, 16 * s, 250 * s, frame);
    out += rect(x + side * half - 30 * s, y - 8 * s, 60 * s, 8 * s, frame);
    out += rect(x + side * half - 13 * s, y - 196 * s, 26 * s, 9 * s, STEEL_LIGHT);
    for (let k = 1; k < 12; k++) out += circle(x + side * half, y - 250 * s + k * 19 * s, 2 * s, '#fff', 'opacity="0.3"');
  }
  out += barbell(x, y - 196 * s, s, 172, plates);
  return out;
}

function smithMachine(x, y, frame = STEEL) {
  const s = scaleAt(y);
  const half = 110 * s;
  let out = shadow(x, y, 280 * s);
  for (const side of [-1, 1]) {
    out += rect(x + side * half - 10 * s, y - 320 * s, 20 * s, 320 * s, frame);
    out += rect(x + side * (half - 30 * s) - 3 * s, y - 310 * s, 6 * s, 302 * s, CHROME);
  }
  out += rect(x - half - 10 * s, y - 330 * s, half * 2 + 20 * s, 18 * s, frame);
  out += rect(x - half - 30 * s, y - 10 * s, half * 2 + 60 * s, 10 * s, frame);
  out += barbell(x, y - 180 * s, s, 150, ['black']);
  return out;
}

function bench(x, y, pad = '#1F2025') {
  const s = scaleAt(y);
  let out = shadow(x, y, 190 * s, 0.18);
  out += rect(x - 70 * s, y - 48 * s, 10 * s, 48 * s, STEEL);
  out += rect(x + 60 * s, y - 48 * s, 10 * s, 48 * s, STEEL);
  out += rect(x - 82 * s, y - 6 * s, 34 * s, 6 * s, STEEL);
  out += rect(x + 48 * s, y - 6 * s, 34 * s, 6 * s, STEEL);
  out += rect(x - 64 * s, y - 52 * s, 128 * s, 8 * s, STEEL_LIGHT);
  out += round(x - 92 * s, y - 72 * s, 184 * s, 22 * s, 8 * s, pad);
  out += round(x - 86 * s, y - 70 * s, 172 * s, 5 * s, 3 * s, '#fff', 'opacity="0.12"');
  return out;
}

function dumbbellRack(x, y, frame = STEEL, heads = '#33363D', n = 5) {
  const s = scaleAt(y);
  const width = (n * 76 + 30) * s;
  let out = shadow(x, y, width + 30 * s);
  const left = x - width / 2;
  for (const side of [0, 1]) {
    const sx = left + side * width;
    out += poly([[sx - 8 * s, y], [sx + 8 * s, y], [sx + 8 * s - (side ? 26 : -26) * s, y - 150 * s], [sx - 8 * s - (side ? 26 : -26) * s, y - 150 * s]], frame);
  }
  for (const [tier, ty] of [[0, y - 70 * s], [1, y - 140 * s]]) {
    const inset = tier * 22 * s;
    out += rect(left + inset, ty, width - inset * 2, 8 * s, frame);
    for (let i = 0; i < n; i++) {
      const size = (0.75 + (i / n) * 0.6 + tier * 0.1) * s;
      const cx = left + inset + 24 * s + i * ((width - inset * 2 - 48 * s) / (n - 1));
      out += rect(cx - 22 * size, ty - 15 * size, 44 * size, 7 * size, CHROME);
      for (const side of [-1, 1]) out += poly(hexagon(cx + side * 25 * size, ty - 15 * size, 15 * size), heads);
    }
  }
  return out;
}
function hexagon(cx, cy, r) {
  return Array.from({ length: 6 }, (_, k) => [cx + r * Math.cos((Math.PI / 3) * k + Math.PI / 6) * 0.62, cy + r * Math.sin((Math.PI / 3) * k + Math.PI / 6)]);
}

function kettlebells(x, y, count = 4) {
  const s = scaleAt(y);
  const colours = ['#E06C9F', '#3B82D6', '#E8B92E', '#8B5CF6', '#2E9E5B', '#F28C28', '#D23A3A'];
  let out = '';
  for (let i = 0; i < count; i++) {
    const r = (15 + i * 3) * s;
    const cx = x + (i - (count - 1) / 2) * 58 * s;
    out += shadow(cx, y, r * 2.4, 0.2);
    out += `<path d="M${f(cx - r * 0.62)},${f(y - r * 1.55)} q${f(r * 0.62)},${f(-r * 1.25)} ${f(r * 1.24)},0" fill="none" stroke="${STEEL}" stroke-width="${f(r * 0.3)}" stroke-linecap="round"/>`;
    out += `<ellipse cx="${f(cx)}" cy="${f(y - r * 0.92)}" rx="${f(r)}" ry="${f(r * 0.95)}" fill="${colours[i % colours.length]}"/>`;
    out += `<ellipse cx="${f(cx - r * 0.35)}" cy="${f(y - r * 1.25)}" rx="${f(r * 0.28)}" ry="${f(r * 0.2)}" fill="#fff" opacity="0.3"/>`;
  }
  return out;
}

function treadmill(x, y, accent = '#3B82D6', facing = 1) {
  const s = scaleAt(y);
  const d = facing;
  let out = shadow(x, y, 300 * s, 0.2);
  out += round(x - 140 * s, y - 34 * s, 280 * s, 26 * s, 10 * s, STEEL);
  out += round(x - 130 * s, y - 40 * s, 260 * s, 8 * s, 4 * s, '#111317');
  out += round(x + d * 100 * s - 34 * s, y - 52 * s, 68 * s, 40 * s, 14 * s, STEEL_LIGHT);
  out += line(x + d * 118 * s, y - 48 * s, x + d * 92 * s, y - 182 * s, STEEL, 12 * s, 'stroke-linecap="round"');
  out += line(x + d * 92 * s, y - 150 * s, x - d * 10 * s, y - 132 * s, STEEL_LIGHT, 7 * s, 'stroke-linecap="round"');
  out += `<g transform="rotate(${-d * 18} ${f(x + d * 86 * s)} ${f(y - 192 * s)})">${round(x + d * 86 * s - 42 * s, y - 206 * s, 84 * s, 30 * s, 6 * s, '#15171C')}${round(x + d * 86 * s - 34 * s, y - 200 * s, 68 * s, 18 * s, 4 * s, accent, 'opacity="0.85"')}</g>`;
  return out;
}

function rower(x, y, accent = '#2E9E5B') {
  const s = scaleAt(y);
  let out = shadow(x, y, 330 * s, 0.18);
  out += round(x - 160 * s, y - 34 * s, 300 * s, 9 * s, 4 * s, CHROME);
  out += rect(x + 126 * s, y - 34 * s, 10 * s, 34 * s, STEEL);
  out += rect(x - 160 * s, y - 28 * s, 10 * s, 28 * s, STEEL);
  out += circle(x - 140 * s, y - 52 * s, 40 * s, STEEL);
  out += circle(x - 140 * s, y - 52 * s, 28 * s, accent, 'opacity="0.9"');
  out += circle(x - 140 * s, y - 52 * s, 8 * s, STEEL_LIGHT);
  out += round(x + 10 * s, y - 50 * s, 46 * s, 14 * s, 5 * s, '#15171C');
  out += poly([[x - 92 * s, y - 34 * s], [x - 70 * s, y - 34 * s], [x - 82 * s, y - 72 * s], [x - 100 * s, y - 72 * s]], STEEL_LIGHT);
  return out;
}

function airBike(x, y, accent = '#D23A3A') {
  const s = scaleAt(y);
  let out = shadow(x, y, 220 * s, 0.2);
  out += circle(x - 62 * s, y - 70 * s, 64 * s, STEEL);
  out += circle(x - 62 * s, y - 70 * s, 52 * s, '#3A3E47');
  for (let k = 0; k < 8; k++) {
    const a = (Math.PI / 4) * k;
    out += line(x - 62 * s, y - 70 * s, x - 62 * s + Math.cos(a) * 50 * s, y - 70 * s + Math.sin(a) * 50 * s, '#5A5F6B', 6 * s);
  }
  out += circle(x - 62 * s, y - 70 * s, 12 * s, accent);
  out += rect(x - 120 * s, y - 8 * s, 220 * s, 8 * s, STEEL);
  out += line(x - 40 * s, y - 70 * s, x + 50 * s, y - 112 * s, STEEL, 12 * s, 'stroke-linecap="round"');
  out += line(x + 50 * s, y - 112 * s, x + 70 * s, y - 8 * s, STEEL, 12 * s, 'stroke-linecap="round"');
  out += round(x + 34 * s, y - 128 * s, 54 * s, 14 * s, 6 * s, '#15171C');
  out += line(x - 64 * s, y - 70 * s, x - 34 * s, y - 196 * s, STEEL_LIGHT, 9 * s, 'stroke-linecap="round"');
  out += round(x - 48 * s, y - 202 * s, 34 * s, 10 * s, 5 * s, accent);
  return out;
}

function cableStation(x, y, frame = STEEL, accent = '#E8B92E') {
  const s = scaleAt(y);
  const half = 150 * s;
  let out = shadow(x, y, 360 * s);
  for (const side of [-1, 1]) {
    const tx = x + side * half;
    out += rect(tx - 30 * s, y - 360 * s, 60 * s, 360 * s, frame);
    out += rect(tx - 20 * s, y - 230 * s, 40 * s, 200 * s, '#1A1C21');
    for (let k = 0; k < 9; k++) out += rect(tx - 18 * s, y - 70 * s - k * 17 * s, 36 * s, 14 * s, k < 3 ? accent : STEEL_LIGHT);
    out += circle(tx - side * 30 * s, y - 330 * s, 12 * s, CHROME);
    out += circle(tx - side * 30 * s, y - 330 * s, 5 * s, STEEL);
    out += line(tx - side * 30 * s, y - 318 * s, tx - side * 70 * s, y - 150 * s, '#8A909C', 2.5 * s);
    out += round(tx - side * 70 * s - 10 * s, y - 150 * s, 20 * s, 8 * s, 4 * s, STEEL_LIGHT);
  }
  out += rect(x - half - 30 * s, y - 372 * s, half * 2 + 60 * s, 16 * s, frame);
  out += rect(x - half - 30 * s, y - 10 * s, half * 2 + 60 * s, 10 * s, frame);
  return out;
}

/** The leg press or hack squat: a sled on rails at 45 degrees, with a seat. */
function sledMachine(x, y, frame = STEEL, pad = '#1F2025', facing = 1) {
  const s = scaleAt(y);
  const d = facing;
  let out = shadow(x, y, 300 * s);
  out += rect(x - 150 * s, y - 14 * s, 300 * s, 14 * s, frame);
  out += line(x - d * 120 * s, y - 14 * s, x + d * 110 * s, y - 240 * s, frame, 18 * s, 'stroke-linecap="round"');
  out += line(x - d * 100 * s, y - 14 * s, x + d * 130 * s, y - 220 * s, STEEL_LIGHT, 8 * s, 'stroke-linecap="round"');
  out += `<g transform="rotate(${d * -45} ${f(x + d * 60 * s)} ${f(y - 170 * s)})">${round(x + d * 60 * s - 50 * s, y - 182 * s, 100 * s, 24 * s, 6 * s, STEEL_LIGHT)}${rect(x + d * 60 * s - 6 * s, y - 214 * s, 12 * s, 34 * s, CHROME)}${round(x + d * 60 * s - 20 * s, y - 228 * s, 40 * s, 14 * s, 4 * s, PLATE.black)}</g>`;
  out += `<g transform="rotate(${d * 22} ${f(x - d * 80 * s)} ${f(y - 70 * s)})">${round(x - d * 80 * s - 22 * s, y - 150 * s, 44 * s, 110 * s, 12 * s, pad)}</g>`;
  out += round(x - d * 60 * s - 50 * s, y - 52 * s, 100 * s, 18 * s, 8 * s, pad);
  return out;
}

function plateTree(x, y) {
  const s = scaleAt(y);
  let out = shadow(x, y, 120 * s);
  out += rect(x - 6 * s, y - 170 * s, 12 * s, 170 * s, STEEL);
  out += rect(x - 50 * s, y - 8 * s, 100 * s, 8 * s, STEEL);
  const stack = [['red', 0], ['red', 1], ['blue', 2], ['yellow', 3]];
  for (const [colour, k] of stack) {
    const side = k % 2 ? 1 : -1;
    const py = y - 40 * s - Math.floor(k / 2) * 72 * s;
    out += `<ellipse cx="${f(x + side * 22 * s)}" cy="${f(py)}" rx="${f(14 * s)}" ry="${f(46 * s)}" fill="${PLATE[colour]}"/>`;
    out += `<ellipse cx="${f(x + side * 22 * s)}" cy="${f(py)}" rx="${f(5 * s)}" ry="${f(14 * s)}" fill="${STEEL}"/>`;
  }
  return out;
}

function boxes(x, y, wood = '#C99A63') {
  const s = scaleAt(y);
  let out = shadow(x, y, 220 * s, 0.2);
  const stack = [[-60, 0, 110, 80], [55, 0, 100, 64], [-34, -80, 92, 60]];
  for (const [dx, dy, w, h] of stack) {
    const bx = x + dx * s - (w * s) / 2;
    const by = y + dy * s - h * s;
    out += rect(bx, by, w * s, h * s, wood);
    out += rect(bx, by, w * s, 6 * s, '#fff', 'opacity="0.18"');
    out += rect(bx, by, 5 * s, h * s, '#000', 'opacity="0.08"');
    out += round(bx + w * s * 0.32, by + h * s * 0.3, w * s * 0.36, 12 * s, 6 * s, '#5A3E22', 'opacity="0.55"');
  }
  return out;
}

function plant(x, y, pot = '#E9E2D6') {
  const s = scaleAt(y);
  let out = shadow(x, y, 110 * s, 0.16);
  const leaves = [[-50, -150, -30], [40, -160, 28], [-10, -190, -4], [-62, -110, -55], [56, -116, 50], [14, -138, 14]];
  for (const [dx, dy, a] of leaves) {
    out += `<ellipse cx="${f(x + dx * s)}" cy="${f(y + dy * s)}" rx="${f(26 * s)}" ry="${f(60 * s)}" fill="#2F7A4B" transform="rotate(${a} ${f(x + dx * s)} ${f(y + dy * s)})"/>`;
    out += `<ellipse cx="${f(x + dx * s)}" cy="${f(y + dy * s)}" rx="${f(4 * s)}" ry="${f(50 * s)}" fill="#3F9A60" opacity="0.6" transform="rotate(${a} ${f(x + dx * s)} ${f(y + dy * s)})"/>`;
  }
  out += poly([[x - 40 * s, y - 80 * s], [x + 40 * s, y - 80 * s], [x + 30 * s, y], [x - 30 * s, y]], pot);
  out += rect(x - 42 * s, y - 86 * s, 84 * s, 10 * s, pot);
  return out;
}

function medBalls(x, y) {
  const s = scaleAt(y);
  let out = '';
  [['#3B82D6', -46], ['#D23A3A', 0], ['#2E9E5B', 46]].forEach(([colour, dx], i) => {
    const r = (22 + i * 2) * s;
    out += shadow(x + dx * s, y, r * 2.2, 0.2);
    out += circle(x + dx * s, y - r, r, colour);
    out += `<path d="M${f(x + dx * s - r)},${f(y - r)} q${f(r)},${f(r * 0.5)} ${f(r * 2)},0" fill="none" stroke="#000" stroke-opacity="0.25" stroke-width="${f(2 * s)}"/>`;
    out += circle(x + dx * s - r * 0.35, y - r * 1.35, r * 0.25, '#fff', 'opacity="0.25"');
  });
  return out;
}

function sled(x, y) {
  const s = scaleAt(y);
  let out = shadow(x, y, 160 * s, 0.2);
  out += rect(x - 70 * s, y - 12 * s, 140 * s, 12 * s, STEEL);
  out += rect(x - 30 * s, y - 120 * s, 12 * s, 108 * s, STEEL);
  out += rect(x + 20 * s, y - 120 * s, 12 * s, 108 * s, STEEL);
  out += `<ellipse cx="${f(x + 2 * s)}" cy="${f(y - 60 * s)}" rx="${f(12 * s)}" ry="${f(44 * s)}" fill="${PLATE.green}"/>`;
  return out;
}

const KIT = { powerRack, squatStand, smithMachine, bench, dumbbellRack, kettlebells, treadmill, rower, airBike, cableStation, sledMachine, plateTree, boxes, plant, medBalls, sled };

// --- The room ----------------------------------------------------------------

function defs(p) {
  return `<defs>
  <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter>
  <filter id="glow" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="9" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.06 0"/></filter>
  <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.wallTop}"/><stop offset="1" stop-color="${p.wall}"/></linearGradient>
  <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.floorFar}"/><stop offset="1" stop-color="${p.floor}"/></linearGradient>
  <linearGradient id="mirror" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E9F1F7"/><stop offset="0.45" stop-color="#C7D3DD"/><stop offset="0.55" stop-color="#DCE6EE"/><stop offset="1" stop-color="#B8C5D1"/></linearGradient>
  <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF6DA" stop-opacity="0.5"/><stop offset="1" stop-color="#FFF6DA" stop-opacity="0"/></linearGradient>
  <linearGradient id="copper" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F3B47A"/><stop offset="0.5" stop-color="#C46B32"/><stop offset="1" stop-color="#8E4620"/></linearGradient>
  <radialGradient id="vignette" cx="0.5" cy="0.45" r="0.75"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.32"/></radialGradient>
  <radialGradient id="lamp" cx="0.5" cy="0" r="1"><stop offset="0" stop-color="#FFE7B0" stop-opacity="0.55"/><stop offset="1" stop-color="#FFE7B0" stop-opacity="0"/></radialGradient>
</defs>`;
}

function wallTexture(kind, p) {
  if (kind === 'brick') {
    const r = rand(11);
    let out = '';
    const bw = 64;
    const bh = 26;
    for (let row = 0; row * bh < HORIZON; row++) {
      for (let col = -1; col * bw < W + bw; col++) {
        const x = col * bw + (row % 2 ? bw / 2 : 0);
        const shade = r();
        out += rect(x + 2, row * bh + 2, bw - 4, bh - 4, shade < 0.33 ? p.brickA : shade < 0.66 ? p.brickB : p.brickC);
      }
    }
    return rect(0, 0, W, HORIZON, p.mortar) + out;
  }
  if (kind === 'concrete') {
    let out = rect(0, 0, W, HORIZON, 'url(#wall)');
    for (let y = 60; y < HORIZON; y += 150) for (let x = 75; x < W; x += 150) out += circle(x, y, 4, '#000', 'opacity="0.12"');
    for (let y = 0; y < HORIZON; y += 150) out += line(0, y, W, y, '#000', 1.5, 'opacity="0.07"');
    for (let x = 0; x < W; x += 300) out += line(x, 0, x, HORIZON, '#000', 1.5, 'opacity="0.07"');
    return out;
  }
  if (kind === 'slats') {
    let out = rect(0, 0, W, HORIZON, p.wall);
    for (let x = 0; x < W; x += 22) out += rect(x, 0, 14, HORIZON, p.slat ?? p.wallTop, 'opacity="0.9"');
    return out;
  }
  if (kind === 'tiles') {
    let out = rect(0, 0, W, HORIZON, p.wall);
    for (let y = 0; y < HORIZON; y += 40) out += line(0, y, W, y, '#fff', 2, 'opacity="0.55"');
    for (let x = 0; x < W; x += 40) out += line(x, 0, x, HORIZON, '#fff', 2, 'opacity="0.55"');
    return out;
  }
  // Painted, with a band of colour round the lower wall.
  return rect(0, 0, W, HORIZON, 'url(#wall)') + rect(0, HORIZON - 150, W, 150, p.band ?? p.wall, 'opacity="0.95"') + rect(0, HORIZON - 156, W, 6, '#fff', 'opacity="0.25"');
}

/** What's outside: drawn into the window's frame, behind the glass. */
function view(kind, x, y, w, h, seed = 5) {
  const r = rand(seed);
  const clip = `<clipPath id="win${seed}${f(x)}"><rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"/></clipPath>`;
  let sky;
  let scene = '';
  const city = (base, lit, far, near) => {
    let out = '';
    for (const [layer, colour, top] of [[0, far, 0.3], [1, near, 0.45]]) {
      let bx = x - 20;
      while (bx < x + w) {
        const bw = 40 + r() * 70;
        const bh = h * (top + r() * 0.3);
        out += rect(bx, y + h - bh, bw - 4, bh, colour);
        if (lit) for (let wy = y + h - bh + 10; wy < y + h - 8; wy += 16) for (let wx = bx + 6; wx < bx + bw - 12; wx += 13) if (r() < (layer ? 0.45 : 0.25)) out += rect(wx, wy, 6, 8, lit, `opacity="${0.6 + r() * 0.4}"`);
        bx += bw;
      }
    }
    return out + rect(x, y + h - 6, w, 6, base);
  };
  if (kind === 'night' || kind === 'moon') {
    sky = ['#0E1330', '#273063'];
    for (let k = 0; k < 18; k++) scene += circle(x + r() * w, y + r() * h * 0.5, 1 + r() * 1.4, '#fff', `opacity="${0.4 + r() * 0.5}"`);
    if (kind === 'moon') {
      const mx = x + w * 0.74;
      const my = y + h * 0.17;
      scene += circle(mx, my, 44, '#F4F1DE', 'opacity="0.12"');
      scene += `<path d="M${f(mx)},${f(my - 30)} A30,30 0 0 1 ${f(mx)},${f(my + 30)} Z" fill="#F4F1DE"/>`;
      scene += `<path d="M${f(mx)},${f(my - 30)} A30,30 0 0 0 ${f(mx)},${f(my + 30)} Z" fill="#F4F1DE" opacity="0.14"/>`;
    }
    scene += city('#0A0D1E', '#FFD27A', '#1A2147', '#121734');
  } else if (kind === 'dusk') {
    sky = ['#F49A6C', '#7B5EA7'];
    scene += circle(x + w * 0.3, y + h * 0.62, 50, '#FFD6A0', 'opacity="0.8"');
    scene += city('#2A1E3A', '#FFC977', '#5B4378', '#3A2A52');
  } else if (kind === 'harbour') {
    sky = ['#8EC9F0', '#D9EEFA'];
    const water = y + h * 0.62;
    scene += `<path d="M${f(x + w * 0.05)},${f(water)} Q${f(x + w * 0.5)},${f(y + h * 0.05)} ${f(x + w * 0.95)},${f(water)}" fill="none" stroke="#4A5A6E" stroke-width="10"/>`;
    for (let k = 1; k < 12; k++) {
      const t = k / 12;
      const bx = x + w * (0.05 + 0.9 * t);
      const by = water - (water - (y + h * 0.05)) * 2 * t * (1 - t) * 1.0 + 4;
      scene += line(bx, by, bx, water - 30, '#4A5A6E', 3);
    }
    scene += rect(x + w * 0.02, water - 34, w * 0.96, 8, '#4A5A6E');
    scene += rect(x, water, w, h - (water - y), '#3E86C4');
    for (let k = 0; k < 9; k++) scene += rect(x + r() * w, water + 8 + r() * (h * 0.3), 30 + r() * 40, 2, '#fff', 'opacity="0.5"');
    scene += poly([[x + w * 0.2, water - 4], [x + w * 0.2, water - 54], [x + w * 0.26, water - 4]], '#fff');
    scene += rect(x + w * 0.17, water - 4, w * 0.11, 6, '#2A3A4E');
  } else if (kind === 'ocean') {
    sky = ['#7FC4EC', '#E4F4FB'];
    const sea = y + h * 0.58;
    scene += circle(x + w * 0.78, y + h * 0.2, 28, '#FFF4C9');
    scene += rect(x, sea, w, h - (sea - y), '#2F86B8');
    for (let k = 0; k < 14; k++) scene += rect(x + r() * w, sea + 6 + r() * (h * 0.38), 20 + r() * 50, 2.5, '#fff', 'opacity="0.55"');
    scene += poly([[x + w * 0.42, sea - 2], [x + w * 0.42, sea - 40], [x + w * 0.47, sea - 2]], '#fff');
  } else if (kind === 'hills') {
    sky = ['#9ED3F2', '#E8F6FC'];
    scene += `<path d="M${f(x)},${f(y + h * 0.75)} Q${f(x + w * 0.35)},${f(y + h * 0.25)} ${f(x + w * 0.7)},${f(y + h * 0.55)} T${f(x + w)},${f(y + h * 0.5)} V${f(y + h)} H${f(x)} Z" fill="#7DB36A"/>`;
    const roofs = ['#B5543C', '#8E3E2C', '#C9704F'];
    for (let k = 0; k < 9; k++) {
      const hx = x + (k / 9) * w + 6;
      const hy = y + h * (0.62 - Math.sin((k / 9) * Math.PI) * 0.2);
      scene += rect(hx, hy, w / 10, h * 0.3, ['#F1E6D2', '#E6D3B3', '#F5EFE4'][k % 3]);
      scene += poly([[hx - 3, hy], [hx + w / 20, hy - 16], [hx + w / 10 + 3, hy]], roofs[k % 3]);
      scene += rect(hx + 8, hy + 12, 8, 12, '#4A5A6E', 'opacity="0.6"');
    }
  } else if (kind === 'park') {
    sky = ['#A7D9F2', '#EAF7FC'];
    scene += rect(x, y + h * 0.7, w, h * 0.3, '#86B96E');
    for (let k = 0; k < 7; k++) {
      const tx = x + (k + 0.3 + r() * 0.4) * (w / 7);
      const tr = 26 + r() * 22;
      scene += rect(tx - 4, y + h * 0.55, 8, h * 0.2, '#6B4F35');
      scene += circle(tx, y + h * 0.5, tr, k % 2 ? '#4E8F4A' : '#3F7D3E');
      scene += circle(tx - tr * 0.4, y + h * 0.46, tr * 0.6, '#5FA058');
    }
  } else {
    sky = ['#9CCFF0', '#E6F4FB'];
    scene += city('#56657A', null, '#AEB9C8', '#8796AB');
  }
  const gid = `sky${seed}${f(x)}`;
  return `<defs>${clip}<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs><g clip-path="url(#win${seed}${f(x)})">${rect(x, y, w, h, `url(#${gid})`)}${scene}</g>`;
}

function windowFrame(x, y, w, h, kind, frame, cols = 3, rows = 2, arch = false, seed = 5) {
  let out = view(kind, x, y, w, h, seed);
  if (arch) {
    // A keystone arch over the window.
    out += `<path d="M${f(x - 14)},${f(y + 30)} A${f(w / 2 + 14)},${f(w / 2.6)} 0 0 1 ${f(x + w + 14)},${f(y + 30)} L${f(x + w)},${f(y + 30)} A${f(w / 2)},${f(w / 2.8)} 0 0 0 ${f(x)},${f(y + 30)} Z" fill="${frame}"/>`;
    out += poly([[x + w / 2 - 14, y - w / 2.8 + 26], [x + w / 2 + 14, y - w / 2.8 + 26], [x + w / 2 + 10, y - w / 2.8 + 58], [x + w / 2 - 10, y - w / 2.8 + 58]], frame);
  }
  out += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="none" stroke="${frame}" stroke-width="12"/>`;
  for (let c = 1; c < cols; c++) out += line(x + (w / cols) * c, y, x + (w / cols) * c, y + h, frame, 6);
  for (let rr = 1; rr < rows; rr++) out += line(x, y + (h / rows) * rr, x + w, y + (h / rows) * rr, frame, 6);
  out += poly([[x + w * 0.1, y], [x + w * 0.24, y], [x + w * 0.04, y + h], [x - w * 0.1, y + h]], '#fff', 'opacity="0.10"');
  out += rect(x - 10, y + h, w + 20, 10, frame);
  return out;
}

/** The gym's name on its wall. */
const escape = (text) => text.replace(/&(?!amp;)/g, '&amp;');

function sign(spec, p) {
  const { x, y, size = 64, style = 'paint', colour = '#fff', panel } = spec;
  const text = escape(spec.text);
  const sub = spec.sub ? escape(spec.sub) : null;
  const anchor = 'text-anchor="middle"';
  const family = `font-family="Inter" font-weight="${style === 'light' ? 600 : 900}" letter-spacing="${spec.tracking ?? 4}"`;
  let out = '';
  if (panel) out += round(x - panel / 2, y - size * 1.05, panel, size * (sub ? 1.75 : 1.4), 12, p.signPanel ?? '#15171C', 'opacity="0.92"');
  if (style === 'neon') {
    out += `<text x="${x}" y="${y}" ${anchor} ${family} font-size="${size}" fill="none" stroke="${colour}" stroke-width="3" filter="url(#glow)">${text}</text>`;
    out += `<text x="${x}" y="${y}" ${anchor} ${family} font-size="${size}" fill="none" stroke="#fff" stroke-width="1.2" opacity="0.9">${text}</text>`;
  } else if (style === 'metal') {
    out += `<text x="${x + 3}" y="${y + 4}" ${anchor} ${family} font-size="${size}" fill="#000" opacity="0.35">${text}</text>`;
    out += `<text x="${x}" y="${y}" ${anchor} ${family} font-size="${size}" fill="${colour}">${text}</text>`;
  } else {
    out += `<text x="${x}" y="${y}" ${anchor} ${family} font-size="${size}" fill="${colour}" opacity="${style === 'paint' ? 0.92 : 1}">${text}</text>`;
  }
  if (sub) out += `<text x="${x}" y="${y + size * 0.55}" ${anchor} font-family="Inter" font-weight="700" letter-spacing="${(spec.tracking ?? 4) + 6}" font-size="${size * 0.3}" fill="${spec.subColour ?? colour}" opacity="0.85">${sub}</text>`;
  return out;
}

function lights(kind, p) {
  let out = '';
  if (kind === 'pendant') {
    for (let k = 0; k < 4; k++) {
      const x = 180 + k * 280;
      out += line(x, 0, x, 70, '#1A1C21', 3);
      out += poly([[x - 34, 104], [x + 34, 104], [x + 16, 70], [x - 16, 70]], p.lamp ?? '#1A1C21');
      out += `<ellipse cx="${x}" cy="104" rx="30" ry="6" fill="#FFE7B0"/>`;
      out += poly([[x - 30, 106], [x + 30, 106], [x + 150, 520], [x - 150, 520]], 'url(#lamp)', 'opacity="0.55"');
    }
  } else if (kind === 'strip') {
    for (let k = 0; k < 3; k++) out += round(140 + k * 340, 24, 240, 10, 5, p.stripColour ?? '#F4F7FF', `filter="url(#glow)" opacity="0.95"`);
  } else if (kind === 'neon') {
    out += rect(0, 18, W, 6, p.neonA ?? '#FF4FA3', 'filter="url(#glow)" opacity="0.9"');
  }
  return out;
}

function floorLayer(kind, p) {
  let out = rect(0, HORIZON, W, H - HORIZON, 'url(#floor)');
  const vx = W / 2;
  const vy = HORIZON - 260;
  if (kind === 'timber') {
    for (let k = -14; k <= 14; k++) {
      const bx = vx + k * 120;
      const tx = vx + ((bx - vx) * (HORIZON - vy)) / (H - vy);
      out += line(tx, HORIZON, bx, H, '#000', 1.6, 'opacity="0.14"');
    }
  } else if (kind === 'rubber') {
    for (let k = 1; k < 6; k++) {
      const y = HORIZON + (H - HORIZON) * ((k / 6) ** 1.6);
      out += line(0, y, W, y, '#fff', 1, 'opacity="0.05"');
    }
  } else if (kind === 'polished') {
    out += rect(0, HORIZON, W, (H - HORIZON) * 0.5, '#fff', 'opacity="0.06"');
  }
  return out;
}

/** A lifting platform: timber in the middle, rubber either side, laid on the floor. */
function platform(x, y, w = 330) {
  const s = scaleAt(y);
  const pw = w * s;
  const depth = 54 * s;
  const skew = 22 * s;
  return (
    poly([[x - pw / 2, y + depth / 2], [x + pw / 2, y + depth / 2], [x + pw / 2 - skew, y - depth / 2], [x - pw / 2 + skew, y - depth / 2]], '#1A1B1F') +
    poly([[x - pw / 4, y + depth / 2], [x + pw / 4, y + depth / 2], [x + pw / 4 - skew * 0.5, y - depth / 2], [x - pw / 4 + skew * 0.5, y - depth / 2]], '#C99A63')
  );
}

function turf(y, h = 70, colour = '#3E8E4C') {
  let out = poly([[0, y + h], [W, y + h], [W, y], [0, y]], colour);
  for (let k = 0; k < 7; k++) out += rect(80 + k * 160, y + 4, 4, h - 8, '#fff', 'opacity="0.7"');
  return out;
}

function pool(p) {
  let out = rect(0, HORIZON, W, H - HORIZON, p.floor);
  const top = HORIZON + 30;
  const bottom = H - 110;
  out += rect(0, top, W, bottom - top, '#2C8FCB');
  out += rect(0, top, W, (bottom - top) * 0.45, '#56B4E2', 'opacity="0.55"');
  const r = rand(9);
  for (let k = 0; k < 40; k++) out += rect(r() * W, top + 6 + r() * (bottom - top - 12), 18 + r() * 40, 2, '#fff', `opacity="${0.25 + r() * 0.35}"`);
  for (let lane = 1; lane < 5; lane++) {
    const ly = top + ((bottom - top) / 5) * lane;
    for (let x = 0; x < W; x += 22) out += circle(x + 11, ly, 5, lane % 2 ? '#F4F4F4' : '#D23A3A');
  }
  out += rect(0, top - 6, W, 8, '#E8EEF3');
  out += rect(0, bottom, W, 10, '#E8EEF3');
  for (let k = 0; k < 4; k++) {
    const bx = 220 + k * 250;
    out += rect(bx - 26, bottom + 12, 52, 40, '#E8EEF3');
    out += rect(bx - 22, bottom + 8, 44, 10, '#2F62C9');
    out += `<text x="${bx}" y="${bottom + 44}" text-anchor="middle" font-family="Inter" font-weight="800" font-size="22" fill="#2F62C9">${k + 1}</text>`;
  }
  return out;
}

function mirror(x, y, w, h) {
  return rect(x, y, w, h, 'url(#mirror)', 'opacity="0.9"') + poly([[x + w * 0.2, y], [x + w * 0.32, y], [x + w * 0.12, y + h], [x, y + h]], '#fff', 'opacity="0.25"') + `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="none" stroke="#2A2D34" stroke-width="5"/>`;
}

function picture(g) {
  const p = g.palette;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs(p)}`;
  svg += wallTexture(g.wall, p);
  for (const win of g.windows ?? []) svg += windowFrame(win.x, win.y, win.w, win.h, g.view, p.frame ?? '#23262D', win.cols, win.rows, win.arch, win.seed ?? 5);
  if (g.mirror) svg += mirror(...g.mirror);
  svg += lights(g.lights, p);
  if (g.sign) svg += sign(g.sign, p);
  svg += g.pool ? pool(p) : floorLayer(g.floor, p);
  if (g.turf) svg += turf(...g.turf);
  for (const pl of g.platforms ?? []) svg += platform(...pl);
  // Further back first, so nearer things stand in front.
  const items = [...g.kit].sort((a, b) => a[2] - b[2]);
  for (const [kind, x, y, ...rest] of items) svg += KIT[kind](x, y, ...rest);
  svg += rect(0, 0, W, H, 'url(#vignette)');
  svg += rect(0, 0, W, H, '#000', 'filter="url(#grain)"');
  svg += '</svg>';
  return svg;
}

// --- The gyms ----------------------------------------------------------------

const GYMS = [
  {
    id: 'ironbark-strength-surry-hills',
    alt: 'Two power racks loaded with bumper plates on wooden platforms, a dumbbell rack and a plate tree, under hanging lamps on a dark green wall',
    palette: { wallTop: '#3D5A48', wall: '#2B4335', band: '#22362A', floorFar: '#2A2B2F', floor: '#17181B', frame: '#1C1E22', lamp: '#C9A15A' },
    wall: 'painted',
    lights: 'pendant',
    floor: 'rubber',
    sign: { text: 'IRONBARK', sub: 'STRENGTH CO.', x: 600, y: 200, size: 92, style: 'metal', colour: '#E9DFC8', tracking: 10 },
    platforms: [[340, 640], [860, 640]],
    kit: [['powerRack', 340, 640, STEEL, ['red', 'red', 'blue']], ['powerRack', 860, 640, STEEL, ['blue', 'yellow']], ['dumbbellRack', 600, 560], ['plateTree', 1110, 600], ['bench', 120, 720], ['kettlebells', 620, 770, 4]],
  },
  {
    id: 'waterloo-aquatic-fitness',
    alt: 'An indoor pool with lane ropes and starting blocks under high windows, with a bench and plants on the deck',
    palette: { wallTop: '#DDEFF4', wall: '#BFE0EA', floorFar: '#E2E9EE', floor: '#D3DCE3', frame: '#E9EFF3', signPanel: '#1D5C8C' },
    wall: 'tiles',
    windows: [{ x: 80, y: 40, w: 1040, h: 150, cols: 8, rows: 1, seed: 7 }],
    view: 'park',
    lights: 'strip',
    pool: true,
    sign: { text: 'WATERLOO AQUATIC', sub: '& FITNESS CENTRE', x: 600, y: 300, size: 52, style: 'paint', colour: '#fff', panel: 720 },
    kit: [['plant', 70, 780], ['plant', 1130, 780], ['bench', 600, 800, '#1D5C8C']],
  },
  {
    id: 'halfmoon-fitness-redfern',
    alt: 'Treadmills in a row facing a tall window onto a night skyline with a half moon, a cable station and a Smith machine under strip lights',
    palette: { wallTop: '#2D2A5A', wall: '#1E1C42', band: '#17153A', floorFar: '#24233E', floor: '#14132A', frame: '#0F0E22', stripColour: '#C7C3FF' },
    wall: 'painted',
    windows: [{ x: 120, y: 60, w: 560, h: 330, cols: 4, rows: 2, seed: 3 }],
    view: 'moon',
    lights: 'strip',
    floor: 'polished',
    sign: { text: 'HALFMOON', x: 940, y: 180, size: 70, style: 'paint', colour: '#E9E6FF', tracking: 8 },
    kit: [['treadmill', 230, 610, '#8B7BFF'], ['treadmill', 520, 610, '#8B7BFF'], ['cableStation', 950, 560, STEEL, '#8B7BFF'], ['smithMachine', 820, 720], ['dumbbellRack', 400, 760]],
  },
  {
    id: 'tallow-street-gym-chippendale',
    alt: 'A brick-walled gym with an air bike, a cable station, a dumbbell rack and a bench, under hanging lamps',
    palette: { mortar: '#D9C7AE', brickA: '#C77B50', brickB: '#B36A44', brickC: '#D48C5E', floorFar: '#3A3532', floor: '#221F1D', frame: '#1F2125' },
    wall: 'brick',
    lights: 'pendant',
    floor: 'rubber',
    sign: { text: 'TALLOW ST.', sub: 'GYM', x: 600, y: 230, size: 86, style: 'paint', colour: '#FBF6EC', tracking: 6, panel: 640 },
    kit: [['cableStation', 300, 570], ['airBike', 900, 600, '#D23A3A'], ['dumbbellRack', 620, 640], ['bench', 1060, 740], ['squatStand', 170, 760, STEEL, ['red', 'yellow']]],
  },
  {
    id: 'quarry-lane-barbell-alexandria',
    alt: 'Three lifting platforms with power racks and bumper plates in a concrete hall, a turf strip with a sled, and a plate tree',
    palette: { wallTop: '#8E9196', wall: '#6E7277', floorFar: '#2B2C30', floor: '#18191C', frame: '#202227' },
    wall: 'concrete',
    lights: 'strip',
    floor: 'rubber',
    sign: { text: 'QUARRY LANE', sub: 'BARBELL', x: 600, y: 170, size: 84, style: 'paint', colour: '#F2EFE8', tracking: 12 },
    platforms: [[220, 600, 300], [600, 600, 300], [980, 600, 300]],
    turf: [705, 60],
    kit: [['powerRack', 220, 600, STEEL, ['red', 'red']], ['powerRack', 600, 600, STEEL, ['blue', 'blue', 'yellow']], ['powerRack', 980, 600, STEEL, ['red', 'green']], ['sled', 420, 760], ['plateTree', 820, 780]],
  },
  {
    id: 'marrow-and-co-darlinghurst',
    alt: 'A bright studio with a mirror wall, plyo boxes, a row of kettlebells, an air bike and a sled on a turf strip, with plants',
    palette: { wallTop: '#F3DCD0', wall: '#E7C3B2', band: '#C98F77', floorFar: '#D9B48E', floor: '#BF9469' },
    wall: 'painted',
    mirror: [80, 120, 520, 300],
    lights: 'strip',
    floor: 'timber',
    turf: [690, 70, '#4C9A5A'],
    sign: { text: 'Marrow & Co', x: 900, y: 220, size: 78, style: 'light', colour: '#7A3E2C', tracking: 1 },
    kit: [['boxes', 300, 600], ['kettlebells', 640, 610, 5], ['airBike', 940, 620, '#C25E3F'], ['sled', 760, 770], ['plant', 1130, 640, '#F7EFE8'], ['plant', 60, 680, '#F7EFE8'], ['medBalls', 420, 790]],
  },
  {
    id: 'keystone-fitness-ultimo',
    alt: 'Arched windows onto the city behind a Smith machine, a cable station, a leg press and treadmills on a timber floor',
    palette: { wallTop: '#F0E7D8', wall: '#E2D5BF', band: '#C9B699', floorFar: '#B88E62', floor: '#9C7350', frame: '#5B4A3A' },
    wall: 'painted',
    windows: [{ x: 70, y: 120, w: 270, h: 250, cols: 2, rows: 3, arch: true, seed: 11 }, { x: 860, y: 120, w: 270, h: 250, cols: 2, rows: 3, arch: true, seed: 13 }],
    view: 'city',
    lights: 'none',
    floor: 'timber',
    sign: { text: 'KEYSTONE', sub: 'FITNESS', x: 600, y: 210, size: 60, style: 'metal', colour: '#5B4A3A', tracking: 8 },
    kit: [['smithMachine', 210, 600], ['cableStation', 980, 590], ['sledMachine', 620, 620], ['treadmill', 420, 770, '#E8B92E'], ['dumbbellRack', 860, 780]],
  },
  {
    id: 'vellum-strength-newtown',
    alt: 'A pale, minimal strength room with squat stands, barbells, a bench and a dumbbell rack on a timber floor',
    palette: { wallTop: '#F6F1E6', wall: '#ECE4D3', band: '#DDD2BC', floorFar: '#CFAE85', floor: '#B48C62', frame: '#4C4A45' },
    wall: 'painted',
    windows: [{ x: 760, y: 70, w: 360, h: 300, cols: 3, rows: 3, seed: 21 }],
    view: 'city',
    lights: 'none',
    floor: 'timber',
    sign: { text: 'VELLUM', sub: 'STRENGTH', x: 360, y: 230, size: 100, style: 'paint', colour: '#3B3935', tracking: 14 },
    kit: [['squatStand', 280, 600, '#3B3935', ['black', 'black']], ['squatStand', 640, 600, '#3B3935', ['red', 'blue']], ['bench', 960, 640, '#3B3935'], ['dumbbellRack', 470, 760, '#3B3935', '#3B3935']],
  },
  {
    id: 'brickworks-gym-alexandria',
    alt: 'A red-brick warehouse gym with a squat stand, a cable station and a dumbbell rack under steel trusses and lamps',
    palette: { mortar: '#CDB8A4', brickA: '#9E3F2E', brickB: '#8A3526', brickC: '#B04A36', floorFar: '#33302E', floor: '#1E1C1B', frame: '#25272C', lamp: '#2B2D33' },
    wall: 'brick',
    windows: [{ x: 820, y: 90, w: 300, h: 220, cols: 3, rows: 2, seed: 31 }],
    view: 'dusk',
    lights: 'pendant',
    floor: 'rubber',
    sign: { text: 'BRICKWORKS', x: 400, y: 230, size: 80, style: 'paint', colour: '#F7EEDF', tracking: 8, panel: 620 },
    kit: [['cableStation', 300, 580], ['squatStand', 700, 610], ['dumbbellRack', 520, 760], ['plateTree', 1000, 700]],
  },
  {
    id: 'foundry-lane-erskineville',
    alt: 'A functional-training box with racks, rowers, air bikes, plyo boxes, kettlebells and a sled on turf, in a dark steel hall with orange signage',
    palette: { wallTop: '#3A3D44', wall: '#26282D', band: '#1C1E22', floorFar: '#2A2B2F', floor: '#151619', frame: '#111215' },
    wall: 'concrete',
    lights: 'strip',
    floor: 'rubber',
    turf: [660, 64, '#3E8E4C'],
    sign: { text: 'FOUNDRY LANE', sub: 'ATHLETIC', x: 600, y: 170, size: 82, style: 'paint', colour: '#F28C28', tracking: 10, subColour: '#F2EFE8' },
    platforms: [[220, 590, 280]],
    kit: [['squatStand', 220, 590, '#F28C28'], ['rower', 560, 600, '#F28C28'], ['airBike', 900, 610, '#F28C28'], ['sled', 700, 740], ['boxes', 1080, 620], ['kettlebells', 320, 780, 5], ['rower', 880, 790, '#F28C28']],
  },
  {
    id: 'nightshift-gym-haymarket',
    alt: 'A late-night gym with a glowing neon sign, treadmills facing a lit city window, a squat stand and a dumbbell rack',
    palette: { wallTop: '#1C1D2B', wall: '#111219', band: '#0C0D14', floorFar: '#1D1E2A', floor: '#0B0C12', frame: '#08090E', neonA: '#FF4FA3' },
    wall: 'painted',
    windows: [{ x: 700, y: 60, w: 420, h: 330, cols: 3, rows: 2, seed: 41 }],
    view: 'night',
    lights: 'neon',
    floor: 'polished',
    sign: { text: 'NIGHTSHIFT', sub: 'OPEN ALL NIGHT', x: 360, y: 210, size: 82, style: 'neon', colour: '#FF4FA3', tracking: 6, subColour: '#6FD3FF' },
    kit: [['treadmill', 760, 600, '#6FD3FF'], ['treadmill', 1040, 600, '#6FD3FF'], ['squatStand', 240, 620, '#3B3E52', ['blue', 'blue']], ['dumbbellRack', 520, 760, '#3B3E52']],
  },
  {
    id: 'saltwater-strength-pyrmont',
    alt: 'A light, airy gym with a wide window onto the water, a squat stand, a cable station and a dumbbell rack',
    palette: { wallTop: '#F4F8F8', wall: '#E2EEEE', band: '#2C7A7B', floorFar: '#C9D3D6', floor: '#AEBBBF', frame: '#E9F0F0' },
    wall: 'painted',
    windows: [{ x: 60, y: 60, w: 660, h: 300, cols: 3, rows: 1, seed: 51 }],
    view: 'ocean',
    lights: 'none',
    floor: 'polished',
    sign: { text: 'SALTWATER', sub: 'STRENGTH', x: 955, y: 200, size: 52, style: 'paint', colour: '#2C7A7B', tracking: 5 },
    kit: [['squatStand', 260, 610, '#2C7A7B', ['blue', 'green']], ['cableStation', 900, 580, '#2C7A7B', '#F4F8F8'], ['dumbbellRack', 560, 760, '#2C7A7B'], ['plant', 1140, 780]],
  },
  {
    id: 'greenway-community-gym-glebe',
    alt: 'A community gym with green walls and plants, park views, treadmills, a rower, a lifting platform with a squat stand and a dumbbell rack',
    palette: { wallTop: '#DCEBD6', wall: '#C4DDBA', band: '#4E8F4A', floorFar: '#C29C72', floor: '#A07C55', frame: '#3E5E3A' },
    wall: 'painted',
    windows: [{ x: 50, y: 70, w: 320, h: 260, cols: 2, rows: 2, seed: 61 }, { x: 830, y: 70, w: 320, h: 260, cols: 2, rows: 2, seed: 62 }],
    view: 'park',
    lights: 'none',
    floor: 'timber',
    sign: { text: 'GREENWAY', sub: 'COMMUNITY GYM', x: 600, y: 190, size: 52, style: 'paint', colour: '#2F5E2C', tracking: 5 },
    platforms: [[600, 610, 300]],
    kit: [['squatStand', 600, 610, '#3E5E3A', ['red', 'green']], ['treadmill', 230, 620, '#4E8F4A'], ['rower', 960, 620, '#4E8F4A'], ['dumbbellRack', 380, 780, '#3E5E3A'], ['plant', 1120, 760], ['plant', 70, 780]],
  },
  {
    id: 'paddington-hill-fitness',
    alt: 'A window onto a hill of terrace houses behind a leg press, a hack squat, a squat stand and a cable station',
    palette: { wallTop: '#E9EDF3', wall: '#D5DCE6', band: '#22355A', floorFar: '#B6BCC6', floor: '#969DAA', frame: '#22355A' },
    wall: 'painted',
    windows: [{ x: 560, y: 60, w: 560, h: 290, cols: 3, rows: 2, seed: 71 }],
    view: 'hills',
    lights: 'none',
    floor: 'polished',
    sign: { text: 'PADDINGTON', sub: 'HILL FITNESS', x: 280, y: 200, size: 50, style: 'paint', colour: '#22355A', tracking: 6 },
    kit: [['sledMachine', 230, 630, '#22355A', '#22355A', 1], ['sledMachine', 970, 630, '#22355A', '#22355A', -1], ['squatStand', 600, 600, '#22355A'], ['cableStation', 600, 800, '#22355A', '#C9A15A']],
  },
  {
    id: 'oakline-fitness-zetland',
    alt: 'Oak slat walls and an oak floor with a squat stand, a bench, a cable station and a dumbbell rack',
    palette: { wallTop: '#C89B6A', wall: '#A77C52', slat: '#D2A877', floorFar: '#D6B48A', floor: '#BC9467', frame: '#3B3229' },
    wall: 'slats',
    lights: 'strip',
    floor: 'timber',
    sign: { text: 'OAKLINE', x: 600, y: 190, size: 96, style: 'metal', colour: '#2E2620', tracking: 16 },
    kit: [['squatStand', 270, 600, '#2E2620', ['black', 'black']], ['cableStation', 860, 590, '#2E2620', '#D2A877'], ['bench', 560, 650, '#2E2620'], ['dumbbellRack', 600, 780, '#2E2620', '#2E2620']],
  },
  {
    id: 'harbourgate-strength-potts-point',
    alt: 'A navy-and-brass gym looking out over a harbour and its arch bridge, with power racks, a hack squat, a leg press and a cable station',
    palette: { wallTop: '#22365A', wall: '#182845', band: '#101C33', floorFar: '#2A2D36', floor: '#16181E', frame: '#C9A15A' },
    wall: 'painted',
    windows: [{ x: 60, y: 50, w: 640, h: 300, cols: 4, rows: 2, seed: 81 }],
    view: 'harbour',
    lights: 'none',
    floor: 'rubber',
    sign: { text: 'HARBOURGATE', sub: 'STRENGTH', x: 950, y: 200, size: 52, style: 'metal', colour: '#E2C07E', tracking: 6 },
    platforms: [[300, 620, 300]],
    kit: [['powerRack', 300, 620, '#C9A15A', ['red', 'blue']], ['squatStand', 1000, 600, '#C9A15A'], ['sledMachine', 700, 640, STEEL, '#182845', -1], ['cableStation', 560, 790, STEEL, '#C9A15A']],
  },
  {
    id: 'copperfield-gym-camperdown',
    alt: 'Deep teal walls with copper lettering over treadmills, a squat stand, a bench and a cable station',
    palette: { wallTop: '#1F4D4F', wall: '#163A3C', band: '#0F2B2D', floorFar: '#2E2B29', floor: '#1A1817', frame: '#0E2224', lamp: '#C46B32' },
    wall: 'painted',
    lights: 'pendant',
    floor: 'rubber',
    sign: { text: 'COPPERFIELD', x: 600, y: 210, size: 96, style: 'metal', colour: 'url(#copper)', tracking: 8 },
    kit: [['treadmill', 220, 600, '#C46B32'], ['treadmill', 500, 600, '#C46B32'], ['squatStand', 850, 620, '#C46B32'], ['bench', 1080, 700], ['cableStation', 600, 790, STEEL, '#C46B32']],
  },
];

mkdirSync(OUT, { recursive: true });
let total = 0;
for (const gym of GYMS) {
  const file = join(OUT, `${gym.id}.webp`);
  const info = await sharp(Buffer.from(picture(gym)), { density: 72 }).resize(1080, 720).webp({ quality: 80, effort: 6 }).toFile(file);
  total += info.size;
  console.log(`${gym.id}.webp  ${(info.size / 1024).toFixed(0)} KB`);
}

// The app's map from a demo gym to its picture, and what the picture shows.
const ts = `// Made by scripts/demo-pictures.mjs: run it again rather than editing this.
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * The demo's invented gyms' pictures: illustrations, never photographs,
 * made for the GymGO demo (scripts/demo-pictures.mjs). Keyed by gym id;
 * \`alt\` says what each shows.
 */
export const DEMO_PICTURES: Record<string, { source: number; alt: string }> = {
${GYMS.map((g) => `  '${g.id}': { source: require('../../assets/demo/${g.id}.webp'), alt: ${JSON.stringify(g.alt)} },`).join('\n')}
};
`;
writeFileSync(join(root, 'src', 'lib', 'demoPictures.ts'), ts);
console.log(`${GYMS.length} pictures, ${(total / 1024).toFixed(0)} KB; wrote src/lib/demoPictures.ts`);
