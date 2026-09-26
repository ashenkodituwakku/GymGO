import { moderationDecisionSchema } from '@gymgo/domain';
import { getCurrentUser } from '@/server/auth';
import { decideOwnerReply } from '@/server/moderation';
import { failure, parseWith, readBody, success } from '@/server/api';

/** POST /api/v1/moderation/replies — publish or reject an owner's reply. */
export async function POST(request: Request) {
  const body = await readBody(request);
  try {
    const user = await getCurrentUser();
    const input = parseWith(moderationDecisionSchema, body.data);
    await decideOwnerReply(user, input.id, input.decision, input.reason);
    return success(body, { status: input.decision }, { flash: 'Reply decided.' });
  } catch (error) {
    return failure(error, body);
  }
}
