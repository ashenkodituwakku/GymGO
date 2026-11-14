/**
 * What you pay (lib/visitCost.ts), kept on this device only: amounts you
 * entered, never sent anywhere.
 */

import { deviceStore } from './deviceStore';
import { EVERY, type Spend } from './visitCost';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Stored spends, checked field by field: anything malformed is left out. */
export function readSpends(stored: unknown): Spend[] {
  if (!Array.isArray(stored)) return [];
  return stored.flatMap((raw): Spend[] => {
    const item = (raw ?? {}) as Partial<Spend>;
    const kind = item.kind === 'membership' || item.kind === 'once' ? item.kind : null;
    const every = EVERY.some((entry) => entry.id === item.every) ? item.every! : null;
    if (!kind || typeof item.id !== 'string' || typeof item.label !== 'string') return [];
    if (typeof item.amountMinor !== 'number' || !Number.isInteger(item.amountMinor) || item.amountMinor <= 0) return [];
    if (typeof item.currency !== 'string' || !/^[A-Z]{3}$/.test(item.currency)) return [];
    if (typeof item.startedOn !== 'string' || !DAY.test(item.startedOn)) return [];
    if (kind === 'membership' && !every) return [];
    return [
      {
        id: item.id,
        gymId: typeof item.gymId === 'string' ? item.gymId : null,
        gymName: typeof item.gymName === 'string' ? item.gymName : null,
        kind,
        label: item.label.slice(0, 60),
        amountMinor: item.amountMinor,
        currency: item.currency,
        every: kind === 'membership' ? every : null,
        startedOn: item.startedOn,
        endedOn: typeof item.endedOn === 'string' && DAY.test(item.endedOn) ? item.endedOn : null,
      },
    ];
  });
}

export const spends = deviceStore<Spend[]>('gymgo.spend.v1', readSpends, []);
