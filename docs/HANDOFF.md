# Handoff

How to carry GymGO on in a new Claude Code session (another account, or
after usage runs out). Kept up to date at every pushed step.

## The prompt

Paste this into a new Claude Code session that can reach
`ashenkodituwakku/GymGO`:

> You're continuing work on GymGO, a truthful gym finder (Expo app + Node
> server) in the GitHub repo `ashenkodituwakku/GymGO`. Check out the branch
> `claude/friendly-johnson-9rzxrj` and read `docs/HANDOFF.md` first, then
> `README.md`, `docs/STATUS.md` and `SECURITY.md`. Follow the working rules
> in the handoff exactly, and carry on from its "Next up" list. Push every
> finished, tested step to `claude/friendly-johnson-9rzxrj`. Don't open a
> pull request unless I ask.

If the new session is told to develop on a different branch, it should
still merge into and push `claude/friendly-johnson-9rzxrj`, because that's
the branch the owner's launcher pulls.

## Working rules

- **Branches.** `claude/friendly-johnson-9rzxrj` is what the owner's
  launcher (`gymgo -update`) pulls. Other sessions may push to it too:
  always `git fetch`, then **merge** (never rebase or force-push), and
  check `git merge-base --is-ancestor origin/claude/friendly-johnson-9rzxrj
  HEAD` before pushing.
- **Commits.** Small, verified steps with clear messages that say what
  changed and how it was checked. No AI model names in commits or code. No
  pull requests unless the owner asks.
- **Truth first** (the product's rule). Unknown isn't no; a missing fee
  isn't $0. Every fact about a gym carries its source and date. Never invent
  prices, reviews, busyness, partnerships or photos for real gyms. A missing
  image says "No photo supplied".
- **Owner's go-ahead needed.** Spending money, deploying publicly,
  contacting gyms, publishing, store submissions or live payments. Never
  read or expose API keys or credentials unless asked.
- **Check before saying done.** Run the tests and typecheck (see below),
  look at the change in the browser with Playwright, and update
  `docs/STATUS.md` honestly: say what was seen, and what wasn't (nothing
  has run on a real iPhone from the sandbox). Report failures as failures.
- **Number every update** (the owner asked, 3 Nov). Each piece of work
  the owner asks for adds the next "Update N" at the top of
  `docs/UPDATES.md` in the same push: a title, the date and its commits,
  and a few plain lines on what changed (and anything not yet seen working).
- **The Windows launcher** `scripts/gymgo.ps1` must stay ASCII-only
  (`apps/web/src/launcher.test.ts` checks it).
- **Speak plainly to the owner.** They test on a Windows PC (browser, with
  Windows "Animation effects" off, so Reduce Motion is on) and an iPhone on
  iOS 18 in Expo Go.

## The code

pnpm monorepo, Node 22+. `pnpm install`, then per package:
`npx tsc --noEmit -p .` and `npx vitest run`. At last count: server 292,
mobile 550, domain 191 and web 39 tests, all passing.

- `apps/mobile`: the app (Expo SDK 58, React Native 0.88, expo-router,
  Reanimated 4). Screens in `src/app`, shared pieces in `src/components`,
  logic in `src/lib`.
  - `src/lib/api.ts` is the server client. In development the app reaches
    the server through the bundler at `/_gymgo`; `metro.config.js`
    forwards it to port 4000 (`src/lib/serverAddress.ts`).
  - `src/components/Glass.tsx`: every glass surface, the same opacity on
    every device.
  - `src/components/Skeleton.tsx`: skeleton loaders.
  - `src/components/GymScan.tsx`: the check-in scan.
  - `src/components/LegalText.tsx` and `src/app/legal/[doc].tsx`: the legal
    documents.
  - `src/lib/theme.ts`: palettes, accents and Pro "looks". Wrap styles in
    `themed(() => StyleSheet.create(...))` and never keep a colour in a
    module constant.
- `apps/server`: Node with `node:sqlite` and raw http routes in
  `src/app.ts`. `src/auth.ts` (scrypt, hashed tokens, reset links, rate
  limits), `src/billing.ts` (Stripe, test mode until keys are set),
  `src/legalPages.ts` (the public `/terms` pages and friends), `src/backup.ts`,
  `src/devAccount.ts` (the local Pro test account `dev@gymgo.test` /
  `GymGO-dev-pro-2026`, never on a hosted server).
- `packages/domain`: pure rules shared by the app and server (search,
  access, money, plans, collection). `legal.ts` holds the terms, privacy,
  refund and community texts.
- `deploy/`: Docker plus Caddy hosting (README → "Put GymGO online").
  Not deployed anywhere yet.
- `apps/web`: the older Next.js site; leave it alone unless asked.
- Advertising: `docs/ADS.md` (what adding ads takes; nothing signed up for).
- Logo: `apps/mobile/assets/brand/gymgo-logo.webp`, made into every icon
  by `apps/mobile/scripts/brand-mark.mjs`.

## Running it in the sandbox

- **Server:**
  `cd apps/server && GYMGO_DEV_PRO=on nohup node --no-warnings=ExperimentalWarning --import tsx src/main.ts &`
- **App:** `cd apps/mobile && CI=1 npx expo start --web --port 8081 --clear`.
  Metro has no file watcher here, so restart it with `--clear` after
  editing.
- **Process checks:** `pgrep -f "src/main.ts"` matches its own shell, so
  check with `curl localhost:4000/api/health` instead. Never
  `pkill -f <word>` with a word that's in your own command.
- **Browser checks:** Playwright Chromium is at `/opt/pw-browsers/chromium`.
  Map tiles (tiles.openfreemap.org) are blocked by the sandbox proxy, so
  the map draws blank; markers and the UI still work.
- **Docker:** start `dockerd &`, and pass `/root/.ccr/ca-bundle.crt` as the
  `extra_ca` build secret.

## Done recently (newest first)

- **The new cards everywhere** (5 Nov). components/CardShapeIcon.tsx
  (a rarity's `cardPath` in its metal, any height, its own gradient id)
  replaces the gem dot on a gym page's CollectCard line and the filter's
  swatch; Home's CollectionStrip tile shows the rarest card's icon and
  rarity (medal metal is still the best tier); CardReveal's glow and
  heading use `CARD_FRAMES[rarity].metal`.
- **Collection cards: shapes and the gym's own colour** (4 Nov).
  lib/cardShape.ts has the silhouettes: `CARD_FRAMES` (frame width,
  corners round/cut/scoop, side notches, Legendary's crest, the metal,
  glow), `cardPath(rarity, w, h, inset, x, y)` (the face is the same path
  inset by the frame, corners parallel) and `cardPadding`. GemCard measures
  itself (onLayout) and draws `CardFrame` behind its content in an SVG
  `GLOW_ROOM` bigger (the glow is the outline stroked wide and faint, so it
  follows the shape); the picture is in a rounded box, with the Shine,
  Foil and Sparkles inside it. Colour: packages/domain cardColour.ts
  (`logoColour(pixels, channels)` picks the busiest vivid hue, null for
  mono logos; `cardPalette(hex)` gives light/base/deep).
  `scripts/brand-colours.mts` (tsx) writes lib/brandColours.ts from
  assets/logos; the server's `GET /api/gyms/:id/icon-colour` reads the
  stored website icon with sharp (`iconColour`, cached in memory by source
  and size; public, like /icon). BrandLogo's `useBrandColour(location)`:
  bundled colour, else the server's, else null (the gem's colours).
  Collection's `RarityFilter` (radio pills with a `ShapeSwatch` and
  counts); card/[id]'s `CardFacts`. Small cards drop the rarity pips so
  "LEGENDARY" fits at 320 pt.
