/**
 * @gymgo/domain — the product's rules, with no framework or platform in them.
 *
 * Everything here is pure: given the same records and query it returns the
 * same verdicts. That is what lets the same decision run on the server for an
 * indexable page, in the browser for an instant filter change, and later in a
 * React Native client without a second implementation drifting away.
 */

export * from './types';
export * from './money';
export * from './time';
export * from './freshness';
export * from './geo';
export * from './access';
export * from './offers';
export * from './equipment';
export * from './amenities';
export * from './reviews';
export * from './search';
export * from './authz';
export * from './schemas';
export * as tokens from './tokens';
