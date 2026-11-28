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
- **No GitHub Models.** GitHub retired GitHub Models on 30 July 2026 (its
  docs say so; models.github.ai answers every request with a bare "OK").
  On 18 Nov GymPal briefly asked it (Updates 173 to 175) before that was
  found; it was taken out again in Update 176. GymPal is Groq's free plan
  (`GROQ_API_KEY`, Update 181) then OpenRouter's free models: never a paid
  model, and no "unlimited" key (none exists; shared ones are leaked).
  The owner pasted a GitHub token in chat for it and saved it on their Mac:
  never write it anywhere or use it. The server and `gymgo -GymPal` /
  `gymgo-mac.sh --gympal` only say it does nothing and take its line out.
  Check a service is still running before building on it. The owner has
  pasted keys in chat more than once: never use one from chat; point them
  to the one-line Terminal command that saves a key without showing it.
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

- **Time zones** (25 Nov, Update 289). This container's clock is UTC, so
  run date-sensitive tests with `TZ=Australia/Melbourne` (and an extreme like
  `Pacific/Kiritimati`) too; build test times from local clock times
  (`new Date(2026, 9, 1, 7)`) when a test needs two to share a day.
- **Broken addresses** (25 Nov, Update 283). `route` refuses an /api/
  address with a part that doesn't decode (400) before any handler, so
  `decodeURIComponent(parts[n])` in a route can't throw.
- **Request bodies** (25 Nov, Update 282). `readJson` (app.ts) now refuses
  a top-level null or plain value with a 400, so handlers can read fields
  off what it returns. Every route takes an object (or a list).
- **Empty text crash check** (25 Nov, Update 281). `node
  scripts/jsx-empty-text.cjs` lists any `{a && <X/>}` whose `a` is a string
  or number: '' or 0 would be rendered and the phone apps crash. Use
  `a ? <X/> : null`. A console sweep of 37 screens is clean apart from
  OpenFreeMap's own style on Explore.
- **First load measured** (25 Nov): about 5.1 MB of script, 1.27 MB
  gzipped. An option if it matters later: load @gymgo/usa-data and
  @gymgo/eu-data (118 KB gzipped) only for those countries; mind lib/query.ts
  BUNDLED_GYMS (limited website, offline copy) and lib/places.ts (city lists).
- **Sidebar by default on the desktop website** (25 Nov, Update 279).
  ThemeChoice `nav: 'auto' | 'tabs' | 'sidebar'` (stored as `nav`; the old
  `layout` is read once: only 'sidebar' carries over). `layoutFor(choice,
  width, web)` and `navMode(choice, width, web)` in lib/navLayout.ts; pass
  `Platform.OS === 'web'`. The owner's decisions the same day: move buttons
  off by default, refunds email-only, three-line gym names, no Places key.
- **Refunds and disputes** (24 Nov, Update 276). billing.ts `MoneyEvent`,
  `MONEY_EVENT_TYPES`, `moneyEventEmail`, `recordMoney`, table
  `stripe_money_events`; app.ts emails them through `bugReports.send/to`.
  Record and notify only: don't end access on a refund or dispute without
  the owner deciding (docs/PAYMENTS.md).
- **CLAIMED (24 Nov, session_01T19nwfpA683gnbhSJ8YpPV): rewriting the
  app's text so it doesn't read as AI-written.** The owner asked for every
  piece of text on the website to be redone; the house style is
  docs/COPY.md. Write all new text that way. This session goes area by area
  (Pro and Max first, then Home, Explore and gyms, Workout and Progress,
  Profile and settings, friends and feed, GymPal, errors). **Other session:
  please do the welcome tour, sign-in and sign-up yourself, in the
  docs/COPY.md voice, since you're working there**; this session leaves those
  files alone. Legal text, GymPal's greeting and waiting messages stay.
  Done so far (Updates 267–273): Pro and Max, Home, Explore and the gym
  page, training, Profile and settings, collection, friends and feed, gym
  owners and moderation, filters, Google, weather, GymPal's panel, the
  server's error messages and the password reset email and pages. Server
  messages: write limits as "You’ve reached today’s limit for X" or "Too
  many X", not "That’s a lot of X".
- **Max's AI features** (24 Nov, Update 266; the claim is done). Server:
  apps/server/src/gymPalMax.ts (`cleanRequest`, `cleanCatalogue`,
  `workoutTask`, `readWorkout`, `NOTE_TASK`, `cleanNote`) and the routes
  POST /api/gympal/workout and /api/gympal/note in app.ts (Max only,
  `max_required` otherwise; each counts on the Max limiter). `GymPal.ask`
  takes a `task`, added to the instructions after the guide. App:
  app/ai-workout.tsx (sends EXERCISES and your own, with `setMeasure`;
  Start uses `startSession`), components/CoachNote.tsx on the workout
  summary, a "Build with GymPal" row under Start another way, ProReason
  `max` (opens the Pro page with Max chosen). A new Max feature: add it to
  `MAX_FEATURES` once built, and to GymPal's guide.
- **GymGO Max** (24 Nov, Update 264). The owner's tiers: Free, Pro
  (unchanged) and Max (Pro plus AI features and badges); no Duo or family.
  `MAX_PRICES`, `MAX_PRODUCT`, `isMaxLookupKey` and `MAX_FEATURES` (only
  what's built) in packages/domain/src/plans.ts. A Max subscriber is Pro
  (`plan: 'pro'`, `max: true` in GET /api/billing; `billing.isMax` in the
  app), so every Pro check still works. Server: `Billing.isMax`,
  `subscribed()` → `{ pro, max }`, checkout answers `switch_plan` instead
  of making a second subscription; `isMaxSql(idColumn)` (billing.ts) puts
  `max` on people in feed.ts, social.ts and challenges.ts for the badge
  (components/MaxBadge.tsx, `MAX_SPOKEN` for whole-row labels).
  `GYMPAL_PLANS.max` (300 a day, keeps 60). stripe-setup.ts makes Max,
  takes Duo off sale, and sets the portal's `subscription_update` (Pro and
  Max prices, prorated). Duo's code is gone; the `duo_members` table
  stays, unused, so old data still exports. Legal wording is the owner's
  (docs/PAYMENTS.md → GymGO Max).
- **Text fields in High Contrast** (24 Nov, Update 260). app/_layout.tsx
  gives every input and textarea a 1px CanvasText border under
  forced-colors (fills vanish there). A view that draws its field's box
  itself (an icon pill, sign-in's fieldBox, GymPal's composer) takes
  `{...FIELD_FRAME}` (lib/theme.ts): it is outlined instead, rings in
  Highlight on :focus-within, and the field inside draws no border or
  outline of its own. A new search pill needs the marker.
