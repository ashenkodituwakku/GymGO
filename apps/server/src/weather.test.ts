import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app';
import { openDb, type Db } from './db';
import { WeatherService, weatherUserAgent } from './weather';

/** MET Norway's compact answer, cut down to what's read. */
const forecast = (updated: string, temps: number[]) => ({
  properties: {
    meta: { updated_at: updated },
    timeseries: temps.map((temp, i) => ({
      time: new Date(Date.UTC(2026, 10, 4, 9 + i)).toISOString(),
      data: { instant: { details: { air_temperature: temp } }, next_1_hours: { summary: { symbol_code: i === 0 ? 'partlycloudy_day' : 'rain' } } },
    })),
  },
});

/** A stand-in for api.met.no: answers from a queue, and keeps what it was asked. */
function fakeMet() {
  const asked: Array<{ url: string; headers: Record<string, string> }> = [];
  const answers: Array<() => Response> = [];
  const fetchImpl = (async (url: string | URL, init?: RequestInit) => {
    asked.push({ url: String(url), headers: { ...(init?.headers as Record<string, string>) } });
    const next = answers.shift();
    if (!next) throw new Error('offline');
    return next();
  }) as typeof fetch;
  const json = (body: unknown, headers: Record<string, string> = {}) => () => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json', ...headers } });
  return { asked, answers, fetchImpl, json };
}

describe('the weather, from MET Norway by map square', () => {
  it('asks for the middle of your own square, says who is asking, and keeps it until it expires', async () => {
    let clock = Date.parse('2026-11-04T09:30:00Z');
    const met = fakeMet();
    const service = new WeatherService({ userAgent: 'GymGO/1.0 https://gymgo.site', fetchImpl: met.fetchImpl, now: () => new Date(clock) });
    met.answers.push(met.json(forecast('2026-11-04T09:17:28Z', [14.4, 13.7]), { expires: 'Wed, 04 Nov 2026 10:00:06 GMT', 'last-modified': 'Wed, 04 Nov 2026 09:29:48 GMT' }));
    const first = await service.forBlock(-38, 144.8);
    expect(met.asked[0]!.url).toBe('https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=-37.85&lon=144.95');
    expect(met.asked[0]!.headers['user-agent']).toBe('GymGO/1.0 https://gymgo.site');
    expect(first).toMatchObject({ area: { lat: -37.85, lng: 144.95 }, updatedAt: '2026-11-04T09:17:28.000Z', hours: [{ tempC: 14.4, symbol: 'partlycloudy_day' }, { tempC: 13.7, symbol: 'rain' }] });
    // Within its Expires: no second request, for anyone in the square.
    clock += 20 * 60_000;
    expect(service.needsFetch(-38, 144.8)).toBe(false);
    expect(await service.forBlock(-38, 144.8)).toBe(first);
    expect(met.asked).toHaveLength(1);
    // After it: asked again with If-Modified-Since; a 304 keeps the one held.
    clock += 15 * 60_000;
    expect(service.needsFetch(-38, 144.8)).toBe(true);
    met.answers.push(() => new Response(null, { status: 304, headers: { expires: 'Wed, 04 Nov 2026 10:40:00 GMT' } }));
    expect(await service.forBlock(-38, 144.8)).toBe(first);
    expect(met.asked[1]!.headers['if-modified-since']).toBe('Wed, 04 Nov 2026 09:29:48 GMT');
  });

  it('asks once for two people in the same square at the same moment', async () => {
    const met = fakeMet();
    const service = new WeatherService({ userAgent: 'GymGO/1.0 https://gymgo.site', fetchImpl: met.fetchImpl });
    met.answers.push(met.json(forecast('2026-11-04T09:00:00Z', [20])));
    const [a, b] = await Promise.all([service.forBlock(51.4, -0.2), service.forBlock(51.4, -0.2)]);
    expect(a).toBe(b);
    expect(met.asked).toHaveLength(1);
  });

  it('hands out the last forecast while MET Norway is away, up to six hours, then says it isn’t available', async () => {
    let clock = Date.parse('2026-11-04T09:30:00Z');
    const met = fakeMet();
    const lines: string[] = [];
    const service = new WeatherService({ userAgent: 'x', fetchImpl: met.fetchImpl, now: () => new Date(clock), log: (line) => lines.push(line) });
    await expect(service.forBlock(-34, 151.1)).rejects.toMatchObject({ status: 503, code: 'weather_unavailable' });
    met.answers.push(met.json(forecast('2026-11-04T09:00:00Z', [22])));
    const kept = await service.forBlock(-34, 151.1);
    clock += 3 * 60 * 60_000;
    met.answers.push(() => new Response('busy', { status: 500 }));
    expect(await service.forBlock(-34, 151.1)).toBe(kept);
    clock += 4 * 60 * 60_000;
    await expect(service.forBlock(-34, 151.1)).rejects.toMatchObject({ code: 'weather_unavailable' });
    // Something that isn't a forecast is no better.
    met.answers.push(met.json({ hello: 'world' }));
    await expect(service.forBlock(10, 10)).rejects.toMatchObject({ code: 'weather_unavailable' });
    expect(lines.some((line) => line.includes('handing out the last forecast'))).toBe(true);
  });

  it('names the server’s site and contact in the User-Agent', () => {
    expect(weatherUserAgent(null, null)).toBe('GymGO/1.0 https://gymgo.site');
    expect(weatherUserAgent('https://app.gymgo.site/x', 'hello@gymgo.site')).toBe('GymGO/1.0 https://app.gymgo.site hello@gymgo.site');
  });
});

