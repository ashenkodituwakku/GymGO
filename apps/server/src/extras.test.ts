import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MELBOURNE_GYMS } from '@gymgo/melbourne-data';
import { DEMO_GYMS } from '@gymgo/demo-data';
import { createApp } from './app';
import { openDb, seedGyms, type Db } from './db';
import { cleanPhoto, stripJpeg, stripPng } from './photos';

// --- A tiny JPEG with an EXIF block that carries a fake GPS tag. -------------
const SOI = Buffer.from([0xff, 0xd8]);
const app0 = Buffer.concat([Buffer.from([0xff, 0xe0, 0x00, 0x10]), Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0', 'latin1')]);
const exifPayload = Buffer.from('Exif\0\0GPSLatitude-37.8', 'latin1');
const app1 = Buffer.concat([Buffer.from([0xff, 0xe1]), Buffer.from([0x00, exifPayload.length + 2]), exifPayload]);
const sos = Buffer.from([0xff, 0xda, 0x00, 0x08, 1, 1, 0, 0, 0x3f, 0, 0x12, 0x34, 0x56, 0xff, 0xd9]);
const JPEG_WITH_GPS = Buffer.concat([SOI, app0, app1, sos]);

function pngChunk(type: string, data: Buffer) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  return Buffer.concat([length, Buffer.from(type, 'latin1'), data, Buffer.alloc(4)]);
}
const PNG_WITH_TEXT = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  pngChunk('IHDR', Buffer.alloc(13)),
  pngChunk('tEXt', Buffer.from('Location\0home', 'latin1')),
  pngChunk('IDAT', Buffer.from([1, 2, 3])),
  pngChunk('IEND', Buffer.alloc(0)),
]);

