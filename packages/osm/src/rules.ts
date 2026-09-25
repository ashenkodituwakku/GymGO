/**
 * What counts as a gym on OpenStreetMap.
 *
 * It keeps places you can walk into and train on a gym floor, or take a class
 * at a fitness studio. It drops what the map says is private, gyms inside
 * hotels, apartment blocks, offices and campuses, generic "Fitness Center"
 * rooms, and yoga, pilates, barre, cycling, dance, climbing and kids' studios,
 * which aren't what GymGO is for.
 *
 * Nothing is added that the map doesn't say. Opening hours are parsed only
 * when they're in the simple "Mo-Fr 06:00-22:00; Sa 08:00-20:00" form;
 * anything else is left out rather than guessed.
 *
 * One copy of these rules serves both the city data generators
 * (packages/au-data, packages/usa-data) and the server's "Search this area".
 */

import type { TrainingType } from '@gymgo/domain';

export type Tags = Record<string, string>;

/** An element from an Overpass answer (`out center tags`). */
export interface OsmElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Tags;
}

const NOT_A_GYM = new RegExp(
  'yoga|pilates|barre|bar method|soulcycle|cyclebar|cycle house|flywheel|b/spoke|spin|ride\\b|' +
    'solidcore|dance|ballet|climb|boulder|gymnastic|little gym|my gym|stretch|trapeze|fenc|' +
    'hotworx|jiu|karate|taekwondo|martial|kung fu|judo|aikido|physical therapy|physiotherap|' +
    'chiropract|massage|spa\\b|kids|pole\\b|aerial|bodyrok|lagree|megaformer|reformer|swim school|' +
    'zumba|piyo|down dog|physique 57|revolution studio|cycle|handle bar|rock gym|exhale|krav|kms\\b|' +
    'combat|mma\\b|ismma|grinning yogi|float|cryo|squash|syretch|platesculpt|boys and girls|define body|' +
    'futsal|parkour park|my first gym|muay thai|^technogym$',
  'i',
);

const NOT_PUBLIC = new RegExp(
  'hotel|marriott|hilton|hyatt|westin|sheraton|ritz|four seasons|kimpton|residence|residents|' +
    'apartment|apts\\b|condo|lofts?\\b|tower|plaza|suites|\\binn\\b|university|college|campus|school|' +
    'academy|student|employee|staff|corporate|police|fire dep|firehouse|army|navy|marine|air force|' +
    'veterans|\\bva\\b|hospital|medical|clinic|rehab|senior|physical education|recreation center for|' +
    'club house|clubhouse|amenity|defence|raaf\\b|barracks|' +
    // Named one by one after reading the list: campus, employer, apartment and
    // navy gyms that the patterns above don't catch.
    'jerabeck|plofker|cac express|wang fitness|amli\\b|pottruck|vadm|eisminger|fink family|' +
    'hutchinson gym|drexel|ringe|city of atlanta wellness|top of the one|industrious|malkin|' +
    // The same for the Australian cities: staff, campus and community-health gyms.
    'social club|uni fitness|unigym|community care',
  'i',
);

const GENERIC = /^(the )?(fitness|gym|exercise|weight|workout|wellness)( ?(center|centre|room|studio|area|facility))?s?$/i;

const NOT_A_GYM_SPORTS = new Set([
  'yoga', 'pilates', 'barre', 'cycling', 'spin', 'dance', 'climbing', 'gymnastics', 'trapeze',
  'fencing', 'martial_arts', 'jiu-jitsu', 'karate', 'taekwondo', 'judo',
]);

const STUDIOS = new RegExp(
  'orange ?theory|f45|barry|basecamp|madabolic|row house|title boxing|rumble|9round|' +
    '30 minute hit|burn boot|shred415|\\[solidcore\\]|fhitting|tone house|boxing|hiit|bootcamp|boot camp|' +
    // Australian studio chains.
    '\\bbft\\b|body fit training|12 ?rnd|trib3|stepz|kx\\b|sweat ?hq|studio 12',
  'i',
);

