/**
 * The web app, served by the GymGO server itself when GYMGO_WEB_DIR names its
 * exported files (scripts/online.mjs builds them). That's GymGO online from
 * one computer through a Cloudflare Tunnel, where there's no Caddy in front
 * to do it (deploy/Caddyfile).
 *
 * The server's own paths (its API, the legal pages, the password reset
 * page) stay the server's. Everything else is the app: a file that exists,
 * or index.html, which shows the right screen for any other address. Files
 * named for what's in them (under /_expo and /assets) keep for a year, and a
 * missing one there is a 404 rather than the page. The headers are Caddy's,
 * so the app behaves the same either way: location allowed for this site
 * (the app finds gyms near you), framing refused, and no policy that would
 * stop the app's own scripts.
 *
 * Text is sent compressed, as Caddy does (`encode`): the app's scripts are a
 * few megabytes as written and about a quarter of that compressed, which is
 * most of how long a first visit takes on a phone. Each file is compressed
 * once and kept, for as long as the file on disk stays the same.
 */

import { createReadStream, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { brotliCompress, constants as zlib, gzip } from 'node:zlib';

/** What the server answers itself, as Caddy passes them on. */
export function isServerPath(path: string): boolean {
  return (
    path.startsWith('/api/') ||
    path === '/api' ||
    ['/terms', '/privacy', '/refunds', '/community', '/legal', '/reset-password', '/.well-known/security.txt'].includes(path)
  );
}

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
};

/** The file a path names inside `root`, if it's there; never one outside it. */
export function webFile(root: string, path: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  const base = resolve(root);
  const file = resolve(join(base, decoded));
  if (file !== base && !file.startsWith(base + sep)) return null;
  try {
    return statSync(file).isFile() ? file : null;
  } catch {
    return null;
  }
}

/** Names that say what's in them: the app's scripts and pictures. */
const HASHED = /^\/(_expo|assets)\//;

// --- Compression ---------------------------------------------------------------

/** What shrinks: text, and fonts that aren't packed already. Pictures, sound and WOFF fonts are. */
const COMPRESSIBLE = new Set(['.html', '.js', '.mjs', '.css', '.json', '.map', '.txt', '.xml', '.webmanifest', '.svg', '.ttf', '.otf']);
/** Under this, the saving isn't worth the header. */
const SMALLEST_WORTH_IT = 1024;

export type Encoding = 'br' | 'gzip';

/** The best way to send text that this browser takes: Brotli, else gzip, else as it is. */
export function pickEncoding(acceptEncoding: string | string[] | undefined): Encoding | null {
  const header = Array.isArray(acceptEncoding) ? acceptEncoding.join(',') : (acceptEncoding ?? '');
  const taken = new Set<string>();
  for (const part of header.split(',')) {
    const [name, ...params] = part.trim().toLowerCase().split(';');
    if (!name) continue;
    // "br;q=0" is a refusal.
    const quality = params.map((param) => /^\s*q\s*=\s*([0-9.]+)\s*$/.exec(param)?.[1]).find((value) => value !== undefined);
    if (quality !== undefined && Number(quality) === 0) continue;
    taken.add(name);
  }
  if (taken.has('br')) return 'br';
  if (taken.has('gzip')) return 'gzip';
  return null;
}

const squeeze: Record<Encoding, (data: Buffer) => Promise<Buffer>> = {
  // Quality 9 of 11: nearly as small as the slowest setting, in about a second for the biggest script, once.
  br: (data) => promisify(brotliCompress)(data, { params: { [zlib.BROTLI_PARAM_QUALITY]: 9, [zlib.BROTLI_PARAM_SIZE_HINT]: data.length } }),
  gzip: (data) => promisify(gzip)(data, { level: 9 }),
};

/** A file as compressed, kept while the file on disk is the one it was made from. */
const kept = new Map<string, { stamp: string; data: Promise<Buffer> }>();

function compressed(file: string, encoding: Encoding, stamp: string): Promise<Buffer> {
  const key = `${encoding}:${file}`;
  const had = kept.get(key);
  if (had?.stamp === stamp) return had.data;
  const data = readFile(file).then(squeeze[encoding]);
  kept.set(key, { stamp, data });
  // A failure isn't kept: the next request tries again.
  data.catch(() => {
    if (kept.get(key)?.data === data) kept.delete(key);
  });
  return data;
}

/**
 * Answers a GET or HEAD for the app, or says it's not the app's (false) so
 * the server's own routes answer it.
 */
export function serveWeb(root: string, req: IncomingMessage, res: ServerResponse, https: boolean): boolean {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  const path = new URL(req.url ?? '/', 'http://gymgo.local').pathname;
  if (isServerPath(path)) return false;

  let file = webFile(root, path);
  if (!file && HASHED.test(path)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end('Not found.');
    return true;
  }
  // Any other address is a screen of the app.
  const page = !file;
  file ??= webFile(root, '/index.html');
  if (!file) return false;

  // Caddy's headers, not the API's: the app needs its scripts, styles and location.
  res.removeHeader('Content-Security-Policy');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=()');
  if (https) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  const kind = extname(file).toLowerCase();
  res.setHeader('Content-Type', TYPES[kind] ?? 'application/octet-stream');
  res.setHeader('Cache-Control', !page && HASHED.test(path) ? 'public, max-age=31536000, immutable' : 'no-cache');
  const stat = statSync(file);
  const sendAsIs = () => {
    res.setHeader('Content-Length', String(stat.size));
    res.writeHead(200);
    if (req.method === 'HEAD') return void res.end();
    // A file that goes missing halfway ends the answer, rather than the server.
    createReadStream(file!)
      .on('error', () => res.destroy())
      .pipe(res);
  };

  if (!COMPRESSIBLE.has(kind)) {
    sendAsIs();
    return true;
  }
  // Whatever is sent, it depends on what the browser said it takes: a cache in between mustn't mix them up.
  res.setHeader('Vary', 'Accept-Encoding');
  const encoding = stat.size >= SMALLEST_WORTH_IT ? pickEncoding(req.headers['accept-encoding']) : null;
  if (!encoding) {
    sendAsIs();
    return true;
  }
  compressed(file, encoding, `${stat.mtimeMs}:${stat.size}`).then(
    (data) => {
      res.setHeader('Content-Encoding', encoding);
      res.setHeader('Content-Length', String(data.length));
      res.writeHead(200);
      res.end(req.method === 'HEAD' ? undefined : data);
    },
    // Couldn't be read or compressed just now: as it is, which says so itself if the file has gone.
    () => sendAsIs(),
  );
  return true;
}
