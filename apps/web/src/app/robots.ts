import type { MetadataRoute } from 'next';
import { config } from '@/server/config';

/**
 * Crawling rules.
 *
 * The search page and every private area are disallowed: filter permutations
 * are not useful search results, and the account, owner and moderation pages
 * have no business in an index. While the dataset is the fictional demo one,
 * nothing at all is allowed, because these are invented venues.
 */
export default function robots(): MetadataRoute.Robots {
  const base = config.siteUrl.replace(/\/$/, '');

  if (config.dataSource === 'demo') {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
      sitemap: `${base}/sitemap.xml`,
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/search', '/compare', '/saved', '/account', '/owner', '/admin', '/api/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
