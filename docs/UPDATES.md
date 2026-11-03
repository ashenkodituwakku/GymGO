# GymGO updates

Every update to GymGO, numbered from the first, newest first. An update is
one piece of work you asked for, shipped together. The commits it covers
are named by their short id, so `git show <id>` finds any of them; the
documentation commits that followed a change count with it.

Updates 1 to 64 were written up on 3 Nov 2026 from the project's history
(557 commits from 22 Sep 2026). From now on, each update adds the
next number here as part of the update itself.

## Update 66 · The Hevy features, polished

*3 Nov 2026 · the commit "The Hevy features, polished"*

- RPE has its own column beside the reps, in a workout and when editing one, instead of a line under every set; it still fits a 320-point phone.
- Edit workout asks "Discard your changes?" before you leave with changes not saved (Cancel, back, a swipe or closing the tab); Save doesn't.
- The monthly report no longer compares with an empty month ("+10,605 kg on Sep"), and says a change in time in hours and minutes.
- Body measurements shows the measures you take, with the rest a tap away; the privacy note is a quiet line.
- Fixed: a set rated and then made a warm-up kept its RPE out of sight and saved it.
- Not yet seen on a phone: the iPhone's own "Discard" alert and its swipe-back being held.

## Update 65 · This update log

*3 Nov 2026 · `9a5a441`*

- Every update numbered from the first, in docs/UPDATES.md; each new one adds an entry here.

## Update 64 · Expo SDK 58

*3 Nov 2026 · `a0b4b00`*

- Expo SDK 58 with React Native 0.88, React 19.3 and expo-router 58, and the code moved to their new rules.
- Expo Go on your phone needs its SDK 58 version, which was not yet confirmed in the stores on 3 November.

## Update 63 · 30 more exercises and five more splits

*3 Nov 2026 · `d938858`*

- 96 exercises, each with its own moving icon.
- Eight templates: Full body 3 days, Body weight anywhere, Upper / lower, Arnold split and Body-part split join the three; a level filter, and supersets labelled.

## Update 62 · Gym details from Apple Maps

*3 Nov 2026 · `188c531`*

- A gym missing a phone, website or hours gets them from its Apple Maps listing through SerpApi, cited with the day; off until you set your own key.

## Update 61 · Sidebar layout

*3 Nov 2026 · `1dbb092`*

- Appearance → Layout: a sidebar, docked on a wide screen and slid in on a phone; the tab bar stays the default.

## Update 60 · Back buttons

*3 Nov 2026 · `20d4260`*

- Monthly report, Body measurements and Edit workout had no back button; fixed.

## Update 59 · Ideas from Hevy 6: body measurements

*3 Nov 2026 · `e084a05`*

- Waist, chest, hips, arms, legs and more, logged over time.

## Update 58 · Ideas from Hevy 5: monthly report

*3 Nov 2026 · `0c7120b`*

- A month of training against the month before.

## Update 57 · Ideas from Hevy 4: exercise notes and rest

*3 Nov 2026 · `de10906`*

- Notes pinned to an exercise, and a rest time for each exercise.

## Update 56 · Ideas from Hevy 3: edit a logged workout

*3 Nov 2026 · `a1e2817`*

- Change a finished workout: name, time, units and every set.

## Update 55 · Ideas from Hevy 2: more records

*3 Nov 2026 · `df474b7`*

- Biggest set, rep records and more chart choices on each exercise.

## Update 54 · Ideas from Hevy 1: kinds of set and RPE

*3 Nov 2026 · `a9b4d89`*

- Mark a set as a warm-up, drop set or to failure, and record how hard it was (RPE).

## Update 53 · Appearance, more of it yours

*2 Nov 2026 · `c322d4f`*

- Text size, bold text, a 12- or 24-hour clock, GymPal's side, corners and your own colour.

## Update 52 · Home-screen widgets (content only)

*2 Nov 2026 · `a8b2fb0`*

- What the widgets would show, worked out and tested; the widget itself needs a paid Apple Developer account.

## Update 51 · Monthly challenges

*2 Nov 2026 · `f90aad6`*

- A challenge each month with friends.

