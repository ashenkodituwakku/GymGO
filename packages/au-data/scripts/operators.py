"""
Read gyms from operators' own websites into src/operatorData.ts.

Only chains that publish their branches in machine-readable form, so every
fact is copied, never retyped. So far, Revo Fitness: its gyms page embeds
the full list (with each branch's open date), and each branch's page carries
a schema.org HealthClub with the address, map position, phone and opening
hours.

    python3 scripts/operators.py fetch <dir>     download the pages into <dir>
    python3 scripts/operators.py build <dir>     write src/operatorData.ts from them

A branch whose open date is still to come, or that the site marks as coming
soon, is left out: it isn't a gym anyone can use yet.
"""

import html, json, os, re, subprocess, sys, time

UA = 'GymGO/0.1 (gym finder pilot; https://github.com/ashenkodituwakku/GymGO)'
REVO = 'https://revofitness.com.au/gyms/'
OUT = os.path.join(os.path.dirname(__file__), '..', 'src', 'operatorData.ts')
STATES = {'ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'}


def get(url, path):
    subprocess.run(['curl', '-sS', '--fail', '--retry', '3', '--max-time', '40', '-A', UA, url, '-o', path], check=True)


def revo_list(index_html):
    found = re.search(r'<script id="gym-data-json" type="application/json">(.*?)</script>', index_html, re.S)
    if not found:
        raise SystemExit('Revo: the gyms page no longer embeds its gym list')
    return json.loads(found.group(1))


def field(gym, key):
    return (gym['fields'].get(key) or [''])[0]


def is_open(gym, today):
    opens = field(gym, 'gym_open_date')
    return gym.get('post_status') == 'publish' and field(gym, 'coming_soon') != '1' and (opens == '' or opens <= today)


