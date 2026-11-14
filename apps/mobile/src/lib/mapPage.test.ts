import { describe, expect, it } from 'vitest';
import { OPENING_ZOOM, mapPageHtml } from '../components/mapPage';

const colours = { confirmed: '#34C759', needs_confirmation: '#FF9500', ruled_out: '#8E8E93' };
const centre = { lat: -37.8136, lng: 144.9631 };

/** The page's own scripts, as written into it. */
function scripts(html: string): string[] {
  return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1] ?? '');
}

describe("Android's map page", () => {
  it('builds scripts a browser can read (a slip in the template would leave the map blank on a phone)', () => {
    for (const dark of [false, true]) {
      const found = scripts(mapPageHtml({ centre, colours, dark }));
      expect(found).toHaveLength(2);
      // Parsed, not run: a syntax error throws here.
      for (const body of found) expect(() => new Function(body)).not.toThrow();
    }
  });

  it('opens where it is told: a fresh page at the opening zoom, a page started over where the last one was', () => {
    expect(mapPageHtml({ centre, colours })).toContain(`"zoom":${OPENING_ZOOM}`);
    const resumed = mapPageHtml({ centre: { lat: -37.8, lng: 144.97 }, zoom: 15.5, colours });
    expect(resumed).toContain('"centre":{"lat":-37.8,"lng":144.97},"zoom":15.5');
  });

  it('tells the app when the map failed and when it is showing, so it can offer Try again', () => {
    const html = mapPageHtml({ centre, colours });
    expect(html).toContain("type: 'failed'");
    expect(html).toContain("type: 'loaded'");
    // Also when the map library itself never arrives.
    expect(html).toMatch(/maplibre-gl\.js" onerror="post\(\{type:'failed'\}\)/);
  });
});
