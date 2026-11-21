/**
 * Gyms' own websites, found by hand where the map gives none.
 *
 * A gym's logo, and the photo at the top of its page, come from its own
 * website (the GymGO server fetches them; see apps/server/src/siteicons.ts).
 * The map holds a website for only some gyms, so the rest were looked up one
 * by one: the gym's name searched with its suburb or street, and a site kept
 * only when its address matched where the gym is on the map. A chain's
 * branches without a site of their own borrow the chain's, for the logo only
 * (never a photo: the chain's home page would show another branch).
 */

import { chainSiteFor } from './chainSites';
import type { EvidenceSource } from './types';
import { GYM_WEBSITE_ROWS } from './websiteRows';

export { GYM_WEBSITE_ROWS };

/** The gym's own website, looked up by hand, when the map has none. */
export function researchedWebsite(gymId: string): string | null {
  return GYM_WEBSITE_ROWS[gymId] ?? null;
}

/** When the sites in GYM_WEBSITE_ROWS were looked up and checked. */
export const WEBSITES_RESEARCHED = '2026-09-28T16:00:00.000Z';

/** The citation for a site looked up by hand, so the gym's page says GymGO found it. */
export function researchedWebsiteEvidence(gymId: string, url: string): EvidenceSource {
  return {
    id: `ev-found-${gymId}`,
    sourceType: 'independent_check',
    evidenceRef: url,
    label: 'Website found by GymGO: a web search for the gym, checked by hand against its name and address',
    observedAt: WEBSITES_RESEARCHED,
    checkedAt: WEBSITES_RESEARCHED,
    reviewerId: null,
  };
}

interface Chain {
  /** The chain's name as gyms are called, lower case: a gym matches its brand, its exact name, or a name that starts with it. */
  names: string[];
  /** The brand's Wikidata items, as the map tags branches. */
  qids?: string[];
  /** Only the brand or the exact name, where other gyms' names start with the chain's ("Barry's Gym Emporium"). */
  exact?: boolean;
  /** The chain's site in each country (ISO 3166-1), or '*' for everywhere else. */
  sites: Record<string, string>;
}

/**
 * Chains, with their official sites. Only chains whose branches all share
 * one brand: never a name that independent gyms also use ("Flex", "Elite").
 * The Wikidata items are the ones the map's gyms carry.
 */
