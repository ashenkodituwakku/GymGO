/**
 * A gym photo from your photos, ready to send: cropped to 4:3 where the
 * phone offers it, made at most PHOTO_LONG_SIDE pixels on its long side and
 * saved as a JPEG, which carries no metadata (where it was taken included;
 * the server strips any again before keeping it).
 *
 * A phone's photo was sent as it came, about 12 megapixels: often more than
 * the server's 4 MB, so it was refused, and slow over mobile data when it
 * wasn't. A gym's photo is never shown more than about 1,200 pixels across.
 */

import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** Pixels on the long side: sharp wherever a gym's photo is shown, and a few hundred KB. */
export const PHOTO_LONG_SIDE = 2048;

/** The size that fits a width × height picture within `longest` on its long side, or null if it already does. */
export function fitWithin(width: number, height: number, longest: number): { width: number; height: number } | null {
  if (width <= 0 || height <= 0) return null;
  const long = Math.max(width, height);
  if (long <= longest) return null;
  const scale = longest / long;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** A photo from your library, ready to send (base64 JPEG), or null if you backed out. */
export async function pickGymPhoto(): Promise<{ uri: string; data: string } | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    // Full quality from the picker: the one compression is below.
    quality: 1,
    exif: false,
  });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  const context = ImageManipulator.manipulate(asset.uri);
  const size = fitWithin(asset.width, asset.height, PHOTO_LONG_SIDE);
  // A size the picker didn't report is left as it is (resizing could enlarge it); the JPEG below still slims it.
  if (size) context.resize(size);
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
  if (!saved.base64) return null;
  return { uri: saved.uri, data: saved.base64 };
}
