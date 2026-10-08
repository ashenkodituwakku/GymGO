import { correctionInputSchema } from '@gymgo/domain';
import { getCurrentUser } from '@/server/auth';
import { submitCorrection, type StructuredCorrection } from '@/server/contributions';
import { coerceOptionalStrings, failure, parseWith, readBody, success } from '@/server/api';

/**
 * POST /api/v1/corrections — suggest a correction.
 *
 * Where the contributor supplies machine-readable values we keep them, so an
 * approval can apply a real change rather than a note. Everything else is
 * published beside the fact instead of overwriting it.
 */
function readStructured(data: Record<string, unknown>): StructuredCorrection | undefined {
  const kind = data.targetKind;

  if (kind === 'offer_price' && typeof data.targetId === 'string' && data.newPrice) {
    const dollars = Number(data.newPrice);
    if (Number.isFinite(dollars) && dollars >= 0) {
      return { kind: 'offer_price', offerId: data.targetId, baseAmountMinor: Math.round(dollars * 100) };
    }
  }

  if (kind === 'equipment' && typeof data.targetId === 'string' && (data.presence === 'yes' || data.presence === 'no')) {
    const maxWeight = Number(data.maxWeightKg);
    const count = Number(data.count);
    return {
      kind: 'equipment',
      equipmentTypeId: data.targetId,
      presence: data.presence,
      maxWeightKg: Number.isFinite(maxWeight) && maxWeight > 0 ? maxWeight : null,
      count: Number.isFinite(count) && count > 0 ? count : null,
    };
  }

  if (
    kind === 'operating_status' &&
    (data.status === 'open' || data.status === 'temporarily_closed' || data.status === 'permanently_closed')
  ) {
    return {
      kind: 'operating_status',
      status: data.status,
      note: typeof data.proposedValue === 'string' ? data.proposedValue : '',
    };
  }

  return undefined;
}

export async function POST(request: Request) {
  const body = await readBody(request);
  try {
    const user = await getCurrentUser();
    const input = parseWith(
      correctionInputSchema,
      coerceOptionalStrings(body.data, ['targetId', 'evidenceUrl']),
    );
    const correction = await submitCorrection(user, input, readStructured(body.data));
    return success(body, { correctionId: correction.id, status: correction.status }, {
      flash: 'Thank you. Your correction is queued for review.',
    });
  } catch (error) {
    return failure(error, body);
  }
}
