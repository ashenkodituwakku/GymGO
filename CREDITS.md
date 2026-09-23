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
| [expo-haptics](https://docs.expo.dev/versions/latest/sdk/haptics/), [expo-location](https://docs.expo.dev/versions/latest/sdk/location/), [AsyncStorage](https://github.com/react-native-async-storage/async-storage) | Taps you can feel, "near me", saved gyms | MIT |

SF Symbols are drawn by iOS itself and are used under Apple's terms, which
allow them in apps running on Apple platforms. They are not copied into this
repository.

## Typeface

The app is set in **Helvetica**.

- **iPhone:** Helvetica Neue, which ships with iOS. Nothing is bundled.
- **Android and the web preview:** Helvetica isn't installed there, and
  bundling it needs a paid licence. They use
  [TeX Gyre Heros](https://www.gust.org.pl/projects/e-foundry/tex-gyre/heros),
  a free Helvetica clone by the GUST e-foundry, distributed under the GUST Font
  License (LaTeX Project Public License 1.3c). The unmodified font files and
  the licence are in `apps/mobile/assets/fonts/`.

## Gym data

The real Melbourne gyms' names and positions come from
[OpenStreetMap](https://www.openstreetmap.org/copyright), © OpenStreetMap
contributors, under the Open Database Licence. The app shows that credit on
every real listing and at the foot of the results. Prices, hours and
equipment were read from each gym's own website, and each fact links to its
page.

## Map tiles (PC and Android)

On the PC and on Android, the map is drawn with
[MapLibre GL JS](https://maplibre.org/) (BSD-3-Clause) and tiles from
[OpenFreeMap](https://openfreemap.org/). The credit shown on the map is a
licence condition and must stay visible:

> OpenFreeMap © OpenMapTiles Data from OpenStreetMap

OpenStreetMap data is © OpenStreetMap contributors, available under the
[Open Database Licence](https://www.openstreetmap.org/copyright).

On a phone, the map is Apple's or Google's, and each shows its own legal
notice.

## Demo data

Every gym, price, review and timetable in `packages/demo-data` is invented for
testing. None of it describes a real business.
