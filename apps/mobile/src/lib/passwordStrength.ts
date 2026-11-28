/**
 * How strong a new password looks, for the meter under it when making an
 * account (app/sign-in.tsx). Advice only: the rule GymGO enforces is still
 * 8 characters or more (the server's). Length counts most, then a mix of
 * kinds of character; a well-known password, or one with your name or email
 * in it, is weak however long.
 *
 * No React Native here, so it is unit-tested in Node.
 */

export interface Strength {
  /** 0 is under 8 characters (not allowed); 1 to 4, weak to strong. */
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
}

/** Passwords people pick most, and runs anyone would guess. */
const COMMON = ['password', 'passw0rd', '12345678', '123456789', '1234567890', 'qwerty', 'letmein', 'iloveyou', 'gymgo', 'abc123', 'football', 'monkey', 'dragon', 'welcome', 'abcdefgh', '11111111', '00000000'];

const LABELS = ['Too short', 'Weak', 'Okay', 'Good', 'Strong'] as const;

/** `hints`: what the password shouldn't contain (your name, your email's first part). */
export function passwordStrength(password: string, hints: readonly string[] = []): Strength {
  if (password.length < 8) return { score: 0, label: password.length === 0 ? '' : LABELS[0] };
  const lower = password.toLowerCase();
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((kind) => kind.test(password)).length;
  let score = 1 + (password.length >= 12 ? 1 : 0) + (password.length >= 16 ? 1 : 0) + (kinds >= 3 ? 1 : 0);
  const guessable =
    COMMON.some((word) => lower.includes(word)) ||
    hints.some((hint) => hint.trim().length >= 3 && lower.includes(hint.trim().toLowerCase())) ||
    // One character over and over ("aaaaaaaa").
    new Set(lower).size <= 2;
  if (guessable) score = 1;
  const clamped = Math.min(4, score) as Strength['score'];
  return { score: clamped, label: LABELS[clamped] };
}
