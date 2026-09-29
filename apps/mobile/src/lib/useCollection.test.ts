import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mergeCollectedGym, type CollectedGym, type Collection } from '@gymgo/domain';

// Each device's storage, and the one in use.
let disk = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => disk.get(key) ?? null,
    setItem: async (key: string, value: string) => void disk.set(key, value),
    removeItem: async (key: string) => void disk.delete(key),
  },
}));

// A stand-in server: each account's collection and last reset, merged as the real one does.
const accounts = new Map<string, { gyms: Collection; resetAt: string | null }>();
let offline = false;
let clock = 0;
vi.mock('./api', () => {
  class ApiError extends Error {
    constructor(readonly status: number, message: string, readonly code: string | null = null, readonly detail: Record<string, unknown> = {}) {
      super(message);
    }
  }
  class OfflineError extends Error {}
  const view = (token: string) => {
    const account = accounts.get(token)!;
    return { gyms: Object.values(account.gyms), resetAt: account.resetAt };
  };
  return {
    ApiError,
    OfflineError,
    api: {
      collection: async (token: string) => {
        if (offline) throw new OfflineError('away');
        return view(token);
      },
      syncCollection: async (token: string, gyms: CollectedGym[], resetAt: string | null) => {
        if (offline) throw new OfflineError('away');
        const account = accounts.get(token)!;
        if (account.resetAt && resetAt !== account.resetAt) throw new ApiError(409, 'reset', 'collection_reset', { resetAt: account.resetAt });
        for (const entry of gyms) account.gyms[entry.id] = account.gyms[entry.id] ? mergeCollectedGym(account.gyms[entry.id]!, entry) : entry;
        return view(token);
      },
      resetCollection: async (token: string) => {
        if (offline) throw new OfflineError('away');
        clock += 1;
        const resetAt = new Date(Date.now() + clock).toISOString();
        accounts.set(token, { gyms: {}, resetAt });
        return { gyms: [], resetAt };
      },
    },
  };
});

const entry = (id: string, days: string[], extra: Partial<CollectedGym> = {}): CollectedGym => ({
  id,
  name: `Gym ${id}`,
  suburb: 'Fitzroy',
  city: 'Melbourne',
  countryCode: 'AU',
  brand: null,
  days,
  firstAt: `${days[0]}T08:00:00.000Z`,
  lastAt: `${days[days.length - 1]}T08:00:00.000Z`,
  seed: `seed-${id}`,
  ...extra,
});
const gymAt = (id: string) => ({ id, name: `Gym ${id}`, suburb: 'Fitzroy', countryCode: 'AU', brand: null, position: { lat: -37.8, lng: 144.98 } });

/** A device: its own storage, and a fresh copy of the store, as when the app starts. */
async function device(stored: Collection = {}) {
  disk = new Map([['gymgo.collection.v1', JSON.stringify(stored)]]);
  vi.resetModules();
  const store = await import('./useCollection');
  const mine = disk;
  return { ...store, use: () => void (disk = mine) };
}

beforeEach(() => {
  accounts.clear();
  offline = false;
});

describe('the gym collection on your account', () => {
  it('merges this device’s collection and the account’s on signing in, losing no visit', async () => {
    accounts.set('t1', { gyms: { a: entry('a', ['2026-09-02'], { seed: 'account' }), b: entry('b', ['2026-09-05']) }, resetAt: null });
    const phone = await device({ a: entry('a', ['2026-09-01'], { seed: 'phone' }) });
    await phone.setCollectionAccount('t1', 'u1');
    const { gyms, sync } = await phone.currentCollection();
    expect(sync).toBe('synced');
    expect(Object.keys(gyms).sort()).toEqual(['a', 'b']);
    expect(gyms.a!.days).toEqual(['2026-09-01', '2026-09-02']);
    // The account's card keeps its looks on every device.
    expect(gyms.a!.seed).toBe('account');
    expect(accounts.get('t1')!.gyms.a!.days).toEqual(['2026-09-01', '2026-09-02']);
  });

  it('keeps a check-in made offline, and sends it once the server is back', async () => {
    accounts.set('t1', { gyms: {}, resetAt: null });
    const phone = await device();
    await phone.setCollectionAccount('t1', 'u1');
    offline = true;
    phone.collectGym(gymAt('c'));
    await phone.syncCollection();
    expect((await phone.currentCollection()).sync).toBe('offline');
    expect(Object.keys((await phone.currentCollection()).gyms)).toEqual(['c']);
    expect(accounts.get('t1')!.gyms.c).toBeUndefined();
    offline = false;
    await phone.syncCollection();
    expect(accounts.get('t1')!.gyms.c?.days).toHaveLength(1);
    expect((await phone.currentCollection()).sync).toBe('synced');
  });

  it('resets on this device and the account; another device can’t bring the old cards back', async () => {
    accounts.set('t1', { gyms: {}, resetAt: null });
    const old = { a: entry('a', ['2026-09-01']), b: entry('b', ['2026-09-03']) };
    // A laptop that synced the old collection, then went offline.
    const laptop = await device(old);
    await laptop.setCollectionAccount('t1', 'u1');
    const phone = await device(old);
    await phone.setCollectionAccount('t1', 'u1');
    await phone.resetCollection();
    expect((await phone.currentCollection()).gyms).toEqual({});
    expect(accounts.get('t1')!.gyms).toEqual({});
    // Back on the laptop: it hears of the reset and drops its old visits instead of sending them.
    laptop.use();
    await laptop.syncCollection();
    expect((await laptop.currentCollection()).gyms).toEqual({});
    expect(accounts.get('t1')!.gyms).toEqual({});
    // What it collects from now on counts.
    laptop.collectGym(gymAt('c'));
    await laptop.syncCollection();
    expect(Object.keys(accounts.get('t1')!.gyms)).toEqual(['c']);
  });

  it('resets nothing when signed in and the server can’t be reached', async () => {
    accounts.set('t1', { gyms: { a: entry('a', ['2026-09-01']) }, resetAt: null });
    const phone = await device();
    await phone.setCollectionAccount('t1', 'u1');
    offline = true;
    await expect(phone.resetCollection()).rejects.toThrow();
    expect(Object.keys((await phone.currentCollection()).gyms)).toEqual(['a']);
    expect(Object.keys(accounts.get('t1')!.gyms)).toEqual(['a']);
  });

  it('signed out, keeps the collection on this device and resets only it', async () => {
    const phone = await device({ a: entry('a', ['2026-09-01']) });
    expect((await phone.currentCollection()).sync).toBe('signed-out');
    await phone.resetCollection();
    expect((await phone.currentCollection()).gyms).toEqual({});
  });

  it('gives a card from before seeds its seed, so merging can’t change its looks', async () => {
    const { seed: _none, ...legacy } = entry('a', ['2026-09-10']);
    accounts.set('t1', { gyms: {}, resetAt: null });
    const phone = await device({ a: legacy });
    await phone.setCollectionAccount('t1', 'u1');
    expect(accounts.get('t1')!.gyms.a!.seed).toBe(`a|${legacy.firstAt}`);
  });
});
