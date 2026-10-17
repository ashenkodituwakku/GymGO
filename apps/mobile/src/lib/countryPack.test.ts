import { describe, expect, it } from 'vitest';
import { PackIndex, parsePack, type CountryPack, type PackGym } from './countryPack';

const gym = (id: string, name: string, lat: number, lng: number, extra: Partial<PackGym> = {}): PackGym => ({
  id,
  osm: `node/${id.length}${Math.round(lat * 1000)}`,
  name,
  line1: '',
  locality: 'Bendigo',
  state: 'VIC',
  postcode: '',
  lat,
  lng,
  type: 'full_gym',
  tz: 'Australia/Melbourne',
  ...extra,
});

const PACK: CountryPack = {
  country: 'AU',
  builtAt: '2026-09-28T12:00:00Z',
  attribution: '© OpenStreetMap contributors (ODbL)',
  gyms: [
    gym('snap-bendigo', 'Snap Fitness', -36.757, 144.279, { hours: 'always' }),
    gym('iron-bendigo', 'Bendigo Iron', -36.76, 144.27),
    gym('kangaroo-flat', 'Flat Out Fitness', -36.8, 144.25),
    gym('hobart-iron', 'Hobart Iron', -42.88, 147.33, { locality: 'Hobart', state: 'TAS', tz: 'Australia/Hobart' }),
  ],
};

describe('a country pack kept on the device', () => {
  it('reads only real packs', () => {
    expect(parsePack(JSON.stringify(PACK))?.gyms).toHaveLength(4);
    expect(parsePack('not json')).toBeNull();
    expect(parsePack(JSON.stringify({ ...PACK, country: 'Australia' }))).toBeNull();
    // A broken row is dropped, not the whole pack.
    expect(parsePack(JSON.stringify({ ...PACK, gyms: [...PACK.gyms, { id: 'x' }] }))?.gyms).toHaveLength(4);
  });

  it('answers an area with its gyms, nearest the middle first, as map-only records', () => {
    const index = new PackIndex(PACK);
    const box = { south: -36.78, west: 144.25, north: -36.74, east: 144.3 };
    expect(index.covers(box)).toBe(true);
    const { gyms, truncated, timezone } = index.inBox(box, 10);
    expect(gyms.map((record) => record.location.name)).toEqual(['Bendigo Iron', 'Snap Fitness']);
    expect(truncated).toBe(false);
    expect(timezone).toBe('Australia/Melbourne');
    const snap = gyms[1]!;
    expect(snap.location.address).toMatchObject({ countryCode: 'AU', suburb: 'Bendigo', state: 'VIC' });
    expect(snap.location.provenance.status).toBe('community_reported');
    expect(snap.schedules[0]?.alwaysOpen).toBe(true);
    // The same record each time, so lists and cards keep their identity.
    expect(index.inBox(box, 10).gyms[1]).toBe(snap);
    expect(index.byId('snap-bendigo')).toBe(snap);
  });

  it('says when there are more gyms than one answer holds', () => {
    const index = new PackIndex(PACK);
    const wide = { south: -37, west: 144, north: -36.5, east: 144.5 };
    const { gyms, truncated } = index.inBox(wide, 2);
    expect(gyms).toHaveLength(2);
    expect(truncated).toBe(true);
  });

  it('leaves areas far from any of its gyms to the server (the sea, another country)', () => {
    const index = new PackIndex(PACK);
    expect(index.covers({ south: -41.3, west: 174.7, north: -41.2, east: 174.8 })).toBe(false);
    expect(index.covers({ south: -39, west: 150, north: -38.9, east: 150.1 })).toBe(false);
  });

  it('finds gyms by name, nearest first, whatever the accents and case', () => {
    const index = new PackIndex(PACK);
    expect(index.named('iron', { lat: -42.9, lng: 147.3 }, 5).map((record) => record.location.name)).toEqual(['Hobart Iron', 'Bendigo Iron']);
    expect(index.named('SNAP fitness', { lat: -36.7, lng: 144.2 }, 5)).toHaveLength(1);
    expect(index.named('x', { lat: -36.7, lng: 144.2 }, 5)).toHaveLength(0);
  });

  it('lists each suburb and town with gyms once, in the middle of them, with how many', () => {
    const towns = new PackIndex(PACK).towns();
    expect(towns.map((town) => [town.name, town.state, town.gyms])).toEqual([
      ['Bendigo', 'VIC', 3],
      ['Hobart', 'TAS', 1],
    ]);
    expect(towns[0]!.position.lat).toBeCloseTo((-36.757 - 36.76 - 36.8) / 3, 5);
    expect(towns[1]).toMatchObject({ country: 'AU', timezone: 'Australia/Hobart' });
  });

  it('answers a whole-country view by scanning, not cell by cell', () => {
    const index = new PackIndex(PACK);
    const all = index.inBox({ south: -44, west: 112, north: -10, east: 154 }, 100);
    expect(all.gyms).toHaveLength(4);
  });
});
