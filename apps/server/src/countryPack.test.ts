import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MELBOURNE_GYMS } from '@gymgo/melbourne-data';
import { createApp } from './app';
import { CountryPacks, type CountryPack } from './countryPack';
import { openDb, seedGyms, type Db } from './db';

// --- A stand-in for the Overpass API: nothing here calls the real one. -------

const RESEARCHED = MELBOURNE_GYMS.find((gym) => gym.location.externalRefs.openStreetMap)!;
let calls: string[] = [];
let down = false;

const STATES = [
  { type: 'relation', id: 1, tags: { 'ISO3166-2': 'AU-VIC', admin_level: '4' } },
  { type: 'relation', id: 3, tags: { 'ISO3166-2': 'AU-NSW', admin_level: '4' } },
  { type: 'relation', id: 2, tags: { 'ISO3166-2': 'AU-TAS', admin_level: '4' } },
];
const VIC = [
  { type: 'node', id: 11, lat: -36.7571, lon: 144.2794, tags: { leisure: 'fitness_centre', name: 'Snap Fitness', brand: 'Snap Fitness', opening_hours: '24/7' } },
  { type: 'way', id: 13, center: { lat: -36.76, lon: 144.27 }, tags: { leisure: 'fitness_centre', name: 'Bendigo Strength Co' } },
  // A gym bundled with the app already, by its map element: left out.
  {
    type: RESEARCHED.location.externalRefs.openStreetMap!.split('/')[0],
    id: Number(RESEARCHED.location.externalRefs.openStreetMap!.split('/')[1]),
    lat: RESEARCHED.location.position.lat,
    lon: RESEARCHED.location.position.lng,
    tags: { leisure: 'fitness_centre', name: RESEARCHED.location.name },
  },
  // Not a gym anyone can visit.
  { type: 'node', id: 14, lat: -36.75, lon: 144.28, tags: { leisure: 'fitness_centre', name: 'Residents Gym' } },
  { type: 'node', id: 99, lat: -36.7589, lon: 144.2802, tags: { place: 'city', name: 'Bendigo' } },
];
const TAS = [{ type: 'node', id: 21, lat: -42.88, lon: 147.33, tags: { leisure: 'fitness_centre', name: 'Hobart Iron' } }];
// No state or postcode, in the time zone New South Wales shares with the ACT.
const NSW = [{ type: 'node', id: 31, lat: -34.42, lon: 150.89, tags: { amenity: 'gym', name: 'Wollongong Barbell' } }];

async function fakeOverpass(_input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const query = new URLSearchParams(String(init?.body)).get('data') ?? '';
  calls.push(query);
  if (down) return new Response('busy', { status: 429 });
  if (query.includes('rel["ISO3166-2"')) return Response.json({ elements: STATES });
  // Gyms and places come in separate questions.
  const wanted = (elements: Array<{ tags: object }>) =>
    elements.filter((el) => ('place' in el.tags) === query.includes('"place"'));
  if (query.includes('AU-VIC')) return Response.json({ elements: wanted(VIC) });
  if (query.includes('AU-TAS')) return Response.json({ elements: wanted(TAS) });
  if (query.includes('AU-NSW')) return Response.json({ elements: wanted(NSW) });
  return Response.json({ elements: [] });
}

let db: Db;
let server: Server;
let base: string;
let clock = new Date('2026-09-28T00:00:00Z');
const overpass = { fetchImpl: fakeOverpass as typeof fetch, endpoints: ['https://overpass.test/api/interpreter'], retryDelayMs: 0, log: () => undefined };

