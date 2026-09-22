'use client';

import dynamic from 'next/dynamic';
import type { ResultTier } from '@gymgo/domain';

export interface MapMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  tier: ResultTier;
  tierLabel: string;
  href: string;
}

const MapCanvas = dynamic(() => import('./MapCanvas'), {
  ssr: false,
  loading: () => <div className="map-panel__body">Loading the map…</div>,
});

/**
 * The map slot.
 *
 * With no basemap provider configured this says so plainly rather than drawing
 * an illustration of a map. An invented picture of a city would be worse than
 * no map: it would look like geography and mean nothing. The list view is the
 * full alternative and is never hidden behind the map on any screen size.
 */
export function MapPanel({
  markers,
  selectedId,
  centre,
  provider,
  resultCount,
}: {
  markers: MapMarker[];
  selectedId: string | null;
  centre: { lat: number; lng: number };
  provider: { configured: boolean; styleUrl: string | null; tileUrl: string | null; attribution: string | null };
  resultCount: number;
}) {
  if (!provider.configured) {
    return (
      <div className="map-panel">
        <div className="map-panel__body">
          <div className="stack stack--tight">
            <p>
              <strong>Map tiles are not configured.</strong>
            </p>
            <p className="small">
              A basemap needs a licence suitable for a directory, so this build ships without one
              rather than borrowing tiles it has no right to. Set NEXT_PUBLIC_MAP_STYLE_URL, or
              NEXT_PUBLIC_MAP_TILE_URL together with NEXT_PUBLIC_MAP_ATTRIBUTION, to turn the map
              on.
            </p>
            <p className="small muted">
              {resultCount === 0
                ? 'Nothing to plot for this search.'
                : `All ${resultCount} results are listed beside this panel, with straight-line distances.`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="map-panel">
      <MapCanvas
        markers={markers}
        selectedId={selectedId}
        centre={centre}
        styleUrl={provider.styleUrl}
        tileUrl={provider.tileUrl}
        attribution={provider.attribution}
      />
    </div>
  );
}
