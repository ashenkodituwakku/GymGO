/**
 * On the website, each screen's code is fetched the first time it's opened,
 * and the page is empty until it arrives. The tabs fetch the likeliest next
 * screens ahead, once the first one has settled (app/(tabs)/_layout.tsx).
 * This says when that's welcome. No React Native here, so it is unit-tested in Node.
 */

/** What a browser says about the connection, where it says anything (navigator.connection). */
export interface ConnectionHint {
  saveData?: boolean;
  effectiveType?: string;
}

/**
 * Whether to fetch other screens' code ahead. Not for someone who has asked
 * their browser to save data, nor on a connection so slow that it would only
 * get in the way of what they're doing now. A browser that says nothing
 * (Safari, Firefox) is taken as fine.
 */
export function mayPrefetch(connection: ConnectionHint | null | undefined): boolean {
  if (!connection) return true;
  if (connection.saveData === true) return false;
  return connection.effectiveType !== 'slow-2g' && connection.effectiveType !== '2g';
}
