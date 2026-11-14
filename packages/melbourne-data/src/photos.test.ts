import { describe, expect, it } from 'vitest';
import { MELBOURNE_GYMS } from './gyms';
import { MELBOURNE_PHOTOS } from './photos';

const host = (url: string) => url.replace(/^https?:\/\//, '').split(/[/?#]/)[0]!.toLowerCase().replace(/^www\./, '');

/** Gyms' website addresses in the data that now lead to another (checked 25 Oct 2026): the photos are credited to where they are. */
const MOVED: Record<string, string> = {
  'goodlifehealthclubs.com.au': 'goodlife.com.au',
  'anytimefitness.com.au': 'anytimefitness.com',
  'crossfitcollingwood.com': 'theoxbox.fit',
};

describe('photos checked on the gyms’ own websites', () => {
  it('are each for a curated gym, from a page on that gym’s own website, with what it shows and when it was checked', () => {
    for (const [id, photos] of Object.entries(MELBOURNE_PHOTOS)) {
      const gym = MELBOURNE_GYMS.find((record) => record.location.id === id);
      expect(gym, id).toBeDefined();
      expect(photos.length, id).toBeGreaterThan(0);
      // Four are shown: more would be checked and never seen.
      expect(photos.length, id).toBeLessThanOrEqual(4);
      for (const photo of photos) {
        expect(photo.url.startsWith('https://'), photo.url).toBe(true);
        const site = host(gym!.location.website!);
        expect(host(photo.page), photo.page).toBe(MOVED[site] ?? site);
        expect(photo.shows.length, photo.url).toBeGreaterThan(10);
        expect(Number.isNaN(Date.parse(photo.checkedAt)), photo.checkedAt).toBe(false);
      }
      expect(new Set(photos.map((photo) => photo.url)).size, id).toBe(photos.length);
    }
  });

  it('never gives two gyms the same picture', () => {
    const urls = Object.values(MELBOURNE_PHOTOS).flatMap((photos) => photos.map((photo) => photo.url));
    expect(new Set(urls).size).toBe(urls.length);
  });
});
