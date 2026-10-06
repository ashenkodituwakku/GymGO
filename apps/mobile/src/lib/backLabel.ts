/**
 * What a page's back button says in a browser (components/WebBack.tsx): the
 * page it goes back to.
 */

/** The tabs' own names, as their bar shows them (app/(tabs)/_layout.tsx). */
const TAB_LABELS: Record<string, string> = { index: 'Home', explore: 'Explore', saved: 'Saved', profile: 'Profile' };

type StackRoute = { key: string; name: string; state?: { index?: number; routes: Array<{ name: string }> } };

/**
 * What the page behind this one is called: the tab you came from, or the
 * page's own title. Untitled pages (a gym's, say) are just "Back".
 */
export function backLabel(routes: readonly StackRoute[], key: string, title: string | undefined): string {
  const previous = routes[routes.findIndex((route) => route.key === key) - 1];
  if (!previous) return 'Back';
  if (previous.name === '(tabs)') {
    const tabs = previous.state;
    return TAB_LABELS[tabs?.routes[tabs.index ?? 0]?.name ?? 'index'] ?? 'Back';
  }
  return title?.trim() || 'Back';
}
