# Credits

GymGO's phone app is built from openly licensed components. Nothing here was
copied from a proprietary app; the Apple Maps resemblance comes from following
the same platform conventions (a map with sheets over it, a place card with
one row of actions), not from borrowing its assets.

## Interface components (phone app)

| Component | What it does here | Licence |
|---|---|---|
| [@gorhom/bottom-sheet](https://github.com/gorhom/react-native-bottom-sheet) | The results sheet, place card and filters: the draggable Maps-style sheets | MIT |
| [react-native-maps](https://github.com/react-native-maps/react-native-maps) | The map on iPhone (Apple MapKit) | MIT |
| [react-native-webview](https://github.com/react-native-webview/react-native-webview) | Hosts the Android map (MapLibre + OpenFreeMap) | MIT |
| [expo-glass-effect](https://docs.expo.dev/versions/latest/sdk/glass-effect/) | Liquid Glass on iOS 26 for the floating controls | MIT |
| [expo-blur](https://docs.expo.dev/versions/latest/sdk/blur-view/) | System blur materials where Liquid Glass isn't available | MIT |
| [expo-symbols](https://docs.expo.dev/versions/latest/sdk/symbols/) | Icons: SF Symbols on iPhone, Material Symbols elsewhere | MIT |
| [Material Symbols](https://fonts.google.com/icons) via @expo-google-fonts/material-symbols | Icon font on Android and the web preview | Apache-2.0 (font), MIT (package) |
| [react-native-reanimated](https://github.com/software-mansion/react-native-reanimated) | Sheet springs and the list's glide animations | MIT |
| [react-native-gesture-handler](https://github.com/software-mansion/react-native-gesture-handler) | Sheet dragging | MIT |
| [expo-image-picker](https://docs.expo.dev/versions/latest/sdk/imagepicker/) | Choosing a photo to share of a gym | MIT |
| [react-native-body-highlighter](https://github.com/HichamELBSI/react-native-body-highlighter) (© ELABBASSI Hicham) | The front and back body drawings in the workout builder. GymGO uses its muscle shapes and outlines (`apps/mobile/src/components/body/`) and draws them itself | MIT |
| [stripe-node](https://github.com/stripe/stripe-node) (server only) | Talks to Stripe for GymGO Pro: checkout, the customer portal, webhook signatures | MIT |
| [Phosphor Icons](https://phosphoricons.com) (© Phosphor Icons) | The tab bar's icons and the two-tone icons around the app. The icons used are copied as path data into `apps/mobile/src/components/phosphor.ts` by `scripts/phosphor-icons.mjs` | MIT |
| [react-native-svg](https://github.com/software-mansion/react-native-svg) | Draws the body on iPhone and Android | MIT |
| [sharp](https://sharp.pixelplumbing.com) (development only) | Trims and shrinks the brand logos when `scripts/brand-logos.mjs` fetches them. Not in the app | Apache-2.0 |
| [expo-haptics](https://docs.expo.dev/versions/latest/sdk/haptics/), [expo-location](https://docs.expo.dev/versions/latest/sdk/location/), [AsyncStorage](https://github.com/react-native-async-storage/async-storage) | Taps you can feel, "near me", saved gyms | MIT |

SF Symbols are drawn by iOS itself and are used under Apple's terms, which
allow them in apps running on Apple platforms. They are not copied into this
repository.

## Typeface

The app is set in **SF Pro**, Apple's system typeface, following Apple's
iOS text styles.

- **iPhone:** SF Pro is the system font, so nothing is bundled.
- **The browser on a Mac or iPhone:** SF Pro, through the system font. A
  PC with SF Pro installed also gets it, by name.
- **Android, and browsers without SF Pro:** Apple's licence for SF Pro
  covers only Apple's own platforms, so it can't be shipped inside the app
  for anything else. They use [Inter](https://rsms.me/inter/) by Rasmus
  Andersson, the closest free match, under the SIL Open Font License 1.1,
  from the [@expo-google-fonts/inter](https://github.com/expo/google-fonts)
  package (MIT). Only the Regular, Medium, SemiBold and Bold cuts are
  bundled, and not in the iPhone app.

## Gym data

The real Melbourne gyms' names and positions come from
[OpenStreetMap](https://www.openstreetmap.org/copyright), © OpenStreetMap
contributors, under the Open Database Licence. The app shows that credit on
every real listing and at the foot of the results. Prices, hours and
equipment were read from each gym's own website, and each fact links to its
page.

The 477 gyms in 15 US cities, the 229 in Sydney, Brisbane, Perth,
Adelaide, Canberra, the Gold Coast and Hobart, and 40 more around Melbourne, and the suburbs and neighbourhoods the
search box knows there, also come from OpenStreetMap (© OpenStreetMap
contributors, ODbL), fetched on 24 September 2026 through the Overpass API.
They are derived databases under the ODbL: `packages/osm` (what counts as
a gym) and each package's `scripts/generate.ts` (`packages/usa-data`,
`packages/au-data`) show exactly how they were filtered, and every gym
links back to its map element.

"Search this area" reads the same map live, through the Overpass API, for
wherever the map is showing; those gyms are filtered by the same rules and
carry the same credit and link.

Which country a found gym is in comes from
[country-coder](https://github.com/rapideditor/country-coder) (ISC), the
OpenStreetMap iD editor's offline country borders; its time zone from
tz-lookup.

Towns and suburbs typed into the search box, when GymGO doesn't know them
already, are looked up with [Photon](https://photon.komoot.io) by komoot, a
free geocoder built on OpenStreetMap data (© OpenStreetMap contributors,
ODbL).

## Map tiles (PC and Android)

On the PC and on Android, the map is drawn with
[MapLibre GL JS](https://maplibre.org/) (BSD-3-Clause) and tiles from
[OpenFreeMap](https://openfreemap.org/). The credit shown on the map is a
licence condition and must stay visible:

> OpenFreeMap © OpenMapTiles Data from OpenStreetMap

OpenStreetMap data is © OpenStreetMap contributors, available under the
[Open Database Licence](https://www.openstreetmap.org/copyright).

On iPhone, the map is Apple's, which shows its own legal notice.

## Gym photos

Every gym photo GymGO stores was taken and shared by a GymGO member, who
agreed to it being shown, and is credited to them by name on the photo. None
is taken from a gym's website or anywhere else. The only other photos in the
app are Google's, shown live and credited as described under Google Maps.

## Gym logos

Brand logos come from [Wikimedia Commons](https://commons.wikimedia.org),
found through each brand's Wikidata "logo image" (P154). GymGO keeps only
files whose Commons page gives a licence it can use, copies them into
`apps/mobile/assets/logos/` (trimmed and shrunk), and credits each on the
gym's page with a link to its Commons page.

| Brand | File on Commons | Licence |
|---|---|---|
| 24 Hour Fitness | [24_Hour_Fitness_logo.svg](https://commons.wikimedia.org/wiki/File:24_Hour_Fitness_logo.svg) | Public domain (logo) |
| CrossFit | [Logo_CrossFit.svg](https://commons.wikimedia.org/wiki/File:Logo_CrossFit.svg) | Public domain (text logo) |
| Curves | [Curves_fitness_logo.svg](https://commons.wikimedia.org/wiki/File:Curves_fitness_logo.svg) | Public domain (text logo) |
| Equinox | [Equinox_Fitness_logo.png](https://commons.wikimedia.org/wiki/File:Equinox_Fitness_logo.png) | Public domain (logo) |
| Fitness First | [Fitness_First_Logo.svg](https://commons.wikimedia.org/wiki/File:Fitness_First_Logo.svg) | Public domain (text logo) |
| Gold's Gym | [Gold's_Gym_Weight_Plate_Logo_Primary_150x150.png](https://commons.wikimedia.org/wiki/File:Gold's_Gym_Weight_Plate_Logo_Primary_150x150.png) | CC BY 4.0, © Gold's Gym |
| Kieser | [Kieser_Logo_2025.svg](https://commons.wikimedia.org/wiki/File:Kieser_Logo_2025.svg) | Public domain (text logo) |
| LA Fitness | [LA_Fitness_logo.svg](https://commons.wikimedia.org/wiki/File:LA_Fitness_logo.svg) | Public domain (text logo) |
| Life Time | [Life_Time_Fitness_logo.svg](https://commons.wikimedia.org/wiki/File:Life_Time_Fitness_logo.svg) | Public domain (text logo) |
| Snap Fitness | [Snap_Fitness_logo.svg](https://commons.wikimedia.org/wiki/File:Snap_Fitness_logo.svg) | Public domain (text logo) |

A free copyright licence doesn't cancel a trademark. These logos belong to
their brands. GymGO shows each only on that brand's own gyms, to say which
gym it is, and says on the page that GymGO isn't connected to or endorsed by
the brand.

### Icons from gyms' own websites

For gyms without a Commons logo, GymGO shows the icon the gym's own website
publishes (its home-screen icon or declared logo), fetched by the GymGO
server when first needed and kept for a month. It is not copied into this
repository. Each is the gym's own mark, shown beside its name the way a
browser shows a site's icon, credited on the gym's page to the website it
came from, with the same "not connected or endorsed" line.

## Google Maps

Each gym's **See it on Google** page shows Google's own embedded map and
place card, loaded from Google and carrying Google's own credits and terms.
With the owner's own key, the page can also list Google's photos and reviews,
and a gym's own page shows Google's photos at the top when no member has
shared one. Without a key, the top of that page shows Google's free Street
View embed instead, labelled as Google's.
Those are credited "Google Maps", and every photo and review names its author
with a link, as Google requires. All of it belongs to Google and its
contributors. GymGO shows it live and does not store it.

## Demo data

Every gym, price, review and timetable in `packages/demo-data` is invented for
testing. None of it describes a real business.
