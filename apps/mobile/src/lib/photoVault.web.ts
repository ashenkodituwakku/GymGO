/**
 * Where progress photos are kept in a browser: the Cache Storage API, on
 * this computer only, never uploaded. Clearing this site's data deletes
 * them. Where it isn't available (a page served over plain http from
 * another computer), a photo lasts only until the page closes.
 */

const CACHE = 'gymgo-progress-photos-v1';
const keyFor = (id: string) => `/progress-photo/${id}.jpg`;
/** Pictures shown this visit, so each is read once. */
const shown = new Map<string, string>();

function caches(): CacheStorage | null {
  return typeof globalThis.caches === 'object' ? globalThis.caches : null;
}

export async function keepPhoto(id: string, source: { uri: string }): Promise<boolean> {
  try {
    const blob = await (await fetch(source.uri)).blob();
    const store = await caches()?.open(CACHE);
    if (store) await store.put(keyFor(id), new Response(blob, { headers: { 'Content-Type': 'image/jpeg' } }));
    shown.set(id, URL.createObjectURL(blob));
    return true;
  } catch {
    return false;
  }
}

export async function photoUri(id: string): Promise<string | null> {
  const known = shown.get(id);
  if (known) return known;
  try {
    const hit = await (await caches()?.open(CACHE))?.match(keyFor(id));
    if (!hit) return null;
    const uri = URL.createObjectURL(await hit.blob());
    shown.set(id, uri);
    return uri;
  } catch {
    return null;
  }
}

export async function forgetPhoto(id: string): Promise<void> {
  const known = shown.get(id);
  if (known) URL.revokeObjectURL(known);
  shown.delete(id);
  try {
    await (await caches()?.open(CACHE))?.delete(keyFor(id));
  } catch {
    // Already gone.
  }
}
