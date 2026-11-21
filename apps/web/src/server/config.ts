/**
 * Runtime configuration.
 *
 * Every external dependency is optional and every one of them has an honest
 * "not configured" state. Nothing here reads a credential; the map provider is
 * configured with a public style/tile URL and the auth adapter is a local
 * development cookie, not a real identity provider.
 */

export type DataSource = 'demo' | 'none';
export type AuthAdapter = 'local-dev' | 'disabled';

const isProductionBuild = process.env.NODE_ENV === 'production';

function readDataSource(): DataSource {
  const raw = process.env.GYMGO_DATA_SOURCE;
  if (raw === 'demo') return 'demo';
  if (raw === 'none') return 'none';
  // Demo fixtures are fictional venues. They are opt-in for a production
  // build so they can never be mistaken for real listings.
  return isProductionBuild ? 'none' : 'demo';
}

function readAuthAdapter(): AuthAdapter {
  const raw = process.env.GYMGO_AUTH_ADAPTER;
  const requested: AuthAdapter = raw === 'local-dev' ? 'local-dev' : raw === 'disabled' ? 'disabled' : isProductionBuild ? 'disabled' : 'local-dev';

  if (requested === 'local-dev' && isProductionBuild) {
    // The local adapter lets anyone pick any role. Allowing it in a production
    // build takes a second, deliberate opt-in, and the UI says so on every page.
    if (process.env.GYMGO_ALLOW_DEV_AUTH_IN_PROD !== 'yes-i-understand') return 'disabled';
  }
  return requested;
}

export interface MapProviderConfig {
  configured: boolean;
  /** A full MapLibre style document URL. */
  styleUrl: string | null;
  /** Or a raster tile template, with its required attribution. */
  tileUrl: string | null;
  attribution: string | null;
}

function readMapProvider(): MapProviderConfig {
  const styleUrl = process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? null;
  const tileUrl = process.env.NEXT_PUBLIC_MAP_TILE_URL ?? null;
  const attribution = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ?? null;
  return {
    // A raster source without attribution is not a usable configuration:
    // tile services impose attribution requirements we will not quietly drop.
    configured: Boolean(styleUrl) || Boolean(tileUrl && attribution),
    styleUrl,
    tileUrl,
    attribution,
  };
}

export const config = {
  isProductionBuild,
  dataSource: readDataSource(),
  authAdapter: readAuthAdapter(),
  map: readMapProvider(),
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  /** True when development sign-in is live inside a production build. */
  devAuthInProduction: isProductionBuild && readAuthAdapter() === 'local-dev',
} as const;

/** The pilot's recheck targets. Configurable, and stated wherever they matter. */
export const PILOT_FRESHNESS = {
  visitorPriceAccessDays: 30,
  equipmentDays: 90,
  amenityDays: 180,
} as const;

export const PILOT_AREA = {
  label: 'Inner Sydney',
  timezone: 'Australia/Sydney',
  centre: { lat: -33.8846, lng: 151.2113 },
  currency: 'AUD',
} as const;
