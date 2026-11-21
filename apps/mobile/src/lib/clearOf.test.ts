import { describe, expect, it } from 'vitest';
import { clearOf } from './looks';

describe('a colour made clear, for a fade to start from', () => {
  it('keeps the hue of an rgba or rgb colour, at no opacity', () => {
    expect(clearOf('rgba(130, 136, 150, 0.24)')).toBe('rgba(130, 136, 150, 0)');
    expect(clearOf('rgb(10,20,30)')).toBe('rgba(10, 20, 30, 0)');
  });

  it('reads hex colours, short, long and with an alpha', () => {
    expect(clearOf('#5B5BD6')).toBe('rgba(91, 91, 214, 0)');
    expect(clearOf('#fff')).toBe('rgba(255, 255, 255, 0)');
    expect(clearOf('#5B5BD680')).toBe('rgba(91, 91, 214, 0)');
  });

  it('falls back to transparent for anything it cannot read', () => {
    expect(clearOf('transparent')).toBe('transparent');
    expect(clearOf('hsl(0, 0%, 50%)')).toBe('transparent');
  });
});
