import { describe, expect, it } from 'vitest';
import { mayPrefetch } from './prefetch';

describe('fetching other screens ahead on the website', () => {
  it('goes ahead where the browser says nothing about the connection, or that it’s a good one', () => {
    expect(mayPrefetch(undefined)).toBe(true);
    expect(mayPrefetch(null)).toBe(true);
    expect(mayPrefetch({})).toBe(true);
    expect(mayPrefetch({ effectiveType: '4g', saveData: false })).toBe(true);
    expect(mayPrefetch({ effectiveType: '3g' })).toBe(true);
  });

  it('holds back for someone saving data, or on a very slow connection', () => {
    expect(mayPrefetch({ saveData: true, effectiveType: '4g' })).toBe(false);
    expect(mayPrefetch({ effectiveType: '2g' })).toBe(false);
    expect(mayPrefetch({ effectiveType: 'slow-2g' })).toBe(false);
  });
});
