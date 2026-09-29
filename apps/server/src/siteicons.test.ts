import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEMO_GYMS } from '@gymgo/demo-data';
import { AU_GYMS } from '@gymgo/au-data';
import { MELBOURNE_GYMS } from '@gymgo/melbourne-data';
import { createApp } from './app';
import { openDb, seedGyms, type Db } from './db';
import { deflateSync } from 'node:zlib';
import { SiteIcons, SitePhotos, allowedUrl, chainWebsites, googleIconUrl, iconCandidates, isPrivateAddress, lightOnTransparent, onDarkPlate, ownPhotoSites, photoCandidates, sniffImage, type Fetched, type SafeGet } from './siteicons';
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
    expect(onDarkPlate(rgbaPng(64, () => [250, 250, 250, 255]))).toBeNull();
  });

  it('puts a white mark on a dark square, keeping its size', () => {
    const plated = onDarkPlate(rgbaPng(64, (x) => (x < 32 ? [255, 255, 255, 255] : [0, 0, 0, 0])))!;
    expect(sniffImage(plated)).toEqual({ mime: 'image/png', width: 64, height: 64 });
    // Opaque RGB now, so it no longer counts as a mark on nothing.
    expect(plated[25]).toBe(2);
    expect(lightOnTransparent(plated)).toBe(false);
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
  it('prefers the home-screen icon, then big icons, then the declared logo, then the usual path, then small icons', () => {
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
      'https://gym.example.com/small.png',
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
// A Club Lime the map gives no website, and no branch of it names one either.
const CLUB_LIME = AU_GYMS.find((gym) => /^club lime/i.test(gym.location.name) && !gym.location.website)!;

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
  'https://www.clublime.com.au/': { status: 200, type: 'text/html', body: Buffer.from('<link rel="apple-touch-icon" href="/lime.png">') },
  'https://www.clublime.com.au/lime.png': { status: 200, type: 'image/png', body: png(192, 192) },
  // A site that turns automated visitors away, whose icon Google has.
  'https://blocked.example.com/': { status: 403, type: 'text/html', body: Buffer.from('Forbidden') },
  [googleIconUrl('https://blocked.example.com').href]: { status: 200, type: 'image/png', body: png(256, 240) },
  // A site with only a 32-pixel icon, and none at Google.
  'https://small.example.com/': { status: 200, type: 'text/html', body: Buffer.from('<link rel="icon" sizes="32x32" href="/32.png">') },
  'https://small.example.com/32.png': { status: 200, type: 'image/png', body: png(32, 32) },
  // A site whose only icon is a white mark on nothing.
  'https://white.example.com/': { status: 200, type: 'text/html', body: Buffer.from('<link rel="apple-touch-icon" href="/w.png">') },
  'https://white.example.com/w.png': { status: 200, type: 'image/png', body: rgbaPng(64, (x) => (x < 32 ? [255, 255, 255, 255] : [0, 0, 0, 0])) },
};

/** A gym whose website no other gym in the data shares: its own, so its photo can be used. */
const OWN = MELBOURNE_GYMS.find(
  (gym) => gym.location.website && MELBOURNE_GYMS.filter((other) => other.location.website === gym.location.website).length === 1 && gym !== PRIME,
)!;
/** A JPEG header of the given size: all the checks read. */
function jpeg(width: number, height: number): Buffer {
  return Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, height >> 8, height & 255, width >> 8, width & 255, 0x03, 0, 0, 0, 0, 0, 0, 0, 0]);
}
WEB[OWN.location.website!] = {
  status: 200,
  type: 'text/html',
  body: Buffer.from('<meta property="og:image" content="/logo-share.png"><meta property="og:image" content="/floor.jpg"><meta name="twitter:image" content="/small.jpg">'),
};
WEB[new URL('/floor.jpg', OWN.location.website!).href] = { status: 200, type: 'image/jpeg', body: jpeg(1200, 630) };
WEB[new URL('/small.jpg', OWN.location.website!).href] = { status: 200, type: 'image/jpeg', body: jpeg(120, 80) };

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
  seedGyms(db, [...MELBOURNE_GYMS, ...DEMO_GYMS, CLUB_LIME]);
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

  it('takes a known chain’s icon from its own site when the branch names none', async () => {
    expect(CLUB_LIME).toBeDefined();
    const response = await fetch(`${base}/api/gyms/${CLUB_LIME.location.id}/icon`);
    expect(response.status).toBe(200);
    expect(decodeURI(response.headers.get('x-icon-source')!)).toBe('https://www.clublime.com.au/lime.png');
  });

  it('takes Google’s copy of the icon when the site turns us away', async () => {
    const icons = new SiteIcons(db, { get: fakeGet, now: () => clock });
    const icon = await icons.icon('https://blocked.example.com/');
    expect(icon?.source).toBe(googleIconUrl('https://blocked.example.com').href);
    expect(sniffImage(icon!.bytes)).toEqual({ mime: 'image/png', width: 256, height: 240 });
  });

  it('takes a small icon when there’s nothing bigger, and a white mark on a dark square', async () => {
    const icons = new SiteIcons(db, { get: fakeGet, now: () => clock });
    expect((await icons.icon('https://small.example.com/'))?.source).toBe('https://small.example.com/32.png');
    const white = (await icons.icon('https://white.example.com/'))!;
    expect(white.source).toBe('https://white.example.com/w.png');
    expect(lightOnTransparent(white.bytes)).toBe(false);
    expect(sniffImage(white.bytes)).toEqual({ mime: 'image/png', width: 64, height: 64 });
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
        name: brand ?? id,
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
    // Only one US branch has a site: not enough to call it the chain's, so the chain's own site, kept by hand.
    expect(find(branch('e', 'Anytime Fitness', null, 'US', 'Q4778364'))).toBe('https://www.anytimefitness.com/');
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

describe('a photo of the gym from its own website', () => {
  it('takes the picture the site shares, never a logo, an icon or a vector', () => {
    const html =
      '<meta property="og:image" content="https://gym.example.com/logo.png"><meta property="og:image" content="/hero.jpg">' +
      '<meta name="twitter:image" content="/hero.jpg"><script type="application/ld+json">{"image":["/room.webp","/brand.svg"]}</script>';
    expect(photoCandidates(html, 'https://gym.example.com/').map((url) => url.href)).toEqual(['https://gym.example.com/hero.jpg', 'https://gym.example.com/room.webp']);
  });

  it('only from a site that is the gym’s own: not one other gyms share, nor a chain’s home page', () => {
    const gym = (id: string, name: string, website: string | null, brand: string | null = null) =>
      ({ location: { id, name, brand, website, isDemoData: false, address: { countryCode: 'AU' }, externalRefs: {} } }) as unknown as GymRecord;
    const own = gym('a', 'Frank’s Gym', 'https://www.franksgymperth.com/');
    const shared1 = gym('b', 'Big Gym Richmond', 'https://biggym.example.com/');
    const shared2 = gym('c', 'Big Gym Carlton', 'https://biggym.example.com');
    const chainHome = gym('d', 'Anytime Fitness', 'https://www.anytimefitness.com.au/', 'Anytime Fitness');
    const chainBranch = gym('e', 'Anytime Fitness', 'https://www.anytimefitness.com.au/gyms/docklands/', 'Anytime Fitness');
    const site = ownPhotoSites([own, shared1, shared2, chainHome, chainBranch]);
    expect(site(own)).toBe('https://www.franksgymperth.com/');
    expect(site(shared1)).toBeNull();
    expect(site(chainHome)).toBeNull();
    expect(site(chainBranch)).toBe('https://www.anytimefitness.com.au/gyms/docklands/');
  });

  it('serves it as the image it really is, credited to the page', async () => {
    const response = await fetch(`${base}/api/gyms/${OWN.location.id}/photo`);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/jpeg');
    expect(decodeURI(response.headers.get('x-photo-source')!)).toBe(new URL(OWN.location.website!).href);
    expect(Buffer.from(await response.arrayBuffer()).equals(jpeg(1200, 630))).toBe(true);
  });

  it('has none for a site several gyms share, or for demo gyms', async () => {
    expect((await fetch(`${base}/api/gyms/${DOHERTYS.location.id}/photo`)).status).toBe(404);
    expect((await fetch(`${base}/api/gyms/${DEMO_GYMS[0]!.location.id}/photo`)).status).toBe(404);
  });

  it('never takes a chain’s stock picture for a branch’s page', async () => {
    const site: Record<string, Omit<Fetched, 'url'>> = {
      'https://chain.example.com/': { status: 200, type: 'text/html', body: Buffer.from('<meta property="og:image" content="/stock.jpg">') },
      // A branch page with the site's stock picture only.
      'https://chain.example.com/north/': { status: 200, type: 'text/html', body: Buffer.from('<meta property="og:image" content="/stock.jpg">') },
      // Two branch pages sharing a picture that isn't the home page's, and one with its own.
      'https://chain.example.com/east/': { status: 200, type: 'text/html', body: Buffer.from('<meta property="og:image" content="/team.jpg">') },
      'https://chain.example.com/west/': { status: 200, type: 'text/html', body: Buffer.from('<meta property="og:image" content="/team.jpg">') },
      'https://chain.example.com/south/': { status: 200, type: 'text/html', body: Buffer.from('<meta property="og:image" content="/south-floor.jpg">') },
      'https://chain.example.com/stock.jpg': { status: 200, type: 'image/jpeg', body: jpeg(1200, 630) },
      'https://chain.example.com/team.jpg': { status: 200, type: 'image/jpeg', body: jpeg(1200, 800) },
      'https://chain.example.com/south-floor.jpg': { status: 200, type: 'image/jpeg', body: jpeg(1600, 900) },
    };
    const get: SafeGet = async (url) => {
      const page = site[url.href];
      return page ? { ...page, url: url.href } : { status: 404, type: 'text/html', body: Buffer.alloc(0), url: url.href };
    };
    const photos = new SitePhotos(openDb(':memory:'), { get });
    expect(await photos.photo('https://chain.example.com/north/')).toBeNull();
    expect((await photos.photo('https://chain.example.com/south/'))?.source).toBe('https://chain.example.com/south-floor.jpg');
    // The first branch's picture looks like its own until a second branch shows the same one.
    expect((await photos.photo('https://chain.example.com/east/'))?.source).toBe('https://chain.example.com/team.jpg');
    expect(await photos.photo('https://chain.example.com/west/')).toBeNull();
    expect(await photos.photo('https://chain.example.com/east/')).toBeNull();
    expect((await photos.photo('https://chain.example.com/south/'))?.source).toBe('https://chain.example.com/south-floor.jpg');
  });
});
