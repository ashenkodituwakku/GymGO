import { describe, expect, it } from 'vitest';

// Vite's import.meta.glob (declared in cssGradients.test.ts), for this test only.
const screens = import.meta.glob(['../app/**/*.tsx', '!../app/**/_layout.tsx'], { query: '?raw', import: 'default', eager: true });
const sources = import.meta.glob('../**/*.tsx', { query: '?raw', import: 'default', eager: true });

describe('Liquid Glass, changed on its own', () => {
  it('found the screens', () => {
    expect(Object.keys(screens).length).toBeGreaterThan(30);
  });

  it('draws every screen again in place', () => {
    // A change of the level alone doesn't start a screen again (that would
    // lose focus, scroll and what's picked), so each screen asks to be drawn
    // again with it: else its cards keep the old level until you leave it.
    const missing = Object.entries(screens)
      .filter(([, text]) => !/^export default function \w+\([^)]*\)[^{]*\{\n\s*useGlassRedraw\(\);/m.test(text))
      .map(([file]) => file);
    expect(missing).toEqual([]);
  });

  it('reaches memoised parts too, which the screen drawing again skips', () => {
    const missing: string[] = [];
    for (const [file, text] of Object.entries(sources)) {
      for (const match of text.matchAll(/memo\(function (\w+)\([^]*?\) \{\n([^]*?)\n\}(?:, \w+)?\);/g)) {
        if (!match[2]!.includes('useGlassRedraw()')) missing.push(`${file}: ${match[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
