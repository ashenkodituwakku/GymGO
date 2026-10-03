import { search } from '@gymgo/domain';
import { loadGymRecords, loadPublishedReviewsByGym } from '@/server/gyms';
import { PILOT_FRESHNESS } from '@/server/config';
import { parseSearchParams, type ParamsRecord } from '@/server/search-params';

/**
 * GET /api/v1/gyms — the same search the web pages run.
 *
 * Accepts the same query parameters as /search, so a URL from the interface
 * can be pasted here. Responses carry the tier and the reasons, because a
 * client that only sees a list of gyms cannot tell a confirmed match from a
 * guess. See docs/API.md.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const params: ParamsRecord = {};
  for (const key of new Set(url.searchParams.keys())) {
    const values = url.searchParams.getAll(key);
    params[key] = values.length > 1 ? values : values[0];
  }

  const parsed = parseSearchParams(params);
  const records = await loadGymRecords();
  const reviewsByGymId = await loadPublishedReviewsByGym();
  const outcome = search({
    records,
    reviewsByGymId,
    query: parsed.query,
    asOf: new Date(),
    policy: PILOT_FRESHNESS,
  });

  return Response.json({
    query: {
      place: parsed.placeName,
      outOfArea: parsed.outOfArea,
      visitDate: parsed.query.visitDate,
      visitMinuteOfDay: parsed.query.visitMinuteOfDay,
      timezone: parsed.query.timezone,
      budgetMinor: parsed.query.budgetMinor,
      requiredEquipment: parsed.query.requiredEquipment,
      requiredAmenities: parsed.query.requiredAmenities,
      sort: parsed.query.sort,
    },
    counts: outcome.counts,
    sortDescription: outcome.sortDescription,
    relaxations: outcome.relaxations.map((relaxation) => ({
      kind: relaxation.kind,
      label: relaxation.label,
      confirmedCount: relaxation.confirmedCount,
    })),
    results: outcome.results.map((result) => ({
      id: result.record.location.id,
      slug: result.record.location.slug,
      name: result.record.location.name,
      branch: result.record.location.branch,
      suburb: result.record.location.address.suburb,
      position: result.record.location.position,
      isDemoData: result.record.location.isDemoData,
      distanceKm: result.distanceKm === null ? null : Number(result.distanceKm.toFixed(2)),
      tier: result.tier,
      access: {
        verdict: result.access.verdict,
        reasons: result.access.reasons,
      },
      visitCost: result.offers.bestAvailable
        ? {
            offerLabel: result.offers.bestAvailable.offer.label,
            productType: result.offers.bestAvailable.offer.productType,
            currency: result.offers.bestAvailable.cost.currency,
            // Null, never zero, when the total is not confirmed.
            totalNonRefundableMinor: result.offers.bestAvailable.cost.totalNonRefundableMinor,
            depositsMinor: result.offers.bestAvailable.cost.depositsMinor,
            cashNeededTodayMinor: result.offers.bestAvailable.cost.cashNeededTodayMinor,
            confirmed: result.offers.confirmed !== null,
          }
        : null,
      equipment: result.equipment.matches.map((match) => ({
        equipmentTypeId: match.requirement.equipmentTypeId,
        minMaxWeightKg: match.requirement.minMaxWeightKg ?? null,
        state: match.state,
        detail: match.detail,
      })),
      rating: result.rating,
      limitations: result.limitations,
    })),
  });
}
