import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mapOnlyRecord } from '@gymgo/osm';
import type { GymRecord } from '@gymgo/domain';
import { createApp } from './app';
import { AppleMaps, RECHECK_DAYS } from './appleMaps';
import { openDb, seedGyms, type Db } from './db';

const KEY = 'test-key-never-logged';
const NOW = new Date('2026-11-03T10:00:00Z');

// An invented gym (no real venue's facts), as the map would give it: no phone, website or hours.
const gym = (id = 'example-strength', name = 'Example Strength Club'): GymRecord =>
  mapOnlyRecord(
    { id, osm: `node/${id.length}`, name, line1: '1 Example Street', locality: 'Carlton', state: 'VIC', postcode: '3053', lat: -37.8, lng: 144.966, type: 'full_gym' },
    { countryCode: 'AU', timezone: 'Australia/Melbourne', fetchedAt: '2026-10-01T00:00:00Z' },
  );

/** What SerpApi's Apple Maps search answers, as its documentation shows it. */
const listing = (over: Record<string, unknown> = {}) => ({
  local_results: [
    {
      position: 1,
      muid: '1234567890',
      title: 'Example Strength Club',
      link: 'https://maps.apple.com/place?auid=1234567890',
      gps_coordinates: { latitude: -37.8003, longitude: 144.9661 },
      phone: '+61390000000',
      phone_formatted: '(03) 9000 0000',
      website: 'https://example-strength.test',
      weekly_hours: { monday: ['05:00 - 22:00'], tuesday: ['05:00 - 22:00'] },
      ...over,
    },
  ],
});

