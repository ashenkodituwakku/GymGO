import { describe, expect, it } from 'vitest';
import { pickApiBase, serverIsHosted } from './serverAddress';

describe('where the GymGO server is', () => {
  it('is the hosted address when the build names one', () => {
    expect(pickApiBase({ configured: 'https://gymgo.example.com/', pageOrigin: 'http://localhost:8081' })).toBe('https://gymgo.example.com');
  });

  it('is nowhere when the build says there is none', () => {
    expect(pickApiBase({ configured: 'none', pageOrigin: 'https://gymgo.site' })).toBeNull();
  });

  it('is the page’s own address when the server serves the app itself, whatever the tunnel is called', () => {
    expect(pickApiBase({ configured: 'same-origin', pageOrigin: 'https://quiet-river-1234.trycloudflare.com' })).toBe('https://quiet-river-1234.trycloudflare.com');
    expect(pickApiBase({ configured: 'same-origin', pageOrigin: 'https://app.gymgo.site' })).toBe('https://app.gymgo.site');
    // No page (a phone app built that way by mistake): nowhere, rather than a made-up address.
    expect(pickApiBase({ configured: 'same-origin', pageOrigin: null })).toBeNull();
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

describe('whether the server is hosted or on your own computer', () => {
  it('is hosted when the build names an address on the internet', () => {
    expect(serverIsHosted('https://api.gymgo.example')).toBe(true);
    expect(serverIsHosted('same-origin', 'https://gymgo.site')).toBe(true);
    expect(serverIsHosted('same-origin', null)).toBe(true);
  });

  it('is your own computer in development, on your network or with no address at all', () => {
    expect(serverIsHosted(undefined)).toBe(false);
    expect(serverIsHosted('none')).toBe(false);
    expect(serverIsHosted('same-origin', 'http://localhost:4000')).toBe(false);
    for (const address of ['http://127.0.0.1:4000', 'http://192.168.1.20:4000', 'http://10.0.0.5:4000', 'http://172.20.1.2:4000', 'http://my-pc.local:4000', 'http://[::1]:4000']) {
      expect(serverIsHosted(address)).toBe(false);
    }
    expect(serverIsHosted('http://172.32.0.1')).toBe(true);
    expect(serverIsHosted('not an address')).toBe(false);
  });
});
