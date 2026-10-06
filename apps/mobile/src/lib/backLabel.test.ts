import { describe, expect, it } from 'vitest';
import { backLabel } from './backLabel';

const tabs = (index: number | undefined) => ({
  key: 'tabs',
  name: '(tabs)',
  state: { index, routes: [{ name: 'index' }, { name: 'explore' }, { name: 'saved' }, { name: 'profile' }] },
});

describe('backLabel', () => {
  it('names the tab you came from', () => {
    expect(backLabel([tabs(3), { key: 'a', name: 'appearance' }], 'a', '(tabs)')).toBe('Profile');
    expect(backLabel([tabs(1), { key: 'g', name: 'gym/[id]' }], 'g', undefined)).toBe('Explore');
  });

  it('takes Home when the tabs have not opened one yet (a page opened from a link)', () => {
    expect(backLabel([{ key: 'tabs', name: '(tabs)' }, { key: 't', name: 'trips/index' }], 't', undefined)).toBe('Home');
    expect(backLabel([tabs(undefined), { key: 't', name: 'trips/index' }], 't', undefined)).toBe('Home');
  });

  it('names the page behind by its title, or says Back when it has none', () => {
    const routes = [tabs(3), { key: 'trips', name: 'trips/index' }, { key: 'trip', name: 'trips/[id]' }];
    expect(backLabel(routes, 'trip', 'Trips')).toBe('Trips');
    expect(backLabel(routes, 'trip', '')).toBe('Back');
    expect(backLabel(routes, 'trip', '  ')).toBe('Back');
  });

  it('says Back with nothing behind', () => {
    expect(backLabel([{ key: 'only', name: 'trips/index' }], 'only', 'Trips')).toBe('Back');
  });
});