export const CHAINS: Chain[] = [
  { names: ['anytime fitness'], qids: ['Q4778364'], sites: { AU: 'https://www.anytimefitness.com.au/', US: 'https://www.anytimefitness.com/', GB: 'https://www.anytimefitness.co.uk/', IE: 'https://www.anytimefitness.ie/', ES: 'https://www.anytimefitness.es/', NL: 'https://www.anytimefitness.nl/', '*': 'https://www.anytimefitness.com/' } },
  { names: ['f45 training', 'f45'], qids: ['Q64390973'], sites: { AU: 'https://f45training.com.au/', GB: 'https://f45training.co.uk/', '*': 'https://f45training.com/' } },
  { names: ['club lime'], sites: { AU: 'https://www.clublime.com.au/' } },
  { names: ['jetts fitness', 'jetts'], qids: ['Q24185346'], sites: { AU: 'https://www.jetts.com.au/' } },
  { names: ['zap fitness', 'zap'], qids: ['Q106119874'], sites: { AU: 'https://www.zapfitness.com.au/' } },
  { names: ['plus fitness'], qids: ['Q118315364'], sites: { AU: 'https://www.plusfitness.com.au/' } },
  { names: ['goodlife health clubs', 'goodlife', 'good life'], sites: { AU: 'https://www.goodlife.com.au/' } },
  { names: ['fernwood fitness', 'fitness fernwood', 'fernwood'], sites: { AU: 'https://www.fernwoodfitness.com.au/' } },
  { names: ['revo fitness', 'revo'], sites: { AU: 'https://revofitness.com.au/' } },
  { names: ['fitstop'], sites: { AU: 'https://fitstop.com/au/', '*': 'https://fitstop.com/' } },
  { names: ['barrys', 'barry s', 'barrys bootcamp'], qids: ['Q96373178'], exact: true, sites: { '*': 'https://www.barrys.com/' } },
  { names: ['orangetheory fitness', 'orangetheory', 'orange theory fitness', 'orange theory'], qids: ['Q25005163'], sites: { '*': 'https://www.orangetheory.com/' } },
  { names: ['planet fitness'], qids: ['Q7201095'], sites: { AU: 'https://planetfitnessaustralia.com.au/', '*': 'https://www.planetfitness.com/' } },
  { names: ['crunch fitness', 'crunch'], qids: ['Q5190093'], sites: { AU: 'https://www.crunchfitness.com.au/', '*': 'https://www.crunch.com/' } },
  { names: ['blink fitness'], qids: ['Q65621568'], sites: { US: 'https://www.blinkfitness.com/' } },
  { names: ['eos fitness', 'eōs fitness'], qids: ['Q127770873'], sites: { US: 'https://eosfitness.com/' } },
  { names: ['retro fitness'], qids: ['Q61994955'], sites: { US: 'https://retrofitness.com/' } },
  { names: ['vasa fitness'], qids: ['Q108816909'], sites: { US: 'https://vasafitness.com/' } },
  { names: ['workout anytime'], qids: ['Q120652638'], sites: { US: 'https://www.workoutanytime.com/' } },
  { names: ['burn boot camp'], qids: ['Q83375810'], sites: { US: 'https://burnbootcamp.com/' } },
  { names: ['fitness together'], qids: ['Q121788621'], sites: { US: 'https://www.fitnesstogether.com/' } },
  { names: ['ilovekickboxing'], qids: ['Q122433514'], sites: { US: 'https://www.ilovekickboxing.com/' } },
  { names: ['jazzercise'], qids: ['Q6168434'], sites: { '*': 'https://www.jazzercise.com/' } },
  { names: ['9round'], qids: ['Q120122534'], sites: { '*': 'https://www.9round.com/' } },
  { names: ['title boxing club'], qids: ['Q126391325'], sites: { '*': 'https://titleboxingclub.com/' } },
  { names: ['mayweather boxing fitness', 'mayweather boxing'], sites: { '*': 'https://mayweatherboxingfitness.com/' } },
  { names: ['rumble boxing', 'rumble'], sites: { '*': 'https://www.rumbleboxinggym.com/' } },
  { names: ['ufc gym'], qids: ['Q122511683'], sites: { '*': 'https://www.ufcgym.com/' } },
  { names: ['fitness sf'], sites: { US: 'https://www.fitnesssf.com/' } },
  { names: ['30 minute hit'], sites: { '*': 'https://30minutehit.com/' } },
  { names: ['madabolic'], sites: { '*': 'https://madabolic.com/' } },
  { names: ['city sports club'], sites: { US: 'https://www.citysportsclubs.com/' } },
  { names: ['nysc', 'new york sports club', 'new york sports clubs'], sites: { US: 'https://www.nysc.com/' } },
  { names: ['youfit', 'youfit health clubs'], sites: { US: 'https://www.youfit.com/' } },
  { names: ['esporta fitness'], sites: { US: 'https://www.esportafitness.com/' } },
  { names: ['chuze fitness'], sites: { US: 'https://chuze.com/' } },
  { names: ['fitness 19'], sites: { US: 'https://www.fitness19.com/' } },
  { names: ['genesis health club', 'genesis health clubs'], sites: { US: 'https://www.genesishealthclubs.com/' } },
  { names: ['texas family fitness'], sites: { US: 'https://www.texasfamilyfitness.com/' } },
  { names: ['california family fitness'], sites: { US: 'https://www.cafamilyfitness.com/' } },
  { names: ['movati athletic'], sites: { '*': 'https://www.movatiathletic.com/' } },
  { names: ['fit4less'], qids: ['Q64821050'], sites: { '*': 'https://www.fit4less.ca/' } },
  { names: ['jabz boxing'], sites: { US: 'https://jabzboxing.com/' } },
  { names: ['d1 training'], sites: { US: 'https://www.d1training.com/' } },
  { names: ['gracie barra'], sites: { '*': 'https://graciebarra.com/' } },
  { names: ['hot worx', 'hotworx'], sites: { '*': 'https://hotworx.net/' } },
  { names: ['iron tribe fitness'], sites: { US: 'https://www.irontribefitness.com/' } },
  { names: ['btone fitness', 'btone'], sites: { US: 'https://btonefitness.com/' } },
  { names: ['shred415', 'shred 4 15', 'shred 415'], sites: { US: 'https://shred415.com/' } },
  { names: ['pvolve'], sites: { '*': 'https://www.pvolve.com/' } },
  { names: ['chelsea piers fitness'], sites: { US: 'https://www.chelseapiersfitness.com/' } },
  { names: ['fitness formula clubs', 'ffc'], sites: { US: 'https://www.ffc.com/' } },
  { names: ['healthworks', 'healthworks fitness'], sites: { US: 'https://www.healthworksfitness.com/' } },
  { names: ['vida fitness', 'vida'], sites: { US: 'https://www.vidafitness.com/' } },
  { names: ['everybodyfights', 'everybody fights'], sites: { US: 'https://www.everybodyfights.com/' } },
  { names: ['mx3 fitness'], sites: { US: 'https://www.mx3fitness.com/' } },
  { names: ['rise nation'], sites: { US: 'https://www.risenation.com/' } },
  { names: ['fit36'], sites: { US: 'https://www.fit36.com/' } },
  { names: ['fierce45'], sites: { US: 'https://fierce45.com/' } },
  { names: ['complete body'], sites: { US: 'https://www.completebody.com/' } },
  { names: ['trufit athletic clubs', 'trufit'], sites: { US: 'https://trufitathleticclubs.com/' } },
  { names: ['merritt clubs'], sites: { US: 'https://www.merrittclubs.com/' } },
  { names: ['brick bodies'], sites: { US: 'https://www.brickbodies.com/' } },
  { names: ['fitwall'], sites: { US: 'https://www.fitwall.com/' } },
  { names: ['puregym'], qids: ['Q12311466', 'Q18345898'], sites: { GB: 'https://www.puregym.com/', DK: 'https://www.puregym.dk/', CH: 'https://www.puregym.ch/', '*': 'https://www.puregym.com/' } },
  { names: ['basic fit'], qids: ['Q40165577'], sites: { '*': 'https://www.basic-fit.com/' } },
  { names: ['vivagym'], qids: ['Q123378009', 'Q129425164'], sites: { ES: 'https://vivagym.es/', PT: 'https://vivagym.pt/', '*': 'https://vivagym.es/' } },
  { names: ['holmes place'], qids: ['Q15815819'], sites: { '*': 'https://www.holmesplace.com/' } },
  { names: ['sats'], qids: ['Q4411496'], sites: { SE: 'https://www.sats.se/', DK: 'https://www.sats.dk/', '*': 'https://www.sats.com/' } },
  { names: ['beat81'], qids: ['Q129168256'], sites: { '*': 'https://www.beat81.com/' } },
  { names: ['mrs sporty'], qids: ['Q100718953'], sites: { DE: 'https://www.mrssporty.de/', AT: 'https://www.mrssporty.at/', CH: 'https://www.mrssporty.ch/', '*': 'https://www.mrssporty.com/' } },
  { names: ['mcfit'], qids: ['Q871302'], sites: { '*': 'https://www.mcfit.com/' } },
  { names: ['bodystreet'], qids: ['Q117880186'], sites: { '*': 'https://www.bodystreet.com/' } },
  { names: ['brooklyn fitboxing'], sites: { '*': 'https://www.brooklynfitboxing.com/' } },
  { names: ['neoness'], qids: ['Q86668014'], sites: { FR: 'https://www.neoness.fr/' } },
  { names: ['keepcool'], qids: ['Q100146251'], sites: { FR: 'https://www.keepcool.fr/' } },
  { names: ['fitactive'], qids: ['Q123807531'], sites: { IT: 'https://www.fitactive.it/' } },
  { names: ['fitinn'], qids: ['Q1245564'], sites: { AT: 'https://www.fitinn.at/' } },
  { names: ['energie fitness', 'énergie fitness'], qids: ['Q109855553'], sites: { '*': 'https://www.energiefitness.com/' } },
  { names: ['gymbox'], sites: { GB: 'https://gymbox.com/' } },
  { names: ['flyefit'], sites: { IE: 'https://www.flyefit.ie/' } },
  { names: ['fitness hut'], sites: { PT: 'https://www.fitnesshut.pt/' } },
  { names: ['fitness24seven'], qids: ['Q61112447'], sites: { '*': 'https://www.fitness24seven.com/' } },
  { names: ['friskis svettis', 'friskis & svettis'], qids: ['Q1796631'], sites: { SE: 'https://www.friskissvettis.se/' } },
  { names: ['nordic wellness'], qids: ['Q60970249'], sites: { SE: 'https://www.nordicwellness.se/' } },
];

const normalise = (text: string) =>
  text
    .toLowerCase()
    .replace(/['’]/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * The chain's official site for a branch, or null: matched by the brand's
 * Wikidata item, the brand, the exact name, or a name that starts with the
 * whole chain name ("Anytime Fitness Docklands").
 */
export function chainWebsite(gym: { name: string; brand?: string | null; wikidataBrand?: string | null; countryCode: string }): string | null {
  const brand = gym.brand ? normalise(gym.brand) : null;
  const name = normalise(gym.name);
  const chain = CHAINS.find(
    (entry) =>
      (gym.wikidataBrand && entry.qids?.includes(gym.wikidataBrand)) ||
      entry.names.some((target) => {
        const key = normalise(target);
        return brand === key || name === key || (!entry.exact && name.startsWith(`${key} `));
      }),
  );
  const site = chain ? (chain.sites[gym.countryCode] ?? chain.sites['*'] ?? null) : null;
  // Failing that, the smaller table in chainSites.ts, matched by pattern.
  return site ?? chainSiteFor({ name: gym.name, brand: gym.brand ?? null, address: { countryCode: gym.countryCode } });
}
