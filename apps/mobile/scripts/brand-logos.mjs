/**
 * Brand logos for GymGO, from Wikidata and Wikimedia Commons.
 *
 * For every gym brand the data knows (Wikidata IDs from OpenStreetMap's
 * brand:wikidata tags, plus a few Australian brands by name), ask Wikidata
 * for the brand's logo (property P154), read each file's licence and author
 * from its Commons page, and keep only logos under a licence GymGO can use
 * (public domain as a simple logo, CC0 or CC BY/BY-SA). Each is trimmed,
 * shrunk and saved to assets/logos, so the app carries them and never
 * fetches from Wikimedia, and the list is written to src/lib/brandLogos.ts.
 *
 * Logos stay their owners' trademarks: GymGO shows them only to say which
 * gym this is, credited, and with no claim of any link to the brand.
 *
 *   node scripts/brand-logos.mjs            fetch what's missing, then write
 *   node scripts/brand-logos.mjs --refresh  download every logo again
 *
 * Wikimedia rate-limits busy networks, so this goes slowly and retries.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..', '..');
const assets = join(here, '..', 'assets', 'logos');
const out = join(here, '..', 'src', 'lib', 'brandLogos.ts');
const UA = 'GymGO/0.1 (gym finder pilot; https://github.com/ashenkodituwakku/GymGO)';
const EXTRA_NAMES = ['Snap Fitness', 'GoodLife Health Clubs', 'Goodlife Health Clubs', 'Anytime Fitness'];
const refresh = process.argv.includes('--refresh');

/** Commons licence templates GymGO accepts, and how to name them. */
const LICENCES = [
  [/\{\{\s*PD-(textlogo|logo|simple|shape)/i, 'Public domain (simple logo)'],
  [/\{\{\s*cc-zero/i, 'CC0'],
  [/\{\{\s*cc-by-4\.0/i, 'CC BY 4.0'],
  [/\{\{\s*cc-by-sa-4\.0/i, 'CC BY-SA 4.0'],
  [/\{\{\s*cc-by-3\.0/i, 'CC BY 3.0'],
  [/\{\{\s*cc-by-sa-3\.0/i, 'CC BY-SA 3.0'],
];

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/** GET through curl (it honours the system's proxy settings), retrying when rate-limited. */
async function get(url, accept = '*/*') {
  for (let attempt = 1; attempt <= 8; attempt++) {
    let body;
    let code;
    try {
      const raw = execFileSync('curl', ['-sS', '-m', '60', '-A', UA, '-H', `Accept: ${accept}`, '-w', '\n%{http_code}', url], {
        maxBuffer: 64 * 1024 * 1024,
      });
      const cut = raw.lastIndexOf(10);
      body = raw.subarray(0, cut);
      code = raw.subarray(cut + 1).toString();
    } catch {
      code = 'network error';
    }
    if (code === '200') return body;
    const wait = 20 * attempt;
    console.error(`  ${code} from ${new URL(url).host}, waiting ${wait}s`);
    await sleep(wait * 1000);
  }
  throw new Error(`gave up on ${url.slice(0, 120)}`);
}

async function sparql(query) {
  const body = await get(`https://query.wikidata.org/sparql?${new URLSearchParams({ query })}`, 'application/sparql-results+json');
  return JSON.parse(body.toString()).results.bindings;
}

/** The plain text of a wiki field: links and templates reduced to their words. */
function plain(text) {
  if (!text) return null;
  const clean = text
    .replace(/\{\{\s*unknown[^}]*\}\}/gi, '')
    .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/\[https?:\S+\s([^\]]*)\]/g, '$1')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/'''?/g, '')
    .trim();
  return clean || null;
}

const slugOf = (brand) =>
  brand
    .toLowerCase()
    .replace(/['’]/g, '')
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Where Wikimedia serves a file: SVGs as a 500-pixel PNG, other images as they are. */
function fileUrl(file) {
  const name = file.replace(/ /g, '_');
  const hash = createHash('md5').update(name).digest('hex');
  const base = `https://upload.wikimedia.org/wikipedia/commons/${hash[0]}/${hash.slice(0, 2)}`;
  const encoded = encodeURIComponent(name);
  return file.toLowerCase().endsWith('.svg') ? `${base.replace('/commons/', '/commons/thumb/')}/${encoded}/500px-${encoded}.png` : `${base}/${encoded}`;
}

async function main() {
  const usa = readFileSync(join(root, 'packages', 'usa-data', 'src', 'data.ts'), 'utf8');
  const qids = [...new Set([...usa.matchAll(/"brandWikidata": "(Q\d+)"/g)].map((match) => match[1]))].sort();
  const label = 'SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }';
  const rows = await sparql(
    `SELECT ?item ?itemLabel ?logo WHERE { VALUES ?item { ${qids.map((q) => `wd:${q}`).join(' ')} } ?item wdt:P154 ?logo . ${label} }`,
  );
  await sleep(3000);
  rows.push(
    ...(await sparql(
      `SELECT ?item ?itemLabel ?logo WHERE { VALUES ?name { ${EXTRA_NAMES.map((n) => `"${n}"@en`).join(' ')} } ?item rdfs:label ?name ; wdt:P154 ?logo . ${label} }`,
    )),
  );

  const brands = new Map();
  for (const row of rows) {
    const qid = row.item.value.split('/').pop();
    if (brands.has(qid)) continue;
    brands.set(qid, { qid, brand: row.itemLabel.value, file: decodeURIComponent(row.logo.value.split('FilePath/').pop()) });
  }
  console.log(`${brands.size} brands have a logo on Wikidata`);

  mkdirSync(assets, { recursive: true });
  const logos = [];
  for (const brand of brands.values()) {
    await sleep(3000);
    const title = `File:${brand.file.replace(/ /g, '_')}`;
    const wikitext = (await get(`https://commons.wikimedia.org/w/index.php?${new URLSearchParams({ title, action: 'raw' })}`)).toString();
    const licence = LICENCES.find(([pattern]) => pattern.test(wikitext))?.[1];
    if (!licence) {
      console.log(`- ${brand.brand}: skipped, no licence GymGO can use`);
      continue;
    }
    const author = plain(wikitext.match(/^\s*\|\s*author\s*=(.*)$/im)?.[1]);
    const slug = slugOf(brand.brand);
    const png = join(assets, `${slug}.png`);
    if (refresh || !existsSync(png)) {
      await sleep(3000);
      const image = await get(fileUrl(brand.file));
      // Trim empty margins so every logo fills its frame the same way.
      await sharp(image)
        .trim({ threshold: 1 })
        .resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true })
        .png({ palette: true, quality: 90, compressionLevel: 9 })
        .toFile(png);
    }
    const { width, height } = await sharp(png).metadata();
    logos.push({ ...brand, slug, licence, author, aspect: Math.round((width / height) * 100) / 100 });
    console.log(`- ${brand.brand}: ${licence}${author ? `, ${author}` : ''}`);
  }

  logos.sort((a, b) => a.brand.localeCompare(b.brand));
  const lines = [
    '// Generated by scripts/brand-logos.mjs from Wikidata (P154) and Wikimedia Commons. Do not edit by hand.',
    "// Logos are their owners' trademarks, shown only to identify a gym. See CREDITS.md.",
    '',
    "import type { ImageSourcePropType } from 'react-native';",
    '',
    'export interface BrandLogo {',
    "  /** The brand's Wikidata item. */",
    '  qid: string;',
    '  brand: string;',
    '  /** Bundled with the app, trimmed to the logo itself. */',
    '  image: ImageSourcePropType;',
    '  /** Width over height. */',
    '  aspect: number;',
    "  /** The file's page on Wikimedia Commons, with its licence. */",
    '  page: string;',
    '  license: string;',
    '  author: string | null;',
    '}',
    '',
    '// prettier-ignore',
    'export const BRAND_LOGOS: BrandLogo[] = [',
    ...logos.map(
      (logo) =>
        `  { qid: ${JSON.stringify(logo.qid)}, brand: ${JSON.stringify(logo.brand)}, image: require('../../assets/logos/${logo.slug}.png'), aspect: ${logo.aspect}, page: ${JSON.stringify(
          `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(logo.file.replace(/ /g, '_'))}`,
        )}, license: ${JSON.stringify(logo.licence)}, author: ${JSON.stringify(logo.author)} },`,
    ),
    '];',
    '',
  ];
  writeFileSync(out, lines.join('\n'));
  console.log(`wrote ${logos.length} logos to src/lib/brandLogos.ts`);
}

await main();
