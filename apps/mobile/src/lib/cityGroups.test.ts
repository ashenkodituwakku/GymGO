import { describe, expect, it } from 'vitest';
import { cityGroups, type BrowseCity } from './cityGroups';

const city = (name: string, country: string, timezone: string): BrowseCity => ({ name, country, timezone, centre: { lat: 0, lng: 0 } });

const OTHERS = [
  city('New York', 'US', 'America/New_York'),
  city('Honolulu', 'US', 'Pacific/Honolulu'),
  city('Anchorage', 'US', 'America/Anchorage'),
  city('Sydney', 'AU', 'Australia/Sydney'),
  city('London', 'GB', 'Europe/London'),
  city('Berlin', 'DE', 'Europe/Berlin'),
  city('Paris', 'FR', 'Europe/Paris'),
  city('Munich', 'DE', 'Europe/Berlin'),
  city('Toronto', 'CA', 'America/Toronto'),
  city('Auckland', 'NZ', 'Pacific/Auckland'),
];

const names = (cities: BrowseCity[]) => cities.map((item) => item.name);

describe('the cities on Home', () => {
  it('lists each city once, a US city with the United States wherever its clock is', () => {
    const groups = cityGroups(null, [], OTHERS);
    expect(groups.map((group) => group.label)).toEqual(['United States', 'Australia', 'Europe', 'The Americas', 'New Zealand and the Pacific']);
    expect(names(groups[0]!.cities)).toEqual(['New York', 'Honolulu', 'Anchorage']);
    expect(names(groups.at(-1)!.cities)).toEqual(['Auckland']);
    expect(groups.flatMap((group) => names(group.cities)).sort()).toEqual(names(OTHERS).sort());
  });

  it("keeps a country's cities together, the countries in the order of their first city", () => {
    const europe = cityGroups(null, [], OTHERS).find((group) => group.label === 'Europe')!;
    expect(names(europe.cities)).toEqual(['London', 'Berlin', 'Munich', 'Paris']);
  });

  it('puts your country first, under its name and flag, and not again below', () => {
    const groups = cityGroups('US', [OTHERS[0]!, OTHERS[1]!], OTHERS);
    expect(groups[0]).toMatchObject({ label: 'United States', flag: 'US' });
    expect(groups.filter((group) => group.flag === 'US')).toHaveLength(1);
    expect(groups.find((group) => group.label === 'Europe')).toMatchObject({ emoji: '🌍' });
  });
});
