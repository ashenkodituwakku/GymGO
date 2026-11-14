/**
 * Where a country pack is kept in a browser: the Cache Storage API, which
 * holds far more than localStorage's five megabytes. Where it isn't
 * available (a page served over plain http from another computer), the
 * pack lasts only until the page closes.
 */

const CACHE = 'gymgo-packs-v1';
const keyFor = (country: string) => `/gym-pack/${country}.json`;

function caches(): CacheStorage | null {
  return typeof globalThis.caches === 'object' ? globalThis.caches : null;
}

export async function readPack(country: string): Promise<string | null> {
  try {
    const hit = await (await caches()?.open(CACHE))?.match(keyFor(country));
    return hit ? await hit.text() : null;
  } catch {
    return null;
  }
}

export async function writePack(country: string, text: string): Promise<void> {
  try {
    await (await caches()?.open(CACHE))?.put(keyFor(country), new Response(text, { headers: { 'Content-Type': 'application/json' } }));
  } catch {
    // Not kept: it's downloaded again next time.
  }
}

export async function removePack(country: string): Promise<void> {
  try {
    await (await caches()?.open(CACHE))?.delete(keyFor(country));
  } catch {
    // Already gone.
  }
}
