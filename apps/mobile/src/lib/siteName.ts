/**
 * A website as people say it: "franksgymperth.com" from
 * "https://www.FranksGymPerth.com/contact?x=1", or null if it isn't a web
 * address.
 *
 * Worked out here rather than with `new URL(...).hostname`, which differs
 * by platform: a browser lower-cases the host and refuses an address with
 * no scheme, while React Native's URL keeps the capitals, reads only
 * lower-case http(s) and refuses nothing, giving "" (a credit with no name
 * on a phone).
 */
export function siteName(website: string): string | null {
  const match = website.trim().match(/^[a-z][a-z\d+.-]*:\/\/(?:[^@/?#]*@)?([^:/?#]+)/i);
  const host = match?.[1]?.toLowerCase().replace(/^www\./, '');
  return host || null;
}
