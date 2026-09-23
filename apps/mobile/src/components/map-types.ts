import type { LatLng, ResultTier } from '@gymgo/domain';

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
  showsUserLocation: boolean;
  onSelect: (id: string) => void;
  onMapPress: () => void;
}

export interface GymMapHandle {
  /** Move the camera; `span` is the visible latitude range in degrees. */
  flyTo: (centre: LatLng, span?: number) => void;
  /** Frame every one of these points, clear of the sheet and controls. */
  fitTo: (points: LatLng[]) => void;
}
