import { describe, expect, it } from 'vitest';
import { SIDEBAR_FOLDED, SIDEBAR_WIDE, SIDEBAR_WIDTH, dockedBeside, foldedOn, layoutFor, navMode, sidebarInset, tabFor } from './navLayout';

describe('the layout', () => {
  it('keeps the tab bar unless the sidebar is chosen, then docks it on a wide screen', () => {
    expect(navMode('tabs', 1400)).toBe('tabs');
    expect(navMode('sidebar', 390)).toBe('drawer');
    expect(navMode('sidebar', SIDEBAR_WIDE - 1)).toBe('drawer');
    expect(navMode('sidebar', SIDEBAR_WIDE)).toBe('docked');
  });

  it('is automatic until you choose: the sidebar on the website on a wide screen, the tab bar everywhere else', () => {
    expect(layoutFor('auto', 1440, true)).toBe('sidebar');
    expect(navMode('auto', 1440, true)).toBe('docked');
    expect(navMode('auto', SIDEBAR_WIDE, true)).toBe('docked');
    // A narrow window or a phone on the website: the tab bar, not the sidebar behind a Menu button.
    expect(navMode('auto', SIDEBAR_WIDE - 1, true)).toBe('tabs');
    expect(navMode('auto', 390, true)).toBe('tabs');
    // The phone apps, an iPad included: the tab bar.
    expect(navMode('auto', 1366, false)).toBe('tabs');
    // Once chosen, the choice holds everywhere.
    expect(navMode('tabs', 1440, true)).toBe('tabs');
    expect(navMode('sidebar', 390, false)).toBe('drawer');
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

  it('folds the docked sidebar away to a capsule on the map, and only there', () => {
    expect(foldedOn('docked', '/explore', true)).toBe(true);
    expect(foldedOn('docked', '/', true)).toBe(false);
    expect(foldedOn('docked', '/progress', true)).toBe(false);
    expect(foldedOn('drawer', '/explore', true)).toBe(false);
    expect(foldedOn('docked', '/explore', false)).toBe(false);
    expect(sidebarInset('docked', '/explore', true)).toBe(SIDEBAR_FOLDED);
    expect(sidebarInset('docked', '/progress', true)).toBe(SIDEBAR_WIDTH);
    expect(sidebarInset('docked', '/welcome', true)).toBe(0);
    expect(sidebarInset('tabs', '/explore', true)).toBe(0);
  });

  it('keeps the sidebar open on the map too when folding away is turned off', () => {
    expect(foldedOn('docked', '/explore', true, false)).toBe(false);
    expect(sidebarInset('docked', '/explore', true, false)).toBe(SIDEBAR_WIDTH);
    expect(sidebarInset('docked', '/progress', true, false)).toBe(SIDEBAR_WIDTH);
  });

  it('knows which tab a page is on', () => {
    expect(tabFor('/')).toBe('/');
    expect(tabFor('/explore')).toBe('/explore');
    expect(tabFor('/profile')).toBe('/profile');
    expect(tabFor('/progress')).toBeNull();
  });
});
