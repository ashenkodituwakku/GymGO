/**
 * The gym repository.
 *
 * Base records come from a data source (the demo fixtures locally, a database
 * in production). Approved corrections are stored as patches and applied on
 * read, so the original source and the correction history both survive and a
 * pending change can never overwrite a confirmed fact in place.
 */

import type { GymRecord, Provenance, Review } from '@gymgo/domain';
import { DEMO_GYMS } from '@/fixtures/gyms';
import { config } from './config';
import { readStore, type AppliedPatch } from './store';

/** Annotations shown beside a fact after a moderator approved a correction. */
export interface RecordAnnotation {
  targetKind: string;
  targetId: string | null;
  text: string;
  appliedAt: string;
}

export interface LoadedGym {
  record: GymRecord;
  annotations: RecordAnnotation[];
}

function baseRecords(): GymRecord[] {
  if (config.dataSource === 'none') return [];

  // Belt and braces: even when demo data is explicitly enabled, anything
  // without the demo flag would be a real venue and has no business in here.
  return DEMO_GYMS.filter((record) => record.location.isDemoData);
}

/** Provenance stamped onto a fact that a moderator approved from a correction. */
function correctionProvenance(patch: AppliedPatch): Provenance {
  return {
    status: 'community_reported',
    sources: [
      {
        id: `ev-correction-${patch.correctionId}`,
        sourceType: 'community_report',
        evidenceRef: patch.correctionId,
        label: 'Correction approved by a moderator',
        observedAt: patch.appliedAt,
        // A moderator approving a correction is real evidence with a real
        // date, so this genuinely is a new check. A scheduled job finding
        // nothing new never gets to write here.
        checkedAt: patch.appliedAt,
        reviewerId: patch.appliedBy,
      },
    ],
    conflictNote: null,
  };
}

function applyPatch(record: GymRecord, patch: AppliedPatch): GymRecord {
  const change = patch.change;

  switch (change.kind) {
    case 'offer_price':
      return {
        ...record,
        offers: record.offers.map((offer) =>
          offer.id === change.offerId
            ? { ...offer, baseAmountMinor: change.baseAmountMinor, provenance: correctionProvenance(patch) }
            : offer,
        ),
      };

    case 'equipment': {
      const existing = record.equipment.find(
        (observation) => observation.equipmentTypeId === change.equipmentTypeId,
      );
      const updated = {
        id: existing?.id ?? `${record.location.id}-${change.equipmentTypeId}`,
        gymId: record.location.id,
        equipmentTypeId: change.equipmentTypeId,
        presence: change.presence,
        count: change.count,
        maxWeightKg: change.maxWeightKg,
        brand: existing?.brand ?? null,
        model: existing?.model ?? null,
        condition: existing?.condition ?? ('unknown' as const),
        conditionObservedAt: existing?.conditionObservedAt ?? null,
        provenance: correctionProvenance(patch),
      };
      return {
        ...record,
        equipment: existing
          ? record.equipment.map((observation) =>
              observation.equipmentTypeId === change.equipmentTypeId ? updated : observation,
            )
          : [...record.equipment, updated],
      };
    }

    case 'operating_status':
      return {
        ...record,
        location: {
          ...record.location,
          operatingStatus: change.status,
          operatingStatusNote: change.note,
          provenance: correctionProvenance(patch),
        },
      };

    case 'annotation':
      // Annotations do not change any value; they are shown beside the fact.
      return record;
  }
}

export async function loadGyms(): Promise<LoadedGym[]> {
  const store = await readStore();
  const patchesByGym = new Map<string, AppliedPatch[]>();
  for (const patch of store.appliedPatches) {
    const list = patchesByGym.get(patch.gymId) ?? [];
    list.push(patch);
    patchesByGym.set(patch.gymId, list);
  }

  return baseRecords().map((base) => {
    const patches = (patchesByGym.get(base.location.id) ?? []).sort((a, b) =>
      a.appliedAt.localeCompare(b.appliedAt),
    );
    let record = base;
    const annotations: RecordAnnotation[] = [];
    for (const patch of patches) {
      record = applyPatch(record, patch);
      if (patch.change.kind === 'annotation') {
        annotations.push({
          targetKind: patch.targetKind,
          targetId: patch.targetId,
          text: patch.change.text,
          appliedAt: patch.appliedAt,
        });
      }
    }
    return { record, annotations };
  });
}

export async function loadGymRecords(): Promise<GymRecord[]> {
  return (await loadGyms()).map((loaded) => loaded.record);
}

export async function findGymBySlug(slug: string): Promise<LoadedGym | null> {
  const gyms = await loadGyms();
  return gyms.find((gym) => gym.record.location.slug === slug) ?? null;
}

export async function findGymById(id: string): Promise<LoadedGym | null> {
  const gyms = await loadGyms();
  return gyms.find((gym) => gym.record.location.id === id) ?? null;
}

/** Published reviews grouped by gym, for search ranking. */
export async function loadPublishedReviewsByGym(): Promise<Record<string, Review[]>> {
  const store = await readStore();
  const grouped: Record<string, Review[]> = {};
  for (const review of store.reviews) {
    if (review.status !== 'published') continue;
    (grouped[review.gymId] ??= []).push(review);
  }
  return grouped;
}

/** Every review for one gym, including the caller's own pending submissions. */
export async function loadReviewsForGym(gymId: string): Promise<Review[]> {
  const store = await readStore();
  return store.reviews
    .filter((review) => review.gymId === gymId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
