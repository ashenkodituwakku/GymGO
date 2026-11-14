/**
 * The prices last seen at your saved gyms, and the notes about changes you
 * haven't dismissed yet (lib/priceWatch.ts). Kept on this device.
 */

import { deviceStore } from './deviceStore';
import type { PriceChange, SeenPrice } from './priceWatch';

export interface PriceWatch {
  seen: Record<string, SeenPrice[]>;
  notes: PriceChange[];
}

export function readPriceWatch(stored: unknown): PriceWatch {
  const value = (stored ?? {}) as Partial<PriceWatch>;
  const seen: Record<string, SeenPrice[]> = {};
  if (value.seen && typeof value.seen === 'object') {
    for (const [gymId, prices] of Object.entries(value.seen)) {
      if (!Array.isArray(prices)) continue;
      seen[gymId] = prices.filter(
        (price): price is SeenPrice =>
          !!price && typeof price.offerId === 'string' && typeof price.label === 'string' && Number.isInteger(price.amountMinor) && typeof price.currency === 'string',
      );
    }
  }
  const notes = Array.isArray(value.notes)
    ? value.notes.filter((note): note is PriceChange => !!note && typeof note.id === 'string' && typeof note.gymId === 'string' && typeof note.label === 'string').slice(-50)
    : [];
  return { seen, notes };
}

export const priceWatch = deviceStore<PriceWatch>('gymgo.price-watch.v1', readPriceWatch, { seen: {}, notes: [] });
