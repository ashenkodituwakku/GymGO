/**
 * Gym photos that GymGO members take and share.
 *
 * These are the only gym photos GymGO shows as its own. It never takes them
 * from gym websites (they're copyrighted) and never uses stand-in pictures of
 * other gyms. Each photo:
 *  - is a JPEG or PNG, checked by its bytes rather than trusted by its label;
 *  - has its metadata removed before saving, so a phone photo's GPS location
 *    (often the uploader's home) never leaves their device via GymGO;
 *  - needs the uploader to confirm they took it and agree to it being shown,
 *    credited to them;
 *  - waits for a moderator before anyone else can see it.
 */

import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

export type PhotoType = 'jpeg' | 'png';

export function sniffType(bytes: Buffer): PhotoType | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  if (bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  return null;
}

/**
 * Remove metadata from a JPEG: every APPn segment except APP0 (JFIF) and
 * APP2 (colour profile), plus comments. EXIF (APP1) is where GPS lives.
 * Returns null if the file isn't a well-formed JPEG.
 */
export function stripJpeg(bytes: Buffer): Buffer | null {
  if (sniffType(bytes) !== 'jpeg') return null;
  const parts: Buffer[] = [bytes.subarray(0, 2)];
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1]!;
    // Start of scan: the compressed image follows; copy the rest as-is.
    if (marker === 0xda) {
      parts.push(bytes.subarray(offset));
      return Buffer.concat(parts);
    }
    // Standalone markers carry no length.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      parts.push(bytes.subarray(offset, offset + 2));
      offset += 2;
      continue;
    }
    const length = bytes.readUInt16BE(offset + 2);
    const end = offset + 2 + length;
    if (length < 2 || end > bytes.length) return null;
    const isApp = marker >= 0xe0 && marker <= 0xef;
    const keep = !(isApp && marker !== 0xe0 && marker !== 0xe2) && marker !== 0xfe;
    if (keep) parts.push(bytes.subarray(offset, end));
    offset = end;
  }
  return null;
}

/** Remove metadata chunks (EXIF and text) from a PNG. */
export function stripPng(bytes: Buffer): Buffer | null {
  if (sniffType(bytes) !== 'png') return null;
  const drop = new Set(['eXIf', 'tEXt', 'iTXt', 'zTXt', 'tIME']);
  const parts: Buffer[] = [bytes.subarray(0, 8)];
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString('latin1');
    const end = offset + 12 + length;
    if (end > bytes.length) return null;
    if (!drop.has(type)) parts.push(bytes.subarray(offset, end));
    offset = end;
    if (type === 'IEND') return Buffer.concat(parts);
  }
  return null;
}

export function cleanPhoto(bytes: Buffer): { type: PhotoType; bytes: Buffer } | null {
  const type = sniffType(bytes);
  if (type === 'jpeg') {
    const clean = stripJpeg(bytes);
    return clean ? { type, bytes: clean } : null;
  }
  if (type === 'png') {
    const clean = stripPng(bytes);
    return clean ? { type, bytes: clean } : null;
  }
  return null;
}

/** Photo files on disk, next to the database. */
export class PhotoStore {
  constructor(private readonly dir: string | null) {
    if (dir) mkdirSync(dir, { recursive: true });
  }

  private memory = new Map<string, Buffer>();

  private path(id: string, type: PhotoType) {
    return join(this.dir!, `${id}.${type === 'jpeg' ? 'jpg' : 'png'}`);
  }

  save(id: string, type: PhotoType, bytes: Buffer): void {
    if (this.dir) writeFileSync(this.path(id, type), bytes);
    else this.memory.set(id, bytes);
  }

  read(id: string, type: PhotoType): Buffer | null {
    try {
      return this.dir ? readFileSync(this.path(id, type)) : (this.memory.get(id) ?? null);
    } catch {
      return null;
    }
  }

  remove(id: string, type: PhotoType): void {
    try {
      if (this.dir) unlinkSync(this.path(id, type));
      else this.memory.delete(id);
    } catch {
      // Already gone.
    }
  }
}
