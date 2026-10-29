import { describe, expect, it } from 'vitest';
import { pickApiBase } from './serverAddress';

describe('where the GymGO server is', () => {
  it('is the hosted address when the build names one', () => {
    expect(pickApiBase({ configured: 'https://gymgo.example.com/', pageOrigin: 'http://localhost:8081' })).toBe('https://gymgo.example.com');
  });

  it('is nowhere when the build says there is none', () => {
    expect(pickApiBase({ configured: 'none', pageOrigin: 'https://gymgo.site' })).toBeNull();
  });

  it('is through the bundler, on the page’s own address, in a browser', () => {
    expect(pickApiBase({ pageOrigin: 'http://localhost:8081' })).toBe('http://localhost:8081/_gymgo');
    expect(pickApiBase({ pageOrigin: 'http://192.168.0.46:8081' })).toBe('http://192.168.0.46:8081/_gymgo');
  });

  it('is through the bundler the phone loaded its code from, on Wi-Fi or through the tunnel', () => {
    expect(pickApiBase({ bundleUrl: 'http://192.168.0.46:8081/node_modules/expo-router/entry.bundle?platform=ios&dev=true', hostUri: '192.168.0.46:8081' })).toBe(
      'http://192.168.0.46:8081/_gymgo',
    );
    // The tunnel carries only the bundler's address, over https: the server comes the same way.
    expect(pickApiBase({ bundleUrl: 'https://abc-anonymous-8081.exp.direct/node_modules/expo-router/entry.bundle?platform=android', hostUri: 'abc-anonymous-8081.exp.direct' })).toBe(
      'https://abc-anonymous-8081.exp.direct/_gymgo',
    );
  });

  it('falls back to Expo’s note of the bundler, and has none in a release build without an address', () => {
    expect(pickApiBase({ bundleUrl: null, hostUri: '10.0.0.5:8081' })).toBe('http://10.0.0.5:8081/_gymgo');
    expect(pickApiBase({ bundleUrl: 'file:///var/containers/Bundle/main.jsbundle' })).toBeNull();
    expect(pickApiBase({})).toBeNull();
  });
});
