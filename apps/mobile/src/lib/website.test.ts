import { afterEach, describe, expect, it, vi } from 'vitest';
import { askAgain, decideWebsite, latestAnswer, onServerAnswer, resetWebsite, serverAnswered, serverIsOn } from './website';

const answer = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));

afterEach(() => {
  resetWebsite();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('serverIsOn', () => {
  it('is on when the server says ok, asked at its health check with nothing cached', async () => {
    const fetcher = answer(200, { ok: true });
    expect(await serverIsOn('https://app.gymgo.site/', { fetcher })).toBe(true);
    expect(fetcher).toHaveBeenCalledWith('https://app.gymgo.site/api/health', expect.objectContaining({ cache: 'no-store' }));
  });

  it('is off for Cloudflare’s page for a tunnel with nothing behind it', async () => {
    const fetcher = vi.fn(async () => new Response('<html>Error 1033</html>', { status: 530 }));
    expect(await serverIsOn('https://app.gymgo.site', { fetcher })).toBe(false);
  });

  it('is off for anything but its own ok', async () => {
    expect(await serverIsOn('https://app.gymgo.site', { fetcher: answer(200, { ok: false }) })).toBe(false);
    expect(await serverIsOn('https://app.gymgo.site', { fetcher: vi.fn(async () => new Response('not json', { status: 200 })) })).toBe(false);
  });

  it('is off when the request fails (no such address, or a refusal from another site)', async () => {
    const fetcher = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    expect(await serverIsOn('https://app.gymgo.site', { fetcher })).toBe(false);
  });

  it('takes silence for off, after the wait', async () => {
    const fetcher = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))),
    );
    const started = Date.now();
    expect(await serverIsOn('https://app.gymgo.site', { fetcher: fetcher as typeof fetch, wait: 50 })).toBe(false);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('never asks without a real address', async () => {
    const fetcher = answer(200, { ok: true });
    for (const base of [undefined, null, '', 'none', 'same-origin', '/api']) {
      expect(await serverIsOn(base, { fetcher })).toBe(false);
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe('the page’s version', () => {
  it('is the answer when it opened, and stays it while later answers are only heard', async () => {
    expect(await decideWebsite('https://app.gymgo.site', { fetcher: answer(200, { ok: true }) })).toBe(true);
    expect(serverAnswered()).toBe(true);
    expect(latestAnswer()).toBe(true);

    const heard: boolean[] = [];
    const stop = onServerAnswer((on) => heard.push(on));
    await askAgain('https://app.gymgo.site', { fetcher: answer(530, {}) });
    expect(heard).toEqual([false]);
    expect(latestAnswer()).toBe(false);
    expect(serverAnswered()).toBe(true);

    stop();
    await askAgain('https://app.gymgo.site', { fetcher: answer(200, { ok: true }) });
    expect(heard).toEqual([false]);
  });

  it('uses the question the page asked as it opened, rather than asking twice', async () => {
    const fetcher = answer(200, { ok: true });
    expect(await decideWebsite('https://app.gymgo.site', { fetcher, early: Promise.resolve(true) })).toBe(true);
    expect(fetcher).not.toHaveBeenCalled();
    expect(await decideWebsite('https://app.gymgo.site', { fetcher, early: Promise.resolve(false) })).toBe(false);
    expect(await decideWebsite('https://app.gymgo.site', { fetcher, early: Promise.reject(new TypeError('Failed to fetch')) })).toBe(false);
    // Only a plain true is on.
    expect(await decideWebsite('https://app.gymgo.site', { fetcher, early: Promise.resolve('yes') })).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('waits for the page’s question only so long', async () => {
    const started = Date.now();
    expect(await decideWebsite('https://app.gymgo.site', { early: new Promise(() => undefined), wait: 50 })).toBe(false);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('finds the page’s question where the page put it', async () => {
    const fetcher = answer(530, {});
    (globalThis as { __gymgoServer?: Promise<boolean> }).__gymgoServer = Promise.resolve(true);
    try {
      expect(await decideWebsite('https://app.gymgo.site', { fetcher })).toBe(true);
      expect(fetcher).not.toHaveBeenCalled();
    } finally {
      delete (globalThis as { __gymgoServer?: Promise<boolean> }).__gymgoServer;
    }
  });

  it('asks one question at a time', async () => {
    const fetcher = answer(200, { ok: true });
    const first = askAgain('https://app.gymgo.site', { fetcher });
    const second = askAgain('https://app.gymgo.site', { fetcher });
    expect(second).toBe(first);
    await first;
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe('LIMITED', () => {
  it('follows the answer on the website that picks its version', async () => {
    vi.stubEnv('EXPO_PUBLIC_LIMITED', 'auto');
    const website = await import('./website');
    await website.decideWebsite('https://app.gymgo.site', { fetcher: answer(200, { ok: true }) });
    expect((await import('./limited')).LIMITED).toBe(false);

    vi.resetModules();
    const again = await import('./website');
    await again.decideWebsite('https://app.gymgo.site', { fetcher: answer(530, {}) });
    expect((await import('./limited')).LIMITED).toBe(true);
  });

  it('is limited there if nothing was asked (never the full version by mistake)', async () => {
    vi.stubEnv('EXPO_PUBLIC_LIMITED', 'auto');
    expect((await import('./limited')).LIMITED).toBe(true);
  });

  it('is always on with EXPO_PUBLIC_LIMITED=on, and off without it', async () => {
    vi.stubEnv('EXPO_PUBLIC_LIMITED', 'on');
    expect((await import('./limited')).LIMITED).toBe(true);
    vi.resetModules();
    vi.stubEnv('EXPO_PUBLIC_LIMITED', '');
    expect((await import('./limited')).LIMITED).toBe(false);
  });
});
