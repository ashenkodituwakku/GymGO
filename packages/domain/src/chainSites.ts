/**
 * The official websites of gym chains whose branches the map lists without
 * one, so a branch can still show its chain's own icon (the server fetches
 * it, and the app credits it as the chain's).
 *
 * Each site was checked by hand on 28 September 2026: it answered and its
 * page title named the chain, or (for sites that turn automated visitors
 * away) Google's favicon service had an icon for it. Some are scoped to a country, where another
 * country has a different business under a similar name (GoodLife Fitness in
 * Canada is not Goodlife Health Clubs in Australia).
 */

interface ChainSite {
  match: RegExp;
  site: string;
  /** Only in these countries (ISO 3166-1 alpha-2). */
  countries?: readonly string[];
}

// First match wins, so a country-specific site comes before a general one.
const CHAIN_SITES: readonly ChainSite[] = [
  { match: /^club lime\b/i, site: 'https://www.clublime.com.au/', countries: ['AU'] },
  { match: /^revo( fitness)?\b/i, site: 'https://revofitness.com.au/', countries: ['AU'] },
  { match: /^good ?life( health clubs?)?\b/i, site: 'https://www.goodlife.com.au/', countries: ['AU'] },
  { match: /^fitstop\b/i, site: 'https://fitstop.com/' },
  { match: /^viva ?gym\b/i, site: 'https://www.vivagym.com/' },
  { match: /^9 ?round\b/i, site: 'https://www.9round.com.au/', countries: ['AU'] },
  { match: /^9 ?round\b/i, site: 'https://www.9round.com/' },
  { match: /^anytime fitness\b/i, site: 'https://www.anytimefitness.com/' },
  { match: /^holmes place\b/i, site: 'https://www.holmesplace.com/' },
  { match: /^plus fitness\b/i, site: 'https://www.plusfitness.com.au/', countries: ['AU'] },
  { match: /^(f45|functional 45)\b/i, site: 'https://f45training.com/' },
  { match: /^fernwood\b/i, site: 'https://www.fernwoodfitness.com.au/', countries: ['AU'] },
  { match: /^derrimut\b/i, site: 'https://www.derrimut247.com.au/', countries: ['AU'] },
  { match: /^ubx\b/i, site: 'https://ubxtraining.com/' },
  { match: /^world gym\b/i, site: 'https://www.worldgym.com.au/', countries: ['AU'] },
  { match: /^planet fitness\b/i, site: 'https://planetfitnessaustralia.com.au/', countries: ['AU'] },
  { match: /^stepz\b/i, site: 'https://stepzfitness.com.au/', countries: ['AU'] },
  { match: /^vision personal training\b/i, site: 'https://www.visionpersonaltraining.com/', countries: ['AU'] },
  { match: /^body ?fit training\b/i, site: 'https://www.bodyfittraining.com/' },
  { match: /^mrs\.? ?sporty\b/i, site: 'https://www.mrssporty.com/' },
  { match: /^barry[’']s( bootcamp)?$/i, site: 'https://www.barrys.com/' },
  { match: /^mcfit\b/i, site: 'https://www.mcfit.com/' },
  { match: /^rumble( boxing)?\b/i, site: 'https://www.rumbleboxinggym.com/' },
  { match: /^[eé]nergie fitness\b/i, site: 'https://www.energiefitness.com/' },
  { match: /^ufc gym\b/i, site: 'https://www.ufcgym.com/' },
  { match: /^title boxing club\b/i, site: 'https://www.titleboxingclub.com/' },
  { match: /^flye ?fit\b/i, site: 'https://www.flyefit.ie/', countries: ['IE'] },
  { match: /^brooklyn fitboxing\b/i, site: 'https://www.brooklynfitboxing.com/' },
  { match: /^healthworks\b/i, site: 'https://healthworksfitness.com/', countries: ['US'] },
  { match: /^(nysc|new york sports clubs?)\b/i, site: 'https://www.newyorksportsclubs.com/', countries: ['US'] },
  { match: /^fitness sf\b/i, site: 'https://www.fitnesssf.com/', countries: ['US'] },
  { match: /^quickfit\b/i, site: 'https://www.quickfit.com.au/', countries: ['AU'] },
  { match: /^listen to your body\b/i, site: 'https://www.listentoyourbody.com.au/', countries: ['AU'] },
  // "Orange Theory" as the map sometimes spells Orangetheory, which has its own logo otherwise.
  { match: /^orange ?theory\b/i, site: 'https://www.orangetheory.com/' },
  { match: /^speed ?fit\b/i, site: 'https://joinspeedfit.com/', countries: ['AU'] },
  // 12RND is now part of UBX; its old site goes to UBX's.
  { match: /^12 ?rnd\b/i, site: 'https://12rnd.com.au/', countries: ['AU'] },
  { match: /^hiit republic\b/i, site: 'https://hiitrepublic.com.au/', countries: ['AU'] },
  { match: /^south pacific health club/i, site: 'https://www.southpacifichealthclubs.com.au/', countries: ['AU'] },
  { match: /^gymbox\b/i, site: 'https://www.gymbox.com/', countries: ['GB'] },
  { match: /^plts\b/i, site: 'https://plts.nl/', countries: ['NL'] },
  { match: /^friskis ?(&|och) ?svettis\b/i, site: 'https://www.friskissvettis.se/', countries: ['SE'] },
  { match: /^madabolic\b/i, site: 'https://www.madabolic.com/', countries: ['US'] },
  { match: /^30 minute hit\b/i, site: 'https://www.30minutehit.com/' },
  { match: /^genesis (health|fitness)\b/i, site: 'https://www.genesisfitness.com.au/', countries: ['AU'] },
  { match: /^core ?plus\b/i, site: 'https://www.core-plus.com/', countries: ['AU'] },
  { match: /^conditn\b/i, site: 'https://conditn.com/', countries: ['AU'] },
  { match: /^98 (gym|training)\b/i, site: 'https://98gym.com/', countries: ['AU'] },
  { match: /^(team )?bodyfit\b/i, site: 'https://bodyfit.com.au/', countries: ['AU'] },
  { match: /^lyf\b/i, site: 'https://www.lyf247.com.au/', countries: ['AU'] },
  { match: /^bang bang (muay|my) thai\b/i, site: 'https://bangbangmt.com/', countries: ['AU'] },
  { match: /^c3 training\b/i, site: 'https://www.c3training.com.au/', countries: ['AU'] },
  { match: /^next ?gen(eration)?\b/i, site: 'https://www.nextgenclubs.com.au/', countries: ['AU'] },
  { match: /^dundee[’']?s boxing\b/i, site: 'https://www.dundeesfitness.com.au/', countries: ['AU'] },
  { match: /^fitness cartel\b/i, site: 'https://www.fitnesscartel.com.au/', countries: ['AU'] },
  { match: /^ifeelgood\b/i, site: 'https://ifeelgood247.com.au/', countries: ['AU'] },
];

/** The chain's own website for a branch with none of its own, or null when it isn't a known chain. */
export function chainSiteFor(location: { name: string; brand: string | null; address: { countryCode: string } }): string | null {
  const names = [location.brand, location.name].filter((name): name is string => Boolean(name?.trim()));
  for (const chain of CHAIN_SITES) {
    if (chain.countries && !chain.countries.includes(location.address.countryCode)) continue;
    if (names.some((name) => chain.match.test(name.trim()))) return chain.site;
  }
  return null;
}
