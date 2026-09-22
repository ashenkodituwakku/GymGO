'use client';

import { useEffect, useRef, useState } from 'react';
// Bundled into this chunk, which only loads when a basemap is configured.
import 'maplibre-gl/dist/maplibre-gl.css';
import { useRouter, useSearchParams } from 'next/navigation';
import type { MapMarker } from './MapPanel';

/**
 * The real map.
 *
 * Loaded only when a basemap provider is configured, so the MapLibre bundle is
 * not shipped to people who would see an empty frame. The provider is passed
 * in as a style document URL or a raster tile template plus its attribution;
 * this component never embeds a provider or a key of its own.
 *
 * NOTE: no basemap provider is configured in this repository, so this path has
 * not been exercised. It is reported as unverified in docs/STATUS.md.
 */
export default function MapCanvas({
  markers,
  selectedId,
  centre,
  styleUrl,
  tileUrl,
  attribution,
}: {
  markers: MapMarker[];
  selectedId: string | null;
  centre: { lat: number; lng: number };
  styleUrl: string | null;
  tileUrl: string | null;
  attribution: string | null;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [failed, setFailed] = useState<string | null>(null);
  const [moved, setMoved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const maplibre = await import('maplibre-gl');
        if (cancelled || !container.current) return;

        const style = styleUrl
          ? styleUrl
          : {
              version: 8 as const,
              sources: {
                basemap: {
                  type: 'raster' as const,
                  tiles: [tileUrl as string],
                  tileSize: 256,
                  // Attribution is a licence condition, not decoration.
                  attribution: attribution as string,
                },
              },
              layers: [{ id: 'basemap', type: 'raster' as const, source: 'basemap' }],
            };

        const map = new maplibre.Map({
          container: container.current,
          style,
          center: [centre.lng, centre.lat],
          zoom: 13,
          attributionControl: { compact: false },
        });
        mapRef.current = map;

        map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right');
        map.on('error', (event: { error?: { message?: string } }) => {
          setFailed(event.error?.message ?? 'The map provider returned an error.');
        });
        map.on('moveend', () => setMoved(true));

        for (const marker of markers) {
          const element = document.createElement('a');
          element.href = marker.href;
          element.textContent = marker.name;
          element.setAttribute('aria-label', `${marker.name} — ${marker.tierLabel}`);
          element.className = `map-marker map-marker--${marker.tier}`;
          if (marker.id === selectedId) element.setAttribute('data-selected', 'true');
          new maplibre.Marker({ element }).setLngLat([marker.lng, marker.lat]).addTo(map);
        }

        cleanup = () => map.remove();
      } catch (error) {
        if (!cancelled) {
          setFailed(error instanceof Error ? error.message : 'The map could not be loaded.');
        }
      }
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
    // Markers are re-created when the result set changes.
  }, [markers, selectedId, centre.lat, centre.lng, styleUrl, tileUrl, attribution]);

  function searchThisArea() {
    const map = mapRef.current as { getBounds?: () => { getNorth(): number; getSouth(): number; getEast(): number; getWest(): number } } | null;
    const bounds = map?.getBounds?.();
    if (!bounds) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set(
      'bbox',
      [bounds.getNorth(), bounds.getSouth(), bounds.getEast(), bounds.getWest()]
        .map((value) => value.toFixed(5))
        .join(','),
    );
    setMoved(false);
    router.push(`/search?${params.toString()}`, { scroll: false });
  }

  if (failed) {
    return (
      <div className="map-panel__body">
        <div>
          <p>
            <strong>The map could not be loaded.</strong>
          </p>
          <p className="small muted">{failed}</p>
          <p className="small muted">The list of results below is complete and unaffected.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div ref={container} className="map-surface" role="application" aria-label="Map of results" />
      {moved && (
        <div style={{ padding: 8, borderTop: '1px solid var(--border)' }}>
          <button className="button button--small button--primary" type="button" onClick={searchThisArea}>
            Search this area
          </button>
        </div>
      )}
    </>
  );
}
