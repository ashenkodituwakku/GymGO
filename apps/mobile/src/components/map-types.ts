import type { BoundingBox, LatLng, ResultTier } from '@gymgo/domain';

export interface MapPin {
  id: string;
  name: string;
  position: LatLng;
  tier: ResultTier;
}

export interface GymMapProps {
  pins: MapPin[];
  selectedId: string | null;
  initialCentre: LatLng;
  /** Space the bottom sheet covers, so centring accounts for it. */
  bottomInset: number;
  topInset: number;
  /** Space a side panel covers (desktop web), so centring accounts for it. */
  leftInset?: number;
  showsUserLocation: boolean;
  /**
   * Where you are, for the maps that can't find you themselves (the browser
   * and Android's map page). iPhone's Apple map draws its own blue dot.
   */
  userLocation?: LatLng | null;
  onSelect: (id: string) => void;
  onMapPress: () => void;
  /** The area on screen, each time the map comes to rest after moving. */
  onRegionChange?: (box: BoundingBox) => void;
}

export interface GymMapHandle {
  /** Move the camera; `span` is the visible latitude range in degrees. */
  flyTo: (centre: LatLng, span?: number) => void;
  /** Frame every one of these points, clear of the sheet and controls. */
  fitTo: (points: LatLng[]) => void;
}
