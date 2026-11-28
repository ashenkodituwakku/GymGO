/**
 * Whether GymGO can be used without an account. The app, and GymGO run on a
 * computer, need one. GymGO's website can be opened as a guest
 * (EXPO_PUBLIC_ACCOUNT=optional, set in netlify.toml and pages-build.sh):
 * there, an account is only for what the server keeps (saved gyms on every
 * device, reviews, Pro).
 *
 * The limited version always is: it has no server to sign in to, so a
 * limited build that left the setting out would otherwise open on a sign-in
 * form that can't work.
 */
import { LIMITED } from './limited';

export const ACCOUNT_OPTIONAL = process.env.EXPO_PUBLIC_ACCOUNT === 'optional' || LIMITED;
