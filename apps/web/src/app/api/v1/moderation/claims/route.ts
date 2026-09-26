import { moderationDecisionSchema } from '@gymgo/domain';
import { getCurrentUser } from '@/server/auth';
import { decideClaim } from '@/server/moderation';
import { failure, parseWith, readBody, success } from '@/server/api';

/**
 * POST /api/v1/moderation/claims — decide an ownership claim.
 *
 * Administrator only, because the evidence is personal. Approving grants
 * control of that one branch and nothing else; it does not mark any fact as
 * verified, and nobody can decide their own claim.
 */
export async function POST(request: Request) {
  const body = await readBody(request);
  try {
    const user = await getCurrentUser();
    const input = parseWith(moderationDecisionSchema, body.data);
    await decideClaim(user, input.id, input.decision, input.reason);
    return success(body, { status: input.decision }, {
      flash:
        input.decision === 'approve'
          ? 'Claim approved. That account can now submit changes for this branch, which still go to moderation.'
          : 'Claim rejected.',
    });
  } catch (error) {
    return failure(error, body);
  }
}
