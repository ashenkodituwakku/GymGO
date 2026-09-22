import { moderationDecisionSchema } from '@gymgo/domain';
import { getCurrentUser } from '@/server/auth';
import { decideCorrection } from '@/server/moderation';
import { failure, parseWith, readBody, success } from '@/server/api';

/**
 * POST /api/v1/moderation/corrections — decide a correction.
 *
 * Approving applies a structured change where the contributor gave one, with
 * fresh provenance naming the correction and the moderator. Otherwise the
 * correction is published beside the fact rather than overwriting it.
 */
export async function POST(request: Request) {
  const body = await readBody(request);
  try {
    const user = await getCurrentUser();
    const input = parseWith(moderationDecisionSchema, body.data);
    await decideCorrection(user, input.id, input.decision, input.reason);
    return success(body, { status: input.decision }, {
      flash: input.decision === 'approve' ? 'Correction applied.' : 'Correction rejected.',
    });
  } catch (error) {
    return failure(error, body);
  }
}