beforeAll(async () => {
  db = openDb(':memory:');
  seedGyms(db, MELBOURNE_GYMS);
  server = createServer(createApp({ db, attribution: 'test', now: () => clock, area: overpass }));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  // GymGO answers only a signed-in account.
  const signup = await fetch(`${base}/api/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'pack-reader@example.com', password: 'correct horse', displayName: 'Reader', birthMonth: '1990-01', acceptTerms: true }),
  });
  reader = ((await signup.json()) as { token: string }).token;
});

let reader: string;
/** A GET as the signed-in reader. */
const get = (path: string, headers: Record<string, string> = {}) => fetch(`${base}${path}`, { headers: { authorization: `Bearer ${reader}`, ...headers } });

afterAll(() => {
  server.close();
  db.close();
});

beforeEach(() => {
  calls = [];
  down = false;
});

describe('a country’s pack of gyms', () => {
  it('reads the country one state at a time, by the same rules, leaving out bundled gyms', async () => {
    const packs = new CountryPacks(openDb(':memory:'), { ...overpass, now: () => clock, known: () => MELBOURNE_GYMS });
    const pack = await packs.build('AU');
    // The list of states, then gyms and places for each.
    expect(calls).toHaveLength(7);
    expect(calls[1]).toContain('area["ISO3166-2"="AU-NSW"]');
    expect(calls[3]).toContain('area["ISO3166-2"="AU-TAS"]');
    expect(calls[5]).toContain('area["ISO3166-2"="AU-VIC"]');
    expect(pack.gyms.map((gym) => gym.name).sort()).toEqual(['Bendigo Strength Co', 'Hobart Iron', 'Snap Fitness', 'Wollongong Barbell']);
    const snap = pack.gyms.find((gym) => gym.name === 'Snap Fitness')!;
    expect(snap).toMatchObject({ osm: 'node/11', locality: 'Bendigo', state: 'VIC', tz: 'Australia/Melbourne', hours: 'always' });
    expect(pack.gyms.find((gym) => gym.name === 'Hobart Iron')!.tz).toBe('Australia/Hobart');
    // The map gave it no state; it was found in New South Wales.
    expect(pack.gyms.find((gym) => gym.name === 'Wollongong Barbell')).toMatchObject({ state: 'NSW', tz: 'Australia/Sydney' });
  });

  it('is built on first asking, then served gzipped and kept', async () => {
    const first = await get(`/api/country/AU/pack?home=AU`);
    expect(first.status).toBe(202);
    expect(((await first.json()) as { state: string }).state).toBe('building');
    // The build runs in the background: wait for it.
    for (let i = 0; i < 50; i += 1) {
      const status = (await (await get(`/api/country/AU/pack/status?home=AU`)).json()) as { state: string };
      if (status.state === 'ready') break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    const ready = await get(`/api/country/AU/pack?home=AU`);
    expect(ready.status).toBe(200);
    const pack = (await ready.json()) as CountryPack;
    expect(pack.country).toBe('AU');
    expect(pack.gyms).toHaveLength(4);
    // Asked again with its tag, nothing is sent.
    const again = await get(`/api/country/AU/pack?home=AU`, { 'If-None-Match': ready.headers.get('etag')! });
    expect(again.status).toBe(304);
    // Each gym in it has its own page, like one found by searching an area.
    const snap = pack.gyms.find((gym) => gym.name === 'Snap Fitness')!;
    const page = await get(`/api/gyms/${snap.id}`);
    expect(page.status).toBe(200);
    // Well under a megabyte gzipped (a real Australia is too).
    const status = (await (await get(`/api/country/AU/pack/status?home=AU`)).json()) as { state: string; gyms: number; bytes: number };
    expect(status).toMatchObject({ state: 'ready', gyms: 4 });
    expect(status.bytes).toBeLessThan(1024 * 1024);
    calls = [];
    await get(`/api/country/AU/pack?home=AU`);
    expect(calls).toHaveLength(0);
  });

  it('is sent unzipped to a client that can’t unzip', async () => {
    const response = await get(`/api/country/AU/pack?home=AU`, { 'Accept-Encoding': 'identity' });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-encoding')).toBeNull();
    expect(((await response.json()) as CountryPack).gyms).toHaveLength(4);
  });

  it('needs Pro for a country other than yours', async () => {
    const response = await get(`/api/country/NZ/pack?home=AU`);
    expect(response.status).toBe(403);
    expect(((await response.json()) as { code: string }).code).toBe('pro_required');
    expect(calls).toHaveLength(0);
  });

  it('refuses what isn’t a country code', async () => {
    expect((await get(`/api/country/AUS/pack?home=AUS`)).status).toBe(400);
  });

  it('says so when the map service is down, and tries again later', async () => {
    down = true;
    const packs = new CountryPacks(openDb(':memory:'), { ...overpass, now: () => clock, known: () => [] });
    expect(packs.status('NZ').state).toBe('building');
    for (let i = 0; i < 50 && packs.status('NZ').state === 'building'; i += 1) await new Promise((resolve) => setTimeout(resolve, 20));
    expect(packs.status('NZ').state).toBe('failed');
    down = false;
    calls = [];
    // Within the hour it isn't asked again; after it, it is.
    packs.status('NZ');
    expect(calls).toHaveLength(0);
    clock = new Date(clock.getTime() + 61 * 60_000);
    expect(packs.status('NZ').state).toBe('building');
  });
});
