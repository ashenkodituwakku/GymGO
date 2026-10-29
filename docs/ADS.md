# Advertising in GymGO

How GymGO could show ads, what has to happen first, and what is already in
place. Nothing here has been signed up for, switched on or paid for: those
steps are the owner's.

## Where things stand

- **The ad space exists.** `apps/mobile/src/components/AdSlot.tsx` marks two
  places: on Home under the gyms near you, and under Explore's list (after
  the last gym, never between two). Pro members never see it.
- **What fills it today is GymGO's own card for Pro** ("Train anywhere with
  Pro", "Gyms in every country"), only where Pro can be bought; elsewhere
  the space is empty. It has a "Not now" that hides it for two weeks on that
  device. Nothing in it loads or tracks anything.
- **The legal pages promise no ads.** `packages/domain/src/legal.ts` says
  "GymGO has no ads, no analytics and no session recording" and "uses no
  cookies for tracking and no analytics, advertising or tracking code". Those
  sentences must change, with a new legal version (so everyone is asked to
  agree again), **before** any ad partner's code ships.

## The options

| Option | Where | What it takes | Fit |
|---|---|---|---|
| **Google AdMob** | iPhone and Android apps | An AdMob account, the `react-native-google-mobile-ads` library (17.3.0 supports React Native 0.86), a development build (it can't run in Expo Go), a consent message for Europe and the UK, store paperwork | The usual choice for apps; native ads can be styled to match GymGO's cards |
| **Google AdSense** | The website (gymgo.site) | An AdSense account, the site approved by Google, `ads.txt`, Google's consent message for Europe and the UK | Only worth it once the website has real visitors |
| **Local sponsors** | Both | Selling directly to gyms, physios or supplement shops; a small server feature to serve their cards, labelled "Sponsored" | The best fit for a gym finder, but someone has to sell it. A sponsor must never change a gym's ranking, tier, price or any fact |

Whichever you pick, **Pro stays the main source of income**. Ads in an app
this size earn modest amounts, and one of the most useful things they do is
make "no ads" a reason to go Pro.

## Recommendation

1. Start with **AdMob in the phone apps, non-personalised ads only**, in the
   two existing places, as a **native ad** drawn in GymGO's own card style
   (or an inline adaptive banner, the simplest). Non-personalised means no
   cross-app tracking, so no Apple tracking prompt is needed and it stays
   closest to GymGO's privacy promise; it pays less than personalised ads.
2. Keep GymGO's Pro card as what shows whenever no ad comes back, and in
   Expo Go and the website.
3. Add **"No ads"** to Pro's list of benefits the day ads go live, not
   before.
4. Leave the website without ads until it has an audience.

## What only the owner can do (in this order)

1. **Create an AdMob account** at admob.google.com, with a payments profile
   and tax details.
2. **Add the two apps** (iOS and Android) in AdMob. Each gets an **app ID**
   (`ca-app-pub-…~…`). Create **ad units** for each place: "home" and
   "results", native advanced (or banner).
3. **Set up Privacy & messaging** in AdMob: the European regulations (GDPR)
   message for the EEA, the UK and Switzerland, and the US state regulations
   message. Even non-personalised ads need consent in Europe; without it
   AdMob shows only "limited ads".
4. **Publish `app-ads.txt`** at the root of the website the stores list for
   GymGO (gymgo.site/app-ads.txt), with the line AdMob gives you.
5. **Store paperwork.** App Store Connect: the App Privacy answers change
   (data used for third-party advertising). Google Play: tick "Contains ads"
   and update the Data safety form.
6. **Approve the new legal wording** (below) and the new legal version.
7. **Choose how adult the ads may be.** GymGO accepts members from 13, so
   ads should be rated for teens at most (AdMob's "max ad content rating").

## What changes in the legal pages (to draft with you, not before)

- Privacy Policy: that free accounts see ads from Google AdMob in the apps;
  what AdMob receives (the device's advertising identifier is not used for
  tracking when ads are non-personalised, but AdMob still receives the
  device's details and IP address to serve and count ads); the consent
  message in Europe and the UK and how to change your choice later; that Pro
  has no ads.
- The two sentences quoted above, which become untrue.
- Terms: that the free plan is supported by ads.

## What would be built once you say go

All of this is ready to do in a session; none of it is done, because it
changes the native build and needs your AdMob IDs.

- `npx expo install react-native-google-mobile-ads expo-dev-client`.
- `apps/mobile/app.config.js`: the library's plugin with
  `androidAppId` / `iosAppId` read from `GYMGO_ADMOB_ANDROID_APP_ID` and
  `GYMGO_ADMOB_IOS_APP_ID`. Development builds use Google's own sample app
  IDs, so nothing real is ever requested while building. (Once the library
  is in a build, its app ID is required: an iPhone or Android build without
  one stops at launch.)
- Ad unit IDs from `EXPO_PUBLIC_ADMOB_*` settings; Google's test units
  (`TestIds`) in every development build.
- `AdSlot` asks for a non-personalised native ad, shows it in the card's
  shape with an "Ad" label and the advertiser's name, and falls back to the
  Pro card when none comes back. Expo Go and the website keep the Pro card
  (the library is only loaded where it exists).
- Consent at launch with the library's `AdsConsent` (Google's UMP), before
  any ad is asked for, and a **Privacy choices** row in Profile that reopens
  the consent form, which Google requires where the message applies.
- No ads on a gym's page, over the map, between gyms, during a workout, or
  in full screen. One ad space per screen at most.

## Useful links

- The library: [react-native-google-mobile-ads on npm](https://www.npmjs.com/package/react-native-google-mobile-ads)
  and [its documentation](https://docs.page/invertase/react-native-google-mobile-ads)
  (Expo setup, consent, native ads).
- [AdMob](https://admob.google.com) and [AdSense](https://adsense.google.com).
