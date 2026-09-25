/**
 * app.json, plus what an Xcode build needs and differs per person.
 *
 * - GYMGO_IOS_BUNDLE_ID: the app's identifier on your iPhone. Apple wants
 *   it unique to your developer team, so the Mac launcher
 *   (scripts/gymgo-mac.sh) makes one from your Mac user name.
 * - GYMGO_APPLE_TEAM_ID: your team (Xcode → Settings → Accounts), so Xcode
 *   signs without asking. Optional: you can pick the team in Xcode instead.
 *
 * Neither is a secret. See README → "Run it from Xcode".
 */
module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    bundleIdentifier: process.env.GYMGO_IOS_BUNDLE_ID || 'app.gymgo.local',
    ...(process.env.GYMGO_APPLE_TEAM_ID ? { appleTeamId: process.env.GYMGO_APPLE_TEAM_ID } : {}),
    infoPlist: {
      ...config.ios?.infoPlist,
      // The GymGO server runs on your own computer, reached over your Wi-Fi.
      NSLocalNetworkUsageDescription:
        'GymGO talks to the GymGO server on your own computer, over your Wi-Fi, for your account, saved gyms and reviews.',
      NSAppTransportSecurity: { NSAllowsArbitraryLoads: false, NSAllowsLocalNetworking: true },
    },
  },
  android: {
    ...config.android,
    package: process.env.GYMGO_ANDROID_PACKAGE || 'app.gymgo.local',
  },
});
