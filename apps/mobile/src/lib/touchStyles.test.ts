import { describe, expect, it } from 'vitest';

// Vite's import.meta.glob (declared in cssGradients.test.ts), for this test only.
const sources = import.meta.glob(['../**/*.tsx', '../**/*.ts', '!../**/*.test.ts'], { query: '?raw', import: 'default', eager: true });

describe("layers that let touches through to what's under them", () => {
  it("never ask for 'box-none' in a style written inline", () => {
    // Inline, a browser drops 'box-none' and the layer takes every tap and
    // drag meant for what's under it: once, the whole map at phone width. It
    // comes from CHILD_TOUCH (lib/theme.ts, compiled by StyleSheet.create)
    // on a plain View, or the pointerEvents prop on an Animated.View.
    const inline: string[] = [];
    for (const [file, text] of Object.entries(sources)) {
      if (file.endsWith('/theme.ts')) continue;
      for (const line of text.split('\n')) {
        if (/pointerEvents:\s*[^,}]*['"]box-none['"]/.test(line)) inline.push(`${file}: ${line.trim()}`);
      }
    }
    expect(inline).toEqual([]);
  });
});
