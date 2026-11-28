/**
 * Space ticks a checkbox in a browser, as it does everywhere else.
 *
 * React Native Web presses a control from the keyboard with Enter, and with
 * Space only when its role is "button". GymGO's ticks, choices, switches and
 * tabs are checkboxes, radios, switches and tabs to a screen reader, so Space
 * did nothing on them (and scrolled the page instead): the compare ticks on
 * Saved were found that way. This listens once, on the page, and clicks the
 * focused control for it; a click is what Pressable answers anyway.
 */

/** The roles a Space presses: what a person expects of each, by the WAI-ARIA patterns. */
const SPACE_ROLES = new Set(['checkbox', 'radio', 'switch', 'tab', 'option', 'menuitemcheckbox', 'menuitemradio']);

/** What the rule needs of an element (an HTMLElement, or a stand-in in tests). */
export interface KeyTarget {
  tagName: string;
  isContentEditable?: boolean;
  getAttribute(name: string): string | null;
}

/** Whether a Space on this element should press it. Native form controls and typing places keep their own. */
export function spacePresses(target: KeyTarget | null): boolean {
  if (!target || target.isContentEditable) return false;
  const tag = target.tagName.toUpperCase();
  if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tag)) return false;
  const role = target.getAttribute('role');
  if (!role || !SPACE_ROLES.has(role)) return false;
  // A link keeps Space for scrolling, unless it says it's a tab (the tab bar's are links).
  if (tag === 'A' && role !== 'tab') return false;
  return target.getAttribute('aria-disabled') !== 'true';
}

let installed = false;

/** Listen for Space on the page (a browser only; once, however often it's called). */
export function installSpaceKey(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener('keydown', (event) => {
    if ((event.key !== ' ' && event.key !== 'Spacebar') || event.repeat || event.defaultPrevented) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!spacePresses(target)) return;
    // Not the page scrolling as well.
    event.preventDefault();
    target!.click();
  });
}
