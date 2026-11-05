import { describe, expect, it } from 'vitest';
import { switchKey } from './switchKeys';

describe('a switch from the keyboard, in a browser', () => {
  it('flips on Space', () => {
    expect(switchKey({ key: ' ' })).toBe('flip');
    expect(switchKey({ key: 'Spacebar' })).toBe('flip');
  });

  it('flips once for a held key, not on every repeat', () => {
    expect(switchKey({ key: ' ', repeat: true })).toBeNull();
  });

  it('leaves Enter to the press (it would flip twice) and other keys alone', () => {
    expect(switchKey({ key: 'Enter' })).toBeNull();
    expect(switchKey({ key: 'Tab' })).toBeNull();
    expect(switchKey({ key: 'a' })).toBeNull();
  });
});
