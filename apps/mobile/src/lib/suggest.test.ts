import { describe, expect, it } from 'vitest';
import type { PackTown } from './countryPack';
import { BUNDLED_GYMS } from './query';
import { MATCH, matchScore, suggest, suggestionForEnter, title, type Suggestion } from './suggest';

const real = BUNDLED_GYMS.filter((record) => !record.location.isDemoData);
const SYDNEY = { lat: -33.8818, lng: 151.2067 };
const MELBOURNE = { lat: -37.8142, lng: 144.9632 };
const NEW_YORK = { lat: 40.7549, lng: -73.984 };

const titles = (hits: Suggestion[]) => hits.map(title);
const kinds = (hits: Suggestion[]) => hits.map((hit) => hit.kind);
const sydney = (query: string, towns: PackTown[] = []) => suggest(query, { centre: SYDNEY, home: 'AU', records: real, towns });

describe('what the search box suggests', () => {
  it('scores a whole name over its start, a word’s start, and a few letters inside', () => {
    expect(matchScore('kew', ['Kew'])).toBe(MATCH.exact);
    expect(matchScore('kew', ['Kew East'])).toBe(MATCH.start);
    expect(matchScore('first', ['Fitness First'])).toBe(MATCH.word);
    expect(matchScore('fit first', ['Fitness First'])).toBe(MATCH.word);
    expect(matchScore('ness', ['Fitness First'])).toBe(MATCH.inside);
    expect(matchScore('ne', ['Fitness First'])).toBe(0);
    expect(matchScore('zurich', ['Zürich'])).toBe(MATCH.exact);
    expect(matchScore('dohertys', ['Doherty’s Gym'])).toBe(MATCH.start);
  });

  it('lists only what’s near you from one letter, never a city on the other side of the world', () => {
    const hits = sydney('k');
    expect(hits.length).toBeGreaterThan(0);
    expect(titles(hits)).not.toContain('Kansas City');
    expect(titles(hits)).not.toContain('Copenhagen');
    // Sydney's own suburbs and gyms starting with K.
    expect(hits.every((hit) => title(hit).toLowerCase().startsWith('k'))).toBe(true);
    expect(hits.every((hit) => hit.km < 40)).toBe(true);
  });

  it('puts a gym down the road before a suburb in another city', () => {
    const hits = sydney('fit');
    expect(hits[0]!.kind).toBe('gym');
    expect(hits[0]!.km).toBeLessThan(15);
    const fitzroyVic = titles(hits).indexOf('Fitzroy');
    if (fitzroyVic !== -1) expect(kinds(hits).slice(0, fitzroyVic)).toContain('gym');
  });

  it('puts a city in your own country before one abroad, and a nearby suburb before a far one', () => {
    const syd = titles(sydney('syd'));
    expect(syd[0]).toBe('Sydney');
    // Sydenham in Sydney before Sydenham in Victoria.
    const hits = sydney('syd');
    const sydenhams = hits.filter((hit) => title(hit) === 'Sydenham');
    expect(sydenhams[0]!.km).toBeLessThan(sydenhams[sydenhams.length - 1]!.km + 1);
    // Gold Coast, Queensland, before Chicago's Gold Coast or San Diego's Golden Hill (a Gold's Gym nearby may come first).
    const gold = sydney('gold');
    const coast = gold.findIndex((hit) => hit.kind === 'place' && hit.place.city === 'gold-coast');
    expect(coast).toBeGreaterThanOrEqual(0);
    expect(coast).toBeLessThan(2);
    const abroad = gold.findIndex((hit) => hit.kind === 'place' && hit.place.city !== 'gold-coast' && hit.km > 5000);
    if (abroad !== -1) expect(coast).toBeLessThan(abroad);
  });

  it('still finds somewhere far away once it’s typed out', () => {
    expect(titles(sydney('kansas'))[0]).toBe('Kansas City');
    expect(titles(sydney('osaka'))[0]).toBe('Osaka');
    expect(titles(suggest('equinox', { centre: NEW_YORK, home: 'US', records: real }))[0]).toBe('Equinox');
  });

  it('suggests every town with a gym from your country’s kept gyms, nearest first, once each', () => {
    const towns: PackTown[] = [
      { name: 'Katoomba', state: 'NSW', country: 'AU', position: { lat: -33.714, lng: 150.311 }, gyms: 3, timezone: 'Australia/Sydney' },
      { name: 'Katherine', state: 'NT', country: 'AU', position: { lat: -14.465, lng: 132.264 }, gyms: 2, timezone: 'Australia/Darwin' },
      // GymGO lists Kensington already: one row, not two.
      { name: 'Kensington', state: 'NSW', country: 'AU', position: { lat: -33.905, lng: 151.222 }, gyms: 4, timezone: 'Australia/Sydney' },
    ];
    const hits = sydney('kat', towns);
    expect(titles(hits).slice(0, 2)).toEqual(['Katoomba', 'Katherine']);
    expect(hits[0]!.kind).toBe('town');
    // Kensington in Melbourne, London and elsewhere are other places; Sydney's shows once.
    expect(sydney('kensington', towns).filter((hit) => title(hit) === 'Kensington' && hit.km < 10).length).toBe(1);
  });

  it('finds the cities in a US state by its name', () => {
    const hits = suggest('texas', { centre: NEW_YORK, home: 'US', records: [] });
    expect(titles(hits)).toEqual(expect.arrayContaining(['Houston', 'Dallas', 'Austin']));
  });

  it('sends Enter to the top row, unless it only has the letters somewhere inside', () => {
    expect(title(suggestionForEnter(sydney('bondi'))!)).toBe('Bondi');
    expect(suggestionForEnter([])).toBeNull();
    const inside = sydney('ondi').filter((hit) => hit.match === MATCH.inside);
    expect(suggestionForEnter(inside)).toBeNull();
  });
});
