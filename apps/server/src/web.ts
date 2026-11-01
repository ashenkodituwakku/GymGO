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
 */

import { createReadStream, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';

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
  res.setHeader('Content-Type', TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream');
  res.setHeader('Cache-Control', !page && HASHED.test(path) ? 'public, max-age=31536000, immutable' : 'no-cache');
  res.setHeader('Content-Length', String(statSync(file).size));
  res.writeHead(200);
  if (req.method === 'HEAD') {
    res.end();
    return true;
  }
  createReadStream(file).pipe(res);
  return true;
}
