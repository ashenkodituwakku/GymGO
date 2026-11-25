/**
 * "Did you mean sam@gmail.com?" under the email field (app/sign-in.tsx):
 * a slip in a common email provider's name, caught before an account is
 * made with an address that can never get its emails. Only ever a
 * suggestion, tapped to use; an address it doesn't know is left alone.
 *
 * No React Native here, so it is unit-tested in Node.
 */

/** Providers to suggest: the ones most people in GymGO's countries use. */
const POPULAR = [
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'yahoo.com',
  'icloud.com',
  'me.com',
  'bigpond.com',
  'optusnet.com.au',
  'outlook.com.au',
  'hotmail.com.au',
  'yahoo.com.au',
  'live.com.au',
  'hotmail.co.uk',
  'yahoo.co.uk',
  'protonmail.com',
  'proton.me',
];

/** Real providers a near miss could be mistaken for: never "corrected". */
const REAL = new Set([...POPULAR, 'mail.com', 'gmx.com', 'gmx.de', 'aol.com', 'ymail.com', 'msn.com', 'mac.com', 'zoho.com', 'fastmail.com', 'hey.com', 'pm.me', 'tpg.com.au', 'iinet.net.au', 'internode.on.net', 'mail.ru', 'yandex.com', 'qq.com', '163.com', 'web.de', 'live.ca', 'hotmail.ca', 'yahoo.ca', 'outlook.de', 'gmail.co']);

/** Edits between two words (a swap of neighbours counts as one). */
function distance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, (_, i) => Array.from({ length: cols }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i]![j] = Math.min(d[i]![j]!, d[i - 2]![j - 2]! + 1);
    }
  }
  return d[a.length]![b.length]!;
}

/** The address with its provider's name put right, or null when it looks fine (or isn't a near miss). */
export function emailSuggestion(email: string): string | null {
  const typed = email.trim();
  const at = typed.lastIndexOf('@');
  if (at < 1 || at === typed.length - 1) return null;
  const user = typed.slice(0, at);
  const domain = typed.slice(at + 1).toLowerCase();
  if (REAL.has(domain)) return null;
  // No ending at all: "gmail" is gmail.com.
  if (!domain.includes('.') && POPULAR.includes(`${domain}.com`)) return `${user}@${domain}.com`;
  if (domain.length < 5) return null;
  let best: string | null = null;
  let bestDistance = Infinity;
  for (const known of POPULAR) {
    const gap = distance(domain, known);
    if (gap < bestDistance) {
      best = known;
      bestDistance = gap;
    }
  }
  // Two slips at most, and only one in a short name.
  const allowed = domain.length <= 7 ? 1 : 2;
  return best && bestDistance > 0 && bestDistance <= allowed ? `${user}@${best}` : null;
}
