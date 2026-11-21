/**
 * Local persistence.
 *
 * Contributions are written to a JSON file under `.data/`. This is a real
 * store — restart the server and your pending correction is still pending —
 * but it is a development store, not the production one. Production uses
 * PostgreSQL/PostGIS; see docs/ARCHITECTURE.md for the schema and for why a
 * file store would not survive a serverless deployment.
 */

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type {
  ContentReport,
  Correction,
  ModerationEvent,
  OwnershipClaim,
  Review,
  User,
} from '@gymgo/domain';

/**
 * A structured change approved by a moderator and applied over the base
 * record. Keeping these separate from the base data means the original source
 * and the correction history both survive.
 */
export interface AppliedPatch {
  id: string;
  correctionId: string;
  gymId: string;
  targetKind: Correction['targetKind'];
  targetId: string | null;
  /** Narrow, typed changes only. Free-text corrections become annotations. */
  change:
    | { kind: 'offer_price'; offerId: string; baseAmountMinor: number }
    | { kind: 'equipment'; equipmentTypeId: string; presence: 'yes' | 'no'; maxWeightKg: number | null; count: number | null }
    | { kind: 'operating_status'; status: 'open' | 'temporarily_closed' | 'permanently_closed'; note: string }
    | { kind: 'annotation'; text: string };
  appliedBy: string;
  appliedAt: string;
}

/** Ownership evidence, held apart from anything a public response can reach. */
export interface PrivateEvidence {
  claimId: string;
  evidenceRef: string;
  storedAt: string;
  /** Deleted with the claim record; see docs/ARCHITECTURE.md on retention. */
  retentionNote: string;
}

export interface StoreShape {
  version: 1;
  users: User[];
  reviews: Review[];
  corrections: Correction[];
  claims: OwnershipClaim[];
  moderationEvents: ModerationEvent[];
  contentReports: ContentReport[];
  appliedPatches: AppliedPatch[];
  privateEvidence: PrivateEvidence[];
  /**
   * The machine-readable part of a pending correction, keyed by correction id.
   * Present only when the contributor gave structured values; free-text
   * corrections become annotations on approval instead.
   */
  pendingStructured: Record<string, StructuredChange>;
}

/** The structured half of a correction, before a moderator decides on it. */
export type StructuredChange =
  | { kind: 'offer_price'; offerId: string; baseAmountMinor: number }
  | { kind: 'equipment'; equipmentTypeId: string; presence: 'yes' | 'no'; maxWeightKg: number | null; count: number | null }
  | { kind: 'operating_status'; status: 'open' | 'temporarily_closed' | 'permanently_closed'; note: string };

/**
 * Resolved on each call rather than at import time, so a test can point the
 * store at a temporary directory without having to control module load order.
 */
function dataFile(): string {
  return join(process.env.GYMGO_DATA_DIR ?? join(process.cwd(), '.data'), 'gymgo.json');
}

function emptyStore(): StoreShape {
  return {
    version: 1,
    users: [],
    reviews: [],
    corrections: [],
    claims: [],
    moderationEvents: [],
    contentReports: [],
    appliedPatches: [],
    privateEvidence: [],
    pendingStructured: {},
  };
}

let cache: StoreShape | null = null;
/** Serialises writes so two concurrent requests cannot clobber each other. */
let writeChain: Promise<void> = Promise.resolve();

async function load(): Promise<StoreShape> {
  if (cache) return cache;
  const file = dataFile();
  try {
    const raw = await readFile(file, 'utf8');
    const parsed = JSON.parse(raw) as StoreShape;
    cache = { ...emptyStore(), ...parsed, version: 1 };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') {
      // A corrupt file should be loud, not silently replaced with an empty one.
      if (!(error instanceof SyntaxError)) throw error;
      throw new Error(
        `The local data file at ${file} is not valid JSON. Move it aside to start fresh.`,
      );
    }
    cache = emptyStore();
  }
  return cache;
}

export async function readStore(): Promise<Readonly<StoreShape>> {
  return load();
}

/**
 * Apply a mutation and persist it.
 *
 * The write is atomic (temp file + rename) so an interrupted process cannot
 * leave a half-written store behind.
 */
export async function mutateStore<T>(mutator: (store: StoreShape) => T): Promise<T> {
  const store = await load();
  const result = mutator(store);

  const file = dataFile();
  const run = writeChain.then(async () => {
    await mkdir(dirname(file), { recursive: true });
    const temporary = `${file}.${process.pid}.tmp`;
    await writeFile(temporary, JSON.stringify(store, null, 2), 'utf8');
    await rename(temporary, file);
  });
  writeChain = run.catch(() => undefined);
  await run;

  return result;
}

/** Test helper: forget the cached store so a fresh file is read. */
export function resetStoreCache(): void {
  cache = null;
}

export function newId(prefix: string): string {
  // Not cryptographic; these are opaque record ids, not secrets.
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