## Update 50 · Access filter and class timetables

*2 Nov 2026 · `c3202ce`*

- An accessibility filter, and class timetables from verified gym owners.

## Update 49 · Recovery map and progress photos

*2 Nov 2026 · `f96dba9`*

- The body shaded by how long since each muscle was trained; private progress photos.

## Update 48 · What you pay, and price changes

*2 Nov 2026 · `31278ed`*

- Cost per visit, and a note when a saved gym's price changes.

## Update 47 · Training programmes

*2 Nov 2026 · `1e3f99c`*

- A goal and days a week, planned over 6 to 12 weeks, with an easier week every fourth.

## Update 46 · Can I do my workout here?, and supersets

*2 Nov 2026 · `b9acb78` to `ef8b938`, 2 commits*

- A gym's page says whether your workout can be done there.
- Supersets and circuits in workouts.

## Update 45 · gymgo.site, full or limited

*1 Nov 2026 · `8a457a4`*

- gymgo.site shows the full GymGO while its server is on, and the limited version while it is off.

## Update 44 · Online from your PC

*1 Nov 2026 · `d41635f`*

- `gymgo -Online` puts GymGO online from your PC through a Cloudflare Tunnel; the ready-made test account is switched off when public.

## Update 43 · GymPal across the app

*29 Oct 2026 · `3e313bb` to `6edca88`, 2 commits*

- GymPal in the app's features, with more of him on Pro.
- Settings can switch Location and GymPal off.

## Update 42 · Verity, then GymPal

*27 Oct 2026 to 28 Oct 2026 · `7acfd89` to `83d76d5`, 4 commits*

- A free AI assistant in the corner of the app and the website, renamed GymPal, with a logo of his own.
- A line in the hosting settings for GymPal's OpenRouter key.

## Update 41 · Noto 3D flags, and a loading bar

*27 Oct 2026 · `d58556b` to `e4d1133`, 2 commits*

- Country flags as Google's Noto 3D pictures, the same on every device (you asked for the flags back, and only them).
- A loading bar when Build my workout is tapped.

## Update 40 · Another session's six changes, undone

*26 Oct 2026 · `129969b` to `43ff6ed`, 7 commits*

- Another session changed emoji, the default appearance, Home's cities, icons, the website's layout and its hosting.
- At your request all six were undone, putting the app back as it was at the end of polish round 9.

## Update 39 · Polish round 9: headings

*26 Oct 2026 · `fc5490c` to `71862c7`, 5 commits*

- Headings a screen reader can move by: one title a page, sections under it.
- Two tests no longer time out on a busy machine.
- This range also holds the first of another session's six changes, undone in Update 40.

## Update 38 · Polish rounds 5 to 8

*25 Oct 2026 · `678ffe6` to `86ae467`, 22 commits*

- Other people get colours of their own; a gym's sections as three grouped cards; Compare in two.
- Website photos must be real photographs, checked for 12 curated gyms from their own pages.
- Search suggestions show each gym's logo; every card takes its look's edge.

## Update 37 · A photo gallery for each gym

*25 Oct 2026 · `fe0e57a` to `939a6ad`, 4 commits*

- Members' photos first, then up to four from the gym's own website, with arrows; Google's photos too.

## Update 36 · Exercise figures redrawn, and a calmer Home

*24 Oct 2026 · `5a0c1f5` to `1b201dd`, 5 commits*

- All the exercise figures redrawn, each moving at its own tempo.
- Home's Up next and templates as one card; tidier gym prices; Pro's comparison in three parts.

## Update 35 · Lifetime picture, Dim, live bests and Arcade sounds

*24 Oct 2026 · `f8fd8a6` to `e458170`, 8 commits*

- Lifetime as a picture to share (Pro).
- Dim: dark in a soft blue-grey, for everyone.
- A set that beats your best turns gold as you tick it; Arcade sounds (Pro).

## Update 34 · Four Pro looks, Pro bonuses and Lifetime

*22 Oct 2026 · `58699f3` to `ddeda0a`, 10 commits*