- **Customise Home, smoothed** (4 Nov). components/HomeEditor.tsx was
  rewritten: each widget is three layers (making room: a CSS transition
  from React state `held`/`hover`; following the finger: a shared value;
  the jiggle: a CSS animation), `dropped` glides it with `withTiming`
  before `commit` keeps the order, and `drag.released` stops the frame
  callback once let go. More widgets is the tray under the list (`spare`,
  `onAdd` at the end); `EditBar` floats above the tab bar (TabScreen's
  `bottomExtra`; `topExtra` is gone); lib/homeEditing.ts hides GymPal's
  tab while editing; `bare` widgets get a frame and `Clipped` with an SVG
  `Fade`.
- **Customise Home as on an iPhone** (4 Nov). components/HomeEditor.tsx:
  `EditableWidgets` (jiggle, − badge, hold-and-drag through a Gesture
  Handler pan, positions worked out from heights because a browser's
  onLayout doesn't report a move, auto-scroll near the edges through
  ios.tsx's new `useTabScroll`), `EditBar` (+ and Done, in TabScreen's new
  `overlay`, with `topExtra` room), `WidgetGallery` (live previews),
  `EmptyWidget`. Home keeps `editing`, `gallery`, `dragging`;
  `shownWhileEditing` gives empty widgets a stand-in. app/home-edit.tsx is
  gone. Playwright: the jiggle never settles, so click badges with
  `force: true`.
