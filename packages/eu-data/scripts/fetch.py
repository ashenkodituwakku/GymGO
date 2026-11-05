"""
Fetch gyms and districts for GymGO's European map-only cities from
OpenStreetMap, through the Overpass API (lz4 instance, else the mail.ru mirror), and save each
city's raw answer with the time it was fetched.

    python3 scripts/fetch.py <dir>          fetch cities not already in <dir>
    pnpm generate <dir>                     then turn them into src/data.ts

The cities and radii must match src/cities.ts.
"""

import json, math, os, subprocess, sys, time

# Tried in turn each attempt: the main Overpass service's second instance,
# then the mail.ru mirror (overpass-api.de itself refuses this network).
MIRRORS = [
    'https://lz4.overpass-api.de/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]
UA = 'GymGO/0.1 (gym finder pilot; https://github.com/ashenkodituwakku/GymGO)'

# Must match src/cities.ts: centre and radius in metres.
CITIES = {
    'london': (51.5098, -0.118, 5000),
    'paris': (48.8606, 2.3376, 5000),
    'berlin': (52.5163, 13.3889, 6000),
    'madrid': (40.4168, -3.7038, 5000),
    'barcelona': (41.3874, 2.1686, 5000),
    'rome': (41.9009, 12.4833, 6000),
    'milan': (45.4642, 9.19, 5000),
    'amsterdam': (52.3702, 4.8952, 5000),
    'dublin': (53.3498, -6.2603, 5000),
    'lisbon': (38.7223, -9.1393, 5000),
    'vienna': (48.2082, 16.3738, 5000),
    'munich': (48.1374, 11.5755, 5000),
    'stockholm': (59.3326, 18.0649, 5000),
    'copenhagen': (55.6761, 12.5683, 5000),
    'zurich': (47.3769, 8.5417, 5000),
}


def overpass(query):
    for attempt in range(6):
        for mirror in MIRRORS:
            r = subprocess.run(['curl', '-sS', '--max-time', '120', '-A', UA, '-H', 'Accept: application/json', '-X', 'POST', mirror,
                                '--data-urlencode', 'data=' + query, '-w', '\n%{http_code}'], capture_output=True, text=True)
            body, _, code = r.stdout.rpartition('\n')
            if code == '200':
                try:
                    return json.loads(body)
                except ValueError:
                    pass
            print('  retry', attempt + 1, mirror.split('/')[2], code, r.stderr.strip()[:80], file=sys.stderr)
        time.sleep(3 + attempt * 4)
    raise SystemExit('failed: ' + query[:80])


def main(out):
    os.makedirs(out, exist_ok=True)
    for city, (lat, lng, radius) in CITIES.items():
        path = os.path.join(out, f'{city}.json')
        if os.path.exists(path):
            print(city, 'already fetched')
            continue
        # The circle's bounding box: much quicker for Overpass than (around:),
        # which the mirror gave up on for central London. generate.ts keeps
        # only what's inside the circle.
        dlat = radius / 111320
        dlng = radius / (111320 * math.cos(math.radians(lat)))
        bbox = f'[bbox:{lat - dlat:.5f},{lng - dlng:.5f},{lat + dlat:.5f},{lng + dlng:.5f}]'
        gyms = overpass(f'[out:json][timeout:55]{bbox};nwr["leisure"="fitness_centre"]["name"];out center tags;')
        time.sleep(2)
        places = overpass(f'[out:json][timeout:55]{bbox};node["place"~"^(suburb|neighbourhood|quarter)$"]["name"];out;')
        fetched = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        json.dump({'fetchedAt': fetched, 'gyms': gyms['elements'], 'places': places['elements']}, open(path, 'w'))
        print(city, len(gyms['elements']), 'gyms,', len(places['elements']), 'districts', flush=True)
        time.sleep(2)


if __name__ == '__main__':
    main(sys.argv[1])