- Tap a day on the Progress calendar to see what you did.
- Four Pro looks: Soft, Paper, Terminal and Comic.
- Celebrations your way, your lifetime in numbers, and adding an exercise mid-workout.

## Update 33 · The limited website on GitHub Pages

*20 Oct 2026 · `34fa48e` to `ee6593e`, 7 commits*

- The website as the limited version: real built-in cities, no server.
- World cities ready to fetch (packages/world-data); the website published on GitHub Pages.

## Update 32 · Accent cards across Training and Friends

*19 Oct 2026 · `b478d5e` to `7559161`, 25 commits*

- Exercise pages, Friends, the leaderboard, 1-rep max and Collection lead with a card on the accent.
- Do your last workout again in a tap; Progress shows the latest 14 days, then Show older.

## Update 31 · Small fixes across Training

*18 Oct 2026 · `f97e41e` to `c01bf73`, 10 commits*

- A plan only some can buy is not shown as the From price; dates west of UTC are right; reminders fit a 320-point phone.
- An exercise's icon in a workout opens how to do it.

## Update 30 · Exercise library, reminders and body weight

*17 Oct 2026 · `c17e760` to `8e11b1a`, 13 commits*

- The exercise library by name, muscle and the kit you have; when you last trained each muscle.
- Workout notes, training reminders and a body weight log.
- A lighter phone bundle and fewer redraws.

## Update 29 · Android and Expo Go, more reliable

*14 Oct 2026 to 15 Oct 2026 · `c910c2c` to `e8d901e`, 19 commits*

- The Android map returns after Android frees memory; Android's back closes Filters or a gym's card first.
- No push-notification warnings in Expo Go; large text grows controls instead of clipping.
- Bug reports carry the last few errors, cleaned.

## Update 28 · Moving exercise icons, and Settings redone

*13 Oct 2026 · `9d0200f` to `e285dc4`, 20 commits*

- GymGO's own moving exercise icons and a premium plan view.
- Settings with the iPhone's switch everywhere, an account card and a Pro card.
- Explore's races fixed; the tab bar's lens stays on your tab.

## Update 27 · Code-review fixes, and the website at Lighthouse accessibility 100

*13 Oct 2026 · `e45c7e6` to `64638a3`, 8 commits*

- Two rounds of code-review fixes on the polish passes.
- The website split by screen with a readable demo banner, scoring 100 for accessibility.

## Update 26 · Premium passes 4 to 6, and a bug sweep

*12 Oct 2026 · `dc6f62c` to `e707611`, 12 commits*

- Liquid Glass frosts every page's cards; hero marks, a timer ring, a rest ring and a shaded progress chart.
- A bug sweep: templates' next day, Home search, narrow phones and a failed map.

## Update 25 · Gym facts from their own sites, and a premium finish

*11 Oct 2026 · `05b7db1` to `ba4dbe3`, 13 commits*

- Prices, day passes and hours from gyms' own sites in Melbourne, Sydney and Brisbane; franchise prices at every branch.
- A premium finish: soft card lift, an accent glow, sheen on buttons and lit map pins; softer sounds, only for the collection.

## Update 24 · Swaps, a welcome tour and sounds

*8 Oct 2026 · `d586134` to `adb16fd`, 13 commits*

- Swap one exercise in a plan; the nearest gyms to collect next; your week as a picture to share.
- A welcome tour after making an account.
- GymGO's own sound effects, with a Sounds switch.

## Update 23 · GymGO 1.0

*6 Oct 2026 · `6a01041` to `b421c7f`, 14 commits*

- GymGO needs a (free) account and opens on sign-in without one.
- Screens glide in; search suggests as you type.
- GymGO 1.0, and the website as a demo on Netlify.

## Update 22 · Local search, Stripe checkout and a free trial

*6 Oct 2026 · `af4af4c` to `20424d5`, 8 commits*

- Search in your country's language, its places first.
- Stripe checkout working on new accounts and in GymGO's look; a 3-day free trial of monthly Pro.
- On the web, a back capsule naming the page behind.

## Update 21 · Polish: Saved, Compare, trips and forms

*5 Oct 2026 to 6 Oct 2026 · `30952d6` to `24214e7`, 12 commits*

