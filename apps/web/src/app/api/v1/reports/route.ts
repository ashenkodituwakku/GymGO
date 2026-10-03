import { contentReportInputSchema } from '@gymgo/domain';
import { getCurrentUser } from '@/server/auth';
import { reportContent } from '@/server/contributions';
import { failure, parseWith, readBody, success } from '@/server/api';

/** POST /api/v1/reports — report a review or listing. Open to anyone. */
export async function POST(request: Request) {
  const body = await readBody(request);
  try {
    const user = await getCurrentUser();
    const input = parseWith(contentReportInputSchema, body.data);
    const report = await reportContent(user, input);
    return success(body, { reportId: report.id }, {
      flash: 'Thank you. A moderator will look at this.',
    });
  } catch (error) {
    return failure(error, body);
  }
}
