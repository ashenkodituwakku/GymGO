import { describe, expect, it } from 'vitest';
import { appleGaps, listingOf, readAppleResults, readWeeklyHours, withAppleListing } from './appleMaps';
import type { GymRecord } from './types';

// The shape SerpApi documents for engine=apple_maps, with an invented gym (no real venue's facts).
const answer = {
  local_results: [
    {
      position: 1,
      muid: '1234567890123456789',
      title: 'Example Strength Club',
      link: 'https://maps.apple.com/place?auid=1234567890123456789',
      gps_coordinates: { latitude: -37.8101, longitude: 144.9601 },
      phone: '+61390000000',
      phone_formatted: '(03) 9000 0000',
      website: 'example-strength.test',
      type: 'Gym',
      weekly_hours: {
        monday: ['05:00 - 22:00'],
        tuesday: ['05:00 - 22:00'],
        wednesday: ['05:00 - 22:00'],
        thursday: ['05:00 - 22:00'],
        friday: ['05:00 - 21:00'],
        saturday: ['7:00 AM - 1:00 PM', '3:00 PM - 6:00 PM'],
        sunday: ['Closed'],
      },
      rating: 92,
      reviews: 120,
    },
    { position: 2, muid: '9', title: 'No position here' },
  ],
};

const record = (over: Partial<GymRecord['location']> = {}, schedules: GymRecord['schedules'] = []): GymRecord =>
  ({
    location: {
      id: 'g1',
      name: 'Example Strength Club',
      timezone: 'Australia/Melbourne',
      phone: null,
      website: null,
      externalRefs: { openStreetMap: 'node/1' },
      provenance: { status: 'community_reported', sources: [{ id: 'ev-osm', sourceType: 'licensed_dataset', evidenceRef: null, label: 'OpenStreetMap', observedAt: '2026-10-01T00:00:00Z', checkedAt: '2026-10-01T00:00:00Z', reviewerId: null }], conflictNote: null },
      ...over,
    },
    schedules,
    equipment: [],
    amenities: [],
    offers: [],
  }) as unknown as GymRecord;

describe('Apple Maps listings', () => {
  it('reads SerpApi’s answer: phone, website and hours, leaving out a place it can’t place', () => {
    const results = readAppleResults(answer, '2026-11-03T10:00:00Z');
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ muid: '1234567890123456789', title: 'Example Strength Club', phone: '(03) 9000 0000', website: 'https://example-strength.test/', lat: -37.8101, type: 'Gym', checkedAt: '2026-11-03T10:00:00Z' });
    expect(results[0]!.hours).toEqual([
      [1, 300, 1320],
      [2, 300, 1320],
      [3, 300, 1320],
      [4, 300, 1320],
      [5, 300, 1260],
      [6, 420, 780],
      [6, 900, 1080],
    ]);
    // Rating and reviews aren't taken.
    expect(Object.keys(listingOf(results[0]!))).not.toContain('rating');
    expect(readAppleResults({ error: 'Invalid API key.' }, '')).toEqual([]);
  });

  it('reads hours past midnight and round the clock, and leaves out hours it can’t read', () => {
    expect(readWeeklyHours({ friday: ['20:00 - 02:00'] })).toEqual([[5, 1200, 1560]]);
    const always = Object.fromEntries(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((day) => [day, ['Open 24 hours']]));
    expect(readWeeklyHours(always)).toBe('always');
    expect(readWeeklyHours({ monday: ['Sunrise to sunset'] })).toBeNull();
    expect(readWeeklyHours({ funday: ['05:00 - 22:00'] })).toBeNull();
    expect(readWeeklyHours({ sunday: ['Closed'] })).toBeNull();
    expect(readWeeklyHours(null)).toBeNull();
  });

  it('fills only what the record lacks, citing the listing', () => {
    const listing = listingOf(readAppleResults(answer, '2026-11-03T10:00:00Z')[0]!);
    const filled = withAppleListing(record(), listing);
    expect(filled.location.phone).toBe('(03) 9000 0000');
    expect(filled.location.website).toBe('https://example-strength.test/');
    expect(filled.location.externalRefs).toEqual({ openStreetMap: 'node/1', appleMaps: '1234567890123456789' });
    const source = filled.location.provenance.sources.at(-1)!;
    expect(source).toMatchObject({ label: 'Apple Maps listing, via SerpApi (phone, website, opening hours)', evidenceRef: 'https://maps.apple.com/place?auid=1234567890123456789', checkedAt: '2026-11-03T10:00:00Z' });
    // OpenStreetMap is still cited for what it gave.
    expect(filled.location.provenance.sources[0]!.label).toBe('OpenStreetMap');
    const member = filled.schedules.find((schedule) => schedule.audience === 'member')!;
    expect(member.windows).toHaveLength(7);
    expect(member.provenance.sources[0]!.label).toContain('Apple Maps listing');
    expect(filled.schedules.some((schedule) => schedule.audience === 'visitor' || schedule.audience === 'staffed')).toBe(false);
  });

  it('never overwrites what GymGO holds, and changes nothing with nothing to add', () => {
    const listing = listingOf(readAppleResults(answer, '2026-11-03T10:00:00Z')[0]!);
    const hours = [{ id: 'm', gymId: 'g1', audience: 'member' as const, timezone: 'Australia/Melbourne', windows: [{ day: 1, openMinute: 360, closeMinute: 1200 }], exceptions: [], alwaysOpen: false, provenance: { status: 'community_reported' as const, sources: [], conflictNote: null } }];
    const full = record({ phone: '03 1111 1111', website: 'https://ours.test/' }, hours);
    expect(withAppleListing(full, listing)).toBe(full);
    const partial = withAppleListing(record({ phone: '03 1111 1111' }, hours), listing);
    expect(partial.location.phone).toBe('03 1111 1111');
    expect(partial.location.website).toBe('https://example-strength.test/');
    expect(partial.location.provenance.sources.at(-1)!.label).toBe('Apple Maps listing, via SerpApi (website)');
    expect(partial.schedules).toEqual(hours);
    expect(appleGaps(full)).toEqual({ phone: false, website: false, hours: false });
  });
});
