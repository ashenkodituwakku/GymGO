/**
 * GymGO's legal documents as public web pages: /terms, /privacy, /refunds
 * and /community, and /legal listing them. Stripe's settings, the app
 * stores' listings and emails need addresses for these, so they're plain
 * pages anyone can open, made from the same text the app shows
 * (@gymgo/domain's legal.ts).
 *
 * Also /.well-known/security.txt (RFC 9116), saying where to report a
 * security problem.
 */

import {
  LEGAL_DOC_IDS,
  LEGAL_TITLES,
  LEGAL_UPDATED,
  legalDoc,
  legalLinks,
  type LegalDocId,
  type LegalOperator,
} from '@gymgo/domain';

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function inline(paragraph: string): string {
  return legalLinks(paragraph)
    .map((piece) =>
      'doc' in piece
        ? `<a href="/${piece.doc}">${escape(piece.text)}</a>`
        : 'url' in piece
          ? `<a href="${escape(piece.url)}" rel="noopener noreferrer">${escape(piece.text)}</a>`
          : escape(piece.text),
    )
    .join('');
}

const STYLE = `
  :root { color-scheme: light dark; --ink: #1c1c1e; --muted: #6c6c70; --line: #e5e5ea; --bg: #f2f2f7; --card: #fff; --link: #4f40e8; }
  @media (prefers-color-scheme: dark) { :root { --ink: #f2f2f7; --muted: #a1a1a6; --line: #38383a; --bg: #000; --card: #1c1c1e; --link: #9d94ff; } }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 17px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
  main { max-width: 720px; margin: 0 auto; padding: 32px 20px 64px; }
  header { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
  header a { color: var(--ink); text-decoration: none; font-weight: 700; font-size: 19px; letter-spacing: -0.01em; }
  header a span { color: var(--link); }
  h1 { font-size: 32px; line-height: 1.15; letter-spacing: -0.02em; margin: 0 0 6px; }
  .updated { color: var(--muted); margin: 0 0 28px; font-size: 15px; }
  section { background: var(--card); border-radius: 16px; padding: 18px 20px; margin: 0 0 14px; }
  h2 { font-size: 19px; margin: 0 0 8px; letter-spacing: -0.01em; }
  p { margin: 0 0 10px; }
  p:last-child, ul:last-child { margin-bottom: 0; }
  ul { margin: 0 0 10px; padding-left: 22px; }
  li { margin: 0 0 6px; }
  a { color: var(--link); }
  nav { margin-top: 28px; color: var(--muted); font-size: 15px; display: flex; flex-wrap: wrap; gap: 6px 16px; }
  nav a { color: var(--muted); }
  .docs { list-style: none; padding: 0; }
  .docs li { margin: 0 0 10px; }
  .docs a { display: block; background: var(--card); border-radius: 16px; padding: 16px 20px; text-decoration: none; color: var(--ink); }
  .docs strong { display: block; font-size: 18px; }
  .docs small { color: var(--muted); font-size: 15px; }
`;

function shell(title: string, body: string, current: LegalDocId | null): string {
  const nav = LEGAL_DOC_IDS.map((id) => (id === current ? `<span>${LEGAL_TITLES[id]}</span>` : `<a href="/${id}">${LEGAL_TITLES[id]}</a>`)).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)} · GymGO</title>
<style>${STYLE}</style>
</head>
<body>
<main>
<header><a href="/legal">Gym<span>GO</span></a></header>
${body}
<nav aria-label="Legal documents">${nav}</nav>
</main>
</body>
</html>`;
}

/** One document as a page. */
export function legalPage(id: LegalDocId, operator: LegalOperator): string {
  const doc = legalDoc(id, operator);
  const sections = doc.sections
    .map(
      (section) =>
        `<section><h2>${escape(section.heading)}</h2>${section.blocks
          .map((block) => (typeof block === 'string' ? `<p>${inline(block)}</p>` : `<ul>${block.list.map((item) => `<li>${inline(item)}</li>`).join('')}</ul>`))
          .join('')}</section>`,
    )
    .join('\n');
  return shell(doc.title, `<h1>${escape(doc.title)}</h1><p class="updated">Last updated ${LEGAL_UPDATED}</p>\n${sections}`, id);
}

/** The documents, listed. */
export function legalIndexPage(operator: LegalOperator): string {
  const items = LEGAL_DOC_IDS.map((id) => {
    const doc = legalDoc(id, operator);
    return `<li><a href="/${id}"><strong>${escape(doc.title)}</strong><small>${escape(doc.summary)}</small></a></li>`;
  }).join('');
  return shell('Legal', `<h1>Legal</h1><p class="updated">Last updated ${LEGAL_UPDATED}</p><ul class="docs">${items}</ul>`, null);
}

/** Where to report a security problem (RFC 9116), or null with no way to reach anyone. */
export function securityTxt(operator: LegalOperator, publicUrl: string | null, now: Date): string | null {
  if (!operator.email) return null;
  // The file must say when to stop trusting it: a year from now.
  const expires = new Date(now.getTime() + 365 * 24 * 60 * 60_000).toISOString().replace(/\.\d{3}Z$/, 'Z');
  const lines = [`Contact: mailto:${operator.email}`, `Expires: ${expires}`, 'Preferred-Languages: en'];
  if (publicUrl) lines.push(`Canonical: ${publicUrl}/.well-known/security.txt`, `Policy: ${publicUrl}/terms`);
  return `${lines.join('\n')}\n`;
}
