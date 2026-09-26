/**
 * Sending email, for bug reports.
 *
 * GymGO has no email service of its own. The owner points the server at an
 * SMTP account they already have (a Gmail address with an app password
 * works, for nothing), and the server sends through that. Without one it
 * sends nothing, and says so when it starts.
 */

import nodemailer from 'nodemailer';

export interface MailMessage {
  to: string[];
  subject: string;
  text: string;
  /** Where a reply goes: the person who reported the bug, when they asked for one. */
  replyTo?: string | null;
}

export type SendMail = (message: MailMessage) => Promise<void>;

/** A plausible single email address: no spaces, no line breaks, one @. */
export function isEmailAddress(value: string): boolean {
  return value.length <= 254 && /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/.test(value);
}

/** One line of a header: no line breaks or control characters, however it was typed. */
export function headerSafe(value: string, max: number): string {
  // eslint-disable-next-line no-control-regex
  const flat = value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

/**
 * Who the mail says it's from. Mail services only send as the account that
 * signed in, so by default that's the SMTP user; GYMGO_MAIL_FROM can say
 * otherwise where the service allows it.
 */
export function senderFor(smtpUrl: string, from: string | null): string | null {
  if (from) return from;
  try {
    const user = decodeURIComponent(new URL(smtpUrl).username);
    return isEmailAddress(user) ? `"GymGO" <${user}>` : null;
  } catch {
    return null;
  }
}

/**
 * Sends through the SMTP server in `smtpUrl`, e.g.
 * smtps://you%40gmail.com:app-password@smtp.gmail.com:465
 */
export function smtpMailer(smtpUrl: string, from: string): SendMail {
  const transport = nodemailer.createTransport(smtpUrl, {
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return async (message) => {
    await transport.sendMail({
      from,
      to: message.to,
      subject: headerSafe(message.subject, 150),
      text: message.text,
      ...(message.replyTo && isEmailAddress(message.replyTo) ? { replyTo: message.replyTo } : {}),
    });
  };
}