- Distances in your units, clearer empty screens, and gyms that are gone can be removed from Saved and Compare.
- Text boxes scroll clear of the iPhone keyboard; forms clear their errors as you fix them and Enter saves.

## Update 20 · Polish, and the Liquid Glass slider

*2 Oct 2026 to 3 Oct 2026 · `d7656db` to `1b82221`, 8 commits*

- Fixes for narrow phones, Collection, machine search, trips and sign-in notes.
- A Liquid Glass percentage in Appearance, set with a glass-lens slider; sleeker motion everywhere.

## Update 19 · Filters, Trips, friends and Pro gifts

*1 Oct 2026 · `5d0af80` to `3be8791`, 8 commits*

- Open-late and 24-hour filters, Find a machine, and Trips.
- Collection sets for a suburb or city; friends, invites to train, leaderboards and share cards as pictures.
- Workout templates, a record celebration and a rest alert when the phone is locked.
- Is it busy?, verified gym owners and a Moderation screen; Gift Pro, Pro Duo and partner day passes (Stripe test mode).

## Update 18 · Ready for a public server

*1 Oct 2026 · `d9c2c8f` to `a553b5c`, 11 commits*

- Terms of Service, Privacy Policy, refunds and community rules.
- Security hardening, forgot password, and Docker with Caddy, HTTPS and backups, with a free-hosting guide.
- Skeleton loaders instead of spinners; a ripple scan when checking in; `gymgo -update` sets local edits aside.

## Update 17 · Pro looks and accents, a new logo and profile pictures

*30 Sep 2026 · `4156e3a` to `4448426`, 10 commits*

- Five more Pro accents and Pro looks that redraw the app, with Rainbow and Camo.
- The new GymGO logo everywhere, and profile pictures.
- A free taste of Pro extras: timer, 1-rep max, streak freeze and ring.

## Update 16 · Membership prices, and joining a gym

*30 Sep 2026 · `e619d0d` to `54450fd`, 19 commits*

- Membership prices from gyms' own sites, every tier chains publish for all their clubs, and Join this gym with what signing up costs.
- A marked space for ads; map sheets that scroll to their last gym; faster searches.
- The launcher starts clean after new packages, with `-Repair`.

## Update 15 · Your country on the device, and map fixes

*29 Sep 2026 · `7c45144` to `33b7896`, 37 commits*

- Your country's gyms kept on the device, so searching an area is instant; gyms load only when Search this area is tapped.
- Each gym shows once (copies, twins a few doors apart and Windsor across the river from Detroit taken out); gyms say their own suburb.
- Collection and check-ins on your account; location found indoors; no red balloon pins on iPhone.

## Update 14 · Legal basics, collection cards and many more gyms

*28 Sep 2026 · `3fb7ed4` to `1fbf193`, 11 commits*

- An age check, Google content on request, renewal terms by the button and copyright notices.
- Collection cards with random rarity, gems and foil.
- Whole Australian cities from the map, logos and photos from gyms' own websites, and websites for 86 more US gyms and 30 chains.

## Update 13 · Goals, sharing and collecting gyms

*27 Sep 2026 · `29fc9ee` to `f7c58d1`, 16 commits*

- Weekly goal, calendar and milestones; muscle balance and warm-ups with Pro; your week on Home.
- Share a finished workout, export your log as a spreadsheet, keep your own notes on a gym and use the plates your gym really has (Pro).
- Collect the gyms you go to, and share your collection.

## Update 12 · Honest when the server is away

*27 Sep 2026 · `f27ca6a` to `d2d86b6`, 14 commits*

- Signed in with the server out of reach, GymGO no longer asks you to sign in, keeps your workouts, and shows dashes, not zeros.
- Layout checked at iPhone sizes: gym names and distances fit, header buttons stay on screen.

## Update 11 · Workout and accessibility polish

*26 Sep 2026 · `f7eaeb7` to `0bb46c5`, 15 commits*

- Plates drawn side-on as a loaded bar; Progress grouped by day; a set's weight carried on to the next; the rest countdown starts full.
- Clear keyboard focus in the browser, Escape closes sheets, and each set's controls name their exercise.