describe('photo cleaning', () => {
  it('removes EXIF (where GPS lives) from a JPEG and keeps the image', () => {
    const clean = stripJpeg(JPEG_WITH_GPS)!;
    expect(clean.includes(Buffer.from('GPSLatitude'))).toBe(false);
    expect(clean.includes(Buffer.from('JFIF'))).toBe(true);
    expect(clean.subarray(-2)).toEqual(Buffer.from([0xff, 0xd9]));
  });

  it('removes text metadata from a PNG', () => {
    const clean = stripPng(PNG_WITH_TEXT)!;
    expect(clean.includes(Buffer.from('Location'))).toBe(false);
    expect(clean.includes(Buffer.from('IDAT'))).toBe(true);
  });

  it('refuses anything that is not a JPEG or PNG, whatever it claims', () => {
    expect(cleanPhoto(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
    expect(cleanPhoto(Buffer.from([0xff, 0xd8, 0xff, 0x00]))).toBeNull();
  });
});

// --- Server with a fake Google -----------------------------------------------
let server: Server;
let base: string;
let db: Db;
let photoDir: string;
const googleCalls: string[] = [];

const CITY = MELBOURNE_GYMS.find((gym) => gym.location.id === 'dohertys-gym-city')!;

async function fakeGoogle(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const url = String(input);
  googleCalls.push(url);
  const headers = new Headers(init?.headers);
  if (headers.get('X-Goog-Api-Key') !== 'test-key') return Response.json({ error: { message: 'bad key' } }, { status: 403 });
  if (url.endsWith('places:searchText')) {
    const body = JSON.parse(String(init?.body));
    if (String(body.textQuery).includes('Absolute')) {
      // Only a listing 2 km away: not this gym.
      return Response.json({ places: [{ id: 'far-away', location: { latitude: -37.83, longitude: 144.99 } }] });
    }
    return Response.json({
      places: [{ id: 'ChIJ-dohertys', location: { latitude: CITY.location.position.lat + 0.0003, longitude: CITY.location.position.lng } }],
    });
  }
  if (url.includes('/photos/p1/media')) return Response.json({ photoUri: 'https://lh3.googleusercontent.com/p1' });
  if (url.includes('/places/ChIJ-dohertys')) {
    return Response.json({
      id: 'ChIJ-dohertys',
      displayName: { text: 'Dohertys Gym City' },
      rating: 4.6,
      userRatingCount: 812,
      currentOpeningHours: { openNow: true },
      regularOpeningHours: { weekdayDescriptions: ['Monday: 5:00 AM – 12:00 AM'] },
      googleMapsUri: 'https://maps.google.com/?cid=1',
      photos: [{ name: 'places/ChIJ-dohertys/photos/p1', authorAttributions: [{ displayName: 'Pat', uri: 'https://maps.google.com/contrib/1' }] }],
      reviews: [{ rating: 5, text: { text: 'Open late.' }, relativePublishTimeDescription: 'a month ago', authorAttribution: { displayName: 'Sam' } }],
    });
  }
  return Response.json({ error: { message: 'unexpected' } }, { status: 404 });
}

beforeAll(async () => {
  db = openDb(':memory:');
  seedGyms(db, [...MELBOURNE_GYMS, ...DEMO_GYMS]);
  photoDir = mkdtempSync(join(tmpdir(), 'gymgo-photos-'));
  server = createServer(
    createApp({ db, attribution: 'test', signupsPerHour: 1000, photoDir, googleKey: 'test-key', fetchImpl: fakeGoogle as typeof fetch }),
  );
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
  db.close();
  rmSync(photoDir, { recursive: true, force: true });
});

async function call(method: string, path: string, options: { token?: string; body?: unknown } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const type = response.headers.get('content-type') ?? '';
  const payload = type.startsWith('image/') ? Buffer.from(await response.arrayBuffer()) : await response.text();
  return { status: response.status, type, raw: payload, body: typeof payload === 'string' && payload ? JSON.parse(payload) : null };
}

let counter = 0;
async function signUp() {
  counter += 1;
  const result = await call('POST', '/api/auth/signup', {
    body: { email: `photo${counter}@example.com`, password: 'correct horse', displayName: `Lifter ${counter}` },
  });
  return { token: result.body.token as string, id: result.body.account.id as string };
}

describe('gym photos', () => {
  it('needs an account and explicit consent, and only takes real images', async () => {
    const data = JPEG_WITH_GPS.toString('base64');
    expect((await call('POST', '/api/gyms/dohertys-gym-city/photos', { body: { data, consent: true } })).status).toBe(401);
    const { token } = await signUp();
    expect((await call('POST', '/api/gyms/dohertys-gym-city/photos', { token, body: { data } })).status).toBe(400);
    const svg = Buffer.from('<svg/>').toString('base64');
    expect((await call('POST', '/api/gyms/dohertys-gym-city/photos', { token, body: { data: svg, consent: true } })).status).toBe(400);
  });

  it('holds a photo for moderation, strips its location, then shows it credited', async () => {
    const author = await signUp();
    const posted = await call('POST', '/api/gyms/dohertys-gym-city/photos', {
      token: author.token,
      body: { data: `data:image/jpeg;base64,${JPEG_WITH_GPS.toString('base64')}`, consent: true },
    });
    expect(posted.status).toBe(201);
    const id = posted.body.photo.id as string;

    // Not public yet, but the uploader sees it's waiting.
    expect((await call('GET', `/api/photos/${id}`)).status).toBe(404);
    const mine = await call('GET', '/api/gyms/dohertys-gym-city/photos', { token: author.token });
    expect(mine.body.photos).toEqual([]);
    expect(mine.body.mine).toEqual([expect.objectContaining({ id, status: 'pending' })]);

    // Members can't moderate; moderators can, and see the image inline.
    expect((await call('GET', '/api/moderation/photos', { token: author.token })).status).toBe(403);
    const moderator = await signUp();
    db.prepare(`update users set role = 'moderator' where id = ?`).run(moderator.id);
    const queue = await call('GET', '/api/moderation/photos', { token: moderator.token });
    expect(queue.body.photos[0]).toMatchObject({ id, gymId: 'dohertys-gym-city' });
    expect(queue.body.photos[0].dataUrl).toMatch(/^data:image\/jpeg;base64,/);
    expect((await call('POST', `/api/moderation/photos/${id}`, { token: moderator.token, body: { decision: 'publish' } })).status).toBe(204);

    const listed = await call('GET', '/api/gyms/dohertys-gym-city/photos');
    expect(listed.body.photos).toEqual([expect.objectContaining({ id, url: `/api/photos/${id}`, credit: expect.stringMatching(/^Lifter/) })]);
    expect((await call('GET', '/api/photos/covers')).body.covers).toEqual({ 'dohertys-gym-city': `/api/photos/${id}` });
    const image = await call('GET', `/api/photos/${id}`);
    expect(image.status).toBe(200);
    expect(image.type).toBe('image/jpeg');
    expect((image.raw as Buffer).includes(Buffer.from('GPSLatitude'))).toBe(false);
  });

  it('refuses photos of the invented demo gyms', async () => {
    const { token } = await signUp();
    const demo = DEMO_GYMS[0]!.location.id;
    const posted = await call('POST', `/api/gyms/${demo}/photos`, { token, body: { data: JPEG_WITH_GPS.toString('base64'), consent: true } });
    expect(posted.status).toBe(400);
  });

  it('deletes a rejected photo’s file, and a rejection needs a reason', async () => {
    const author = await signUp();
    const posted = await call('POST', '/api/gyms/dohertys-gym-brunswick/photos', {
      token: author.token,
      body: { data: JPEG_WITH_GPS.toString('base64'), consent: true },
    });
    const id = posted.body.photo.id as string;
    expect(readdirSync(photoDir).some((name) => name.startsWith(id))).toBe(true);

    const moderator = await signUp();
    db.prepare(`update users set role = 'moderator' where id = ?`).run(moderator.id);
    expect((await call('POST', `/api/moderation/photos/${id}`, { token: moderator.token, body: { decision: 'reject' } })).status).toBe(400);
    expect(
      (await call('POST', `/api/moderation/photos/${id}`, { token: moderator.token, body: { decision: 'reject', reason: 'Not this gym.' } })).status,
    ).toBe(204);
    expect(readdirSync(photoDir).some((name) => name.startsWith(id))).toBe(false);
    expect((await call('GET', `/api/photos/${id}`)).status).toBe(404);
    const mine = await call('GET', '/api/gyms/dohertys-gym-brunswick/photos', { token: author.token });
    expect(mine.body.mine).toEqual([expect.objectContaining({ id, status: 'rejected' })]);
  });
});

describe('what members say a gym has', () => {
  it('tallies each member’s latest report, apart from anything the gym publishes', async () => {
    const gym = '/api/gyms/carlton-fitness/equipment';
    expect((await call('GET', gym)).body).toEqual({ reporters: 0, items: [], mine: [] });
    expect((await call('PUT', gym, { body: { items: [] } })).status).toBe(401);

    const first = await signUp();
    const second = await signUp();
    expect(
      (
        await call('PUT', gym, {
          token: first.token,
          body: { items: [{ equipmentTypeId: 'squat_rack', presence: 'yes' }, { equipmentTypeId: 'dumbbells', presence: 'yes', maxWeightKg: 40 }] },
        })
      ).status,
    ).toBe(204);
    await call('PUT', gym, {
      token: second.token,
      body: { items: [{ equipmentTypeId: 'squat_rack', presence: 'no' }, { equipmentTypeId: 'dumbbells', presence: 'yes', maxWeightKg: 50 }] },
    });

    const tally = await call('GET', gym, { token: first.token });
    expect(tally.body.reporters).toBe(2);
    expect(tally.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ equipmentTypeId: 'squat_rack', yes: 1, no: 1, maxWeightKg: null }),
        expect.objectContaining({ equipmentTypeId: 'dumbbells', yes: 2, no: 0, maxWeightKg: 50 }),
      ]),
    );
    expect(tally.body.mine).toHaveLength(2);

    // A new report replaces the old one: leaving an item out clears it.
    await call('PUT', gym, { token: first.token, body: { items: [{ equipmentTypeId: 'bench', presence: 'yes' }] } });
    const after = await call('GET', gym, { token: first.token });
    expect(after.body.mine).toEqual([{ equipmentTypeId: 'bench', presence: 'yes', maxWeightKg: null }]);
    expect(after.body.items.find((item: { equipmentTypeId: string }) => item.equipmentTypeId === 'squat_rack')).toMatchObject({ yes: 0, no: 1 });
  });

  it('rejects unknown equipment, bad weights and invented demo gyms', async () => {
    const { token } = await signUp();
    const gym = '/api/gyms/carlton-fitness/equipment';
    expect((await call('PUT', gym, { token, body: { items: [{ equipmentTypeId: 'jacuzzi', presence: 'yes' }] } })).status).toBe(400);
    expect((await call('PUT', gym, { token, body: { items: [{ equipmentTypeId: 'bench', presence: 'maybe' }] } })).status).toBe(400);
    expect((await call('PUT', gym, { token, body: { items: [{ equipmentTypeId: 'bench', presence: 'yes', maxWeightKg: 30 }] } })).status).toBe(400);
    expect((await call('PUT', gym, { token, body: { items: [{ equipmentTypeId: 'dumbbells', presence: 'yes', maxWeightKg: 900 }] } })).status).toBe(400);
    const demo = `/api/gyms/${DEMO_GYMS[0]!.location.id}/equipment`;
    expect((await call('PUT', demo, { token, body: { items: [{ equipmentTypeId: 'bench', presence: 'yes' }] } })).status).toBe(400);
  });
});

