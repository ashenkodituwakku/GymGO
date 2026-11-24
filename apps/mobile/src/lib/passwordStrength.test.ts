import { describe, expect, it } from 'vitest';
import { passwordStrength } from './passwordStrength';

describe('passwordStrength', () => {
  it('says nothing for an empty box, and too short under 8', () => {
    expect(passwordStrength('')).toEqual({ score: 0, label: '' });
    expect(passwordStrength('Ab1!xyz')).toEqual({ score: 0, label: 'Too short' });
  });

  it('counts length most, then a mix of kinds of character', () => {
    expect(passwordStrength('lifting7').label).toBe('Weak');
    expect(passwordStrength('Lifting7!').label).toBe('Okay');
    expect(passwordStrength('heavy squats today').label).toBe('Good');
    expect(passwordStrength('Heavy squats, then 5 km!').label).toBe('Strong');
  });

  it('calls a well-known password, or one with your name or email in it, weak', () => {
    expect(passwordStrength('MyPassword2026!!').score).toBe(1);
    expect(passwordStrength('qwerty-qwerty-qwerty').score).toBe(1);
    expect(passwordStrength('aaaaaaaaaaaaaaaa').score).toBe(1);
    expect(passwordStrength('Samantha#2026long', ['Samantha', 'sam.r']).score).toBe(1);
    // A hint of two letters is too short to count against it.
    expect(passwordStrength('Heavy squats, then 5 km!', ['Al']).label).toBe('Strong');
  });
});
