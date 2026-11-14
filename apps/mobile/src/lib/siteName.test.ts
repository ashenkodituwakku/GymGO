import { describe, expect, it } from 'vitest';
import { siteName } from './siteName';

describe('a website as people say it', () => {
  it('is the host, lower case, without www., a port, sign-in details, a path or a query', () => {
    expect(siteName('https://www.FranksGymPerth.com/contact?x=1#map')).toBe('franksgymperth.com');
    expect(siteName('HTTP://Example.com.au:8080/')).toBe('example.com.au');
    expect(siteName('https://user:pass@gym.example/path')).toBe('gym.example');
    expect(siteName('  https://anytimefitness.com.au  ')).toBe('anytimefitness.com.au');
  });

  it('is nothing for what isn’t a web address (a browser refuses these too)', () => {
    expect(siteName('example.com')).toBeNull();
    expect(siteName('')).toBeNull();
    expect(siteName('not a website')).toBeNull();
    expect(siteName('https://')).toBeNull();
  });
});
