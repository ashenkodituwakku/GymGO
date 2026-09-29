/**
 * A gym's own icon, from its own website.
 *
 * Most gyms have no freely licensed logo anywhere, but nearly every gym with
 * a website publishes an icon for it: the square picture a phone puts on its
 * home screen, or the logo the site declares for search engines. GymGO
 * shows that next to the gym's name, credited to the site, the way a browser
 * or a search engine shows a site's icon beside its link. It's the gym's own
 * mark, so it is never altered or made up, and a gym without one shows none.
 *
 * Website addresses come from OpenStreetMap, which anyone can edit, so the
 * fetcher is careful about where it goes:
 *  - only http(s) on the standard ports, no user names in the address;
 *  - every address a name resolves to is checked when the connection is
 *    made, so nothing private (this computer, the local network, cloud
 *    metadata addresses) can be reached, even through a redirect;
 *  - small pages and small images only, a short timeout, three redirects;
 *  - only PNG, JPEG, WebP and GIF, recognised by their bytes; served back
 *    with the type they really are.
 *
 * It takes the best icon it can get: one at least 64 pixels square from the
 * site itself, else Google's copy of the site's icon (Google's favicon
 * service has most sites' icons, also for sites that turn automated visitors
 * away or only offer .ico and .svg files), else a smaller one, down to 32
 * pixels. A white mark on a transparent background, which would vanish on the
 * app's white plate, is put on a dark square instead.
 *
 * Results are kept by website origin for a month (a week when the site has
 * no usable icon, an hour when it didn't answer), so a chain's branches
 * share one fetch and a page of results costs each site one visit a month.
 */

import { lookup as dnsLookup, type LookupAddress } from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import { BlockList, isIP } from 'node:net';
import { crc32, deflateSync, inflateSync } from 'node:zlib';
import { chainWebsite, type GymRecord } from '@gymgo/domain';
import type { Db } from './db';

const UA = 'GymGO/0.1 (site icon for a gym finder; https://github.com/ashenkodituwakku/GymGO)';
const PAGE_BYTES = 512 * 1024;
const IMAGE_BYTES = 1024 * 1024;
const TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;
const FOUND_DAYS = 30;
const NONE_DAYS = 7;
/** A site that didn't answer (timed out, refused, 5xx) is asked again after an hour, not a week. */
const UNREACHABLE_DAYS = 1 / 24;
const UNREACHABLE = 'unreachable';
/** An icon this big from the site itself ends the search. */
const MIN_SIDE = 64;
/** Smaller than this is too blurry to show. */
const SMALL_SIDE = 32;
/** What a white mark on a transparent background is put on. */
const DARK_PLATE: [number, number, number] = [28, 28, 30];

/** Google's copy of a site's icon, as big as it has up to 256 pixels; 404 when it has none. */
export function googleIconUrl(origin: string): URL {
  const url = new URL('https://t3.gstatic.com/faviconV2');
  url.search = new URLSearchParams({ client: 'SOCIAL', type: 'FAVICON', fallback_opts: 'TYPE,SIZE,URL', url: `${origin}/`, size: '256' }).toString();
  return url;
}

// --- Where the fetcher may go -------------------------------------------------

const PRIVATE = new BlockList();
for (const [net, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) {
  PRIVATE.addSubnet(net, prefix, 'ipv4');
}
// No ::ffff:0:0/96 rule: Node checks IPv4-mapped addresses against the IPv4
// rules above already, and that rule would match every IPv4 address.
for (const [net, prefix] of [
  ['::', 127], ['64:ff9b::', 96], ['100::', 64], ['2001::', 23], ['2001:db8::', 32],
  ['fc00::', 7], ['fe80::', 10], ['ff00::', 8],
] as const) {
  PRIVATE.addSubnet(net, prefix, 'ipv6');
}

/** True for any address that isn't on the public internet. */
export function isPrivateAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 0) return true;
  return PRIVATE.check(address, family === 6 ? 'ipv6' : 'ipv4');
}

