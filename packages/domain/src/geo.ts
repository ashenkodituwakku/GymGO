/**
 * Geography helpers.
 *
 * Straight-line distance only. Without a licensed routing provider we do not
 * have travel times, so we do not show them; a walking estimate invented from
 * a crow-flies number is exactly the sort of confident-but-wrong detail this
 * product exists to avoid.
 */

import type { LatLng } from './types';

const EARTH_RADIUS_KM = 6371.0088;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance in kilometres. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistanceKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m straight line`;
  return `${km.toFixed(1)} km straight line`;
}

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export function isWithinBox(point: LatLng, box: BoundingBox): boolean {
  const withinLat = point.lat <= box.north && point.lat >= box.south;
  // Does not attempt to handle a box crossing the antimeridian; the pilot area
  // is nowhere near it and a wrong guess here is worse than an explicit limit.
  const withinLng = point.lng <= box.east && point.lng >= box.west;
  return withinLat && withinLng;
}

export function boxAround(centre: LatLng, radiusKm: number): BoundingBox {
  const latDelta = radiusKm / 111.32;
  const lngDelta = radiusKm / (111.32 * Math.cos(toRadians(centre.lat)) || 1);
  return {
    north: centre.lat + latDelta,
    south: centre.lat - latDelta,
    east: centre.lng + lngDelta,
    west: centre.lng - lngDelta,
  };
}

export function boxCentre(box: BoundingBox): LatLng {
  return { lat: (box.north + box.south) / 2, lng: (box.east + box.west) / 2 };
}

/** Rough radius of a bounding box, used to keep "Search this area" honest. */
export function boxRadiusKm(box: BoundingBox): number {
  const centre = boxCentre(box);
  return haversineKm(centre, { lat: box.north, lng: box.east });
}
