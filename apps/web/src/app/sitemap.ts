import type { MetadataRoute } from 'next';
import { EQUIPMENT_TYPES, haversineKm } from '@gymgo/domain';
import { PILOT_PLACES, suburbSlug } from '@/server/geocode';
import { loadGymRecords } from '@/server/gyms';
import { config } from '@/server/config';

/**
 * The sitemap.
 *
 * Only pages we would actually want indexed. Filter permutations are absent,
 * and so is every listing page while the dataset is the fictional demo one:
 * those pages carry `noindex`, and listing them anyway would be asking search
 * engines to crawl pages we have told them to ignore.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = config.siteUrl.replace(/\/$/, '');
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/about/data`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/legal/community`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/legal/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/support`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ];

  if (config.dataSource !== 'demo') {
    const records = await loadGymRecords();

    for (const record of records) {
      staticPages.push({
        url: `${base}/gym/${record.location.slug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }

    for (const place of PILOT_PLACES) {
      const nearby = records.filter(
        (record) => haversineKm(place.position, record.location.position) <= 1.5,
      );
      if (nearby.length === 0) continue;

      staticPages.push({
        url: `${base}/gyms/${suburbSlug(place.name)}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.7,
      });

      // Mirrors the rule in gyms/[area]/[equipment]: anchor suburbs only, at
      // least three gyms behind the page, at most three pages per area.
      if (!['Surry Hills', 'Newtown', 'Alexandria', 'Pyrmont'].includes(place.name)) continue;
      const ranked = EQUIPMENT_TYPES.map((type) => ({
        type,
        count: nearby.filter((record) =>
          record.equipment.some(
            (item) => item.equipmentTypeId === type.id && item.presence === 'yes',
          ),
        ).length,
      }))
        .filter((entry) => entry.count >= 3)
        .sort((a, b) => b.count - a.count || a.type.id.localeCompare(b.type.id))
        .slice(0, 3);

      for (const entry of ranked) {
        staticPages.push({
          url: `${base}/gyms/${suburbSlug(place.name)}/${entry.type.id.replace(/_/g, '-')}`,
          lastModified: now,
          changeFrequency: 'monthly',
          priority: 0.5,
        });
      }
    }
  }

  return staticPages;
}