- **Announcements on the web** (24 Nov, Update 259). React Native Web's
  `AccessibilityInfo.announceForAccessibility` is a no-op: never call it
  for something a browser's screen reader should hear. Use `useAnnouncer`
  (components/ui.tsx): `say(text)` (stable, safe in callbacks) and render
  its `region` inside whatever a screen reader can reach while it speaks
  (inside a Modal's panel, not outside it). A live region that shows an
  error keeps its wrapper mounted and swaps only what's in it. A button
  that removes itself calls `focusNextWhenGone(event.currentTarget)`
  first (the plank stopwatch's Stop). Times are said with `spokenClock`.
- **Motion and type rules** (22 Nov, Update 236). components/motion.tsx:
  every press sinks to `PRESS_SCALE` (0.97; don't pass `scaleTo`), every
  entrance starts at `ENTER_SCALE` (0.97) and transparent, never scale 0
  (`POP_IN` is a Keyframe now); a stepper's new step takes
  `stepIn(forward)`; a progress fill uses `useFillBar` (transform, not
  width). lib/theme.ts `applyTheme` marks `html[data-theme-switching]`
  for 300 ms (transitions off). A sideways ScrollView in a browser takes
  `{...rubberBand(edgeFade())}` (components/rubberBand.web.ts; each row
  binds its own non-passive wheel listener on pointerover, never the
  page, Update 243; it preventDefaults a wheel past a row's end, as overscroll-behavior alone
  let the browser go Back: test by moving the mouse after the swipe, which
  is when Chrome finishes the gesture, Update 241; at 1280×860 Home's
  rail starts below the fold, so scroll it into view first); icon-only
  buttons get tooltips from components/tooltips.web.ts (aria-label, 60
  characters at most; `data-no-tip` opts out). Text: `SteadyTxt on={…}`
  for words that turn bold when chosen; Txt's `trim` (button labels),
  `fluid` (a page's big headline, web; `trim` only on a box with a set
  least height and no line limit, Update 240), `acronyms` (small capitals in a
  sentence, web) and `hyphens` (narrow columns); `FileName` for a file's
  name. Card titles: `numberOfLines={2}`. Curly quotes in visible words.
  A card in a TiltCard can read its lean from `TiltContext` (GemCard's
  TiltLight). The fourth reel ("unslop") had nothing to build.

- **Billing words** (22 Nov). `describeMembership` (packages/domain
  money.ts) says 7, 14, 28, 28–31 and 365/366 days as week, fortnight,
  4 weeks, month and year; anything else in days. The gym page's price
  fact is the price of one visit: unknown, it says "visit price", as a
  gym can publish memberships and not that.

- **The website version, checked as it's built** (20 Nov). Run Metro
  as gymgo.site builds it: `EXPO_PUBLIC_API_URL=none
  EXPO_PUBLIC_LIMITED=on EXPO_PUBLIC_ACCOUNT=optional` (on another port
  beside the full app's). Without `API_URL=none` it talks to the local
  server, and a guest's requests get 401s the real site never makes.
  Its gyms are all real, with real, long names: check text there, not
  only with the demo gyms. A plan's name is never cut short (JoinGym's
  price boxes have no line limit); a gym's name takes up to four lines
  on a card (GymCard), three in a list (GymRow) and two in search
  suggestions. A list in a line ends in words, not "…": see
  `exercisePreview` in lib/workout.ts. In Playwright, `addInitScript`
  runs in the page, where `process` doesn't exist: pass settings in as
  its argument (reading `process.env` there throws and skips the rest).

- **Target size** (20 Nov). axe's default run leaves out `target-size`
  (WCAG 2.2, 24×24 px): run it with `runOnly: { type: 'rule', values:
  ['target-size'] }`. React Native Web ignores `hitSlop`, so a small
  Pressable is a small target on the website: draw the small thing
  inside a target of 24 or more instead (Welcome's dots). A control's
  `accessibilityLabel` starts with the words it shows, then any detail
  ("Add set: Bench press"), so voice control can press it by them.
  A Pressable that isn't a control needs `tabIndex: -1` on the web:
  React Native Web ignores `focusable` (components/ios.tsx Row). An SVG
  drawn more than once takes its ids from `useId` (GymPalMark). Text
  that can grow (a reader's own spacing) needs room for another line:
  prefer `numberOfLines={2}` to 1 for names, figures and values.
  Forced colours drop shadows and fills: the focus ring and the state
  of switches, tabs, chips and choices have a `@media (forced-colors:
  active)` block in app/_layout.tsx, keyed on ARIA state. A new control
  that shows state only by a fill needs its role and aria-checked or
  aria-selected for it to show there. Test with Playwright's
  `forcedColors: 'active'`. Every `[role=button]` is outlined there
  too (Update 226), so a button whose only edge is a fill still looks
  pressable. Console check: only Reanimated's reduced-motion note,
  WebGL notes and an OpenFreeMap style warning ("Expected value to be
  of type number") are expected; anything else is new. An overlay
  over the bottom of a TabScreen goes in `bottomExtra`, which now also
  pads the scroll so focus stays clear of it (WCAG 2.4.11). A sheet
  over a dimmed page takes `<SheetClip takesFocus holdsFocus="Name">`
  so focus stays in it (Filters). A page-level Escape handler should
  ignore keys pressed inside `[aria-modal="true"]` (React Native Web's
  Modal doesn't mark its Escape as handled). A non-drag way for a
  pointer to move Home's widgets (WCAG 2.5.7) is Appearance's Move
  widgets with buttons (ThemeChoice.moveButtons, off by default, Update
  246): up/down buttons on each widget while editing, and no jiggle;
  ask the owner before making it the default. Spelling: cspell
  with en-GB over the app's text found nothing (install it outside the
  repo; it only reads files inside its working folder).

- **Headings** (20 Nov). A pushed page's level-1 heading is the
  navigation bar's title, so a large title inside the page is
  `level={2}` (Challenges, Programme). A page without that bar needs its
  own `accessibilityRole="header" level={1}`: Explore's results summary,
  and on Welcome an unseen one. `/gym/prime-athletica-fitzroy` is a
  Melbourne gym: it shows "Gym not found" with demo gyms on (prefs
  `demo: true`); use `ironbark-strength-surry-hills` there. A page
  section's small-capitals title (`variant="eyebrow"` with
  `styles.section`) is `accessibilityRole="header" level={2}`. A name in
  a capitals label is written as words with `textTransform: 'uppercase'`
  (VoiceOver spells out "GYMGO"); the eyebrow variant itself has no
  transform, as a few labels are in normal case on purpose.

- **LiveLine fadesOut** (20 Nov). A message whose view has
  `exiting={FADE_OUT}` goes in `<LiveLine fadesOut>`. On the web
  Reanimated appends the fading copy to the element's `offsetParent`,
  which is now the LiveLine box (RNW Views are `position: relative`);
  collapsed at once, the box clipped the copy and moved it to the top of
  the column. `fadesOut` keeps the box in the flow until the copy is
  removed (a MutationObserver, 1 s at most; on native `FADE_OUT_MS` + 40).
  Any `{name && (` message, whatever the state is called and whether it
  starts with a Txt, a View or an Animated.View, belongs in a LiveLine
  (Updates 215 to 217 found 55). To find one by look: a short
  conditional block coloured `dangerInk`, `maybeInk` or `goodInk`. Leave
  out facts drawn with the page (prices, legends, a programme's week).

- **LiveLine** (20 Nov). components/ui.tsx: wrap any message that comes
  and goes in `<LiveLine>{problem && (<Txt …/>)}</LiveLine>`. It's an
  always-present `aria-live="polite"` View, absolutely positioned at 0×0
  while empty so it adds no `gap`. A new `{problem && <Txt>}` outside one
  is silent to screen readers.

- **Hooks check** (20 Nov). `pnpm lint` is tsc only, which doesn't catch
  a hook placed after an early return (it showed as the crash screen).
  eslint 9 and eslint-plugin-react-hooks 5 are in node_modules/.pnpm: a
  flat config with `react-hooks/rules-of-hooks` and the
  @typescript-eslint parser, run with `--no-config-lookup` over
  `src/**/*.{ts,tsx}`, is clean. `KEEP_FOCUS_ON_ENTER` (lib/focusNext.ts)
  keeps a one-line field focused after Enter on the web.
  25 Nov: the check found a hook after an early return in app/feed/[id].tsx
  (fixed, Update 280); run it with `--no-inline-config` too. Its
  exhaustive-deps warnings (25) are deliberate.

- **Measure leftovers are icons** (20 Nov). The screen measure's empty-text
  readings are Material Symbols glyphs (private-use code points), all
  aria-hidden inside fully named controls; checked by code point on Friends
  and Home. Words below 4.5:1 would show with their text.
- **RouteFocus** (20 Nov). components/RouteFocus.tsx, in the root
  layout, web only: on each pathname change it says `document.title`
  (less " · GymGO") in a hidden `aria-live="polite"` Text, remembers the
  last focused element of the page left, and refocuses it on returning
  if focus is lost (350 ms after the change, once the page has drawn).

- **Home editing focus** (20 Nov). HomeEditor's EditBar wraps its glass
  in a `role="toolbar"` view that takes focus on mount and, on unmount,
  gives it to `[data-customise-home]` (the button on Home) if focus was
  lost; the − badge calls `focusNextWhenGone`.

- **useFocusOnArrival / FOCUS_FROM_CODE** (20 Nov). lib/focusNext.ts:
  put the hook's ref and `{...FOCUS_FROM_CODE}` on the heading of a
  screen that replaces the one whose button was pressed (Workout done,
  Report a bug's Thanks). The hook must live in the replacing screen's
  own component, so it runs when that screen mounts.
- **focusNextWhenGone** (20 Nov). lib/focusNext.ts: call it with the
  pressed element (the press event's currentTarget on the web) just
  before a button removes itself; it focuses the next tabbable element
  once the removed part has gone, if focus was lost. Used by AdSlot's
  Not now and Saved's Remove.

- **Workout done focus** (18 Nov). train.tsx's summary focuses its
  heading (a tabIndex -1, quiet-focus View) on mount in a browser, since
  the Finish button unmounts with the workout. Scratchpad
  `kbworkout.cjs` logs a workout by keyboard (WIDTH=390 for a phone).

- **Offline checks** (18 Nov). In development the web app reaches the
  server through Metro at `/_gymgo/api/`, so a test that cuts the server
  off must block that path too (scratchpad `offline.cjs` does). Train's
  NoWorkout shows `log.error` with Try again (reloads the log and saved
  workouts).

- **Backdrop** (18 Nov). components/Backdrop.tsx: a tap-to-close area
  that's a responder View on the web (no tabindex; RNW Pressables always
  get one) and a Pressable on phones. Use it for any scrim. GymPal keeps
  the last focused element outside `[aria-modal]` and restores it (or its
  `data-gympal-launcher`) once the Modal has left. Scratchpad `popups.cjs`
  runs open → Tab → Escape for any opener.

- **Tour rebuilt** (24 Nov, Update 265). components/tour/: kit.tsx
  (`Pinned` with `length` and `overlap` screens, `eased`/`smooth`/`rise`
  worklets, `ChapterLight`), Opening.tsx (`Opening`, `Statement`: words
  split on `*` for violet), FindTrain.tsx (`PartWords`, `PartStage`,
  `roomFor`, `FindPart` (perspective rotateX tilt, camera scale with
  transformOrigin at the picked pin), `TrainPart` (useAnimatedReaction →
  CountUp 'tour.lifted', `RestRing` of 24 dots)), CollectMore.tsx
  (`ReelPart` shelf: translateX from progress, rotateY by distance; calm →
  grid; `CollectPart`: `PackCard` back/front with backfaceVisibility and a
  0.5 opacity switch; `Numbers` from EXERCISES, CITY_LIST, COUNTRIES,
  RARITIES; `Finale`). app/welcome.tsx orders the parts (`ORDER`), keeps
  their places for Next, and feeds `chapterRanges` to the strip and the
  light. With calm, Opening returns static styles (its progress 1 would be
  "gone").
- **Import workouts** (28 Nov, Update 302). lib/importLog.ts:
  `parseCsv` (quotes, `;` or `,` by the header line), `readDate` (local
  "2024-01-06 10:31:00", "6 Jan 2024, 10:31", or with a zone),
  `matchExercise` (same words in any order, else at most one extra word,
  else without KIT_WORDS, else ALIASES; ties left alone; unmatched become
  a slug id the server takes and exerciseName reads), `readExport`
  (formats 'columns', 'named', 'gymgo'; GymGO's export only has the
  finish, so its start is an hour earlier) and `newSessions` (by start
  minute, or finish minute for GymGO's own). app/import.tsx uses a DOM
  file input (web only) and api.logTraining one at a time. Registered in
  _layout; route types regenerated. Linked from Progress beside Export.
- **Pace, superset rail, See history** (28 Nov, Update 301).
  workout.ts `paceMetres` (null unless tracksDistance; rower 500, else
  1000); training.ts `bestPace` and `paceLabel` (tested in
  cardioDistance.test.ts), used in the Summary's What you did rows and
  progress/[exercise].tsx's Best pace Fact. train.tsx: `styles.groupRail`
  on ExerciseLog's card when `group`; MenuAction 'history' calls
  `openHowTo` (in onMenuAction's deps).
- **Recent exercises, Save from the finish screen** (28 Nov, Update 300).
  exerciseLibrary.ts `recentExercises` (newest first, once each, not in
  the workout; tested in liveEdits.test.ts); TrainScreen passes `recent`
  to AddExercise, and ExercisePicker shows it as RECENT (only when adding
  with nothing typed) with a shared `pickRow`. Summary's `keep` saves
  friendWorkoutPlan(session with workoutTitle's title, keepOwn) through
  api.saveWorkout, then links to workout-folder; only for sessions with no
  workoutId and a token.
- **Cardio metres, record history, muscles worked** (28 Nov, Update 299).
  workout.ts `tracksDistance` (cardio on rower, treadmill or air bike).
  train.tsx: `distanceToo` adds a METRES input after the stopwatch and
  drops PREVIOUS on those rows; `distanceFor` (last time, else the set
  above; never the plan's seconds) feeds the hint and the tick. Both
  draftToLogged and sessionEdit's checkEdits keep metres beside a time
  when typed (sessionEdit's loggedMeasure calls such sets 'time').
  progress/[exercise].tsx offers both TIMED_METRICS when `both`, and
  lists records.ts `recordHistory` (per exercise, projected to that
  exercise so recordsBroken stays quick). components/MuscleSplit.tsx
  `MuscleBars` on feed/[id].tsx and the finish Summary.
- **Warm-ups for any weight, exercise totals, saved-workout use** (28 Nov, Update 298).
  training.ts `stepWarmUps` and `WARM_UP_STEP`; workout.ts `warmUpKit`
  (barbell, dumbbell, machine from `needs`; STACKS lists the machines).
  train.tsx's addWarmUps picks warmUpSets or stepWarmUps by `warmKit`.
  training.ts `exerciseTotals` feeds progress/[exercise].tsx's Sets and
  Lifted tiles and Sessions' last date; the facts row wraps (flexBasis
  100); Every time rows link to feed/[id]. savedWorkouts.ts `workoutUse`
  and `doneLine` (named so it doesn't read as a React hook)
  on workouts/index.tsx. Tests in lib/warmUps.test.ts and
  savedWorkouts.test.ts.
- **Do it again, Empty workout, History records** (27 Nov, Update 297).
  feed/[id].tsx: `again` (againPlan of your own item, gym kept) and
  `doAgain`; the Save row is `saveRow`, shared with a friend's workout;
  friendWorkoutPlan takes `{ keepOwn }`. progress/index.tsx: `recordCounts`
  from insights' `recordsByWorkout` (only the days shown) into SessionRow's
  `records` (trophy chip), and an Open link to feed/[id]. train.tsx
  NoWorkout's "Empty workout" row starts a session with no items, named by
  again.ts `emptyWorkoutName`; AddExercise takes `startOpen`.
- **Exercise menu, Remove set, rename** (27 Nov, Update 296).
  lib/liveEdits.ts (`canMove`, `moveExercise` with blocks so a group moves
  as one, `removeExercise`, `replaceExercise`, `removeSet`; tested) and
  exerciseLibrary's `replacementsFor`. ChoiceSheet takes `actions` (a
  destructive one in red; with no options it's a menu) and
  `askActionsNatively` for iPhone; askSetKindNatively takes `onRemove`.
  train.tsx: ExerciseLog's ⋯ calls `onMenu`; TrainScreen keeps `menuFor`,
  `replacing` (AddExercise.tsx's `ExercisePicker` in that card's place) and
  `renaming`, reading items through the `itemsNow` ref so the callbacks
  stay stable. New `more` and `pencil` icons.
- **Hold countdown, Update routine** (27 Nov, Update 295). train.tsx's
  `Stopwatch` takes `target` (parseTime of `timedFor(at, 'time')`) and
  `onReached`: it counts down, `cued` ref plays 'timer-count' at 3/2/1 and
  haptic.success + 'timer-go' once at zero, then shows "+m:ss" in goodInk;
  `watchBar` is the progress line. lib/routineUpdate.ts (`routineChange`,
  `routineFromSession`, `changeLine`; tested) pairs logged exercises to the
  first unused plan item with the same id; kept items keep reps/rest/uses,
  sets follow working sets; added ones get reps from the day and 90 s.
  The summary loads the saved workout (session.workoutId, Pro) and adds
  the "Update … to match" row, saved with api.editWorkout. Rows hide their
  chevron while busy or done.
- **Year in review, Duplicate, reorder** (27 Nov, Update 294).
  lib/yearReview.ts (`yearReview`, `yearShareText`; tested; reuses
  monthReport's now-exported `totalsOf` and `muscleSets`; a year is by
  startedAt, as on the calendar) and app/year-review.tsx (?year=), linked
  from calendar.tsx's Year view. POST /api/workouts dedupes on name and
  plan and gym now, so workouts/[id].tsx's Duplicate ("Name (copy)", same
  folder) is kept; workoutFolders.test.ts covers it. session-edit.tsx moves
  exercises with up/down buttons (useAnnouncer says where), clearing
  `typing` and `rating`. feed/[id].tsx keeps `keptId` from saving a
  friend's workout for Add it to a folder. New `copy` icon.
- **Minimal look, sidebar Pro card, Pro reminder** (25 Nov, Updates 292 and 293).
  lib/looks.ts `minimal` (solid, hairline boxShadows, radius 6 to 12),
  `FREE_LOOKS` and `isFreeLook` (re-exported from theme.ts) used in
  _layout's useWantedTheme and appearance.tsx. Sidebar.tsx `plainSide()`
  (Minimal only, Update 293): the card's white with a hairline and no
  shadow, a `color.fill` pill, the current icon in `color.brand`.
  components/SidebarPro.tsx (`sidebarProLine`) is pinned under each
  ScrollView (docked and drawer); it and ProNudge are filled with
  BrandFill (the accent, Rainbow and Camo too), white words, a white
  button in `color.brandFill`. lib/proNudge.ts
  (`nudgeStore` 'gymgo.proNudge.v1', `nudgeDue`, `nudgeWait`; tested) and
  components/ProNudge.tsx, mounted beside GymPal in _layout for signed-in
  accounts: free, plan known, `CAN_BUY_HERE && billing.sale === 'on'`, not
  LIMITED, on '/', no active workout. Locally the server isn't selling Pro
  (no Stripe), so to see both, a test rewrites `available` in /api/billing
  and /api/billing/plans (scratchpad freecheck.mjs); no app bypass.
- **Sign-in upgrade, Up next** (25 Nov, Update 291). sign-in.tsx:
  `AuthField` floats its `label` (Reanimated `lift`, transformOrigin left)
  and shows `placeholder` only once floated; on the web it also floats for
  `:-webkit-autofill` (looked for at 0.2 to 3 s). lib/emailTypos.ts
  `emailSuggestion` (Damerau distance to POPULAR, REAL never corrected;
  tested) under the email. Caps Lock read from document key events while
  the password has focus. `succeeded` shows the tick and holds `done(true)`
  450 ms (0 with Reduce Motion); the signed-in effect waits on it. Test
  scripts find fields by label now ("Email", "Password"), not placeholder.
  welcome-back.tsx `upcoming`: programme first (programmeProgress,
  nextProgrammeDay, dayPlan), else templates' `upNext`; hidden while a
  workout is active. calendar.tsx: today is pickable, DayList offers Start
  workout. workout/[id].tsx keeps `keptId` from saveWorkout for Add to
  folder (cleared when the plan changes).
- **Workout folders, the calendar's year** (25 Nov, Update 290). Server:
  `workouts.folder` (migrate() adds it), `cleanFolder` (1 to 40
  characters, blank is none), GET/POST and the export carry it; PATCH
  /api/workouts/:id with only `folder` skips the Pro check (tidying);
  PATCH /api/workouts/folders { from, to } renames, to null empties it.
  Tests in workoutFolders.test.ts (billing.test.ts is the other session's).
  App: lib/workoutFolders.ts (`groupByFolder`, `folderNames`, `tidyFolder`,
  `moveLine`; tested), app/workout-folder.tsx (`?id=` to move, `?rename=`
  to rename or remove; MODAL in _layout), workouts/index.tsx groups and
  folds, workouts/[id].tsx has Move to folder and reloads on focus. New
  `folder` icon. Calendar: `view` month/year, lib/calendar.ts
  `calendarYear` and `yearsWithTraining`; `MiniMonth` pads to six rows so
  the cards line up.
- **Calendar, a workout's day and start** (24 Nov, Update 275).
  lib/calendar.ts (`dayKey`, `dayFromKey`, `sessionsByDay` by startedAt in
  the device's time, `calendarMonth` Monday first, `calendarMonths` back
  to the first workout with a limit and `more`, `yearSoFar`, `shortDay`,
  `dayWords`; tested). components/MonthGrid.tsx draws a month: `canPick`
  decides which days are buttons, the rest are drawn only. app/calendar.tsx
  (route registered in _layout; Progress and Profile link to it) opens a
  day's workouts at /feed/[id] and a month at /month?m=. session-edit.tsx:
  Draft `day` and `start`; lib/sessionEdit.ts `parseClock`, `clockText`,
  `whenFor` (keeps the original startedAt, seconds and all, when the day
  and time weren't changed; refuses a finish more than 5 min ahead, as the
  server does). The PATCH already accepted startedAt; training.test.ts now
  covers it. train.tsx's summary has Edit workout.
- **Welcome back, smoother tour** (24 Nov, Update 274). app/welcome-back.tsx
  (headerless, fade, no swipe back; in `SIDEBAR_STEPS_ASIDE` and GymPal's
  HIDDEN) reads lib/welcomeBack.ts `recapOf({ name, sessions, weeklyGoal,
  gyms, now })` → greeting, line, week, streak, last, gyms (tested).
  sign-in.tsx `done(fresh)`: a new account → /welcome, a password or
  provider sign-in → /welcome-back with `next` passed on; finishing a social
  profile still goes straight on. Tour: welcome.tsx's `motionY` follows
  `scrollY` through `withSpring` on the web only (all the parts, the light,
  the strip and Aurora read it; Next and the strip's taps read raw
  `scrollY`). kit.tsx `Pinned` fades and scales its hold over 0.6 screens
  after its span (`leave`). The tour, WelcomeSetup, AuthShowcase and
  onboarding.ts's `daysLine` are now in the docs/COPY.md voice, so the
  "other session: please do the welcome tour, sign-in and sign-up" ask in
  the copy claim is done.
- **Tour questions, soft background** (24 Nov, Update 263).
  components/WelcomeSetup.tsx (steps country → goal → days → location
  (only while `prefs.location`) → done; `chooseCountry`, `setPref('goal')`,
  `setPref('weeklyGoal')`, `locate(true)`); app/welcome.tsx's `phase`
  ('story' | 'setup'), Skip and the end's Set up GymGO go to it. New
  `Prefs.goal` (strength | muscle | endurance | null, cleaned on load):
  workout/[id].tsx and programme.tsx start from it (endurance → fitness;
  weeklyGoal → programme days 2 to 4). lib/onboarding.ts (`spreadDays`,
  `daysLine`). components/Aurora.tsx: four RadialGradient pools, drifting
  with Reanimated, optional `scroll`/`span` parallax, calm-aware; behind
  the tour and sign-in (whose form is now a frosted `panel`).
- **Self-updating server** (24 Nov, Update 262). deploy/autoupdate.sh:
  `--install` adds an hourly cron line marked `# gymgo-autoupdate`
  (`--remove` takes it out; other lines kept). A run fetches, exits if
  current, refuses a non-fast-forward, asks
  api.github.com/repos/…/commits/<sha>/check-runs (public, no key) and
  waits on any not completed, skips on any failed, then runs update.sh.
  `GYMGO_DRY_RUN=1` stops before update.sh. Logs to
  ~/gymgo-autoupdate.log. The owner installs it; I can't reach the server.
- **Scroll tour and sign-up page** (24 Nov, Update 261). app/welcome.tsx:
  one Animated.ScrollView; `Hero`, three `Scene`s (`SCENE` = 2.1 screens
  each: a stage `screen` tall that holds while `progress` runs 0 to 1) and
  `Finale`. Holding is `position: sticky` on the web (`STICKY`) and a
  translateY from the scroll handler on phones. Parts' visuals animate from
  `progress` with `eased`/`rise` worklets. `useCalm()` drops the holding and
  shows everything finished. Next scrolls to each part's top + 90% of its
  span; `room` comes from onContentSizeChange as well as onScroll (the first
  Next went nowhere without it). components/SampleCard.tsx (Common, Rare,
  Legendary looks; no gym names) is shared with components/AuthShowcase.tsx
  (the wide sign-in panel, `width >= 960`; `AuthPerks` on a phone).
  lib/passwordStrength.ts feeds `StrengthMeter` in sign-in.tsx.
- **Timed and distance sets** (24 Nov, Update 256). `LoggedSet.seconds` /
  `.metres` (packages/domain/src/lifting.ts) with reps 0; `isDoneSet`
  (workingSets uses it), `isTimedSet`, `secondsLabel`, `distanceLabel`;
  records `longestSeconds`/`furthestMetres`, NewRecord kinds `longest` and
  `furthest` (RECORD_WORD, RANK, insights' RECORD_KIND). The server's
  `cleanTrainingSession` takes whole seconds ≤ 6 h and metres ≤ 100 km,
  and the "at least one set" check uses `isDoneSet`. App: `setMeasure(id,
  planReps)` in lib/workout.ts decides reps/time/distance (TIMED set,
  farmer-carry, cardio, else the plan's "s"/"m"); `DraftSet.time` /
  `.distance`; `parseTime`, `tidyTime`, `parseDistance`, `timedSetLine`,
  `setLine`, `TIMED_METRICS` in lib/training.ts; `draftToLogged` takes a
  `measure` per item; `bestSoFar(..., measure)`. train.tsx: `timedFor`
  (Previous, else the set above, else the plan), the stopwatch (`watch`,
  `Stopwatch`; ticking while it runs uses its time), `liftedSoFar` in the
  header. sessionEdit.ts `EditedExercise.measure`. Head to head has
  optional `longestSeconds`/`furthestMetres`. CSV: `seconds`, `metres`
  last. Older app builds ignore timed sets (their workingSets needs reps),
  and an old build's Edit workout would drop them on save.
- **Weekly chart, save a friend's, share a picture; Home roomy on phones
  only** (24 Nov, Update 255). Home (app/(tabs)/index.tsx) is roomy only
  when `width < 600` (`roomy`): pills, the lifter card, the templates link
  alone, finder tiles and `groupRoomy`. Wider it's as before Update 254
  (shortcut tiles, `workoutWide`). `WeatherCompact` likewise (one line on a
  phone). lib/weekly.ts + components/WeeklyChart.tsx on `/feed?person=<you>`
  (`mine` in feed/index.tsx loads `useTrainingLog`); Profile → Your
  workouts. feed/[id].tsx: Save to my workouts (`friendWorkoutPlan`,
  `api.saveWorkout`, Pro; `pro_required` goes to Pro). app/share-workout.tsx
  (`id` from the log) with components/WorkoutShareCard.tsx; no
  `numberOfLines={1}` on the card's short texts, since the exported picture
  draws text a little wider and cut them off.
- **Roomier Home, Previous, compare** (23 Nov, Update 254). Home
  (app/(tabs)/index.tsx): quick searches as `styles.pills` in a horizontal
  ScrollView, the workout card with an `ExerciseGlyph` (bench-press, moving,
  reps 2) and a white "Start building" pill, the templates link alone
  (`templatesAlone`) unless Up next shares its card, `group` gap 16.
  lib/previous.ts (`previousSet`: same place among warm-ups or working sets,
  converted to the workout's unit) beside each set row in train.tsx (not
  with RPE on); lib/compare.ts (`compareWithLast`: by workoutId or name,
  `signed`) on the summary, worked out in `finish()` before the log takes
  the new workout in.
- **Gym tags, profiles, muscle split** (23 Nov, Update 253).
  `training_sessions.gym_name` is set by the server from its own gym
  record (`gymRecord`) on POST, and on PATCH `{ gymId }` (null clears; an
  unknown id is a 400), never from client text. The feed shows `gym` only
  when `gym_name` is set (older workouts have none). `GET
  /api/feed?person=` is one friend's (sharing) or your own (hidden ones
  too), with `person.workouts`. App: app/gym-tag.tsx (`session=active` or
  a logged id), the chip in train.tsx, a Gym row in session-edit.tsx,
  `muscleSplit` (lib/feed.ts) on feed/[id], the friend page's workouts
  (friends/[id].tsx), feed/index.tsx `?person=&name=`. PrimaryButton's
  quiet and danger tones are now 44 tall (`styles.secondary` in ui.tsx).
- **The friends' feed** (23 Nov, Update 252). docs/FEED.md. Server
  feed.ts (`Feed`): `users.share_workouts` (opt-in), `training_sessions.hidden`
  and `.records_json` (records cached, invalidated by `forgetRecordsFrom` on
  log, edit and delete), tables `feed_likes`, `feed_comments`, `feed_reports`
  (in db.ts SCHEMA, cascading). Visibility is one rule (`visible()`): yours, or
  an accepted friend's that they share and haven't hidden; everything else
  404s. Unfriending calls `feed.forgetBetween`. Reports go through
  `bugReports.create`. Head to head is Pro (`billing.isPro`) and uses only the
  friend's non-hidden workouts. The records code moved to
  packages/domain/src/lifting.ts; apps/mobile/src/lib/training.ts re-exports
  it, so app imports didn't change. App: app/feed/index.tsx, app/feed/[id].tsx,
  components/FeedCard.tsx (memoised: calls useGlassRedraw, which a test
  checks), components/HeadToHead.tsx, lib/feed.ts; ProReason `headToHead`.
  legal.ts doesn't mention workout sharing yet (owner's wording).
- **Apple Pay's and Google Pay's own buttons** (23 Nov, Update 251).
  Web only. `deviceWallet` (domain plans.ts) picks Apple Pay for
  iPhone/iPad/Mac (userAgentData.platform, else navigator.platform, else
  UA) and Google Pay for the rest; `walletButtonFor` shows it only if the
  server's `wallets` (plans response, from `Billing.wallets()`: needs
  `STRIPE_PUBLISHABLE_KEY` and the wallet on in Stripe's settings) has it.
  components/WalletButton.tsx mounts Stripe's Express Checkout Element
  (Checkout Sessions `ui_mode: 'elements'`, `POST /api/billing/wallet` →
  `clientSecret`, Stripe.js `initCheckoutElementsSdk` from
  js.stripe.com/dahlia, matching the server library's API version; bump
  both together). Hidden (absolute, transparent, no pointer events) until
  `ready` reports the wallet available. The wallet checkout passes the
  account's existing Stripe customer or none (linked by
  client_reference_id on completion, as any checkout). legal.ts doesn't
  yet mention Stripe.js on the Pro page or Google Pay's button: owner's
  wording (docs/PAYMENTS.md) before live payments.
- **Apple Pay, Google Pay, PayPal** (22 Nov, Update 249). docs/PAYMENTS.md
  is the owner's set-up. billing.ts `payWith()` reads Stripe's payment
  method configuration (`paymentMethodConfigurations`: each method's
  `available`), cached ten minutes, and `paymentMethodSetting()` passes
  `STRIPE_PAYMENT_METHOD_CONFIGURATION` to checkouts. paypal.ts is PayPal
  through GymGO's own account: `createPayPal` (REST over fetch),
  `PayPalPro` (plans found by product `GYMGO-PRO` and description
  `gymgo:<lookup key>[:trial]`, prices read back; checkout records nothing
  until confirm; `readStatus` maps to Stripe's statuses; rows in
  `subscriptions` as `paypal:I-…`). Anything that calls Stripe with a
  subscription id must skip `paypal:` rows (cancelAllFor does). The app:
  `stripePageNames`/`orList` for the line under Subscribe; `payWith.paypal
  === 'direct'` shows PayPalButton (PayPal's wordmark paths from its
  published button SVG, its #60CDFF blue, white in dark mode, per PayPal's
  August 2026 colours); `manageSubscription` opens PayPal's
  autopay page for `provider: 'paypal'`. legal.ts still names only Stripe:
  PayPal must be added there (owner's wording) before it takes real money.
- **Picking a gym on the map, kept light** (22 Nov, Update 248). The
  click's frame used to redraw the whole app. `addRecent` (app-state.tsx)
  now runs in `startTransition` and does nothing for the gym already first.
  `ResultsContent` is `memo`: keep every prop Explore hands it stable
  (`useCallback`/`useMemo`; `locked` is memoised, `focusSearch` and
  `seeWorldwide` are callbacks); it calls `useGlassRedraw()` itself, since
  Explore's redraws no longer reach it. `PlaceCard staged` (Explore only)
  mounts its folded detail a frame later in a transition; the gym page leaves
  it off, because PageScroll restores the scroll on the first content size.
  To measure, a fake `__REACT_DEVTOOLS_GLOBAL_HOOK__` in a Playwright init
  script can count the components each commit renders (count a fiber only
  when it isn't the same object as in the last commit: skipped subtrees keep
  their old flags).
- **Desktop side panels and focus** (18 Nov). explore.tsx: one effect on
  `[wide, panel, selectedId]` records the opener (the focused element,
  unless it's inside the panel), focuses `sidePanel` (tabIndex -1, quiet
  focus, wrapping both the card and Filters) and restores the opener when
  `panel` becomes null.
  Scratchpad `sheetkeys.cjs` checks both widths.

- **Focus rings** (18 Nov). The app's ring is an `::after` on
  `:focus-visible` (app/_layout.tsx), not an outline; scratchpad
  `focussweep.cjs` tabs through pages and checks for it. Something with
  its own ring takes `dataSet={{ quietFocus: '' }}` and should test
  `matches(':focus-visible')` on focus, so taps don't ring it.

- **accessibilityState is ignored on the web** (18 Nov). This RNW
  version never reads `accessibilityState`; use the aria props
  (`aria-selected`, `aria-checked`, `aria-disabled`, `aria-expanded`,
  `aria-busy`), which phones read too. The welcome tour's pager is a
  focusable `role="region"` with arrow-key paging. Scratchpad
  `firstrun.cjs` makes a new local account through the form.

- **Placeholders** (18 Nov). A placeholder that's a field's only visible
  label uses `labelSecondaryOnFill`; example numbers and last-time hints
  keep `labelTertiary`. Scratchpad `placeholders.cjs` reads each field's
  `::placeholder` colour against its backgrounds; the scripts take
  `GYMGO_TOKEN=none` for signed-out pages.

- **Status inks on the tint** (18 Nov). Orange (`maybeInk`) on
  `brandTint` is 4.0–4.2:1 in light; JoinGym's "… only" line uses `label`.
- **labelSecondaryOnTint** (18 Nov). Grey words on `brandTint` use
  `color.labelSecondaryOnTint` (theme.ts inksOnWashes, tested in
  theme.test.ts beside brandOnTint and labelSecondaryOnFill). On a
  conditional tint, pick it with the same condition. Scratchpad
  `in-tint.py` (run from apps/mobile) lists grey or accent words inside
  tinted styles.

- **Pro-country card on Explore** (18 Nov). ResultsContent's `lock` is
  now `cardGlass` + `shadow.card`, inset by `space[4]` like the list,
  with the accent on `lockBadge`. A quiet button (brandTint) on a
  brandTint card stacks two washes, which `brandOnTint` isn't worked out
  for; keep tinted buttons on cards. Scratchpad `abroadflow.cjs` types
  Paris as a free account; the measure takes `FILL` + `PRESS=Enter`.

- **Space presses checkboxes on the web** (18 Nov). RNW's PressResponder
  takes Space only for role="button"; lib/spaceKey.ts (installed once from
  the root layout, web only) clicks a focused checkbox, radio, switch,
  tab, option or menu item on Space. Native inputs, buttons and typing
  places are left alone; links only when role="tab". Scratchpad
  `compareflow.cjs` runs the free compare limit by keyboard.

- **Names: first OSM value** (18 Nov). `nameOf()` in
  packages/osm/src/fields.ts splits on OSM's ";" (keeping ";;" as a
  literal) and `candidate()` uses it. eu-data's "110% Studio;" was fixed
  by hand to match what the generator now gives; the au and usa
  generators read names themselves and had none with ";".

- **Saved looks saved off iPhone** (18 Nov). expo-symbols draws Material
  Symbols' outline-only font on Android and the web, so a pair that
  differs only by fill (`bookmark` / `bookmark_border`) looks the same.
  Icon.tsx draws `save`/`saved` with PIcon's `bookmark-simple` (regular /
  fill) away from iOS (`FILLED_PAIRS`); add a pair there if another
  on/off icon differs only by fill. Scratchpad `saveflow.cjs` runs the
  free account's saving limit.

- **Free account sweep, faint-grey words, Liquid's shine** (18 Nov).
  `labelTertiary` is for chevrons, placeholders and separators only;
  words use `labelSecondary` (search `[?:] color.labelTertiary` too, not
  just `color={color.labelTertiary}`). Accent words on `brandTint` use
  `brandOnTint`, conditional colours included. BrandFill's Liquid shine is
  `Shine`: stops worked out from its own height (min of 18%/7 pt and
  40%/16 pt) because phones' gradients don't read CSS `min()`. For a free
  account's view, sign up a throwaway one on the local server
  (`POST /api/auth/signup` with `acceptTerms: true`). The measure takes
  `FILL='[["Weight in kg","100"],["Reps","5"]]'`.

- **The ads round through the screen checks** (18 Nov). After the merge,
  run `pnpm install --frozen-lockfile` (react-native-google-mobile-ads is
  new; without it Metro fails on the config plugin and every page looks
  broken). The Pro card only shows to free accounts when Pro is on sale;
  the scratchpad's `contrast-measure.cjs` and `axe-looks.cjs` take
  `SALE=1` (stubs `/api/billing` to say on sale, in the test only) and
  `GYMGO_TOKEN` (a local free account); `FOCUS="From GymGO"` scrolls the
  card into view. Its × is now `labelSecondary`, like the other close
  buttons.

- **Review form at the largest text** (18 Nov). ReviewsSection's
  `detailRow` wraps, and `detailLabel` has `minWidth: '45%'` so all four
  rows wrap together. Usage scripts in the scratchpad: `writeflow.cjs`
  (a gym's page), `sheetflow.cjs` (Explore's sheet), `signinflow.cjs`.

- **Dim checked; GymPal's guide on reviews** (18 Nov). The contrast scripts
  have Dim variants (`scratchpad/dim-contrast-*.cjs`, theme `dark: 'dim'`).
  Update gymPalGuide.ts whenever a screen GymPal explains changes. Its test
  pins that reviews elsewhere are linked, not copied.

- **Review ratings in the export and the queue** (18 Nov). `/api/me/export`
  names its review columns, so add any new review column there too.
  AccountContent's review queue shows `aspectsLine()`. A "★" character in
  text needs words for screen readers: `Fold`'s `spokenSummary`, an
  `aria-hidden` star inside a `Txt`, or a View with role image and a label.

- **Largest text on a small phone** (18 Nov). ui.tsx `Segmented` measures
  its longest bold label (`labelWidth`: canvas in a browser, about 0.6 of the
  size per letter elsewhere). If that won't fit `slot`, it renders wrapped
  rows without the sliding pill. ios.tsx `Row`'s text keeps `minWidth: '45%'`.
  `scratchpad/bigtext.cjs` checks clipped and spilling text at
  `textSize: 'larger'` with bold on.

- **Reviews redesigned** (18 Nov). ReviewsSection.tsx: Summary (with
  `starCounts` from the domain), ReviewCard, ReviewForm (StarPicker), and
  Elsewhere (`googleMapsSearchUrl` / `appleMapsSearchUrl` in present.ts).
  Stars are a solid Phosphor path drawn with Svg, because the web icon
  font's star is an outline.
  - Reviews now store `equipment`, `cleanliness`, `atmosphere` and `value`
    (nullable 1-5, migrated in db.ts).
  - Never copy third-party reviews. Google's live, keyed Places details on
    the "See it on Google" page are the only external reviews shown.
  - Local test reviews go on demo gyms only (e.g. keystone-fitness-ultimo,
    with demo mode on).

- **Opened states; Txt's aria props** (18 Nov). `Txt` declares and passes
  `aria-hidden` and `aria-live`. TypeScript doesn't check hyphenated JSX
  attributes, so add any other aria prop to Txt's list before using it.
  Other rules from this round:
  - `brandOnTint` is the accent on any wash (tint, grey fill, glass). Its
    grounds now include `cardRaised`, `stackedGlass()` and `sheetCard()`.
  - Standard's `brand` is readable on `sheetCard()`.
  - Table headings are `labelSecondary`, never `labelTertiary`.
  - A live region stays mounted (RecoveryMap's `none` style) rather than
    appearing already full.

  `scratchpad/contrast-states.cjs` measures the four opened states.

- **Thousands comma; the sidebar's tint** (18 Nov). training.ts has
  `decimalPoint()`: a comma before groups of three digits is a thousands
  separator, any other comma is decimal. Use it for any new number box.
  `inksOnWashes` also checks over the three glass layers (over the page,
  plus `sheenLift`). The sidebar's chosen item, Programme's `goalOn` and
  Appearance's `sampleOn` text use `brandOnTint`.
  `scratchpad/contrast-sidebar.cjs` runs the screen measure with
  `layout: 'sidebar'`.

- **Contrast on the glass looks** (18 Nov). The audit lives in the scratchpad
  (`contrast-measure.cjs`). It hides axe's "needs review" text, screenshots
  what's behind it, and samples a grid per text box. Rules from it:
  - A surface filled with the accent spreads `shadowUnder(shadow.plate)`,
    never `shadow.plate`: on Liquid that paints a clear card's face.
  - Text on `brandTint` uses `brandOnTint`, and grey on `fill` uses
    `labelSecondaryOnFill`. Both are checked over a glass card on Standard's
    glow (`inksOnWashes`).
  - In Standard, `labelSecondary` is readable over the strongest single glow;
    `brand` and `labelTertiary` are left as they are.
  - `labelTertiary` is not for words people need to read.

- **Shorts** (18 Nov). `.claude/skills/` holds iart-ai's five video skills (MIT,
  NOTICE.md). `marketing/shorts/` is a Remotion project, outside the pnpm
  workspace with its own package-lock, for three 9:16 shorts (WalkIn, Build,
  OnePlace). How it works:
  - `capture.cjs` screenshots the full app at 390x844 @3x from a signed-in
    local session (GYMGO_TOKEN, never written to disk), and it logs a workout.
  - `src/script.ts` holds scenes, captions, camera and callouts as data.
  - `render.mjs` renders stills and a contact sheet, then the MP4, then
    probes it.

  Rules: the camera scales the whole phone, never the picture inside it.
  Callouts are crops of the same screenshot. The footage is only the full app;
  gymgo.site is only advertised. No chain logos and no "Good to go". `out/`
  and `public/shots/` are ignored; only the source is committed.

- **Sign-in announcements** (18 Nov). sign-in.tsx: AuthField's problem line
  is a polite live region and sets `aria-invalid`; the under-13 panel is
  assertive; the terms checkbox (and reminders.tsx's day checkboxes) set
  `aria-checked` as well as `accessibilityState`. Give new checkboxes
  `aria-checked`: the web reads nothing from `accessibilityState` alone.
- **GymPal: GitHub Models taken out again** (18 Nov). See "No GitHub
  Models" under Working rules. What stays from that work: GET /api/gympal
  returns `service` (GymPal.tsx's note names it), `answeredBy`, and
  `src/gymPalCheck.ts` (`pnpm --filter @gymgo/server gympal:check`, one
  question with the server's settings). config.ts
  `LEFTOVER_GITHUB_MODELS_TOKEN` only drives the "does nothing" notice.
- **Icons on hover** (21 Nov). lib/iconHover.ts: Icon.tsx (a `dataSet`) and
  PIcon.tsx (a `data-gg-icon` prop, which react-native-svg passes to the
  `<svg>`) tag each icon with `iconMotion(name)`; give a new icon name a
  motion in `MOTIONS` if lift doesn't suit it. `installIconHover` (root
  layout, web only) listens for `pointerover` on the page and sets
  `data-gg-hover` on the icons of the nearest control (`CONTROL` roles);
  `movingIcons` decides which (arrows only on a tall card, none past
  `MOST`). The CSS uses the `translate`/`rotate`/`scale` properties, so it
  adds to `useSwapIn`'s transform instead of replacing it. The tab bar's and
  sidebar's outlines (`ART_NAMES`) are drawn in parts on the web by
  components/iconArt.tsx (PIcon swaps to it for regular/bold weights; the
  filled, selected one stays a single path) with `data-part` names, and each
  has a scene in `ART_CSS` (lengths on the 256 grid, `transform-box:
  view-box`; lines drawn with `pathLength` 100 and `gg-art-draw`). A new
  drawing needs its name in `ART_NAMES`, its parts in `ART` and its scene
  in `ART_CSS`; TypeScript asks for all three.
- **Hover on Home** (18 Nov). components/hoverShine.web.ts: `useHoverShine`
  on a zone (Home's page) finds the card under a mouse (nearest pressable
  with a background, gradient or box shadow; `wrapped` looks through bare
  link wrappers, as GymCard has; or a surfaced parent up to two steps out),
  marks it `data-shine`/`data-shining` and sets `--gg-mx/my/dx/dy`; CSS in
  the same file does the drift (`translate`) and, under
  `html[data-gg-glass]` (synced from `solidSurfaces()`), the light and rim.
  To add it to another page, give its root a ref and call the hook.
- **Ads with test ads** (18 Nov; native since Update 191). docs/ADS.md is
  the plan and the owner's steps. lib/ads.ts picks the unit: Google's native
  test units in `__DEV__`, always; the owner's `OWNER_AD_UNITS` in a release
  only when `ADS_LIVE` is true (it's false until the legal pages say there
  are ads and the owner says go). components/AdCard.native.tsx loads
  Google's library only outside Expo Go (`require` inside `library()`), runs
  consent then `initialize`, loads a `NativeAd` per card and draws it in
  GymGO's card (every shown asset wrapped in `NativeAsset`, the media in
  `NativeMediaView`, an "Ad" badge, the top-right corner kept clear for
  AdChoices); AdCard.tsx is the website's stub with the same exports.
  AdSlot shows an ad where `adsPossible`, else the Pro card. The owner's
  AdMob IDs are public and belong in the code; never let a development
  build ask for them (invalid traffic). apps/mobile/public/app-ads.txt is
  AdMob's line for the website's root (Update 192); keep it as AdMob gives
  it, and add a line for any other ad network. The legal text still says no ads:
  it must change before any store release, since the library is in every
  phone build.
- **Frosted glass, Liquid look, sidebar seam** (18 Nov). With the sidebar
  docked, `ClearOfSidebar` (Sidebar.tsx) draws the page's ground
  (`ambientGlow()` over `groupedBackground`) the window's width and provides
  `PageGround` (components/pageGround.ts); TabScreen and PageScroll then draw
  none of their own (PageScroll drops a `groupedBackground` page colour, keeps
  any other). A new page that paints its own ground should do the same.
  theme.ts: `WASH_BALANCED` has blur and wash (Android) sets; `shadow.rim` is
  the glass edge for small surfaces (empty in solid looks and at 0%): spread
  it on new chips, fields and segmented controls. `glassCards` looks get
  `liquidFace` added to `shadow.plate` (a sheen, and on the web a
  backdropFilter), and `sheenLift` is counted in the plate and text checks.
  A look's `backdrop` now takes the accent's brand (Liquid's pools follow it).
- **Frost look** (17 Nov). lib/looks.ts: a look can now have a
  `backdrop(scheme)` (`{ image, tones }`: CSS gradients for the page, and
  every colour they reach, made together in `frostBackdrop` so text is
  checked against what's drawn), `plates` (how solid its cards on the page
  are at the default and 100% Liquid Glass) and `wash` (the floating
  glass's tint). theme.ts `paletteFor` reads text over the tones, then
  `clearestReadable` raises the plate's alpha until every PLATE_INK passes
  over each tone; `ambientGlow()` returns the backdrop for such a look
  (TabScreen and PageScroll draw it), and ios.tsx skips the hero glow there.
  A page that draws neither shows the look's `groupedBackground`.
- **Motion timing and forgiving boxes** (17 Nov). UI motion stays under
  about 300ms: motion.tsx springs (SLIDE, SETTLE, GLIDE) and timings were
  tightened, Redrawn's TAB is a 160ms fade (tabs are the most frequent
  move) and PAGE 280ms; Sidebar's SETTLED_MS is 360 to match SLIDE. PIcon
  no longer blurs in (it's the tab bar's and sidebar's). Typed numbers:
  lib/training.ts `tidyWeight(text, unit)` (unit words, commas, a trailing
  point; the other unit converted to a tenth) and `tidyReps`; the boxes
  tidy on blur, and train.tsx's tick reads through them too.
  bodyMeasures.ts `keptValue` takes cm/in/%/" and converts lengths.
- **Design tips from a reel** (17 Nov). theme.ts `concentric(outer, gap)`
  for a box inside a rounded box; lib/looks.ts has OKLCH (`hexToOklch`,
  `oklchToHex` with chroma brought down to fit sRGB, `mixOklch`,
  `oklchStops`), used by `customAccent` (hue from the colour wheel, made at
  L 0.6 / C 0.17, dark L 0.76 / C 0.15, then `readable`) and BrandFill's
  Rainbow. scripts/phosphor-icons.mjs now copies each outline icon's bold
  cut; PIcon draws it when `boldText()`. components/edgeFade(.web).ts marks
  a horizontal ScrollView for a CSS mask (web only). motion.tsx
  `useSwapIn(key)` returns a ref: the view blurs in (WAAPI, web only) when
  the key changes; Icon and PIcon use it. BrandLogo's images have
  `mixBlendMode: 'multiply'` onto their plate.
- **Appearance tiles** (17 Nov). Every choice on appearance.tsx is now a
  tile: the clock (`CLOCKS`, times written as lib/copy.ts timeLabel writes
  them; change both if the format changes), GymPal's button and side
  (`GymPalPreview` draws the edge tab, the corner mark and the hidden strip
  on a `PREVIEW` screen) and the text size ("Aa" at each `TEXT_SIZES`
  scale, `maxFontSizeMultiplier={1}`). `Segmented` is no longer used there.
- **Appearance additions** (17 Nov). themePrefs.ts has `foldOnMap`
  (default true), `mapStyle` (lib/mapStyles.ts) and `reduceMotion`. Folding:
  `foldedOn`/`sidebarInset` take `folds`; SidebarFrame and GymPal pass
  `foldOnMap`, and `useSidebarOpening()` is null unless the sidebar folds on
  this page (else Explore's panels doubled their shift). Map style: the
  style in use is `mapStyleFor(choice, isPro || !planKnown)` (as the looks),
  passed from Explore as GymMap's `mapStyle`; the web map `setStyle`s in
  place, Android's page is rebuilt with `mapPageHtml({ style })`, iPhone
  sets `mapType`/`userInterfaceStyle` (`appleDark`). Reduce motion: the
  root renders Reanimated's `ReducedMotionConfig` (Always) only while it's
  on; components use motion.tsx `useCalm()` instead of `useReducedMotion()`;
  code outside React reads `motionReducedHere()`; CSS can key off
  `html[data-gg-calm]`. Android's map page (a WebView) still reads only the
  system setting. To test the free view with the dev account, rewrite
  `/api/billing`'s plan in Playwright (`context.route`) and set
  `gymgo.plan.v1` to free.
- **Map clicks, and curves in the browser** (17 Nov). Never give an
  `Animated.View` `pointerEvents: 'box-none'` (or 'none') through its
  *style* on the web: Reanimated drops it, and the view takes every click
  (Update 164's full-window layer blocked the map). Use the
  `pointerEvents` prop, or keep pass-through containers plain Views and
  animate only what's visible. In a browser Reanimated hands an entering,
  exiting or layout animation to CSS, which takes only `Easing.bezier`
  (anything else ran linear, and springs on layout transitions are
  ignored): use motion.tsx's `ARRIVE_CURVE`, `LEAVE_CURVE`, `MOVE_CURVE`
  for those, never a bare `FadeIn.duration()`. `withTiming` runs in JS and
  takes the clamped curves as before. The shared Pressable now animates
  hover (`over`) as well as press, and replaces "transparent" with
  `clearOf(colour)` (lib/looks.ts) so a fade doesn't dim through black.
- **Sidebar unfolds beside the map** (17 Nov). Sidebar.tsx: SidebarFrame
  holds `opening` (a shared value, 1 open, 0 the capsule) springing on
  `SLIDE` (motion.tsx) whenever `open` changes, and provides it as
  `useSidebarOpening()`; whether the map's sidebar is unfolded is a small
  external store (`useSidebarUnfolded()`, reset on every navigation) so
  GymPal, outside the frame, can read it. `DockedSidebar` is now the one
  pane for every page: its frame's width, height and radius interpolate
  `opening`; the menu sits at full size (`styles.menu`, absolute) inside a
  clip and fades in past 45%; the capsule's arrow fades out by 30%. The
  browser's rim bend (`panelRefraction`) is applied only at rest open (it's
  drawn per size). Focus hand-off uses `focus({ preventScroll: true })`:
  without it the browser scrolls the narrow clip sideways. explore.tsx
  wraps both DesktopPanels in a layer translated by `opening * FOLD_SHIFT`
  and gives the area row and time-zone banner an animated marginLeft; the
  map's leftInset adds FOLD_SHIFT when unfolded. SidebarList's pill is one
  absolutely placed view gliding to the measured row. To film an animation
  headless, slow the page's clock: wrap `performance.now` and
  `requestAnimationFrame` in an init script (see Update 164).
- **Sidebar folds away on the map** (14 Nov). lib/navLayout.ts
  `SIDEBAR_FOLDS_AWAY` ('/explore'), `foldedOn()` and `sidebarInset()`
  (SIDEBAR_WIDTH, SIDEBAR_FOLDED 60 or 0); SidebarFrame provides that as
  `useSidebarInset()` and GymPal's left offset uses it. Sidebar.tsx
  `FoldedSidebar`: the capsule (FOLD_WIDTH 44 × FOLD_HEIGHT 72, Glass
  control) with local `open` state, opening `SidebarDrawer folding` (the
  phone drawer at the docked pane's width, transparent backdrop, chevron
  instead of the close cross). Navigating away unmounts it; arriving on
  Explore starts folded. To fold on another page, add its path to the set.
- **Explore's panel keeps its search pinned** (14 Nov). In ResultsContent.tsx
  the pieces are consts (`search`, `recent`, `suggestionList`, `chips`,
  `body`). With `inSheet` false (only the wide panel) it returns `pane`: a
  head (search, then recent/suggestions in a `paneSuggestions` ScrollView
  that shrinks first, then chips at `chipsRow`'s full height) over a
  `paneBody` ScrollView with `scrolled` drawing the head's hairline. The
  phone sheet's layout is unchanged. explore.tsx no longer wraps
  `results(false)` in a ScrollView.
- **Even spacing beside the sidebar** (14 Nov). Sidebar.tsx `EDGE` is 16,
  matching explore.tsx `PANEL_GAP`; the pane ends at SIDEBAR_WIDTH (no right
  padding), so Explore's first panel at `start + PANEL_GAP` sits one gap
  past it. Pane radius is `radius.xl + 4`, the panels'. In explore.tsx's
  wide layout, `foot` is the panels' and map's bottom (the gap plus the
  safe area when docked, the tab bar's clearance otherwise), and
  `besideResults` (room for two panels and `MIN_MAP` 360 pt of map) decides
  whether a card or Filters goes beside the results or over them; the
  results panel stays mounted with `hidden`, so its scroll position
  survives. This applies without the sidebar too (two panels from 1188 pt).
- **Sidebar hovers over the page** (14 Nov). components/Sidebar.tsx
  `SidebarFrame` (around the Stack in app/_layout.tsx) draws pages full
  width and `DockedSidebar` absolutely over their left edge (`CHILD_TOUCH`,
  so the margins pass taps through). It gives the pages a safe area moved
  in by SIDEBAR_WIDTH (so the page header's back button and centred title
  shift) and `useSidebarInset()`. `ClearOfSidebar` pads each page's content:
  the root Stack's screenLayout wraps every screen, the tabs layout every
  tab but Explore, which adds `start` to its panels, its map's leftInset,
  the area row and the time-zone warning. A new full-bleed screen should
  either sit in ClearOfSidebar (automatic) or read useSidebarInset itself.
- **Sidebar in Liquid Glass** (12 Nov). components/Sidebar.tsx `Pane`:
  web is `panelRefraction(w, h)` (liquidGlass.web.ts: `data-glass="panel"`,
  a bend only in an 18 pt band along the rim, sized in 8 pt steps) with the
  tab bar's `glassWashThin` wash and `glassMark('panel-shine')`; phones use
  `Glass kind="control"`; `solidSurfaces()` gets the look's plate. The
  selected row is `glassMark('pill')` on `brandTint`. Every row's icon is
  Phosphor (scripts/phosphor-icons.mjs: barbell, chart-line-up,
  clipboard-text, calendar-dots, cards, users-three, palette, regular and
  fill). The docked sidebar is now rendered by app/_layout.tsx's
  ThemedStack beside the Stack (`dockedBeside(mode, pathname, signedIn)`
  in lib/navLayout.ts: not on /welcome or signed out), not by the tabs
  layout, so it stays beside pushed pages; GymPal's left offset uses the
  same rule. Headless Chromium here doesn't blur the app's page under any
  of its glass (the tab bar's either), though it blurs a plain test page.
- **Moderation loading rows** (11 Nov). AccountContent.tsx (reviews,
  photos, member reports) and Moderation.tsx (owners' updates, gym
  claims) render `LinesSkeleton` while their list is null and there's
  no error.
- **Server errors passed on** (11 Nov). lib/apiErrors.ts
  `failureText(error, unreached)`: an ApiError's own message, else the
  "couldn't reach" line. Used by workouts/index.tsx, workouts/[id].tsx and
  workout-edit.tsx, which called every failure unreachable. Use it for
  new `.catch` handlers. App 578 tests (total 1,237). The same fix by
  hand in account.tsx (Download my data) and CollectionData.tsx (delete).
- **Checks, no code** (10 Nov). scripts/pages-build.sh run locally
  (SERVER_URL a local server) and opened with the server off (limited)
  and on (full): both fine. Real gym ids for browser checks:
  `anytime-fitness-collingwood`, `101fitness-melbourne`,
  `dohertys-gym-brunswick` (`melbourne-1` is not a gym). Measured and
  declined: lazy-loading usa-data and eu-data saves about 100 KB sent of
  2.2 MB; lib/query.ts `BUNDLED_GYMS` is read synchronously everywhere.
- **Sheets take focus on the web** (10 Nov). SheetBackground.tsx
  `SheetClip takesFocus` wraps its children in `FocusedWhileOpen` (web
  only): focuses itself on mount, restores the opener on unmount, marks
  itself `data-quiet-focus` from code (React Native for Web drops the
  prop), which app/_layout.tsx's focus-ring CSS leaves out. Used by
  Explore's gym and Filters sheets.
- **axe on opened states** (10 Nov). lib/dialogName.ts `useDialogName(name)`
  gives a React Native Modal its name in a browser (GymPal, ChoiceSheet,
  CardReveal, HomeEditor's gallery, GoogleModal): use it on any new Modal.
  GymPal's starters and JoinGym's MembershipBanner are `role="group"`.
  theme.ts: `color.labelSecondaryOnFill` for secondary text on `color.fill`
  (HomeEditor gallery, HomeWidgets stat captions, NoPhoto initials);
  looks.ts `over(ground, wash)`. App 577 tests (total 1,236).
- **axe audit** (10 Nov). explore.tsx: the three sheets get
  `accessible={false}` with role and label null, and `WebSheetHandle` on
  the web; app/_layout.tsx: `role="main"` on the root in a browser;
  theme.ts: `color.brandOnTint` and `tintOver()` (quiet PrimaryButton uses
  it, theme.test checks it); friends/index.tsx and challenges.tsx share
  pills are white with `brandFill` words; ui.tsx NoPhoto initials a step
  darker; collection.tsx BadgeShelf focusable on the web. Use
  `brandOnTint`, not `brand`, for new text on `brandTint` over the page.
- **Screens fetched ahead on the web** (10 Nov). `useScreensFetchedAhead()`
  in app/(tabs)/_layout.tsx imports Explore, Saved, Profile, gym/[id] and
  train when idle (web only; `mayPrefetch` in lib/prefetch.ts skips
  save-data and 2G). The same chunks the router asks for, so nothing is
  fetched twice. App 576 tests (total 1,235).
- **Fonts start early on the web** (10 Nov). apps/mobile/index.ts calls
  `startFonts()` (lib/earlyFonts.web.ts; a no-op in lib/earlyFonts.ts for
  phones) before anything else: Inter where `NEEDS_BUNDLED_FACES`, and the
  icon font under expo-symbols' own name. `SF_DRAWS` moved to
  lib/typeface.ts so the entry point imports nothing that reads
  lib/limited.ts. Don't add a `<link rel=preload>` for fonts: measured, no gain.
- **Website first visit** (10 Nov). public/index.html has a loading screen
  (`#boot`, picture public/icons/splash.png from scripts/site-images.mjs;
  `data-boot` from the saved appearance); `dropBootScreen()` in
  app/_layout.tsx removes it once the app has drawn words.
  apps/server/src/web.ts compresses text and TTF/OTF (`pickEncoding`,
  Brotli 9 or gzip, kept per file). pages-build.sh's path rewrite now
  covers `src=`. Server 299 tests (total 1,233).
- **School report rewrite** (10 Nov). docs/school: report and README cut
  down and plainer; team Ashen, Liam; the Gantt is out of the report but
  GymGO-Gantt.xlsx/.png stay (owners Ashen, Liam, Both). The scratchpad
  build scripts aren't in the repo; pandoc builds the .docx from the .md.
- **Body-weight exercises** (10 Nov). progress/[exercise].tsx: Most reps
  tile instead of empty Heaviest/1-rep max, chart opens on Reps; new
  lib/chartScale.ts (whole-number bands) used by ProgressChart; Compare
  distance "Unknown". App 574 (total 1,229; school docs updated).
- **Pro's table** (10 Nov). pro.tsx table headings in sentence case (`label`
  variant, no `toUpperCase`); packages/domain plans.ts `PRO_FEATURES` lost its
  unused `emoji` field and says "Not included" for Free instead of "—".
- **"Check you’re online"** (10 Nov). serverAddress.ts `serverIsHosted`,
  api.ts `serverHosted()`, copy.ts `serverOfflineLine(platform, hosted)`;
  sign-in, Account, AccountContent and Pro use it. 2 new serverAddress
  tests (app 571, total 1,226; school report and README updated).
- **Server pages** (10 Nov). legalPages.ts: the Legal list has no second row
  of links (`shell(…, 'index')`); the reset form's rule sits above the button
  with `aria-describedby`; `h1 + section` spacing. legal.test checks each
  document is linked once on /legal.
- **"you can’t use"** (10 Nov). present.ts `priceLine`'s ineligible caption
  and `priceText`'s spoken form; 3 new present tests (app 569).
- **Ask for the total** (10 Nov). present.ts `priceLine`'s unknown-fee
  caption is "for the total" and `priceText` "Ask for the total: some fees
  aren’t published" (test updated); PlaceCard's Prices summary matches.
- **By design, not a bug: 404s for gym photos and icons** (10 Nov). A gym
  with no website photo or icon answers 404 (cached a day by the browser,
  `public, max-age=86400`; an unknown id `no-store`; siteicons.test.ts),
  and the app shows "No photo supplied" or the initials. In a local run
  with `GYMGO_SITE_ICONS=off` every icon is a 404, so the browser console
  lists many; that's the test setting, not a fault. Also checked on 10
  Nov: a workout in progress at 320 and 390 (real exercise history, rest
  bar clear of Finish), the free account's empty Saved, Progress and
  Collection ("I’m here" is the real users' button; only the dev account,
  which collects from anywhere, sees "Collect"), and a trip's page.
- **Deposit line** (10 Nov). present.ts `depositLine` reworded (test
  updated); PlaceCard's demo notice uses a colon.
- **One quick budget** (10 Nov). query.ts `QUICK_BUDGET = 3000`, used by
  Home's shortcut, Explore's toggle and ResultsContent's chip label.
- **Legal pages, one title** (10 Nov). legal/[doc].tsx: bar title '' and
  the page title is `accessibilityRole="header" level={1}`.
- **Password rule once** (10 Nov). sign-in.tsx's create-mode placeholder
  is "A new password"; the rule stays in the live check below it.
- **Desktop panel label** (10 Nov). explore.tsx `pillNotable`; the
  DesktopPanel's `panelTop` renders only when it's true; the phone's top
  bar always shows the pill.
- **Cities counted alike** (10 Nov). collection.ts `collectionStats` and
  domain social.ts `collectionTotals` both skip blank cities and compare
  lower-cased names.
- **Visits counted once** (10 Nov). visitCost.ts `SpendReport` carries
  `visitDays`; `totals` counts the union of days per currency instead of
  summing `visits`. New test (failed on the old code).
- **Curly apostrophes** (10 Nov). Visible copy uses ’ (copy.ts, PlaceCard,
  FiltersContent, explore, pro, workout.ts cue; copy tests updated).
  Comments, GymPal's prompts and dataset place names keep '.
- **Programme counts its own weeks** (10 Nov). programmes.ts
  `programmeProgress` filters `programmeSessions` to before startedOn +
  weeks × 7 days (new test; it failed on the old code). programme.tsx and
  friends/index.tsx have zero wordings.
- **Map names the searched place** (10 Nov). explore.tsx's pill shows
  `pillPlace || city.name` when live; spend.tsx's summary line says "paid
  in this time" when `sum.visits === 0`. Checked with a test payment put in
  the test browser's `gymgo.spend.v1` only.
- **School project report** (10 Nov). `docs/school/`: report (.docx built
  from the .md by pandoc + python-docx), Gantt (.xlsx by openpyxl, .png via
  LibreOffice), flowchart (.svg/.png), README-Product-Page.md and
  test-evidence screenshots. Peer testing and names are left for the team.
- **Spend card label** (10 Nov). spend.tsx's summary card heading is
  `variant="label"` in sentence case, not an eyebrow.
- **Compare rows** (8 Nov). compare.tsx row labels use `variant="label"`
  as written, not `eyebrow` + toUpperCase. Checked with two gyms put in
  the test browser's `gymgo.compare.v1` only.
- **Map label** (8 Nov). explore.tsx's city pill is `city.name` with no
  dot when the data is live from GymGO's server; the dot and words stay
  for locked, demo, bbox/outside-cities and offline.
- **No greyed-out Keep it** (8 Nov). challenges.tsx renders the target
  button only when `mine?.target !== target` (Join when not in). Sweep
  after Updates 115–125: 24 screens at 320 dark clean; clip and a11y
  clean on 10.
- **Milestone icons** (8 Nov). TrainingInsights' `ladderIcon` is a 24pt box
  with no fill (`ladderIconOn` removed); the icon is brand once reached,
  labelTertiary before.
- **Gym facts without circles** (8 Nov). PlaceCard's `factIcon` has no
  brandTint circle; MemberBusy's `badge` is the people icon in `ink` with
  no tint (the `tint` const went). `Fold` now requires `icon` (its emoji
  fallback and `foldEmoji` removed), and unused `verdictEmoji`,
  `factEmoji`, `googleEmoji`, `pickEmoji` styles are gone.
- **Rows, not stacked buttons** (8 Nov). friends/index.tsx, progress/index.tsx
  and workouts/index.tsx use ios.tsx's `Group`/`Row` (tiles as Profile's
  rows) for their closing links; Progress's export note is the Group's
  footer. Primary + quiet button pairs (sign in / create, invite /
  cancel) are left as they are.
- **Fewer pats on the back** (8 Nov). TrainingInsights' goal line, train.tsx's
  summary title and CollectCard's finished-set line lose "Nice work." and
  "!". CardReveal's rare "!" and GymPal's `GREETING`/`WAITING` (the
  owner's wording) are kept on purpose, as is BuildingBar (the owner
  asked for a 3-second bar with an animation).
- **Pro page icon** (8 Nov). pro.tsx's hero is `AppBadge size={72}`
  (BrandMark.tsx) in place of the BrandFill square with a crown.
- **Ticks as icons** (8 Nov). ExerciseCard's `KitUsed` and the builder's
  `KitNote` draw `good`/`maybe` icons instead of "✓"/"?" text; the
  confirmed state is in the row's accessibilityLabel. No "✓" is left in
  the app's text.
- **Programme and trips, plainly** (8 Nov). programme.tsx's `mark`
  (BrandFill square) and Home's `tripIcon` circle removed (a 22pt brand
  globe). Checked with a trip and a programme put in the test browser's
  storage only.
- **Plain widget icons** (8 Nov). TrainingInsights' `stripIcon` and
  CollectCard's `stripMedal` circles removed: a 20pt (tile) or 22pt (row)
  glyph, flame in `color.maybe`, cards in `TIER_METAL` (labelSecondary
  before any tier), HereNudge's pin in brand. country's Stack title and
  report-bug's `badge` removed.
- **One title per page** (8 Nov). templates.tsx's `TEMPLATE_ICON`/`mark`
  (BrandFill square) removed; photos.tsx and spend.tsx set the bar title
  to '' since each has its own largeTitle (as measurements.tsx, pro.tsx).
- **Icons, not emoji** (8 Nov). `CELEBRATIONS`/`SOUND_PACKS` carry an
  `icon: IconName` (new Icon names confetti, fireworks, smile, music,
  arcade; Material has no fireworks, so `flare`) in place of an emoji
  `sample`; PercentSlider's accent halo removed; "Thanks!" etc. made
  plain; billing.ts `returnPage` has no emoji and says "Taking you back"
  only with a destination (tested).
- **Room for GymPal's button** (8 Nov). PageScroll's bottom padding is at
  least `PAL_ROOM` (52 + 16 + 12, GymPal.tsx's BUTTON and EDGE plus air)
  unless `gymPalButton` is 'hidden', so a page's last row clears the
  corner or edge button.
- **A ticked set, settled** (8 Nov). train.tsx `inputDone` is transparent
  with `color.label` (was goodTint/goodInk); `setDone`/`setBest` row tints
  unchanged.
- **Console clean** (8 Nov). With a 14-screen walk in the browser the only
  console warning is the map's "Expected value to be of type number, but
  found null instead." (×3): it's OpenFreeMap's own liberty style, the same
  warnings on a bare page with nothing but that style (checked with a
  stand-alone MapLibre page), so nothing in GymGO to fix.
- **Search suggestions as Maps draws them** (8 Nov). ResultsContent's
  `lookGlyph` is `color.fill` with `labelSecondary` icons (look up, recent);
  places keep the red pin circle, gyms their logo or the brand circle.
- **Icons on the accent cards** (8 Nov). (tabs)/index.tsx `workoutIcon` and
  profile.tsx `proMark` have no `onBrandFaint` square; icons are 26 pt.
- **Pro said once** (8 Nov). (tabs)/index.tsx's Other cities: `groupPro`
  (every city in the group outside `mayExplore`) shows "· with GymGO Pro"
  by the group's name; the per-chip `proTag` only when a group is mixed.
  profile.tsx's `ProCard` title on Free is "GymGO Free" with the limits as
  its line (was "Go further with Pro").
- **Plainer sentences** (8 Nov). No "word — word" asides left in the app's
  visible strings (copy.ts `filtersButtonLabel`, `locatedNotice` denied,
  `EMPTY.crowd`; PlaceCard's Reviews summary; FiltersContent's hint).
- **A plain photo slot** (8 Nov). PhotoHero.tsx's `empty` style is
  `color.fill` with no dashed `brandBorder`/`brandWash`.
- **The builder's options fit** (8 Nov). workout/[id].tsx's length
  `Segmented` labels drop " · N" under 360 points; Goal/Length/Machines use
  `label`.
- **Kit in fewer words** (8 Nov). exerciseLibrary.ts `kitShort(exercise)`
  (one differing slot becomes "A or B"; a one-extra-item pair becomes "X,
  Y optional"; else `kitText`), tested never longer than `kitText`. Used
  for the shown line in exercises.tsx and AddExercise.tsx; their
  accessibility labels keep `kitText`.
- **Headings inside the tools' cards** (8 Nov). `label` in plates.tsx
  (Each side ×2, Warm-up), strength.tsx (Percent of your max, What you could
  do for) and month.tsx's switcher. Rule of thumb now: `label` for a
  heading inside a card, `eyebrow` (capitals) for a heading over a list or
  on a share picture.
- **This month's figures fit** (8 Nov). HomeWidgets' month stats carry a
  `spoken` each; Lifted shows the number with the label `${unit} lifted`.
- **Tidying** (8 Nov). Removed unused ui.tsx `TierPill`/`SectionTitle`/
  `Divider` (and their styles), theme `currentTweaks` and `bodyHover`,
  exerciseLibrary `doableWith`, training `isSetKind`, places `isDemoMode`.
  `npx tsc --noEmit --noUnusedLocals` in apps/mobile reports only
  au-data's `GYM247_MEMBERSHIPS` (research kept on purpose).
- **Works, Needs, Membership** (8 Nov, "less vibecoded"). `label` for
  progress/[exercise]'s `Detail` (its `detailLabel` uppercase style gone),
  JoinGym's banner and GooglePage's heading. The only `textTransform:
  'uppercase'` left is ios.tsx's `groupHeader`. train.tsx's `SummaryStat`
  takes no `icon`.
- **A summary that ends with one button** (8 Nov, "less vibecoded").
  train.tsx's `Summary` lists Share your record / Share this workout / See
  your progress in a `savedCard` (rows keyed by id; the record row shows
  "Making the picture…" while `sharingCard`), then a brand Done.
  workouts/index.tsx's empty card: template choice is a `textLink`
  (44 tall). Other runs of buttons left are side-by-side pairs or
  confirm/cancel forms, which are fine.
- **The last capitals in cards** (8 Nov, "less vibecoded"). `label` on the
  heroes of profile.tsx (plan), friends/index (code), friends/[id],
  challenges.tsx, strength.tsx and lifetime.tsx; share cards (RecapCard,
  LifetimeCard, SetCard) keep `eyebrow`. strength.tsx's empty `ghost` card
  has no `ghostLines`.
- **The map says what it does** (8 Nov, "less vibecoded"). copy.ts's
  `sessionGreeting` (the time-of-day quips) is gone with its eyebrow in
  ResultsContent; `PLACEHOLDER` gave way to `mapPrompt(home)`
  ("Suburb, city or gym"), and `PLACEHOLDER_SHORT` is "Search" (under 360
  points). GymPal's `GREETING` is the owner's own wording: leave it.
  CardReveal's button is "Done" (was "Nice!"), its Collection button
  `cards`; welcome.tsx's last button "Get started", its third page `cards`.
- **How to do it, as a card** (8 Nov, "less vibecoded").
  progress/[exercise].tsx's how-to is `styles.card` with an
  `ExerciseTile` (96, moving); its `hero`/`glyph` styles are gone.
  ExerciseGlyph.tsx's `ExerciseTile` has no `lit` gloss.
- **The welcome tour on a plain page** (8 Nov, "less vibecoded").
  welcome.tsx's `Backdrop` (two radial glows of the accent) is gone.
- **A gym's page as a plain list** (8 Nov, "less vibecoded"). ui.tsx's
  `Fold` icon is 20 pt in a 32-wide box with no background (`foldIcon`).
  PlaceCard's amenity chips (`markChip`) and GooglePage's `detailChip`
  use `Icon` check/close with an accessibility label ending ": yes"/": no".
- **The last tinted circles** (8 Nov, "less vibecoded"). No background on
  ProOffer `mark`, GoogleGate `glyph`, leaderboard `joinMark`, trips
  `tripIcon`, friends `emptyMark`, progress `lifetimeMark`; tinted
  buttons (steppers, plus, save) unchanged. collection.tsx's no-logo
  fallback is `<NoPhoto compact name=… />` in the rounded `nextIcon`; ui.tsx
  `lettersCompactLong` (15 pt) for three-character initials.
- **Numbers without ornaments** (8 Nov, "less vibecoded"). progress/index's
  `Stat` takes no `icon`/`tint`; lifetime.tsx's tiles have no `icon`;
  lifetime's `mark` and pro.tsx's `featureIcon` have no background.
- **Plainer headings** (8 Nov, the owner's "less vibecoded"). New `label`
  text style (13 pt semibold, sentence case) for a card's own small heading;
  `eyebrow` (spaced capitals) is left for section headings over lists and
  share cards. HomeWidgets' Frame title, ExerciseCard, train.tsx's set
  count, PlanEditor ("Exercise N"), PlanSummary, the exercise page's hero,
  SessionNote, What you did, Collection and Leaderboard heroes use `label`.
  ios.tsx's `SectionHeader` has no `icon` any more. ui.tsx's `NoPhoto`
  monogram is the initials (`labelSecondary`) on `color.fill` with the
  tag; its rings, halos and gradient are gone.
- **Less decoration** (8 Nov, the owner: "try make the app look less
  vibecoded"). BrandFill.tsx's `Sheen` and `accentGlow` are gone, with
  their 17 and 19 uses: accent-filled surfaces are flat. theme.ts's
  `glowPools` and `heroGlowStops` are about half as strong at
  `GLASS_DEFAULT`. HeroMark.tsx is now just the symbol (`labelTertiary`,
  `weight="regular"`, 78% of `size`; `tint` colours it). No `sparkle`
  icon outside GemCard's Legendary twinkle; new `haptics` icon. train.tsx's
  no-workout page lists Build from muscles / Make your own / From a
  template in a grouped card (`savedCard` styles). Home's
  `shortcutIcon`/`upNextIcon` circles and HomeWidgets' tinted `toolIcon`
  are gone. Avoid bringing back: coloured glows, glossy gradients,
  sparkles, icons in tinted circles, stacks of equal tinted buttons.
- **A new page starts at its top** (7 Nov, polishing). Redrawn's
  `ScrollMemory` is now a `ScrollPlace` `{ y, restore }`; `restore` is set
  only when the theme version changes (a redraw), and `startingY(memory)`
  (Redrawn.tsx) gives a newly drawn PageScroll or TabScreen its start: the
  kept place after a redraw, else 0. train.tsx's summary had been taking
  the workout page's place (331 down).
- **The built plan comes into view** (5 Nov, polishing). workout/[id].tsx
  passes a ref to `PageScroll`; `BuildingBar`'s `onDone` sets
  `showPlan.current`, and the plan's `onLayout` then calls
  `scrollTo({ y: layout.y - 96, animated: !reduceMotion })` once (96 so a
  header over the page can't cover it). The plan appears about 3 s after
  the tap (the building bar), so a browser check has to wait for it.
  programme.tsx scrolls its `PageScroll` to the top (not animated) when
  `programme` turns from null to set or back.
- **A note looks like a note** (5 Nov, polishing). Icon.tsx has `note`
  (SF `note.text`, Material `sticky_note_2`, which is in expo-symbols'
  web set); ExerciseNote.tsx and train.tsx's Note button use it instead of
  `pin` (kept for places: addresses, trips, "near me"). The collection
  uses `cards` (profile.tsx, homeWidgets.ts, CollectCard's tile, strip
  and Collection button); `trophy` stays for Lifetime, the Leaderboard
  and a gym's tier medal.
- **The recovery map in small on Home** (5 Nov, polishing). MuscleFigures.tsx
  now has `SmallFigures({ fillFor, width })` (any colour per muscle; the
  idle grey for none), which `MuscleFigures` uses; HomeWidgets'
  `RecoveryWidget` puts one beside its two lists (`restBody` row, 30 wide
  under 360 points, else 38), coloured by `heatShade(band)`. month.tsx
  puts one (56/66 wide) at the top of Sets for each muscle, each muscle
  `mix(bodyIdle, brand, 0.2 + 0.8 * sets / most)`.
- **The body on each exercise, the figure kept** (5 Nov, following the
  owner's "make the muscle guy ... look better"). New
  components/MuscleFigures.tsx: a front and back `BodyFigure`, not
  pickable and hidden from screen readers, filled brand for an exercise's
  `primary`, `mix(bodyIdle, brand, 0.4)` for `secondary`; on
  progress/[exercise].tsx beside Works (38 wide under 360 points, else 46).
  New lib/bodyGender.ts (`deviceStore` 'gymgo.body.v1', male by default):
  `useBodyGender()`/`setBodyGender()` used by workout/[id].tsx (replacing
  its own state), RecoveryMap (which has its own Male/Female `Segmented`
  under the figures) and MuscleFigures. `inertFill(slug)` in body/shapes.ts
  fills the non-muscle parts: the new `bodyHair` token for `hair`,
  `bodyInert` for the rest (light `bodyInert` #E1E1E6, `bodyBorder`
  #BABAC2, a little darker than before).
- **A better-looking body figure** (5 Nov, the owner: "make the muscle guy
  for building workout and checking what muscles are fatigued look
  better"). components/body/BodyFigure(.web).tsx: a `LinearGradient` per
  fill colour (`shadeStops` in body/shapes.ts: 22% lighter at the top,
  16% deeper at the foot, in each muscle's own box), the silhouette filled
  with the new `bodyBase` token (light, dark, Dim), a radial floor shadow
  at `footing()`; a picked muscle gets a light edge, and on the web a CSS
  `drop-shadow` glow. RecoveryMap's `HEAT` (today #E5484D, yesterday
  #F76B15, 2–3 days #F5A524, 4+ mixed into the body grey); the legend and
  list dots use the same `shade()`.
- **Titles clear of the back button** (5 Nov). components/WebBack.tsx is
  the chevron alone under 360 points wide (`round` style), found with a
  browser check measuring the gap between the header's title text and the
  back button on 28 screens; challenges.tsx uses `Segmented` for targets.
- **The whole card in a shared picture** (5 Nov). The card's frame is drawn
  `GLOW_ROOM` past its box; CardReveal's capture view now has
  `padding: GLOW_ROOM, margin: -GLOW_ROOM` so the picture holds it all
  without moving the pop-up (card/[id] already had padding round its shot).
- **Collection on a tablet or a computer** (5 Nov). collection.tsx:
  `columns` is 3 when the page (`min(width, COLUMN)`) is at least 560
  wide; `BadgeShelf` and `RarityFilter` wrap (`wrap` when `width >=
  COLUMN + 32`) instead of scrolling sideways. Also: `tsc --noUnusedLocals`
  is clean in apps/mobile, apps/server and packages/domain, except
  au-data's `GYM247_MEMBERSHIPS`, left as data. The map's one console
  warning ("Expected value to be of type number, but found null") comes
  from OpenFreeMap's own style, not GymGO's code.
- **A friend code or a gift, copied and said so** (5 Nov). friends/index's
  `sent` and ProExtras' `copied` hold what `shareText` did when it wasn't a
  share sheet, so the button's words say it.
- **Sharing on a computer copies instead** (5 Nov). lib/actions.ts:
  `copyOnWeb` (the clipboard API, else a hidden textarea and
  `document.execCommand('copy')`), `ShareOutcome`, `shareLine(outcome)`
  (the one place the "Copied, ready to paste." / "Sharing isn't available
  here." words live); `shareGym` returns a `ShareOutcome` and copies on the
  web. gym/[id]'s header uses `ShareButton` (a tick and "Copied" for 2.5 s).
  Headless Chromium denies the clipboard unless the context is given
  `clipboard-read`/`clipboard-write`, which made sharing look broken in
  tests.
- **Every field's hint fits** (5 Nov). A browser scan measured each
  input's placeholder (canvas `measureText` in its own font) against its
  width at 320 pt over 20 screens. sign-in.tsx's name hint is shorter;
  ResultsContent uses `PLACEHOLDER_SHORT` (lib/copy.ts) under 360 pt wide.
- **Sharing a picture works again on the website** (5 Nov). Since the SDK
  58 upgrade (react-native-view-shot 6.1.1), view-shot's web capture needs
  its optional peer `html2canvas-pro`, which wasn't installed, so every
  web share failed ("Couldn't make the picture here"). Added it to
  apps/mobile (2.5.0 exactly, MIT; CREDITS.md: later releases ask for Node 24, the repo runs on 22). lib/shareImage.ts's
  `pictureOnWeb` calls it directly, with `backgroundColor:
  color.groupedBackground` and `scale` at least 2; phones still use
  view-shot's `captureRef`.
- **Tilt your card** (5 Nov). components/TiltCard.tsx wraps the card on
  card/[id]: a Gesture Handler pan (`activeOffsetX([-8, 8])`,
  `failOffsetY([-14, 14])`, so vertical drags scroll) springs
  `rotateX`/`rotateY` (with `perspective: 900`) towards the touch and back
  to flat; in a browser, the mouse is read from `onPointerMove` and
  `onPointerLeave` on an outer View that doesn't tilt (Gesture Handler's
  Hover didn't fire on the web). The maths is lib/tilt.ts (`tiltFor`, a
  worklet, tested); MOST_TILT is 14°. Off with Reduce Motion. `still`
  lays it flat at once: card/[id] sets it while sharing and waits two
  frames before the capture, so the picture is flat even mid-tilt.
- **Saying truly what's down** (5 Nov). lib/apiErrors.ts now holds
  `ApiError`, `OfflineError` (re-exported by lib/api.ts), `readBody` (a
  body that isn't JSON: 502/503/504 is `OfflineError`, else `ApiError`
  with code `not_json`; a tunnel's 520–530 counts too) and `failure` (a
  502/503/504 with no `error` and no `code`, as from Caddy, or the dev
  proxy's `server_down` (metro.config.js), is `OfflineError`; the server's
  own 502s and 503s always carry `error`, so they stay `ApiError` with
  their words: the place finder busy, a friend code not made). lib/weather.ts's
  `none` state has a `cause` ('server' | 'met' | 'other'). Tested in
  apiBody.test.ts.
- **Small phones, tidied** (5 Nov). Found with two browser scans worth
  rerunning (in the session's scratchpad, not the repo): text cut short
  (`text-overflow: ellipsis` with scrollWidth > clientWidth, or a line
  clamp with scrollHeight > clientHeight) and controls with no name or
  under 28 px. progress/[exercise].tsx's `Fact` takes `detail` and
  `spoken`; lifetime.tsx's tiles take `spoken`; MemberBusy and
  workouts/index.tsx check `useWindowDimensions().width < 360`; the
  templates toggle has `minHeight: 28` with a negative margin.
- **A clearer start to the collection** (5 Nov). collection.tsx's empty
  state has a row of `CardShapeIcon`s with "Common to Legendary" (one
  caption: five labels didn't fit at 320 pt). lib/sets.ts adds the street
  (`address.line1`) to a missing gym's name when two gyms in the set share
  it; a test covers it.
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
