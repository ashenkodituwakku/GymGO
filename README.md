# GymGO

**Find a gym that fits your workout, budget and visit time.**

## Start GymGO

GymGO is an app for iPhone, Android and your PC's browser. One command
starts it on your computer. It opens in your browser, and you can open it on
your phone with **Expo Go**, a free app. It also starts a small server
on your computer that keeps accounts, saved gyms and reviews in a database
file. Everything is free: no Mac, no Xcode, no sign-ups, no API keys. If you
do have a Mac, you can also [run it from Xcode](#on-a-mac-in-xcode-simulator-or-your-iphone)
on the iPhone Simulator or your own iPhone.

### On Windows

Open **PowerShell** (Start menu → type *PowerShell*). Then:

**1. Install Node.js and Git** (skip if you have them; GymGO needs Node 22.13 or newer):

```powershell
winget install OpenJS.NodeJS.LTS Git.Git
```

Close PowerShell and open a new window.

**2. Allow scripts to run** (once per computer; type `Y` if asked):

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

**3. Download GymGO:**

```powershell
git clone -b claude/friendly-johnson-9rzxrj https://github.com/ashenkodituwakku/GymGO.git "$HOME\GymGO"
```

**4. Start it:**

```powershell
& "$HOME\GymGO\scripts\gymgo.ps1"
```

The first start takes a minute or two. Then:

- **On your PC:** the app opens in your browser at **http://localhost:8081**.
  If it doesn't, open that address yourself.
- **On your phone:** install **Expo Go** from the App Store or Google Play,
  and join the same Wi-Fi as your PC. Then scan the QR code in PowerShell:
  on an **iPhone** with the **Camera** app, on **Android** from inside
  **Expo Go**.

If Windows asks whether Node.js may use the network, choose **Allow**.
Without that, your phone can't reach your PC.

Press **Ctrl+C** in PowerShell to stop everything.

**Phone won't connect?** Stop with **Ctrl+C** and run:

```powershell
& "$HOME\GymGO\scripts\gymgo.ps1" -Tunnel
```

This works even when the phone is on a different network, but it's slower.
In this mode the phone shows the gyms from the app's built-in copy. Signing
in and reviews on the phone need the same Wi-Fi as the PC.

**Try GymGO Pro without paying.** The launcher makes a ready-made Pro
account on your computer. In the app, open Profile → Sign in, and use:

| | |
|---|---|
| Email | `dev@gymgo.test` |
| Password | `GymGO-dev-pro-2026` |

It's for trying Pro (every country, unlimited saved gyms, comparing four,
the workout library) on this computer only. Nobody paid for its Pro, so the
server makes it only when told to (`GYMGO_DEV_PRO=on`, which the launcher
sets) and refuses even then on a server with a public address
(`GYMGO_PUBLIC_URL`) or live Stripe keys. Start with `gymgo -NoDevAccount`
to leave it out.

**Optional: start it from anywhere by typing `gymgo`.** Run this once, then open
a new PowerShell window:

