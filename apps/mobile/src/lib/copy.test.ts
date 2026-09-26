import { describe, expect, it } from 'vitest';
import { accessLine, accessShort, checkedAgo, filtersButtonLabel, gymDistanceLine, locatedNotice, lookupLine, noGymsLine, serverOfflineLine, statusSummaryLine, ratingShort, searchPrompt, sessionGreeting, summaryLine, timeLabel, TIER } from './copy';
import { activeFilterCount, applyRelaxation, atPlace, defaultVisit, initialFilters, runSearch, toQuery } from './query';
import { geocodePlace } from './places';

const SURRY_HILLS = atPlace(geocodePlace('Surry Hills').place!);
import { checkTimeZoneSupport } from './selfcheck';

describe('voice', () => {
  it('formats times the way people say them', () => {
    expect(timeLabel(19 * 60)).toBe('7\u00a0pm');
    expect(timeLabel(6 * 60 + 30)).toBe('6:30\u00a0am');
    expect(timeLabel(12 * 60)).toBe('12\u00a0pm');
    expect(timeLabel(0)).toBe('12\u00a0am');
  });

  it('greets by the planned session time, covering every hour', () => {
    expect(sessionGreeting(6 * 60)).toBe('Early one?');
    expect(sessionGreeting(12 * 60 + 30)).toBe('Lunch-break pump?');
    expect(sessionGreeting(18 * 60)).toBe('After-work session?');
    expect(sessionGreeting(21 * 60)).toBe('Late one?');
    for (let minute = 0; minute < 24 * 60; minute += 30) expect(sessionGreeting(minute).length).toBeGreaterThan(0);
  });

  it('gives every tier a label and a line', () => {
    for (const tier of ['confirmed', 'needs_confirmation', 'ruled_out'] as const) {
      expect(TIER[tier].label.length).toBeGreaterThan(0);
      expect(TIER[tier].line.length).toBeGreaterThan(0);
    }
  });

  it('never tells someone they can get in when the rules say they cannot', () => {
    expect(accessLine('not_admitted', 19 * 60)).toBe('No guests at 7\u00a0pm');
    expect(accessShort('not_admitted')).not.toMatch(/welcome/i);
    expect(accessLine('needs_confirmation', 19 * 60)).not.toMatch(/welcome/i);
    expect(accessLine('unknown', 19 * 60)).not.toMatch(/welcome/i);
  });

  it('only says welcome when the rules admit the visitor', () => {
    expect(accessLine('admits_visitor', 19 * 60)).toBe('Guests welcome at 7\u00a0pm');
    expect(accessShort('admits_visitor')).toBe('Welcome');
  });

  it('shows "New" rather than zero stars for a gym with no reviews', () => {
    expect(ratingShort(null)).toBe('New');
    expect(ratingShort(4)).toBe('★ 4.0');
  });

  it('does not claim a sure thing when nothing is confirmed', () => {
    expect(summaryLine(9, 0, 19 * 60)).toBe('9 gyms nearby · none a sure thing at 7\u00a0pm');
    expect(summaryLine(9, 3, 19 * 60)).toBe('9 gyms nearby · 3 good to go at 7\u00a0pm');
    expect(summaryLine(1, 1, 7 * 60)).toBe('1 gym nearby · 1 good to go at 7\u00a0am');
    expect(summaryLine(9, 0, 7 * 60, true)).toBe('9 gyms nearby · none a sure thing tomorrow at 7\u00a0am');
  });

  it('says what members reported about a gym being there, without "0 members"', () => {
    expect(statusSummaryLine(0, 0)).toBe('The map can be out of date, and no member has said yet.');
    expect(statusSummaryLine(0, 1)).toBe('In the last six months, 1 member said it’s still open.');
    expect(statusSummaryLine(2, 0)).toBe('In the last six months, 2 members said it has closed.');
    expect(statusSummaryLine(1, 3)).toBe('In the last six months, 1 member said it has closed and 3 said it’s still open.');
  });

  it('says where to start the server, without naming a command that may not exist', () => {
    expect(serverOfflineLine('web')).toContain('on this computer');
    expect(serverOfflineLine('ios')).toContain('same Wi-Fi');
    expect(serverOfflineLine('android')).not.toContain('gymgo command');
  });

  it("counts only gyms that could work on the Filters button, and says how sure", () => {
    expect(filtersButtonLabel({ confirmed: 0, needs_confirmation: 0 })).toBe('No gyms — loosen something');
    expect(filtersButtonLabel({ confirmed: 0, needs_confirmation: 40 })).toBe('Show 40 gyms · none a sure thing');
    expect(filtersButtonLabel({ confirmed: 3, needs_confirmation: 5 })).toBe('Show 8 gyms · 3 good to go');
    expect(filtersButtonLabel({ confirmed: 1, needs_confirmation: 0 })).toBe('Show 1 gym');
  });

  it('describes evidence age honestly', () => {
    expect(checkedAgo(null)).toBe('Never checked');
    expect(checkedAgo(0)).toBe('Checked today');
    expect(checkedAgo(9)).toBe('Checked 9 days ago');
    expect(checkedAgo(140)).toBe('Checked 5 months ago');
  });
});

