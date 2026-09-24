"""
Fetch gyms and suburbs for GymGO's Australian map-only cities from
OpenStreetMap, through the Overpass API (maps.mail.ru mirror), and save each
city's raw answer with the time it was fetched.

    python3 scripts/fetch.py <dir>          fetch cities not already in <dir>
    python3 scripts/generate.py <dir>       then turn them into src/data.ts

The cities and radii must match src/cities.ts.
"""

import json, os, subprocess, sys, time

MIRROR = 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
UA = 'GymGO/0.1 (gym finder pilot; https://github.com/ashenkodituwakku/GymGO)'

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from generate import CITIES  # noqa: E402


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
    for city, (_state, lat, lng, radius) in CITIES.items():
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
