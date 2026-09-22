import { reviewInputSchema } from '@gymgo/domain';
import { getCurrentUser } from '@/server/auth';
import { submitReview } from '@/server/contributions';
import { coerceNumbers, coerceOptionalStrings, failure, parseWith, readBody, success } from '@/server/api';

/**
 * POST /api/v1/reviews — submit a first-party review.
 *
 * Always lands as `pending`. Nothing here can publish a review, and the
 * `verifiedVisit` flag is not accepted from the client at all: there is no
 * visit-evidence mechanism in the pilot, so nothing can set it.
 */
export async function POST(request: Request) {
  const body = await readBody(request);
  try {
    const user = await getCurrentUser();
    const input = parseWith(
      reviewInputSchema,
      coerceOptionalStrings(
        coerceNumbers(body.data, ['overall', 'equipment', 'cleanliness', 'atmosphere', 'value']),
        ['visitedOn'],
      ),
    );
    const review = await submitReview(user, input);
    return success(body, { reviewId: review.id, status: review.status }, {
      flash: 'Your review has been submitted and is waiting for moderation.',
    });
  } catch (error) {
    return failure(error, body);
  }
}