/** A web address the fetcher may request, or null. */
export function allowedUrl(raw: string, base?: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw, base);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.username || url.password) return null;
  if (url.port && url.port !== '80' && url.port !== '443') return null;
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(host) !== 0 && isPrivateAddress(host)) return null;
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return null;
  return url;
}

/** DNS lookup that refuses to connect anywhere private, checked at connection time. */
function guardedLookup(
  hostname: string,
  options: { family?: number; all?: boolean },
  callback: (error: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void,
): void {
  dnsLookup(hostname, { family: options.family ?? 0, all: true }, (error, addresses) => {
    if (error) return callback(error, '');
    const list = addresses as LookupAddress[];
    if (list.length === 0 || list.some((item) => isPrivateAddress(item.address))) {
      const refused = new Error(`Refusing to connect to ${hostname}: not a public address.`) as NodeJS.ErrnoException;
      refused.code = 'EPRIVATE';
      return callback(refused, '');
    }
    if (options.all) return callback(null, list);
    return callback(null, list[0]!.address, list[0]!.family);
  });
}

// Own agents, so no proxy or global setting can route around the guard.
const agents = {
  'http:': new http.Agent({ lookup: guardedLookup as never, keepAlive: false }),
  'https:': new https.Agent({ lookup: guardedLookup as never, keepAlive: false }),
};

export interface Fetched {
  status: number;
  type: string;
  body: Buffer;
  url: string;
}

/** Fetch a page or image: redirects re-checked, size and time capped. */
export type SafeGet = (url: URL, maxBytes: number, accept: string) => Promise<Fetched>;

export const safeGet: SafeGet = async (start, maxBytes, accept) => {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const answer = await new Promise<{ status: number; type: string; location: string | null; body: Buffer }>((resolve, reject) => {
      const client = url.protocol === 'https:' ? https : http;
      const request = client.get(
        url,
        { agent: agents[url.protocol as 'http:' | 'https:'], headers: { 'User-Agent': UA, Accept: accept }, timeout: TIMEOUT_MS },
        (response) => {
          const status = response.statusCode ?? 0;
          const type = String(response.headers['content-type'] ?? '');
          const location = typeof response.headers.location === 'string' ? response.headers.location : null;
          if (status >= 300 && status < 400) {
            response.resume();
            return resolve({ status, type, location, body: Buffer.alloc(0) });
          }
          const chunks: Buffer[] = [];
          let size = 0;
          response.on('data', (chunk: Buffer) => {
            size += chunk.length;
            if (size > maxBytes) {
              // Enough: a page's head is near its top; an oversized image is refused below.
              chunks.push(chunk.subarray(0, Math.max(0, chunk.length - (size - maxBytes))));
              response.destroy();
              return resolve({ status, type, location, body: Buffer.concat(chunks) });
            }
            chunks.push(chunk);
          });
          response.on('end', () => resolve({ status, type, location, body: Buffer.concat(chunks) }));
          response.on('error', reject);
        },
      );
      request.on('timeout', () => request.destroy(new Error('timed out')));
      request.on('error', reject);
    });
    if (answer.status >= 300 && answer.status < 400 && answer.location) {
      const next = allowedUrl(answer.location, url.href);
      if (!next) throw new Error('Redirected somewhere not allowed.');
      url = next;
      continue;
    }
    return { status: answer.status, type: answer.type, body: answer.body, url: url.href };
  }
  throw new Error('Too many redirects.');
};

// --- Reading the page -----------------------------------------------------------

function attr(tag: string, name: string): string | null {
  const match = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
  const value = match ? (match[1] ?? match[2] ?? match[3] ?? '') : null;
  return value === null ? null : value.replace(/&amp;/g, '&').trim();
}

function largestSize(sizes: string | null): number {
  if (!sizes) return 0;
  return Math.max(0, ...[...sizes.matchAll(/(\d+)x(\d+)/gi)].map((m) => Math.min(Number(m[1]), Number(m[2]))));
}

