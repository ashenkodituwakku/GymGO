import { describe, expect, it } from 'vitest';
import { cardFor } from './rarity';
import { friendCardProps, inviteAt } from './friends';

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