const FULL_GYM_BRANDS = new RegExp(
  "equinox|planet fitness|la fitness|24 hour fitness|crunch|life ?time|gold's|anytime fitness|" +
    'ufc gym|blink|sports club|ymca|eōs|eos fitness|chuze|retro fitness|city fitness|fitness sf|' +
    // Australian chains.
    'jetts|plus fitness|goodlife|fitness first|world gym|genesis|snap fitness|revo fitness|club lime|' +
    "zap fitness|fit n fast|fit n' fast|healthworks|elite fitness",
  'i',
);

/** The map's `sport` values, split on ";" as written (no trimming, as the rules were tuned on). */
function sportSet(tags: Tags): Set<string> {
  return new Set((tags.sport ?? '').split(';').filter((sport) => sport !== ''));
}

/** Great-circle distance in kilometres. */
export function km(a: readonly [number, number], b: readonly [number, number]): number {
  const rad = Math.PI / 180;
  const lat1 = a[0] * rad;
  const lng1 = a[1] * rad;
  const lat2 = b[0] * rad;
  const lng2 = b[1] * rad;
  const h = Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lng2 - lng1) / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.sqrt(h));
}

/** A node's position, or a way's or relation's centre. */
export function position(el: OsmElement): [number, number] | null {
  if (el.lat !== undefined && el.lon !== undefined) return [el.lat, el.lon];
  return el.center ? [el.center.lat, el.center.lon] : null;
}

export function trainingType(name: string, tags: Tags): TrainingType {
  const sports = sportSet(tags);
  if (FULL_GYM_BRANDS.test(name) || FULL_GYM_BRANDS.test(tags.brand ?? '')) return 'full_gym';
  if (name.toLowerCase().includes('crossfit') || sports.has('crossfit')) return 'crossfit_box';
  if (STUDIOS.test(name) || ((sports.has('boxing') || sports.has('kickboxing')) && !sports.has('fitness'))) return 'studio';
  if (sports.size === 1 && sports.has('swimming')) return 'aquatic_centre';
  if (sports.size > 0 && [...sports].every((sport) => sport === 'weightlifting' || sport === 'powerlifting')) return 'strength_focused';
  return 'full_gym';
}

/** Whether a named fitness centre on the map is a gym a visitor could use. */
export function keep(name: string, tags: Tags): boolean {
  if (['private', 'no', 'customers', 'members', 'permit'].includes(tags.access ?? '')) return false;
  const sports = sportSet(tags);
  if (sports.size > 0 && [...sports].every((sport) => NOT_A_GYM_SPORTS.has(sport))) return false;
  if (NOT_A_GYM.test(name) || NOT_PUBLIC.test(name) || GENERIC.test(name.trim())) return false;
  if (['apartments', 'residential', 'hotel', 'dormitory', 'university', 'school'].includes(tags.building ?? '')) return false;
  return true;
}

// --- opening_hours: the simple subset ------------------------------------------

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const ORDER = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const TIME = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/;
const ONE_DAY = /^(Mo|Tu|We|Th|Fr|Sa|Su)$/;
const DAY_RANGE = /^(Mo|Tu|We|Th|Fr|Sa|Su)-(Mo|Tu|We|Th|Fr|Sa|Su)$/;

function dayList(spec: string): number[] | null {
  const days: number[] = [];
  for (const raw of spec.split(',')) {
    const part = raw.trim();
    if (ONE_DAY.test(part)) {
      days.push(DAYS.indexOf(part));
    } else if (DAY_RANGE.test(part)) {
      const a = ORDER.indexOf(part.slice(0, 2));
      const b = ORDER.indexOf(part.slice(3));
      const span: number[] = [];
      if (a <= b) for (let i = a; i <= b; i += 1) span.push(i);
      else {
        for (let i = a; i < 7; i += 1) span.push(i);
        for (let i = 0; i <= b; i += 1) span.push(i);
      }
      for (const i of span) days.push(DAYS.indexOf(ORDER[i]!));
    } else {
      return null;
    }
  }
  return days;
}

/** Round the clock, or [day (0 = Sunday), open, close] in minutes. */
export type MappedHours = 'always' | Array<[number, number, number]>;

