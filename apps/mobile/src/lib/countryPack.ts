/**
 * Your country's gyms, kept on this device.
 *
 * The server builds one file per country from OpenStreetMap (see
 * apps/server/src/countryPack.ts): every gym there, less the ones bundled
 * with the app. Once it's on the phone, searching any area of your country
 * is answered here at once, with no wait on the map service, and offline
 * too. This file is the part that doesn't touch the network or the disk:
 * reading a pack, and finding its gyms by area, id and name.
 */

import type { BoundingBox, GymRecord, LatLng } from '@gymgo/domain';
import { haversineKm } from '@gymgo/domain';
import { mapOnlyRecord, type MapOnlyGym } from '@gymgo/osm';

/** A gym as the pack holds it: a map-only record's fields, and its clock. */
export interface PackGym extends MapOnlyGym {
  tz: string;
}

export interface CountryPack {
  country: string;
  /** When the map was read. */
  builtAt: string;
  attribution: string;
  gyms: PackGym[];
}

/** A pack from its JSON, or null when it isn't one. */
export function parsePack(text: string): CountryPack | null {
  try {
    const value = JSON.parse(text) as Partial<CountryPack> | null;
    if (!value || typeof value.country !== 'string' || !/^[A-Z]{2}$/.test(value.country)) return null;
    if (typeof value.builtAt !== 'string' || Number.isNaN(Date.parse(value.builtAt)) || !Array.isArray(value.gyms)) return null;
    const gyms = value.gyms.filter(
      (gym): gym is PackGym =>
        typeof gym?.id === 'string' &&
        typeof gym.name === 'string' &&
        typeof gym.osm === 'string' &&
        typeof gym.tz === 'string' &&
        Number.isFinite(gym.lat) &&
        Number.isFinite(gym.lng),
    );
    return { country: value.country, builtAt: value.builtAt, attribution: String(value.attribution ?? ''), gyms };
  } catch {
    return null;
  }
}

/** Grid cells a quarter of a degree square: about 25 km. */
const CELL = 4;
const cellKey = (lat: number, lng: number) => `${Math.floor(lat * CELL)}:${Math.floor(lng * CELL)}`;

const fold = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, '');

/** A suburb or town with gyms in the pack. */
export interface PackTown {
  name: string;
  /** As the map gives it: "NSW", "Texas"; empty when it doesn't. */
  state: string;
  country: string;
  /** The middle of its gyms. */
  position: LatLng;
  gyms: number;
  timezone: string;
}

/** A pack, indexed for finding its gyms quickly. Records are made when first asked for, and kept. */
export class PackIndex {
  readonly country: string;
  readonly builtAt: string;
  readonly attribution: string;
  readonly size: number;
  private readonly rows: PackGym[];
  private readonly cells = new Map<string, PackGym[]>();
  private readonly ids = new Map<string, PackGym>();
  private readonly made = new Map<string, GymRecord>();
  private names: string[] | null = null;
  private townList: PackTown[] | null = null;

  constructor(pack: CountryPack) {
    this.country = pack.country;
    this.builtAt = pack.builtAt;
    this.attribution = pack.attribution;
    this.rows = pack.gyms;
    this.size = pack.gyms.length;
    for (const row of pack.gyms) {
      this.ids.set(row.id, row);
      const key = cellKey(row.lat, row.lng);
      const cell = this.cells.get(key);
      if (cell) cell.push(row);
      else this.cells.set(key, [row]);
    }
  }

  private record(row: PackGym): GymRecord {
    let made = this.made.get(row.id);
    if (!made) {
      const { tz, ...gym } = row;
      made = mapOnlyRecord(gym, { countryCode: this.country, timezone: tz, fetchedAt: this.builtAt });
      this.made.set(row.id, made);
    }
    return made;
  }

  byId(id: string): GymRecord | null {
    const row = this.ids.get(id);
    return row ? this.record(row) : null;
  }

  /** The rows in the cells around a point, out to `rings` cells each way. */
  private around(point: LatLng, rings: number): PackGym[] {
    const found: PackGym[] = [];
    const y = Math.floor(point.lat * CELL);
    const x = Math.floor(point.lng * CELL);
    for (let dy = -rings; dy <= rings; dy += 1) {
      for (let dx = -rings; dx <= rings; dx += 1) found.push(...(this.cells.get(`${y + dy}:${x + dx}`) ?? []));
    }
    return found;
  }

