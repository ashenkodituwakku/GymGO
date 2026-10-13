import { describe, expect, it } from 'vitest';

declare global {
  interface ImportMeta {
    glob: (pattern: string | string[], options: { query: string; import: string; eager: true }) => Record<string, string>;
  }
}

// The app's own source, as text (not run).
const sources = import.meta.glob(['../**/*.tsx', '../**/*.ts', '!../**/*.test.ts'], { query: '?raw', import: 'default', eager: true });

describe('the gradients drawn in CSS', () => {
  it('found the source to check', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(50);
  });

  it('only name real CSS gradient functions', () => {
    // A rename of a helper once turned every `linear-gradient(` into
    // `linear-backgroundImage(`: invalid CSS, which draws nothing and says nothing.
    const broken: string[] = [];
    for (const [file, text] of Object.entries(sources)) {
      for (const match of text.matchAll(/\b(linear|radial|conic|repeating-linear|repeating-radial)-([A-Za-z]+)\(/g)) {
        if (match[2] !== 'gradient') broken.push(`${file}: ${match[0]}`);
      }
    }
    expect(broken).toEqual([]);
  });
});
