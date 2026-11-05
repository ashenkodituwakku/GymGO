"""
Find the own websites of Australian gyms the map lists without one, so they
can show their own icon.

For each gym it tries the domains a gym of that name would most likely own
(the name run together or hyphenated, .com.au then .com) and accepts one only
when all of these hold:

  - the site answers, and its title (or og:site_name) contains every
    distinctive word of the gym's name (not "gym", "fitness", "club"...);
  - the page mentions the gym's suburb, or, when the suburb is a whole city
    (Melbourne, Sydney...), the gym's street as well;
  - the gym's name has two distinctive words, or one of seven letters or
    more, so "Dragon" or "Loading" can't match someone else's site.

Anything less and the gym keeps no website. It prints the candidates; they're
read by hand before going into src/websites.ts (a name can still match
another business's site).

    python3 scripts/websites.py <gyms.json>

<gyms.json> is a list of {id, name, suburb, line1, state}.
"""

import concurrent.futures, html, json, os, re, subprocess, sys, time

UA = 'Mozilla/5.0 (compatible; GymGO/0.1; +https://github.com/ashenkodituwakku/GymGO)'
CITIES = {'melbourne', 'sydney', 'brisbane', 'perth', 'adelaide', 'canberra', 'hobart', 'gold coast'}
FILLER = {'the', 'and', 'of', 'at', 'by', '&', 'co', 'pty', 'ltd'}


def words(text):
    return [w for w in re.findall(r'[a-z0-9]+', text.lower().replace('’', '').replace("'", '')) if w not in FILLER]


GENERIC = {'gym', 'gyms', 'fitness', 'club', 'studio', 'studios', 'training', 'centre', 'center', 'health', 'personal', 'strength', '24', '7', '247'}


def distinctive(name):
    return [w for w in words(name) if w not in GENERIC]


def candidates(name):
    parts = words(name)
    core = distinctive(name)
    stems = [''.join(parts), '-'.join(parts)]
    # "The Underground Fitness Club" is often undergroundfitness.com.au: the name less its last generic word(s).
    trimmed = list(parts)
    while len(trimmed) > 1 and trimmed[-1] in GENERIC:
        trimmed.pop()
        stems.append(''.join(trimmed))
    if core and len(''.join(core)) >= 6:
        stems += [''.join(core) + 'gym', ''.join(core) + 'fitness']
    seen, out = set(), []
    for stem in stems:
        for tld in ('.com.au', '.com'):
            host = stem + tld
            if stem and host not in seen:
                seen.add(host)
                out.append(f'https://{host}/')
    return out


def fetch(url):
    try:
        r = subprocess.run(
            ['curl', '-sSL', '--max-time', '12', '--max-filesize', '3000000', '-A', UA, '-o', '-', '-w', '\n@@%{http_code} %{url_effective}', url],
            capture_output=True, timeout=20,
        )
    except subprocess.TimeoutExpired:
        return None
    body, _, tail = r.stdout.rpartition(b'\n@@')
    try:
        code, final = tail.decode().split(' ', 1)
    except ValueError:
        return None
    if code != '200':
        return None
    return body.decode('utf-8', 'replace'), final


def title_of(page):
    found = re.search(r'<title[^>]*>(.*?)</title>', page, re.S | re.I)
    site = re.search(r'<meta[^>]+property=["\']og:site_name["\'][^>]+content=["\']([^"\']+)', page, re.I)
    return ' '.join(html.unescape(m.group(1)) for m in (found, site) if m)


def text_of(page):
    page = re.sub(r'<(script|style)[^>]*>.*?</\1>', ' ', page, flags=re.S | re.I)
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', page))).lower()


def street_of(line1):
    # "123 Smith Street" -> "smith"; the street's own name, without the number or type.
    parts = [w for w in words(line1) if not w.isdigit() and w not in {'street', 'st', 'road', 'rd', 'avenue', 'ave', 'highway', 'hwy', 'parade', 'pde', 'lane', 'drive', 'dr', 'shop', 'level', 'unit', 'suite'}]
    return parts[0] if parts else None


def check(gym):
    name_words = distinctive(gym['name'])
    # Too little to go on: "Dragon", "Loading", or a name that's only generic words.
    if not name_words or (len(name_words) < 2 and len(name_words[0]) < 7):
        return None
    suburb = gym['suburb'].strip().lower()
    street = street_of(gym.get('line1') or '')
    for url in candidates(gym['name']):
        got = fetch(url)
        if not got:
            continue
        page, final = got
        title = ' '.join(words(title_of(page)))
        if not all(re.search(rf'\b{re.escape(w)}\b', title) or w in title.replace(' ', '') for w in name_words):
            continue
        body = text_of(page)
        if suburb in CITIES or not suburb:
            if not street or street not in body:
                continue
        elif suburb not in body:
            continue
        host = re.match(r'https?://[^/]+/', final + '/').group(0)
        return {'id': gym['id'], 'website': host, 'title': title_of(page)[:80]}
    return None


def main(src):
    gyms = json.load(open(src))
    found = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
        for result in pool.map(check, gyms):
            if result:
                found.append(result)
                print('found', result['id'], result['website'], '|', result['title'], flush=True)
    found.sort(key=lambda row: row['id'])
    print(len(found), 'of', len(gyms), 'gyms have a website found')


if __name__ == '__main__':
    main(sys.argv[1])
