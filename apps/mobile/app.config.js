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
 * None is a secret. See README → "Run it from Xcode" and "Sign in with
 * Google and Apple".
 */
const appleSignIn = (process.env.GYMGO_APPLE_SIGN_IN || '').trim().toLowerCase() === 'on';
const googleIos = (process.env.GYMGO_GOOGLE_CLIENT_ID_IOS || '').trim();
/** "123-abc.apps.googleusercontent.com" → "com.googleusercontent.apps.123-abc". */
const googleScheme = googleIos ? `com.googleusercontent.apps.${googleIos.replace(/\.apps\.googleusercontent\.com$/, '')}` : null;

module.exports = ({ config }) => ({
  ...config,
  plugins: [...(config.plugins || []), ...(appleSignIn ? ['expo-apple-authentication'] : [])],
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
