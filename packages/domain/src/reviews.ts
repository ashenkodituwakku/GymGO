/**
 * First-party review aggregation.
 *
 * Only published reviews count. No reviews means "No reviews yet", never a
 * zero-star score, and external ratings are never averaged in with these.
 */

import type { RatingSummary, Review } from './types';

export function publishedReviews(reviews: Review[]): Review[] {
  return reviews.filter((review) => review.status === 'published');
}

export function summariseRatings(reviews: Review[]): RatingSummary {
  const published = publishedReviews(reviews);
  if (published.length === 0) return { average: null, count: 0 };
  const total = published.reduce((sum, review) => sum + review.overall, 0);
  return { average: Math.round((total / published.length) * 10) / 10, count: published.length };
}

export interface AspectSummary {
  equipment: RatingSummary;
  cleanliness: RatingSummary;
  atmosphere: RatingSummary;
  value: RatingSummary;
}

function summariseAspect(reviews: Review[], pick: (review: Review) => number | null): RatingSummary {
  const values = reviews.map(pick).filter((value): value is number => value !== null);
  if (values.length === 0) return { average: null, count: 0 };
  const total = values.reduce((sum, value) => sum + value, 0);
  return { average: Math.round((total / values.length) * 10) / 10, count: values.length };
}

export function summariseAspects(reviews: Review[]): AspectSummary {
  const published = publishedReviews(reviews);
  return {
    equipment: summariseAspect(published, (review) => review.equipment),
    cleanliness: summariseAspect(published, (review) => review.cleanliness),
    atmosphere: summariseAspect(published, (review) => review.atmosphere),
    value: summariseAspect(published, (review) => review.value),
  };
}

/** "4.2 from 9 reviews" / "No reviews yet". */
export function describeRating(summary: RatingSummary): string {
  if (summary.average === null || summary.count === 0) return 'No reviews yet';
  const plural = summary.count === 1 ? 'review' : 'reviews';
  return `${summary.average.toFixed(1)} from ${summary.count} ${plural}`;
}