- **Customise Home, 17 widgets, MET Norway's weather symbols** (4 Nov).
  lib/homeWidgets.ts lists every widget (`HOME_WIDGETS`, `DEFAULT_HOME`,
  `cleanHome`, `moveWidget`, `addWidget`, `removeWidget`, `shownWidgets`);
  lib/homeLayout.ts keeps the order on the device (`useHomeWidgets`,
  `homeLayout`); app/(tabs)/index.tsx draws them through `widget(id)` (a
  new widget: add it to the list and a case there); app/home-edit.tsx was
  Customise Home (now Home's own edit mode, above). New widgets in components/HomeWidgets.tsx. Weather
  symbols: assets/weather/svg (MET Norway's, MIT) made into
  assets/weather/icons/*.webp and src/lib/weatherArt.ts by
  `node scripts/weather-icons.mjs`; components/Weather.tsx `WeatherSymbol`,
  `WeatherCompact`, `WeatherHours`, `WeatherBadge` (always shown; lib/weather.ts
  says why when there's no forecast).
- **Weather on Home and the map** (4 Nov). MET Norway's Locationforecast
  2.0, free for any use with credit. Rules in
  packages/domain/src/weather.ts (`fromMetForecast`, `weatherKind`,
  `weatherWords`, `tempLabel`, `tempUnitFor`, `weatherPoint`, `hoursFrom`);
  server apps/server/src/weather.ts (`WeatherService`: Expires,
  If-Modified-Since, one request per square, six hours of stale; User-Agent
  from `GYMGO_PUBLIC_URL` and `GYMGO_CONTACT_EMAIL`), GET /api/weather?south=&west=
  (whole tenths only), `GYMGO_WEATHER=off`. App: lib/weather.ts `useWeather`
  (by `tilesAround(filters.centre)`, the gym lookup's block: never send a
  position), components/Weather.tsx (`WeatherCard` on Home, `WeatherBadge`
  under the map's buttons), weather icons in components/Icon.tsx. The
  Privacy Policy names MET Norway: LEGAL_VERSION 2026-11-04.
- **GymPal's new logo and a quieter button** (4 Nov; the owner said
  "GymBud", meaning GymPal: the name stayed). Logo:
  `apps/mobile/assets/gympal/gympal.svg`, groups `body` and `dumbbell`, made
  into `src/lib/gymPalArt.ts` (`GYMPAL_BODY`, `GYMPAL_DUMBBELL`) and the PNG
  by `node scripts/gympal-logo.mjs`; `GymPalMark` (was `GymPalFace`) lifts
  the dumbbell once and on `cheer`. Button: lib/themePrefs.ts
  `gymPalButton` ('tab' default, 'corner', 'hidden') with `gymPalSide`;
  components/GymPal.tsx `EdgeTab`, `Launcher`, `EdgeStrip` (native only)
  and `usePullIn` (RNGH Pan; `dragged` swallows a browser's click after a
  drag); Ctrl+/ / ⌘/ in a window keydown listener. Appearance has the
  choice and says how each opens. Unseen on a phone: the pull and the strip.
- **Polish** (4 Nov; the owner: "Keep polishing the app"). app/train.tsx:
  Finish asks once when sets aren't ticked (`finishAnyway`, reset by any
  new tick; timed items don't count). lib/tapAgain.ts `useTapAgain(ms)` and
  `useTapAgainOn<T>()` hold every "Tap again to…" state and disarm after
  8 s (Delete account 20 s): use them for any new tap-again button, not
  `useState`. Make your own on the No workout page (replaces the page, as
  the builder does); Profile subtitles; the empty Monthly report.
- **Your own workouts, splits and exercises** (3 Nov; the owner: "make sure
  the user can make their own splits and workouts and make custom
  exercises (only for pro users)"). Read as: making and starting a workout
  of your own is free (the builder always was; "Workout library: Build and
  share" free), keeping one is Pro (as before), splits and custom exercises
  are Pro. If the owner meant all of it Pro, gate app/workout-edit.tsx's
  Start. Rules in packages/domain/src/ownTraining.ts (`cleanOwnExercise`,
  `cleanSplit`, `cleanPlanItems`, `cleanReps`, `OWN_LIMITS`); server
  apps/server/src/ownTraining.ts (`own_exercises`, archived not deleted;
  `own_splits`) with routes in app.ts and PATCH /api/workouts/:id. App:
  lib/workout.ts `exerciseById` (GymGO's, then yours: use it, never
  `EXERCISES.find`), `fromOwn`, `setOwnExercises`, `ownExercises`;
  lib/exerciseGlyphs.ts `setGlyphAliases` (drawn as); lib/templates.ts
  `templateOfSplit`, `setOwnTemplates`, `allTemplates`; lib/ownRegistry.ts
  puts them all in place; lib/ownTraining.ts keeps them in step with the
  account (device copy first, `useOwnTrainingSync` in AppProvider,
  `useOwnTraining` to redraw). Screens: components/PlanEditor.tsx (with
  lib/planEdit.ts), app/workout-edit.tsx (lib/planDraft.ts hands it the
  builder's plan), app/split-edit.tsx, app/exercise-edit.tsx; entry points
  on the builder, My workouts, a saved workout, Templates, Exercises, an
  exercise's page and the add-exercise picker. The dev server serves stale
  code after new files: restart Metro with --clear.
- **Hevy features polished** (3 Nov; the owner: "make them better and
  more professional and just reliable and cleaner"). components/SetKinds.tsx
  `RpeHead` and `RpeCell` (the column, `RPE_COLUMN` 32 pt; rows with it use
  `tight` gaps and `narrow` fields), used by app/train.tsx and
  app/session-edit.tsx; both `setKind`s drop a warm-up's RPE, as do
  `draftToLogged` and `checkEdits`. session-edit.tsx keeps the draft it
  started from and holds leaving with `usePreventRemove` while they differ,
  asking through lib/askToDiscard.ts; Save calls the hook's
  `disablePrevention` first. lib/monthReport.ts `timeChangeWord`;
  month.tsx `compared` (the month before had a workout).
  lib/bodyMeasures.ts `formMeasures`, `STARTER_MEASURES`. The dev server
  served stale code twice this round: restart Metro (`--clear`) before
  trusting a browser check.
- **Expo SDK 58** (3 Nov; the owner: "upgrade GymGO to expo sdk 58").
  `expo install expo@^58.0.0 --fix`, then: app.json lists the plugins SDK
  58 asked for and drops expo-build-properties' `enableSceneSupport`
  (built in); `@expo/dom-webview` is a direct dependency only so pnpm stops
  resolving the old 57 one; `patches/expo@58.0.22.patch` is the 57.0.25
  patch on the delegates' new paths (`ios/Expo/`), keyed in
  pnpm-workspace.yaml (bump both with expo). Code: refs typed as React
  Native's `*Instance` types, `unstable_settings.anchor`, awaited
  `File.write`, `backLabel` taking an undefined key (router 58's route keys
  can be), GymMap.android's `WebView<object>` ref (webview 14 defaults its
  props parameter to `undefined`, which makes them `never`). Left for
  later: Gesture Handler 3 deprecates the `Gesture.Pan()` builder used in
  (tabs)/_layout.tsx and PercentSlider (move to `usePanGesture` /
  `useTapGesture`); R8 in Android release builds (keep rules may be
  needed); Expo Go for SDK 58 in the stores, not confirmed on 3 Nov.
- **30 more exercises and five more splits** (3 Nov; the owner: "find
  more exercises and workout splits and make animated icons for them").
  lib/workout.ts `EXERCISES` (96; `TIMED` adds wall-sit, hollow-hold,
  mountain-climber); lib/exerciseGlyphs.ts a drawing for each (squat kind
  'box'; the tempo lists `LOWER_FIRST`, `CYCLES`, `HOLDS` extended);
  lib/templates.ts `together(letter, ...items)` for supersets and five
  templates (full-body-3, body-weight, upper-lower, arnold, body-part),
  beginners first; app/templates.tsx a level filter, a mark per template,
  superset labels. The icons were checked by eye in the preview renders
  (scratchpad tool, not in the repo); the Templates screen was driven in
  the browser after the SDK 58 upgrade.
- **Gym details from Apple Maps, through SerpApi** (3 Nov; the owner gave
  serpapi.com/apple-maps-places-api, "import it into gymgo but dont change
  ui"). That API looks places up by Apple's id only, so the search engine
  (`apple_maps`) finds each gym and carries the same fields.
  packages/domain/src/appleMaps.ts (pure: `readAppleResults`,
  `readWeeklyHours`, `withAppleListing` filling gaps, cited);
  packages/osm `MapOnlyGym.apple` so a pack's gym is cited to Apple on the
  phone; apps/server/src/appleMaps.ts (`AppleMaps`: `apple_listings`
  table, `lookUp`, `enrich`, `decorate`, the daily limit) merged in
  `withOwner` (Apple first, the owner's updates over it), background
  lookups after /api/area, appleMapsCli.ts (`apple-maps` script),
  `SERPAPI_API_KEY` / `SERPAPI_DAILY_LIMIT` in config.ts and both
  .env.example files. Never run against SerpApi: no key here, by the
  owner's rules; tests use SerpApi's documented shape with an invented gym.
  Terms (SerpApi's, Apple's) to check before going public.
- **Sidebar layout** (3 Nov; the owner: "a sidebar menu mode in the
  appearance ... make the normal one default"). ThemeChoice `layout`
  ('tabs' default | 'sidebar'); lib/navLayout.ts (`navMode` → 'tabs',
  'docked' from `SIDEBAR_WIDE` = 960 pt, or 'drawer'; the items; `tabFor`);
  components/Sidebar.tsx (`DockedSidebar`, `MenuButton`, `SidebarDrawer`);
  (tabs)/_layout.tsx picks one and sets `TabBarInset` to match; GymPal.tsx
  places its button by the mode. Tabs switch with `router.navigate`, other
  places `router.push` (their own back). Appearance → LAYOUT.
- **Back buttons on every screen** (3 Nov; the owner: "there isnt a back
  button for some of the mini pop up screens"). Monthly report, Body
  measurements and Edit workout weren't registered in the root Stack
  (app/_layout.tsx), so they opened with no header and no way back; now
  they are. A sweep in the browser of every screen and sheet reachable
  from Profile and Settings found each with its back (sheets: Done on
  iPhone, the back capsule in a browser, Android's arrow). A new screen
  needs its `<Stack.Screen>` line, or it has no header.
- **Ideas from Hevy, round 6: body measurements** (3 Nov), the last of
  the six. lib/bodyMeasures.ts (`MEASURES` with ranges in cm or %,
  `keptValue`/`shownValue`/`valueLabel` for cm and inches,
  `withMeasures`, `withoutDay`, `latestOf`, `seriesOf`, a `deviceStore`
  at `gymgo.body-measures.v1`) and app/measurements.tsx, linked under the
  body weight card on Progress. ProgressChart's `count` now also draws
  lengths. Not done from Hevy, on purpose: a public feed of others'
  workouts, likes and comments (GymGO never shows the days anyone
  trained); the Watch app, Live Activity and Apple Health / Google Fit
  (App Store builds); custom exercises (would need their definitions on
  the account and every exercise list to take them) and routine folders.
- **Ideas from Hevy, round 5: monthly report** (3 Nov). lib/monthReport.ts
  (`monthKeyOf`, `shiftMonth`, `monthsWithTraining`, `reportMonth`,
  `monthReport`, `changeWord`, `monthShareText`) and app/month.tsx
  (`/month?m=YYYY-MM`), linked from Progress once there's a workout. By
  the device's calendar; any month with a workout can be opened (Hevy
  shows only last month's).
- **Ideas from Hevy, round 4: exercise notes and rest per exercise** (3
  Nov). lib/exerciseNotes.ts (a `deviceStore` at `gymgo.exercise-notes.v1`,
  `tidyNote`, `setExerciseNote`, `useExerciseNote`) and
  components/ExerciseNote.tsx (pinned box; a draft kept on Done or blur,
  so other cards don't redraw per key). train.tsx: Rest beside Swap and
  Plates opens `REST_CHOICES` chips that set the item's `restSeconds`
  (`changeRest`); a Note button in the set buttons; `metaButtons` wraps.
  progress/[exercise].tsx: a YOUR NOTE card.
- **Ideas from Hevy, round 3: edit a logged workout** (3 Nov). Server
  `PATCH /api/training/:id` takes name, unit, startedAt, finishedAt and
  exercises besides the note: merged over the stored row and run through
  `cleanTrainingSession`; the note is checked first so nothing half-saves.
  App: lib/sessionEdit.ts (`draftsOf`, `checkEdits`, `finishFor`,
  `minutesOf`), app/session-edit.tsx (reached from Edit on an opened
  workout in Progress), `api.editTraining`, and components/SetKinds.tsx,
  where the set-kind choices, `askSetKindNatively` and `RpePicker` now
  live for both the workout and the editor. The day and start time
  aren't editable (no date picker in the app yet).
- **Ideas from Hevy, round 2: more records and charts** (3 Nov).
  training.ts: ExerciseRecords gains `setVolumeKg`/`setVolumeSet` and
  `sessionVolumeKg`/`sessionVolumeDate`; NewRecord kind `'volume'`
  ("Biggest set yet"), checked after heaviest and e1rm, live in
  `bestSoFar` too; `exerciseSeries(sessions, id, metric)` with
  `EXERCISE_METRICS` (`e1rmSeries` is its first); `repRecords`.
  ProgressChart takes `count` to draw reps. progress/[exercise].tsx: the
  Records and Rep records lists, and the metric chips on Pro's chart.
- **Ideas from Hevy, round 1: kinds of set and RPE** (3 Nov; the owner
  asked to research Hevy's features and build them; the plan is six
  rounds: kinds of set and RPE; more records and charts; editing a
  finished workout; exercise notes and rest per exercise; a monthly
  report; body measurements. Left out on purpose: a public feed of
  workouts (GymGO never shows the days anyone trained), and the Watch,
  Live Activity and Health parts, which need App Store builds).
  training.ts: `SetKind` ('warmup' | 'drop' | 'failure', absent for an
  ordinary set) and `rpe` on LoggedSet and DraftSet; `workingSets()` is
  what records, volume, set counts, muscle balance, lifetime, the record
  card, lastTrained and Do it again count; `setTags`, `withWarmUps`,
  `rpeMeaning`. supersets.ts `restAfter`: none before a drop set, at most
  `WARM_UP_REST` (60 s) after a warm-up. train.tsx: the set number is a
  button (ChoiceSheet, now with a `message`; ActionSheetIOS on iPhone), an
  RPE row of chips under a ticked set when `prefs.rpe` is on, and Pro's
  Warm-ups button on barbell exercises. Server `cleanTrainingSession`
  checks `kind` and `rpe` (in the JSON column; no migration) and needs a
  set that isn't a warm-up; GymPal's training summary marks them.
- **Appearance: more to customise** (2 Nov, the owner asked for more
  customisation in Appearance). Everyone: Text (Smaller to Largest, 0.9×
  to 1.25×, and Bold text one weight heavier), Clock (12- or 24-hour;
  domain `setTwentyFourHour` drives `formatMinuteOfDay`, and copy.ts
  `timeLabel`, savedWorkouts and friends follow), GymPal's button (bottom
  left or right; the wide panel follows). Pro: Corners (Round 1.4×,
  Standard, Sharp 0.45×; `cornersFor` caps them and leaves 0, pill and
  sheet alone) and Your own colour (accent `'custom'`, `customAccent(hue)`
  pushes brand and fill to 4.6:1). All in `gymgo.theme.v1` via
  themePrefs.ts; theme.ts `applyTweaks` applies them, and a hue-only
  change redraws in place (glass listeners) rather than every screen, so
  the slider keeps focus. `useProTweaks` in _layout.tsx turns corners off
  when the plan says not Pro; the accent already fell back to Indigo.
  plans.ts and the GymPal guide describe it. Verified in the browser
  (13 checks), not on a phone.
- **Round 7 of the owner's 11: home-screen widgets, the part that can be
  done here** (2 Nov). lib/widgetSnapshot.ts: next workout (programme day
  first, else a template's), weeks in a row, this week against the goal,
  this month's challenge, and the small widget's line. Not done: the
  widget. Expo's `expo-widgets` (57.0.x exists) needs an App Group
  (`groupIdentifier`), which free Personal Team signing doesn't allow, and
  its native module would compile into every iPhone build once installed;
  nothing native was added. README "Home-screen widgets" says what it takes.
- **Round 6 of the owner's 11: monthly challenges** (2 Nov). Domain
  challenges.ts (targets 8/12/16/20, month keys, time zones, training days
  counted per local day). Server challenges.ts with a `challenge_members`
  table (user, month, target, time zone, finished_at kept once reached),
  routes GET /api/challenges?tz=, PUT/DELETE /api/challenges/:month (this
  month only), friends who joined listed with count and target only, in
  the data export, deleted with the account. Screen app/challenges.tsx
  (from Profile and Friends; not in the limited version) with the month's
  card. Watch out: the web dev server here sometimes misses edits; restart
  it before trusting a browser check.
- **Round 5 of the owner's 11: access filter and class timetables** (2
  Nov). Filters gained `access` (AmenityId[]) → the domain's existing
  `requiredAmenities`: confirmed / needs_confirmation (no record, kept) /
  ruled_out (recorded no); the sheet's Access group offers the three
  accessibility amenities; the domain's messages now use amenity labels.
  Class timetables are a third owner update kind, `class_timetable`
  (domain owner.ts: up to 80 classes, day, start/end the same day within
  six hours, a 2–60 character name with control characters removed),
  applied as `GymRecord.classes` with owner_confirmed provenance; owner
  form in GymOwner.tsx (lib/ownerForm.ts rowsFrom/classesFrom), moderation
  summary, and a Classes fold on the gym page (components/ClassTimetable.tsx).
  Locally the test account was made admin and owner of Doherty's in a
  scratch database only.
- **Round 4 of the owner's 11: recovery map and progress photos** (2 Nov).
  lib/recovery.ts bands lastTrained (main muscles only) into today /
  yesterday / 2–3 days / 4+ / not in the log; components/RecoveryMap.tsx
  shades the existing BodyFigure and lists the same, on Progress, with no
  claim about recovery. Progress photos: lib/progressPhotos.ts (picker,
  resize to 1,200 px, re-encoded JPEG, list in a device store) with files
  in lib/photoVault.ts (documents folder) / photoVault.web.ts (Cache
  Storage), app/photos.tsx (hidden until Show them, Then and now, notes,
  delete removes the file). Nothing is uploaded; GymPal can't see them.
- **Round 3 of the owner's 11: what you pay, and price changes** (2 Nov).
  lib/visitCost.ts: spends you enter (membership by the day it ran, or
  paid once), visits from collection days plus workouts logged at the gym,
  per currency (never added across), and `visitPrice`, the gym's own
  cheapest one-visit price for the gym floor with every part of its cost
  known (no chain "from"/recommended price, no trial, not expired, status
  not unknown; stale ones say "to confirm"), for the break-even line.
  Screen app/spend.tsx (Profile). lib/priceWatch.ts compares saved gyms'
  published offers with the ones last seen (first sight: remembered only;
  a gym not loaded keeps its last; an unsaved one is forgotten); notes on
  Saved (components/PriceChanges.tsx). Both kept on the device through a
  shared lib/deviceStore.ts. GymPal's guide covers both.
- **Round 2 of the owner's 11: training programmes** (2 Nov). Goal ×
  2/3/4 days × 6/8/12 weeks (lib/programmes.ts): Strength uses 5×5 or a
  new upper/lower split, Build muscle full body / PPL / upper-lower,
  General fitness whole-body supersets. Week from the start day, every
  fourth easier (half the sets; Pro's target 10% under last time),
  rotation from the programme's own logged workouts ("Upper A · Strength
  programme", recognised by workoutTitle; template Up next ignores them).
  Kept on the device (lib/programmeStore.ts, `gymgo.programme.v1`, read
  field by field). Screen app/programme.tsx; Home's Up next shows its next
  day first; links from Templates and Profile. Exact weights are Pro, as
  "What to lift next" already is (the rule in words is for everyone); the
  workout screen's Pro target follows easier weeks. GymPal: `withLog` on a
  screen's request turns the Pro log switch on; its guide covers
  programmes.
- **Round 1 of the owner's 11: "Can I do my workout here?" and supersets**
  (2 Nov). A gym's page has a fold that checks a saved workout against
  `knownKit` (the gym's list plus members' tallies): there / missing /
  not known, with `swapFor` swaps from the known kit and **Start it here**
  (lib/workoutFit.ts, components/WorkoutFit.tsx, PlaceCard `workoutFit`).
  Supersets and circuits are a shared `group` letter on neighbouring items
  (lib/supersets.ts: tidyGroups, linkWithNext, unlink, restAfter, nextUp),
  in the builder (ExerciseCard) and the logger (train.tsx), with the rest
  timer and "up next" following the group; saved plans keep `group`
  (server cleanWorkoutPlan, A–L only) and a regrouped plan saves as new.
  GymPal's guide covers both.
- **gymgo.site follows the owner's server** (1 Nov). Asked: "when the
  server is turned off it shows the limited edition of the website and when
  the server is on it shows the normal version". One Pages build
  (`EXPO_PUBLIC_LIMITED=auto`, `EXPO_PUBLIC_API_URL=https://app.gymgo.site`
  unless the repository variable `GYMGO_SERVER_URL` says otherwise, `none`
  for limited only). The page asks `/api/health` from a script that
  pages-build.sh puts in index.html; the app's new entry (apps/mobile/
  index.ts, `main` in package.json) waits for that answer (3 s at most)
  before requiring `expo-router/entry`, so `LIMITED` (lib/limited.ts) stays
  a constant read once. Phones start at once, as before. In the limited
  version apiBase is null and the kept sign-in isn't read or cleared
  (useAccount). WebsiteBanner (components/LimitedBanner.tsx) offers the
  other version when a later answer differs; it never reloads by itself.
  online.mjs adds gymgo.site and www to `GYMGO_ALLOWED_ORIGINS` and says
  whether gymgo.site will follow. Found on the way: `expo export` reuses
  cached files with old `EXPO_PUBLIC_*` values baked in when only a setting
  changed, so pages-build.sh and online.mjs now pass `--clear`
  (netlify-build.sh doesn't; CI starts with no cache anyway). It works only
  once app.gymgo.site exists: the owner moves gymgo.site's DNS to
  Cloudflare (keeping GitHub's records DNS only) and makes the named
  tunnel (README, "GymGO online from your PC"). Not tried against the real
  address from here.
- **GymGO online from the owner's PC** (1 Nov). Asked: a server at
  absolutely no cost; Oracle's free servers were out of capacity, Cloudflare
  Workers' free plan allows 10 ms of CPU a request (one scrypt check is about
  40 ms here), and the owner chose their PC "for now". `gymgo -Online`
  (scripts/online.mjs): the server serves the web app itself (web.ts,
  `GYMGO_WEB_DIR`) behind a Cloudflare Tunnel; the app finds the server at
  its own address (`same-origin`). A public address switches the published
  dev Pro account off (`retireDevProAccount`). Never open a real tunnel
  from a cloud session: test with a stand-in cloudflared (`GYMGO_CLOUDFLARED`).
- **Location and GymPal switches** (29 Oct), in Profile → Settings, kept
  in prefs (`location`, `gymPal`). Anything new that reads where you are
  must go through `currentFix` (lib/location.ts), which returns 'off' when
  the switch is off; anything new that opens GymPal should use `AskGymPal`,
  which hides itself when he's off.
- **GymPal in more features, and more of him with Pro** (29 Oct). Asked:
  include GymPal in many features, and extended use for Pro. Any screen opens
  him with `openGymPal({ question, context, about })` (`lib/gymPalBus.ts`), or
  the `AskGymPal` row; the chat shows what he was told and offers questions
  for the screen (`lib/gymPalSuggestions.ts`). Context about a real gym must
  only ever be what GymGO shows as unknown (the call questions), never a fact
  passed on. Pro limits and the training-log summary are on the server
  (`GYMPAL_PLANS`, `trainingSummary` in `apps/server/src/gymPal.ts`); the log
  leaves only when a Pro member switches it on, never gyms or notes.
- **Verity is now GymPal, with his own logo** (28 Oct; the owner asked:
  "Change the Verity ChatBot to GymPal and create a logo for him"). The
  logo is `apps/mobile/assets/gympal/gympal.svg` (a kettlebell in a pink
  sweatband on GymGO's blue-violet; `gympal.png` beside it at 512 px). Its
  groups `body`, `eyes` and `mouth` become `src/lib/gymPalArt.ts` through
  `scripts/gympal-logo.mjs`, and `components/GymPal.tsx` lays them over one
  another with `SvgXml` to blink and grin. The owner's smiley and
  `scripts/verity-face.mjs` are gone. Renamed: `Verity.tsx` →
  `GymPal.tsx`, the server's `verity.ts`/`verityGuide.ts` →
  `gymPal.ts`/`gymPalGuide.ts`, `/api/verity` → `/api/gympal`, the error
  codes `gympal_off`/`gympal_busy`, `GYMGO_VERITY_MODELS` →
  `GYMGO_GYMPAL_MODELS` (`OPENROUTER_API_KEY` unchanged). The Terms and
  Privacy Policy now say GymPal, so `LEGAL_VERSION` is 2026-10-28. The
  entry below describes him as Verity.
- **Verity, the AI assistant** (27 Oct). The owner asked for a free
  chatbot in the bottom-right corner called Verity, greeting "Hi! I'm Verity
  your personal assistant, ask me anything!", smiling and blinking, and to
  have it know the app thoroughly. The name and look went back and forth
  (GymBud; no yellow circle; its own logo); where it ended, asked last with
  the picture attached: **Verity**, with the owner's yellow smiley as its
  face, blinking and grinning from its own eyes and mouth
  (`apps/mobile/src/components/Verity.tsx`, mounted in `app/_layout.tsx`;
  the layers from `apps/mobile/scripts/verity-face.mjs`).
  The server relays chats to OpenRouter (`apps/server/src/verity.ts`), only
  ever to `:free` models, with Verity's guide to the app
  (`verityGuide.ts`) as its instructions: keep that guide true of the app.
  The owner hasn't set a key yet; never ask for it in chat (their rule).
  Until it's set up, and on the website (no server), Verity answers every
  question with an apology that it's waiting to be set up (`WAITING`).
  Tested only against a stand-in for OpenRouter. Free models allow 50
  questions a day for the whole account. Terms and Privacy Policy updated
  (`LEGAL_VERSION` 2026-10-27).
- **Country flags back, and only the flags** (27 Oct). After the undo below,
  the owner asked session `01AgUY2LAX9QWwZT9VCizKDS` for the flag emoji back,
  and said plainly: just the flags, not the other emoji. `components/Flag.tsx`
  (`Flag`, `hasFlag`) draws a country's Noto 3D flag from
  `src/lib/flagImages.ts`, written with the pictures by
  `apps/mobile/scripts/noto-flags.mjs`; used in the country list, Home's city
  buttons and country headings, `GemCard` and `SetCard`. Licence: SIL OFL 1.1
  in `assets/flags/LICENSE.txt`, credited on Profile. `src/lib/flags.test.ts`
  fails if a country has no flag. The icons, celebrations and everything else
  the undo put back stay as they are.
- **Undone at the owner's request (26 Oct): another session's six changes.**
  The owner asked to undo what session `01AgUY2LAX9QWwZT9VCizKDS` did and put
  the app back as it was. Commit `01cce83` reverts, newest first: the desktop
  sidebar and wider pages (`45b7481`), the purple icons replaced with emoji
  (`c977cd6`), flags on Home's cities (`40aa789`), light as the default
  appearance (`40410b3`), Noto 3D emoji and flags (`129969b`), and Netlify's
  removal for GitHub Pages only (`fc5490c`). The files are exactly as at
  `c0daebd` (the end of polish round 9). Don't redo any of them unless the
  owner asks again; each can come back by reverting its part of `01cce83`.

- **Phone-only review: Android map, Expo Go warnings, links, haptics**
  (14 Oct, the owner said Expo Go was "heavily bugged" and hasn't yet said
  how; these came from reading the phone-only code). Conventions to keep:
  - Open a web page with `openPage` (`lib/actions.ts`), never
    `WebBrowser.openBrowserAsync` directly: it treats a double tap as one
    and falls back to the phone's browser.
  - End every fire-and-forget library promise with `.catch(...)`: an
    unhandled one is a warning over the app in Expo Go.
  - A map that can't load shows `MapNotice`; the Android map
    (`GymMap.android.tsx`) restarts its page when Android takes it away
    (`onRenderProcessGone`) and replays the pins, dot and padding.
  - Haptics go through `lib/haptics.ts`, which uses Android's system
    haptics, not the vibration motor.
  - A chip that does something, rather than switching on or off, takes
    `action` (a button to screen readers, not a checkbox).
  - A choice of one from a few, outside iPhone: `ChoiceSheet` (the sort
    order uses it; iPhone keeps Apple's action sheet).
- **Settings menus, second pass** (13 Oct, the owner asked again):
  Profile's account card shows workouts (from the shared training log,
  `useTrainingLog`, so no extra request), saved and collected, with a
  PRO/FREE badge; `ProCard` in `app/(tabs)/profile.tsx` replaces the plain
  GymGO Pro row; `Group` headings are semibold (Account's and Country's
  own headings match); Country's rows have inset dividers.
- **Settings menus made more premium, and their bugs fixed** (13 Oct,
  the owner asked). Switches on the web and Android are now the iPhone's
  pill (`components/Toggle.tsx`; the system switch stays on iPhone): React
  Native's stand-in had a teal Material thumb, and when off no track at
  all. Profile's and Account's rows share one lit icon tile
  (`SettingsTile` in `components/ios.tsx`, flat in the solid looks) and
  the same height and inset dividers; rows that open something under them
  turn their chevron down and tell screen readers (`expanded`); action
  rows (Sign out, Download my data) lose their chevron. Account no longer
  shows users "(see README)", and Profile's long Settings footer moved
  onto the rows it explained (Haptics on the web, Demo mode).
- **Liquid Glass review fixed** (13 Oct): a change of the level alone
  redraws screens in place (`useGlassRedraw` in `components/Redrawn.tsx`,
  called by every screen; a test checks), and cards stay at WCAG AA.
- **Workout section made more premium, with GymGO's own exercise icons**
  (13 Oct, the owner asked, then asked for them to move). Every exercise
  has an icon drawn in code (`src/lib/exerciseGlyphs.ts`): one figure,
  posed by limb angles, with its kit in the accent. Each pose has a `move`
  (the other end of the rep); `exerciseFrames` draws 9 points through the
  rep and `components/ExerciseGlyph.tsx` eases between them with
  Reanimated on the UI thread. Icons move in plan cards and on the
  exercise you're on in a workout, and stay still with Reduce Motion.
  A new exercise needs an entry in `DRAW` (a test fails without one).
  Also: `components/PlanSummary.tsx` (a plan's head card: exercises, sets,
  about how long, from `src/lib/workoutStats.ts`), `ExerciseCard` with
  sets, reps and rest side by side, wider set rows in a workout.
- Owner-approved round (8 Oct): Swap one exercise (plan and workout;
  `swapFor` in `src/lib/workout.ts`), Next to collect on Collection
  (`nextToCollect` in `src/lib/collection.ts`), Share your week
  (`weekRecap` in `src/lib/insights.ts`, `src/app/recap.tsx`,
  `components/RecapCard.tsx`), a welcome tour after sign-up
  (`src/app/welcome.tsx`, `noteNewAccount` in `lib/afterSignIn.ts`), and the
  busy button renamed "Say how busy". Offered but not chosen: hiding the
  AD PLACEHOLDER box for Free users, putting "can I get in?" first on gym
  pages, and a notice when the map can't load.
- **The limited website can go on GitHub Pages, free** (20 Oct; the owner
  asked for a way without buying Netlify credits and said "Yes set it up").
  `.github/workflows/pages.yml` runs `scripts/pages-build.sh` on pushes to
  this branch and publishes to https://ashenkodituwakku.github.io/GymGO/.
  `GYMGO_BASE_URL` (`app.config.js`) gives Expo the `/GymGO` path; the
  script prefixes the page's own links, writes `404.html` (Pages has no
  rewrites) and gets the path from `actions/configure-pages`, so a custom
  domain later needs no change here. `scripts/web-assets.sh`, shared with
  the Netlify build, renames the folders hosts leave out. **Waiting on the
  owner:** Settings → Pages → Source "GitHub Actions", and this branch
  added to the `github-pages` environment's deployment branches (only the
  default branch can deploy until then); a run fails at "configure-pages"
  or "deploy" until both are done. Built here both ways (under `/GymGO`
  and at the root) and driven in a browser behind a Pages-like server:
  deep links, icons, fonts, client navigation, nothing missing. README:
  "The website on GitHub Pages".
- **gymgo.site is the limited version** (20 Oct, the owner asked: "instead
  of the demo version name it limited version … main cities around the
  globe … so you don't need the servers yet"). The website build sets
  `EXPO_PUBLIC_LIMITED=on` (`lib/limited.ts`, replacing `lib/demoOnly.ts`):
  real built-in gyms, no server, every built-in city open, Demo mode off and
  hidden, a "GymGO limited version · Gyms in N cities, built in" banner
  (`components/LimitedBanner.tsx`), and a limited-version card on Profile.
  Server-bound parts are left out, not offered (see README, "The website on
  Netlify"). More world cities wait on Overpass: `packages/world-data`
  fetches them in one command, but overpass-api.de and its lz4 instance
  reset connections from this cloud network, so a public mirror must be
  allowed (its README). The owner has linked the GitHub repository in
  Netlify, so a push builds the site there, **but the Netlify account's
  credits ran out**: every build since 11 Oct is "Skipped due to account
  credit usage exceeded", so gymgo.site still shows the 11 Oct demo. Each
  push to this branch is a production deploy, which is what used them up.
- **The website is on Netlify** (6 Oct; the owner asked, and chose: live on
  gymgo.site now, usable without an account, server decided later). Netlify
  project `gymgowebsite`, replacing the "coming soon" page. `netlify.toml`
  runs `scripts/netlify-build.sh`, which exports the app for the browser.
  The website build sets `EXPO_PUBLIC_ACCOUNT=optional` (guests get in;
  `lib/accountRule.ts`); the app and the PC version still need an account.
  With no `GYMGO_SERVER_URL` in Netlify the build sets
  `EXPO_PUBLIC_API_URL=none` (`lib/serverAddress.ts`), so it never asks for
  a server: built-in gyms only, "offline copy" in the status pill. With one,
  `_redirects` passes `/api` and the legal pages to it like Caddy does. The
  Terms and Privacy Policy now say the app needs an account and the website
  doesn't (same version, 2026-10-06). README: "The website on Netlify".
- **GymGO needs an account now** (the owner asked for it to be usable only
  with one). The server answers only a signed-in session apart from the
  open list in `isPublicRoute` (`apps/server/src/app.ts`); a new route is
  closed unless you add it there, and image files stay open because
  `<Image>` can't send the token. In the app, `Stack.Protected` in
  `src/app/_layout.tsx` keeps every screen behind sign-in except
  `sign-in`, `legal/[doc]` and `report-bug`; a new screen must go inside
  the protected group. `lib/api.ts` sends the session on every request;
  `lib/afterSignIn.ts` brings a signed-out link back after sign-in. The
  terms' version moved to 2026-10-06. Server tests read as a signed-in
  member (`reader`). Old signed-out branches in screens (a "Sign in"
  button) are left as harmless fallbacks. In a browser, the back capsule
  on a page open while signed out (the legal pages, Report a bug) says
  "‹ Sign in" and goes there, rather than "‹ Home", which needs an account.
  Checked in the browser (6 Oct): every app page sends you to sign-in
  signed out; a gym link opened signed out opens after signing in; a new
  account lands on the country picker; signing out, Back and reload don't
  get back in.
- Map card and web back button (6 Oct). A gym's card no longer empties
  when the search moves on without that gym (Show gyms near me, another
  place, a filter that rules it out): the card stays, weighed the same way
  as a gym page. Before, on a wide window the card turned into a Filters
  panel that its close button couldn't shut, and on a phone it left a
  blank sheet with no close button. In a browser, every page's back
  button is now a soft accent capsule naming the page behind ("‹ Profile",
  "‹ Home"; untitled pages say "Back"), filled on hover, with the title
  centred; a page opened straight from a link goes Home. iPhone and Android
  keep their own back buttons (components/WebBack.tsx, lib/backLabel.ts).
- Polish round 3 (6 Oct): forms. Sign in's "don't match" clears as you
  fix the email or password; on Account, Enter saves a name or a password,
  and a new password says how many characters it still needs; naming an
  interval timer has Cancel and a proper box, and deleting one takes two
  taps; a review can be cancelled ("Send review" / "Cancel"); the owner
  claim's contact hint fits, and only Australian gyms are asked for an ABN.
  Search: Explore now passes your country to its search box (it never had,
  so the box was read out as "Search a town, city or gym" to everyone and
  world cities weren't yours-first), place suggestions in Explore and
  Trips put your country's first (`suggestPlaces(..., home)`), and "Try a
  city or ZIP code" / "A city or neighborhood" for a US user. A scan of
  every screen found no unnamed controls and no button label that wraps.
- Polish round 2 (5–6 Oct): every page scrolls a box you're typing in clear
  of the iPhone keyboard (`PageScroll` now does it for all pages; only four
  did); trips are described by the date where they are (`todayThere` in
  `src/lib/trips.ts`: the list said "Tomorrow" while the trip's page said
  "Under way"), their first day reads "Today", and removing one takes a
  second tap; "1 gym near Melbourne CBD" in Find a machine, not "near
  melbourne cbd"; a friend code nobody has shows in red and clears as you
  type; the leaderboard's "You" is a label that a long name can't cut off;
  Friends and Leaderboard show "Can't reach GymGO" with Try again when the
  server is away, not "Sign in" to a signed-in person; My workouts has Try
  again; Profile's Offline gyms and Google content lines fit their two
  lines. A check for text cut short on every screen at 375 and 393 points
  finds only gym names on Home's cards and map street names. Mac trackpad
  haptics were looked at: a web page can't drive them (Safari only reports
  a force click), and the owner chose to leave it.
- Polish round (5 Oct): distances in your own country's units everywhere
  (`setReaderCountry` in `src/lib/places.ts`, set from your Country); the
  server keeps one copy when the same workout plan is saved twice; proper
  empty states for a card you don't have and for Moderation; Friends' empty
  line padded like its rows; a saved gym the server no longer has shows as
  "No longer listed" with Remove (it used to be invisible but still take a
  Free space; `gone` in `useGymData`), and a gone compare pick no longer
  counts towards Free's two (picking another opened the Pro screen); Saved's sign-in line is a link and
  says "your other devices", not "your PC". Seen in the browser at iPhone
  and iPhone SE sizes and at 1440 wide, light and dark, signed in and out,
  with Reduce Motion on.
- Batch E: gift Pro (a code for a year), Pro Duo (a partner by friend
  code), partner day passes (mechanics only; none listed). Stripe test mode
  only, against a pretend Stripe.
- Batch D: "is it busy?" from members there, verified gym owners (claim,
  admin check, moderated updates shown as from the gym), a Moderation screen.
- Batch C: workout templates, record celebration and card, rest alert when
  locked, CSV as a real file with the Health explanation.
- Batch B: collection sets (another session), friends, invites to train,
  leaderboards, share cards as pictures. Card rarity now lives in the
  domain package (`cards.ts`) so the server can show friends' cards.
- Batch A: open late / 24 hours filters, Find a machine, Trips.
- Glass equally opaque on every device (iOS 18 was see-through).
- Sign-in, the dev account included, works on every device that opens the
  app, Expo Go through `-Tunnel` included (the server goes through the
  bundler).
- Check-in scan with ripple and progress bar, with a Reduce Motion version.
- Launch work: Terms, Privacy, Refunds, Community Guidelines (app plus public
  pages, agreed at sign-up); security hardening and forgot password; free
  hosting kit (`deploy/`); skeleton loaders.
- New logo everywhere; collection synced to the account; card popup and
  animations.

## Next up: the owner asked for all 11 of these (2 Nov)

Claimed by this session (session_01T19nwfpA683gnbhSJ8YpPV), built in this
order and pushed round by round; tick each as it lands. Another session:
`git fetch` first and leave these alone.

- [x] "Can I do this workout here?" on a gym's page: the workout you built
      against members' equipment reports (there / missing / not known yet),
      with a swap for what's missing.
- [x] Supersets and circuits in the workout builder and logger, one rest
      timer for the group.
- [x] Training programmes: a goal and days a week planned over weeks,
      weight added when every rep is hit, an easier week now and then;
      with Pro, GymPal can adjust it from the training log.
- [x] Cost per visit: what you pay (entered by you) over your check-ins,
      and when a membership beats day passes. Unknown prices stay unknown.
- [x] Price-change notes for saved gyms: old and new published price,
      source and date checked.
- [x] Recovery map: the body figure shaded by days since each muscle was
      trained, from the log. No health claims.
- [x] Private progress photos, kept on the device only.
- [x] Accessibility filter from OpenStreetMap's wheelchair data; gyms
      without it shown as "not known", not hidden.
- [x] Class timetables from verified gym owners only, dated.
- [x] Monthly challenges with friends, opt-in, a card for finishing.
- [~] Home-screen widgets (next workout, streak): what they show is built and
      tested (lib/widgetSnapshot.ts); the widget itself waits on the owner
      (a paid Apple Developer account for the App Group, and a Mac build).

## Earlier: the owner asked for all 22 of these

Status is updated as each batch lands. Build them in order, one batch per
pushed commit or a few.

**Two sessions are working through this list at once.** Before starting
an item, `git fetch` and read this list on `origin/claude/friendly-johnson-9rzxrj`;
skip anything ticked or marked claimed, and mark what you take as claimed
(push that first) so the other session doesn't build it too.

- All five batches are done (B's sets by the other session, the rest by
  gymgo-82). Nothing is claimed now.

**Batch A: search**
- [x] Open late (after 10 pm) and 24-hour quick filters, from published
      hours (`packages/domain/src/hours.ts`, `hours` in the filters).
- [x] Machine search (`src/app/machines.tsx`, domain `machines.ts`,
      server `GET /api/equipment/reported`).
- [x] Travel mode (`src/app/trips/`, `src/lib/trips.ts`, domain
      `trips.ts`); a Home card for a trip under way or within a month.

**Batch B: collection and social**
- [x] City and suburb sets with badges and a reward card
      (`src/lib/sets.ts`, `src/components/SetCard.tsx`; on Collection and
      at check-in).
- [x] Leaderboards (opt-in, display name only), per city and among friends
      (`src/app/leaderboard.tsx`; server `src/social.ts`).
- [x] Friends: add by code, see each other's collections, invite to train
      (`src/app/friends/`; server `src/social.ts`, domain `social.ts`).
- [x] Share a collected card as an image (`src/lib/shareImage.ts`,
      `src/app/card/[id].tsx`, Share card in the new-card pop-up).

**Batch C: training**
- [x] Workout templates (`src/lib/templates.ts`, `src/app/templates.tsx`).
- [x] Personal-record celebration (`src/components/Celebrate.tsx`,
      `src/lib/records.ts`; in the workout summary).
- [x] Rest timer alert while the phone is locked (`src/lib/restAlert.ts`).
      Live Activities still need a native build.
- [x] Apple Health / Google Fit: explained on Progress beside the CSV
      export, which now shares a real file on phones.

**Batch D: trust**
- [x] "Is it busy?" member reports (`src/components/MemberBusy.tsx`, domain
      `busy.ts`, server busy routes).
- [x] Verified gym owners (`src/components/GymOwner.tsx`, server
      `owners.ts`, domain `owner.ts`; `make-admin` to decide claims).
- [x] Faster moderation on the phone (`src/app/moderation.tsx`,
      `src/components/Moderation.tsx`; count on Profile).

**Batch E: money** (Stripe test mode; nothing live without the owner)
- [x] Gift Pro (server `perks.ts`, domain `perks.ts`, app `ProExtras.tsx`).
- [x] Duo Pro (same files; a Duo price in Stripe, a partner by friend code).
- [x] Partner day passes, mechanics only (`DayPass.tsx`; admins add passes).
      No gym has one: agreements are the owner's to make.
