/**
 * Reading a typed price. No React Native here, so it is unit-tested in Node.
 */

/**
 * What someone typed as a price, in hundredths: "24.50", "$24.50", "A$25",
 * "¥1,500", "SEK 250" or "24,50" → 2450, 2450, 2500, 150000, 25000, 2450;
 * anything else → null. A comma before three digits groups thousands; before
 * one or two, it's the decimal point, as much of the world writes it. Whether
 * the amount is plausible is the currency's range's call, not this.
 */
export function parseAmount(text: string): number | null {
  if (text.includes('-')) return null;
  // A symbol or code in front ("¥", "A$", "SEK "), or a short one after ("kr", "zł").
  const clean = text.trim().replace(/^[^\d\s]{1,4}\s?/, '').replace(/\s?[^\d\s.,]{1,3}$/, '');
  let number: string;
  if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(clean)) number = clean.replace(/,/g, '');
  else if (/^\d+,\d{1,2}$/.test(clean)) number = clean.replace(',', '.');
  else if (/^\d{1,9}(\.\d{1,2})?$/.test(clean)) number = clean;
  else return null;
  return Math.round(Number(number) * 100);
}
