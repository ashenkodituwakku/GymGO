import { beforeEach, describe, expect, it, vi } from 'vitest';

let disk = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => disk.get(key) ?? null,
    setItem: async (key: string, value: string) => void disk.set(key, value),
  },
}));

// A stand-in server: each account's saved gyms.
const accounts = new Map<string, Set<string>>();
const listed = new Set(['a', 'b', 'c', 'x']);
let offline = false;
vi.mock('./api', () => {
  class ApiError extends Error {
    constructor(readonly status: number, message: string) {
      super(message);
    }
  }
  class OfflineError extends Error {}
  const reach = () => {
    if (offline) throw new OfflineError('away');
  };
  return {
    ApiError,
    OfflineError,
    api: {
      saved: async (token: string) => {
        reach();
        return { gymIds: [...accounts.get(token)!] };
      },
      save: async (token: string, id: string) => {
        reach();
        if (!listed.has(id)) throw new ApiError(404, 'No such gym.');
        accounts.get(token)!.add(id);
      },
      unsave: async (token: string, id: string) => {
        reach();
        accounts.get(token)!.delete(id);
      },
    },
  };
});

/** A device as the app starts: its storage, and a fresh copy of the module. */
async function device(copy: string[], changes: Record<string, string> | null = {}) {
  disk = new Map([['gymgo.saved.v1', JSON.stringify(copy)]]);
  if (changes) disk.set('gymgo.saved.changes.v1', JSON.stringify(changes));
  vi.resetModules();
  return import('./savedGyms');
}

beforeEach(() => {
  accounts.clear();
  offline = false;
});

describe('saved gyms on this device and the account', () => {
  it('puts this device’s changes on top of the account’s list', async () => {
    const { withChanges } = await device([]);
    expect(withChanges(['a', 'b'], { b: 'unsave', c: 'save', a: 'save' })).toEqual(['a', 'c']);
  });

  it('keeps a gym removed on another device removed, rather than sending the copy here back', async () => {
    accounts.set('t1', new Set(['a']));
    const phone = await device(['a', 'b']);
    expect(await phone.syncSaved('t1')).toEqual(['a']);
    expect([...accounts.get('t1')!]).toEqual(['a']);
  });

  it('sends a gym removed while the server was away once it’s back', async () => {
    accounts.set('t1', new Set(['a', 'b']));
    const phone = await device(['a', 'b']);
    offline = true;
    phone.noteChange('b', 'unsave');
    await expect(phone.syncSaved('t1')).rejects.toThrow();
    offline = false;
    expect(await phone.syncSaved('t1')).toEqual(['a']);
    expect([...accounts.get('t1')!]).toEqual(['a']);
  });

  it('keeps that change across a restart while the server is still away', async () => {
    accounts.set('t1', new Set(['a', 'b']));
    let phone = await device(['a', 'b']);
    phone.noteChange('b', 'unsave');
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const kept = disk;
    vi.resetModules();
    phone = await import('./savedGyms');
    disk = kept;
    expect(await phone.syncSaved('t1')).toEqual(['a']);
    expect([...accounts.get('t1')!]).toEqual(['a']);
  });

  it('adds gyms saved while signed out on signing in', async () => {
    accounts.set('t1', new Set(['a']));
    const phone = await device([]);
    phone.noteChange('c', 'save');
    expect(await phone.syncSaved('t1')).toEqual(['a', 'c']);
    expect([...accounts.get('t1')!].sort()).toEqual(['a', 'c']);
  });

  it('from before changes were kept, counts what’s here and not on the account as saved here, once', async () => {
    accounts.set('t1', new Set(['a']));
    let phone = await device(['a', 'x'], null);
    expect(await phone.syncSaved('t1')).toEqual(['a', 'x']);
    // Removed elsewhere afterwards: it stays removed.
    accounts.get('t1')!.delete('x');
    const kept = disk;
    vi.resetModules();
    phone = await import('./savedGyms');
    disk = kept;
    expect(await phone.syncSaved('t1')).toEqual(['a']);
  });

  it('drops a change the account refuses', async () => {
    accounts.set('t1', new Set(['a']));
    const phone = await device([]);
    phone.noteChange('gone', 'save');
    expect(await phone.syncSaved('t1')).toEqual(['a']);
    expect(phone.othersWaiting('a')).toBe(false);
  });

  it('forgets unsent changes on signing out, so the next account doesn’t get them', async () => {
    accounts.set('t2', new Set());
    const phone = await device(['a']);
    phone.noteChange('b', 'save');
    phone.forgetChanges();
    expect(await phone.syncSaved('t2')).toEqual([]);
  });

  it('settles only the latest change to a gym', async () => {
    const phone = await device([]);
    const first = phone.noteChange('a', 'save');
    const second = phone.noteChange('a', 'unsave');
    expect(phone.settleChange('a', first)).toBe(false);
    expect(phone.othersWaiting('b')).toBe(true);
    expect(phone.settleChange('a', second)).toBe(true);
    expect(phone.othersWaiting('b')).toBe(false);
  });
});
