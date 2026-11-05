import { describe, expect, it } from 'vitest';
import { ApiError, OfflineError, failure, readBody } from './apiErrors';

describe('reading what the server answered', () => {
  it('reads its JSON, and nothing as nothing', () => {
    expect(readBody(200, '{"ok":true}')).toEqual({ ok: true });
    expect(readBody(404, '{"error":"No gym with that id.","code":"none"}')).toEqual({ error: 'No gym with that id.', code: 'none' });
    expect(readBody(204, '')).toEqual({});
  });

  it('says the server isn’t answering when a proxy in front of it says so, never a parse error', () => {
    for (const status of [502, 503, 504]) {
      expect(() => readBody(status, '<html><body>Bad Gateway</body></html>')).toThrow(OfflineError);
    }
    // The dev server's proxy, with the server off.
    expect(() => readBody(504, 'Error occurred while trying to proxy: localhost:8081/api/weather')).toThrow(OfflineError);
  });

  it('turns any other page into a failure with no reason, not a crash', () => {
    const thrown = (() => {
      try {
        readBody(500, 'Internal Server Error');
      } catch (error) {
        return error;
      }
      return null;
    })();
    expect(thrown).toBeInstanceOf(ApiError);
    expect(thrown).toMatchObject({ status: 500, code: 'not_json' });
    // A 200 that isn't JSON (a captive portal's page) is a failure too.
    expect(() => readBody(200, '<html>Sign in to the Wi-Fi</html>')).toThrow(ApiError);
    expect(() => readBody(200, '[1,2]')).toThrow(ApiError);
  });
});

describe('a failed answer', () => {
  it('is the server being unreachable when a proxy says it isn’t answering', () => {
    // The dev server's proxy, with the GymGO server off: a 502 with its own words.
    const off = failure(502, { error: 'The GymGO server isn’t running on this computer. Start GymGO with the launcher.' });
    expect(off).toBeInstanceOf(OfflineError);
    expect(off.message).toContain('isn’t running');
    expect(failure(504, {})).toBeInstanceOf(OfflineError);
    expect(failure(503, {})).toBeInstanceOf(OfflineError);
  });

  it('keeps the server’s own failures, with their reasons', () => {
    expect(failure(503, { error: 'No forecast.', code: 'weather_unavailable' })).toMatchObject({ status: 503, code: 'weather_unavailable', message: 'No forecast.' });
    expect(failure(401, { error: 'Sign in.' })).toMatchObject({ status: 401, code: null });
    expect(failure(500, {})).toBeInstanceOf(ApiError);
  });
});
