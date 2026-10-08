import { getCurrentUser, signIn, signOut } from '@/server/auth';
import { failure, readBody, success } from '@/server/api';

/**
 * POST /api/v1/auth/session — sign in with a development persona.
 * DELETE — sign out.
 *
 * This is the local development adapter and nothing more. It is refused
 * outright unless the adapter is enabled, which never happens by default in a
 * production build.
 */
export async function POST(request: Request) {
  const body = await readBody(request);
  try {
    const persona = typeof body.data.persona === 'string' ? body.data.persona : '';
    const user = await signIn(persona);
    return success(body, { userId: user.id, role: user.role }, { flash: `Signed in as ${user.displayName}.` });
  } catch (error) {
    return failure(error, body);
  }
}

export async function DELETE() {
  await signOut();
  return Response.json({ ok: true });
}

export async function GET() {
  const user = await getCurrentUser();
  return Response.json({
    id: user.id,
    displayName: user.displayName,
    role: user.role,
    ownedGymIds: user.ownedGymIds,
  });
}
