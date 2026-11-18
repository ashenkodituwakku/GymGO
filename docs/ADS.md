# Advertising in GymGO

How GymGO shows ads, what has to happen before real ones, and what is
already in place. Nothing here has been switched on or paid for by Claude:
those steps are the owner's. Since 18 November 2026 the code is built and
shows Google's **test ads** in development builds (Update 190); since
Update 191 they're **native advanced ads** set in GymGO's own card, and the
owner's AdMob iPhone app and its ad unit are in the code, ready, with real
ads switched off until the legal pages change.

## Where things stand

- **The ad space exists.** `apps/mobile/src/components/AdSlot.tsx` marks two
  places: on Home under the gyms near you, and under Explore's list (after
  the last gym, never between two). Pro members never see it.
- **In a phone development build it shows Google AdMob test ads**
  (`AdCard.native.tsx`): a native advanced ad, its headline, words, icon,
  picture or video and button set in a card of GymGO's, marked "Ad", with
  Google's AdChoices mark in its top corner. Non-personalised, rated Teen
  at most, after Google's consent message (UMP) where the law needs one.
  Google's test ad units only, so nothing real is ever requested or paid;
  the iPhone build carries GymGO's own AdMob app ID, which is how Google
  says to test.
- **Everywhere else it's GymGO's own card for Pro** ("Train anywhere with
  Pro", "Gyms in every country"): the website, Expo Go (which can't hold
  Google's library), a release build until real ads are switched on
  (`ADS_LIVE` in `lib/ads.ts`), and whenever no ad comes back or consent is
  refused. Only where Pro can be
  bought; elsewhere the space is empty. It has a "Not now" that hides it for
  two weeks on that device. The Pro card loads and tracks nothing.
- **The legal pages promise no ads.** `packages/domain/src/legal.ts` says
  "GymGO has no ads, no analytics and no session recording" and "uses no
  cookies for tracking and no analytics, advertising or tracking code". Those
  sentences must change, with a new legal version (so everyone is asked to
  agree again), **before** any ad partner's code ships. Since Update 190
  Google's library is in every iPhone and Android build (even one that shows
  no ads), so this must be done before any build goes to the App Store or
  Google Play. The website and Expo Go don't contain it.

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
   and tax details. *Done for the iPhone app (18 November); the payments
   profile and tax details aren't known here.*
2. **Add the two apps** (iOS and Android) in AdMob. Each gets an **app ID**
   (`ca-app-pub-…~…`). Create **ad units**, native advanced. *iPhone: done,
   app ID `ca-app-pub-7227955677859980~8061198006`, one native advanced
   unit `ca-app-pub-7227955677859980/5564520466`, used for both places
   (a second unit, so Home and Explore are counted apart, is optional).
   Android: not yet; when it's made, send its app ID and unit and they go
   in `app.config.js` and `OWNER_AD_UNITS`.*
3. **Set up Privacy & messaging** in AdMob: the European regulations (GDPR)
   message for the EEA, the UK and Switzerland, and the US state regulations
   message. Even non-personalised ads need consent in Europe; without it
   AdMob shows only "limited ads".
4. **Publish `app-ads.txt`** at the root of the website the stores list for
   GymGO (gymgo.site/app-ads.txt), with the line AdMob gives you (Apps →
   View all apps → app-ads.txt). For this account it should read
   `google.com, pub-7227955677859980, DIRECT, f08c47fec0942fa0`; use
   AdMob's own line if it differs. Claude can add the file to the website
   once you say so; it only matters once the app is in a store with
   gymgo.site as its website.
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

## What's built (18 November 2026, Updates 190 and 191)

All of the list below is in, with test ads. What's left is yours: the
Android app in AdMob, Privacy & messaging, `app-ads.txt`, the store
paperwork and the legal wording. Then real ads are one change: `ADS_LIVE`
to `true` in `apps/mobile/src/lib/ads.ts`, with "No ads" added to Pro's
benefits the same day. Until then a release build shows no ads at all.

**Development builds only ever ask for Google's test units**, whatever
`ADS_LIVE` says. That's on purpose: seeing and tapping your own real ads
while building is what AdMob calls invalid traffic, and it's the most common
way new AdMob accounts get limited or closed. To see a real ad, use a
release build on a phone that isn't yours to build with, or add your phone
as a test device in AdMob.

The IDs are in the code (`app.config.js` for the app IDs, `OWNER_AD_UNITS`
in `lib/ads.ts` for the units): they aren't secrets, since every copy of the
app carries them. `GYMGO_ADMOB_IOS_APP_ID` / `GYMGO_ADMOB_ANDROID_APP_ID`
and `EXPO_PUBLIC_ADMOB_IOS_HOME`, `_IOS_RESULTS`, `_ANDROID_HOME`,
`_ANDROID_RESULTS` replace them if they're ever needed elsewhere.

It hasn't run on a phone yet: try it with `gymgo --xcode` on the Mac (the
Xcode project is remade by itself when the app's packages change), on the
Simulator or your iPhone. Expect a card on Home, under the gyms near you,
with Google's test ad in it: "Ad" beside the advertiser, a headline,
a picture, and a button. Google's test ads say they're test ads.

What was planned, and is now built (the version is 17.4.0, which supports
React Native 0.88):

- `react-native-google-mobile-ads` 17.4.0 installed (no `expo-dev-client`:
  the Xcode route already runs a development build from the bundler).
- `apps/mobile/app.config.js`: the library's plugin with GymGO's iPhone
  app ID and, for Android, Google's sample app ID until there's an Android
  app in AdMob. (Once the library is in a build, its app ID is required: an
  iPhone or Android build without one stops at launch.)
- Ad units: Google's native test units in every development build; the
  owner's (`OWNER_AD_UNITS`) in a release build once `ADS_LIVE` is on;
  otherwise none.
- `AdSlot` asks for a non-personalised **native advanced** ad
  (`NativeAd.createForAdRequest`, a wide picture, AdChoices top right,
  videos muted), draws it as one of GymGO's cards (`AdCard.native.tsx`:
  the "Ad" badge, advertiser, headline, words, Google's media view, and the
  button, each registered with Google so taps count), lets it go when the
  card leaves, and falls back to the Pro card when none comes back. Nothing
  takes the space until an ad has come. Expo Go and the website keep the
  Pro card (the library is only loaded where it exists).
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
