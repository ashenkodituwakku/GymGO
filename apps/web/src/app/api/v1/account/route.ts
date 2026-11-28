import { getCurrentUser, deleteAccount, signOut } from '@/server/auth';
import { failure, readBody, success } from '@/server/api';

/**
 * DELETE /api/v1/account — delete the signed-in account.
 *
 * Implemented before public registration exists, as it has to be. It removes
 * the account and its private ownership evidence, and redacts the authorship
 * of contributions rather than erasing a gym's correction history.
 */
export async function POST(request: Request) {
  const body = await readBody(request);
  try {
    const user = await getCurrentUser();
    if (body.data.intent === 'sign-out') {
      await signOut();
      return success(body, { signedOut: true }, { flash: 'Signed out.' });
    }
    if (user.role === 'anonymous') {
      return failure({ status: 401, message: 'You are not signed in.' }, body);
    }
    await deleteAccount(user.id);
    return success(body, { deleted: true }, { flash: 'Your account and its evidence have been deleted.' });
  } catch (error) {
    return failure(error, body);
  }
}
