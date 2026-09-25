import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app';
import { openDb, type Db } from './db';
import { normaliseQuery, readPhoton } from './places';

// Shaped like Photon's real answer for "Bendigo" (trimmed).
const BENDIGO = {
  type: 'FeatureCollection',
  features: [
    { properties: { type: 'city', name: 'Bendigo', state: 'Victoria', country: 'Australia', countrycode: 'AU' }, geometry: { coordinates: [144.2826718, -36.7590183] } },
    { properties: { type: 'district', name: 'Bendigo', city: 'Bendigo', state: 'Victoria', countrycode: 'AU' }, geometry: { coordinates: [144.2809087, -36.7559145] } },
    { properties: { type: 'locality', name: 'Bendigo', state: 'Otago', country: 'New Zealand', countrycode: 'NZ' }, geometry: { coordinates: [169.34, -44.92] } },
    { properties: { type: 'locality', name: 'Bendigo', state: 'Scotland', country: 'United Kingdom', countrycode: 'GB' }, geometry: { coordinates: [-2.96, 58.94] } },
  ],
};

let asked: string[] = [];
async function fakePhoton(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const url = new URL(String(input));
  asked.push(url.searchParams.get('q') ?? '');
  if (new Headers(init?.headers).get('User-Agent')?.startsWith('GymGO/') !== true) return new Response('who are you', { status: 403 });
  if (url.searchParams.get('q') === 'Nowhere Special') return Response.json({ features: [] });
  return Response.json(BENDIGO);
}

let server: Server;
let base: string;
let db: Db;

beforeAll(async () => {
  db = openDb(':memory:');
  server = createServer(createApp({ db, attribution: 'test', places: { fetchImpl: fakePhoton as typeof fetch } }));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
  db.close();
});

const get = async (path: string) => {
  const response = await fetch(`${base}${path}`);
  return { status: response.status, body: (await response.json()) as Record<string, any> };
};

describe('reading the place finder', () => {
  it('keeps towns and suburbs in Australia and the US only, once each', () => {
    expect(readPhoton(BENDIGO)).toEqual([
      { name: 'Bendigo', region: 'Victoria, Australia', lat: -36.7590183, lng: 144.2826718, countryCode: 'AU', kind: 'city' },
    ]);
    expect(readPhoton(null)).toEqual([]);
    expect(readPhoton({ features: [{ properties: { type: 'state', name: 'Texas', countrycode: 'US' }, geometry: { coordinates: [-99, 31] } }] })).toEqual([]);
  });

  it('treats questions that differ only in case and punctuation as one', () => {
    expect(normaliseQuery('  Bendigo, VIC ')).toBe(normaliseQuery('bendigo vic'));
  });
});

describe('GET /api/places', () => {
  it('finds a town and credits the map', async () => {
    const result = await get('/api/places?q=Bendigo');
    expect(result.status).toBe(200);
    expect(result.body.places[0]).toMatchObject({ name: 'Bendigo', region: 'Victoria, Australia', kind: 'city' });
    expect(result.body.attribution).toContain('OpenStreetMap');
  });

  it('answers the same question again without asking the place finder', async () => {
    asked = [];
    expect((await get('/api/places?q=bendigo')).body.places).toHaveLength(1);
    expect(asked).toEqual([]);
  });

  it('says plainly when nothing matches, and refuses empty or long questions', async () => {
    expect((await get('/api/places?q=Nowhere%20Special')).body.places).toEqual([]);
    expect((await get('/api/places?q=a')).status).toBe(400);
    expect((await get(`/api/places?q=${'x'.repeat(81)}`)).status).toBe(400);
  });
});
