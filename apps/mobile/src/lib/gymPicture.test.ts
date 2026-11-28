import { describe, expect, it } from 'vitest';
import { DEMO_GYMS } from '@gymgo/demo-data';
import { DEMO_PICTURES } from './demoPictures';
import { ILLUSTRATION_CREDIT, demoPicture } from './gymPicture';

// Here a picture is its path (vitest.config.mts), so the test sees which is which.
const path = (source: unknown) => source as unknown as string;

describe('demo gym pictures', () => {
  it('has one for every demo gym, and for nothing else', () => {
    expect(Object.keys(DEMO_PICTURES).sort()).toEqual(DEMO_GYMS.map((record) => record.location.id).sort());
    for (const [id, picture] of Object.entries(DEMO_PICTURES)) {
      expect(path(picture.source)).toBe(`../../assets/demo/${id}.webp`);
      expect(picture.alt.length).toBeGreaterThan(20);
    }
  });

  it('gives a demo gym its illustration, said as one', () => {
    const gym = DEMO_GYMS[0]!.location;
    const picture = demoPicture(gym);
    expect(path(picture?.source)).toBe(`../../assets/demo/${gym.id}.webp`);
    expect(picture?.alt).toBe(`Illustration: ${DEMO_PICTURES[gym.id]!.alt}`);
    expect(ILLUSTRATION_CREDIT).toMatch(/^Illustration/);
  });

  it('never gives a real gym one, even with a demo gym’s id', () => {
    const id = DEMO_GYMS[0]!.location.id;
    expect(demoPicture({ id, isDemoData: false })).toBeNull();
    expect(demoPicture({ id: 'some-real-gym', isDemoData: false })).toBeNull();
    expect(demoPicture(null)).toBeNull();
  });
});
