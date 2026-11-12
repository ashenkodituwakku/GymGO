import { describe, expect, it } from 'vitest';
import { SIDEBAR_WIDE, dockedBeside, navMode, tabFor } from './navLayout';

describe('the layout', () => {
  it('keeps the tab bar unless the sidebar is chosen, then docks it on a wide screen', () => {
    expect(navMode('tabs', 1400)).toBe('tabs');
    expect(navMode('sidebar', 390)).toBe('drawer');
    expect(navMode('sidebar', SIDEBAR_WIDE - 1)).toBe('drawer');
    expect(navMode('sidebar', SIDEBAR_WIDE)).toBe('docked');
  });

  it('keeps the docked sidebar beside every page once you are in, but not the welcome tour', () => {
    expect(dockedBeside('docked', '/', true)).toBe(true);
    expect(dockedBeside('docked', '/progress', true)).toBe(true);
    expect(dockedBeside('docked', '/gym/anytime-fitness-collingwood', true)).toBe(true);
    expect(dockedBeside('docked', '/welcome', true)).toBe(false);
    expect(dockedBeside('docked', '/sign-in', false)).toBe(false);
    expect(dockedBeside('drawer', '/progress', true)).toBe(false);
    expect(dockedBeside('tabs', '/', true)).toBe(false);
  });

  it('knows which tab a page is on', () => {
    expect(tabFor('/')).toBe('/');
    expect(tabFor('/explore')).toBe('/explore');
    expect(tabFor('/profile')).toBe('/profile');
    expect(tabFor('/progress')).toBeNull();
  });
});
