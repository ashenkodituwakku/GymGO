"""
Turn raw OpenStreetMap answers into src/data.ts.

Input: one JSON file per city (osm-us/<city>.json), each the saved answer to

    nwr["leisure"="fitness_centre"]["name"](around:R,lat,lng); out center tags;
    node["place"~"^(suburb|neighbourhood|quarter)$"]["name"](around:R,lat,lng); out tags;

from the Overpass API (maps.mail.ru mirror), with the time it was fetched.

What it keeps: places you can walk into and train on a gym floor, or take a
class at a fitness studio. It drops what the map says is private, gyms inside
hotels, apartment blocks, offices and campuses, generic "Fitness Center" rooms,
and yoga, pilates, barre, cycling, dance, climbing and kids' studios, which
aren't what GymGO is for. Then the 40 nearest the city centre.

Nothing is added that the map doesn't say. Opening hours are parsed only when
they're in the simple "Mo-Fr 06:00-22:00; Sa 08:00-20:00" form; anything else
is left out rather than guessed.

Usage: python3 scripts/generate.py <dir with city json files>
"""

import json, math, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'src', 'data.ts')
PER_CITY = 40
PLACES_PER_CITY = 14

# Must match src/cities.ts.
CITIES = {
    'new-york': ('NY', 40.7549, -73.9840, 6000),
    'los-angeles': ('CA', 34.0736, -118.3400, 9000),
    'chicago': ('IL', 41.8900, -87.6300, 6000),
    'houston': ('TX', 29.7500, -95.3800, 8000),
    'miami': ('FL', 25.7800, -80.1600, 7000),
    'san-francisco': ('CA', 37.7749, -122.4194, 5000),
    'seattle': ('WA', 47.6150, -122.3350, 5000),
    'boston': ('MA', 42.3550, -71.0650, 5000),
    'austin': ('TX', 30.2750, -97.7400, 6000),
    'denver': ('CO', 39.7400, -104.9850, 6000),
    'las-vegas': ('NV', 36.1400, -115.1600, 8000),
    'washington-dc': ('DC', 38.9050, -77.0350, 5000),
    'atlanta': ('GA', 33.7700, -84.3850, 6000),
    'san-diego': ('CA', 32.7300, -117.1550, 6000),
    'philadelphia': ('PA', 39.9526, -75.1652, 5000),
}
CITY_NAMES = {
    'new-york': 'New York', 'los-angeles': 'Los Angeles', 'chicago': 'Chicago', 'houston': 'Houston',
    'miami': 'Miami', 'san-francisco': 'San Francisco', 'seattle': 'Seattle', 'boston': 'Boston',
    'austin': 'Austin', 'denver': 'Denver', 'las-vegas': 'Las Vegas', 'washington-dc': 'Washington',
    'atlanta': 'Atlanta', 'san-diego': 'San Diego', 'philadelphia': 'Philadelphia',
}

NOT_A_GYM = re.compile(
    r'yoga|pilates|barre|bar method|soulcycle|cyclebar|cycle house|flywheel|b/spoke|spin|ride\b|'
    r'solidcore|dance|ballet|climb|boulder|gymnastic|little gym|my gym|stretch|trapeze|fenc|'
    r'hotworx|jiu|karate|taekwondo|martial|kung fu|judo|aikido|physical therapy|physiotherap|'
    r'chiropract|massage|spa\b|kids|pole\b|aerial|bodyrok|lagree|megaformer|reformer|swim school|'
    r'zumba|piyo|down dog|physique 57|revolution studio|cycle|handle bar|rock gym|exhale|krav|kms\b|'
    r'combat|mma\b|ismma|grinning yogi|float|cryo|squash|syretch|platesculpt|boys and girls|define body',
    re.I,
)
NOT_PUBLIC = re.compile(
    r'hotel|marriott|hilton|hyatt|westin|sheraton|ritz|four seasons|kimpton|residence|residents|'
    r'apartment|apts\b|condo|lofts?\b|tower|plaza|suites|\binn\b|university|college|campus|school|'
    r'academy|student|employee|staff|corporate|police|fire dep|firehouse|army|navy|marine|air force|'
    r'veterans|\bva\b|hospital|medical|clinic|rehab|senior|physical education|recreation center for|'
    r'club house|clubhouse|amenity|'
    # Named one by one after reading the list: campus, employer, apartment and
    # navy gyms that the patterns above don't catch.
    r'jerabeck|plofker|cac express|wang fitness|amli\b|pottruck|vadm|eisminger|fink family|'
    r'hutchinson gym|drexel|ringe|city of atlanta wellness|top of the one|industrious|malkin',
    re.I,
)
GENERIC = re.compile(r'^(the )?(fitness|gym|exercise|weight|workout|wellness)( ?(center|centre|room|studio|area|facility))?s?$', re.I)
NOT_A_GYM_SPORTS = {'yoga', 'pilates', 'barre', 'cycling', 'spin', 'dance', 'climbing', 'gymnastics', 'trapeze',
                    'fencing', 'martial_arts', 'jiu-jitsu', 'karate', 'taekwondo', 'judo'}
