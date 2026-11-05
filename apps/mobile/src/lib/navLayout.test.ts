import { describe, expect, it } from 'vitest';
import { SIDEBAR_WIDE, navMode, tabFor } from './navLayout';

describe('the layout', () => {
  it('keeps the tab bar unless the sidebar is chosen, then docks it on a wide screen', () => {
    expect(navMode('tabs', 1400)).toBe('tabs');
    expect(navMode('sidebar', 390)).toBe('drawer');
    expect(navMode('sidebar', SIDEBAR_WIDE - 1)).toBe('drawer');
    expect(navMode('sidebar', SIDEBAR_WIDE)).toBe('docked');
  });

  it('knows which tab a page is on', () => {
    expect(tabFor('/')).toBe('/');
    expect(tabFor('/explore')).toBe('/explore');
    expect(tabFor('/profile')).toBe('/profile');
    expect(tabFor('/progress')).toBeNull();
  });
});
