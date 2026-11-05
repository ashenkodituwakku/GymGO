import { describe, expect, it } from 'vitest';
import { MAX_RECENT_PLACES, readPlaces, rememberPlace, type RecentPlace } from './recentPlaces';

const place = (placeName: string, countryCode = 'AU'): RecentPlace => ({ placeName, countryCode, timezone: 'Australia/Melbourne', centre: { lat: -37.8, lng: 144.9 } });

describe('recent places', () => {
  it('puts the newest first, once, and keeps five', () => {
    let list: RecentPlace[] = [];
    for (const name of ['Fitzroy', 'Carlton', 'Richmond', 'Brunswick', 'Collingwood', 'Northcote']) list = rememberPlace(list, place(name));
    expect(list.map((item) => item.placeName)).toEqual(['Northcote', 'Collingwood', 'Brunswick', 'Richmond', 'Carlton']);
    expect(list).toHaveLength(MAX_RECENT_PLACES);
    list = rememberPlace(list, place('brunswick'));
    expect(list.map((item) => item.placeName)).toEqual(['brunswick', 'Northcote', 'Collingwood', 'Richmond', 'Carlton']);
  });

  it('tells apart places of the same name in different countries', () => {
    const list = rememberPlace([place('Richmond', 'AU')], place('Richmond', 'US'));
    expect(list.map((item) => item.countryCode)).toEqual(['US', 'AU']);
  });

  it('reads back only what still looks like places', () => {
    expect(readPlaces(null)).toEqual([]);
    expect(readPlaces('not json')).toEqual([]);
    expect(readPlaces('{"a":1}')).toEqual([]);
    expect(readPlaces(JSON.stringify([place('Fitzroy'), { placeName: 'Broken' }, 7]))).toEqual([place('Fitzroy')]);
  });
});