/** 'always', a list of [day, open, close] windows, or null when not simple. */
export function parseHours(input: string): MappedHours | null {
  let text = input.trim();
  if (text === '24/7' || text === 'Mo-Su 00:00-24:00' || text === '00:00-24:00') return 'always';
  // "Mo-Fr 06:00-21:00, Sa 08:00-17:00": a comma before a day starts a new rule.
  text = text.replace(/,\s*(?=(Mo|Tu|We|Th|Fr|Sa|Su)\b)/g, '; ');
  const week = new Map<number, Array<[number, number]>>();
  const rules = text
    .split(';')
    .map((rule) => rule.trim())
    .filter((rule) => rule !== '');
  for (const rule of rules) {
    if (rule === 'PH off' || rule === 'PH closed') continue; // Holiday closures aren't modelled; the rest still holds.
    const m = /^((?:Mo|Tu|We|Th|Fr|Sa|Su)[A-Za-z,\- ]*?)\s+(.+)$/.exec(rule);
    let days: number[];
    let times: string;
    const listed = m ? dayList(m[1]!.replaceAll(' ', '')) : null;
    if (m && listed !== null) {
      days = listed;
      times = m[2]!.trim();
    } else if (/^\d/.test(rule)) {
      days = [0, 1, 2, 3, 4, 5, 6];
      times = rule;
    } else {
      return null;
    }
    if (times === 'off' || times === 'closed') {
      for (const day of days) week.set(day, []);
      continue;
    }
    const windows: Array<[number, number]> = [];
    for (const span of times.split(',')) {
      const t = TIME.exec(span.trim());
      if (!t) return null;
      const open = Number(t[1]) * 60 + Number(t[2]);
      let close = Number(t[3]) * 60 + Number(t[4]);
      if (close === 23 * 60 + 59) close = 1440;
      if (open >= 1440 || close > 1440) return null;
      if (close <= open) close += 1440; // Past midnight.
      windows.push([open, close]);
    }
    for (const day of days) week.set(day, windows); // A later rule replaces an earlier one for its days.
  }
  const out: Array<[number, number, number]> = [];
  for (const day of [...week.keys()].sort((a, b) => a - b)) {
    for (const [open, close] of week.get(day)!) out.push([day, open, close]);
  }
  if (out.length === 0) return null;
  if (out.length === 7 && out.every(([, open, close]) => open === 0 && close >= 1440)) return 'always';
  return out;
}

const ACTIVITIES: Record<string, string> = {
  swimming: 'Swimming', yoga: 'Yoga', pilates: 'Pilates', boxing: 'Boxing', kickboxing: 'Kickboxing',
  crossfit: 'CrossFit', weightlifting: 'Weightlifting', powerlifting: 'Powerlifting', cycling: 'Spin',
  spin: 'Spin', climbing: 'Climbing', martial_arts: 'Martial arts', 'jiu-jitsu': 'Jiu-jitsu',
  basketball: 'Basketball', squash: 'Squash', tennis: 'Tennis', running: 'Running', dance: 'Dance',
  gymnastics: 'Gymnastics', rowing: 'Rowing', barre: 'Barre', mma: 'MMA',
};

/** Sports and classes the map lists, beyond plain "fitness". */
export function activities(tags: Tags): string[] {
  const out: string[] = [];
  for (const sport of (tags.sport ?? '').split(';')) {
    const label = Object.hasOwn(ACTIVITIES, sport.trim()) ? ACTIVITIES[sport.trim()] : undefined;
    if (label && !out.includes(label)) out.push(label);
  }
  return out;
}

export type MappedAmenities = Partial<Record<'pool' | 'sauna' | 'showers' | 'step_free_entrance', 'yes' | 'no'>>;

/** Facilities the map states outright. Anything unmapped stays unknown. */
export function amenities(tags: Tags): MappedAmenities {
  const found: MappedAmenities = {};
  const sports = new Set((tags.sport ?? '').split(';'));
  if (['yes', 'indoor', 'outdoor'].includes(tags.swimming_pool ?? '') || sports.has('swimming')) found.pool = 'yes';
  if (tags.sauna === 'yes' || tags.sauna === 'no') found.sauna = tags.sauna;
  if (tags.shower === 'yes' || tags.shower === 'no') found.showers = tags.shower;
  // wheelchair=yes means step-free; "limited" says too little to call either way.
  if (tags.wheelchair === 'yes' || tags.wheelchair === 'no') found.step_free_entrance = tags.wheelchair;
  return found;
}

export function slug(text: string): string {
  return text
    .toLowerCase()
    .replaceAll("'", '')
    .replaceAll('’', '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
