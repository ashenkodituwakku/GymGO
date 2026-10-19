import { describe, expect, it } from 'vitest';
import { cardFor } from './rarity';
import { friendCardProps, inviteAt, placeGap } from './friends';

describe('friends in the app', () => {
  it('draws a friend’s card with the look their account worked out, and no days', () => {
    const props = friendCardProps({
      id: 'g',
      name: 'Gym',
      suburb: 'Fitzroy',
      city: 'Melbourne',
      countryCode: 'AU',
      brand: null,
      visits: 7,
      rarity: 'epic',
      gem: 'onyx',
      foil: true,
      since: '2026-09',
    });
    expect(props.entry.days).toEqual([]);
    expect(props.visits).toBe(7);
    expect(props.look).toEqual({ rarity: 'epic', gem: 'onyx', foil: true, bestDay: null });
    // What cardFor would make of the empty entry isn't what's shown.
    expect(cardFor(props.entry).rarity).toBe('common');
  });

  it('puts an invite at a day and time on the phone’s clock', () => {
    const now = new Date(2026, 9, 1, 15, 20);
    const at = inviteAt(2, 6 * 60, now);
    expect([at.getFullYear(), at.getMonth(), at.getDate(), at.getHours(), at.getMinutes()]).toEqual([2026, 9, 3, 6, 0]);
  });
});

describe('placeGap', () => {
  const row = (rank: number, gyms: number, visits: number) => ({ rank, gyms, visits });
  const rows = [row(1, 9, 30), row(2, 6, 20), row(3, 6, 12), row(3, 6, 12), row(5, 4, 4)];

  it('says how many gyms behind the place above you are, or visits when level on gyms', () => {
    expect(placeGap(row(5, 4, 4), rows, 5)).toBe('2 gyms behind #3.');
    expect(placeGap(row(3, 6, 12), rows, 5)).toBe('Level on gyms with #2, 8 visits behind.');
    expect(placeGap(row(2, 6, 20), rows, 5)).toBe('3 gyms behind #1.');
    expect(placeGap(row(2, 8, 29), [row(1, 9, 30)], 2)).toBe('1 gym behind #1.');
  });

  it('says top of the board at the top, and nothing when the place above isn’t listed', () => {
    expect(placeGap(row(1, 9, 30), rows, 5)).toBe('Top of the board.');
    expect(placeGap(row(1, 1, 1), [row(1, 1, 1)], 1)).toBe('Just you on it so far.');
    expect(placeGap(row(40, 1, 1), [], 40)).toBeNull();
    // Below the rows the board sent: its last row (#5 here) isn't the place above #8.
    expect(placeGap(row(8, 1, 1), rows, 9)).toBeNull();
    expect(placeGap(row(6, 3, 3), rows, 9)).toBe('1 gym behind #5.');
  });
});
