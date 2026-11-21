/**
 * Progress photos: pictures of yourself, kept on this device only (the
 * files by lib/photoVault, the list here). Never uploaded, never in your
 * account, never shown to GymPal. Each is made 1,200 pixels across at most
 * and saved afresh as a JPEG, which carries none of the original's
 * metadata (where and on what it was taken).
 */

import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { deviceStore } from './deviceStore';
import { forgetPhoto, keepPhoto } from './photoVault';

export interface ProgressPhoto {
  id: string;
  /** YYYY-MM-DD: the day it was added. */
  addedOn: string;
  /** Your words, if any ("start of the programme"). */
  note: string;
}

export const MAX_PROGRESS_PHOTOS = 200;
export const PHOTO_PIXELS = 1200;

export function readPhotos(stored: unknown): ProgressPhoto[] {
  if (!Array.isArray(stored)) return [];
  return stored
    .filter((item): item is ProgressPhoto => !!item && typeof item.id === 'string' && /^[a-z0-9]{6,40}$/.test(item.id) && typeof item.addedOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.addedOn))
    .map((item) => ({ id: item.id, addedOn: item.addedOn, note: typeof item.note === 'string' ? item.note.slice(0, 120) : '' }))
    .slice(0, MAX_PROGRESS_PHOTOS);
}

export const progressPhotos = deviceStore<ProgressPhoto[]>('gymgo.progress-photos.v1', readPhotos, []);

/** Newest first. */
export const newestFirst = (photos: readonly ProgressPhoto[]) => [...photos].sort((a, b) => b.addedOn.localeCompare(a.addedOn) || b.id.localeCompare(a.id));

/** The first and the latest, for "Then and now"; null with fewer than two. */
export function thenAndNow(photos: readonly ProgressPhoto[]): { then: ProgressPhoto; now: ProgressPhoto } | null {
  if (photos.length < 2) return null;
  const sorted = newestFirst(photos);
  return { then: sorted[sorted.length - 1]!, now: sorted[0]! };
}

const today = () => {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/** Picks one from your photos and keeps it; 'cancelled', 'full' or 'failed' otherwise. */
export async function addProgressPhoto(): Promise<ProgressPhoto | 'cancelled' | 'full' | 'failed'> {
  await progressPhotos.ready();
  if (progressPhotos.get().length >= MAX_PROGRESS_PHOTOS) return 'full';
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1, exif: false });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return 'cancelled';
  try {
    const context = ImageManipulator.manipulate(asset.uri);
    if (!asset.width || asset.width > PHOTO_PIXELS) context.resize({ width: PHOTO_PIXELS });
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    if (!(await keepPhoto(id, saved))) return 'failed';
    const photo = { id, addedOn: today(), note: '' };
    progressPhotos.update((now) => [...now, photo]);
    return photo;
  } catch {
    return 'failed';
  }
}

export async function removeProgressPhoto(id: string): Promise<void> {
  await forgetPhoto(id);
  progressPhotos.update((now) => now.filter((photo) => photo.id !== id));
}

export function setPhotoNote(id: string, note: string): void {
  progressPhotos.update((now) => now.map((photo) => (photo.id === id ? { ...photo, note: note.slice(0, 120) } : photo)));
}
