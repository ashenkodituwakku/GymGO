/**
 * Whether Google's free embeds (its map, Street View) can load here.
 *
 * An embed that can't reach Google gives nothing to catch: a browser's
 * frame shows its broken-page icon, and a phone's web view stays a blank
 * grey box. So before an embed is shown, one tiny request goes to Google's
 * connectivity check, which answers with nothing at all. It's made once and
 * shared by every embed; after a failure the next embed (or Try again) asks
 * afresh.
 */

import { useCallback, useEffect, useState } from 'react';

const PROBE = 'https://www.google.com/generate_204';
const PROBE_TIMEOUT_MS = 8000;

let probe: Promise<boolean> | null = null;

async function check(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    // "no-cors": the answer isn't read, only whether one came.
    await fetch(PROBE, { mode: 'no-cors', cache: 'no-store', signal: controller.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Whether Google answered; failures aren't kept, so asking again tries again. */
export function googleReachable(): Promise<boolean> {
  const current = (probe ??= check());
  return current.then((ok) => {
    if (!ok && probe === current) probe = null;
    return ok;
  });
}

export type GoogleReach = 'checking' | 'ok' | 'failed';

export function useGoogleReach(): { reach: GoogleReach; retry: () => void } {
  const [reach, setReach] = useState<GoogleReach>('checking');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setReach('checking');
    void googleReachable().then((ok) => live && setReach(ok ? 'ok' : 'failed'));
    return () => {
      live = false;
    };
  }, [attempt]);
  const retry = useCallback(() => setAttempt((count) => count + 1), []);
  return { reach, retry };
}
