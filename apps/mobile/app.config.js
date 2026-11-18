/**
 * app.json, plus what an Xcode build needs and differs per person.
 *
 * - GYMGO_IOS_BUNDLE_ID: the app's identifier on your iPhone. Apple wants
 *   it unique to your developer team, so the Mac launcher
 *   (scripts/gymgo-mac.sh) makes one from your Mac user name.
 * - GYMGO_APPLE_TEAM_ID: your team (Xcode → Settings → Accounts), so Xcode
 *   signs without asking. Optional: you can pick the team in Xcode instead.
 *
 * - GYMGO_APPLE_SIGN_IN=on: build with the Sign in with Apple capability.
 *   Off by default, because a free Personal Team can't sign an app that
 *   has it; turn it on with a paid Apple Developer account.
 * - GYMGO_GOOGLE_CLIENT_ID_IOS: the iPhone client id from Google Cloud, so
 *   Google can hand the sign-in back to the app (its reversed form is the
 *   app's URL scheme). The server reads the same setting.
 *
 * - GYMGO_BASE_URL: the path a web export is served under ("/GymGO" on
 *   GitHub Pages without a custom domain; scripts/pages-build.sh sets it).
 *
 * - GYMGO_ADMOB_IOS_APP_ID / GYMGO_ADMOB_ANDROID_APP_ID: AdMob's app IDs
 *   ("ca-app-pub-…~…", docs/ADS.md), to use other ones than these: on
 *   iPhone, GymGO's own (made in AdMob on 18 November 2026); on Android,
 *   Google's sample, which only ever serves test ads, until GymGO has an
 *   Android app in AdMob. A phone build with Google's ad library must have
 *   one, or it stops at launch. Which ad units are asked for, and when real
 *   ones may be, is lib/ads.ts: a development build only ever asks Google's
 *   test units, whichever app ID it carries.
 *
 * None is a secret. See README → "Run it from Xcode" and "Sign in with
 * Google and Apple".
 */
const appleSignIn = (process.env.GYMGO_APPLE_SIGN_IN || '').trim().toLowerCase() === 'on';
const googleIos = (process.env.GYMGO_GOOGLE_CLIENT_ID_IOS || '').trim();
/** "123-abc.apps.googleusercontent.com" → "com.googleusercontent.apps.123-abc". */
const googleScheme = googleIos ? `com.googleusercontent.apps.${googleIos.replace(/\.apps\.googleusercontent\.com$/, '')}` : null;

const baseUrl = (process.env.GYMGO_BASE_URL || '').trim().replace(/\/+$/, '');

/**
 * AdMob's app IDs. iPhone: GymGO's own. Android: Google's sample (test ads
 * only, never paid, never counted against anyone's account), as there's no
 * Android app in AdMob yet. Not secrets: every copy of the app carries them.
 */
const ADMOB_APP_IDS = { ios: 'ca-app-pub-7227955677859980~8061198006', android: 'ca-app-pub-3940256099942544~3347511713' };
const admob = [
  'react-native-google-mobile-ads',
  {
    iosAppId: (process.env.GYMGO_ADMOB_IOS_APP_ID || '').trim() || ADMOB_APP_IDS.ios,
    androidAppId: (process.env.GYMGO_ADMOB_ANDROID_APP_ID || '').trim() || ADMOB_APP_IDS.android,
    // Nothing starts until GymGO asks, after the consent message (AdCard.native.tsx).
    delayAppMeasurementInit: true,
  },
];

module.exports = ({ config }) => ({
  ...config,
  ...(baseUrl ? { experiments: { ...config.experiments, baseUrl } } : {}),
  plugins: [...(config.plugins || []), ...(appleSignIn ? ['expo-apple-authentication'] : []), admob],
  ios: {
    ...config.ios,
    usesAppleSignIn: appleSignIn,
    bundleIdentifier: process.env.GYMGO_IOS_BUNDLE_ID || 'app.gymgo.local',
    ...(process.env.GYMGO_APPLE_TEAM_ID ? { appleTeamId: process.env.GYMGO_APPLE_TEAM_ID } : {}),
    infoPlist: {
      ...config.ios?.infoPlist,
      // The GymGO server runs on your own computer, reached over your Wi-Fi.
      NSLocalNetworkUsageDescription:
        'GymGO talks to the GymGO server on your own computer, over your Wi-Fi, for your account, saved gyms and reviews.',
      NSAppTransportSecurity: { NSAllowsArbitraryLoads: false, NSAllowsLocalNetworking: true },
      ...(googleScheme ? { CFBundleURLTypes: [...(config.ios?.infoPlist?.CFBundleURLTypes || []), { CFBundleURLSchemes: [googleScheme] }] } : {}),
    },
  },
  android: {
    ...config.android,
    package: process.env.GYMGO_ANDROID_PACKAGE || 'app.gymgo.local',
  },
});