STUDIOS = re.compile(r'orange ?theory|f45|barry|basecamp|madabolic|row house|title boxing|rumble|9round|'
                     r'30 minute hit|burn boot|shred415|\[solidcore\]|fhitting|tone house|boxing|hiit|bootcamp|boot camp', re.I)


def km(a, b):
    lat1, lng1 = map(math.radians, a)
    lat2, lng2 = map(math.radians, b)
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lng2 - lng1) / 2) ** 2
    return 6371.0088 * 2 * math.asin(math.sqrt(h))


def position(el):
    if 'lat' in el:
        return el['lat'], el['lon']
    c = el.get('center')
    return (c['lat'], c['lon']) if c else None


FULL_GYM_BRANDS = re.compile(r"equinox|planet fitness|la fitness|24 hour fitness|crunch|life ?time|gold's|anytime fitness|"
                             r'ufc gym|blink|sports club|ymca|eōs|eos fitness|chuze|retro fitness|city fitness|fitness sf', re.I)


def training_type(name, tags):
    sports = set(tags.get('sport', '').split(';')) - {''}
    if FULL_GYM_BRANDS.search(name) or FULL_GYM_BRANDS.search(tags.get('brand', '')):
        return 'full_gym'
    if 'crossfit' in name.lower() or 'crossfit' in sports:
        return 'crossfit_box'
    if STUDIOS.search(name) or (sports & {'boxing', 'kickboxing'} and 'fitness' not in sports):
        return 'studio'
    if sports == {'swimming'}:
        return 'aquatic_centre'
    if sports and sports <= {'weightlifting', 'powerlifting'}:
        return 'strength_focused'
    return 'full_gym'


def keep(name, tags):
    if tags.get('access') in ('private', 'no', 'customers', 'members', 'permit'):
        return False
    sports = set(tags.get('sport', '').split(';')) - {''}
    if sports and sports <= NOT_A_GYM_SPORTS:
        return False
    if NOT_A_GYM.search(name) or NOT_PUBLIC.search(name) or GENERIC.match(name.strip()):
        return False
    if tags.get('building') in ('apartments', 'residential', 'hotel', 'dormitory', 'university', 'school'):
        return False
    return True


# --- opening_hours: the simple subset -----------------------------------------
DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
ORDER = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
TIME = re.compile(r'^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$')


def day_list(spec):
    days = []
    for part in spec.split(','):
        part = part.strip()
        if re.fullmatch(r'(Mo|Tu|We|Th|Fr|Sa|Su)', part):
            days.append(DAYS.index(part))
        elif re.fullmatch(r'(Mo|Tu|We|Th|Fr|Sa|Su)-(Mo|Tu|We|Th|Fr|Sa|Su)', part):
            a, b = ORDER.index(part[:2]), ORDER.index(part[3:])
            span = range(a, b + 1) if a <= b else list(range(a, 7)) + list(range(0, b + 1))
            days.extend(DAYS.index(ORDER[i]) for i in span)
        else:
            return None
    return days


