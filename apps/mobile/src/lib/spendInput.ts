/**
 * Reading what someone types into What you pay (app/spend.tsx): an amount
 * and a date. No React Native here, so it is unit-tested in Node.
 */

/** The most one membership or pass can be: anything above is a slip of the keyboard. */
export const MOST_AMOUNT = 100_000;

/**
 * A typed amount, or null when it isn't one: "19.99", "$19.99", "1,200" or
 * "1 200" (1200), and "19,99" (a decimal comma, 19.99). Signs, letters and
 * exponents ("-5", "1e6") aren't amounts, and nor is 0 or more than
 * MOST_AMOUNT.
 */
export function readAmount(text: string): number | null {
  let typed = text.trim().replace(/^[$€£]|^A\$|^US\$/i, '').replace(/\s/g, '');
  // A comma with exactly two digits after it, and no point: a decimal comma.
  if (/^\d+,\d{2}$/.test(typed)) typed = typed.replace(',', '.');
  // Otherwise commas group thousands.
  else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(typed)) typed = typed.replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(typed)) return null;
  const value = Number(typed);
  return value > 0 && value <= MOST_AMOUNT ? value : null;
}

/** Whether a typed date is a real day, written year-month-day: 2026-02-31 isn't (a browser would quietly read it as 3 March). */
export function isRealDay(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const parsed = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === text;
}
