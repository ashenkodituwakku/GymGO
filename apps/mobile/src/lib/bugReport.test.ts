import { describe, expect, it } from 'vitest';
import { browserName, deviceDetails, type DeviceFacts } from './bugReport';

const PHONE: DeviceFacts = {
  appVersion: '0.1.0 (pilot)',
  platform: 'ios',
  osVersion: '18.2',
  userAgent: null,
  screen: { width: 390, height: 844, scale: 3 },
  from: 'Explore',
  country: 'US',
  appearance: 'Automatic',
  accent: 'Indigo',
  demo: false,
  signedIn: true,
  pro: false,
  locale: 'en-US',
  timeZone: 'America/New_York',
};

describe('bug report details', () => {
  it('lists what helps find a bug, in words, and nothing about where you are', () => {
    expect(deviceDetails(PHONE)).toEqual([
      { label: 'App version', value: '0.1.0 (pilot)' },
      { label: 'Device', value: 'iPhone (iOS), 18.2' },
      { label: 'Screen', value: '390 × 844 pt at 3×' },
      { label: 'Reported from', value: 'Explore' },
      { label: 'Country setting', value: 'US' },
      { label: 'Appearance', value: 'Automatic, Indigo' },
      { label: 'Account', value: 'Signed in, Free' },
      { label: 'Language, time zone', value: 'en-US, America/New_York' },
    ]);
  });

  it('names the browser on the web, and says when demo mode is on', () => {
    const lines = deviceDetails({
      ...PHONE,
      platform: 'web',
      osVersion: null,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      demo: true,
      signedIn: false,
      from: null,
    });
    expect(lines.find((line) => line.label === 'Device')?.value).toBe('Web browser, Chrome 131');
    expect(lines.find((line) => line.label === 'Demo mode')?.value).toBe('On');
    expect(lines.find((line) => line.label === 'Account')?.value).toBe('Not signed in');
    expect(lines.some((line) => line.label === 'Reported from')).toBe(false);
  });

  it('tells the main browsers apart', () => {
    expect(browserName('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1')).toBe('Safari 18');
    expect(browserName('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0')).toBe('Firefox 130');
    expect(browserName('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0')).toBe('Edge 131');
    expect(browserName('curl/8')).toBe('another browser');
  });
});
