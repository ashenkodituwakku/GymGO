/**
 * Whether a page's ground (its colour, with Standard's glow or Frost's page
 * of blues over it) is already drawn behind it, the window's width.
 *
 * With the sidebar docked, a page starts at the sidebar's edge
 * (`ClearOfSidebar` moves it in), so a ground it drew itself started there
 * too, and Frost's blues ended in a hard line down the side of the sidebar.
 * There `ClearOfSidebar` draws the ground instead, under the sidebar as well,
 * and the page (TabScreen, PageScroll) leaves its own clear.
 */

import { createContext, useContext } from 'react';

export const PageGround = createContext(false);

/** True when the page's ground is drawn behind it already: draw none of your own. */
export const usePageGroundDrawn = (): boolean => useContext(PageGround);
