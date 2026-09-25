import { candidate, contactOf, extrasOf, pyJson } from './fields';
import { mapOnlyRecord } from './record';
import { keep, parseHours, slug, trainingType } from './rules';

describe('what counts as a gym', () => {
  it('keeps ordinary gyms and chains', () => {
    expect(keep('Anytime Fitness', {})).toBe(true);
    expect(keep('Iron Temple Strength', { sport: 'weightlifting' })).toBe(true);
  });

  it('drops what the map says is private', () => {
    expect(keep('Anytime Fitness', { access: 'private' })).toBe(false);
    expect(keep('Anytime Fitness', { access: 'members' })).toBe(false);
  });

  it('drops studios GymGO is not for, by name or by sport', () => {
    expect(keep('Hot Yoga Collective', {})).toBe(false);
    expect(keep('Northside Studio', { sport: 'yoga;pilates' })).toBe(false);
    expect(keep('Muay Thai Academy', {})).toBe(false);
    expect(keep("Max's Junior Boxing", {})).toBe(false);
    expect(keep('Youth Fitness Club', {})).toBe(false);
  });

  it('drops gyms inside hotels, homes and campuses, and generic rooms', () => {
    expect(keep('Hilton Fitness Centre', {})).toBe(false);
    expect(keep('Residents Gym', {})).toBe(false);
    expect(keep('Fitness Center', {})).toBe(false);
    expect(keep('The Gym', {})).toBe(false);
    expect(keep('Pulse Fitness', { building: 'apartments' })).toBe(false);
  });

  it('keeps a gym whose sports include something beyond the excluded ones', () => {
    expect(keep('Northside', { sport: 'yoga;fitness' })).toBe(true);
  });
});

describe('training type', () => {
  it('reads chains, CrossFit, studios, pools and strength gyms', () => {
    expect(trainingType('Planet Fitness', {})).toBe('full_gym');
    expect(trainingType('CrossFit Fitzroy', {})).toBe('crossfit_box');
    expect(trainingType('F45 Training Carlton', {})).toBe('studio');
    expect(trainingType('Boxing Room', {})).toBe('studio');
    expect(trainingType('City Baths', { sport: 'swimming' })).toBe('aquatic_centre');
    expect(trainingType('Barbell Club', { sport: 'powerlifting;weightlifting' })).toBe('strength_focused');
    expect(trainingType('Unknown Name', {})).toBe('full_gym');
  });

  it('lets a chain brand win over a studio-sounding name', () => {
    expect(trainingType('Jetts Boxing Hub', {})).toBe('full_gym');
  });
});

describe('opening hours', () => {
  it('reads round the clock', () => {
    expect(parseHours('24/7')).toBe('always');
    expect(parseHours('Mo-Su 00:00-24:00')).toBe('always');
  });

  it('reads the simple weekly form, Sunday as day 0', () => {
    expect(parseHours('Mo-Fr 06:00-21:00; Sa 08:00-17:00')).toEqual([
      [1, 360, 1260],
      [2, 360, 1260],
      [3, 360, 1260],
      [4, 360, 1260],
      [5, 360, 1260],
      [6, 480, 1020],
    ]);
  });

  it('treats a comma before a day as a new rule', () => {
    expect(parseHours('Mo-Fr 06:00-21:00, Su 09:00-12:00')).toContainEqual([0, 540, 720]);
  });

  it('carries late closes past midnight, and 23:59 as midnight', () => {
    expect(parseHours('Fr 18:00-02:00')).toEqual([[5, 1080, 1560]]);
    expect(parseHours('Sa 06:00-23:59')).toEqual([[6, 360, 1440]]);
  });

  it('wraps a day range through the weekend', () => {
    const hours = parseHours('Sa-Mo 08:00-12:00');
    expect(Array.isArray(hours) && hours.map(([day]) => day)).toEqual([0, 1, 6]);
  });

  it('reads a list of days, not a new rule, in "Sa,Su"', () => {
    expect(parseHours('Mo-Fr 05:00-21:00; Sa,Su 07:00-19:00')).toEqual([
      [0, 420, 1140],
      [1, 300, 1260],
      [2, 300, 1260],
      [3, 300, 1260],
      [4, 300, 1260],
      [5, 300, 1260],
      [6, 420, 1140],
    ]);
    expect(parseHours('Mo-Tu,Th 06:00-20:30')!.length).toBe(3);
  });

  it('adds a rule after a comma rather than replacing, as the format says', () => {
    // Monday is open in the morning and the evening.
    const hours = parseHours('Mo,We,Fr 07:00-11:00, Mo-Th 16:00-20:00, Sa 08:00-12:00');
    expect(Array.isArray(hours) && hours.filter(([day]) => day === 1)).toEqual([
      [1, 420, 660],
      [1, 960, 1200],
    ]);
  });

  it('leaves public holidays out of day lists and rules', () => {
    expect(parseHours('Mo-Su,PH 05:00-23:00')!.length).toBe(7);
    const sundayOff = parseHours('Mo-Th 10:00-14:00,15:00-19:00; Fr-Sa 09:00-12:00; Su, PH off');
    expect(Array.isArray(sundayOff) && sundayOff.some(([day]) => day === 0)).toBe(false);
    expect(Array.isArray(sundayOff) && sundayOff.length).toBe(10);
    expect(parseHours('Mo-Fr 06:00-20:00; PH 09:00-12:00')!.length).toBe(5);
  });

  it('ignores public-holiday closures but keeps the rest', () => {
    expect(parseHours('Mo 06:00-10:00; PH off')).toEqual([[1, 360, 600]]);
  });

  it('leaves anything else unknown rather than guess', () => {
    expect(parseHours('sunrise-sunset')).toBeNull();
    expect(parseHours('Mo-Fr 06:00-21:00 "by appointment"')).toBeNull();
    expect(parseHours('Mo off')).toBeNull();
  });
});

