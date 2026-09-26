import { ownerReplyInputSchema } from '@gymgo/domain';
import { getCurrentUser } from '@/server/auth';
import { submitOwnerReply } from '@/server/contributions';
import { failure, parseWith, readBody, success } from '@/server/api';

/**
 * POST /api/v1/owner/replies — reply to a review of your own branch.
 *
 * The gym id comes from the body and is checked against the caller's approved
 * branches on the server. An owner of one branch replying on another is
 * refused here, not merely hidden in the interface.
 */
export async function POST(request: Request) {
  const body = await readBody(request);
  try {
    const user = await getCurrentUser();
    const gymId = typeof body.data.gymId === 'string' ? body.data.gymId : '';
    const input = parseWith(ownerReplyInputSchema, body.data);
    await submitOwnerReply(user, gymId, input);
    return success(body, { status: 'pending' }, {
      flash: 'Your reply has been submitted and will appear once a moderator approves it.',
    });
  } catch (error) {
    return failure(error, body);
  }
}