describe('query', () => {
  const NOW = new Date('2026-09-22T05:20:00.000Z'); // 3:20 pm in Sydney

  it('defaults the visit to the next whole hour', () => {
    expect(defaultVisit(NOW)).toEqual({ date: '2026-09-22', minute: 16 * 60 });
  });

  it('rolls late-night opens to tomorrow morning, never a time already past', () => {
    // 11:40 pm Sydney on the 22nd → 7 am on the 23rd.
    expect(defaultVisit(new Date('2026-09-22T13:40:00.000Z'))).toEqual({ date: '2026-09-23', minute: 7 * 60 });
  });

  it('uses this morning for opens in the small hours', () => {
    // 3 am Sydney on the 22nd → 7 am the same day.
    expect(defaultVisit(new Date('2026-09-21T17:00:00.000Z'))).toEqual({ date: '2026-09-22', minute: 7 * 60 });
  });

  it('carries the dumbbell weight onto the dumbbell requirement only', () => {
    const query = toQuery({
      ...initialFilters(NOW),
      equipment: ['squat_rack', 'dumbbells'],
      dumbbellMinKg: 40,
    });
    expect(query.requiredEquipment).toEqual([
      { equipmentTypeId: 'squat_rack', minMaxWeightKg: null },
      { equipmentTypeId: 'dumbbells', minMaxWeightKg: 40 },
    ]);
  });

  it('runs the same search the website runs, on the device', () => {
    const outcome = runSearch(
      {
        ...initialFilters(NOW),
        ...SURRY_HILLS,
        visitDate: '2026-09-23',
        visitMinuteOfDay: 19 * 60,
        budgetMinor: 3000,
        equipment: ['squat_rack', 'cable_station', 'dumbbells'],
        dumbbellMinKg: 40,
      },
      {},
      new Date('2026-09-22T00:00:00.000Z'),
    );
    // The reference task: the same three confirmed matches the web shows.
    expect(outcome.counts.confirmed).toBe(3);
    expect(outcome.results[0]?.record.location.name).toBe('Ironbark Strength Co.');
  });

  it('turns a suggested relaxation into a filter change only when applied', () => {
    const filters = {
      ...initialFilters(NOW),
      budgetMinor: 3000,
      equipment: ['squat_rack', 'dumbbells'],
      dumbbellMinKg: 40,
    };

    const dropped = applyRelaxation(filters, {
      requiredEquipment: [{ equipmentTypeId: 'dumbbells', minMaxWeightKg: 40 }],
    });
    expect(dropped.equipment).toEqual(['dumbbells']);
    expect(dropped.dumbbellMinKg).toBe(40);

    expect(applyRelaxation(filters, { budgetMinor: null }).budgetMinor).toBeNull();
    expect(applyRelaxation(filters, { visitMinuteOfDay: 14 * 60 }).visitMinuteOfDay).toBe(14 * 60);
    // The original filters are untouched: nothing relaxes behind anyone's back.
    expect(filters.budgetMinor).toBe(3000);
    expect(filters.equipment).toEqual(['squat_rack', 'dumbbells']);
  });

  it('counts active filters for the badge', () => {
    const filters = initialFilters(NOW);
    expect(activeFilterCount(filters)).toBe(0);
    expect(activeFilterCount({ ...filters, equipment: ['bench'], budgetMinor: 3000 })).toBe(2);
  });
});

