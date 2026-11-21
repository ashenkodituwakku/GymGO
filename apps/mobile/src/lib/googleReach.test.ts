import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('whether Google can be reached', () => {
  it('asks once and shares a yes between every embed', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetch);
    const { googleReachable } = await import('./googleReach');
    expect(await Promise.all([googleReachable(), googleReachable()])).toEqual([true, true]);
    expect(await googleReachable()).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('keeps no no: after a failure, the next embed asks again', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetch);
    const { googleReachable } = await import('./googleReach');
    expect(await googleReachable()).toBe(false);
    expect(await googleReachable()).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
