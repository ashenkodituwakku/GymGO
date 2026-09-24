"""
What counts as a gym on OpenStreetMap, shared by GymGO's map-only city data
(packages/usa-data and packages/au-data).

It keeps places you can walk into and train on a gym floor, or take a class
at a fitness studio. It drops what the map says is private, gyms inside
hotels, apartment blocks, offices and campuses, generic "Fitness Center"
rooms, and yoga, pilates, barre, cycling, dance, climbing and kids' studios,
which aren't what GymGO is for.

Nothing is added that the map doesn't say. Opening hours are parsed only when
they're in the simple "Mo-Fr 06:00-22:00; Sa 08:00-20:00" form; anything else
is left out rather than guessed.
"""

import json, math, re

NOT_A_GYM = re.compile(
    r'yoga|pilates|barre|bar method|soulcycle|cyclebar|cycle house|flywheel|b/spoke|spin|ride\b|'
    r'solidcore|dance|ballet|climb|boulder|gymnastic|little gym|my gym|stretch|trapeze|fenc|'
    r'hotworx|jiu|karate|taekwondo|martial|kung fu|judo|aikido|physical therapy|physiotherap|'
    r'chiropract|massage|spa\b|kids|pole\b|aerial|bodyrok|lagree|megaformer|reformer|swim school|'
    r'zumba|piyo|down dog|physique 57|revolution studio|cycle|handle bar|rock gym|exhale|krav|kms\b|'
    r'combat|mma\b|ismma|grinning yogi|float|cryo|squash|syretch|platesculpt|boys and girls|define body|'
    r'futsal|parkour park|my first gym|muay thai',
    re.I,
)
NOT_PUBLIC = re.compile(
    r'hotel|marriott|hilton|hyatt|westin|sheraton|ritz|four seasons|kimpton|residence|residents|'
    r'apartment|apts\b|condo|lofts?\b|tower|plaza|suites|\binn\b|university|college|campus|school|'
    r'academy|student|employee|staff|corporate|police|fire dep|firehouse|army|navy|marine|air force|'
    r'veterans|\bva\b|hospital|medical|clinic|rehab|senior|physical education|recreation center for|'
    r'club house|clubhouse|amenity|defence|raaf\b|barracks|'
    # Named one by one after reading the list: campus, employer, apartment and
    # navy gyms that the patterns above don't catch.
    r'jerabeck|plofker|cac express|wang fitness|amli\b|pottruck|vadm|eisminger|fink family|'
    r'hutchinson gym|drexel|ringe|city of atlanta wellness|top of the one|industrious|malkin|'
    # The same for the Australian cities: staff, campus and community-health gyms.
    r'social club|uni fitness|unigym|community care',
    re.I,
)
GENERIC = re.compile(r'^(the )?(fitness|gym|exercise|weight|workout|wellness)( ?(center|centre|room|studio|area|facility))?s?$', re.I)
NOT_A_GYM_SPORTS = {'yoga', 'pilates', 'barre', 'cycling', 'spin', 'dance', 'climbing', 'gymnastics', 'trapeze',
                    'fencing', 'martial_arts', 'jiu-jitsu', 'karate', 'taekwondo', 'judo'}
STUDIOS = re.compile(r'orange ?theory|f45|barry|basecamp|madabolic|row house|title boxing|rumble|9round|'
                     r'30 minute hit|burn boot|shred415|\[solidcore\]|fhitting|tone house|boxing|hiit|bootcamp|boot camp|'
                     # Australian studio chains.
                     r'\bbft\b|body fit training|12 ?rnd|trib3|stepz|kx\b|sweat ?hq|studio 12', re.I)


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
                             r'ufc gym|blink|sports club|ymca|eōs|eos fitness|chuze|retro fitness|city fitness|fitness sf|'
                             # Australian chains.
                             r'jetts|plus fitness|goodlife|fitness first|world gym|genesis|snap fitness|revo fitness|club lime|'
                             r'zap fitness|fit n fast|fit n\' fast|healthworks|elite fitness', re.I)


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