function fakeSerpApi(answer: () => { status: number; body: unknown }) {
  const asked: URL[] = [];
  const fetchImpl = (async (input: string | URL) => {
    asked.push(new URL(String(input)));
    const { status, body } = answer();
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  return { asked, fetchImpl };
}

describe('Apple Maps listings through SerpApi', () => {
  it('is off without a key: nothing asked, nothing changed', async () => {
    const db = openDb(':memory:');
    const serp = fakeSerpApi(() => ({ status: 200, body: listing() }));
    const apple = new AppleMaps(db, { key: null, fetchImpl: serp.fetchImpl, now: () => NOW });
    expect(apple.configured()).toBe(false);
    expect(await apple.enrich([gym()], 5)).toMatchObject({ off: 1, matched: 0 });
    expect(serp.asked).toHaveLength(0);
    expect(apple.decorate(gym())).toEqual(gym());
  });

  it('asks for the gym by name near where it is, and keeps the listing that matches', async () => {
    const db = openDb(':memory:');
    const serp = fakeSerpApi(() => ({ status: 200, body: listing() }));
    const apple = new AppleMaps(db, { key: KEY, fetchImpl: serp.fetchImpl, now: () => NOW });
    expect(await apple.lookUp(gym())).toBe('matched');
    const asked = serp.asked[0]!;
    expect(`${asked.origin}${asked.pathname}`).toBe('https://serpapi.com/search.json');
    expect(Object.fromEntries(asked.searchParams)).toEqual({ engine: 'apple_maps', query: 'Example Strength Club', center: '-37.800000,144.966000', span: '0.01,0.01', sort: 'distance', api_key: KEY });
    const served = apple.decorate(gym());
    expect(served.location.phone).toBe('(03) 9000 0000');
    expect(served.location.website).toBe('https://example-strength.test/');
    expect(served.location.provenance.sources.map((source) => source.label)).toEqual(['OpenStreetMap', 'Apple Maps listing, via SerpApi (phone, website, opening hours)']);
    expect(served.schedules.find((schedule) => schedule.audience === 'member')?.windows).toHaveLength(2);
    // Kept: a new AppleMaps on the same database has it without asking again.
    expect(new AppleMaps(db, { key: KEY, fetchImpl: serp.fetchImpl, now: () => NOW }).listing('example-strength')?.muid).toBe('1234567890');
    expect(serp.asked).toHaveLength(1);
  });

  it('keeps no listing that’s too far away or by another name, and doesn’t ask again for 90 days', async () => {
    const db = openDb(':memory:');
    let now = NOW;
    const far = fakeSerpApi(() => ({ status: 200, body: listing({ gps_coordinates: { latitude: -37.83, longitude: 144.966 } }) }));
    const apple = new AppleMaps(db, { key: KEY, fetchImpl: far.fetchImpl, now: () => now });
    expect(await apple.lookUp(gym())).toBe('none');
    expect(apple.listing('example-strength')).toBeNull();
    expect(apple.needs(gym())).toBe(false);
    now = new Date(NOW.getTime() + (RECHECK_DAYS + 1) * 86_400_000);
    expect(apple.needs(gym())).toBe(true);
    const other = fakeSerpApi(() => ({ status: 200, body: listing({ title: 'Carlton Pharmacy' }) }));
    expect(await new AppleMaps(db, { key: KEY, fetchImpl: other.fetchImpl, now: () => now }).lookUp(gym())).toBe('none');
  });

  it('only looks up gyms missing something, at most the day’s limit', async () => {
    const db = openDb(':memory:');
    const serp = fakeSerpApi(() => ({ status: 200, body: listing() }));
    const apple = new AppleMaps(db, { key: KEY, perDay: 2, fetchImpl: serp.fetchImpl, now: () => NOW });
    const complete = { ...gym('complete', 'Complete Gym'), location: { ...gym('complete').location, phone: '1', website: 'https://x.test/' } };
    complete.schedules = gym().schedules.concat([{ id: 'm', gymId: 'complete', audience: 'member', timezone: 'Australia/Melbourne', windows: [{ day: 1, openMinute: 0, closeMinute: 60 }], exceptions: [], alwaysOpen: false, provenance: { status: 'unknown', sources: [], conflictNote: null } }]);
    const demo = { ...gym('demo'), location: { ...gym('demo').location, isDemoData: true } };
    expect(apple.needs(complete)).toBe(false);
    expect(apple.needs(demo)).toBe(false);
    const counts = await apple.enrich([complete, demo, gym('a'), gym('b'), gym('c')], 10);
    expect(counts).toMatchObject({ matched: 2, limit: 1 });
    expect(serp.asked).toHaveLength(2);
  });

  it('says what SerpApi said when it refuses, never the key', async () => {
    const db = openDb(':memory:');
    const lines: string[] = [];
    const serp = fakeSerpApi(() => ({ status: 401, body: { error: 'Invalid API key. Your API key should be here: https://serpapi.com/manage-api-key' } }));
    const apple = new AppleMaps(db, { key: KEY, fetchImpl: serp.fetchImpl, now: () => NOW, log: (line) => lines.push(line) });
    expect(await apple.lookUp(gym())).toBe('failed');
    expect(lines.join('\n')).toContain('SerpApi answered 401: Invalid API key.');
    expect(lines.join('\n')).not.toContain(KEY);
    // A failure isn't kept as "no listing": it's asked again next time.
    expect(apple.needs(gym())).toBe(true);
  });
});

describe('served with the gym', () => {
  let db: Db;
  let server: Server;
  let base: string;
  let token: string;
  const get = async (path: string) => (await fetch(`${base}${path}`, { headers: { authorization: `Bearer ${token}` } })).json();
  beforeAll(async () => {
    db = openDb(':memory:');
    seedGyms(db, [gym(), gym('plain-gym', 'Plain Gym')]);
    // As a lookup made earlier would have left it.
    new AppleMaps(db, { key: null });
    db.prepare('insert into apple_listings (gym_id, matched, listing_json, looked_up_at) values (?, 1, ?, ?)').run(
      'example-strength',
      JSON.stringify({ muid: '1234567890', link: 'https://maps.apple.com/place?auid=1234567890', title: 'Example Strength Club', phone: '(03) 9000 0000', website: null, hours: null, checkedAt: NOW.toISOString() }),
      NOW.toISOString(),
    );
    server = createServer(createApp({ db, attribution: 'test', now: () => NOW, appleMaps: { key: null } }));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const signup = await fetch(`${base}/api/auth/signup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'apple@example.com', password: 'correct horse', displayName: 'Apple Test', birthMonth: '1990-01', acceptTerms: true }),
    });
    token = ((await signup.json()) as { token: string }).token;
  });
  afterAll(() => {
    server.close();
    db.close();
  });

  it('adds a kept listing to the gym in /api/gyms and /api/gyms/:id, cited', async () => {
    // A gym with no listing is served as it is.
    const plain = (await get('/api/gyms/plain-gym')) as { gym: GymRecord };
    expect(plain.gym.location.phone).toBeNull();
    expect(plain.gym.location.provenance.sources.map((source) => source.label)).toEqual(['OpenStreetMap']);
    const one = (await get('/api/gyms/example-strength')) as { gym: GymRecord };
    expect(one.gym.location.phone).toBe('(03) 9000 0000');
    expect(one.gym.location.provenance.sources.at(-1)).toMatchObject({ label: 'Apple Maps listing, via SerpApi (phone)', checkedAt: NOW.toISOString() });
    const all = (await get('/api/gyms')) as { gyms: GymRecord[] };
    expect(all.gyms.find((each) => each.location.id === 'example-strength')?.location.phone).toBe('(03) 9000 0000');
  });
});