## Update 10 · Bug reports, Xcode 27 and the whole world

*26 Sep 2026 · `12d091e` to `087d6bf`, 9 commits*

- Report a bug from the app.
- Xcode fixes: the "reference to type 'INIntent'" build error, and the UIKit scene life cycle so the app launches on iOS 27.
- Anywhere in the world opens on real gyms; every country's biggest cities; prices and budgets in each country's money.

## Update 9 · Overnight and offline fixes, and the GymGO logo

*26 Sep 2026 · `763d0b1` to `005b56b`, 17 commits*

- A workout or search left open overnight moves on to today; the app reconnects when the server comes back; the screen stays on during a workout.
- The GymGO logo on app icons, splash and favicon.
- "No photo supplied" instead of a stand-in picture.

## Update 8 · Smoother, and easier to use with a keyboard or screen reader

*25 Sep 2026 · `72c02d0` to `5cd97fc`, 24 commits*

- No per-second redraws, motion that respects Reduce Motion, and fixes from a sweep in both modes.
- Keyboard: one stop per muscle, visible focus, Escape closes Filters and a gym's card; screen readers hear selected states.
- Only the permissions GymGO uses on iPhone and Android; browser tabs name the page.

## Update 7 · Xcode, a training log, dark mode and sign-in

*25 Sep 2026 · `d3e1ca9` to `c35badc`, 11 commits*

- Run GymGO from Xcode on a Mac, in the Simulator or on your own iPhone.
- A training log on your account: rest timer, plates, records and progress, with charts and targets on Pro.
- Dark mode for everyone and accent themes with Pro.
- Sign in with Apple or Google, a new sign-in screen, Account and Profile.

## Update 6 · Search anywhere in the world

*25 Sep 2026 · `0645102` to `fa1b6a3`, 41 commits*

- Search this area: gyms from OpenStreetMap wherever the map is, and any town by name.
- Gyms anywhere in the world, each in its own country's clock, units and money; Europe built in, your own country free and the rest of the world with Pro.
- A US focus: ZIP codes and states in search, and 40 US cities with 1,055 real gyms.
- Every gym with a website shows its own icon, with logos for chains; SF Pro set to Apple's text styles; springier motion.

## Update 5 · More cities, and members' reports

*24 Sep 2026 · `cef2d5c` to `14f9095`, 21 commits*

- Six more Australian cities, real Sydney gyms (the invented demo moved behind a Demo mode switch) and the rest of Melbourne's mapped gyms.
- Members say what a casual visit cost, how getting in went as a visitor, and whether a gym has closed; moderators can review and remove reports.
- Search by name, Download my data, and changing your name and password.

## Update 4 · Google's details, tabs, Home and GymGO Pro

*24 Sep 2026 · `0370982` to `74941ab`, 9 commits*

- Google's information through its own free map embed, members' equipment reports and free Street View.
- Tabs, a Home page, gym pages and Compare; precise location, 15 US cities and a workout builder.
- GymGO Pro: monthly and yearly subscriptions through Stripe.
- The tab bar rebuilt as one Liquid Glass capsule on every platform; icons throughout.

## Update 3 · The phone app

*23 Sep 2026 · `59dd2da` to `e7c580f`, 6 commits*

- The iPhone and Android app, map first like Apple Maps, in Helvetica, with Liquid Glass as iOS 26 uses it.
- Accounts, a free local server and database, real Melbourne gyms and a layout for a PC.
- Gym photos, a live Google page and a simpler card; the blank map on Android fixed.

## Update 2 · Apple-style design and a Windows launcher

*23 Sep 2026 · `3889e9f` to `7d0f001`, 2 commits*

- The interface redrawn in Apple's visual language.
- A launcher for Windows (`gymgo`), working on Windows PowerShell 5.1 too.

## Update 1 · The GymGO pilot

*22 Sep 2026 · `0280e84` to `f09395c`, 3 commits*

- Truthful gym discovery on the web: what is known about a gym, where it came from, and what is not known.
- End-to-end tests and the first documentation, with two fixes they found.
