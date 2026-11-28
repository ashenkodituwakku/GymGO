import { describe, expect, it } from 'vitest';
import { emailSuggestion } from './emailTypos';

describe('emailSuggestion', () => {
  it('catches a slip in a common provider', () => {
    expect(emailSuggestion('sam@gmial.com')).toBe('sam@gmail.com');
    expect(emailSuggestion('sam@gmail.con')).toBe('sam@gmail.com');
    expect(emailSuggestion('sam@gamil.com')).toBe('sam@gmail.com');
    expect(emailSuggestion('sam@hotmial.com')).toBe('sam@hotmail.com');
    expect(emailSuggestion('sam@outlok.com')).toBe('sam@outlook.com');
    expect(emailSuggestion('sam@icloud.co')).toBe('sam@icloud.com');
    expect(emailSuggestion('sam@yahoo.com.ua')).toBe('sam@yahoo.com.au');
    expect(emailSuggestion('sam@bigpnd.com')).toBe('sam@bigpond.com');
    expect(emailSuggestion('  Sam.Lee@GMAIL.CMO ')).toBe('Sam.Lee@gmail.com');
  });

  it('adds a missing .com to a provider', () => {
    expect(emailSuggestion('sam@gmail')).toBe('sam@gmail.com');
    expect(emailSuggestion('sam@hotmail')).toBe('sam@hotmail.com');
  });

  it('leaves real addresses alone, including near misses that are real providers', () => {
    for (const fine of ['sam@gmail.com', 'sam@mail.com', 'sam@gmx.com', 'sam@aol.com', 'sam@ymail.com', 'sam@me.com', 'sam@mac.com', 'sam@work.com.au', 'sam@gymgo.site', 'sam@uni.edu.au', 'sam@example.com']) {
      expect(emailSuggestion(fine)).toBeNull();
    }
  });

  it('says nothing until there’s an address to look at', () => {
    for (const early of ['', 'sam', 'sam@', '@gmail.com', 'sam@g', 'sam@gm']) expect(emailSuggestion(early)).toBeNull();
  });
});
