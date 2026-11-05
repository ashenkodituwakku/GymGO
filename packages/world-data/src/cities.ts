/**
 * Major cities around the world that GymGO carries from the map alone,
 * beyond the US, Australian and European packs: each the area its gyms are
 * fetched from, a circle around the centre (downtown, where gyms cluster),
 * `radiusKm` across. scripts/fetch.ts reads this list; a city only reaches
 * the app once its gyms have been fetched (index.ts).
 *
 * Centres and time zones from GeoNames (CC BY 4.0) via the app's world city
 * list, moved to the downtown where GeoNames gives the middle of a wider
 * area.
 */

import type { LatLng } from '@gymgo/domain';
import type { WorldCityId } from './rows';

export interface WorldCity {
  id: WorldCityId;
  name: string;
  /** ISO 3166-1 alpha-2. */
  country: string;
  /** How the country is named under the city: "Japan", "UAE". */
  countryName: string;
  timezone: string;
  centre: LatLng;
  /** How far from the centre the gyms are fetched. */
  radiusKm: number;
  /** Other names people type, including the city's own. */
  aliases: string[];
}

const city = (id: WorldCityId, name: string, country: string, countryName: string, timezone: string, lat: number, lng: number, radiusKm = 5, aliases: string[] = []): WorldCity => ({
  id,
  name,
  country,
  countryName,
  timezone,
  centre: { lat, lng },
  radiusKm,
  aliases,
});