describe('GET /api/weather', () => {
  let db: Db;
  let server: Server;
  let base: string;
  const met = fakeMet();
  const call = async (path: string, token: string | null) => {
    const response = await fetch(`${base}${path}`, { headers: token ? { authorization: `Bearer ${token}` } : {} });
    return { status: response.status, body: (await response.json()) as Record<string, any> };
  };

  beforeAll(async () => {
    db = openDb(':memory:');
    server = createServer(createApp({ db, attribution: 'test', signupsPerHour: 1000, weather: { fetchImpl: met.fetchImpl } }));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => {
    server.close();
    db.close();
  });

  it('needs an account and a whole map square, and answers with the forecast and its source', async () => {
    expect((await call('/api/weather?south=-38&west=144.8', null)).status).toBe(401);
    const signed = await fetch(`${base}/api/auth/signup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'weather@example.com', password: 'correct horse', displayName: 'Rain', birthMonth: '1990-01', acceptTerms: true }),
    });
    const token = ((await signed.json()) as { token: string }).token;
    // A position isn't a square: refused before anything is asked.
    for (const query of ['south=-37.8136&west=144.9631', 'south=-38', 'south=abc&west=1', 'south=95&west=0']) {
      expect(await call(`/api/weather?${query}`, token)).toMatchObject({ status: 400, body: { code: 'bad_square' } });
    }
    expect(met.asked).toHaveLength(0);
    met.answers.push(met.json(forecast('2026-11-04T09:17:28Z', [14.4])));
    const answer = await call('/api/weather?south=-38.0&west=144.8', token);
    expect(answer.status).toBe(200);
    expect(answer.body.weather).toMatchObject({ area: { lat: -37.85, lng: 144.95 }, source: { name: 'MET Norway', licence: 'CC BY 4.0' }, hours: [{ tempC: 14.4 }] });
    expect(met.asked[0]!.url).toContain('lat=-37.85&lon=144.95');
  });

  it('says so when it’s switched off', async () => {
    const offDb = openDb(':memory:');
    const off = createServer(createApp({ db: offDb, attribution: 'test', signupsPerHour: 1000, weather: { on: false } }));
    await new Promise<void>((resolve) => off.listen(0, '127.0.0.1', resolve));
    const at = `http://127.0.0.1:${(off.address() as AddressInfo).port}`;
    const signed = await fetch(`${at}/api/auth/signup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'off@example.com', password: 'correct horse', displayName: 'Off', birthMonth: '1990-01', acceptTerms: true }),
    });
    const token = ((await signed.json()) as { token: string }).token;
    const answer = await fetch(`${at}/api/weather?south=-38&west=144.8`, { headers: { authorization: `Bearer ${token}` } });
    expect(answer.status).toBe(503);
    expect(await answer.json()).toMatchObject({ code: 'weather_off' });
    off.close();
    offDb.close();
  });
});
