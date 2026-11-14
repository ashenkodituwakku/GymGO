/**
 * Share part of the screen as a picture: a collected card, a completed set.
 *
 * On a phone it's captured as a PNG (react-native-view-shot) and handed to
 * the share sheet (expo-sharing), so it can go to Messages, Instagram or
 * Photos. In a browser it's drawn with html2canvas, then shared where the
 * browser can share files (phones' browsers, Safari, Edge) or downloaded
 * where it can't (most desktop browsers).
 *
 * Only what's on the card goes: a gym's name, city and the card's look,
 * never the days you visited.
 */

import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { Platform, type ViewInstance } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { color } from './theme';

export type ImageShareOutcome = 'shared' | 'downloaded' | 'cancelled' | 'failed';

/** "gymgo-carlton-fitness.png" */
export function imageFileName(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `gymgo-${slug || 'card'}.png`;
}

/**
 * The picture, in a browser: drawn by html2canvas-pro (the library
 * react-native-view-shot uses on the web, called here so the picture can
 * have the page's own background, not white behind a dark-mode card, and be
 * sharp on any screen).
 */
async function pictureOnWeb(target: unknown): Promise<Blob> {
  const html2canvas = (await import('html2canvas-pro')).default;
  const canvas = await html2canvas(target as HTMLElement, {
    useCORS: true,
    backgroundColor: color.groupedBackground,
    scale: Math.max(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1),
  });
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No picture'))), 'image/png'));
}

async function shareOnWeb(target: unknown, fileName: string, title: string): Promise<ImageShareOutcome> {
  const blob = await pictureOnWeb(target);
  const file = new File([blob], fileName, { type: 'image/png' });
  const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { canShare?: (data: ShareData) => boolean }) : null;
  if (nav?.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title });
      return 'shared';
    } catch (error) {
      if ((error as { name?: string }).name === 'AbortError') return 'cancelled';
    }
  }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
  return 'downloaded';
}

/** Capture the view and share it as a picture. */
export async function shareViewAsImage(view: RefObject<ViewInstance | null>, options: { name: string; title: string }): Promise<ImageShareOutcome> {
  const target = view.current;
  if (!target) return 'failed';
  const fileName = imageFileName(options.name);
  try {
    if (Platform.OS === 'web') return await shareOnWeb(target, fileName, options.title);
    if (!(await Sharing.isAvailableAsync())) return 'failed';
    const uri = await captureRef(target, { format: 'png', quality: 1, result: 'tmpfile', fileName: fileName.replace(/\.png$/, '') });
    await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: options.title });
    return 'shared';
  } catch {
    return 'failed';
  }
}

/** What to say after trying, if anything. */
export function imageShareLine(outcome: ImageShareOutcome): string | null {
  if (outcome === 'downloaded') return 'Saved as a picture in your downloads.';
  if (outcome === 'failed') return 'Couldn’t make the picture here. Try a screenshot instead?';
  return null;
}
