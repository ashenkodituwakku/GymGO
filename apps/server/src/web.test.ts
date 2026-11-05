import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app';
import { openDb, type Db } from './db';
import { isServerPath, webFile } from './web';

let dir: string;
let server: Server;
let base: string;
let db: Db;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'gymgo-web-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html><title>GymGO</title><div id="root"></div>');
  mkdirSync(join(dir, '_expo', 'static', 'js', 'web'), { recursive: true });
  writeFileSync(join(dir, '_expo', 'static', 'js', 'web', 'entry-abc123.js'), 'console.log("GymGO")');
  mkdirSync(join(dir, 'assets'), { recursive: true });
  writeFileSync(join(dir, 'assets', 'badge.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  writeFileSync(join(dir, 'robots.txt'), 'User-agent: *');
  db = openDb(':memory:');
  server = createServer(createApp({ db, attribution: 'test', webDir: dir, publicUrl: 'https://quiet-river-1234.trycloudflare.com' }));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('the web app, served by the server itself', () => {
  it('is the page at every address that isn’t the server’s own, with Caddy’s headers', async () => {
    for (const path of ['/', '/explore', '/gym/melbourne-1?from=link']) {
      const response = await fetch(`${base}${path}`);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
      expect(await response.text()).toContain('<div id="root">');
      // The app runs its own scripts and finds gyms near you; the API's locked-down policy isn't for it.
      expect(response.headers.get('content-security-policy')).toBeNull();
      expect(response.headers.get('permissions-policy')).toContain('geolocation=(self)');
      expect(response.headers.get('x-frame-options')).toBe('DENY');
      expect(response.headers.get('strict-transport-security')).toContain('max-age=');
      expect(response.headers.get('cache-control')).toBe('no-cache');
    }
  });

  it('keeps scripts and pictures for a year, and says a missing one is missing', async () => {
    const script = await fetch(`${base}/_expo/static/js/web/entry-abc123.js`);
    expect(script.status).toBe(200);
    expect(script.headers.get('content-type')).toBe('text/javascript; charset=utf-8');
    expect(script.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect((await fetch(`${base}/assets/badge.png`)).headers.get('content-type')).toBe('image/png');
    expect((await fetch(`${base}/_expo/static/js/web/entry-old.js`)).status).toBe(404);
    expect(await (await fetch(`${base}/robots.txt`)).text()).toBe('User-agent: *');
  });

  it('answers HEAD without a body', async () => {
    const response = await fetch(`${base}/`, { method: 'HEAD' });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('');
  });

  it('leaves the API and the server’s pages to the server', async () => {
    expect((await fetch(`${base}/api/me`)).status).toBe(401);
    const terms = await fetch(`${base}/terms`);
    expect(terms.status).toBe(200);
    expect(await terms.text()).not.toContain('<div id="root">');
    // Writing to a page's address isn't the app's business either.
    expect((await fetch(`${base}/`, { method: 'POST' })).status).not.toBe(200);
  });

  it('never hands out a file from outside its folder', async () => {
    expect(webFile(dir, '/../../etc/passwd')).toBeNull();
    expect(webFile(dir, '/%2e%2e/%2e%2e/etc/passwd')).toBeNull();
    expect(webFile(dir, '/index.html%00.js')).toBeNull();
    expect(webFile(dir, '/assets')).toBeNull();
    const sneaky = await fetch(`${base}/%2e%2e/%2e%2e/%2e%2e/etc/passwd`);
    expect(await sneaky.text()).not.toContain('root:');
  });

  it('knows which addresses are the server’s', () => {
    for (const path of ['/api/gyms', '/terms', '/privacy', '/refunds', '/community', '/legal', '/reset-password', '/.well-known/security.txt']) expect(isServerPath(path)).toBe(true);
    for (const path of ['/', '/explore', '/apix', '/terms-of-use']) expect(isServerPath(path)).toBe(false);
  });

  it('is off without a folder: the server answers its API only, as behind Caddy', async () => {
    const plainDb = openDb(':memory:');
    const plain = createServer(createApp({ db: plainDb, attribution: 'test' }));
    await new Promise<void>((resolve) => plain.listen(0, '127.0.0.1', resolve));
    try {
      const response = await fetch(`http://127.0.0.1:${(plain.address() as AddressInfo).port}/`);
      expect(response.headers.get('content-type')).toContain('application/json');
    } finally {
      plain.close();
      plainDb.close();
    }
  });
});
