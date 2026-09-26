/**
 * Bug reports from the app, kept here and emailed to the GymGO team.
 *
 * Anyone can send one, signed in or not: bugs don't wait for an account.
 * Each is kept in the database first, so nothing is lost when email isn't
 * set up or the mail server is down; the email is a copy. Unsent reports
 * are tried again (five times at most), and no more than a set number go
 * out a day, so a flood of reports can't flood the team's inboxes.
 */

import { randomUUID } from 'node:crypto';
import type { Db } from './db';
import { headerSafe, isEmailAddress, type SendMail } from './mail';

export const BUG_REPORT_LIMITS = {
  /** Enough to say what went wrong. */
  minChars: 10,
  maxChars: 4000,
  /** Device details: this many at most, each this long. */
  contextItems: 16,
  contextValueChars: 200,
};

/** Tries per report before it's marked failed and left for moderators to read. */
export const MAX_ATTEMPTS = 5;

export class BugReportError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface CleanBugReport {
  description: string;
  replyTo: string | null;
  /** What the app said about itself (version, platform, screen), each a label and its value. */
  context: Array<{ label: string; value: string }>;
}

/** A report from the app, checked field by field. */
export function cleanBugReport(input: unknown): CleanBugReport {
  const body = (input ?? {}) as Record<string, unknown>;
  const description = typeof body.description === 'string' ? body.description.replace(/\r\n?/g, '\n').trim() : '';
  if (description.length < BUG_REPORT_LIMITS.minChars) throw new BugReportError(400, 'Say a little more about what went wrong.');
  if (description.length > BUG_REPORT_LIMITS.maxChars) {
    throw new BugReportError(400, `Keep it under ${BUG_REPORT_LIMITS.maxChars.toLocaleString('en-US')} characters.`);
  }
  let replyTo: string | null = null;
  if (body.replyTo !== undefined && body.replyTo !== null && body.replyTo !== '') {
    const typed = typeof body.replyTo === 'string' ? body.replyTo.trim() : '';
    if (!isEmailAddress(typed)) throw new BugReportError(400, 'That email address doesn’t look right.');
    replyTo = typed;
  }
  const context = (Array.isArray(body.context) ? body.context : [])
    .slice(0, BUG_REPORT_LIMITS.contextItems)
    .map((raw) => {
      const item = (raw ?? {}) as Record<string, unknown>;
      const label = typeof item.label === 'string' ? headerSafe(item.label, 40) : '';
      const value = typeof item.value === 'string' ? headerSafe(item.value, BUG_REPORT_LIMITS.contextValueChars) : '';
      return label && value ? { label, value } : null;
    })
    .filter((item): item is { label: string; value: string } => item !== null);
  return { description, replyTo, context };
}

export interface Reporter {
  id: string;
  email: string;
  displayName: string;
}

interface BugReportRow {
  id: string;
  user_id: string | null;
  reply_to: string | null;
  description: string;
  context_json: string;
  status: 'pending' | 'sent' | 'failed';
  attempts: number;
  last_error: string | null;
  created_at: string;
  sent_at: string | null;
  email: string | null;
  display_name: string | null;
}

/** The email for one report: plain text, everything the team needs to follow it up. */
export function bugReportEmail(report: {
  id: string;
  description: string;
  replyTo: string | null;
  context: Array<{ label: string; value: string }>;
  reporter: Reporter | null;
  createdAt: string;
}): { subject: string; text: string } {
  const firstLine = report.description.split('\n').find((line) => line.trim()) ?? '';
  const who = report.reporter
    ? `${report.reporter.displayName} <${report.reporter.email}>, account ${report.reporter.id}`
    : 'Someone not signed in';
  const reply = report.replyTo ? `Reply to: ${report.replyTo} (they asked for a reply; replying to this email goes to them)` : 'They didn’t ask for a reply.';
  const device = report.context.length ? report.context.map((item) => `${item.label}: ${item.value}`).join('\n') : 'Not sent.';
  const text = [
    'Someone reported a bug in GymGO.',
    '',
    'WHAT WENT WRONG',
    report.description,
    '',
    'FROM',
    who,
    reply,
    '',
    'THEIR APP AND DEVICE',
    device,
    '',
    `Report ${report.id}, sent ${report.createdAt}.`,
    'It is also kept on the GymGO server, where moderators can read it in the app (Profile, Moderation).',
  ].join('\n');
  return { subject: `GymGO bug report: ${headerSafe(firstLine, 80)}`, text };
}

export class BugReports {
  private readonly sending = new Set<string>();