describe('startup self-check', () => {
  it('passes where full time-zone support exists', () => {
    expect(checkTimeZoneSupport()).toEqual({ ok: true, detail: 'Time-zone support verified.' });
  });
});

describe('what finding you says', () => {
  it('outside the cities GymGO carries, says the gyms came from the map', () => {
    const area = { kind: 'area' as const, fix: { approximate: false }, countryCode: 'DE' };
    expect(locatedNotice({ ...area, gyms: 6, radiusKm: 5 })).toMatch(/OpenStreetMap: map-only, so call before you go\.$/);
    expect(locatedNotice({ ...area, gyms: 2, radiusKm: 10 })).toMatch(/^Nothing's mapped within 5 km of you, so this shows the 2 gyms within 10 km/);
    expect(locatedNotice({ ...area, gyms: 0, radiusKm: 5 })).toMatch(/no gyms mapped close to you yet/);
  });

  it('says how far in miles in the US and UK', () => {
    expect(locatedNotice({ kind: 'area', fix: { approximate: false }, countryCode: 'GB', gyms: 2, radiusKm: 10 })).toMatch(/^Nothing's mapped within 3 mi of you, so this shows the 2 gyms within 6 mi/);
  });

  it('when you say no, suggests typing a place in the words used at home', () => {
    expect(locatedNotice({ kind: 'denied' }, 'US')).toBe('No worries — search a city or ZIP code instead.');
    expect(locatedNotice({ kind: 'denied' }, 'AU')).toBe('No worries — search a suburb or city instead.');
    expect(locatedNotice({ kind: 'unavailable' }, 'DE')).toBe("Couldn't get a fix on where you are. Search a town or city instead.");
  });

  it('when the map around you can’t be searched, says why it shows the nearest built-in city', () => {
    expect(locatedNotice({ kind: 'nearest', km: 2155.6, city: { name: 'Sydney', country: 'AU' } })).toBe(
      "Couldn't search the map around you just now, so here's Sydney, the nearest city GymGO has built in (2,156\u00a0km away).",
    );
  });

  it('in a city it carries, says nothing unless the fix is rough', () => {
    expect(locatedNotice({ kind: 'here', fix: { approximate: false } })).toBeNull();
  });
});

describe('the search box', () => {
  it('asks for places the way people there name them', () => {
    expect(searchPrompt('US')).toBe('Search a city, ZIP code or gym');
    expect(searchPrompt('AU')).toBe('Search a suburb, city or gym');
    expect(searchPrompt('FR')).toBe('Search a town, city or gym');
    expect(searchPrompt(null)).toBe('Search a town, city or gym');
  });
});

describe('when there are no gyms to show', () => {
  it('says the map is being read, could not be, or has nothing there', () => {
    expect(lookupLine('searching', 'Tokyo')).toBe('Looking for gyms around Tokyo on OpenStreetMap…');
    expect(lookupLine('failed', 'Lima')).toMatch(/^Couldn’t read the map around Lima/);
    expect(lookupLine('none', 'Nuuk')).toMatch(/^OpenStreetMap has no gyms mapped around Nuuk yet/);
  });

  it('never blames the filters when nothing is in range, in the local unit', () => {
    expect(noGymsLine('Fitzroy', 5, 'AU')).toBe('No gyms mapped within 5\u00a0km of Fitzroy yet. Open the map to look further out.');
    expect(noGymsLine('your location', 5 * 1.609344, 'US')).toBe('No gyms mapped within 5\u00a0mi of you yet. Open the map to look further out.');
    expect(noGymsLine('this area', 5, 'GB')).toBe('OpenStreetMap has no gyms mapped in this area yet.');
  });

  it('says where a far-off gym is measured from, on its own page', () => {
    expect(gymDistanceLine(1.1, 'AU', 'Melbourne')).toBe('1.1\u00a0km');
    expect(gymDistanceLine(654, 'AU', 'Melbourne')).toBe('654\u00a0km from Melbourne');
    expect(gymDistanceLine(8153, 'JP', 'your location')).toBe('8,153\u00a0km from you');
    expect(gymDistanceLine(16672, 'US', 'New York')).toBe('10,360\u00a0mi from New York');
    expect(gymDistanceLine(3, 'AU', 'this area')).toBe('3.0\u00a0km');
    expect(gymDistanceLine(654, 'AU', 'this area')).toBeNull();
  });
});
