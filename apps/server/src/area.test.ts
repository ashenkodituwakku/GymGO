import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { GymRecord } from '@gymgo/domain';
import { MELBOURNE_GYMS } from '@gymgo/melbourne-data';
import { createApp } from './app';
import { auStateForPostcode, whereIs } from './area';
import { openDb, seedGyms, type Db } from './db';

// --- A stand-in for the Overpass API: nothing here calls the real one. -------

const BENDIGO = { south: -36.8, west: 144.2, north: -36.7, east: 144.35 };
const RESEARCHED = MELBOURNE_GYMS[0]!;

let mapped: unknown[] = [];
let overpassCalls: string[] = [];
let overpassDown = false;

const bendigoElements = () => [
  { type: 'node', id: 11, lat: -36.7571, lon: 144.2794, tags: { leisure: 'fitness_centre', name: 'Snap Fitness', brand: 'Snap Fitness', 'addr:street': 'Mitchell Street', 'addr:housenumber': '12', 'addr:postcode': '3550', opening_hours: '24/7' } },
  { type: 'node', id: 12, lat: -36.758, lon: 144.281, tags: { leisure: 'fitness_centre', name: 'Hot Yoga Bendigo' } },
  { type: 'way', id: 13, center: { lat: -36.76, lon: 144.27 }, tags: { leisure: 'fitness_centre', name: 'Bendigo Strength Co', sport: 'powerlifting', opening_hours: 'Mo-Fr 06:00-20:00' } },
  { type: 'node', id: 14, lat: -36.75, lon: 144.28, tags: { leisure: 'fitness_centre', name: 'Residents Gym' } },
  { type: 'node', id: 99, lat: -36.7589, lon: 144.2802, tags: { place: 'city', name: 'Bendigo' } },
];

async function fakeOverpass(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const body = new URLSearchParams(String(init?.body));
  overpassCalls.push(body.get('data') ?? '');
  if (new Headers(init?.headers).get('User-Agent')?.startsWith('GymGO/') !== true) return new Response('who are you', { status: 403 });
  if (overpassDown) return new Response('busy', { status: 429 });
  return Response.json({ elements: mapped });
}

let server: Server;
let base: string;
let db: Db;
let clock = new Date('2026-09-25T00:00:00Z');

beforeAll(async () => {
  db = openDb(':memory:');
  seedGyms(db, MELBOURNE_GYMS);
  server = createServer(
    createApp({
      db,
      attribution: 'test',
      signupsPerHour: 1000,
      now: () => clock,
      area: { fetchImpl: fakeOverpass as typeof fetch, endpoints: ['https://overpass.test/api/interpreter'] },
    }),
  );
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
  db.close();
});

beforeEach(() => {
  mapped = bendigoElements();
  overpassCalls = [];
  overpassDown = false;
});

