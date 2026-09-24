import { describe, expect, it } from 'vitest';
import { haversineKm } from '@gymgo/domain';
import { CITIES, CITY_LIST, DEFAULT_PLACE, activeCities, cityAt, cityNear, distanceLabel, geocodePlace, homePlace, moneyLabel, nearestCity, placeContext, radiusChoices, setDemoMode, suggestPlaces } from './places';
import { BUNDLED_GYMS, atPlace, initialFilters, moveTo, runSearch } from './query';

describe('places', () => {
  it('opens on Melbourne, where the real gyms are', () => {
    expect(DEFAULT_PLACE.name).toBe('Melbourne CBD');
    expect(initialFilters(new Date('2026-09-23T05:00:00Z')).timezone).toBe('Australia/Melbourne');
  });

  it('finds Melbourne suburbs by name or postcode, and real Sydney by its suburbs', () => {
    expect(geocodePlace('fitzroy').place?.city).toBe('melbourne');
    expect(geocodePlace('3056').place?.name).toBe('Brunswick');
    expect(geocodePlace('Surry Hills').place?.city).toBe('sydney');
    expect(CITIES.sydney.demo).toBe(false);
    expect(geocodePlace('Darwin')).toEqual({ place: null, outOfArea: true });
    expect(geocodePlace('Timbuktu')).toEqual({ place: null, outOfArea: true });
    expect(suggestPlaces('brun').map((place) => place.name)).toEqual(['Brunswick', 'Brunswick East']);
  });

  it('knows which city a point is in, and when it is in neither', () => {
    expect(cityNear({ lat: -37.8, lng: 144.97 })?.id).toBe('melbourne');
    expect(cityNear({ lat: -33.88, lng: 151.2 })?.id).toBe('sydney');
    expect(cityNear({ lat: -12.46, lng: 130.84 })).toBeNull(); // Darwin
    expect(CITIES['sydney-demo'].demo).toBe(true);
    expect(CITIES.melbourne.demo).toBe(false);
  });

  it('shows only real gyms around Melbourne', () => {
    const asOf = new Date('2026-09-23T05:00:00Z');
    const melbourne = runSearch({ ...initialFilters(asOf), radiusKm: 10 }, { records: BUNDLED_GYMS }, asOf);
    expect(melbourne.results.length).toBeGreaterThan(15);
    expect(melbourne.results.every((result) => !result.record.location.isDemoData)).toBe(true);
  });

  it('keeps the invented demo apart from real Sydney: demo mode shows only the demo', () => {
    // Why the mode exists: the demo gyms sit among real Sydney ones.
    const demo = BUNDLED_GYMS.filter((record) => record.location.isDemoData);
    const realSydney = BUNDLED_GYMS.filter((record) => !record.location.isDemoData && record.location.address.state === 'NSW');
    expect(realSydney.length).toBeGreaterThan(20);
    expect(realSydney.some((real) => demo.some((fake) => haversineKm(real.location.position, fake.location.position) < 1))).toBe(true);

    // Off (the default): no demo city or suburb to be found.
    expect(activeCities().some((city) => city.demo)).toBe(false);
    expect(homePlace()).toBe(DEFAULT_PLACE);
    try {
      setDemoMode(true);
      expect(activeCities().map((city) => city.id)).toEqual(['sydney-demo']);
      expect(homePlace().city).toBe('sydney-demo');
      expect(geocodePlace('Surry Hills').place?.city).toBe('sydney-demo');
      expect(cityAt({ lat: -33.88, lng: 151.2 }).id).toBe('sydney-demo');
      // Nothing real is searchable in demo mode.
      expect(geocodePlace('Fitzroy')).toEqual({ place: null, outOfArea: true });
      expect(suggestPlaces('new york')).toEqual([]);
    } finally {
      setDemoMode(false);
    }
    expect(geocodePlace('Surry Hills').place?.city).toBe('sydney');
  });

  it('finds US cities by name or nickname', () => {
    expect(geocodePlace('New York').place?.city).toBe('new-york');
    expect(geocodePlace('nyc').place?.city).toBe('new-york');
    expect(geocodePlace('Philly').place?.city).toBe('philadelphia');
    expect(geocodePlace('DC').place?.city).toBe('washington-dc');
    expect(geocodePlace('san fran').place?.city).toBe('san-francisco');
    expect(suggestPlaces('chi')[0]?.city).toBe('chicago');
  });

  it('tells same-named neighborhoods apart by city', () => {
    expect(geocodePlace('Capitol Hill, Seattle').place?.city).toBe('seattle');
    expect(geocodePlace('capitol hill denver').place?.city).toBe('denver');
    // Without a city, the one where you're already searching wins.
    expect(geocodePlace('Chinatown', 'boston').place?.city).toBe('boston');
    expect(geocodePlace('Chinatown', 'washington-dc').place?.city).toBe('washington-dc');
    expect(suggestPlaces('capitol hill', 6, 'denver')[0]?.city).toBe('denver');
  });

  it('knows seven more Australian cities from the map, on their own clocks', () => {
    expect(cityNear({ lat: -27.47, lng: 153.03 })?.id).toBe('brisbane');
    expect(cityNear({ lat: -31.95, lng: 115.86 })?.id).toBe('perth');
    expect(cityAt({ lat: -42.88, lng: 147.33 }).id).toBe('hobart');
    expect(CITIES.perth.timezone).toBe('Australia/Perth');
    expect(CITIES.adelaide.timezone).toBe('Australia/Adelaide');
    expect(CITIES['gold-coast'].timezone).toBe('Australia/Brisbane');
    expect(CITIES.brisbane).toMatchObject({ country: 'AU', mapOnly: true, demo: false, region: 'QLD' });
    // Suburbs from the map, with their city named since they have no postcode.
    const valley = geocodePlace('Fortitude Valley').place!;
    expect(valley.city).toBe('brisbane');
    expect(placeContext(valley)).toBe('Brisbane, QLD');
    expect(geocodePlace('Subiaco').place?.city).toBe('perth');
    expect(geocodePlace('Brissy').place?.city).toBe('brisbane');
    // Real Paddington (Brisbane), never the demo's while demo mode is off.
    expect(geocodePlace('Paddington').place?.city).toBe('brisbane');
    // Melbourne still first, the demo still last.
    expect(CITY_LIST[0]!.id).toBe('melbourne');
    expect(CITY_LIST.at(-1)!.id).toBe('sydney-demo');
  });

  it('knows the US cities, their clocks, and how far out they reach', () => {
    expect(cityNear({ lat: 40.73, lng: -73.99 })?.id).toBe('new-york');
    expect(cityNear({ lat: 34.05, lng: -118.25 })?.id).toBe('los-angeles');
    expect(CITIES['new-york'].timezone).toBe('America/New_York');
    expect(CITIES.chicago.timezone).toBe('America/Chicago');
    expect(CITIES.denver.timezone).toBe('America/Denver');
    expect(CITIES.seattle.timezone).toBe('America/Los_Angeles');
    expect(CITIES['new-york'].mapOnly).toBe(true);
    // Toronto isn't covered; the nearest city that is, is Philadelphia (~530 km).
    expect(cityNear({ lat: 43.65, lng: -79.38 })).toBeNull();
    expect(nearestCity({ lat: 43.65, lng: -79.38 }).city.id).toBe('philadelphia');
    // Townsville isn't covered; the nearest city that is, is Brisbane, never the Sydney demo.
    expect(cityNear({ lat: -19.26, lng: 146.82 })).toBeNull();
    expect(nearestCity({ lat: -19.26, lng: 146.82 }).city.id).toBe('brisbane');
    expect(cityAt({ lat: 47.61, lng: -122.33 }).id).toBe('seattle');
  });

  it('speaks miles and dollars in the US, kilometres and A$ in Australia', () => {
    expect(distanceLabel(0.35, 'AU')).toBe('350 m');
    expect(distanceLabel(2.44, 'AU')).toBe('2.4 km');
    expect(distanceLabel(1.609344, 'US')).toBe('1.0 mi');
    expect(distanceLabel(40, 'US')).toBe('25 mi');
    expect(moneyLabel(2500, 'AU')).toBe('A$25');
    expect(moneyLabel(2500, 'US')).toBe('$25');
    expect(moneyLabel(1250, 'US')).toBe('$12.50');
    expect(radiusChoices('US').map((choice) => choice.label)).toEqual(['1 mi', '2 mi', '3 mi', '5 mi', '10 mi']);
  });

  it('shows real, map-only gyms in New York, on New York time, with nothing invented', () => {
    const asOf = new Date('2026-09-24T14:00:00Z');
    const filters = moveTo(initialFilters(asOf), atPlace(geocodePlace('New York').place!), asOf);
    expect(filters.timezone).toBe('America/New_York');
    const outcome = runSearch({ ...filters, radiusKm: 5 }, { records: BUNDLED_GYMS }, asOf);
    expect(outcome.results.length).toBeGreaterThan(20);
    for (const result of outcome.results) {
      expect(result.record.location.isDemoData).toBe(false);
      expect(result.record.location.address.countryCode).toBe('US');
      expect(result.record.offers).toEqual([]);
      // No guest hours or price: never a sure thing.
      expect(result.tier).not.toBe('confirmed');
    }
  });
});
