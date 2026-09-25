"""
Fetch gyms and suburbs for GymGO's Australian map-only cities from
OpenStreetMap, through the Overpass API (maps.mail.ru mirror), and save each
city's raw answer with the time it was fetched.

    python3 scripts/fetch.py <dir>          fetch cities not already in <dir>
    pnpm generate <dir>                     then turn them into src/data.ts

The cities and radii must match src/cities.ts.
"""

import json, os, subprocess, sys, time

MIRROR = 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
UA = 'GymGO/0.1 (gym finder pilot; https://github.com/ashenkodituwakku/GymGO)'

# Must match src/cities.ts: centre and radius in metres.
CITIES = {
    'melbourne': (-37.8142, 144.9632, 7000),
    'sydney': (-33.8688, 151.2093, 7000),
    'brisbane': (-27.4698, 153.0251, 7000),
    'perth': (-31.9523, 115.8613, 7000),
    'adelaide': (-34.9285, 138.6007, 6000),
    'canberra': (-35.2809, 149.1300, 8000),
    'gold-coast': (-28.0023, 153.4145, 9000),
    'hobart': (-42.8821, 147.3272, 6000),
}


def overpass(query):
    for attempt in range(6):
        r = subprocess.run(['curl', '-sS', '--max-time', '120', '-A', UA, '-H', 'Accept: application/json', '-X', 'POST', MIRROR,
                            '--data-urlencode', 'data=' + query, '-w', '\n%{http_code}'], capture_output=True, text=True)
        body, _, code = r.stdout.rpartition('\n')
        if code == '200':
            try:
                return json.loads(body)
            except ValueError:
                pass
        print('  retry', attempt + 1, code, r.stderr.strip()[:80], file=sys.stderr)
        time.sleep(3 + attempt * 4)
    raise SystemExit('failed: ' + query[:80])


def main(out):
    os.makedirs(out, exist_ok=True)
    for city, (lat, lng, radius) in CITIES.items():
        path = os.path.join(out, f'{city}.json')
        if os.path.exists(path):
            print(city, 'already fetched')
            continue
        around = f'(around:{radius},{lat},{lng})'
        gyms = overpass(f'[out:json][timeout:90];nwr["leisure"="fitness_centre"]["name"]{around};out center tags;')
        time.sleep(2)
        places = overpass(f'[out:json][timeout:90];node["place"~"^(suburb|neighbourhood|quarter)$"]["name"]{around};out;')
        fetched = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        json.dump({'fetchedAt': fetched, 'gyms': gyms['elements'], 'places': places['elements']}, open(path, 'w'))
        print(city, len(gyms['elements']), 'gyms,', len(places['elements']), 'suburbs')
        time.sleep(2)


if __name__ == '__main__':
    main(sys.argv[1])