export const WORLD_CITIES: WorldCity[] = [
  // The Americas, beyond the US.
  city('toronto', 'Toronto', 'CA', 'Canada', 'America/Toronto', 43.6532, -79.3832, 5),
  city('vancouver', 'Vancouver', 'CA', 'Canada', 'America/Vancouver', 49.2827, -123.1207, 5),
  city('montreal', 'Montreal', 'CA', 'Canada', 'America/Toronto', 45.5019, -73.5674, 5, ['Montréal']),
  city('mexico-city', 'Mexico City', 'MX', 'Mexico', 'America/Mexico_City', 19.4326, -99.1332, 6, ['Ciudad de México', 'CDMX']),
  city('sao-paulo', 'São Paulo', 'BR', 'Brazil', 'America/Sao_Paulo', -23.5614, -46.6559, 6, ['Sao Paulo']),
  city('rio-de-janeiro', 'Rio de Janeiro', 'BR', 'Brazil', 'America/Sao_Paulo', -22.9711, -43.1822, 6, ['Rio']),
  city('buenos-aires', 'Buenos Aires', 'AR', 'Argentina', 'America/Argentina/Buenos_Aires', -34.6037, -58.3816, 5),
  city('santiago', 'Santiago', 'CL', 'Chile', 'America/Santiago', -33.4258, -70.6109, 6, ['Santiago de Chile']),
  city('bogota', 'Bogotá', 'CO', 'Colombia', 'America/Bogota', 4.6534, -74.0574, 6, ['Bogota']),
  city('lima', 'Lima', 'PE', 'Peru', 'America/Lima', -12.1046, -77.0353, 6),
  // Asia.
  city('tokyo', 'Tokyo', 'JP', 'Japan', 'Asia/Tokyo', 35.6812, 139.7671, 6, ['東京']),
  city('osaka', 'Osaka', 'JP', 'Japan', 'Asia/Tokyo', 34.7025, 135.4959, 5, ['大阪']),
  city('seoul', 'Seoul', 'KR', 'South Korea', 'Asia/Seoul', 37.5665, 126.978, 6, ['서울']),
  city('singapore', 'Singapore', 'SG', 'Singapore', 'Asia/Singapore', 1.2897, 103.8501, 6),
  city('hong-kong', 'Hong Kong', 'HK', 'Hong Kong', 'Asia/Hong_Kong', 22.2819, 114.1582, 5, ['香港']),
  city('taipei', 'Taipei', 'TW', 'Taiwan', 'Asia/Taipei', 25.0418, 121.5654, 5, ['台北']),
  city('bangkok', 'Bangkok', 'TH', 'Thailand', 'Asia/Bangkok', 13.7466, 100.5393, 6, ['กรุงเทพ']),
  city('kuala-lumpur', 'Kuala Lumpur', 'MY', 'Malaysia', 'Asia/Kuala_Lumpur', 3.1488, 101.7129, 6, ['KL']),
  city('jakarta', 'Jakarta', 'ID', 'Indonesia', 'Asia/Jakarta', -6.2088, 106.8227, 6),
  city('manila', 'Manila', 'PH', 'Philippines', 'Asia/Manila', 14.5547, 121.0244, 6, ['Makati', 'Metro Manila']),
  city('ho-chi-minh-city', 'Ho Chi Minh City', 'VN', 'Vietnam', 'Asia/Ho_Chi_Minh', 10.7769, 106.7009, 5, ['Saigon']),
  city('mumbai', 'Mumbai', 'IN', 'India', 'Asia/Kolkata', 19.0596, 72.8295, 6, ['Bombay']),
  city('delhi', 'Delhi', 'IN', 'India', 'Asia/Kolkata', 28.6315, 77.2167, 6, ['New Delhi']),
  city('bengaluru', 'Bengaluru', 'IN', 'India', 'Asia/Kolkata', 12.9716, 77.5946, 6, ['Bangalore']),
  // The Middle East.
  city('dubai', 'Dubai', 'AE', 'UAE', 'Asia/Dubai', 25.1972, 55.2744, 7),
  city('abu-dhabi', 'Abu Dhabi', 'AE', 'UAE', 'Asia/Dubai', 24.4539, 54.3773, 6),
  city('doha', 'Doha', 'QA', 'Qatar', 'Asia/Qatar', 25.2854, 51.531, 6),
  city('riyadh', 'Riyadh', 'SA', 'Saudi Arabia', 'Asia/Riyadh', 24.7136, 46.6753, 7),
  city('tel-aviv', 'Tel Aviv', 'IL', 'Israel', 'Asia/Jerusalem', 32.0853, 34.7818, 5),
  city('istanbul', 'Istanbul', 'TR', 'Türkiye', 'Europe/Istanbul', 41.0422, 28.9869, 6, ['İstanbul']),
  // Africa.
  city('cairo', 'Cairo', 'EG', 'Egypt', 'Africa/Cairo', 30.0444, 31.2357, 6),
  city('lagos', 'Lagos', 'NG', 'Nigeria', 'Africa/Lagos', 6.4281, 3.4219, 6),
  city('nairobi', 'Nairobi', 'KE', 'Kenya', 'Africa/Nairobi', -1.2864, 36.8172, 6),
  city('johannesburg', 'Johannesburg', 'ZA', 'South Africa', 'Africa/Johannesburg', -26.1452, 28.0436, 7, ['Joburg', 'Sandton']),
  city('cape-town', 'Cape Town', 'ZA', 'South Africa', 'Africa/Johannesburg', -33.9249, 18.4241, 6),
  // Oceania, beyond Australia.
  city('auckland', 'Auckland', 'NZ', 'New Zealand', 'Pacific/Auckland', -36.8485, 174.7633, 5),
  city('wellington', 'Wellington', 'NZ', 'New Zealand', 'Pacific/Auckland', -41.2866, 174.7756, 5),
  // More of Europe.
  city('brussels', 'Brussels', 'BE', 'Belgium', 'Europe/Brussels', 50.8467, 4.3525, 5, ['Bruxelles', 'Brussel']),
  city('prague', 'Prague', 'CZ', 'Czechia', 'Europe/Prague', 50.0875, 14.4213, 5, ['Praha']),
  city('warsaw', 'Warsaw', 'PL', 'Poland', 'Europe/Warsaw', 52.2297, 21.0122, 5, ['Warszawa']),
  city('athens', 'Athens', 'GR', 'Greece', 'Europe/Athens', 37.9838, 23.7275, 5, ['Αθήνα']),
  city('oslo', 'Oslo', 'NO', 'Norway', 'Europe/Oslo', 59.9139, 10.7522, 5),
  city('helsinki', 'Helsinki', 'FI', 'Finland', 'Europe/Helsinki', 60.1699, 24.9384, 5),
  city('budapest', 'Budapest', 'HU', 'Hungary', 'Europe/Budapest', 47.4979, 19.0402, 5),
  city('manchester', 'Manchester', 'GB', 'UK', 'Europe/London', 53.4808, -2.2426, 5),
  city('edinburgh', 'Edinburgh', 'GB', 'UK', 'Europe/London', 55.9533, -3.1883, 5),
];

export const worldCity = (id: WorldCityId): WorldCity => WORLD_CITIES.find((item) => item.id === id)!;
