import { describe, expect, it } from 'vitest';
import { monogram } from './monogram';

describe('monogram', () => {
  it('takes the first two words’ initials', () => {
    expect(monogram('Doherty’s Gym')).toBe('DG');
    expect(monogram('Fitness First')).toBe('FF');
    expect(monogram('CrossFit Collingwood')).toBe('CC');
    expect(monogram('Melbourne Altitude Training')).toBe('MA');
  });

  it('skips articles and joins', () => {
    expect(monogram('The Underground Fitness Club')).toBe('UF');
    expect(monogram('Marrow & Co')).toBe('M');
    expect(monogram('Body + Mind Studio')).toBe('BM');
  });

  it('keeps a leading number whole', () => {
    expect(monogram('F45 Training')).toBe('F45');
    expect(monogram('101Fitness')).toBe('101');
    expect(monogram('9Round Fitness')).toBe('9');
    expect(monogram('24/7 Fitness')).toBe('24');
  });

  it('copes with one word, other alphabets and nothing at all', () => {
    expect(monogram('Kieser')).toBe('K');
    expect(monogram('Ástvaldur Gym')).toBe('ÁG');
    expect(monogram('   ')).toBe('');
  });
});
