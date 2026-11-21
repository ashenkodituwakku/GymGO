/**
 * Where progress photos are kept on a phone: JPEG files in the app's own
 * documents folder, never uploaded. Deleting GymGO deletes them. The
 * browser build uses photoVault.web.ts.
 */

import { File, Paths } from 'expo-file-system';

const fileFor = (id: string) => new File(Paths.document, `progress-photo-${id}.jpg`);

/** Keeps a picture (a file the image tools just made) under `id`. */
export async function keepPhoto(id: string, source: { uri: string }): Promise<boolean> {
  try {
    const target = fileFor(id);
    if (target.exists) target.delete();
    new File(source.uri).copy(target);
    return true;
  } catch {
    return false;
  }
}

/** Something an Image can show, or null if it's gone. */
export async function photoUri(id: string): Promise<string | null> {
  try {
    const file = fileFor(id);
    return file.exists ? file.uri : null;
  } catch {
    return null;
  }
}

export async function forgetPhoto(id: string): Promise<void> {
  try {
    const file = fileFor(id);
    if (file.exists) file.delete();
  } catch {
    // Already gone.
  }
}
