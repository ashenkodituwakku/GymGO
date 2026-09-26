import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEMO_GYMS } from '@gymgo/demo-data';
import { MELBOURNE_GYMS } from '@gymgo/melbourne-data';
import { createApp } from './app';
import { openDb, seedGyms, type Db } from './db';
import { deflateSync } from 'node:zlib';
import { SiteIcons, allowedUrl, chainWebsites, iconCandidates, isPrivateAddress, lightOnTransparent, sniffImage, type Fetched, type SafeGet } from './siteicons';
import type { GymRecord } from '@gymgo/domain';

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

/** A real RGBA PNG: `pixel(x, y)` gives [r, g, b, a]. */
function rgbaPng(size: number, pixel: (x: number, y: number) => [number, number, number, number]): Buffer {
  const lines: Buffer[] = [];
  for (let y = 0; y < size; y += 1) {
    const line = Buffer.alloc(1 + size * 4);
    for (let x = 0; x < size; x += 1) Buffer.from(pixel(x, y)).copy(line, 1 + x * 4);
    lines.push(line);
  }
  const chunk = (kind: string, data: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    return Buffer.concat([length, Buffer.from(kind, 'latin1'), data, Buffer.alloc(4)]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(lines))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

describe('icons that would vanish on a white plate', () => {
  it('spots a white mark on a transparent background', () => {
    const whiteOnClear = rgbaPng(64, (x) => (x < 32 ? [255, 255, 255, 255] : [0, 0, 0, 0]));
    expect(lightOnTransparent(whiteOnClear)).toBe(true);
  });

  it('keeps dark marks, and opaque icons whatever their colour', () => {
    expect(lightOnTransparent(rgbaPng(64, (x) => (x < 32 ? [20, 20, 20, 255] : [0, 0, 0, 0])))).toBe(false);
    expect(lightOnTransparent(rgbaPng(64, () => [250, 250, 250, 255]))).toBe(false);
    expect(lightOnTransparent(Buffer.from('not a png at all, just some bytes here'))).toBe(false);
  });
});

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

let flakyUp = false;
const fakeGet: SafeGet = async (url) => {
  visits.push(url.href);
  // A site that's down the first time and fine later.
  if (url.href === 'https://flaky.example.com/' && !flakyUp) throw new Error('timed out');
  if (url.href === 'https://flaky.example.com/') return { status: 200, type: 'text/html', body: Buffer.from('<link rel="apple-touch-icon" href="/t.png">'), url: url.href };
  if (url.href === 'https://flaky.example.com/t.png') return { status: 200, type: 'image/png', body: png(120, 120), url: url.href };
  const page = WEB[url.href];
  return page ? { ...page, url: url.href } : { status: 404, type: 'text/html', body: Buffer.alloc(0), url: url.href };
};

let server: Server;
let base: string;
let db: Db;
let clock = new Date('2026-09-25T00:00:00Z');

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
    // Kept by the browser for an hour: the server asks a site again after an hour at the soonest.
    expect(response.headers.get('cache-control')).toBe('public, max-age=3600');
  });

  it('asks a site that didn’t answer again after an hour, not a week', async () => {
    const icons = new SiteIcons(db, { get: fakeGet, now: () => clock });
    expect(await icons.icon('https://flaky.example.com/')).toBeNull();
    flakyUp = true;
    expect(icons.cached('https://flaky.example.com/')).toBeNull(); // still remembered within the hour
    clock = new Date(clock.getTime() + 61 * 60_000);
    expect(icons.cached('https://flaky.example.com/')).toBeUndefined();
    expect((await icons.icon('https://flaky.example.com/'))?.mime).toBe('image/png');
  });

  it('has nothing for invented demo gyms or unknown ids', async () => {
    const demo = await fetch(`${base}/api/gyms/${DEMO_GYMS[0]!.location.id}/icon`);
    expect(demo.status).toBe(404);
    // The browser keeps a known absence for a day, so a list doesn't ask on every visit.
    expect(demo.headers.get('cache-control')).toBe('public, max-age=86400');
    const unknown = await fetch(`${base}/api/gyms/no-such-gym/icon`);
    expect(unknown.status).toBe(404);
    // An unknown id might be a gym not loaded yet: never kept.
    expect(unknown.headers.get('cache-control')).toBe('no-store');
  });
});

describe('a chain’s website, for branches without one', () => {
  const branch = (id: string, brand: string | null, website: string | null, country = 'AU', wikidataBrand?: string): GymRecord =>
    ({
      location: {
        id,
        brand,
        website,
        isDemoData: false,
        address: { countryCode: country },
        externalRefs: wikidataBrand ? { wikidataBrand } : {},
      },
    }) as unknown as GymRecord;

  it('uses the site two or more branches share, in the same country', () => {
    const find = chainWebsites([
      branch('a', 'Anytime Fitness', 'https://www.anytimefitness.com.au/gyms/a', 'AU', 'Q4778364'),
      branch('b', 'Anytime Fitness', 'https://anytimefitness.com.au/gyms/b', 'AU', 'Q4778364'),
      branch('c', 'Anytime Fitness', 'https://www.anytimefitness.com/gyms/c', 'US', 'Q4778364'),
    ]);
    expect(find(branch('d', 'Anytime Fitness', null, 'AU', 'Q4778364'))).toBe('https://anytimefitness.com.au/');
    // Only one US branch has a site: not enough to call it the chain's.
    expect(find(branch('e', 'Anytime Fitness', null, 'US', 'Q4778364'))).toBeNull();
    // A branch tagged with the brand's name but not its Wikidata item still finds it.
    expect(find(branch('f', 'Anytime Fitness', null, 'AU'))).toBe('https://anytimefitness.com.au/');
  });

  it('never lends one independent affiliate’s site to another', () => {
    const find = chainWebsites([
      branch('a', 'CrossFit', 'https://www.k2crossfit.com/', 'US', 'Q2072840'),
      branch('b', 'CrossFit', 'https://persistenceathletics.com/', 'US', 'Q2072840'),
    ]);
    expect(find(branch('c', 'CrossFit', null, 'US', 'Q2072840'))).toBeNull();
  });
});
