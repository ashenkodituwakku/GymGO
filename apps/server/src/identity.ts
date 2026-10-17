/**
 * Sign in with Google and Sign in with Apple: checking the ID token the app
 * got from them.
 *
 * An ID token is a JSON Web Token signed by Google or Apple. It's trusted
 * only when:
 *  - its signature checks out against the provider's published public keys
 *    (RS256; fetched from the provider and kept for six hours);
 *  - it was issued by that provider, for one of GymGO's own client ids;
 *  - it hasn't expired (a minute's leeway for clocks);
 *  - it carries the nonce the app made for this sign-in, when it has one,
 *    so a token caught in transit can't be replayed.
 * Nothing else about the token is believed. An email counts only when the
 * provider says it's verified.
 *
 * GymGO never sees a Google or Apple password, and needs no secret for
 * this: the client ids are public, and the keys are the providers' public
 * keys.
 */

import { createHash, createPublicKey, verify, type JsonWebKey } from 'node:crypto';

export type Provider = 'google' | 'apple';

const ISSUERS: Record<Provider, string[]> = {
  google: ['https://accounts.google.com', 'accounts.google.com'],
  apple: ['https://appleid.apple.com'],
};

export const KEYS_URL: Record<Provider, string> = {
  google: 'https://www.googleapis.com/oauth2/v3/certs',
  apple: 'https://appleid.apple.com/auth/keys',
};

const KEEP_KEYS_MS = 6 * 3_600_000;
const LEEWAY_S = 60;

export class IdentityError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export interface VerifiedIdentity {
  provider: Provider;
  /** The provider's stable id for the person (never changes, unlike email). */
  subject: string;
  email: string | null;
  emailVerified: boolean;
  /** Google gives a name; Apple doesn't put one in the token. */
  name: string | null;
}

interface Jwk extends JsonWebKey {
  kid?: string;
  alg?: string;
  kty?: string;
}

export interface VerifierOptions {
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

/** Checks ID tokens, keeping each provider's keys between calls. */
export class IdentityVerifier {
  private readonly keys = new Map<Provider, { at: number; keys: Jwk[] }>();
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => Date;

  constructor(options: VerifierOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? (() => new Date());
  }

  async verify(provider: Provider, token: string, audiences: string[], nonce?: string | null): Promise<VerifiedIdentity> {
    if (audiences.length === 0) throw new IdentityError(`Sign in with ${label(provider)} isn’t set up on this server.`);
    const parts = typeof token === 'string' ? token.split('.') : [];
    if (parts.length !== 3) throw new IdentityError('That sign-in token isn’t in the right shape.');
    const [headPart, bodyPart, signaturePart] = parts as [string, string, string];
    const header = decodePart(headPart);
    const claims = decodePart(bodyPart);
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw new IdentityError('That sign-in token isn’t signed the expected way.');

    const jwk = await this.keyFor(provider, header.kid);
    const signed = verify(
      'RSA-SHA256',
      Buffer.from(`${headPart}.${bodyPart}`),
      createPublicKey({ key: jwk, format: 'jwk' }),
      Buffer.from(signaturePart, 'base64url'),
    );
    if (!signed) throw new IdentityError('That sign-in token’s signature doesn’t check out.');

    if (!ISSUERS[provider].includes(String(claims.iss))) throw new IdentityError('That sign-in token is from someone else.');
    const audience = Array.isArray(claims.aud) ? claims.aud.map(String) : [String(claims.aud)];
    if (!audience.some((item) => audiences.includes(item))) throw new IdentityError('That sign-in token was made for a different app.');
    const nowS = Math.floor(this.now().getTime() / 1000);
    if (typeof claims.exp !== 'number' || claims.exp + LEEWAY_S < nowS) throw new IdentityError('That sign-in has expired. Try again.');
    if (typeof claims.iat === 'number' && claims.iat - LEEWAY_S * 5 > nowS) throw new IdentityError('That sign-in token is dated in the future.');
    if (typeof claims.sub !== 'string' || !claims.sub) throw new IdentityError('That sign-in token doesn’t say who it’s for.');
    // The app sends the nonce it made; Apple's token carries its SHA-256.
    if (claims.nonce !== undefined || nonce) {
      const expected = typeof nonce === 'string' ? nonce : '';
      const hashed = createHash('sha256').update(expected).digest('hex');
      if (!expected || (claims.nonce !== expected && claims.nonce !== hashed)) throw new IdentityError('That sign-in doesn’t match this attempt. Try again.');
    }

    const email = typeof claims.email === 'string' && claims.email.includes('@') ? claims.email.trim().toLowerCase() : null;
    const emailVerified = claims.email_verified === true || claims.email_verified === 'true';
    const name = typeof claims.name === 'string' ? claims.name.trim() : null;
    return { provider, subject: claims.sub, email, emailVerified, name: name || null };
  }

  private async keyFor(provider: Provider, kid: string): Promise<Jwk> {
    const cached = this.keys.get(provider);
    const fresh = cached && this.now().getTime() - cached.at < KEEP_KEYS_MS;
    const found = fresh ? cached.keys.find((key) => key.kid === kid) : undefined;
    if (found) return found;
    // Unknown key: the provider may have rotated, so fetch again (a stale
    // copy is only refetched once a minute).
    if (!cached || !fresh || this.now().getTime() - cached.at > 60_000) {
      const response = await this.fetchImpl(KEYS_URL[provider], { signal: AbortSignal.timeout(8000) }).catch(() => null);
      if (!response?.ok) throw new IdentityError(`Couldn’t reach ${label(provider)} to check the sign-in. Try again.`);
      const body = (await response.json()) as { keys?: Jwk[] };
      this.keys.set(provider, { at: this.now().getTime(), keys: (body.keys ?? []).filter((key) => key.kty === 'RSA') });
    }
    const key = this.keys.get(provider)?.keys.find((item) => item.kid === kid);
    if (!key) throw new IdentityError('That sign-in token was signed with a key the provider doesn’t list.');
    return key;
  }
}

function decodePart(part: string): Record<string, unknown> {
  try {
    const value = JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
    if (value && typeof value === 'object') return value as Record<string, unknown>;
  } catch {
    // fall through
  }
  throw new IdentityError('That sign-in token isn’t in the right shape.');
}

export const label = (provider: Provider) => (provider === 'google' ? 'Google' : 'Apple');
