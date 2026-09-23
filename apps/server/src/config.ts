import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEMO_GYMS } from '@gymgo/demo-data';
import { MELBOURNE_ATTRIBUTION, MELBOURNE_GYMS } from '@gymgo/melbourne-data';

const here = dirname(fileURLToPath(import.meta.url));

export const DB_PATH = process.env.GYMGO_DB ?? join(here, '..', 'data', 'gymgo.db');
export const PORT = Number(process.env.PORT ?? 4000);
export const HOST = process.env.HOST ?? '0.0.0.0';
export const ALLOWED_ORIGINS = (process.env.GYMGO_ALLOWED_ORIGINS ?? '').split(',').map((item) => item.trim()).filter(Boolean);

/** Real Melbourne gyms first; the invented Sydney set stays, clearly flagged, for testing. */
export const GYM_RECORDS = [...MELBOURNE_GYMS, ...DEMO_GYMS];
export const ATTRIBUTION = MELBOURNE_ATTRIBUTION;