def parse_hours(text):
    """'always', a list of [day, open, close] windows, or None when not simple."""
    text = text.strip()
    if text in ('24/7', 'Mo-Su 00:00-24:00', '00:00-24:00'):
        return 'always'
    # "Mo-Fr 06:00-21:00, Sa 08:00-17:00": a comma before a day starts a new rule.
    text = re.sub(r',\s*(?=(Mo|Tu|We|Th|Fr|Sa|Su)\b)', '; ', text)
    week = {}
    for rule in [r.strip() for r in text.split(';') if r.strip()]:
        if rule in ('PH off', 'PH closed'):
            continue  # Holiday closures aren't modelled; the rest still holds.
        m = re.fullmatch(r'((?:Mo|Tu|We|Th|Fr|Sa|Su)[A-Za-z,\- ]*?)\s+(.+)', rule)
        if m and day_list(m.group(1).replace(' ', '')) is not None:
            days, times = day_list(m.group(1).replace(' ', '')), m.group(2).strip()
        elif re.match(r'^\d', rule):
            days, times = list(range(7)), rule
        else:
            return None
        if times in ('off', 'closed'):
            for d in days:
                week[d] = []
            continue
        windows = []
        for span in times.split(','):
            t = TIME.match(span.strip())
            if not t:
                return None
            open_, close = int(t[1]) * 60 + int(t[2]), int(t[3]) * 60 + int(t[4])
            if close == 23 * 60 + 59:
                close = 1440
            if open_ >= 1440 or close > 1440:
                return None
            if close <= open_:
                close += 1440  # Past midnight.
            windows.append([open_, close])
        for d in days:
            week[d] = windows  # A later rule replaces an earlier one for its days.
    out = [[d, o, c] for d in sorted(week) for o, c in week[d]]
    if not out:
        return None
    if len(out) == 7 and all(o == 0 and c >= 1440 for _, o, c in out):
        return 'always'
    return out


ACTIVITIES = {
    'swimming': 'Swimming', 'yoga': 'Yoga', 'pilates': 'Pilates', 'boxing': 'Boxing', 'kickboxing': 'Kickboxing',
    'crossfit': 'CrossFit', 'weightlifting': 'Weightlifting', 'powerlifting': 'Powerlifting', 'cycling': 'Spin',
    'spin': 'Spin', 'climbing': 'Climbing', 'martial_arts': 'Martial arts', 'jiu-jitsu': 'Jiu-jitsu',
    'basketball': 'Basketball', 'squash': 'Squash', 'tennis': 'Tennis', 'running': 'Running', 'dance': 'Dance',
    'gymnastics': 'Gymnastics', 'rowing': 'Rowing', 'barre': 'Barre', 'mma': 'MMA',
}


def activities(tags):
    """Sports and classes the map lists, beyond plain "fitness"."""
    out = []
    for sport in tags.get('sport', '').split(';'):
        label = ACTIVITIES.get(sport.strip())
        if label and label not in out:
            out.append(label)
    return out


def amenities(tags):
    """Facilities the map states outright. Anything unmapped stays unknown."""
    found = {}
    sports = set(tags.get('sport', '').split(';'))
    if tags.get('swimming_pool') in ('yes', 'indoor', 'outdoor') or 'swimming' in sports:
        found['pool'] = 'yes'
    if tags.get('sauna') in ('yes', 'no'):
        found['sauna'] = tags['sauna']
    if tags.get('shower') in ('yes', 'no'):
        found['showers'] = tags['shower']
    # wheelchair=yes means step-free; "limited" says too little to call either way.
    if tags.get('wheelchair') in ('yes', 'no'):
        found['step_free_entrance'] = tags['wheelchair']
    return found


def slug(text):
    return re.sub(r'[^a-z0-9]+', '-', text.lower().replace("'", '').replace('’', '')).strip('-')


def ts(value):
    return json.dumps(value, ensure_ascii=False)


