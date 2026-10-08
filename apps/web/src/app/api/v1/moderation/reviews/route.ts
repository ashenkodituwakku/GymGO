import { moderationDecisionSchema } from '@gymgo/domain';
import { getCurrentUser } from '@/server/auth';
import { decideReview, removeReview } from '@/server/moderation';
import { failure, parseWith, readBody, success } from '@/server/api';

/**
 * POST /api/v1/moderation/reviews — publish, reject or remove a review.
 *
 * Owners deliberately lack this permission. A gym cannot delete a legitimate
 * negative review about itself; it can reply to it.
 */
export async function POST(request: Request) {
  const body = await readBody(request);
  try {
    const user = await getCurrentUser();
    if (body.data.decision === 'remove') {
      const id = typeof body.data.id === 'string' ? body.data.id : '';
      const reason = typeof body.data.reason === 'string' ? body.data.reason : '';
      await removeReview(user, id, reason);
      return success(body, { status: 'removed' }, { flash: 'Review removed.' });
    }
    const input = parseWith(moderationDecisionSchema, body.data);
    await decideReview(user, input.id, input.decision, input.reason);
    return success(body, { status: input.decision }, {
      flash: input.decision === 'approve' ? 'Review published.' : 'Review rejected.',
    });
  } catch (error) {
    return failure(error, body);
  }
}
