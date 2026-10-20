# @gymgo/world-data

Gyms in major cities around the world, beyond the US, Australian and
European packs, from OpenStreetMap (ODbL). Map-only, like those packs: a
gym's name, place, contact details and mapped hours, never a price, a photo
or equipment GymGO hasn't seen (packages/osm sets out what counts as a gym).

The 46 cities and the circle each is read from are in `src/cities.ts`. Only
the cities whose gyms have been fetched reach the app (`WORLD_CITIES_BUILT`),
so the list can be fetched a few at a time.

## Fetching

Overpass (overpass-api.de and its mirrors) must be reachable from where this
runs; a Claude Code cloud session needs `overpass-api.de` in its
environment's allowed domains.

```bash
pnpm --filter @gymgo/world-data fetch /tmp/world-osm      # about two minutes a city; skips ones already saved
pnpm --filter @gymgo/world-data generate /tmp/world-osm   # writes src/data.ts
pnpm --filter @gymgo/world-data test
```

A city whose map has fewer than five gyms in its circle is left out.
