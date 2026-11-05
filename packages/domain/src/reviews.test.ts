/**
 * Review aggregation. Zero reviews is an absence, not a score.
 */

import { describe, expect, it } from 'vitest';
import { describeRating, publishedReviews, summariseAspects, summariseRatings } from './reviews';
import { review } from './testing';

describe('summariseRatings', () => {
  it('returns a null average and a zero count when there are no reviews', () => {
    const summary = summariseRatings([]);
    expect(summary.average).toBeNull();
    expect(summary.count).toBe(0);
    expect(describeRating(summary)).toBe('No reviews yet');
  });

  it('ignores pending, rejected and removed reviews', () => {
    const reviews = [
      review({ id: 'a', overall: 5, status: 'published' }),
      review({ id: 'b', overall: 1, status: 'pending' }),
      review({ id: 'c', overall: 1, status: 'rejected' }),
      review({ id: 'd', overall: 1, status: 'removed' }),
    ];
    const summary = summariseRatings(reviews);
    expect(summary.count).toBe(1);
    expect(summary.average).toBe(5);
    expect(publishedReviews(reviews)).toHaveLength(1);
  });

  it('averages published reviews to one decimal place', () => {
    const summary = summariseRatings([
      review({ id: 'a', overall: 4 }),
      review({ id: 'b', overall: 5 }),
      review({ id: 'c', overall: 3 }),
    ]);
    expect(summary.average).toBe(4);
    expect(describeRating(summary)).toBe('4.0 from 3 reviews');
  });

  it('counts each aspect only where it was actually given', () => {
    const aspects = summariseAspects([
      review({ id: 'a', overall: 4, cleanliness: 5, equipment: null }),
      review({ id: 'b', overall: 4, cleanliness: 3, equipment: 4 }),
    ]);
    expect(aspects.cleanliness).toEqual({ average: 4, count: 2 });
    expect(aspects.equipment).toEqual({ average: 4, count: 1 });
    expect(aspects.atmosphere).toEqual({ average: null, count: 0 });
  });

  it('uses singular wording for a single review', () => {
    expect(describeRating(summariseRatings([review()]))).toBe('4.0 from 1 review');
  });
});
