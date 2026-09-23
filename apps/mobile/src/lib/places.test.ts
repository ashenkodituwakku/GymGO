import { describe, expect, it } from 'vitest';
import { CITIES, DEFAULT_PLACE, cityNear, geocodePlace, suggestPlaces } from './places';
import { BUNDLED_GYMS, atPlace, initialFilters, runSearch } from './query';

describe('places', () => {
  it('opens on Melbourne, where the real gyms are', () => {
    expect(DEFAULT_PLACE.name).toBe('Melbourne CBD');
    expect(initialFilters(new Date('2026-09-23T05:00:00Z')).timezone).toBe('Australia/Melbourne');
  });

  it('finds Melbourne suburbs by name or postcode, and the Sydney demo by its suburbs', () => {
    expect(geocodePlace('fitzroy').place?.city).toBe('melbourne');
    expect(geocodePlace('3056').place?.name).toBe('Brunswick');
    expect(geocodePlace('Surry Hills').place?.city).toBe('sydney');
    expect(geocodePlace('Perth')).toEqual({ place: null, outOfArea: true });
    expect(suggestPlaces('brun').map((place) => place.name)).toEqual(['Brunswick', 'Brunswick East']);
  });

  it('knows which city a point is in, and when it is in neither', () => {
    expect(cityNear({ lat: -37.8, lng: 144.97 })?.id).toBe('melbourne');
    expect(cityNear({ lat: -33.88, lng: 151.2 })?.id).toBe('sydney');
    expect(cityNear({ lat: -31.95, lng: 115.86 })).toBeNull();
    expect(CITIES.sydney.demo).toBe(true);
    expect(CITIES.melbourne.demo).toBe(false);
  });

  it('shows real gyms around Melbourne and demo gyms only around Sydney', () => {
    const asOf = new Date('2026-09-23T05:00:00Z');
    const melbourne = runSearch({ ...initialFilters(asOf), radiusKm: 10 }, { records: BUNDLED_GYMS }, asOf);
    expect(melbourne.results.length).toBeGreaterThan(15);
    expect(melbourne.results.every((result) => !result.record.location.isDemoData)).toBe(true);

    const sydney = runSearch({ ...initialFilters(asOf), ...atPlace(geocodePlace('Surry Hills').place!) }, {}, asOf);
    expect(sydney.results.every((result) => result.record.location.isDemoData)).toBe(true);
  });
});
