/**
 * What a bug report says about the app and the device it happened on.
 *
 * Only what helps find the bug: the app's version, the kind of device, the
 * screen it came from and the settings that change what's shown. Never
 * where you are, what you searched or your gyms. The form lists every line
 * before it's sent, and you can leave them all out.
 */

export interface DeviceFacts {
  appVersion: string;
  platform: string;
  osVersion: string | number | null;
  /** The browser, on the web. */
  userAgent: string | null;
  screen: { width: number; height: number; scale: number };
  /** Where the report was started from, e.g. "Explore". */
  from: string | null;
  country: string | null;
  appearance: string;
  accent: string;
  demo: boolean;
  signedIn: boolean;
  pro: boolean;
  locale: string | null;
  timeZone: string | null;
}

/** "Chrome 131", "Safari 18", "Firefox 130": enough to reproduce, not a fingerprint. */
export function browserName(userAgent: string): string {
  const pick = (name: string, pattern: RegExp) => {
    const match = userAgent.match(pattern);
    return match ? `${name} ${match[1]}` : null;
  };
  return (
    pick('Edge', /Edg\/(\d+)/) ??
    pick('Firefox', /Firefox\/(\d+)/) ??
    pick('Chrome', /Chrome\/(\d+)/) ??
    pick('Safari', /Version\/(\d+)[\d.]* .*Safari/) ??
    'another browser'
  );
}

const PLATFORM_NAME: Record<string, string> = { ios: 'iPhone (iOS)', android: 'Android', web: 'Web browser' };

/** The lines sent with a report, in the order the form lists them. */
export function deviceDetails(facts: DeviceFacts): Array<{ label: string; value: string }> {
  const lines: Array<{ label: string; value: string }> = [
    { label: 'App version', value: facts.appVersion },
    {
      label: 'Device',
      value: [
        PLATFORM_NAME[facts.platform] ?? facts.platform,
        facts.platform === 'web' && facts.userAgent ? browserName(facts.userAgent) : facts.osVersion !== null ? String(facts.osVersion) : null,
      ]
        .filter(Boolean)
        .join(', '),
    },
    { label: 'Screen', value: `${Math.round(facts.screen.width)} × ${Math.round(facts.screen.height)} pt at ${facts.screen.scale}×` },
  ];
  if (facts.from) lines.push({ label: 'Reported from', value: facts.from });
  lines.push(
    { label: 'Country setting', value: facts.country ?? 'Not chosen' },
    { label: 'Appearance', value: `${facts.appearance}, ${facts.accent}` },
    { label: 'Account', value: facts.signedIn ? (facts.pro ? 'Signed in, Pro' : 'Signed in, Free') : 'Not signed in' },
  );
  if (facts.demo) lines.push({ label: 'Demo mode', value: 'On' });
  if (facts.locale || facts.timeZone) lines.push({ label: 'Language, time zone', value: [facts.locale, facts.timeZone].filter(Boolean).join(', ') });
  return lines;
}
