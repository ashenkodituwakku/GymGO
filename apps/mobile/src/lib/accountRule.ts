/**
 * Whether GymGO can be used without an account. The app, and GymGO run on a
 * computer, need one. GymGO's website can be opened as a guest
 * (EXPO_PUBLIC_ACCOUNT=optional, set in netlify.toml): there, an account is
 * only for what the server keeps (saved gyms on every device, reviews, Pro).
 */
export const ACCOUNT_OPTIONAL = process.env.EXPO_PUBLIC_ACCOUNT === 'optional';
