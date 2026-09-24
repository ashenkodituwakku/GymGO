"""
Turn raw OpenStreetMap answers into src/data.ts for GymGO's map-only
Australian cities.

Input: one JSON file per city (from scripts/fetch.py), each the saved answer to

    nwr["leisure"="fitness_centre"]["name"](around:R,lat,lng); out center tags;
    node["place"~"^(suburb|neighbourhood|quarter)$"]["name"](around:R,lat,lng); out;

from the Overpass API (maps.mail.ru mirror), with the time it was fetched.

What counts as a gym is decided in scripts/osm_gyms.py at the repository
root, shared with packages/usa-data. Then the 40 nearest the city centre.

Usage: python3 scripts/generate.py <dir with city json files>
"""

import json, os, re, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'scripts'))
from osm_gyms import activities, amenities, keep, km, parse_hours, position, slug, training_type, ts  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'src', 'data.ts')
PER_CITY = 40
PLACES_PER_CITY = 14
STATES = {'ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'}

# Must match src/cities.ts.
CITIES = {
    'sydney': ('NSW', -33.8688, 151.2093, 7000),
    'brisbane': ('QLD', -27.4698, 153.0251, 7000),
    'perth': ('WA', -31.9523, 115.8613, 7000),
    'adelaide': ('SA', -34.9285, 138.6007, 6000),
    'canberra': ('ACT', -35.2809, 149.1300, 8000),
    'gold-coast': ('QLD', -28.0023, 153.4145, 9000),
    'hobart': ('TAS', -42.8821, 147.3272, 6000),
}
CITY_NAMES = {
    'sydney': 'Sydney', 'brisbane': 'Brisbane', 'perth': 'Perth', 'adelaide': 'Adelaide', 'canberra': 'Canberra',
    'gold-coast': 'Gold Coast', 'hobart': 'Hobart',
}


def state_of(tags, default):
    """The state from the address when it's a real Australian one ("Queensland" → QLD)."""
    raw = (tags.get('addr:state') or '').strip().upper()
    names = {'QUEENSLAND': 'QLD', 'WESTERN AUSTRALIA': 'WA', 'SOUTH AUSTRALIA': 'SA', 'TASMANIA': 'TAS',
             'AUSTRALIAN CAPITAL TERRITORY': 'ACT', 'NEW SOUTH WALES': 'NSW', 'VICTORIA': 'VIC', 'NORTHERN TERRITORY': 'NT'}
    raw = names.get(raw, raw)
    return raw if raw in STATES else default


def main(src):
    fetched, gyms_out, places_out, ids, stats = {}, [], [], set(), {}
    parsed = unparsed = 0
    for city, (state, lat, lng, _radius) in CITIES.items():
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
            row = {'city': city, 'id': gid, 'osm': f'{el["type"]}/{el["id"]}', 'name': name}
            if tags.get('brand'):
                row['brand'] = tags['brand']
            if re.fullmatch(r'Q\d+', tags.get('brand:wikidata', '')):
                row['brandWikidata'] = tags['brand:wikidata']
            if branch:
                row['branch'] = branch
            row['line1'] = line1
            row['suburb'] = tags.get('addr:suburb') or tags.get('addr:city') or CITY_NAMES[city]
            row['state'] = state_of(tags, state)
            postcode = (tags.get('addr:postcode') or '').strip()
            row['postcode'] = postcode if re.fullmatch(r'\d{4}', postcode) else ''
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

        # Suburbs for the search box, nearest the centre first. Australian
        # suburbs are official names, so every place=suburb counts; smaller
        # neighbourhoods only when they're notable (they have a Wikidata entry).
        names = set()
        cands = []
        for el in data['places']:
            tags = el['tags']
            pos = position(el)
            if not pos or (tags.get('place') != 'suburb' and 'wikidata' not in tags):
                continue
            name = tags.get('name:en') or tags['name']
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
        "import type { AuCityId, GymRow, PlaceRow } from './rows';",
        '',
        "/** When each city's data was fetched from the Overpass API. */",
        'export const FETCHED: Record<AuCityId, string> = {',
    ]
    lines += [f"  '{c}': '{t}'," for c, t in fetched.items()]
    lines += ['};', '', '// prettier-ignore', 'export const GYM_ROWS: GymRow[] = [']
    lines += [f'  {ts(row)},' for row in gyms_out]
    lines += ['];', '', '// prettier-ignore', 'export const PLACE_ROWS: PlaceRow[] = [']
    lines += [f'  {ts(row)},' for row in places_out]
    lines += ['];', '']
    open(OUT, 'w').write('\n'.join(lines))
    for city, (raw, ok, kept) in stats.items():
        print(f'{city:12} {raw:4} mapped, {ok:4} kept after filters, {kept:3} used')
    print('gyms', len(gyms_out), 'suburbs', len(places_out), 'hours parsed', parsed, 'unparsed', unparsed)


if __name__ == '__main__':
    main(sys.argv[1])