def main(src):
    fetched, gyms_out, places_out, ids, stats = {}, [], [], set(), {}
    parsed = unparsed = 0
    for city, (state, lat, lng, radius) in CITIES.items():
        data = json.load(open(os.path.join(src, f'{city}.json')))
        fetched[city] = data['fetchedAt']
        centre = (lat, lng)
        seen, rows = set(), []
        for el in data['gyms']:
            tags, name = el['tags'], el['tags']['name'].strip()
            pos = position(el)
            if not pos or not keep(name, tags):
                continue
            key = (name.lower(), round(pos[0], 4), round(pos[1], 4))
            if key in seen:
                continue
            seen.add(key)
            rows.append((km(centre, pos), el, name, tags, pos))
        rows.sort(key=lambda r: r[0])
        kept = rows[:PER_CITY]
        stats[city] = (len(data['gyms']), len(rows), len(kept))
        for _, el, name, tags, pos in kept:
            street = tags.get('addr:street', '')
            number = tags.get('addr:housenumber', '')
            line1 = f'{number} {street}'.strip() if street else ''
            branch = (tags.get('branch') or '').strip()
            if branch.startswith('(') and branch.endswith(')'):
                branch = branch[1:-1].strip()
            branch = branch or None
            base = slug('-'.join(filter(None, [name, branch or (street if street else None), city])))
            gid = base if base not in ids else f'{base}-{el["type"][0]}{el["id"]}'
            ids.add(gid)
            row = {
                'city': city,
                'id': gid,
                'osm': f'{el["type"]}/{el["id"]}',
                'name': name,
            }
            if tags.get('brand'):
                row['brand'] = tags['brand']
            if re.fullmatch(r'Q\d+', tags.get('brand:wikidata', '')):
                row['brandWikidata'] = tags['brand:wikidata']
            if branch:
                row['branch'] = branch
            row['line1'] = line1
            row['locality'] = tags.get('addr:city') or CITY_NAMES[city]
            row['state'] = (tags.get('addr:state') or state).upper()[:2]
            row['zip'] = (tags.get('addr:postcode') or '')[:5]
            row['lat'] = round(pos[0], 6)
            row['lng'] = round(pos[1], 6)
            row['type'] = training_type(name, tags)
            phone = tags.get('phone') or tags.get('contact:phone')
            if phone:
                row['phone'] = phone.split(';')[0].strip()
            site = tags.get('website') or tags.get('contact:website')
            if site and site.startswith('http'):
                row['website'] = site.split(';')[0].strip()
            email = (tags.get('email') or tags.get('contact:email') or '').split(';')[0].strip()
            if re.fullmatch(r'[^@\s]+@[^@\s]+\.[^@\s]+', email):
                row['email'] = email
            if activities(tags):
                row['activities'] = activities(tags)
            if amenities(tags):
                row['amenities'] = amenities(tags)
            if tags.get('opening_hours'):
                hours = parse_hours(tags['opening_hours'])
                if hours is None:
                    unparsed += 1
                else:
                    parsed += 1
                    row['hours'] = hours
            gyms_out.append(row)

        # Neighbourhoods for the search box: the notable ones (they have a
        # Wikidata entry), nearest the centre first.
        names = set()
        cands = []
        for el in data['places']:
            tags = el['tags']
            pos = position(el)
            if not pos or 'wikidata' not in tags:
                continue
            name = re.sub(r'^\w+: ', '', tags.get('name:en') or tags['name'])  # "18b: The Arts District"
            # Heritage listings, not names people search for.
            if re.search(r'historic district|thematic', name, re.I):
                continue
            if name.lower() in names or name.lower() == CITY_NAMES[city].lower():
                continue
            names.add(name.lower())
            cands.append((km(centre, pos), name, pos))
        cands.sort()
        for _, name, pos in cands[:PLACES_PER_CITY]:
            places_out.append({'city': city, 'name': name, 'lat': round(pos[0], 5), 'lng': round(pos[1], 5)})

    lines = [
        '// Generated by scripts/generate.py from OpenStreetMap data. Do not edit by hand.',
        '// © OpenStreetMap contributors, available under the Open Database License (ODbL).',
        '',
        "import type { GymRow, PlaceRow, UsCityId } from './rows';",
        '',
        '/** When each city\'s data was fetched from the Overpass API. */',
        'export const FETCHED: Record<UsCityId, string> = {',
    ]
    lines += [f"  '{c}': '{t}'," for c, t in fetched.items()]
    lines += ['};', '', '// prettier-ignore', 'export const GYM_ROWS: GymRow[] = [']
    lines += [f'  {ts(row)},' for row in gyms_out]
    lines += ['];', '', '// prettier-ignore', 'export const PLACE_ROWS: PlaceRow[] = [']
    lines += [f'  {ts(row)},' for row in places_out]
    lines += ['];', '']
    open(OUT, 'w').write('\n'.join(lines))
    for city, (raw, ok, kept) in stats.items():
        print(f'{city:15} {raw:4} mapped, {ok:4} kept after filters, {kept:3} used')
    print('gyms', len(gyms_out), 'places', len(places_out), 'hours parsed', parsed, 'unparsed', unparsed)


if __name__ == '__main__':
    main(sys.argv[1])
