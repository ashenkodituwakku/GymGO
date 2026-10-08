import { describe, expect, it } from 'vitest';
import { chainSiteFor } from './chainSites';

const at = (name: string, countryCode: string, brand: string | null = null) => ({ name, brand, address: { countryCode } });

describe('chain websites for branches with none of their own', () => {
  it('knows a chain by its name or brand, in the right country', () => {
    expect(chainSiteFor(at('Club Lime', 'AU'))).toBe('https://www.clublime.com.au/');
    expect(chainSiteFor(at('Goodlife Health Clubs', 'AU'))).toBe('https://www.goodlife.com.au/');
    expect(chainSiteFor(at('Goodlife', 'AU'))).toBe('https://www.goodlife.com.au/');
    expect(chainSiteFor(at('Gym', 'AU', 'Fitstop'))).toBe('https://fitstop.com/');
    // Australia's 9Round has its own site; elsewhere, the chain's.
    expect(chainSiteFor(at('9Round', 'AU'))).toBe('https://www.9round.com.au/');
    expect(chainSiteFor(at('9Round', 'US'))).toBe('https://www.9round.com/');
  });

  it('never lends a site to a different business with a similar name', () => {
    // Canada's GoodLife Fitness is not Australia's Goodlife.
    expect(chainSiteFor(at('GoodLife Fitness', 'CA'))).toBeNull();
    // Planet Fitness Australia's site is only for Australia's.
    expect(chainSiteFor(at('Planet Fitness', 'US'))).toBeNull();
    expect(chainSiteFor(at('Barry’s Gym Emporium', 'AU'))).toBeNull();
    expect(chainSiteFor(at('Doherty’s Gym', 'AU'))).toBeNull();
    expect(chainSiteFor(at('Limestone Fitness', 'AU'))).toBeNull();
  });
});
