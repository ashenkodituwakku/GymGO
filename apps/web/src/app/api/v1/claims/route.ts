import { ownershipClaimInputSchema } from '@gymgo/domain';
import { getCurrentUser } from '@/server/auth';
import { submitOwnershipClaim } from '@/server/contributions';
import { failure, parseWith, readBody, success } from '@/server/api';

/**
 * POST /api/v1/claims — ask for control of a branch.
 *
 * Submitting grants nothing. The claim sits pending until an administrator
 * decides it, and the evidence supplied goes to the private store, never to a
 * public response.
 */
export async function POST(request: Request) {
  const body = await readBody(request);
  try {
    const user = await getCurrentUser();
    const input = parseWith(ownershipClaimInputSchema, body.data);
    const claim = await submitOwnershipClaim(user, input);
    return success(
      body,
      // Note what is not here: evidenceRef.
      { claimId: claim.id, status: claim.status },
      { flash: 'Your claim has been submitted. It grants no access until an administrator approves it.' },
    );
  } catch (error) {
    return failure(error, body);
  }
}