async function call(method: string, path: string, token?: string) {
  const response = await fetch(`${base}${path}`, { method, headers: token ? { authorization: `Bearer ${token}` } : {} });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

const areaPath = (box: { south: number; west: number; north: number; east: number }) =>
  `/api/area?south=${box.south}&west=${box.west}&north=${box.north}&east=${box.east}`;

describe('where a point is', () => {
  it('knows Australia and the US, with the right time zone, and nowhere else', () => {
    expect(whereIs(-36.757, 144.279)).toEqual({ countryCode: 'AU', timezone: 'Australia/Melbourne' });
    expect(whereIs(31.76, -106.49)).toEqual({ countryCode: 'US', timezone: 'America/Denver' });
    expect(whereIs(42.3, -83.02)).toBeNull(); // Windsor, Ontario, across the river from Detroit
    expect(whereIs(-36.85, 174.76)).toBeNull(); // Auckland
  });

  it('reads the state from an Australian postcode, Canberra included', () => {
    expect(auStateForPostcode('2600')).toBe('ACT');
    expect(auStateForPostcode('2620')).toBe('NSW');
    expect(auStateForPostcode('0870')).toBe('NT');
    expect(auStateForPostcode('3550')).toBe('VIC');
    expect(auStateForPostcode('')).toBe('');
  });
});

describe('Search this area', () => {
  it('reads the map once, keeps the gyms the rules keep, and labels them as map data', async () => {
    const result = await call('GET', areaPath(BENDIGO));
    expect(result.status).toBe(200);
    expect(overpassCalls).toHaveLength(1);
    expect(overpassCalls[0]).toContain('[bbox:-36.8,144.2,-36.7,144.4]');
    const gyms = result.body.gyms as GymRecord[];
    expect(gyms.map((gym) => gym.location.name).sort()).toEqual(['Bendigo Strength Co', 'Snap Fitness']);
    const snap = gyms.find((gym) => gym.location.name === 'Snap Fitness')!;
    expect(snap.location.id).toBe('snap-fitness-n11');
    expect(snap.location.address).toMatchObject({ line1: '12 Mitchell Street', suburb: 'Bendigo', state: 'VIC', postcode: '3550', countryCode: 'AU' });
    expect(snap.location.timezone).toBe('Australia/Melbourne');
    expect(snap.location.provenance.status).toBe('community_reported');
    expect(snap.location.operatingStatus).toBe('unknown');
    expect(snap.offers).toEqual([]);
    expect(snap.schedules[0]!.alwaysOpen).toBe(true);
    const strength = gyms.find((gym) => gym.location.name === 'Bendigo Strength Co')!;
    expect(strength.location.trainingTypes).toEqual(['strength_focused']);
    expect(result.body.attribution).toContain('OpenStreetMap');
  });

  it('answers the same area again from what it saved, without asking the map', async () => {
    const result = await call('GET', areaPath({ south: -36.78, west: 144.25, north: -36.74, east: 144.3 }));
    expect(result.status).toBe(200);
    expect(overpassCalls).toHaveLength(0);
    expect(result.body.gyms.length).toBe(2);
  });

  it('keeps found gyms, so they can be opened by id and saved', async () => {
    const gym = await call('GET', '/api/gyms/snap-fitness-n11');
    expect(gym.status).toBe(200);
    expect(gym.body.gym.location.name).toBe('Snap Fitness');
    const signup = await fetch(`${base}/api/auth/signup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'area@example.com', password: 'correct horse', displayName: 'Area' }),
    }).then((response) => response.json() as Promise<{ token: string }>);
    expect((await call('PUT', '/api/saved/snap-fitness-n11', signup.token)).status).toBe(204);
    expect((await call('GET', '/api/gyms/snap-fitness-n11/prices', signup.token)).body.currency).toBe('AUD');
  });

  it('leaves out the map’s copy of a gym GymGO already has', async () => {
    const { lat, lng } = RESEARCHED.location.position;
    const [type, id] = RESEARCHED.location.externalRefs.openStreetMap!.split('/');
    mapped = [
      { type, id: Number(id), lat, lon: lng, tags: { leisure: 'fitness_centre', name: RESEARCHED.location.name } },
      { type: 'node', id: 501, lat: lat + 0.0003, lon: lng, tags: { leisure: 'fitness_centre', name: RESEARCHED.location.name } },
    ];
    const box = { south: lat - 0.01, west: lng - 0.01, north: lat + 0.01, east: lng + 0.01 };
    const result = await call('GET', areaPath(box));
    expect(result.status).toBe(200);
    expect(result.body.gyms).toEqual([]);
  });

  it('asks for a smaller area rather than read half a state', async () => {
    const result = await call('GET', areaPath({ south: -38, west: 144, north: -37, east: 145 }));
    expect(result.status).toBe(400);
    expect(result.body.code).toBe('too_big');
    expect(overpassCalls).toHaveLength(0);
  });

  it('says plainly where GymGO does not cover', async () => {
    const result = await call('GET', areaPath({ south: -36.9, west: 174.7, north: -36.8, east: 174.8 }));
    expect(result.status).toBe(422);
    expect(result.body.code).toBe('unsupported_country');
  });

  it('rejects a malformed box', async () => {
    expect((await call('GET', '/api/area?south=1&west=2&north=0&east=3')).status).toBe(400);
    expect((await call('GET', '/api/area?south=a&west=2&north=3&east=4')).status).toBe(400);
  });

  it('says when the map service is busy, and tries again next time', async () => {
    overpassDown = true;
    const box = { south: -37.6, west: 143.8, north: -37.5, east: 143.9 }; // Ballarat
    const busy = await call('GET', areaPath(box));
    expect(busy.status).toBe(503);
    overpassDown = false;
    mapped = [];
    const again = await call('GET', areaPath(box));
    expect(again.status).toBe(200);
    expect(overpassCalls).toHaveLength(2);
  });

  it('re-reads an area after a month, and drops gyms gone from the map', async () => {
    clock = new Date('2026-10-30T00:00:00Z');
    mapped = bendigoElements().filter((el) => el.id !== 13);
    const result = await call('GET', areaPath(BENDIGO));
    expect(overpassCalls).toHaveLength(1);
    expect(result.body.gyms.map((gym: GymRecord) => gym.location.name)).toEqual(['Snap Fitness']);
    expect((await call('GET', '/api/gyms/bendigo-strength-co-w13')).status).toBe(404);
  });
});

describe('when a map server fails', () => {
  it('asks the next one: a timeout, then a runtime error reported as 200, then an answer', async () => {
    const calls: string[] = [];
    const flaky = async (input: string | URL | Request): Promise<Response> => {
      const url = String(input);
      calls.push(url);
      if (url.startsWith('https://down.test')) throw new Error('timed out');
      if (url.startsWith('https://odd.test')) return Response.json({ elements: [], remark: 'runtime error: Query timed out' });
      return Response.json({ elements: bendigoElements() });
    };
    const otherDb = openDb(':memory:');
    const other = createServer(
      createApp({
        db: otherDb,
        attribution: 'test',
        area: { fetchImpl: flaky as typeof fetch, endpoints: ['https://down.test/api', 'https://odd.test/api', 'https://up.test/api'] },
      }),
    );
    await new Promise<void>((resolve) => other.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${(other.address() as AddressInfo).port}${areaPath(BENDIGO)}`;
    const answer = (await (await fetch(url)).json()) as { gyms: GymRecord[] };
    expect(answer.gyms.map((gym) => gym.location.name).sort()).toEqual(['Bendigo Strength Co', 'Snap Fitness']);
    expect(calls).toEqual(['https://down.test/api', 'https://odd.test/api', 'https://up.test/api']);
    other.close();
    otherDb.close();
  });
});
