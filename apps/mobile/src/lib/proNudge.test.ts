import { describe, expect, it } from 'vitest';
import { nudgeDue, nudgeWait, readNudge } from './proNudge';

const DAY = 24 * 60 * 60_000;
const NOW = Date.UTC(2026, 10, 25, 9);

describe('the Pro reminder', () => {
  it('waits a day after this device first sees a free account', () => {
    expect(nudgeDue({ firstSeen: null, lastShown: null }, NOW)).toBe(false);
    expect(nudgeDue({ firstSeen: NOW - 2 * 60 * 60_000, lastShown: null }, NOW)).toBe(false);
    expect(nudgeDue({ firstSeen: NOW - DAY, lastShown: null }, NOW)).toBe(true);
  });

  it('shows at most once every three days', () => {
    const firstSeen = NOW - 30 * DAY;
    expect(nudgeDue({ firstSeen, lastShown: NOW - 2 * DAY }, NOW)).toBe(false);
    expect(nudgeDue({ firstSeen, lastShown: NOW - 3 * DAY + 60_000 }, NOW)).toBe(false);
    expect(nudgeDue({ firstSeen, lastShown: NOW - 3 * DAY }, NOW)).toBe(true);
  });

  it('waits 8 to 20 seconds on Home', () => {
    expect(nudgeWait(0)).toBe(8_000);
    expect(nudgeWait(1)).toBe(20_000);
    expect(nudgeWait(0.5)).toBe(14_000);
    expect(nudgeWait(7)).toBe(20_000);
  });

  it('reads what was stored, ignoring anything odd', () => {
    expect(readNudge({ firstSeen: 5, lastShown: 'soon' })).toEqual({ firstSeen: 5, lastShown: null });
    expect(readNudge(null)).toEqual({ firstSeen: null, lastShown: null });
    expect(readNudge({ firstSeen: -1, lastShown: Infinity })).toEqual({ firstSeen: null, lastShown: null });
  });
});
