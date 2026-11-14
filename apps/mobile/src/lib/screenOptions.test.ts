import { describe, expect, it } from 'vitest';

// Vite's import.meta.glob (declared in cssGradients.test.ts), for this test only.
const screens = import.meta.glob(['../app/**/*.tsx', '!../app/**/_layout.tsx'], { query: '?raw', import: 'default', eager: true });

describe('a screen’s header options', () => {
  it('found the screens', () => {
    expect(Object.keys(screens).length).toBeGreaterThan(30);
  });

  it('go through ScreenOptions, which hands them over only when they change', () => {
    // expo-router's own <Stack.Screen options> hands them over each time the
    // screen draws, and the whole stack draws again with each.
    const inline = Object.entries(screens)
      .filter(([, text]) => text.includes('<Stack.Screen'))
      .map(([file]) => file);
    expect(inline).toEqual([]);
  });
});