  constructor(
    private readonly db: Db,
    private readonly options: {
      send: SendMail | null;
      to: string[];
      now: () => Date;
      /** Emails a day at most; beyond it, reports wait for the next day. */
      perDay?: number;
      log?: (line: string) => void;
    },
  ) {}

  /** Whether reports are emailed at all (mail set up, and somewhere to send them). */
  get emailing(): boolean {
    return Boolean(this.options.send) && this.options.to.length > 0;
  }

  create(report: CleanBugReport, reporter: Reporter | null): string {
    const id = randomUUID();
    this.db
      .prepare(
        `insert into bug_reports (id, user_id, reply_to, description, context_json, status, attempts, created_at)
         values (?, ?, ?, ?, ?, 'pending', 0, ?)`,
      )
      .run(id, reporter?.id ?? null, report.replyTo, report.description, JSON.stringify(report.context), this.options.now().toISOString());
    return id;
  }

  private row(id: string): BugReportRow | undefined {
    return this.db
      .prepare(
        `select bug_reports.*, users.email, users.display_name from bug_reports
         left join users on users.id = bug_reports.user_id where bug_reports.id = ?`,
      )
      .get(id) as BugReportRow | undefined;
  }

  private sentToday(): number {
    const since = new Date(this.options.now().getTime() - 24 * 3_600_000).toISOString();
    const row = this.db.prepare(`select count(*) as n from bug_reports where status = 'sent' and sent_at >= ?`).get(since) as { n: number };
    return row.n;
  }

  /** Email one report. True once it's gone; false if it couldn't be (it stays for a later try). */
  async deliver(id: string): Promise<boolean> {
    const send = this.options.send;
    if (!send || this.options.to.length === 0 || this.sending.has(id)) return false;
    const row = this.row(id);
    if (!row || row.status !== 'pending') return row?.status === 'sent';
    if (this.sentToday() >= (this.options.perDay ?? 50)) return false;
    this.sending.add(id);
    try {
      const email = bugReportEmail({
        id: row.id,
        description: row.description,
        replyTo: row.reply_to,
        context: JSON.parse(row.context_json) as Array<{ label: string; value: string }>,
        reporter: row.user_id && row.email ? { id: row.user_id, email: row.email, displayName: row.display_name ?? '' } : null,
        createdAt: row.created_at,
      });
      await send({ to: this.options.to, subject: email.subject, text: email.text, replyTo: row.reply_to });
      this.db.prepare(`update bug_reports set status = 'sent', sent_at = ?, attempts = attempts + 1, last_error = null where id = ?`).run(this.options.now().toISOString(), id);
      return true;
    } catch (error) {
      const message = headerSafe(error instanceof Error ? error.message : String(error), 300);
      const attempts = row.attempts + 1;
      this.db
        .prepare(`update bug_reports set attempts = ?, last_error = ?, status = ? where id = ?`)
        .run(attempts, message, attempts >= MAX_ATTEMPTS ? 'failed' : 'pending', id);
      this.options.log?.(`[server] Couldn't email bug report ${id} (try ${attempts} of ${MAX_ATTEMPTS}): ${message}`);
      return false;
    } finally {
      this.sending.delete(id);
    }
  }

  /** Email one report, waiting at most `ms`; past that it carries on in the background. */
  async deliverWithin(id: string, ms: number): Promise<boolean> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const late = new Promise<boolean>((resolve) => {
      timer = setTimeout(() => resolve(false), ms);
    });
    try {
      return await Promise.race([this.deliver(id), late]);
    } finally {
      clearTimeout(timer);
    }
  }

  /** Email every report still waiting, oldest first. Returns how many went. */
  async deliverWaiting(): Promise<number> {
    if (!this.emailing) return 0;
    const waiting = this.db.prepare(`select id from bug_reports where status = 'pending' order by created_at limit 50`).all() as Array<{ id: string }>;
    let sent = 0;
    for (const { id } of waiting) if (await this.deliver(id)) sent += 1;
    return sent;
  }

  /** The latest reports, for moderators. */
  latest(limit = 50) {
    const rows = this.db
      .prepare(
        `select bug_reports.*, users.email, users.display_name from bug_reports
         left join users on users.id = bug_reports.user_id order by bug_reports.created_at desc limit ?`,
      )
      .all(limit) as unknown as BugReportRow[];
    return rows.map((row) => ({
      id: row.id,
      description: row.description,
      replyTo: row.reply_to,
      reporter: row.user_id ? { id: row.user_id, displayName: row.display_name, email: row.email } : null,
      context: JSON.parse(row.context_json) as Array<{ label: string; value: string }>,
      status: row.status,
      attempts: row.attempts,
      lastError: row.last_error,
      createdAt: row.created_at,
      sentAt: row.sent_at,
    }));
  }
}
