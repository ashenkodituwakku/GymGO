/**
 * GymGO's website, for now (EXPO_PUBLIC_LIMITED=on in scripts/pages-build.sh): the
 * limited version. It runs with no GymGO server behind it, on the gyms built
 * into the app: real gyms in major cities around the world, from
 * OpenStreetMap. So no accounts, reviews, members' reports or Pro (they need
 * the server), and every built-in city is open, since Pro can't be bought
 * here. A banner says so on every screen, and Profile says what the full
 * version adds. The phone app and GymGO on your computer are unaffected.
 */
export const LIMITED = process.env.EXPO_PUBLIC_LIMITED === 'on';
