import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEMO_GYMS } from '@gymgo/demo-data';
import { MELBOURNE_GYMS } from '@gymgo/melbourne-data';
import { createApp } from './app';
import { openDb, seedGyms, type Db } from './db';
import { allowedUrl, iconCandidates, isPrivateAddress, sniffImage, type Fetched, type SafeGet } from './siteicons';

/** A PNG header of the given size: all the checks read. */
function png(width: number, height: number): Buffer {
  const head = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(head, 0);
  head.writeUInt32BE(13, 8);
  head.write('IHDR', 12, 'latin1');
  head.writeUInt32BE(width, 16);
  head.writeUInt32BE(height, 20);
  return head;
}

describe('where the icon fetcher may go', () => {
  it('refuses private, loopback, link-local and metadata addresses', () => {
    for (const address of ['127.0.0.1', '10.1.2.3', '172.20.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fe80::1', 'fd00::1', '::ffff:127.0.0.1']) {
      expect(isPrivateAddress(address), address).toBe(true);
    }
    expect(isPrivateAddress('93.184.216.34')).toBe(false);
    expect(isPrivateAddress('2606:4700::6810:84e5')).toBe(false);
  });

  it('allows only plain public web addresses', () => {
    expect(allowedUrl('https://gym.example.com/')?.href).toBe('https://gym.example.com/');
    expect(allowedUrl('/icon.png', 'https://gym.example.com/a/')?.href).toBe('https://gym.example.com/icon.png');
    for (const bad of ['ftp://gym.example.com/', 'file:///etc/passwd', 'http://127.0.0.1/', 'http://[::1]/', 'http://169.254.169.254/latest/', 'https://gym.example.com:8443/', 'https://user:pw@gym.example.com/', 'http://localhost/', 'javascript:alert(1)']) {
      expect(allowedUrl(bad), bad).toBeNull();
    }
  });
});

describe('finding the icon in a page', () => {
  it('prefers the home-screen icon, then big icons, then the declared logo, then the usual path', () => {
    const html = `<html><head>
      <link rel="icon" href="/favicon.ico">
      <link rel="icon" type="image/png" href="/unsized.png">
      <link rel="icon" type="image/svg+xml" href="/icon.svg">
      <link rel="icon" sizes="32x32" href="/small.png">
      <link rel="icon" sizes="192x192" href="/android.png">
      <link rel="apple-touch-icon" sizes="180x180" href="/touch.png?v=2&amp;x=1">
      <script type="application/ld+json">{"@type":"ExerciseGym","logo":{"url":"https://cdn.example.com/logo.png"}}</script>
    </head></html>`;
    expect(iconCandidates(html, 'https://gym.example.com/').map((url) => url.href)).toEqual([
      'https://gym.example.com/touch.png?v=2&x=1',
      'https://gym.example.com/android.png',
      'https://cdn.example.com/logo.png',
      'https://gym.example.com/unsized.png',
      'https://gym.example.com/apple-touch-icon.png',
    ]);
  });

  it('never follows an icon to a private address', () => {
    const html = '<link rel="apple-touch-icon" href="http://192.168.0.1/touch.png">';
    expect(iconCandidates(html, 'https://gym.example.com/').map((url) => url.href)).toEqual(['https://gym.example.com/apple-touch-icon.png']);
  });

  it('knows an image by its bytes, whatever it is called', () => {
    expect(sniffImage(png(180, 180))).toEqual({ mime: 'image/png', width: 180, height: 180 });
    expect(sniffImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
    expect(sniffImage(Buffer.from('<html><script>alert(1)</script>'))).toBeNull();
    const gif = Buffer.alloc(13);
    gif.write('GIF89a', 0, 'latin1');
    gif.writeUInt16LE(96, 6);
    gif.writeUInt16LE(96, 8);
    expect(sniffImage(gif)).toEqual({ mime: 'image/gif', width: 96, height: 96 });
  });
});

// --- The route, with a stand-in for the web ---------------------------------

const DOHERTYS = MELBOURNE_GYMS.find((gym) => gym.location.website === 'https://dohertysgym.com/')!;
const PRIME = MELBOURNE_GYMS.find((gym) => gym.location.website?.startsWith('https://primeathletica.com.au'))!;
const visits: string[] = [];

const WEB: Record<string, Omit<Fetched, 'url'>> = {
  'https://dohertysgym.com/': { status: 200, type: 'text/html; charset=utf-8', body: Buffer.from('<link rel="apple-touch-icon" href="/touch.png">') },
  'https://dohertysgym.com/touch.png': { status: 200, type: 'image/png', body: png(180, 180) },
  // Prime's site offers only a tiny icon and a file that says it's a PNG but isn't.
  'https://primeathletica.com.au/': {
    status: 200,
    type: 'text/html',
    body: Buffer.from('<link rel="apple-touch-icon" href="/fake.png"><link rel="icon" sizes="16x16" href="/tiny.png">'),
  },
  'https://primeathletica.com.au/fake.png': { status: 200, type: 'image/png', body: Buffer.from('<html>not an image</html>') },
};

const fakeGet: SafeGet = async (url) => {
  visits.push(url.href);
  const page = WEB[url.href];
  return page ? { ...page, url: url.href } : { status: 404, type: 'text/html', body: Buffer.alloc(0), url: url.href };
};

let server: Server;
let base: string;
let db: Db;

beforeAll(async () => {
  db = openDb(':memory:');
  seedGyms(db, [...MELBOURNE_GYMS, ...DEMO_GYMS]);
  server = createServer(createApp({ db, attribution: 'test', siteIcons: { get: fakeGet } }));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
  db.close();
});

describe('GET /api/gyms/:id/icon', () => {
  it('serves the gym’s own icon as the image it really is', async () => {
    const response = await fetch(`${base}/api/gyms/${DOHERTYS.location.id}/icon`);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(decodeURI(response.headers.get('x-icon-source')!)).toBe('https://dohertysgym.com/touch.png');
    expect(Buffer.from(await response.arrayBuffer()).equals(png(180, 180))).toBe(true);
  });

  it('visits each website once, and branches of the same site share it', async () => {
    const before = visits.length;
    const branches = MELBOURNE_GYMS.filter((gym) => gym.location.website === 'https://dohertysgym.com/');
    expect(branches.length).toBeGreaterThan(1);
    for (const gym of branches) expect((await fetch(`${base}/api/gyms/${gym.location.id}/icon`)).status).toBe(200);
    expect(visits.length).toBe(before);
  });

  it('shows nothing rather than a fake, a tiny or a mislabelled image', async () => {
    const response = await fetch(`${base}/api/gyms/${PRIME.location.id}/icon`);
    expect(response.status).toBe(404);
    expect(((await response.json()) as { code: string }).code).toBe('none');
  });

  it('has nothing for invented demo gyms or unknown ids', async () => {
    expect((await fetch(`${base}/api/gyms/${DEMO_GYMS[0]!.location.id}/icon`)).status).toBe(404);
    expect((await fetch(`${base}/api/gyms/no-such-gym/icon`)).status).toBe(404);
  });
});