```powershell
if (!(Test-Path $PROFILE)) { New-Item -ItemType File -Path $PROFILE -Force | Out-Null }
Add-Content $PROFILE "`nfunction gymgo { & `"$HOME\GymGO\scripts\gymgo.ps1`" @args }"
```

After that you can run:

- `gymgo` to start everything;
- `gymgo -Update` to get the latest version first;
- `gymgo -Tunnel` when the phone isn't on the same Wi-Fi;
- `gymgo -NoBrowser` to start without opening a browser window;
- `gymgo -NoDevAccount` to start without the ready-made Pro account.

### On a Mac or Linux

In Terminal, one line, whether or not you've downloaded GymGO before:

```bash
curl -fsSL https://raw.githubusercontent.com/ashenkodituwakku/GymGO/claude/friendly-johnson-9rzxrj/scripts/gymgo-mac.sh | bash
```

It downloads GymGO into `~/GymGO` (or brings an existing copy up to date,
whatever state it's in), installs what's missing, and starts the server and
the app, like the Windows launcher. Add `-s -- --tunnel` after `bash` if the
phone can't connect. (On Linux, `npx pnpm@10 install` then `npx pnpm@10 app`
in `~/GymGO` does the same.)

### On a Mac, in Xcode (Simulator or your iPhone)

This builds GymGO as a real iPhone app: Apple Maps, SF Symbols, Liquid
Glass and haptics, which Expo Go and the browser only approximate. It needs
no paid Apple developer account: a free Apple ID is enough to run it on
your own iPhone.

**1. Install the tools** (once; all free):

- **Xcode**, from the Mac App Store. Open it once to finish installing, and
  if it asks, add the iOS platform (Xcode → Settings → Components).
- **Homebrew** from [brew.sh](https://brew.sh), then in Terminal:

```bash
brew install node cocoapods
```

**2. Get GymGO and open it in Xcode** (one line; the same line updates it later):

```bash
curl -fsSL https://raw.githubusercontent.com/ashenkodituwakku/GymGO/claude/friendly-johnson-9rzxrj/scripts/gymgo-mac.sh | bash -s -- --xcode
```

This works from any starting point: no copy yet, an old copy, a copy on the
wrong branch, or one with your own edits (those are set aside with `git
stash`, not lost; `git -C ~/GymGO stash pop` brings them back). It then runs
the newest version of itself, installs what's needed, makes the Xcode project
from the app's settings (`expo prebuild`, into `apps/mobile/ios`, which isn't
kept in git), fetches its native parts with CocoaPods, and opens it in Xcode.
It also starts the GymGO server and the bundler the app loads its code from,
so leave Terminal open. The first time takes a few minutes.

**It keeps itself up to date while it runs.** Every three minutes it checks
GitHub for a newer GymGO and moves to it (only when you haven't edited
anything). New app code reloads in the running app by itself; new server
code restarts the server; new dependencies are installed; and if the app's
native parts changed, it remakes the Xcode project and says so in Terminal:
then press Run (⌘R) in Xcode again. `--no-auto-update` turns this off.

Once you have it, `bash ~/GymGO/scripts/gymgo-mac.sh --xcode` does the same.

**Optional: start it by typing `gymgo`.** Run this once, then open a new
Terminal window:

```bash
echo 'alias gymgo="bash ~/GymGO/scripts/gymgo-mac.sh"' >> ~/.zshrc
```

After that, `gymgo` starts everything, and `gymgo --xcode`, `gymgo --tunnel`
and `gymgo --doctor` work as above.

**3. In Xcode:**

1. At the top, next to **GymGO**, pick where to run it: an **iPhone
   Simulator**, or **your iPhone**. Plug the iPhone in with a cable the first
   time and tap **Trust**. It then shows in **Window → Devices and
   Simulators**, where you can also turn on connecting over Wi-Fi.
2. Click the **GymGO** project on the left → **Signing & Capabilities** →
   **Team**: pick your Apple ID (**Personal Team**). If it isn't listed, add
   it in **Xcode → Settings → Accounts**.
3. Press **Run** (⌘R).

On your iPhone, the first time: turn on **Settings → Privacy & Security →
Developer Mode** (the phone restarts), and if it says "Untrusted Developer",
go to **Settings → General → VPN & Device Management** → your Apple ID →
**Trust**. When GymGO asks to find devices on your local network, allow it:
that's how it reaches the server on your Mac. The iPhone needs the same
Wi-Fi as the Mac.

Good to know:

- With a free Apple ID, Apple lets an app you build run for **7 days**; after
  that, press Run in Xcode again. A paid developer account ($99 a year) lifts
  that, but isn't needed.
- The app id is made from your Mac user name (`com.yourname.gymgo`), because
  Apple wants it to be yours. Set `GYMGO_IOS_BUNDLE_ID` to choose another.
- Pass your team to skip step 2 each time the project is remade:
  `bash ~/GymGO/scripts/gymgo-mac.sh --xcode --team ABCDE12345` (your team
  id is under Xcode → Settings → Accounts, or in the project's Build Settings
  → Development Team once you've picked it).
- The project is remade only when the app's settings changed. `--clean`
  remakes it from scratch.
- Something not working? Run `bash ~/GymGO/scripts/gymgo-mac.sh --doctor`: it
  prints your Xcode, CocoaPods, Node and GymGO versions and where things
  stand, to paste into a message. The usual fixes:
  - "Xcode is installed, but the Mac is set to use only its command line
    tools": `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`.
  - A build that stops with "node: command not found": run the launcher
    again; it writes the exact Node into `apps/mobile/ios/.xcode.env.local`.
  - CocoaPods errors: `pod repo update`, then the launcher with `--clean`.
  - "Signing requires a development team": step 2 of "In Xcode" above.
  - "No such module" or odd build errors after an update: Product → Clean
    Build Folder (⇧⌘K) in Xcode, then Run.
  - "Reference to type 'INIntent' broken by a context change" (Expo.swiftmodule):
    your copy predates the fix in `patches/`. Update GymGO with the launcher
    (it reinstalls and remakes the project), then Clean Build Folder and Run.
- In the Simulator, set where "you" are with **Features → Location**.
- A **Release** build (Product → Scheme → Edit Scheme → Run → Build
  Configuration) carries its code inside the app, so it runs without the
  bundler; it still needs the Mac's server for accounts and reviews, at the
  address the launcher wrote into `apps/mobile/ios/.xcode.env.local`.
- Prefer the command line? `cd ~/GymGO/apps/mobile && npx expo run:ios
  --device` builds and installs without opening Xcode.

### What's in the app

Four tabs along the bottom, icons only, the way Instagram does it on iOS 26:
a floating Liquid Glass capsule above the home indicator, the tab you're on
filled in (your initial for Profile once you're signed in), and a glass lens
behind it that springs to the tab you tap. Drag the lens along the bar to
switch tabs; it swells under your finger. It's the same bar everywhere: on
iOS 26 it's made of Apple's own Liquid Glass material, on older iPhones and
Android the closest blur, and in a browser a glass with real refraction in
Chrome and Edge (blur only in Safari and Firefox).

- **Home**: kept short. A greeting, the search, four one-tap picks (Near
  me, Early start, After work, Under $25), **Build a workout**, gyms near
  you, your saved and recently viewed gyms, then neighbourhoods and other
  cities as chips.
- **Explore**: the map with the results sheet, filters, and sorting (best
  match, closest, cheapest, top rated). "Best match" means: gyms that meet
  everything you asked first, then, among the rest, the ones with the fewest
  things you'd need to call about, then the nearest. Move the map anywhere in
  the world and **Search this area** appears: it asks the server,
  which reads OpenStreetMap for the area on screen (through the free Overpass
  API), keeps what the same rules count as a gym, and remembers each area for
  a month so a busy area costs one request, not one per person. Those gyms
  are map-only like the rest: name, address, sometimes hours, "call first",
  each on its own country's clock and in its own units (miles in the US and
  UK). Visit prices (budgets, members' reports) are kept in A$, US$, €, £
  and CHF for now; elsewhere (yen, kronor, rupiah) a price is simply unknown,
  and the app says so.
  Type any town or suburb anywhere ("Bendigo", "Boise", "Kyoto") and
  press Enter: if it isn't one GymGO knows by heart, the server looks it up
  (Photon, a free OpenStreetMap geocoder, asked only on Enter and at most
  once a second, answers kept a month), and the map flies there and
  searches it.
- **Saved**: your saved gyms. Tick two or three to **compare** them side by
  side: answer, price, what members paid (labelled as theirs, never the
  gym's price), guest entry, what to bring, machines, rating and distance.
  The round compare button in a map card's header adds a gym too.
- **Profile**: laid out like Settings. Your account card (tap it for
  **Account**: name, email, password, Apple and Google, your data, sign out,
  delete), Training (Progress, My workouts, Plate calculator), Pro, your
  gyms, Settings (Country, **Appearance**, Haptics, Demo mode), and where
  GymGO's facts come from. Signed out, a card to sign in with Apple, Google
  or email.
- **Appearance**: Automatic (follows your phone), Light or Dark, for
  everyone. With Pro, four more accent colours (Ocean, Grape, Rose,
  Graphite) besides Indigo. Evidence colours (green, orange, grey) never
  change with the accent, so they always mean the same thing. Switching
  fades smoothly and keeps you on the screen you were on; the map, glass
  and the phone's own keyboards and menus follow too.

### Training

Build a workout (Home → **Build a workout**, or from a gym's page), then
tap **Start**. Each exercise shows its sets as rows: type the weight and
reps and tick the set. Last time's numbers are already filled in as a
guide, so on a repeat session it's mostly ticking.

- **Rest timer.** Ticking a set starts the rest the plan calls for (90 s,
  say), in a glass bar at the bottom with −15, +15 and Skip. The phone
  buzzes when it's up.
- **The screen stays on** while a workout is open, so the phone doesn't
  lock between sets.
- **Left open overnight?** If nothing changed for over an hour, the workout
  is logged as ending at your last change, not when you tapped Finish.
- **Last time.** Beside each exercise: what you did the last time you
  logged it ("135 lb × 10, 10, 9").
- **Plates.** On barbell exercises, **Plates** shows what to load on each
  side of the bar for the weight you typed (45, 35, 25, 10, 5 and 2.5 lb
  plates, or 25 down to 1.25 kg), and says if standard plates can't make it
  exactly. Also in Progress → Plate calculator.
- **Records.** Finish, and GymGO tells you which records you broke:
  heaviest weight, strongest set (by estimated one-rep max), or most reps on
  a body-weight exercise. Only against your own earlier sessions: the first
  time you log something is a starting point, not a record.
- **Progress** (Profile → Progress): weeks in a row you've trained,
  workouts this week, your records for every exercise, and every session,
  each of which you can open or delete.
- **Pounds in the US**, kilograms elsewhere; switch before you type the
  first weight. A blank weight is body weight, never zero.

A workout in progress is kept on your device as you go, so closing the app
between sets loses nothing, and Home shows **Back to your workout**. It's
saved to your account when you finish, so logging needs a (free) account.

With **Pro**, each exercise in Progress has a chart of your estimated
one-rep max over time, and while you train each exercise shows **Aim**:
what to lift next, by double progression. Keep the weight until every set
reaches the top of the rep range, then add the smallest jump (5 lb or
2.5 kg) and start again at the bottom. It's worked out from your own last
session, and says why.

Tap any gym to open its own page, with share, compare and save at the top.
It opens with the gym's logo (a chain's free logo, or the icon from the
gym's own website; see below) and its photos. On an iPhone, press and hold a gym card on Home for a preview
and a quick menu.

Buttons and rows use proper symbols rather than emoji: Apple's SF Symbols on
iPhone, Google's Material Symbols on Android and in the browser, and
Phosphor's two-tone icons in the tab bar and section headings. So a phone
button shows a handset, directions an arrow sign, and so on, drawn the way
the rest of the phone draws them.

### Where you are

GymGO opens where you are. The first time, it asks for your location once;
after that it uses it only if you allowed it. It asks for your **precise**
position (full GPS accuracy, not rounded), so distances and the blue "you
are here" dot are right. The position stays on your device, in memory, for
the search: it is never saved, and never sent to the GymGO server or anyone
else. If you've only allowed approximate location (iPhone's "Precise: Off",
or Android's "Approximate"), GymGO says so, because distances will be off.

If you're outside the cities GymGO carries but still in Australia or the
US, it searches the map around you (as "Search this area" does) and opens
"Near you" with what it finds, labelled as map data. To do that without
sending your position, it asks the server for the whole map tiles around
you: a block about 30 km across, exactly the same request for anyone in
the same 11 km tile. Your precise position still never leaves the device;
it's used there to sort by distance. Only outside those two
countries, or if the map servers can't be reached, does it take you to the
nearest city it carries, and say how far away that is.

### Emails, classes and facilities (free)

Some gyms' OpenStreetMap entries also list an email address, sports or
classes (yoga, swimming, boxing…) and facilities (pool, sauna, showers,
step-free entrance). Where they do, the gym's card shows them under
**Facilities & more**, labelled as mapped by volunteers. Anything not listed
is unknown, never a no. So far that's 35 emails, 59 gyms with classes and
31 with facilities, all in the US data.

### Cities

- **Melbourne**: 23 researched gyms, with prices and hours from each gym's
  own website where it publishes them, plus 40 more from OpenStreetMap
  (map-only, like the cities below). The map's copies of the researched 23
  are left out, so none shows twice.
- **7 more Australian cities**: Sydney, Brisbane, Perth, Adelaide, Canberra,
  the Gold Coast and Hobart, with 229 real gyms between them. Like the US
  cities below, these are **map-only**, from OpenStreetMap: no prices, guest
  hours or machine lists yet, so every one says **Call first**. Distances are
  in kilometres and money in A$.
- **40 US cities**, GymGO's main market: New York, Brooklyn, Los Angeles,
  Chicago, Houston, Miami, San Francisco, Oakland, San Jose, Seattle,
  Portland, Boston, Austin, Dallas, San Antonio, Denver, Salt Lake City,
  Phoenix, Las Vegas, Washington DC, Baltimore, Philadelphia, Pittsburgh,
  Atlanta, Charlotte, Raleigh, Nashville, Orlando, Tampa, New Orleans,
  Minneapolis, Detroit, Cleveland, Columbus, Indianapolis, Kansas City,
  St. Louis, Sacramento, San Diego and Honolulu, with 1,055 real gyms between
  them. Search a city, a neighborhood, a state ("Texas", "TX") or a ZIP code
  ("10001"). These are **map-only**: names, addresses, phone numbers, websites and sometimes
  opening hours, from OpenStreetMap. There are no prices, guest hours or
  machine lists yet, so every one says **Call first**. Distances are in
  miles and money in dollars there.
- **15 European cities**: London, Paris, Berlin, Madrid, Barcelona, Rome,
  Milan, Amsterdam, Dublin, Lisbon, Vienna, Munich, Stockholm, Copenhagen and
  Zurich, with 600 real gyms between them (the 40 nearest each centre), and
  the districts the search box knows there, under their local names.
  **Map-only**, like the Australian and US cities: every one says **Call
  first**. Distances are in miles in London and kilometres elsewhere.
  Members can report what a visit cost in €, £ or CHF; in Stockholm and
  Copenhagen (kronor) prices aren't kept yet.
- **Demo mode** (Profile → Preferences, off to start): invented gyms in inner
  Sydney that show every case GymGO handles, from "Good to go" to "Not a
  fit". Turning it on hides every real gym, and turning it off hides every
  invented one, so the two never share a map: the demo gyms sit on the same
  streets as real Sydney ones.

Search a city ("Brisbane", "New York", "NYC", "Philly"), a suburb or
neighborhood ("Fortitude Valley", "SoHo", "Capitol Hill, Seattle"), a
Melbourne suburb or postcode, or a gym by name ("Equinox", "snap fit"):
matching gyms are suggested nearest first, and pressing Enter on a name
opens the closest one. Visit times are
always on the searched city's clock.

### Build a workout

Tap **Build a workout** on Home, or **Build a workout here** on any gym.
Tap the muscles you want to train on the body (front and back; there's also
a plain list), or pick Push, Pull, Legs, Core or Full body. Choose a goal
(strength, muscle, endurance) and a length (4, 6 or 8 exercises), and GymGO
builds a session: compound lifts first, sets × reps, rest, and a tip for
each. **Shuffle** for another version, **Share** to send it.

From a gym's page it uses only the machines that gym publishes or that its
members have reported, and marks each exercise ✓ where the kit is
confirmed. Most gyms haven't published their machines, so for those it
offers a **typical gym** plan instead and marks anything not confirmed with
"?". It never claims a gym has a machine it hasn't been told about.

### Accounts

Tap the person icon next to the search box to create an account. Your saved
gyms then follow you between your PC and your phone, and you can write
reviews. Accounts live only in `apps/server/data/gymgo.db` on your
computer. Passwords are stored hashed, and no emails are sent to you (the
only email GymGO sends is a bug report, to the team; see below).

In Profile you can **change your name** and **change your password** (it
asks for the current one, and signs out any other device signed in as you).
There's no "forgot password" yet, because GymGO sends no email.

**Download my data** in Profile gives you everything GymGO holds about you
as one JSON file: your account, sign-in dates, saved gyms, reviews, photo
records, machine, price and visit reports, workouts, bug reports and
subscription (never your password hash or sign-in tokens). In a browser it downloads; on a phone
it opens the share sheet. **Delete account** removes all of it.

Reviews wait for a moderator before they appear. To make your own account a
moderator, run this in the GymGO folder:

```powershell
npx pnpm@10 --filter @gymgo/server make-moderator you@example.com
```

Then open your account in the app to see the reviews and photos waiting for a
decision.

### Report a bug

**Profile → Report a bug** lets anyone, signed in or not, tell the team what
went wrong. The form lists the app and device details that go with it (the
app's version, the kind of device and browser, screen size, the screen it
came from, the country and appearance settings, and whether you're signed
in), and you can switch them off. It never sends your location, searches or
gyms. Signed in, you can ask for a reply at your account's email; signed out,
you can leave an address. If a screen ever breaks, the crash screen offers
**Try again** and a one-tap report with the error attached.

Every report is kept on the GymGO server first, and moderators can read them
under Profile → Moderation. The server emails each one to
**ashenkodit@gmail.com** and **mahogany.81926@gmail.com**, with the reporter
as the reply-to address, once you give it an email account to send
through. GymGO has no mail service of its own, so it uses one you already
have. With Gmail (free):

1. In your Google Account, turn on 2-Step Verification, then make an **app
   password** (Security → 2-Step Verification → App passwords).
2. Add this line to `apps/server/.env.local`, with your address (its `@`
   written as `%40`) and the app password:

   ```
   GYMGO_SMTP_URL=smtps://you%40gmail.com:your-app-password@smtp.gmail.com:465
   ```

3. Restart GymGO. The server's first lines say `Bug reports: kept here and
   emailed to …`.

Reports sent before email was set up, or while the mail server was down, go
out when it's back (checked every 15 minutes, five tries each, at most 50
emails a day). `GYMGO_BUG_REPORT_TO` sends them elsewhere (comma-separated)
and `GYMGO_MAIL_FROM` changes the sender. A person can send five reports an
hour.

### Gym photos

GymGO only shows gym photos that its own members took and chose to share. It
never copies them from gym websites (they're copyrighted) and never shows a
stand-in picture of some other gym.

The top of a gym's page shows, in this order:

1. **Members' photos**, each with the member's name on it.
2. If there are none, and the owner has set up the optional Google key
   (below), **Google's photos** of the place, each credited to whoever took
   it, with "Google Maps" underneath. They're only ever the exact gym's: a
   Google listing is used only if it's within 150 m and shares a real word
   of the gym's name (not "gym" or "fitness", and not the suburb), or, failing
   that, if Google calls it a gym and it's within 40 m. So the shopping
   centre a gym is in, or the café next door, never lends it their photos;
   a gym with no sure match simply shows no Google photos.
3. Otherwise **Google Street View** outside the gym, labelled as such (it
   may not face the door). This is Google's free public embed.

It always says when no member has shared a photo yet, and an invented demo
gym says **No photo supplied yet**.

To add one, open a gym, tap **+ Add a photo**, and pick a picture you took
there. You're asked to confirm you took it and are happy for it to show with
your name. The server removes the photo's hidden details (including where it
was taken) before saving it, and it stays hidden until a moderator publishes
it. A photo the moderator turns down is deleted. Photos live in `apps/server/data/photos/` on your computer.

### What a visit costs, from members

Most gyms on the map don't publish a casual-visit price. So under a gym's
**Prices**, signed-in members can say what they paid for one visit and
roughly when (today, last week, a few months ago). Everyone then sees
**What members paid**: the typical price (the median, so one odd report
can't move it far), the range, how many members and when the latest paid.
Names are never shown. It's labelled as members' reports, not checked by
GymGO or the gym, and it never counts as the gym's own price or makes a gym
"Good to go". Each member has one report per gym (reporting again replaces
it, and it can be removed), reports over two years old stop counting, and
amounts must be between $1 and $500.

In lists and cards, a gym that publishes no visit price shows members'
typical figure instead of a dash, marked as theirs: **~A$22 · members say**.
A price the gym publishes always wins, even an unclear one.

### How getting in went, from members

Whether a visitor can walk in is the question GymGO exists to answer, and
most gyms don't publish it. Under a gym's **Getting in**, signed-in members
can say what happened when they went as a visitor: **walked in**, **had to
book first** or **turned away**, and roughly when. Everyone sees the counts
from the last year (door rules change), without names, labelled as members'
visits and not the gym's rule. Like every member report, it never makes a
gym "Good to go".

### Has it closed? From members

Map data can be years old, and nobody has checked that every gym is still
trading. Under a gym's **Where this comes from**, members can say **it has
closed** or **it's still open**, and when they saw it. When more members say
closed than open (over the last six months), the gym's card warns at the
top: "Members say this gym has closed", with how many and when, and "check
before you go". It's their word, labelled as theirs.

Price, visit and closed/open reports show straight away. Moderators see the
latest 50 in Profile, with who sent each, and can remove any that are wrong
or abusive.

### GymGO's own logo

The mark is a G made from a weight plate, its crossbar an arrow heading out:
a gym, and going to it. It is one colour, so it also works as the tinted iOS
icon and the Android themed icon. The wordmark sets "GymGO" in Inter
ExtraBold (SIL Open Font Licence) beside it, "GO" in the app's indigo.

`node apps/mobile/scripts/brand-mark.mjs` draws everything from one set of
numbers: the SVG sources in `apps/mobile/assets/brand/` (app icon, mark,
wordmark for light and dark backgrounds), the PNGs `app.json` uses in
`apps/mobile/assets/images/` (iOS light, dark and tinted icons; Android
adaptive, background and monochrome layers; the splash mark for light and
dark; the web favicon), and `src/components/brandPaths.ts`, from which the
app draws the icon on the sign-in screens and the wordmark at the foot of
Profile. Change the numbers in the script and run it again; don't edit the
outputs by hand.

### Gym logos

Eighteen chains have a logo that is free to reuse, found through Wikidata (the
brand's "logo image") and hosted on Wikimedia Commons: 24 Hour Fitness,
ACTIV FITNESS, CrossFit, Curves, Equinox, Fitness First, FitX, Gold's Gym,
GoodLife Fitness, The Gym Group, John Reed Fitness, Kieser, LA Fitness,
Life Time, Nuffield Health, Snap Fitness, SportCity and Virgin Active. Each shows at the top of that chain's gym pages, beside the name on
its card when you tap it on the map, and on its tiles when no member has
shared a photo. Seventeen are public domain as simple text or
shapes; Gold's Gym's is CC BY 4.0, credited to Gold's Gym. Every gym page
with a logo credits it and says GymGO isn't connected to or endorsed by the
brand. A logo is still its owner's trademark: GymGO uses it only to say
which gym this is.

Every other gym with a website gets **the icon from its own website**: the
square picture a phone puts on its home screen, or the logo the site
declares for search engines. It's shown the way a browser or a search engine
shows a site's icon beside its link, credited to the site ("Icon from
dohertysgym.com, the gym's own website"), and never altered. The server
fetches it the first time someone looks, keeps it for a month (a week when
there's none, an hour when the site didn't answer), and shares it between a
chain's branches. A branch the map gives no website borrows its chain's, but
only when two or more branches in that country share the very same site: a
CrossFit affiliate never shows another affiliate's icon. In the bundled
cities that's about 240 of 769 real gyms, on top of the ten chains with
Commons logos. It only accepts real
PNG, JPEG, WebP or GIF images at least 64 pixels square (never a white mark
on a transparent background, which would vanish on the white plate), and it will only
connect to public addresses, because website addresses come from
OpenStreetMap, which anyone can edit. A gym without a website, or whose site
has no usable icon (or refuses automated visitors), shows a plain symbol,
never a made-up logo. To switch website icons off, start the server with
`GYMGO_SITE_ICONS=off`.

The Commons logos are copied into the app (`apps/mobile/assets/logos/`), so the app
never fetches them from Wikimedia. To look for new ones after the gym data
changes, run `node apps/mobile/scripts/brand-logos.mjs`. It keeps only logos
under a licence GymGO can use, and goes slowly because Wikimedia limits busy
networks.

### What machines a gym has

Gyms hardly ever publish their equipment. Their websites say "free weights"
and "cardio", and Google has no equipment list either. So GymGO shows two
things, kept apart:

- **What the gym publishes**, with a link to the page it came from.
- **What members say**: anyone signed in can open a gym's **Equipment**
  section, tap **Trained here? Tick what they have**, and mark each machine
  **Yes** or **No** (thumbs up or down), plus the heaviest dumbbells if they
  know. The card then shows a tally, such as "Squat rack, 3 thumbs up", with
  how many members reported and when. You can change your report any time. Members' reports are labelled
  as theirs and never make a gym "Good to go" on their own.

### Google info (free, nothing to set up)

Each gym has a **See it on Google** button. It opens a full-screen page with
**Google's own map and card for the gym**: its name, address, star rating
and number of reviews, straight from Google. Tap the ↗ on Google's card, or
**Open in Google Maps**, to see every photo and review in Google Maps
itself. Under that is Google's **Street View** nearest the gym, so you can
see the building. Both use Google's public embed, so they're free, with no
key, no account and no limit.

Why not pull Google's photos and reviews into GymGO's own pages? Google's
terms don't allow copying or storing them, and scraping them breaks those
terms. The reviews and photos also belong to the people who posted them.
Showing Google's own embed and linking to Google is the free way to do it
properly.

If GymGO ever becomes a business, Google asks for its official Maps Embed
API instead of the public embed. That's also free and unlimited, but it
needs a Google Cloud account with billing set up.

#### Optional extra: Google's photos, reviews and details on every gym

With your own Google Places API key, each gym's own page gets Google's
photos at the top (when no member has shared one) and a **From Google Maps**
section, and the Google page shows the same under the map:
Google's photos (up to six) with each photographer credited, its rating and
latest reviews, whether it's open now and its opening hours, phone number,
website, Google's one-line description, and what Google knows about
accessibility, parking and payment. It's labelled as Google's, isn't saved,
and never changes GymGO's own answer. Google doesn't hold email addresses,
so there are none from Google. And there's no free way to get this data out
of Google: copying it from Google Maps pages breaks Google's terms, so GymGO
uses Google's own API or its free embed, nothing else. **This part is not free.**
It needs a Google Cloud account with billing turned on. Google gives a free
allowance each month and then charges. At the time of writing that was about
1,000 place lookups and 1,000 photos a month for the kind GymGO uses, so
roughly 250 page opens a month are free (one lookup and up to four photos
each). Check Google's current pricing first, and set a daily limit on the
API in Google Cloud so it can never cost more than you've decided.

Even then, GymGO never saves what Google sends (only Google's ID for each
gym, which Google allows), credits Google and every photo and review author,
and doesn't let Google's hours change its own answers. To switch it on, in
Google Cloud create a project, turn on billing, enable **Places API (New)**,
create an API key restricted to that API, then start GymGO with it:

```powershell
$env:GOOGLE_PLACES_API_KEY = "your-key-here"
gymgo
```

On a Mac or Linux: `GOOGLE_PLACES_API_KEY=your-key-here npx pnpm@10 app`.
The key stays on your computer; the app never sees it.

### Search this area (OpenStreetMap, free, no key)

"Search this area" asks the public Overpass API at `overpass-api.de`. It's
free and needs no account; its operators ask for fewer than 10,000 requests
a day, and GymGO stays far under that: one request at a time, at most 500 a
day, 30 an hour per address, and each tenth-of-a-degree tile (about 11 km)
fetched at most once a month. Public Overpass servers are often slow or
refuse a given network, so GymGO tries the main one, then two public
mirrors (kumi.systems and VK's maps.mail.ru), giving each 30 seconds. To
use your own list instead, set
`GYMGO_OVERPASS_URL=https://…/api/interpreter,https://…/api/interpreter`.
Looking places up by name uses Photon's public server; set
`GYMGO_GEOCODER_URL` to use another Photon server.

### Sign in with Google and Apple

Both are built, and both are **off until you set them up**, because each
needs you to register GymGO with Google or Apple. GymGO checks every
sign-in on the server: the token's signature against Google's or Apple's
published keys, that it was made for your app, that it's in date, and a
one-time code against replay. It never learns a Google or Apple password.
It never quietly joins a Google or Apple sign-in to an existing
email-and-password account with the same address (GymGO doesn't check the
emails people sign up with, so that could be someone else's account); the
account's owner connects Google or Apple from **Account** instead.

**Google** (free):

1. In [Google Cloud Console](https://console.cloud.google.com), make a
   project, then APIs & Services → OAuth consent screen: External, app name
   GymGO, and add yourself as a test user.
2. Credentials → Create credentials → OAuth client ID, once per place you
   run GymGO:
   - **Web application**, for the browser: add `http://localhost:8081` under
     both Authorized JavaScript origins and Authorized redirect URIs.
   - **iOS**, for the Xcode build: the bundle ID is your app id
     (`com.yourname.gymgo`; the Mac launcher prints it).
   - **Android**: package `app.gymgo.local` and your debug key's SHA-1.
3. Put the client ids in `apps/server/.env.local` (make the file):

   ```
   GYMGO_GOOGLE_CLIENT_ID_WEB=1234-abc.apps.googleusercontent.com
   GYMGO_GOOGLE_CLIENT_ID_IOS=1234-def.apps.googleusercontent.com
   ```

   Client ids aren't secrets. Start GymGO again: the server says `Sign in
   with Google: on`, and the Mac launcher remakes the Xcode project so
   Google can hand the sign-in back to the app.

**Apple** needs a paid Apple Developer Program membership ($99 a year): a
free Personal Team can't sign an app that has Sign in with Apple, so it's
off by default and nothing here turns it on for you. With a paid team, add
`GYMGO_APPLE_SIGN_IN=on` to `apps/server/.env.local` and run the Mac
launcher with `--xcode --team YOURTEAMID`: the Xcode project gets the
capability, and the server accepts tokens for your app id. Apple's button
shows on iPhone only (Apple's sign-in on the web and Android needs a
separate Services ID, not set up here).

Until then, email and password work as before, and the buttons simply
don't show.

### GymGO Pro (subscriptions, through Stripe)

GymGO has two plans. When it first opens it asks **which country is
yours**; you can change it in Profile → Country. **Free** is everything that
tells you the truth about a gym in that country: every gym and city, the
answer for your visit and why, the source behind every fact, prices and hours
where published, reviews, photos, members' machine reports and the workout
builder, plus logging your workouts with the rest timer, plate calculator,
your records and your history. A gym's page opened from a link or your
saved list always opens, wherever the gym is.

**Pro** is for going further and keeping more:

| | Free | Pro |
|---|---|---|
| Gyms worldwide | Your country | Every country, wherever you travel |
| Saved gyms | Up to 10 | Unlimited |
| Compare side by side | 2 gyms | 4 gyms |
| Workout library | Build and share | Save workouts to your account, reopen them on any device |
| Progress charts | Your records and history | A chart for every exercise |
| Next-session targets | Last time's numbers | What to lift next, worked out for you |
| Colour themes | Indigo, light or dark | Five accents, light or dark |

One tier, two ways to pay, tax included:

| | Australia | United States |
|---|---|---|
| Monthly | A$3.99 | US$2.99 |
| Yearly | A$29.99 (save 37%) | US$19.99 (save 44%) |

The prices live in `packages/domain/src/plans.ts`; change them there and run the setup below
again. Existing subscribers keep the price they signed up at.

People pay on **Stripe's own checkout page**, so GymGO never sees a card.
They manage or cancel on Stripe's page too (Profile → Manage subscription),
and keep Pro to the end of what they paid for. If Pro ends, nothing they
saved is deleted; they just can't add more than Free allows. Deleting an
account cancels its subscription first.

**Until you connect Stripe, Pro isn't on sale**: the Pro screen shows the
planned prices and says "Not on sale yet". To connect it (test mode, no real
money):

1. Make a free account at stripe.com. Stay in **Test mode**, go to
   Developers → API keys and copy the **Secret key** (it starts `sk_test_`).
2. Copy `apps/server/.env.example` to `apps/server/.env.local` and put the
   key after `STRIPE_SECRET_KEY=`. That file is git-ignored; the key stays on
   your computer and the app never sees it.
3. Create GymGO Pro in your Stripe account (the product, its four prices and
   the manage-subscription page). This charges nobody:

   ```bash
   npx pnpm@10 --filter @gymgo/server stripe:setup
   ```

4. Start GymGO as usual. The server says `GymGO Pro payments (Stripe): on,
   test mode`. Sign in, open Profile → GymGO Pro, pick a plan, and pay with
   Stripe's test card **4242 4242 4242 4242**, any future date, any CVC.

**Webhooks** (recommended): they tell GymGO about renewals, failed payments
and cancellations as they happen. Without them Pro still turns on straight
after checkout, and the app re-checks with Stripe now and then. On your
computer, install the Stripe CLI and run
`stripe listen --forward-to localhost:4000/api/billing/webhook`, then put the
`whsec_…` it prints after `STRIPE_WEBHOOK_SECRET=`.

**Taking real money** needs more than a live key, and none of it is done:

- The server has to be hosted on a public `https://` address, with a webhook
  endpoint added in Stripe for `checkout.session.completed` and
  `customer.subscription.*`. Nothing is deployed.
- Terms of service, a privacy policy and a refund policy, linked from the Pro
  screen and Stripe's settings.
- Tax: in Australia, registering for GST once turnover reaches A$75,000; in
  the US, sales tax on subscriptions varies by state. Stripe Tax can work it
  out. Prices are set tax-inclusive so what's shown is what's paid.
- **App stores.** Apple and Google have their own rules for selling
  subscriptions inside an app, and they differ by country and change often.
  As of writing, Apple requires its own in-app purchase for digital
  subscriptions except where a country's rules allow links to outside
  payment (the US storefront allows it); Google Play has similar rules with
  its own exceptions. Check both stores' current policies before submitting.
  So a store build hides the buy button unless `EXPO_PUBLIC_NATIVE_CHECKOUT=on`
  is set on purpose; in Expo Go and the browser it's always there.

The setup refuses a live key (`sk_live_…`) unless you add `--live`.

### The older website

The first version of GymGO was a Next.js website, and it's still in the
repository. Start it with `gymgo -OldWebsite` (or `pnpm dev`) and open
**http://localhost:3000**. New work goes into the app.

---

A gym discovery and comparison pilot for inner Sydney. It answers three
questions that a map pin and an "open now" badge do not: does this gym have the
equipment I need, what will the visit actually cost, and can a visitor get in at
the hour I want to train?

The organising principle is that **"unknown" is a real answer**. A blank field is
never a no, a missing fee is never A$0, and a fact past its recheck target stops
counting as confirmed. Every result is one of three things, and the difference is
always visible:

| Tier | Meaning |
|---|---|
| **Confirmed match** | Every stated requirement is met by evidence we checked recently. |
| **Needs confirmation** | Could work, but something is unknown, stale or conditional. |
| **Does not match** | A stated requirement is contradicted by what we know. |

## Running it

Requires Node 20.9+ and pnpm. Nothing here needs an API key, a credential, or a
paid service.

```bash
pnpm install

pnpm app          # server + app: opens the browser, QR code for Expo Go
pnpm server       # just the server (http://localhost:4000)
pnpm dev          # website: http://localhost:3000
pnpm build        # website production build
pnpm start        # serve the website production build

pnpm verify       # typecheck + lint + unit tests, every package
pnpm test         # unit tests only
pnpm test:e2e     # website: fresh build + Playwright at 3 viewports
```

Start here: [`/search?q=Surry+Hills&budget=30&date=2026-09-23&time=19:00&eq=squat_rack&eq=cable_station&eq=dumbbells&db=40&r=5`](http://localhost:3000/search?q=Surry+Hills&budget=30&date=2026-09-23&time=19:00&eq=squat_rack&eq=cable_station&eq=dumbbells&db=40&r=5)
— the reference task: a gym near Surry Hills with a squat rack, cable station
and dumbbells to at least 40 kg, admitting a visitor at 7pm for under A$30.

### Signing in

The local development adapter has no passwords: it exists so the permission
rules can be exercised. Go to `/account` and pick an account.

| Account | What it can do |
|---|---|
| Sam (member) | Review, suggest corrections, claim a gym |
| Jo (gym operator) | Starts with nothing; must claim a branch and be approved |
| Ali (moderator) | Decide corrections and reviews. Cannot see ownership evidence |
| Robin (administrator) | Decide ownership claims and see their evidence |

It is refused in a production build unless two separate environment variables
are set deliberately, and when they are, every page carries a warning banner.

### Configuration

Everything is optional; see `apps/web/.env.example`. Without any of it the app
runs with honest "not configured" states rather than fake successes.

| Variable | Effect |
|---|---|
| `GYMGO_DATA_SOURCE` | `demo` (default outside production) or `none` |
| `GYMGO_AUTH_ADAPTER` | `local-dev` or `disabled` (default in production) |
| `NEXT_PUBLIC_MAP_STYLE_URL` | A MapLibre style document; without it the map says so |
| `NEXT_PUBLIC_MAP_TILE_URL` + `NEXT_PUBLIC_MAP_ATTRIBUTION` | A raster basemap. Attribution is required, not optional |
| `NEXT_DIST_DIR` | Build output directory, so a build does not clobber a running dev server |

## Layout

```
packages/domain/     Framework-free rules. No React, no Next, no I/O.
                     The phone and the website run the same search from
                     here, so a pin's colour and a row's verdict can't drift.
packages/melbourne-data/  23 real inner-Melbourne gyms, every fact linked to
                     where it was read (gym websites, OpenStreetMap).
packages/usa-data/   1,055 real gyms in 40 US cities, map-only, from
                     OpenStreetMap. scripts/generate.ts rebuilds it.
packages/au-data/    269 more Australian gyms the same way (Sydney,
                     Brisbane, Perth, Adelaide, Canberra, Gold Coast,
                     Hobart, and Melbourne beyond the researched 23).
packages/eu-data/    600 real gyms in 15 European cities, map-only, the
                     same way (scripts/fetch.py, then scripts/generate.ts).
packages/osm/        What counts as a gym on OpenStreetMap, and how a mapped
                     gym becomes a map-only record: one copy, used by both
                     generators and by the server's "Search this area".
packages/demo-data/  17 fictional Sydney gyms covering the edge cases.
apps/server/         The API: accounts, saved gyms, reviews, moderation, on
                     Node's built-in SQLite. Free, local, no external services.
apps/mobile/         The iOS and Android app (Expo, React Native).
  src/app/           Tabs (Home, Explore, Saved, Profile), gym page,
                     Compare and Workout.
  src/components/    Map, pins, sheets, place card, filters, body picker.
  src/lib/           The app's voice (copy.ts), theme, filter state,
                     cities (places.ts), location, workout generator.
apps/web/            The earlier Next.js website pilot.
  src/app/           Pages and the /api/v1 server API.
  src/server/        Config, persistence, repositories, auth, moderation.
  e2e/               Playwright specs at 390 / 768 / 1440 px.
docs/                Architecture, data model, API, status, launch checklist.
```

## What is and is not done

`docs/STATUS.md` separates *implemented locally*, *tested locally*,
*externally integrated*, *native-tested*, *deployed* and *store-approved*, and
does not collapse them into "production ready". Read it before quoting any of
this as finished.

In short: the app runs on your PC in the browser, with a real local server
and database behind it. Its iOS and Android bundles compile, but it has
**not** been run on a real phone or simulator yet. The Melbourne gyms are
real, with sources; most of their details are unknown because the gyms don't
publish them. The other Australian and the US gyms are real but map-only,
from OpenStreetMap, and nobody has checked that each one is still trading;
members' reports are how their prices and door rules get filled in. Nothing
is deployed, and nothing has been submitted to an app store. No gym has been
contacted, and no customer research has been done — the whole product
thesis is still a hypothesis.

## Real data, and what "unknown" means

The 23 Melbourne gyms are real. Names and map positions come from
OpenStreetMap (© OpenStreetMap contributors, ODbL). Prices, hours and
equipment come only from each gym's own website, read on 23 September 2026,
and every fact in the app links to the page it came from. What a gym doesn't
publish is shown as unknown, not guessed. That is why most of them show
**Call first** 📞: for example, no gym states whether a first-time visitor needs
an induction, so none can honestly be a sure thing yet. Nothing here was
supplied by or agreed with the gyms, and none of them has been contacted.

Prices and hours count as current for 30 days after they were checked. After
that the app flags them as due for a recheck.

The 1,055 US gyms are real places on OpenStreetMap, fetched on 24 and 25
September 2026 (© OpenStreetMap contributors, ODbL). The script keeps gyms and fitness
studios you can walk into and drops what the map marks private, gyms inside
hotels, apartment blocks, offices and campuses, generic "Fitness Center"
rooms, and yoga, pilates, barre, cycling, dance and climbing studios. It then
keeps the 40 nearest each city centre. Everything from the map is labelled
community-reported, not checked. Opening hours are used only when they're
mapped in a simple form, and count as member hours, never guest hours. No
US gym is called open for business on the map's word alone.

## Demo data

The 17 Sydney gyms in `packages/demo-data/` are invented. In the phone app,
turn on **Demo mode** in Profile to see them (the older website shows them
when you search a Sydney suburb such as Surry Hills). None of the names,
addresses, prices, hours, equipment or reviews describe a real business. Every
record is flagged `isDemoData`, the interface says so on every page, and
production ingestion refuses records carrying the flag.
