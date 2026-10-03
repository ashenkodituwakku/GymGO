"""
Fetch gyms and neighborhoods for GymGO's US map-only cities from
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
    'new-york': (40.7549, -73.984, 6000),
    'los-angeles': (34.0736, -118.34, 9000),
    'chicago': (41.89, -87.63, 6000),
    'houston': (29.75, -95.38, 8000),
    'miami': (25.78, -80.16, 7000),
    'san-francisco': (37.7749, -122.4194, 5000),
    'seattle': (47.615, -122.335, 5000),
    'boston': (42.355, -71.065, 5000),
    'austin': (30.275, -97.74, 6000),
    'denver': (39.74, -104.985, 6000),
    'las-vegas': (36.14, -115.16, 8000),
    'washington-dc': (38.905, -77.035, 5000),
    'atlanta': (33.77, -84.385, 6000),
    'san-diego': (32.73, -117.155, 6000),
    'philadelphia': (39.9526, -75.1652, 5000),
    'phoenix': (33.4484, -112.074, 10000),
    'dallas': (32.7831, -96.8067, 10000),
    'san-antonio': (29.4252, -98.4946, 10000),
    'san-jose': (37.3337, -121.89, 6000),
    'portland': (45.5202, -122.6742, 5000),
    'nashville': (36.1627, -86.7816, 9000),
    'minneapolis': (44.9778, -93.265, 5000),
    'new-orleans': (29.9511, -90.0715, 8000),
    'orlando': (28.5384, -81.3789, 10000),
    'tampa': (27.9506, -82.4572, 6000),
    'charlotte': (35.2271, -80.8431, 5000),
    'salt-lake-city': (40.7608, -111.891, 8000),
    'detroit': (42.3314, -83.0458, 9000),
    'pittsburgh': (40.4406, -79.9959, 8000),
    'baltimore': (39.2904, -76.6122, 5000),
    'kansas-city': (39.0997, -94.5786, 8000),
    'columbus': (39.9612, -82.9988, 6000),
    'indianapolis': (39.7684, -86.1581, 10000),
    'raleigh': (35.7796, -78.6382, 10000),
    'sacramento': (38.5816, -121.4944, 9000),
    'st-louis': (38.627, -90.1994, 9000),
    'honolulu': (21.2969, -157.8583, 6000),
    'brooklyn': (40.675, -73.97, 4000),
    'oakland': (37.8044, -122.2712, 5000),
    'cleveland': (41.4993, -81.6944, 9000),
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
        print(city, len(gyms['elements']), 'gyms,', len(places['elements']), 'neighborhoods', flush=True)
        time.sleep(2)


if __name__ == '__main__':
    main(sys.argv[1])
