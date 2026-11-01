/**
 * The limited version: GymGO with no GymGO server behind it, on the gyms
 * built into the app (real gyms in major cities around the world, from
 * OpenStreetMap). So no accounts, reviews, members' reports or Pro (they need
 * the server), and every built-in city is open, since Pro can't be bought
 * here. A banner says so on every screen, and Profile says what the full
 * version adds. The phone app and GymGO on your computer are unaffected.
 *
 *  - EXPO_PUBLIC_LIMITED=on: always (the website on Netlify, netlify.toml).
 *  - EXPO_PUBLIC_LIMITED=auto: whenever its server didn't answer as the page
 *    opened (gymgo.site, scripts/pages-build.sh; lib/website.ts asks).
 *
 * Read once, as the app loads: it doesn't change while a page is open.
 */
import { WEBSITE_AUTO, serverAnswered } from './website';

export const LIMITED = process.env.EXPO_PUBLIC_LIMITED === 'on' || (WEBSITE_AUTO && !serverAnswered());
