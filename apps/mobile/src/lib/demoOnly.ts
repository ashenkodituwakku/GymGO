/**
 * GymGO's website, for now (EXPO_PUBLIC_DEMO_ONLY=on in netlify.toml): only
 * the demo, with its invented gyms, and a note that the full version is
 * coming soon. Demo mode is on and can't be turned off; the app and GymGO on
 * your computer are unaffected.
 */
export const DEMO_ONLY = process.env.EXPO_PUBLIC_DEMO_ONLY === 'on';
