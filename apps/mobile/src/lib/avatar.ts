/**
 * Your profile picture: picked from your photos, cut to a centred square,
 * made 400 pixels across and saved as a JPEG. Small to send, and it carries
 * no metadata (the server strips any again before keeping it).
 */

import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** Pixels across: sharp at the biggest place it's shown (Account, 84 points at 3x is 252). */
export const AVATAR_PIXELS = 400;

/** The centred square of a width × height picture. */
export function centreSquare(width: number, height: number): { originX: number; originY: number; width: number; height: number } {
  const side = Math.min(width, height);
  return { originX: Math.floor((width - side) / 2), originY: Math.floor((height - side) / 2), width: side, height: side };
}

/** A picture from your photos, ready to send (base64 JPEG), or null if you backed out. */
export async function pickAvatar(): Promise<{ uri: string; data: string } | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    // The phone's own square crop, where it has one; the browser has none, so the centre is taken below.
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
    exif: false,
  });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  const context = ImageManipulator.manipulate(asset.uri);
  const known = asset.width > 0 && asset.height > 0;
  if (known && asset.width !== asset.height) context.crop(centreSquare(asset.width, asset.height));
  if (!known || Math.min(asset.width, asset.height) > AVATAR_PIXELS) context.resize(known ? { width: AVATAR_PIXELS, height: AVATAR_PIXELS } : { width: AVATAR_PIXELS });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
  if (!saved.base64) return null;
  return { uri: saved.uri, data: saved.base64 };
}