describe('Google Maps details', () => {
  it('matches the gym, returns live details with credits, and stores only the place ID', async () => {
    const result = await call('GET', '/api/gyms/dohertys-gym-city/google');
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      configured: true,
      found: true,
      place: {
        placeId: 'ChIJ-dohertys',
        rating: 4.6,
        ratingCount: 812,
        openNow: true,
        googleMapsUri: 'https://maps.google.com/?cid=1',
        photos: [{ uri: 'https://lh3.googleusercontent.com/p1', authors: [{ name: 'Pat', uri: 'https://maps.google.com/contrib/1' }] }],
        reviews: [expect.objectContaining({ text: 'Open late.', author: expect.objectContaining({ name: 'Sam' }) })],
      },
    });
    // The key never reaches the app.
    expect(JSON.stringify(result.body)).not.toContain('test-key');
    // Only the place ID is kept; Google's content isn't stored anywhere.
    const stored = db.prepare('select * from google_places').all();
    expect(stored).toEqual([expect.objectContaining({ gym_id: 'dohertys-gym-city', place_id: 'ChIJ-dohertys' })]);

    // Second view: no new search, but details are fetched live again.
    googleCalls.length = 0;
    await call('GET', '/api/gyms/dohertys-gym-city/google');
    expect(googleCalls.some((url) => url.endsWith('places:searchText'))).toBe(false);
    expect(googleCalls.some((url) => url.includes('/places/ChIJ-dohertys'))).toBe(true);
  });

  it('won’t attach a listing that is too far from the gym to be it', async () => {
    const result = await call('GET', '/api/gyms/absolute-mma-melbourne-cbd/google');
    expect(result.body).toEqual({ configured: true, found: false, reason: 'no_match' });
  });

  it('doesn’t look up invented demo gyms', async () => {
    const demo = DEMO_GYMS[0]!.location.id;
    expect((await call('GET', `/api/gyms/${demo}/google`)).body).toEqual({ configured: true, found: false, reason: 'demo' });
  });

  it('is off without a key', async () => {
    const offDb = openDb(':memory:');
    seedGyms(offDb, MELBOURNE_GYMS);
    const off = createServer(createApp({ db: offDb, attribution: 'test', googleKey: null, fetchImpl: fakeGoogle as typeof fetch }));
    await new Promise<void>((resolve) => off.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${(off.address() as AddressInfo).port}/api/gyms/dohertys-gym-city/google`;
    expect(await (await fetch(url)).json()).toEqual({ configured: false });
    off.close();
    offDb.close();
  });
});
