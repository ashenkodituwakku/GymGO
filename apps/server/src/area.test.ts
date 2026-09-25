import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { GymRecord } from '@gymgo/domain';
import { MELBOURNE_GYMS } from '@gymgo/melbourne-data';
import { createApp } from './app';
import { AreaSearch, auStateForPostcode, whereIs } from './area';
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
      area: { fetchImpl: fakeOverpass as typeof fetch, endpoints: ['https://overpass.test/api/interpreter'], retryDelayMs: 0, log: () => undefined },
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

const areaPath = (box: { south: number; west: number; north: number; east: number }, home = 'AU') =>
  `/api/area?south=${box.south}&west=${box.west}&north=${box.north}&east=${box.east}&home=${home}`;

describe('where a point is', () => {
  it('knows the country and time zone anywhere on land', () => {
    expect(whereIs(-36.757, 144.279)).toEqual({ countryCode: 'AU', timezone: 'Australia/Melbourne' });
    expect(whereIs(31.76, -106.49)).toEqual({ countryCode: 'US', timezone: 'America/Denver' });
    expect(whereIs(42.3, -83.02)).toEqual({ countryCode: 'CA', timezone: 'America/Toronto' }); // Windsor, across the river from Detroit
    expect(whereIs(-36.85, 174.76)).toEqual({ countryCode: 'NZ', timezone: 'Pacific/Auckland' });
    expect(whereIs(51.5, -0.12)).toEqual({ countryCode: 'GB', timezone: 'Europe/London' });
    expect(whereIs(35.68, 139.7)).toEqual({ countryCode: 'JP', timezone: 'Asia/Tokyo' });
    expect(whereIs(18.45, -66.1)?.countryCode).toBe('US'); // Puerto Rico counts as the US
  });

  it('knows nothing out at sea', () => {
    expect(whereIs(-30, -120)).toBeNull(); // the South Pacific
    expect(whereIs(0, -30)).toBeNull(); // the Atlantic
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
    expect(result.body.where).toEqual({ countryCode: 'AU', timezone: 'Australia/Melbourne' });
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

  it('searches anywhere: Auckland, labelled with its own country, clock and address order', async () => {
    mapped = [
      { type: 'node', id: 21, lat: -36.848, lon: 174.763, tags: { leisure: 'fitness_centre', name: 'Les Mills Auckland City', 'addr:street': 'Victoria Street West', 'addr:housenumber': '186', 'addr:postcode': '1010' } },
      { type: 'node', id: 22, lat: -36.85, lon: 174.77, tags: { leisure: 'fitness_centre', name: 'Kraftraum', 'addr:street': 'Queen Street', 'addr:housenumber': '9', 'addr:country': 'DE' } },
    ];
    const result = await call('GET', areaPath({ south: -36.9, west: 174.7, north: -36.8, east: 174.8 }, 'NZ'));
    expect(result.status).toBe(200);
    expect(result.body.where).toEqual({ countryCode: 'NZ', timezone: 'Pacific/Auckland' });
    const [les, kraftraum] = result.body.gyms as GymRecord[];
    expect(les!.location.address).toMatchObject({ countryCode: 'NZ', line1: '186 Victoria Street West', postcode: '1010' });
    expect(les!.location.timezone).toBe('Pacific/Auckland');
    // The country comes from where it is, not from a mistyped tag.
    expect(kraftraum!.location.address.countryCode).toBe('NZ');
  });

  it('takes visit prices only in Australian and US dollars, and says so', async () => {
    const prices = '/api/gyms/les-mills-auckland-city-n21/prices';
    expect((await call('GET', prices)).body).toMatchObject({ currency: null, count: 0, typicalMinor: null });
    const signup = await fetch(`${base}/api/auth/signup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'auckland@example.com', password: 'correct horse', displayName: 'Kiwi' }),
    }).then((response) => response.json() as Promise<{ token: string }>);
    const put = await fetch(`${base}${prices}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${signup.token}` },
      body: JSON.stringify({ amountMinor: 2500, paidOn: '2026-09-20' }),
    });
    expect(put.status).toBe(400);
    expect(((await put.json()) as { error: string }).error).toContain('Australia and the US');
  });

  it('writes the house number after the street where the country does', async () => {
    mapped = [
      { type: 'node', id: 31, lat: 52.52, lon: 13.405, tags: { leisure: 'fitness_centre', name: 'Kraftwerk Gym', 'addr:street': 'Rathausstraße', 'addr:housenumber': '5', 'addr:postcode': '10178', 'addr:city': 'Berlin' } },
    ];
    const result = await call('GET', areaPath({ south: 52.5, west: 13.38, north: 52.54, east: 13.42 }, 'DE'));
    expect(result.body.gyms[0].location.address).toMatchObject({ countryCode: 'DE', line1: 'Rathausstraße 5', suburb: 'Berlin', postcode: '10178' });
    expect(result.body.where.timezone).toBe('Europe/Berlin');
  });

  it('keeps other countries for Pro: a Free search abroad is refused before the map is read', async () => {
    const berlin = { south: 52.5, west: 13.38, north: 52.54, east: 13.42 };
    const refused = await call('GET', areaPath(berlin, 'AU'));
    expect(refused.status).toBe(403);
    expect(refused.body).toMatchObject({ code: 'pro_required', countryCode: 'DE' });
    expect(overpassCalls).toHaveLength(0);
    // Saying no country at all isn't an answer.
    expect((await call('GET', areaPath(berlin, ''))).status).toBe(400);
  });

  it('lets a Pro account search any country', async () => {
    const signup = await fetch(`${base}/api/auth/signup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'traveller@example.com', password: 'correct horse', displayName: 'Traveller' }),
    }).then((response) => response.json() as Promise<{ token: string; account: { id: string } }>);
    db.prepare(
      `insert into subscriptions (stripe_subscription_id, user_id, status, interval, currency, amount_minor, price_lookup_key, current_period_end, cancel_at, cancel_at_period_end, updated_at)
       values ('sub_test_traveller', ?, 'active', 'year', 'aud', 2999, 'gymgo_pro_year_aud', '2027-09-25T00:00:00Z', null, 0, '2026-09-25T00:00:00Z')`,
    ).run(signup.account.id);
    mapped = [{ type: 'node', id: 41, lat: 48.86, lon: 2.35, tags: { leisure: 'fitness_centre', name: 'Club Rivoli' } }];
    const response = await fetch(`${base}${areaPath({ south: 48.84, west: 2.33, north: 48.88, east: 2.37 }, 'AU')}`, {
      headers: { authorization: `Bearer ${signup.token}` },
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { gyms: GymRecord[]; where: { countryCode: string } };
    expect(body.where.countryCode).toBe('FR');
    expect(body.gyms.map((gym) => gym.location.name)).toEqual(['Club Rivoli']);
  });

  it('searches the sea without complaint, and finds nothing there', async () => {
    mapped = [];
    const result = await call('GET', areaPath({ south: -30.1, west: -120.1, north: -30, east: -120 }));
    expect(result.status).toBe(200);
    expect(result.body.gyms).toEqual([]);
    expect(result.body.where).toBeNull();
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
    // Asked twice while busy (it said 429: one more try), then once more.
    const again = await call('GET', areaPath(box));
    expect(again.status).toBe(200);
    expect(overpassCalls).toHaveLength(3);
  });

  it('applies today’s rules to gyms kept from an earlier read', async () => {
    // Stored before a rule change let it through; the rules now leave it out.
    const record = { location: { id: 'maxs-junior-boxing-n77', name: "Max's Junior Boxing" } };
    db.prepare('insert into area_gyms (id, osm, record_json, lat, lng, fetched_at) values (?, ?, ?, ?, ?, ?)').run(
      'maxs-junior-boxing-n77', 'node/77', JSON.stringify(record), -36.758, 144.28, '2026-09-25T00:00:00Z',
    );
    const result = await call('GET', areaPath(BENDIGO));
    expect(result.body.gyms.map((gym: GymRecord) => gym.location.name)).not.toContain("Max's Junior Boxing");
    expect(overpassCalls).toHaveLength(0);
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

  it('asks a busy server once more before moving on', async () => {
    const calls: string[] = [];
    let first = true;
    const busyOnce = async (input: string | URL | Request): Promise<Response> => {
      calls.push(String(input));
      if (first) {
        first = false;
        return new Response('busy', { status: 504 });
      }
      return Response.json({ elements: bendigoElements() });
    };
    const otherDb = openDb(':memory:');
    const search = new AreaSearch(otherDb, {
      known: () => [],
      fetchImpl: busyOnce as typeof fetch,
      endpoints: ['https://busy.test/api', 'https://other.test/api'],
      log: () => undefined,
      retryDelayMs: 0,
    });
    const answer = await search.search(BENDIGO);
    expect(answer.gyms.length).toBe(2);
    expect(calls).toEqual(['https://busy.test/api', 'https://busy.test/api']);
    otherDb.close();
  });

  it('asks the server that answered last time first', async () => {
    const calls: string[] = [];
    const flaky = async (input: string | URL | Request): Promise<Response> => {
      calls.push(String(input));
      if (String(input).startsWith('https://down.test')) throw new Error('timed out');
      return Response.json({ elements: bendigoElements() });
    };
    const otherDb = openDb(':memory:');
    const logged: string[] = [];
    const search = new AreaSearch(otherDb, {
      known: () => [],
      fetchImpl: flaky as typeof fetch,
      endpoints: ['https://down.test/api', 'https://up.test/api'],
      log: (line) => logged.push(line),
    });
    await search.search(BENDIGO);
    await search.search({ south: -37.8, west: 145.0, north: -37.7, east: 145.1 });
    expect(calls).toEqual(['https://down.test/api', 'https://up.test/api', 'https://up.test/api']);
    expect(logged).toEqual(["[area] down.test didn't answer (Error); trying the next"]);
    otherDb.close();
  });
});

describe('two searches of one area at once', () => {
  it('reads the map once: the second waits its turn, then finds the area fresh', async () => {
    let reads = 0;
    const slow = async (): Promise<Response> => {
      reads += 1;
      await new Promise((resolve) => setTimeout(resolve, 30));
      return Response.json({ elements: bendigoElements() });
    };
    const otherDb = openDb(':memory:');
    const search = new AreaSearch(otherDb, { known: () => [], fetchImpl: slow as typeof fetch, endpoints: ['https://up.test/api'] });
    const [first, second] = await Promise.all([search.search(BENDIGO), search.search(BENDIGO)]);
    expect(reads).toBe(1);
    expect(second.gyms.map((gym) => gym.location.id)).toEqual(first.gyms.map((gym) => gym.location.id));
    otherDb.close();
  });
});
