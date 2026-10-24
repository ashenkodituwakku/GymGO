/**
 * Where a country pack is kept on a phone: a file in the app's own
 * documents folder (a few megabytes at most; AsyncStorage on Android tops
 * out at six for everything). The browser build uses packStore.web.ts.
 */

import { File, Paths } from 'expo-file-system';

const fileFor = (country: string) => new File(Paths.document, `gym-pack-${country}.json`);

export async function readPack(country: string): Promise<string | null> {
  try {
    const file = fileFor(country);
    return file.exists ? await file.text() : null;
  } catch {
    return null;
  }
}

export async function writePack(country: string, text: string): Promise<void> {
  try {
    const file = fileFor(country);
    if (!file.exists) file.create();
    file.write(text);
  } catch {
    // Not kept: it's downloaded again next time.
  }
}

export async function removePack(country: string): Promise<void> {
  try {
    const file = fileFor(country);
    if (file.exists) file.delete();
  } catch {
    // Already gone.
  }
}