describe('reading an element', () => {
  it('needs a name, a position and a pass from the rules', () => {
    expect(candidate({ type: 'node', id: 1, lat: -37.8, lon: 144.9, tags: { name: ' Snap Fitness ' } })?.name).toBe('Snap Fitness');
    expect(candidate({ type: 'way', id: 2, center: { lat: -37.8, lon: 144.9 }, tags: { name: 'Snap Fitness' } })?.pos).toEqual([-37.8, 144.9]);
    expect(candidate({ type: 'way', id: 3, tags: { name: 'Snap Fitness' } })).toBeNull();
    expect(candidate({ type: 'node', id: 4, lat: 0, lon: 0, tags: {} })).toBeNull();
  });

  it('keeps only well-formed contact details, first of a list', () => {
    expect(contactOf({ phone: '+61 3 9000 0000;+61 3 9000 0001', website: 'www.example.com', email: 'not an email' })).toEqual({
      phone: '+61 3 9000 0000',
    });
  });

  it('flags hours that are mapped but unreadable', () => {
    expect(extrasOf({ opening_hours: 'by appointment' }).hoursUnreadable).toBe(true);
    expect(extrasOf({ sport: 'swimming;fitness', sauna: 'yes' })).toEqual({ hoursUnreadable: false, activities: ['Swimming'], amenities: { pool: 'yes', sauna: 'yes' } });
  });
});

describe('a map-only record', () => {
  const record = mapOnlyRecord(
    { id: 'snap-fitness-n1', osm: 'node/1', name: 'Snap Fitness', line1: '', locality: 'Bendigo', state: 'VIC', postcode: '', lat: -36.75, lng: 144.28, type: 'full_gym', hours: 'always' },
    { countryCode: 'AU', timezone: 'Australia/Melbourne', fetchedAt: '2026-09-25T00:00:00Z' },
  );

  it('is community-reported and never called trading on the map alone', () => {
    expect(record.location.provenance.status).toBe('community_reported');
    expect(record.location.operatingStatus).toBe('unknown');
    expect(record.location.provenance.sources[0]!.evidenceRef).toBe('https://www.openstreetmap.org/node/1');
  });

  it('has no prices, equipment or guest hours, only member hours from the map', () => {
    expect(record.offers).toEqual([]);
    expect(record.equipment).toEqual([]);
    expect(record.schedules.map((schedule) => schedule.audience)).toEqual(['member']);
    expect(record.schedules[0]!.alwaysOpen).toBe(true);
    expect(record.prerequisites.advanceBookingRequired).toBe('unknown');
  });
});

describe('helpers', () => {
  it('slugs like the generators always have', () => {
    expect(slug("Gold's Gym – Venice (Main St)")).toBe('golds-gym-venice-main-st');
  });

  it('writes JSON the way the Python generators did', () => {
    expect(pyJson({ lat: -37, lng: 144.5, hours: [[1, 360, 1260]] })).toBe('{"lat": -37.0, "lng": 144.5, "hours": [[1, 360, 1260]]}');
  });
});
