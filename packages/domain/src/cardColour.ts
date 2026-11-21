/**
 * A collected gym's card in its brand's colour: read from the gym's own
 * logo or website icon (the app's bundled brand logos at build time,
 * apps/mobile/scripts/brand-colours.mts; a website icon on the server,
 * GET /api/gyms/:id/icon-colour), never chosen for it. A logo that's black,
 * white or grey has no colour to take, and the card keeps its gem's.
 *
 * Shared by the app, the server and the script; no images here, only
 * pixels.
 */

interface Hsl {
  h: number;
  s: number;
  l: number;
}

/** "#E0234E" from 0–255 channels. */
export function rgbHex(r: number, g: number, b: number): string {
  const part = (value: number) => Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`.toUpperCase();
}

/** 0–255 channels from "#E0234E" (or "#e0234e"); null for anything else. */
export function hexRgb(hex: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const value = Number.parseInt(match[1]!, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function toHsl(r: number, g: number, b: number): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === rn ? ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6 : max === gn ? ((bn - rn) / d + 2) / 6 : ((rn - gn) / d + 4) / 6;
  return { h: h * 360, s, l };
}

function fromHsl({ h, s, l }: Hsl): [number, number, number] {
  const hue = (((h % 360) + 360) % 360) / 360;
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t0: number) => {
    let t = t0;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [channel(hue + 1 / 3) * 255, channel(hue) * 255, channel(hue - 1 / 3) * 255];
}

/** Below this share of a logo's visible pixels, a colour is a detail, not the brand's. */
const MIN_SHARE = 0.04;
const BINS = 24;

/**
 * A logo's own colour: of its visible pixels (alpha above half), those
 * with colour in them (neither near white, near black nor grey), sorted by
 * hue into 24 bins weighted by how vivid they are; the busiest bin's
 * average. Null when colour is under 4% of the logo (a black, white or
 * grey one). `pixels` are 8-bit, `channels` (3 or 4) to a pixel.
 */
export function logoColour(pixels: ArrayLike<number>, channels: 3 | 4): string | null {
  const weight = new Array<number>(BINS).fill(0);
  const sums = Array.from({ length: BINS }, () => [0, 0, 0]);
  let visible = 0;
  let coloured = 0;
  for (let at = 0; at + channels <= pixels.length; at += channels) {
    if (channels === 4 && pixels[at + 3]! < 128) continue;
    visible += 1;
    const r = pixels[at]!;
    const g = pixels[at + 1]!;
    const b = pixels[at + 2]!;
    const { h, s, l } = toHsl(r, g, b);
    if (l > 0.93 || l < 0.08 || s < 0.25) continue;
    coloured += 1;
    const bin = Math.floor(h / (360 / BINS)) % BINS;
    const vivid = s * (1 - Math.abs(l - 0.5));
    weight[bin] = weight[bin]! + vivid;
    const sum = sums[bin]!;
    sum[0] = sum[0]! + r * vivid;
    sum[1] = sum[1]! + g * vivid;
    sum[2] = sum[2]! + b * vivid;
  }
  if (visible === 0 || coloured / visible < MIN_SHARE) return null;
  let best = 0;
  for (let bin = 1; bin < BINS; bin += 1) if (weight[bin]! > weight[best]!) best = bin;
  // A hue's neighbours count too, so a colour on a bin's edge isn't split in two.
  const near = [(best + BINS - 1) % BINS, best, (best + 1) % BINS];
  const total = near.reduce((sum, bin) => sum + weight[bin]!, 0);
  const mix = [0, 1, 2].map((channel) => near.reduce((sum, bin) => sum + sums[bin]![channel]!, 0) / total);
  return rgbHex(mix[0]!, mix[1]!, mix[2]!);
}

/**
 * The card's three shades from a brand colour, light to deep, as a gem's
 * are: the brand's hue, made strong and mid-toned enough to carry white
 * text and a logo plate, whatever the logo's own shade was.
 */
export function cardPalette(hex: string): [string, string, string] | null {
  const rgb = hexRgb(hex);
  if (!rgb) return null;
  const { h, s } = toHsl(...rgb);
  const strong = Math.min(0.92, Math.max(0.55, s));
  const shade = (l: number, sat: number) => rgbHex(...fromHsl({ h, s: sat, l }));
  return [shade(0.72, strong * 0.95), shade(0.47, strong), shade(0.26, strong * 0.9)];
}