def fetch(out):
    os.makedirs(out, exist_ok=True)
    get(REVO, os.path.join(out, 'revo-index.html'))
    today = time.strftime('%Y%m%d', time.gmtime())
    gyms = revo_list(open(os.path.join(out, 'revo-index.html'), encoding='utf-8').read())
    for gym in gyms:
        if not is_open(gym, today):
            continue
        path = os.path.join(out, f"revo-{gym['post_name']}.html")
        if not os.path.exists(path):
            get(f"{REVO}{gym['post_name']}/", path)
            time.sleep(1)
    json.dump({'fetchedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'today': today}, open(os.path.join(out, 'fetched.json'), 'w'))


def health_club(page):
    for block in re.findall(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', page, re.S):
        try:
            data = json.loads(block)
        except ValueError:
            continue
        for item in data if isinstance(data, list) else data.get('@graph', [data]):
            if isinstance(item, dict) and item.get('@type') == 'HealthClub':
                return item
    return None


DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']


def minutes(text):
    h, m = text.split(':')
    return int(h) * 60 + int(m)


def hours_of(club):
    """'always' when open round the clock every day, else [day, open, close] windows."""
    windows = []
    for spec in club.get('openingHoursSpecification') or []:
        days = spec.get('dayOfWeek') or []
        days = days if isinstance(days, list) else [days]
        opens, closes = minutes(spec['opens']), minutes(spec['closes'])
        # 23:59 is how a site writes "to midnight".
        if closes == 23 * 60 + 59:
            closes = 24 * 60
        for day in days:
            windows.append([DAYS.index(day.split('/')[-1]), opens, closes])
    if not windows:
        return None
    if len(windows) == 7 and all(w[1] == 0 and w[2] == 24 * 60 for w in windows):
        return 'always'
    return sorted(windows)


STATE_WORDS = {'WESTERN AUSTRALIA': 'WA', 'SOUTH AUSTRALIA': 'SA', 'VICTORIA': 'VIC', 'NEW SOUTH WALES': 'NSW', 'QUEENSLAND': 'QLD', 'TASMANIA': 'TAS'}


def state_of_postcode(postcode):
    """An Australian postcode's state (the ACT's are inside NSW's range)."""
    if not re.fullmatch(r'\d{4}', postcode or ''):
        return ''
    n = int(postcode)
    if 2600 <= n <= 2618 or 2900 <= n <= 2920:
        return 'ACT'
    return {'0': 'NT', '2': 'NSW', '3': 'VIC', '4': 'QLD', '5': 'SA', '6': 'WA', '7': 'TAS'}.get(postcode[0], '')


def split_address(text, title):
    """'39 Borrack Square, Altona North VIC 3025' -> street, suburb, state, postcode."""
    text = re.sub(r'\s+', ' ', text).strip().rstrip(',')
    for words, code in STATE_WORDS.items():
        text = re.sub(words, code, text, flags=re.I)
    postcode = ''
    found = re.search(r'(\d{4})\s*(?:VIC|NSW|WA|SA|QLD|TAS|ACT|NT)?\s*$', text)
    if found:
        postcode = found.group(1)
        text = text[: found.start()].strip().rstrip(',').strip()
    state = ''
    found = re.search(r'[ ,](VIC|NSW|WA|SA|QLD|TAS|ACT|NT)\s*$', text)
    if found:
        state = found.group(1)
        text = text[: found.start()].strip().rstrip(',').strip()
    # The suburb: after the last comma, else the branch's own name when the text ends with it.
    if ',' in text:
        street, suburb = text.rsplit(',', 1)
        street, suburb = street.strip(), suburb.strip()
        # 'Unit 5, 450 Princes Highway, Noble Park' has the suburb last; '3 Davies Road Claremont' may not.
    elif text.lower().endswith(title.lower()):
        street, suburb = text[: -len(title)].strip(), title
    else:
        street, suburb = text, title
    if suburb and suburb.lower().startswith(title.lower()) is False and not re.search(r'[A-Za-z]', suburb):
        street, suburb = text, title
    return {'line1': street, 'suburb': suburb, 'state': state, 'postcode': postcode}


def slug(text):
    return re.sub(r'[^a-z0-9]+', '-', text.lower().replace('’', '').replace("'", '')).strip('-')


def build(src):
    meta = json.load(open(os.path.join(src, 'fetched.json')))
    gyms = revo_list(open(os.path.join(src, 'revo-index.html'), encoding='utf-8').read())
    rows, skipped, fallback = [], [], []
    for gym in gyms:
        if not is_open(gym, meta['today']):
            skipped.append(f"{gym['post_title']} (opens {field(gym, 'gym_open_date') or 'soon'})")
            continue
        page = open(os.path.join(src, f"revo-{gym['post_name']}.html"), encoding='utf-8').read()
        club = health_club(page)
        if club:
            address = club['address']
            where = {
                'line1': html.unescape(address.get('streetAddress') or '').strip(),
                'suburb': html.unescape(address.get('addressLocality') or '').strip(),
                'state': (address.get('addressRegion') or '').strip().upper(),
                'postcode': (address.get('postalCode') or '').strip(),
            }
            lat, lng = float(club['geo']['latitude']), float(club['geo']['longitude'])
            hours = hours_of(club)
        else:
            # Some branch pages carry no HealthClub: the gyms page's own address
            # and position instead, and no hours (they aren't published there).
            fallback.append(gym['post_title'])
            where = split_address(html.unescape(field(gym, 'custom_address') or field(gym, 'address')), gym['post_title'])
            lat, lng = float(field(gym, 'latitude')), float(field(gym, 'longitude'))
            hours = None
        state = where['state'] if where['state'] in STATES else state_of_postcode(where['postcode'])
        # Some pages write the number after the street ("Marion Rd 838"): put it first, as addresses go.
        flipped = re.fullmatch(r'([A-Za-z][A-Za-z .\'’-]*?) (\d+[A-Za-z]?)', where['line1'])
        if flipped:
            where['line1'] = f'{flipped.group(2)} {flipped.group(1)}'
        row = {
            'id': slug(f"revo-fitness-{gym['post_name']}"),
            'name': 'Revo Fitness',
            'brand': 'Revo Fitness',
            'branch': html.unescape(gym['post_title']),
            'line1': where['line1'],
            'suburb': where['suburb'],
            'state': state,
            'postcode': where['postcode'] if re.fullmatch(r'\d{4}', where['postcode']) else '',
            'lat': round(lat, 6),
            'lng': round(lng, 6),
            'phone': field(gym, 'phone').replace(' ', '') or None,
            'email': field(gym, 'email').lower() or None,
            'website': (club or {}).get('url') or f"{REVO}{gym['post_name']}/",
            'hours': hours,
        }
        rows.append({key: value for key, value in row.items() if value not in (None, '')})
    rows.sort(key=lambda row: row['id'])
    lines = [
        '// Generated by scripts/operators.py from operators\' own websites. Do not edit by hand.',
        '',
        "import type { OperatorRow } from './operators';",
        '',
        '/** When the operators\' pages were read. */',
        f"export const OPERATORS_FETCHED = '{meta['fetchedAt']}';",
        '',
        '/** Revo Fitness: its gyms page and each branch\'s own page (schema.org HealthClub). */',
        '// prettier-ignore',
        'export const REVO_ROWS: OperatorRow[] = [',
        *[f'  {json.dumps(row, ensure_ascii=False)},' for row in rows],
        '];',
        '',
    ]
    open(OUT, 'w', encoding='utf-8').write('\n'.join(lines))
    print(len(rows), 'Revo gyms written;', len(skipped), 'not open yet:', ', '.join(skipped))
    print(len(fallback), 'from the gyms page alone (no HealthClub on their page):', ', '.join(fallback))


if __name__ == '__main__':
    if len(sys.argv) != 3 or sys.argv[1] not in ('fetch', 'build'):
        raise SystemExit('Usage: operators.py fetch|build <dir>')
    (fetch if sys.argv[1] == 'fetch' else build)(sys.argv[2])
