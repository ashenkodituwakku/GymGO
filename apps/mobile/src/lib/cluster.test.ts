import { describe, expect, it } from 'vitest';
import type { MapPin } from '@/components/map-types';
import { NO_CLUSTER_ZOOM, mapItems, sameSpot } from './cluster';

const pin = (id: string, lat: number, lng: number, tier: MapPin['tier'] = 'needs_confirmation'): MapPin => ({ id, name: id, position: { lat, lng }, tier });

// Melbourne's CBD: four gyms a few hundred metres apart, and one in St Kilda.
const PINS = [pin('a', -37.8136, 144.9631), pin('b', -37.8146, 144.9641, 'confirmed'), pin('c', -37.8126, 144.9621), pin('d', -37.8156, 144.9661), pin('st-kilda', -37.8676, 144.9801)];
const VIEW = { south: -37.9, west: 144.9, north: -37.75, east: 145.05 };

describe('grouping pins into bubbles', () => {
  it('groups gyms that would overlap, and leaves ones apart alone', () => {
    const items = mapItems(PINS, 13, VIEW, null);
    const bubble = items.find((item) => item.kind === 'cluster');
    expect(bubble).toMatchObject({ kind: 'cluster', count: 4, tier: 'confirmed' });
    expect(items.find((item) => item.id === 'st-kilda')).toMatchObject({ kind: 'pin' });
    expect(items).toHaveLength(2);
  });

  it('shows every gym on its own at street level', () => {
    const items = mapItems(PINS, NO_CLUSTER_ZOOM, VIEW, null);
    expect(items.every((item) => item.kind === 'pin')).toBe(true);
    expect(items).toHaveLength(5);
  });

  it('never hides the gym you picked in a bubble', () => {
    const items = mapItems(PINS, 13, VIEW, 'a');
    expect(items.find((item) => item.id === 'a')).toMatchObject({ kind: 'pin', selected: true });
    expect(items.find((item) => item.kind === 'cluster')).toMatchObject({ count: 3 });
  });

  it('groups the same way wherever the map is panned, as long as the zoom is the same', () => {
    const here = mapItems(PINS, 13.2, VIEW, null).map((item) => item.id).sort();
    const panned = mapItems(PINS, 13.7, { south: -37.95, west: 144.85, north: -37.8, east: 145 }, null).map((item) => item.id).sort();
    expect(panned).toEqual(here);
  });

  it('draws only what’s on screen or near it, except the gym you picked', () => {
    const far = pin('sydney', -33.87, 151.21);
    const items = mapItems([...PINS, far], NO_CLUSTER_ZOOM, VIEW, null);
    expect(items.some((item) => item.id === 'sydney')).toBe(false);
    expect(mapItems([...PINS, far], NO_CLUSTER_ZOOM, VIEW, 'sydney').some((item) => item.id === 'sydney')).toBe(true);
  });

  it('knows when a bubble’s gyms share one building', () => {
    expect(sameSpot([{ lat: -37.8136, lng: 144.9631 }, { lat: -37.81361, lng: 144.96312 }])).toBe(true);
    expect(sameSpot(PINS.map((item) => item.position))).toBe(false);
  });

  it('keeps hundreds of gyms to a handful of bubbles when zoomed out', () => {
    const many = Array.from({ length: 600 }, (_, i) => pin(`g${i}`, -37.6 - (i % 30) * 0.02, 144.7 + Math.floor(i / 30) * 0.03));
    const items = mapItems(many, 9, { south: -38.3, west: 144.4, north: -37.3, east: 145.6 }, null);
    expect(items.length).toBeLessThan(80);
    expect(items.reduce((sum, item) => sum + (item.kind === 'cluster' ? item.count : 1), 0)).toBe(600);
  });
});
