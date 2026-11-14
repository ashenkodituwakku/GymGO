import { describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({ default: { getItem: async () => null, setItem: async () => undefined } }));

import { formatBirthMonthInput, holdPendingSignIn, parseBirthMonth, takePendingSignIn } from './ageGate';

describe('the age question', () => {
  const now = new Date(2026, 8, 28);

  it('shows digits typed on a number pad as a month and year', () => {
    expect(formatBirthMonthInput('0')).toBe('0');
    expect(formatBirthMonthInput('04')).toBe('04');
    expect(formatBirthMonthInput('0419')).toBe('04 / 19');
    expect(formatBirthMonthInput('04199512')).toBe('04 / 1995');
    expect(formatBirthMonthInput('04 / 1995')).toBe('04 / 1995');
  });

  it('reads a real month and year, and nothing else', () => {
    expect(parseBirthMonth('04 / 1995', now)).toBe('1995-04');
    expect(parseBirthMonth('4/1995', now)).toBe('1995-04');
    expect(parseBirthMonth('13 / 1995', now)).toBeNull();
    expect(parseBirthMonth('04 / 19', now)).toBeNull();
    expect(parseBirthMonth('10 / 2026', now)).toBeNull();
    expect(parseBirthMonth('01 / 1850', now)).toBeNull();
  });

  it('hands a Google or Apple sign-in to the question once, then forgets it', () => {
    holdPendingSignIn({ provider: 'google', idToken: 't', nonce: 'n', name: null });
    expect(takePendingSignIn()?.idToken).toBe('t');
    expect(takePendingSignIn()).toBeNull();
  });
});