  /** The pack's gym nearest a point, within `km`, or null. */
  nearest(point: LatLng, km: number): { row: PackGym; km: number } | null {
    let best: { row: PackGym; km: number } | null = null;
    for (const row of this.around(point, Math.ceil((km / 111) * CELL) + 1)) {
      const d = haversineKm(point, { lat: row.lat, lng: row.lng });
      if (d <= km && (!best || d < best.km)) best = { row, km: d };
    }
    return best;
  }

  /**
   * Whether this pack answers for an area: its middle within 60 km of one of
   * the pack's gyms. Further out (the sea, or over a border) the server is asked.
   */
  covers(box: BoundingBox): boolean {
    return this.nearest({ lat: (box.south + box.north) / 2, lng: (box.west + box.east) / 2 }, 60) !== null;
  }

  /** The gyms in a box, nearest its middle first, at most `limit`. */
  inBox(box: BoundingBox, limit: number): { gyms: GymRecord[]; truncated: boolean; timezone: string | null } {
    const middle = { lat: (box.south + box.north) / 2, lng: (box.west + box.east) / 2 };
    const cellsAcross = (box.north - box.south) * CELL * (box.east - box.west) * CELL;
    const inside = (row: PackGym) => row.lat >= box.south && row.lat <= box.north && row.lng >= box.west && row.lng <= box.east;
    let rows: PackGym[];
    if (cellsAcross > this.cells.size) rows = this.rows.filter(inside);
    else {
      rows = [];
      for (let y = Math.floor(box.south * CELL); y <= Math.floor(box.north * CELL); y += 1) {
        for (let x = Math.floor(box.west * CELL); x <= Math.floor(box.east * CELL); x += 1) {
          for (const row of this.cells.get(`${y}:${x}`) ?? []) if (inside(row)) rows.push(row);
        }
      }
    }
    const distance = (row: PackGym) => (row.lat - middle.lat) ** 2 + ((row.lng - middle.lng) * Math.cos((middle.lat * Math.PI) / 180)) ** 2;
    rows.sort((a, b) => distance(a) - distance(b));
    const timezone = rows[0]?.tz ?? this.nearest(middle, 300)?.row.tz ?? null;
    return { gyms: rows.slice(0, limit).map((row) => this.record(row)), truncated: rows.length > limit, timezone };
  }

  /**
   * Every suburb and town with a gym in the pack, once each (by name and
   * state), in the middle of its gyms: somewhere the search box can suggest.
   */
  towns(): PackTown[] {
    if (this.townList) return this.townList;
    const byName = new Map<string, { names: Map<string, number>; state: string; lat: number; lng: number; gyms: number; tz: string }>();
    for (const row of this.rows) {
      const name = row.locality.trim();
      if (!name) continue;
      const key = `${fold(name)}|${row.state}`;
      const town = byName.get(key);
      if (town) {
        town.names.set(name, (town.names.get(name) ?? 0) + 1);
        town.lat += row.lat;
        town.lng += row.lng;
        town.gyms += 1;
      } else {
        byName.set(key, { names: new Map([[name, 1]]), state: row.state, lat: row.lat, lng: row.lng, gyms: 1, tz: row.tz });
      }
    }
    this.townList = [...byName.values()].map((town) => ({
      // The spelling most of its gyms use.
      name: [...town.names.entries()].sort((a, b) => b[1] - a[1])[0]![0],
      state: town.state,
      country: this.country,
      position: { lat: town.lat / town.gyms, lng: town.lng / town.gyms },
      gyms: town.gyms,
      timezone: town.tz,
    }));
    return this.townList;
  }

  /** Gyms whose name contains every word typed, nearest `near` first. */
  named(text: string, near: LatLng, limit: number): GymRecord[] {
    const words = fold(text).split(/[^a-z0-9]+/).filter((word) => word.length >= 2);
    if (words.length === 0) return [];
    this.names ??= this.rows.map((row) => fold(`${row.name} ${row.brand ?? ''}`));
    const found: PackGym[] = [];
    this.names.forEach((name, index) => {
      if (words.every((word) => name.includes(word))) found.push(this.rows[index]!);
    });
    return found
      .map((row) => ({ row, d: haversineKm(near, { lat: row.lat, lng: row.lng }) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, limit)
      .map((item) => this.record(item.row));
  }
}