/** Logo addresses found in JSON-LD: an organisation's or business's "logo". */
function jsonLdLogos(html: string): string[] {
  const found: string[] = [];
  const visit = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== 'object') return;
    const logo = (node as Record<string, unknown>).logo;
    if (typeof logo === 'string') found.push(logo);
    else if (logo && typeof logo === 'object' && typeof (logo as Record<string, unknown>).url === 'string') found.push((logo as { url: string }).url);
    for (const value of Object.values(node)) if (value && typeof value === 'object') visit(value);
  };
  for (const match of html.matchAll(/<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      visit(JSON.parse(match[1]!));
    } catch {
      // Not valid JSON: skip it.
    }
  }
  return found;
}

/** Icon candidates in a page, best first: home-screen icons, big icons, the declared logo, icons of unstated size, then the conventional path. */
export function iconCandidates(html: string, pageUrl: string): URL[] {
  const scored: Array<{ url: URL; score: number }> = [];
  const add = (href: string | null, score: number) => {
    if (!href || /\.(svg|ico)(\?|#|$)/i.test(href) || href.startsWith('data:')) return;
    const url = allowedUrl(href, pageUrl);
    if (url) scored.push({ url, score });
  };
  const head = html.slice(0, PAGE_BYTES);
  for (const tag of head.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = (attr(tag, 'rel') ?? '').toLowerCase().split(/\s+/);
    const type = (attr(tag, 'type') ?? '').toLowerCase();
    if (type.includes('svg') || type.includes('icon')) continue;
    const size = largestSize(attr(tag, 'sizes'));
    if (rel.includes('apple-touch-icon') || rel.includes('apple-touch-icon-precomposed')) add(attr(tag, 'href'), 1000 + (size || 180));
    else if (rel.includes('icon') && size >= MIN_SIDE) add(attr(tag, 'href'), 500 + size);
    // No stated size: worth a try after the declared logo; the pixel check decides.
    else if (rel.includes('icon') && !attr(tag, 'sizes')) add(attr(tag, 'href'), 150);
    // A small one, if nothing better turns up.
    else if (rel.includes('icon') && size >= SMALL_SIDE) add(attr(tag, 'href'), 50 + size);
  }
  for (const logo of jsonLdLogos(head)) add(logo, 400);
  add('/apple-touch-icon.png', 100);
  const seen = new Set<string>();
  return scored
    .sort((a, b) => b.score - a.score)
    .map((item) => item.url)
    .filter((url) => (seen.has(url.href) ? false : (seen.add(url.href), true)));
}

// --- Checking the image ---------------------------------------------------------

/** The image's real type and size from its bytes, or null if it isn't a PNG, JPEG, WebP or GIF. */
export function sniffImage(bytes: Buffer): { mime: string; width: number; height: number } | null {
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mime: 'image/png', width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (bytes.length >= 10 && (bytes.toString('latin1', 0, 6) === 'GIF87a' || bytes.toString('latin1', 0, 6) === 'GIF89a')) {
    return { mime: 'image/gif', width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8) };
  }
  if (bytes.length >= 30 && bytes.toString('latin1', 0, 4) === 'RIFF' && bytes.toString('latin1', 8, 12) === 'WEBP') {
    const chunk = bytes.toString('latin1', 12, 16);
    if (chunk === 'VP8X') return { mime: 'image/webp', width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
    if (chunk === 'VP8L') {
      const bits = bytes.readUInt32LE(21);
      return { mime: 'image/webp', width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
    }
    if (chunk === 'VP8 ') return { mime: 'image/webp', width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
    return null;
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) return null;
      const marker = bytes[offset + 1]!;
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
        offset += 2;
        continue;
      }
      const length = bytes.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { mime: 'image/jpeg', height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
      }
      offset += 2 + length;
    }
    return null;
  }
  return null;
}

/**
 * A plain 8-bit, non-interlaced PNG with an alpha channel, up to 1024 px, as
 * RGBA pixels; null for anything else.
 */
function decodeRgba(bytes: Buffer): { width: number; height: number; rgba: Buffer } | null {
  try {
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    const depth = bytes[24];
    const type = bytes[25];
    const channels = type === 6 ? 4 : type === 4 ? 2 : 0; // Only the types with an alpha channel.
    if (depth !== 8 || bytes[28] !== 0 || channels === 0 || width > 1024 || height > 1024) return null;
    const parts: Buffer[] = [];
    for (let offset = 8; offset + 8 <= bytes.length; ) {
      const length = bytes.readUInt32BE(offset);
      const kind = bytes.toString('latin1', offset + 4, offset + 8);
      if (kind === 'IDAT') parts.push(bytes.subarray(offset + 8, offset + 8 + length));
      if (kind === 'IEND') break;
      offset += 12 + length;
    }
    const stride = width * channels;
    const raw = inflateSync(Buffer.concat(parts), { maxOutputLength: height * (stride + 1) });
    const pixels = Buffer.alloc(height * stride);
    for (let y = 0; y < height; y += 1) {
      const filter = raw[y * (stride + 1)];
      for (let x = 0; x < stride; x += 1) {
        const left = x >= channels ? pixels[y * stride + x - channels]! : 0;
        const up = y > 0 ? pixels[(y - 1) * stride + x]! : 0;
        const corner = x >= channels && y > 0 ? pixels[(y - 1) * stride + x - channels]! : 0;
        let value = raw[y * (stride + 1) + 1 + x]!;
        if (filter === 1) value += left;
        else if (filter === 2) value += up;
        else if (filter === 3) value += (left + up) >> 1;
        else if (filter === 4) {
          const guess = left + up - corner;
          const [a, b, c] = [Math.abs(guess - left), Math.abs(guess - up), Math.abs(guess - corner)];
          value += a <= b && a <= c ? left : b <= c ? up : corner;
        }
        pixels[y * stride + x] = value & 255;
      }
    }
    if (channels === 4) return { width, height, rgba: pixels };
    const rgba = Buffer.alloc(width * height * 4);
    for (let i = 0; i < width * height; i += 1) {
      rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = pixels[i * 2]!;
      rgba[i * 4 + 3] = pixels[i * 2 + 1]!;
    }
    return { width, height, rgba };
  } catch {
    return null;
  }
}

function isLightOnClear({ width, height, rgba }: { width: number; height: number; rgba: Buffer }): boolean {
  let clear = 0;
  let opaque = 0;
  let light = 0;
  for (let i = 0; i < width * height; i += 1) {
    const p = i * 4;
    if (rgba[p + 3]! < 32) {
      clear += 1;
      continue;
    }
    opaque += 1;
    light += (0.2126 * rgba[p]! + 0.7152 * rgba[p + 1]! + 0.0722 * rgba[p + 2]!) / 255;
  }
  return clear / (width * height) > 0.2 && opaque > 0 && light / opaque > 0.85;
}

/**
 * Whether a PNG is a light mark on a transparent background (a white logo
 * meant for a dark header), which would vanish on the white plate the app
 * draws. Only plain 8-bit, non-interlaced PNGs up to 1024 px are read; for
 * anything else the answer is "no".
 */
export function lightOnTransparent(bytes: Buffer): boolean {
  const image = decodeRgba(bytes);
  return image ? isLightOnClear(image) : false;
}

/** An RGB PNG of the pixels. */
function encodeRgb(width: number, height: number, rgb: Buffer): Buffer {
  const lines = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y += 1) rgb.copy(lines, y * (1 + width * 3) + 1, y * width * 3, (y + 1) * width * 3);
  const chunk = (kind: string, data: Buffer) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length, 0);
    head.write(kind, 4, 'latin1');
    const tail = Buffer.alloc(4);
    tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])) >>> 0, 0);
    return Buffer.concat([head, data, tail]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(lines)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** A white mark on a transparent background, put on a dark square so it shows on the white plate; null when it isn't one. */
export function onDarkPlate(bytes: Buffer): Buffer | null {
  const image = decodeRgba(bytes);
  if (!image || !isLightOnClear(image)) return null;
  const { width, height, rgba } = image;
  const rgb = Buffer.alloc(width * height * 3);
  for (let i = 0; i < width * height; i += 1) {
    const alpha = rgba[i * 4 + 3]! / 255;
    for (let c = 0; c < 3; c += 1) rgb[i * 3 + c] = Math.round(rgba[i * 4 + c]! * alpha + DARK_PLATE[c]! * (1 - alpha));
  }
  return encodeRgb(width, height, rgb);
}

// --- A chain's website, for branches the map gives none --------------------------

/**
 * The website shared by a chain's branches in one country, for a branch the
 * map gives no website of its own. Only when at least two branches use the
 * very same site and no other site is as common: CrossFit affiliates, say,
 * are separate gyms with their own sites, and must never borrow each other's
 * icon.
 */
export function chainWebsites(records: GymRecord[]): (record: GymRecord) => string | null {
  // A branch is known by its brand's Wikidata item and by its brand name; the
  // map tags some branches with one and some with the other.
  const keys = (record: GymRecord) => {
    const { brand, externalRefs, address } = record.location;
    return [externalRefs.wikidataBrand, brand?.trim().toLowerCase()].filter(Boolean).map((id) => `${address.countryCode}|${id}`);
  };
  const hosts = new Map<string, Map<string, number>>();
  for (const record of records) {
    const url = record.location.website ? allowedUrl(record.location.website) : null;
    if (!url || record.location.isDemoData) continue;
    const host = url.hostname.replace(/^www\./, '');
    for (const k of keys(record)) {
      const counts = hosts.get(k) ?? new Map<string, number>();
      counts.set(host, (counts.get(host) ?? 0) + 1);
      hosts.set(k, counts);
    }
  }
  const chosen = new Map<string, string>();
  for (const [k, counts] of hosts) {
    const ranked = [...counts].sort((a, b) => b[1] - a[1]);
    const [top, next] = ranked;
    if (top && top[1] >= 2 && (!next || next[1] < top[1])) chosen.set(k, `https://${top[0]}/`);
  }
  return (record) => {
    for (const k of keys(record)) {
      const site = chosen.get(k);
      if (site) return site;
    }
    // Failing that, the chain's official site, kept by hand (packages/domain/src/websites.ts).
    const { name, brand, externalRefs, address, isDemoData } = record.location;
    if (isDemoData) return null;
    return chainWebsite({ name, brand, wikidataBrand: externalRefs.wikidataBrand ?? null, countryCode: address.countryCode });
  };
}

// --- A photo of the gym, from its own website ------------------------------------

/**
 * The website a gym's photo may come from: only its very own. Not a site
 * other gyms in the data share (a chain's), and not a chain's home page:
 * there the page's picture is of some other branch, or of nobody's gym.
 */
export function ownPhotoSites(records: GymRecord[]): (record: GymRecord) => string | null {
  const key = (url: URL) => `${url.hostname.replace(/^www\./, '')}${url.pathname.replace(/\/+$/, '')}`.toLowerCase();
  const counts = new Map<string, number>();
  for (const record of records) {
    const url = record.location.website ? allowedUrl(record.location.website) : null;
    if (url && !record.location.isDemoData) counts.set(key(url), (counts.get(key(url)) ?? 0) + 1);
  }
  return (record) => {
    const { website, isDemoData, name, brand, externalRefs, address } = record.location;
    const url = website && !isDemoData ? allowedUrl(website) : null;
    if (!url || (counts.get(key(url)) ?? 0) > 1) return null;
    const chain = chainWebsite({ name, brand, wikidataBrand: externalRefs.wikidataBrand ?? null, countryCode: address.countryCode });
    const home = url.pathname.replace(/\/+$/, '') === '';
    if (chain && home && allowedUrl(chain)?.hostname.replace(/^www\./, '') === url.hostname.replace(/^www\./, '')) return null;
    return url.href;
  };
}

/** Photo candidates in a page, best first: the picture the site shares on social media, then the one it declares for search engines. */
export function photoCandidates(html: string, pageUrl: string): URL[] {
  const found: URL[] = [];
  const add = (href: string | null | undefined) => {
    if (!href || href.startsWith('data:') || /\.(svg|ico|gif)(\?|#|$)/i.test(href) || /(logo|favicon|icon|sprite|placeholder)/i.test(href)) return;
    const url = allowedUrl(href, pageUrl);
    if (url && !found.some((item) => item.href === url.href)) found.push(url);
  };
  const head = html.slice(0, PAGE_BYTES);
  const metas = head.match(/<meta\b[^>]*>/gi) ?? [];
  for (const wanted of ['og:image:secure_url', 'og:image', 'og:image:url', 'twitter:image', 'twitter:image:src']) {
    for (const tag of metas) {
      const which = (attr(tag, 'property') ?? attr(tag, 'name') ?? '').toLowerCase();
      if (which === wanted) add(attr(tag, 'content'));
    }
  }
  const visit = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== 'object') return;
    const image = (node as Record<string, unknown>).image;
    const take = (value: unknown) => {
      if (typeof value === 'string') add(value);
      else if (value && typeof value === 'object' && typeof (value as Record<string, unknown>).url === 'string') add((value as { url: string }).url);
    };
    if (Array.isArray(image)) image.forEach(take);
    else take(image);
    for (const value of Object.values(node)) if (value && typeof value === 'object') visit(value);
  };
  for (const match of head.matchAll(/<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      visit(JSON.parse(match[1]!));
    } catch {
      // Not valid JSON: skip it.
    }
  }
  return found;
}

const PHOTO_BYTES = 4 * 1024 * 1024;
const MIN_PHOTO_WIDTH = 400;
const MIN_PHOTO_HEIGHT = 200;

/**
 * Photos from gyms' own websites, kept by page for a month (a week when the
 * page has none, an hour when it didn't answer), like the icons.
 */
export class SitePhotos {
  private readonly inFlight = new Map<string, Promise<SiteIcon | null>>();

  constructor(
    private readonly db: Db,
    private readonly options: { get?: SafeGet; now?: () => Date } = {},
  ) {
    db.exec(`create table if not exists site_photos (
      page text primary key,
      found integer not null,
      mime text,
      bytes blob,
      width integer,
      height integer,
      source text,
      fetched_at text not null
    )`);
  }

  private now() {
    return this.options.now?.() ?? new Date();
  }

  cached(website: string): SiteIcon | null | undefined {
    const page = allowedUrl(website)?.href;
    if (!page) return null;
    const row = this.db.prepare('select found, mime, bytes, source, fetched_at from site_photos where page = ?').get(page) as
      | { found: number; mime: string | null; bytes: Uint8Array | null; source: string | null; fetched_at: string }
      | undefined;
    if (!row) return undefined;
    const days = (this.now().getTime() - Date.parse(row.fetched_at)) / 86_400_000;
    if (days > (row.found ? FOUND_DAYS : row.source === UNREACHABLE ? UNREACHABLE_DAYS : NONE_DAYS)) return undefined;
    if (!row.found || !row.bytes || this.shared(page, row.source)) return null;
    return { mime: row.mime!, bytes: Buffer.from(row.bytes), source: row.source ?? page };
  }

  /**
   * Whether another page's photo is the very same picture: a chain's stock
   * picture on each branch's page, which shows none of them in particular.
   */
  private shared(page: string, source: string | null): boolean {
    if (!source) return false;
    return Boolean(this.db.prepare('select 1 from site_photos where found = 1 and source = ? and page <> ? limit 1').get(source, page));
  }

  /** The pictures a site's home page shares, for telling a branch page's own photo from the site's stock one. */
  private async homePictures(page: URL, get: SafeGet): Promise<Set<string>> {
    try {
      const home = await get(new URL('/', page), PAGE_BYTES, 'text/html,application/xhtml+xml');
      const html = home.status < 400 && /html/i.test(home.type) ? home.body.toString('utf8') : '';
      return new Set(photoCandidates(html, home.url).map((url) => url.href));
    } catch {
      return new Set();
    }
  }

  async photo(website: string): Promise<SiteIcon | null> {
    const kept = this.cached(website);
    if (kept !== undefined) return kept;
    const page = allowedUrl(website);
    if (!page) return null;
    const pending = this.inFlight.get(page.href);
    if (pending) return pending;
    const job = this.fetchPhoto(page).finally(() => this.inFlight.delete(page.href));
    this.inFlight.set(page.href, job);
    return job;
  }

  private async fetchPhoto(page: URL): Promise<SiteIcon | null> {
    const get = this.options.get ?? safeGet;
    let found: (SiteIcon & { width: number; height: number }) | null = null;
    let unreachable = false;
    try {
      const home = await get(page, PAGE_BYTES, 'text/html,application/xhtml+xml');
      unreachable = home.status >= 500 || home.status === 429;
      const html = home.status < 400 && /html/i.test(home.type) ? home.body.toString('utf8') : '';
      // A page deeper in a site (a branch's own page on a small chain's
      // site) often shares the site's stock picture instead of one of its
      // own; that picture isn't of this branch, so it's passed over.
      const stock = page.pathname !== '/' ? await this.homePictures(page, get) : new Set<string>();
      for (const candidate of photoCandidates(html, home.url)
        .filter((url) => !stock.has(url.href))
        .slice(0, 3)) {
        try {
          const image = await get(candidate, PHOTO_BYTES + 1, 'image/jpeg,image/png,image/webp');
          if (image.status >= 400 || image.body.length > PHOTO_BYTES) continue;
          const kind = sniffImage(image.body);
          if (!kind || kind.mime === 'image/gif' || kind.width < MIN_PHOTO_WIDTH || kind.height < MIN_PHOTO_HEIGHT) continue;
          // A photo, not a banner or a square badge.
          const aspect = kind.width / kind.height;
          if (aspect < 0.75 || aspect > 3) continue;
          found = { mime: kind.mime, bytes: image.body, source: image.url, width: kind.width, height: kind.height };
          break;
        } catch {
          // Try the next one.
        }
      }
    } catch {
      unreachable = true;
    }
    this.db
      .prepare(
        `insert into site_photos (page, found, mime, bytes, width, height, source, fetched_at) values (?, ?, ?, ?, ?, ?, ?, ?)
         on conflict(page) do update set found = excluded.found, mime = excluded.mime, bytes = excluded.bytes, width = excluded.width,
           height = excluded.height, source = excluded.source, fetched_at = excluded.fetched_at`,
      )
      .run(page.href, found ? 1 : 0, found?.mime ?? null, found?.bytes ?? null, found?.width ?? null, found?.height ?? null, found?.source ?? (unreachable ? UNREACHABLE : null), this.now().toISOString());
    // Kept either way, so a second branch showing the same stock picture
    // turns it off for both.
    if (!found || this.shared(page.href, found.source)) return null;
    return { mime: found.mime, bytes: found.bytes, source: found.source };
  }
}

// --- The store ------------------------------------------------------------------

export interface SiteIcon {
  mime: string;
  bytes: Buffer;
  /** Where the image was found. */
  source: string;
}

export class SiteIcons {
  private readonly inFlight = new Map<string, Promise<SiteIcon | null>>();
  private running = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(
    private readonly db: Db,
    private readonly options: { get?: SafeGet; now?: () => Date } = {},
  ) {
    db.exec(`create table if not exists site_icons (
      origin text primary key,
      found integer not null,
      mime text,
      bytes blob,
      width integer,
      height integer,
      source text,
      fetched_at text not null
    )`);
    // Sites found to have no icon before Google's copy and small icons were
    // taken (28 September 2026) are asked again.
    db.prepare("delete from site_icons where found = 0 and fetched_at < '2026-09-28T16:00:00.000Z'").run();
  }

  private now() {
    return this.options.now?.() ?? new Date();
  }

  /** What's kept for a website: the icon, "none", or undefined when it needs fetching. */
  cached(website: string): SiteIcon | null | undefined {
    const origin = allowedUrl(website)?.origin;
    if (!origin) return null;
    const row = this.db.prepare('select found, mime, bytes, source, fetched_at from site_icons where origin = ?').get(origin) as
      | { found: number; mime: string | null; bytes: Uint8Array | null; source: string | null; fetched_at: string }
      | undefined;
    if (!row) return undefined;
    const days = (this.now().getTime() - Date.parse(row.fetched_at)) / 86_400_000;
    if (days > (row.found ? FOUND_DAYS : row.source === UNREACHABLE ? UNREACHABLE_DAYS : NONE_DAYS)) return undefined;
    return row.found && row.bytes ? { mime: row.mime!, bytes: Buffer.from(row.bytes), source: row.source ?? origin } : null;
  }

  /** The website's icon: kept, or fetched now (one fetch per site at a time, four sites at once). */
  async icon(website: string): Promise<SiteIcon | null> {
    const kept = this.cached(website);
    if (kept !== undefined) return kept;
    const page = allowedUrl(website);
    if (!page) return null;
    const pending = this.inFlight.get(page.origin);
    if (pending) return pending;
    const job = this.limited(() => this.fetchIcon(page)).finally(() => this.inFlight.delete(page.origin));
    this.inFlight.set(page.origin, job);
    return job;
  }

  private async limited<T>(work: () => Promise<T>): Promise<T> {
    if (this.running >= 4) await new Promise<void>((resolve) => this.waiting.push(resolve));
    this.running += 1;
    try {
      return await work();
    } finally {
      this.running -= 1;
      this.waiting.shift()?.();
    }
  }

  private async fetchIcon(page: URL): Promise<SiteIcon | null> {
    const get = this.options.get ?? safeGet;
    type Found = SiteIcon & { width: number; height: number };
    /** The image at `url` if it will do as an icon, a white mark put on a dark square. */
    const take = async (url: URL): Promise<Found | null> => {
      try {
        const image = await get(url, IMAGE_BYTES + 1, 'image/png,image/jpeg,image/webp,image/gif');
        if (image.status >= 400 || image.body.length > IMAGE_BYTES) return null;
        const kind = sniffImage(image.body);
        if (!kind || kind.width < SMALL_SIDE || kind.height < SMALL_SIDE || kind.width > 4096 || kind.height > 4096) return null;
        if (Math.max(kind.width / kind.height, kind.height / kind.width) > 4) return null;
        const dark = kind.mime === 'image/png' ? onDarkPlate(image.body) : null;
        return { mime: dark ? 'image/png' : kind.mime, bytes: dark ?? image.body, source: image.url, width: kind.width, height: kind.height };
      } catch {
        return null;
      }
    };
    const side = (icon: Found | null) => (icon ? Math.min(icon.width, icon.height) : 0);
    let found: Found | null = null;
    let small: Found | null = null;
    let unreachable = false;
    try {
      const home = await get(page, PAGE_BYTES, 'text/html,application/xhtml+xml');
      unreachable = home.status >= 500 || home.status === 429;
      const html = home.status < 400 && /html/i.test(home.type) ? home.body.toString('utf8') : '';
      for (const candidate of iconCandidates(html, home.url).slice(0, 6)) {
        const icon = await take(candidate);
        if (side(icon) >= MIN_SIDE) {
          found = icon;
          break;
        }
        if (side(icon) > side(small)) small = icon;
      }
    } catch {
      unreachable = true;
    }
    if (!found) {
      // Google's copy of the site's icon: it has most sites', also ones that turn us away.
      const google = await take(googleIconUrl(page.origin));
      found = side(google) >= side(small) ? (google ?? small) : small;
      if (found) unreachable = false;
    }
    this.db
      .prepare(
        `insert into site_icons (origin, found, mime, bytes, width, height, source, fetched_at) values (?, ?, ?, ?, ?, ?, ?, ?)
         on conflict(origin) do update set found = excluded.found, mime = excluded.mime, bytes = excluded.bytes, width = excluded.width,
           height = excluded.height, source = excluded.source, fetched_at = excluded.fetched_at`,
      )
      .run(
        page.origin,
        found ? 1 : 0,
        found?.mime ?? null,
        found?.bytes ?? null,
        found?.width ?? null,
        found?.height ?? null,
        found?.source ?? (unreachable ? UNREACHABLE : null),
        this.now().toISOString(),
      );
    return found ? { mime: found.mime, bytes: found.bytes, source: found.source } : null;
  }
}
