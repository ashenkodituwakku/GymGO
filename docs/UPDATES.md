# GymGO updates

Every update to GymGO, numbered from the first, newest first. An update is
one piece of work you asked for, shipped together. The commits it covers
are named by their short id, so `git show <id>` finds any of them; the
documentation commits that followed a change count with it.

Updates 1 to 64 were written up on 3 Nov 2026 from the project's history
(557 commits from 22 Sep 2026). From now on, each update adds the
next number here as part of the update itself.

## Update 298 · Warm-ups for dumbbells and machines, and an exercise's whole story

*28 Nov 2026 · the commit "Warm-ups for dumbbells and machines, all-time totals on an exercise, how often a saved workout is done"*

You asked for more polish and Hevy features. Three more, in GymGO's own look:

- **Warm-ups for dumbbells and machines** (Pro). Warm-ups used to be for barbells only. Now a dumbbell or machine exercise has them too: about half your working weight for 8, then three quarters for 4, rounded down to a step the kit can make (2.5 kg or 5 lb for dumbbells, 5 kg or 10 lb for a weight stack). A light weight gets one warm-up, or "At this weight, your first set is warm-up enough." Barbells keep their ramp from the empty bar. Body-weight moves, holds and carries have none.
- **An exercise's whole story** (its page from Progress or the workout's picture):
  - New **Sets** (with the reps in them) and **Lifted** (all time) tiles, and **Sessions** now says when you last did it.
  - On a phone the tiles wrap three to a row instead of squeezing into one.
  - Each line of **Every time** names the workout it was in and opens it.
- **How often you do each saved workout.** My workouts says "Done 3 times, last on 24 Nov" under each one you've done, counted from the workouts started from it.
- Checked:
  - domain 205, server 379 and app 732 tests (9 new: the warm-up steps, which exercises warm up how, an exercise's totals, and how often a saved workout is done), typecheck, lint and the empty-text scan;
  - in a browser at 390 and 320 light and 1280 dark (Melbourne time): goblet squat at 30 kg getting 15 × 8 and 22.5 × 4, cable fly at 22 kg getting 10 × 8 and 15 × 4, no Warm-ups on push-ups, and the hint with no weight typed; bench press's tiles (6 sessions, last 24 Nov; 9 sets, 51 reps; 3,870 kg) wrapping 3 and 2 on a phone and in one row on a desktop, and an Every time line opening its workout; "Done 2 times, last on 27 Nov" on Push day after two test workouts (deleted afterwards).
- Not checked: a real phone.
- Still not done: assisted exercises (an assisted pull-up machine). They'd need a new machine in the gym equipment list, which also feeds members' kit reports and gym filters, as well as weights below zero (less help as progress) across the app, the server and records. Left for a batch of its own.

## Update 297 · Do it again, an empty workout, and records in History

*27 Nov 2026 · the commit "Do it again and Save on your own workouts, an empty workout, records in History"*

You asked for more polish and Hevy features. Three more, in GymGO's own look:

- **Do it again and Save on your own workout.** Your own workout's page (from Calendar, or Open in History) now has, above the exercises:
  - **Do it again**: the same exercises and sets, at the gym it was at, started straight away. Each exercise shows what you lifted last time, as any workout does. Not offered while another workout is going.
  - **Save to my workouts** (Pro): keeps it as one of My workouts, your own exercises included, then offers Add it to a folder.
  - A friend's workout already had Do this workout and Save; they now share the same row.
- **Records and Open in History** (Progress). A workout that broke records shows a trophy with how many, matching its page and its finish screen. Opening a workout's row now has **Open**, beside Edit and Delete, for its full page. Only the workouts on screen are worked out, so a long log stays quick.
- **Empty workout** (the Workout screen, first under Start another way). It starts at once with nothing planned, named for the time of day ("Morning workout", "Afternoon workout", "Evening workout" or "Night workout"), with the exercise picker already open. Rename it with the pencil.
- Checked:
  - domain 205, server 379 and app 723 tests (2 new: the time-of-day names, and records counted per workout), typecheck, lint and the empty-text scan;
  - in a browser at 390 light and 1280 dark (Melbourne time): Empty workout started as "Evening workout" with the search focused, and bench press added; History's trophy on the workout that set a record; Open going to its page with Do it again and Save to my workouts; Save making a copy (deleted afterwards); Do it again starting the same three exercises.
- Not checked: a real phone.

## Update 296 · An exercise menu, Remove any set, and renaming a workout

*27 Nov 2026 · the commit "An exercise menu in a workout in progress, Remove any set, rename a workout"*

You asked for more polish and Hevy features. Three, in GymGO's own look, all in a workout in progress:

- **An exercise menu.** Each exercise has a ⋯ button with what can be done to it now:
  - **Move up** and **Move down**. A superset or circuit moves as one: an exercise outside it hops over the whole group, one inside it moves within it, and one at its edge takes the group along. Take out of Superset A is still how one leaves.
  - **Replace exercise**: the add-an-exercise picker opens in its place, "Replace Barbell bench press", with moves for the same muscles first, or a search. The new one keeps the number of sets and the plan's reps and rest when it's measured the same way (a plank for a hold takes a time instead). Offered only before a set is ticked, as Swap is.
  - **Remove exercise**, in red. With sets ticked, the menu says first that they go with it. The last exercise can't be removed (Discard workout ends it).
  - On iPhone it's Apple's own action sheet; elsewhere GymGO's, as for kinds of set.
  - A screen reader hears what happened ("Hollow hold moved to 2 of 4", "Push-up removed").
- **Remove any set.** Tapping a set's number now ends with **Remove set**, so a set in the middle can go, not only the last. One set always stays.
- **Rename a workout as you go.** A pencil beside the name turns it into a field; Return or tapping away keeps it, and a blank name keeps the old one. A template's or programme's day keeps its name, since the next day is found by it. Edit workout still renames one already logged.
- Checked:
  - domain 205, server 379 and app 721 tests (11 new: moving, groups moving together, removing, replacing, suggestions), typecheck, lint and the empty-text scan;
  - in a browser at 390 light, 320 light and 1280 dark: Hollow hold moved up past a superset; Push-up moved up with its superset; Barbell bench press replaced with Incline dumbbell press from same-muscle suggestions; Push-up removed after a ticked set, with the warning shown and its superset undone; the middle goblet squat set removed; a workout renamed (spaces tidied), a blank name ignored, and no rename on a template day.
- Not checked: a real phone, so Apple's action sheet versions weren't seen.

## Update 295 · A countdown for holds, and a saved workout that follows the day

*27 Nov 2026 · the commit "Timed sets count down to their target; update a saved workout to match the day"*

You asked for more Hevy features. Two more, in GymGO's own look:

- **Holds count down.** The stopwatch on a timed set (a plank, a hollow hold, a wall sit) now counts down to the set's target: last time's at the same place, else the set above, else the plan's ("30–45 s" counts down from 0:30).
  - A soft beep at 3, 2 and 1, then a buzz and a tone at zero.
  - Past the target it counts on in green ("+0:12"), and a line along the foot of the box fills as you go.
  - Stopping still puts in the whole time held, so a 0:30 target held for 0:42 logs 0:42.
  - A screen reader hears "12 seconds to go", then "Target time reached" once.
  - With no target (no plan, nothing last time) it counts up as before.
- **Update a saved workout to match** (the finish summary, Pro). A workout started from My workouts that went differently offers **Update Push to match**, with what would change underneath ("1 exercise added, 1 not done, 1 with different sets", or "a new order").
  - Exercises you did keep their reps, rest and kit from the plan; only their sets follow the day. Warm-ups don't count.
  - An exercise you added takes its reps from what you did ("12", "8–10", "45 s") and 90 s rest.
  - One you skipped comes out, which is why the summary says so first.
  - A superset stays only where its exercises are still side by side.
  - It's only offered when something changed, and only for workouts of 1 to 12 exercises (a saved workout's limit).
- Checked:
  - domain 205, server 379 and app 710 tests (5 new for updating a workout), typecheck, lint and the empty-text scan;
  - in a browser at 390 light, 1280 dark and 320: a hollow hold with a 5 s target counting 0:04, then +0:01 in green with the line full, the announcement made once and 0:06 logged; a saved workout finished with two of three bench sets, a push-up added and the plank skipped, offering "Update Countdown check to match · 1 exercise added, 1 not done, 1 with different sets", and the saved workout changed to match after tapping it. The test workout and session were deleted afterwards.
- Not checked: a real phone, so the beeps and buzz weren't heard or felt.

## Update 294 · Year in review, Duplicate, and reordering a past workout

*27 Nov 2026 · the commit "Year in review, Duplicate a saved workout, reorder exercises when editing"*

You asked for more Hevy features. Four more, in GymGO's own look:

- **Year in review** (Calendar → Year → **2026 in review**).
  - The year's workouts, hours, weight lifted, sets, days trained and records broken, counting up.
  - A bar for each month, the best one in your accent. Tap a month you trained in for its monthly report.
  - Highlights:
    - your best month;
    - your longest run of weeks in a row;
    - your favourite gym (the one you tagged most);
    - the muscle you trained most;
    - your biggest workout, which opens in full.
  - Your top five exercises by sets, each opening its progress page.
  - **Share your year** sends the totals in a few lines, never where or when you trained.
  - A workout counts in the year it started, as on the calendar. Warm-ups never count.
- **Duplicate** (a saved workout's page, Pro): makes "Push (copy)" in the same folder and opens it, ready to change into a variation.
  - Saving the same workout twice under the same name (a double tap, a retry) still keeps only one. Only a copy under a new name is kept as well.
- **Reorder exercises in Edit workout.** Up and down buttons beside each exercise put them in the order you did them. A screen reader hears where it moved ("Plank moved to 2 of 3").
- **Saving a friend's workout:** once it's saved, the row offers **Add it to a folder**.
- Checked:
  - domain 205, server 379 (1 new: a copy under a new name is kept, a retry isn't) and app 705 tests (6 new for the year), typecheck, lint and the empty-text scan;
  - in a browser: Calendar's Year view → 2026 in review, with its figures, the November bar and highlights; Duplicate on Pull making Pull (copy) and opening it; Plank moved down in Edit workout and saved in the new order.
- Not checked: a real phone. Add to folder after saving a friend's workout wasn't tried in a browser (it needs a friend's shared workout); its typecheck passes.

## Update 293 · Pro's cards in your accent, and Minimal made plainer

*25 Nov 2026 · the commit "Pro cards in your accent; Minimal plainer, with a plain sidebar"*

You asked for the Pro card and reminder in your own accent colour rather than navy and orange, while still standing out, and for Minimal to be more minimal, without the dark sidebar.

- **The sidebar's Pro card and the Pro reminder** are now filled with your accent (its gradient or pattern too, for Rainbow and Camo), with white words and a white button in the accent, as Profile's Pro card is. The sidebar card has a soft lift so it sits forward. Free accounts have Indigo, so that's what they'll see.
- **Minimal, plainer:**
  - **No dark sidebar.** It's white, with a fine line and no shadow. The place you're on is a light grey mark, with only its icon in your accent.
  - A page closer to white (#F8F8F9), fainter lines round the cards, smaller corners (4 to 10 points), and floating things that barely lift.
  - In dark it's the same, on near-black.
  - Its text still passes WCAG AA in every mode and accent.
- Checked:
  - domain 205, server 378 and app 699 tests, typecheck and lint;
  - in a browser as a free account: the accent card in the sidebar and the accent reminder (1280 light and dark, 390), and Minimal's plain sidebar and cards.
- Not checked: a real phone.

## Update 292 · A Minimal look for everyone, and Pro offered gently

*25 Nov 2026 · the commit "Minimal look for everyone, a Pro card in the sidebar, and a gentle Pro reminder"*

You asked for a minimalist appearance for free and Pro accounts like your screenshot, a small upgrade card in the sidebar, and an occasional Pro reminder for free accounts that doesn't get in the way.

- **Minimal look** (Profile → Appearance → Look), for **everyone**, free and Pro.
  - Flat white cards with a fine edge and no shadows, on a pale grey page, with small corners. In dark it's the same on near-black.
  - On a wide screen the **sidebar is dark** in light mode too, as in your screenshot: light words, the place you're on as a solid accent pill, and the GymGO wordmark in white.
  - Floating things (sheets, menus) are solid plates, as in the other solid looks.
  - Its text passes the same contrast checks (WCAG AA) as every other look, in every mode and accent.
  - Standard and Minimal are now everyone's. The other ten looks are still Pro, so Pro's list doesn't change. The PRO tag on the Look heading is gone; each Pro look keeps its own crown. GymPal knows.
  - The looks are laid out four across where there's room.
- **GymGO Pro in the sidebar.** A small dark card at the foot of the sidebar, and of the slide-in menu on a phone: a crown, "Gyms in every country, and no limit on saved gyms." (or the free trial when there is one) and **Go Pro**, which opens the Pro page.
  - It's pinned under the list, so a short window still shows it while the places above scroll.
  - Only for a signed-in free account, where Pro can be bought (as the Profile card); never on the limited website.
- **An occasional Pro reminder** for free accounts.
  - A small card on Home: at the top on a phone, clear of the tab bar; at the foot of the page beside a docked sidebar, clear of the greeting and GymPal's button.
  - **At most once every three days**, never on the first day this device sees the account, and only after a random 8 to 20 seconds on Home, so it never lands as you arrive.
  - Never during a workout, never on other pages; it goes away by itself after 20 seconds, or with **Not now** or **See Pro**. It doesn't block the page.
  - When it last showed is kept on the device.
- Checked:
  - domain 205, server 378 and app 699 tests (4 new for the reminder's timing), typecheck, lint and the empty-text scan;
  - in a browser, as a new free account (the test told the app Pro was on sale, since this server has no Stripe): the sidebar card with Go Pro; the reminder after a wait on Home, closed with Not now, its time kept, and not shown again; Minimal chosen on a free account while Frost stays Pro; Minimal at 1280 light and dark and at 390.
- Not checked: a real phone.

## Update 291 · A better sign-in page, and Up next on Welcome back

*25 Nov 2026 · the commit "Sign-in fields keep their names, email slips caught, and Up next on Welcome back"*

You asked to upgrade the sign-in and create-account page, and to brainstorm and make current features better.

- **Sign in and create account:**
  - Each field's name stays in view. It rests in the box like a hint and rises small above what you type once you tap in or there's text, so you can always tell which field is which. A browser's saved details lift it too.
  - A slip in a common email provider is caught: "Did you mean sam@gmail.com?" Tap it to use it. It knows the usual providers (Gmail, Outlook, Hotmail, iCloud, Yahoo, BigPond and more) and leaves real addresses alone, like mail.com or a work address.
  - "Caps Lock is on" shows under the password while it is, on a computer.
  - After signing in or making an account, the button shows a tick ("Signed in" or "Account created") for a moment before the next screen. With Reduce Motion it goes straight on.
  - Plainer words (docs/COPY.md): "It’s free. Find gyms that let you in, save them on every device and log your training." The birth-month note is now "Asked to check GymGO suits your age. It isn’t kept." The too-young message is "Sorry, GymGO accounts are for people 13 and over."
- **Welcome back:**
  - **Up next.** The next day of your training programme, or of the template plan you follow, with **Start** to begin it straight away. It's left out while a workout is in progress.
  - This week shows how far you are from your goal ("2 to go") or "Goal met".
  - A plan's workout reads as its day ("Full body A"), with the plan's name beside the details.
- **Calendar:** tap today when you haven't trained yet for **Start workout**.
- **Saving a workout in the builder:** once it's saved, **Add to folder** puts it straight into one.
- Checked:
  - domain 205, server 378 and app 695 tests (4 new for the email slips), typecheck, lint and the empty-text scan;
  - in a browser: the create form's names rising, "gmial.com" offered as gmail.com and fixed with a tap, Caps Lock shown and cleared, "Signed in" then Welcome back (390 light and 1280 dark);
  - in a browser: Up next offering Full body B after Full body A, and Start opening it; today on the calendar offering Start workout; Add to folder after Save in the builder, opening the folder page.
- Not checked: a real phone. A real Caps Lock key either: headless Chrome doesn't report it, so a key event carrying Caps Lock was used.

## Update 290 · Folders for your saved workouts, and a year on the calendar

*25 Nov 2026 · the commit "Folders for My workouts, and a year view on the calendar"*

You asked for more Hevy features. Two more, in GymGO's own look:

- **Folders in My workouts.** Sort your saved workouts into folders of your own, such as "Upper body" or "Week A".
  - Tap the folder button beside a workout, or **Move to folder** on its page. Pick a folder, make a new one, or take it out of its folder.
  - Folders are listed A to Z, each with how many workouts it holds. Tap a folder's name to fold it away. Workouts in no folder are listed last.
  - **Rename** a folder for all its workouts at once, or **Remove folder**. Removing it keeps the workouts, just not in a folder.
  - Moving and renaming work on Free too, as deleting does. They're tidying up what you've kept. Saving new workouts is still Pro.
  - Folders are kept on your account, so they're the same on every device, and they're in Download my data.
- **Year view on the calendar.** A **Month / Year** switch at the top of Calendar.
  - Year shows the twelve months at once as small grids, with the days you trained filled in violet.
  - Above them: that year's workouts, days trained and weeks trained.
  - Step back a year at a time, as far as your first workout.
  - Tap a month you trained in for its monthly report.
- Polish:
  - A saved workout's page loads again whenever you come back to it, so a change made from it shows straight away.
  - The edit screen's Day button tells a screen reader whether its calendar is open.
- Checked:
  - domain 205, server 378 (3 new, for folders) and app 691 tests (6 new for folders and the year), typecheck, lint and the empty-text scan;
  - in a browser: a workout moved into a new folder, a second into the same one, the folder renamed, folded, shown on the workout's page and removed, with no errors;
  - in a browser: the year view at 390 light, 1280 dark and 320 (two columns there); November opens its monthly report.
- Not checked: a real phone.

## Update 289 · The tests pass in every time zone, Melbourne included

*25 Nov 2026 · the commit "The exercise chart test passes in every time zone"*

The tests had only ever run here, where the clock is UTC. Run as if the computer were in Melbourne, one app test failed: the exercise chart's test logged a morning and an evening workout at 07:00 and 19:00 UTC and expected one point for the day, but in Melbourne (UTC+11 in October) those are 6 pm on the 1st and 6 am on the 2nd. The app was right to chart two days (a workout belongs to the day it was where you are); the test wasn't. It now logs 7 am and 7 pm local time.

- Checked: the app tests (685) in UTC, Melbourne, Los Angeles, Kiritimati (UTC+14) and Pago Pago (UTC−11); the server tests (375) in Melbourne, Kiritimati and Pago Pago; the shared rules (205) in Melbourne. All pass. A computer set to Melbourne time, as yours probably is, now runs the whole suite clean.

## Update 288 · A gym owner's casual price is read properly too

*25 Nov 2026 · `a858c58`*

The same flaw as Update 287 was in the form a verified gym owner uses to send their casual price (lib/ownerForm.ts `parsePrice`): it kept only digits, points and commas, so "1e6" went to the moderator as A$16 and "-5" as A$5. It now reads a price exactly as members' prices are read (`parseAmount`, moved to its own lib/amount.ts so the owner form doesn't pull in the city lists), which turns those down and still takes "25", "A$12.50", "¥1,500" and "24,50".

- Checked: the owner form's test covers "1e6", "-5", "0", "12..5" and "A$-20"; app 685 tests and a typecheck. The server checks an owner's price again before a moderator sees it.

## Update 287 · What you pay reads amounts and dates properly

*25 Nov 2026 · `7959176`*

Typing odd values into the app's forms found that **What you pay** (app/spend.tsx) guessed instead of asking. It dropped everything but digits and points, so "1e6" was saved as 16 and "-5" as 5, and a decimal comma ("19,99") became 1999. Its date check let impossible days through: "2026-02-31" was kept, and a browser reads it as 3 March.

- lib/spendInput.ts, new: `readAmount` takes "19.99", "$19.99", "A$20", "1,200", "1 200" and "19,99" (19.99), and turns down signs, letters, exponents, 0, more than two decimals and more than 100,000; `isRealDay` takes only real days written year-month-day.
- The form's messages: "Enter what you pay as a number, like 19.99.", "Enter the currency as three letters, like AUD, USD, EUR or GBP." and "Enter a real date as year-month-day, like 2026-10-01."
- The plate and 1-rep max calculators were tried with the same odd values (letters, negatives, 0, tiny, huge, an exponent, a doubled point, Arabic digits, a decimal comma): no NaN, nothing scrolling sideways, no errors.
- Checked: 3 new app tests, app 685 and a typecheck; in the browser, "1e6" and 31 February turned down with their messages, and "19,99" saved as A$19.99.

## Update 286 · The phone's Menu button says "Menu" off the tabs, not "Menu. On Menu"

*25 Nov 2026 · `b106872`*

With the sidebar chosen on a phone, the Menu button at the foot reads out the tab you're on ("Menu. On Home"). On a page over the tabs (Appearance, a gym, Progress) it read "Menu. On Menu". It now says just "Menu" there; the words beside the icon are unchanged (the tab's name, or "Menu").

- Also clicked through Appearance → Layout at 1280: Tab bar (the sidebar goes, the choice is kept after a reload, **Use automatic** appears), Use automatic (the sidebar comes back, the link goes), Sidebar; no errors.
- A full workout driven in the browser: a template started, two sets ticked, Finish and Finish anyway, the summary with its record; nothing in the console (the test workout deleted after).
- Checked: app 682 tests and a typecheck; the Menu button's label on Home and Appearance at 390.

## Update 285 · GymPal and the README catch up with the newest features

*25 Nov 2026 · `94cf2b9` and `25b8f80`*

- **GymPal's guide** (apps/server/src/gymPalGuide.ts), which its answers come from, said the tab bar was the default and had nothing on several new features. It now covers:
  - the layout: automatic until chosen (the sidebar on the website on a computer), Tab bar or Sidebar;
  - **Calendar**, and changing a workout's day and start time;
  - **timed and distance sets** (a time typed as 45 or 1:30, or the stopwatch; carries by weight and metres; Longest yet and Furthest yet);
  - the **Feed** and **Head to head**;
  - **Welcome back** after signing in again;
  - what counts as a **week in a row** (a week, Monday to Sunday, with a workout; this week counts once you've trained; Pro's streak freeze), as the app counts it.
- **Starter questions** on Calendar ("How do I move a workout to another day?", "What counts as a week in a row?") and the Feed ("Who can see my workouts?", "What is Head to head?"), which offered Home's before.
- **README and STATUS** describe the automatic layout.
- Checked: server 375 and app tests (GymPal's suggestions 4), typecheck. Real GymPal answers still need an OpenRouter or Groq key on the server.

## Update 284 · The limited version never asks for an account; console sweeps as a free user and on the limited website

*25 Nov 2026 · `0efb96f`*

- **Limited means no account needed, always.** The limited website has no server, so it can't sign anyone in. It relied on a second setting (`EXPO_PUBLIC_ACCOUNT=optional`, which netlify.toml and pages-build.sh both set) to skip the sign-in screen; a limited build without it opened on a sign-in form that couldn't work. lib/accountRule.ts now treats the limited version as account-optional by itself. The live site was set up correctly, so nothing changes there.
- **Console sweeps**, no new faults: every main screen again as a free account at phone width (Pro locks and prompts), and the limited website at phone width, run without the account setting (19 screens, Home, Explore, a gym, Workout, Progress, Templates, Timer, Plates, 1-rep max, Collection, Pro, the Terms, Exercises, My workouts, Calendar, Machines). The only message anywhere is OpenFreeMap's own map style on Explore.
- On a computer the limited website now opens with the sidebar (Update 279's default): Home, Explore, Saved, Profile and Appearance.
- Checked: app 682 tests and a typecheck; the limited website opened on Home and Explore's map at 1280 and 390 without the account setting.

## Update 283 · A broken address is a 400, not a server error

*25 Nov 2026 · `b1d070f`*

Probing every route that takes an id in its address found a second shared fault: an id with a broken %-escape (`/api/gyms/%E0%A4%A`) made the route's `decodeURIComponent` throw, so 22 routes (a gym, its reviews, photos, reports, owner, Google page, icons; a country pack; avatars and photos; the feed, head to head and a friend's cards) answered "Something went wrong on the server." (500).

- apps/server/src/app.ts: before routing, any API address with a part that doesn't decode is refused with "That address isn’t valid." (400). The website's own files already handled this (web.ts).
- The server test from Update 282 now also sends three broken addresses.
- Checked: 600 requests with odd ids (broken and stray escapes, encoded dots and slashes, a 5,000-character id, a null byte, accents, an emoji, a quote) to every read and write route with an id; 732 with nonsense query values (empty, letters for numbers, NaN, huge numbers, 3,000 characters) to every read route: no server errors. Server 375 tests and a typecheck.

## Update 282 · The server answers a malformed request with a 400, not a server error

*25 Nov 2026 · `9aa01bb`*

Sending each create and update route odd bodies on a local server found one fault shared by 24 routes: a body of `null` (valid JSON) reached handlers that read fields straight off it, so reviews, photos, members' reports, friends, comments, moderation, workouts and more answered "Something went wrong on the server." (500) where a 400 belongs. A bare string did the same on editing a workout.

- apps/server/src/app.ts `readJson`: a body that's a bare null, string, number or true/false is refused with "The request body should be a JSON object." (400). Objects and lists go through as before, and an empty body is still `{}`.
- A new server test sends null, a string, a number and true to five routes, and broken JSON to one.
- Checked: 378 malformed requests to every create and update route (null, lists, lists of nulls, strings, numbers, objects with wrong types, not JSON), and the sign-in and sign-up routes with no account: no server errors; server 375 tests and a typecheck. The app's own requests always send objects, so people using GymGO never sent these; it closes a way to fill the server's error log.
- The server's route list (its header) gained the monthly challenge routes; all 114 addresses the app calls are listed, and the 61 documented reads all answer on a local server.

## Update 281 · Moderating a review with no aspect ratings no longer crashes the phone apps

*25 Nov 2026 · `8a42cb9`*

A sweep of the browser console across 37 screens found one real fault. In the moderation queue, a review that rates no aspects (equipment, cleanliness and so on) put an empty line, `''`, straight into the layout. The website only warns about that; the phone apps stop with "Text strings must be rendered within a <Text> component", so a moderator on a phone would hit the crash screen on the first such review.

- components/AccountContent.tsx: the aspects line is shown with a ternary, so nothing is rendered when it's empty.
- **scripts/jsx-empty-text.cjs**, new: finds every `{a && <X/>}` whose `a` is a string or number (so `''` or `0` would be rendered). It finds this one in the old code and none now. Run it with `node scripts/jsx-empty-text.cjs`.
- The sweep's only other message is the map's own style (OpenFreeMap) reading a missing number in its data on Explore: harmless, and not GymGO's code.
- Checked: the console sweep over 37 screens (Home to Moderation and Welcome back), Moderation clean after the fix; app 682 tests and a typecheck.

## Update 280 · A friend's deleted workout no longer shows the crash screen

*25 Nov 2026 · `1f56a77`*

The hooks check (HANDOFF, 20 Nov) found one hook placed after an early return, in a friend's workout page (app/feed/[id].tsx): the "Save to my workouts" state was declared below the return for a workout that's gone. So opening a workout that was deleted, hidden or no longer shared (an old link, or a notification) showed the crash screen ("Rendered fewer hooks than expected") in place of "This workout isn’t shared with you".

- The state is declared with the others at the top, before that return.
- Checked: the hooks check over every app file is clean; reproduced in the browser at /feed/no-such-workout: the crash screen with the old code, the message with the fix; app 682 tests and a typecheck.

## Update 279 · The sidebar is the default on the desktop website; four decisions settled

*25 Nov 2026 · `d902c1f`*

You asked for the sidebar to be the default on the website on a computer.

- **Layout is now automatic until you choose**: the sidebar, open down the left, on the website from 960 points wide (a computer); the tab bar on a phone, in a narrow browser window and in the phone apps (an iPad included). Appearance → Layout still shows Tab bar and Sidebar, with the one in use ticked and "Automatic: the sidebar on a computer, the tab bar on a phone. Choose one to use it everywhere." Picking one keeps it on every screen size, and **Use automatic** goes back.
- The choice is stored under a new name (`nav`). The old setting couldn't tell a tab bar someone chose from the old default, so a chosen sidebar carries over and everyone else starts on automatic.
- Code: lib/navLayout.ts `NavChoice` and `layoutFor`; `navMode` takes whether it's the website; lib/themePrefs.ts `nav` (with the old `layout` read once).
- Checked: 2 new app tests (automatic at each width, the website and the phone apps; the old setting read), app 682 tests and a typecheck; in the browser, the sidebar on Home at 1280 for a new visitor and for an old stored tab bar, the tab bar at 390 and 900, a chosen tab bar kept at 1280, and Appearance's Layout in both states with axe clean.

**Your four decisions** (you said "you choose", so the recommended ones):

- **Move buttons on Home widgets** stay off by default (Appearance → Motion turns them on). Screen readers and the keyboard keep Move up and Move down.
- **Refunds and disputes** are emailed to you and change nobody's access (Update 276). You end access in Stripe when you want to.
- **Long gym names** in Explore's list keep the three-line limit, with the full name read out and on the gym's page.
- **No Google Places key** for now: the free Google map, listing and Street View stay.

## Update 278 · Checked after the rewrite: small screens, and code Safari and Firefox would trip on

*24 Nov 2026 · `471c19c`*

No change to the app; a record of what was checked.

- **Text cut short at 320 points wide**, on 29 screens with a real account (Home, Explore, Saved, Profile, Pro, Collection, Friends, Feed, Machines, Reminders, Photos, Timer, Spend, Leaderboard, Calendar, Account, Appearance, Progress, Templates, Programme, 1-rep max, Plates, Monthly report, Challenges, Trips, Workouts, Report a problem, a gym's page, Build with GymPal): nothing new cut short by the rewording. The two hits are meant: a very long gym name on Explore's list stops at three lines, as card titles do, with the full name read out and on the gym's page; and the Max badge's hidden "GymGO" for screen readers.
- **Safari and Firefox, read through the code** (neither browser can run here): every frosted surface has Safari's prefix (written in liquidGlass.web.ts, added by React Native Web for style objects); the refraction filter is already only for Chromium; `text-wrap`, `text-box` and `interpolate-size` are extras that other browsers skip without breaking anything; and every date is built in a form Safari reads (`2026-11-24T12:00:00`). Nothing needed fixing. Trying both for real is still open.

## Update 277 · Refunds in your data export; the new screens checked

*24 Nov 2026 · `640df97`*

- **Download my data** now includes any refunds and disputes on your payments (`refundsAndDisputes`: kind, charge, amount, reason, status, deadline), beside your subscriptions. The refund test checks it.
- The other session's Calendar and Welcome back screens checked with axe at 390 light, 320 dark and 1280 dark: no violations, nothing scrolling sideways, no errors, and the wording passes the plain-words scan. Both looked right with a real workout log (22 workouts this month, a 7-week streak, 15 gyms collected).
- The workout log's error says "Couldn’t connect to GymGO to load your workouts." (it read "Couldn’t reach the GymGO server for your log.") and "Couldn’t load your workouts. Try again."
- Checked: server 374 and app 680 tests, typecheck.

## Update 276 · Refunds and disputes reach the owner

*24 Nov 2026 · `77e7d12`*

Until now the server ignored Stripe's refund and dispute events, so the owner would only find out in Stripe's dashboard. Now:

- `charge.refunded`, `charge.dispute.created` and `charge.dispute.closed` are kept in a new `stripe_money_events` table (once per event, like every webhook) and emailed to the bug-report address: the amount, the charge, the GymGO account when the customer is known, and for a dispute its reason and the date evidence is due, with a link into Stripe's dashboard.
- **Nobody's access changes.** A refund doesn't cancel a subscription, and the email says so. Whether a refund or a lost dispute should end Pro or Max, or void an unused gift code, is left for the owner to decide (docs/PAYMENTS.md).
- `stripe:setup` lists the three events to add to the webhook endpoint.
- Checked: 3 new server tests (a full refund emailed once and Pro kept; a dispute with its deadline, then lost; a partial refund's email), server 373 tests, typecheck.
## Update 275 · A workout calendar, and moving a workout to the day it was

*24 Nov 2026 · `4bda093`*

You asked for more Hevy features. Two more, in GymGO's own look:

- **Calendar** (Progress → Calendar, or Profile → Calendar). It shows every day you trained, month by month.
  - Each month is a grid, Monday first. Days you trained are filled in violet, with a dot for each workout when there were two or more. Today has a ring.
  - At the top: your weeks in a row, workouts this month and workouts this year.
  - Tap a day you trained to see its workouts (time, length, sets and gym). Each one opens in full.
  - Tap a month's name for its monthly report.
  - It shows six months at a time, back to your first workout. **Show earlier months** adds six more.
  - A workout belongs to the day it started, so a late session that runs past midnight stays on the day you began it.
- **Change a workout's day and start time** (Edit workout).
  - Pick the day on a small calendar. Days after today can't be picked.
  - Type the start time as 6:30 pm, 6.30pm, 6 pm or 18:30.
  - It can't finish in the future. If it would, it says "That would finish in the future. Pick an earlier day or time."
  - Records, streaks, the calendar and the monthly report follow the new day. If you don't change the day and time, they stay exactly as logged.
  - Forgot to log a workout? Log it now, then tap **Edit workout** on the summary when you finish and set the day it really was. That link is new on the summary.
- Checked:
  - domain 205, server 371 (1 new, for moving a workout) and app 680 tests (12 new for the calendar and start times), typecheck and lint;
  - in a browser: the calendar at 390 light and 1280 dark; tapping a day lists its workouts, which open; a month's name opens its report;
  - in a browser: a workout moved to Friday 20 November at 6:30 pm, then shown on that day in the calendar; a time in the future refused; the edit screen at 320 wide.
- Not checked: a real phone.

## Update 274 · Welcome back, and a smoother tour

*24 Nov 2026 · `34457ac`*

You asked for a welcome back screen, and for the animations to be better and cleaner.

- **Welcome back.** Signing in again now opens a short recap before Home (a new account still gets the tour). It shows:
  - your photo and "Welcome back, [name]", the words arriving one by one;
  - one line on when you last trained, such as "You last trained yesterday." or "It’s been a while. Start with something light.";
  - this week against your weekly goal, as a ring and a count;
  - your weeks in a row;
  - your last workout, which opens it;
  - your collection, or "Check in at a gym to get your first card" if you don’t have one yet.
  - **Continue** goes on to where you were going (a link you opened before signing in) or Home. **Start workout** goes straight to Train.
  - The cards arrive in turn. With Reduce Motion they’re simply there. GymPal’s button stays out of the way on this screen.
- **A smoother tour:**
  - on the web, the tour follows your scrolling through a light spring, so a mouse wheel’s jumps play as one smooth movement (phones already follow your finger directly);
  - each part now settles back and fades a little as you scroll past it, so one part hands over to the next with no hard cut;
  - the opening takes a little longer, its badge fades later, and the statement slides up over it;
  - the statement’s words rise slightly as they light up;
  - "Scroll to explore" only shows when there’s room for it under the tagline;
  - with Reduce Motion, the opening is shown still (it was blank).
- **Plain words** (docs/COPY.md) on the tour, its questions, sign-in and sign-up. For example:
  - "Pick muscles and get a workout for the gym’s kit." (it read "Tap the muscles you want, tick off your sets, and watch your records climb.")
  - "Free covers one country. Change it any time in Profile."
  - Goals read "8 to 15 reps, 60 to 90 s rest", "Heavier weights, sets of 5, longer rests" and "15 to 20 reps, short rests".
  - "Location is off for GymGO. Turn it on in Settings, or search by place."
  - "A steady routine with rest days." (it read "A good, steady routine, with rest days between.")
  - The tour’s shelf: "Starts when you tick a set.", "A trophy every time you beat one.", "A stopwatch for planks. Distance for carries."
- Checked:
  - domain 205, server 370 and app 668 tests (3 new for the recap), typecheck and lint;
  - in a browser, signing in as the dev account opens Welcome back with its week, streak, last workout and collection, and Continue goes on (light at 390 and dark at 1280);
  - the tour scrolled through again after the changes, with no console errors.
- Not checked: a real phone.

## Update 273 · Plainer words, part 7: sentences the scan missed

*24 Nov 2026 · `731ab49`*

The string scan behind parts 1–6 reads string literals and short JSX text, so it missed longer sentences that wrap across lines in a screen's JSX. A second scan over those lines found 26 more, mostly semicolon chains and "never" asides:

- "A visit counts once a day when you check in at the gym. Your location is checked on your phone and isn’t sent anywhere." (it read "…at the gym; your location is only compared on the phone, never sent.")
- Timer: "Tabata is 20 seconds as hard as you can, then 10 seconds rest, for eight rounds. EMOM means every minute on the minute. Do your reps, then rest until the next minute starts."
- Leaderboard: "A gym counts after your first check-in, and visits count once a day." (it read "…once you’ve checked in there; a visit, once a day.")
- Accessibility filter: "Each feature is checked separately, so an accessible entrance doesn’t mean accessible bathrooms. Gyms with no record show as unknown." Unknown still isn't "no".
- Spend, the crash screen, a saved workout's kit marks, progress photos, the weekly recap picture, Not found, gym tags, trips, splits, measurements, Customise Home, the weekly chart, member equipment, gym claims and the server-away card.
- Home's Machines tile: "Find one nearby" (it read "Who has what").
- Checked: app tests 665 and a typecheck; Timer, Spend, Leaderboard, Collection (with its "How cards work" box and the empty state for a new account) and Home opened in a browser with no errors, each showing its new words.

## Update 272 · Plainer words, part 6: error messages and the password email

*24 Nov 2026 · `6ba88c4`*

The sixth part of the rewrite (docs/COPY.md) covers the messages the server sends back to the app, the password reset email and pages, and the app's own connection errors. For example:

- Limits say what happened: "You’ve reached today’s limit for photos. Try again tomorrow." (it read "That’s a lot of photos for one day.") and "Too many searches. Try again in a few minutes." The repeated "That’s a lot of…" is gone.
- GymPal's limits: "You’ve used all 100 questions for today. Max includes 300 a day." (it read "That’s your 100 questions for today. GymGO Max has 300 a day.")
- "This is a demo gym, so reports can’t be added." (it read "This is an invented demo gym, so there’s nothing real to report.")
- "Prices from more than two years ago are too old to help others." (it read "That was over two years ago; prices change, so it wouldn’t help anyone now.")
- "Enter your birth month and year to create your account." (it read "Before GymGO makes your account: which month and year were you born?")
- "Couldn’t connect to GymGO. Check your connection and try again." when the server can't be reached, and "Couldn’t save. Try again." as the fallback.
- The reset email: "We got a request to reset the password for your GymGO account. Use this link within 30 minutes to choose a new one." and "If you didn’t ask for this, you can ignore this email. Your password won’t change." (it read "Someone (we hope you) asked…").
- "Free accounts can save up to 10 gyms. Pro has no limit." The facts and codes behind every message are unchanged.
- Checked: server 370, app 665 and domain 205 tests; app and server typecheck.

## Update 271 · Plainer words, part 5: profile, collection, friends and gym owners

*24 Nov 2026 · `59959b3`*

The fifth part of the rewrite (docs/COPY.md) covers Profile, Account, Appearance, the collection and card pages, Friends and the feed, reports, filters, Google's listing, gym owners and moderation, weather, notes, photos, reminders and the member reports on a gym's page. For example:

- "Check in at this gym to collect its card. Open its page at the gym and tap I’m here." (it read "A gym’s card is yours once you check in there: open its page at the gym and tap I’m here.")
- "Send this code to a friend. Once you accept their request, you can see each other’s cards, but not when you trained." (it read "…They add it, you accept, and you can see each other’s cards. Never the days you trained.")
- "Friends can see all your workouts, including past ones. They see exercises, sets, time, records and any gym you tag. Your notes stay private."
- "Couldn’t connect to GymGO. Your check-ins are saved on this device and will sync later." in place of the lines about the server being reachable.
- "When guests can visit, which can differ from member hours." Hours for guests are now "Guest hours" everywhere a gym owner or moderator sees them, and 24-hour opening reads "24/7".
- "Gyms that list the machine as unavailable are left out. Member reports count when more say yes than no. Machines can move or break, so check before you go."
- A price no longer published reads "(now unknown)", which is still unknown and not free.
- GymPal is "it", not "him", in Account and Appearance.
- Checked: app tests 665 and a typecheck; Collection, Friends, Feed, Machines, Reminders and Photos open with no errors and show the new words.

## Update 270 · Plainer words, part 4: training

*24 Nov 2026 · `5bf7438`*

The fourth part of the rewrite (docs/COPY.md) covers Workout, Progress, the exercise pages, templates, programmes, the plate and 1-rep max calculators, the monthly report, lifetime stats, trips, challenges and Head to head. For example:

- "Popular training plans, ready to start. Each one rotates through its days." (it read "Well-known plans, ready to go. Each takes turns through its days: start one and you get the day after the last you did.")
- The template summaries: "Two full-body days, A and B, with a rest day between. A simple way to learn the main lifts."
- "Easier week. Half the sets at about 10% lighter, so you recover."
- "Streak freeze used for the week of 3 Nov. Your streak continues."
- "Estimates aren’t reliable above 12 reps. Try a heavier set." (it read "Past 12 reps the estimate isn’t worth much, so there isn’t one.")
- "This gym’s equipment hasn’t been listed by the gym or its members, so most of it is unknown."
- "Couldn’t delete it. Try again." everywhere ("just now" is gone).
- "Stored on this device only" for body measurements.
- Checked: app tests 665 and a typecheck; the screens' layout is unchanged, as only the words are.

## Update 269 · Plainer words, part 3: finding gyms and the gym page

*24 Nov 2026 · `8f8b993`*

The third part of the rewrite (docs/COPY.md). The meaning is the same throughout: unknown stays unknown, and nothing reads as a yes or no it isn't.

- **The visit answer's reasons** (packages/domain access.ts, offers.ts and money.ts), for example:
  - "We haven’t confirmed this gym is still open" (it read "…is currently trading");
  - "Members have 24-hour access, but guest hours may differ" (it read "…which does not establish guest entry");
  - "Guests aren’t allowed in at that time";
  - "Booking is required, usually 48 hours ahead. Your visit is 20 hours away, so check with the gym first";
  - "A member needs to sign you in";
  - "Guest hours were last checked 62 days ago and may be out of date";
  - "Over your budget".
  - The labels are now "Guests welcome", "Check first", "Closed to guests then" and "Unknown".
- **The gym card and page**:
  - "This gym doesn’t publish a visit price. Ask when you call."
  - "This gym doesn’t publish its equipment list."
  - "From OpenStreetMap volunteers and not checked by GymGO. Anything not listed is unknown."
  - Demo listings say plainly what isn't real.
- **Busy reports** read "No reports in the last hour" and "3 reports in the last hour. Shown once there are 3."; **photos** read "Your photo will appear here once a moderator approves it"; **reviews** read "Every review is checked by a moderator".
- **Explore and Compare**: "Showing the 30 gyms nearest the centre. Zoom in to see more.", "Gyms in Japan need GymGO Pro", "Select gyms from your saved list, or tap Compare on a gym’s page".
- Checked: a real and a demo gym page in a browser (axe clean); domain 205, server 370 and app 665 tests, their wording updated to match.

## Update 268 · Plainer words, part 2: Home, and lines used across the app

*24 Nov 2026 · `715e60d`*

The second part of the rewrite (docs/COPY.md):

- **Lines used across the app** (lib/copy.ts):
  - visit answers: "Good to go: Matches everything you need", "Call first: Some details couldn’t be confirmed", "Not a match: Missing something you need";
  - result counts: "9 gyms nearby · none confirmed at 7 pm", and "No matches. Remove a filter";
  - connection errors: "Can’t connect to GymGO. Check your connection and try again";
  - location notices: "Couldn’t find your location. Search a suburb or city instead";
  - map searches: "Searching OpenStreetMap for gyms around Tokyo…";
  - member reports: "2 members reported it closed in the last 6 months";
  - empty states.
  - The missing-photo label is now exactly "No photo supplied", as you asked for earlier.
- **Home and its widgets**: "Sign in to track your workouts. It’s free.", "Your last workout will appear here.", "Based on when you last trained each muscle." (it read "when, not whether a muscle is ready"), "Gyms in Japan need GymGO Pro", "Your Home screen is empty. Add some widgets.", and the widget gallery's descriptions.
- Checked: Home and Explore in a browser (axe clean); app tests 665, their wording updated to match.

## Update 267 · Plainer words, part 1: the Pro and Max page

*24 Nov 2026 · `f879c12`*

You said the app's text read as AI-written ("300 a day and he remembers twice as much of the chat" is the giveaway) and asked for all of it to be redone. The rules for the rewrite are in **docs/COPY.md**, from research into common tells of AI writing: no "X: Y" colon chains, no "not X, but Y" contrasts, no stock words or over-reassurance, no narrating how the app works, GymPal called "GymPal" rather than "he", and short, benefit-first lines like a well-made app's. Facts don't change: prices, limits and promises read the same, only shorter. This first part covers the Pro and Max page.

- **The plan tables**: every row is a short feature name and short cells ("Custom exercises": "GymGO’s library" / "Add your own, with records"; "Progress charts": "Records and history" / "Charts for every exercise").
- **Max**: "AI workout builder", "AI coach notes", "Higher GymPal limits" (300 messages a day and longer conversations) and "Max badge". It doesn't say "more intelligent models", because Max uses the same models as Pro. That would only be true with a paid model, which is your call.
- **The line under the title** when a Pro feature sent you here is now one plain sentence ("Free compares 2 gyms at a time. Pro compares up to 4."). So are "Free with an account", the trial ("Try Pro free for 3 days" / "Then A$3.99 a month. Cancel anytime."), the renewal terms by the button, and the fine print. The facts are the same: prices, the trial, the 14-day refund and what Stripe sees.
- **Gifts, Build with GymPal and the coach note** read the same way: "Build workout", "Start workout", "Get coach note", "Uses 1 GymPal message".
- Stripe's product descriptions (shown on its checkout page) are shorter, and take effect the next time `stripe:setup` runs.
- Next: Home, Explore and gym pages, Workout and Progress, Profile and settings, friends and the feed, GymPal and the errors.
- Checked: the Pro page in a browser (nothing cut off, axe clean); domain 205, server 370 and app 665 tests.

## Update 266 · GymGO Max: workouts GymPal builds for you, and a coach's note after each one

*24 Nov 2026 · `478f069`*

The second round of GymGO Max (Update 264 made the plan): two AI features, on the same models as the GymPal chat, each run only when you ask.

- **Build with GymPal** (Workout → Start another way, or the new page `/ai-workout`):
  - Say what you'd like ("45 minutes, upper body, dumbbells only"), or tap one of four ideas. GymPal builds the workout from GymGO's exercises and your own: names, sets × reps (a time for a plank, a distance for a carry) and rest, with a sentence on why it's built that way. **Start this workout** opens it as a workout in progress, where you can swap, add or take out exercises as with any other.
  - **Use my training log** lets him build on your latest workouts (exercises, sets and weights; never your gyms or notes). It's off unless you switch it on, as in the chat.
  - What comes back is read strictly (apps/server/src/gymPalMax.ts). Only exercises the app offered, each once and at most 10, 1 to 6 sets, reps that read as reps, a time or a distance, and rest from 0 to 300 seconds. Anything else is left out, and an answer with nothing usable asks you to try again.
- **Coach's note** (on the summary when you finish a workout): **Ask GymPal for a note**, and he looks at that workout beside your recent ones and says, in two to four sentences, one thing that went well and one to aim for next time, in your own numbers. He's told never to invent a number or make health claims, and he's never sent the gym or your note. Without Max, a quiet line says what it is and leads to Max.
- Each one counts as one of the day's 300 GymPal questions. The Pro page's Max card lists both (`MAX_FEATURES`), and GymPal's guide knows about them. Free and Pro get "part of GymGO Max", and nothing is asked of the models.
- Checked:
  - Server tests 370: 10 new, for reading requests and answers strictly, Max only, the exercise list and the log only when allowed, and a note on your own workout only, without its gym or note. App 665.
  - In a browser, with GymPal's answers stood in for (this server has no GymPal key): Build with GymPal (light at phone width, dark at desktop width) through to the workout started, the summary's coach's note, the screen as Free sees it, and the row under Start another way. axe was clean on all of them; the test workout was deleted after.
- Not checked: the real models' answers. Before selling Max widely, ask a few through `pnpm gympal:check` or the app with your key.

## Update 265 · A welcome tour you fly through

*24 Nov 2026 · the commit "Welcome tour rebuilt as a film you scroll: fly-through, lit words, 3D map, a pack opened, a shelf, real numbers"*

You asked to make the onboarding look "way better" and its scroll animations "revolutionary". The tour is rebuilt (components/tour/), still in GymGO's own look, with nothing in it that's a real gym:

- **The opening:** the badge and "Welcome to GymGO", with a door, a lifter and a card floating round it. Scrolling flies you through it: the badge grows past you, the three scatter outward, the name lifts away. The next part slides up over it, so there's no gap.
- **The statement:** "Find gyms that will let you in, and what a visit costs. Know what to do when you get there. And collect a card for every gym you visit." Its words light up one after another as you scroll, the key ones in violet.
- **Find:**
  - the map starts tilted back like one on a table, and lands flat as you scroll;
  - pins drop with a bounce;
  - the view zooms in on one gym while the others dim;
  - what it publishes (or "Call first") rises up from below.
- **Train:**
  - the bench press card swings up into place;
  - its sets tick off as the **weight lifted counts up** (1,460 kg);
  - "Heaviest yet" lands with a gold glint;
  - the rest timer fills as a **ring of dots**.
- **And more**, a new part: six tiles (Rest timer, Plate maths, Your records, Timed sets, Friends' feed, Monthly report) on a **shelf that slides sideways as you scroll down**. The middle tile is forward and the rest turned a little away.
- **Collect:**
  - three cards **fly in face down** (GymGO's back) and fan out;
  - they **turn over one after another**, like opening a pack, the Legendary one last;
  - a band of light crosses it, then the tiers.
- **In GymGO today**, a new part: **96** exercises, **63** cities built in, **198** countries and **5** rarities. They're counted up as they come into view, and read from the app's own lists, so they stay true as they grow.
- **Chapters:**
  - **Find · Train · Collect** across the top, each filling as you go through it; tap one to jump there.
  - The background **washes in each chapter's colour**: green for Find, violet and blue for Train, gold and rose for Collect.
- **Getting around:**
  - **Next** plays the next part; Skip goes to the questions; the end leads on to them as before.
  - With Reduce Motion nothing moves, holds or counts: the opening shows as it opens, the shelf becomes a grid, and every part is shown finished.

- Checked: every package's tests, lint and typecheck pass (app 665, server 360, domain 205). In a browser against the local server:
  - 25 screenshots down the tour at 390 light, then 1280 dark and 320 narrow;
  - Reduce Motion at 390;
  - Next through all eight parts to Set up GymGO, then the questions;
  - the question flow again, answers saved;
  - no console errors.
- Fixed while checking: a blank beat between the opening and the statement (now it slides up over it), "Scroll to explore" over the tagline on a short screen (now only where there's room), the chapter strip on a narrow phone (the badge alone there), and Reduce Motion's opening (it showed as flown past, so blank).
- Not checked: on a phone, where a part holds by moving with the scroll on the UI thread, and the cards turn with `backfaceVisibility` (each face also hides itself at the halfway point, in case).

## Update 264 · GymGO Max: Pro, with more from GymPal and a badge; Duo taken out

*24 Nov 2026 · `a71b9ef`*

You asked for a Max subscription at about A$10 a month, with no Duo or family plan. Pro stays everything it is, and Max adds AI features and badges. This is the first of two rounds: the plan itself is here, and the AI features come next.

- **The plans now**: Free; **Pro** at A$3.99 a month or A$29.99 a year (US$2.99 / US$19.99), as before; **Max** at **A$9.99 a month or A$79.99 a year** (US$6.99 / US$54.99). Max is everything in Pro, plus:
  - **GymPal**: 300 questions a day (Pro 100, Free 20), and he remembers twice as much of a chat (60 messages to Pro's 30);
  - **a Max badge** by your name where friends see it: on your workouts in the feed, by your comments, in their friends list and in monthly challenges. A screen reader hears "GymGO Max" after the name.
- **The Pro page** has a Pro / Max choice above the yearly and monthly prices, and a card saying what Max adds, outlined when it's chosen. The Subscribe button says "Subscribe to Max" and the renewal terms name the plan. Max's card only lists what's built, and grows as the AI features come.
- **Pro to Max is a switch, never a second subscription.** A Pro subscriber gets a **Switch to Max** button, which opens Stripe's page for their subscription; the difference for the days left is charged or credited. Checkout refuses a second subscription and says where to switch. PayPal can't switch in place, so a PayPal subscriber is told to cancel Pro there and choose Max once it ends.
- **Duo is gone**: its prices, its routes, the "Your Duo" card, its line in GymPal's guide and its question in GymPal's suggestions. In the Stripe setup, the Duo product is taken off sale.
- **Stripe setup** (`stripe:setup`): makes the Max product and prices, and turns on switching between Pro and Max (and monthly and yearly) on Stripe's subscription page, updating the settings it made before. **PayPal setup** makes Max's plans in place of Duo's.
- **Not done, and yours to decide**:
  - the Terms and Privacy Policy still describe Pro Duo; docs/PAYMENTS.md has the wording that would change. Friends seeing that you're on Max is new, and the policy should say so.
  - GymPal runs on OpenRouter's free models, which have a daily limit for the whole account, so a few busy Max subscribers could use it up.
- Checked:
  - Server tests 360, including a new Max test: its prices, checkout, the switch and already-subscribed answers, GymPal at 300 and back to 100 after switching to Pro, and the badge appearing and going for a friend. Domain 205; app 665.
  - In a browser: the Pro page as a Free account with Max chosen (light and dark, phone and desktop) and as a Pro account, and the friends list with a friend on Max (a test row, removed after). axe was clean on all of them.

## Update 263 · The welcome tour asks what it needs to, on a background of soft colour

*24 Nov 2026 · the commit "Welcome tour: quick questions, a background of soft colour; sign-in on frosted glass"*

You asked to keep making the onboarding nicer, to ask the necessary questions during it, to give it a nice background, and to make the login and sign-up page look better.

- **A few quick questions, after the story.** **Set up GymGO** at the end of the tour (or Skip, from anywhere in it) leads to them. Each has its own screen, and each can be skipped. GymGO only asks what it uses:
  1. **Where do you train?**
     - Your country, with the one your phone or browser is set to suggested first. There's a search for any other.
     - It's saved as your country, so Home doesn't ask for it again.
  2. **What do you train for?**
     - Get stronger, Build muscle or Endurance, each saying how its sets and rests are planned.
     - **New:** the workout builder and programmes now start on your answer (you can still pick another). An Endurance answer starts programmes on Fitness, and your days a week sets a programme's days, kept to 2 to 4.
  3. **How many days a week?**
     - 1 to 7, with a week drawn under it of the days it might fall on (3 is Monday, Wednesday and Friday) and a word on it.
     - It sets the weekly goal Home and Progress count towards.
  4. **Find gyms near you?**
     - Asks for your location there and then, saying why, and that your exact location stays on your device and is never saved or sent to GymGO (as lib/location.ts does).
     - Only while location is on in Settings.
  
  Then "You're all set", with your answers as chips, and **Get started**. A bar at the top shows which question you're on, Back goes to the last one, and Skip leaves an answer as it was.
- **A background of soft colour** (components/Aurora.tsx), behind the tour, its questions and the sign-in page:
  - four wide pools of colour (GymGO's violet, sky blue, rose and mint) drifting slowly;
  - pale in light mode, deep in dark;
  - on the tour they slide a little as you scroll, for depth;
  - still with Reduce Motion;
  - no pictures or photos, only colour.
- **Sign in and sign up:** the form sits on frosted glass over the colour, on a phone and beside the panel on a wide screen.
- **The tour's end** now reads "Let's set you up" and leads to the questions.

- Checked: every package's tests, lint and typecheck pass (app 665, with 2 new for the week drawing; server 360; domain 205). In a browser against the local server, at 390 light and 1280 dark:
  - a new test account made, the tour skipped to the questions;
  - Australia suggested (an Australian locale), New Zealand searched for, then Australia picked;
  - Get stronger, 4 days, then location allowed (a stand-in location in Sydney), which showed "Found you";
  - the summary, then Get started to Home with no country question;
  - the saved settings read back (`AU`, `strength`, `4`);
  - the tour and sign-up in dark mode.

  The test caught the week drawing putting 3 days on Monday, Wednesday and Saturday; it now uses the usual patterns.
- Not checked: on a phone (the location prompt there is the phone's own).

## Update 262 · Your server can keep itself up to date

*24 Nov 2026 · the commit "deploy/autoupdate.sh: the server updates itself, hourly, once GitHub's checks pass"*

You asked whether app.gymgo.site updates by itself (it doesn't: gymgo.site does, from GitHub; your Oracle server runs what it last built), and then whether I could do it automatically. I can't reach your server from here, so it can now do it itself:

- **`bash autoupdate.sh --install`**, run once on the server in `~/GymGO/deploy`, sets an hourly check (at 23 minutes past). A check:
  - does nothing unless the branch has a newer commit;
  - waits until GitHub's checks on that commit have finished, and goes ahead only if none failed;
  - only fast-forwards, so a server with changes of its own is left alone;
  - then runs `update.sh` (the new code, rebuilt, data kept).
- What it did goes to `~/gymgo-autoupdate.log`. `--remove` stops it, and installing twice doesn't add it twice. Your own cron entries are left as they are.
- It reads GitHub's public API for the checks, so it needs no key (the repository is public).

- Checked, here: dry runs in a scratch copy of the repository, one behind (it would update), up to date (silent) and with a commit of its own (left alone); install twice and remove with a stand-in `crontab`, the server's other entry kept; GitHub's checks API answering for the latest commit.
- Not checked: on your server, where `cron`, Docker and `sudo` are real.

## Update 261 · A welcome tour you scroll, and a better sign-up page

*24 Nov 2026 · the commit "Welcome tour you scroll, as a product page; sign-up page with a brand panel and a password meter"*

You asked to make the onboarding look cool and interactive, with scroll animations like Apple's, and to upgrade the sign-up page.

- **The welcome tour is one page you scroll**, shown once after making an account, as a product page plays as you scroll:
  - **It opens big:** the badge settles in, "Welcome to GymGO" in large type, then "Find a gym. Train. Collect it." word by word. It drifts up and away as you start to scroll.
  - **Find:** this part holds on screen while your scrolling plays it.
    - Pins drop onto a map, green, amber and grey, each with a small bounce.
    - One grows as it's picked.
    - A card rises from below: "Lets visitors in", price of a visit and guest hours "Published", what to bring "Call first".
  - **Train:** a bench press card with the lifter moving.
    - The three sets tick off one by one, and "Heaviest yet" lands on the last.
    - The rest bar fills.
  - **Collect:** three cards (Common, Legendary, Rare) fan out from a stack.
    - The Legendary one rises, and a band of light sweeps across it.
    - The Bronze, Silver, Gold and Platinum tiers follow.
  - **The end:** "You're all set", and **Get started**.
- **Moving through it:**
  - A thin bar under the top shows how far through you are.
  - **Next** scrolls on to where the next part has played through, so it plays; **Skip** leaves at any time.
  - On a wide screen each part has its words on the left and its picture on the right.
  - With Reduce Motion on (the phone's, or Appearance's), nothing holds or moves: every part is shown finished, one after another.
- **Nothing on the tour is a real gym:** no names, prices or photos. The cards have bars where a name goes.
- **The sign-up page:**
  - **On a wide screen,** the form sits beside a deep violet panel. It has the logo, "Find a gym. Train. Collect it." ("Good to see you again." when signing in), GymGO's three things, and three sample cards drifting gently at the foot.
  - **On a phone,** the heading eases in, and making an account shows what's free with one: Save gyms, Log workouts, Collect cards.
  - **A password strength meter:** four bars and a word (Weak, Okay, Good, Strong). Length counts most, then a mix of kinds of character. A well-known password, or one with your name or email in it, is called weak. It's advice only: 8 characters is still the only rule.
  - Everything else on the page is as it was: the age question, the terms, Apple and Google, Forgot your password.

- Checked: every package's tests, lint and typecheck pass (app 663, with 3 new for the meter; server 360; domain 205). In a browser against the local server:
  - the tour at 390 light, 1280 dark and with Reduce Motion, screenshotted part by part as it scrolled;
  - Next stepping through all parts to Get started, then Home;
  - the sign-up page at 390 light, 1280 dark and 1440 light, in both modes;
  - the meter saying Strong and Weak;
  - no sideways scroll;
  - a new local test account made, which landed on the tour.
- Not checked: on a phone. There a part holds by moving with the scroll on the UI thread rather than the browser's `position: sticky`, so how smoothly it holds there is unseen.

## Update 260 · Text fields keep their box in Windows High Contrast; timed sets checked end to end

*24 Nov 2026 · `90d22e3`*

- **A set's weight, reps and time, and other tinted fields, lost their box in High Contrast.** Forced colours take away every fill. A field drawn only as a tinted box (a workout's set boxes, Edit workout's, measurements, plates, the 1-rep max calculator, adding a friend's code, Which gym?'s search) was left as bare words, or as a grey placeholder floating in the row. Now every text field has a one-pixel border in the text colour there, as Windows draws its own fields. Nothing changes with forced colours off: the rule only applies with them on.
- **Fields whose box is drawn round them** don't get a second box inside it: sign-in's fields, the map's search, the country search, GymPal's message box, and the search pills in Exercises, Add exercise and "borrow an icon". These are marked `FIELD_FRAME` (lib/theme.ts). In High Contrast, that view is outlined instead, and while its field has focus it takes a two-pixel ring in the system's highlight colour, the field's own outline giving way. Before, they showed focus only by a colour forced colours had flattened, so focus couldn't be seen there.
- **Timed and distance sets end to end**, which Update 258 hadn't covered. A plank (by the stopwatch, and typed) and a farmer's carry (typed, then from the placeholders) were logged, then checked on the summary ("2 s, 45 s"; "24 kg × 30 m"), Edit workout (TIME; KG × METRES) and each exercise page (Longest, Furthest and their charts). axe was clean on all four and the console had no errors; the test workout was deleted after.
- Checked in a browser with forced colours on, dark and light: a workout's set boxes, sign-in with the email field focused, Exercises with its search focused, and the map. A sweep of 19 pages' fields: every field has one box, and fields in a frame have none of their own. With forced colours off, borders are as they were.
- Not checked: Windows itself (this is Chromium's forced-colours emulation).

## Update 259 · The stopwatch, records and GymPal's answers are read out on the website too

*24 Nov 2026 · `39898a2`*

On the website, React Native's way of telling a screen reader something (`AccessibilityInfo.announceForAccessibility`) does nothing at all, so a few things a screen reader should have said never were. They now go through `useAnnouncer` (components/ui.tsx; Update 257), which speaks on phones as before and uses a hidden polite live region in a browser.

- **The workout**: a new record ("Heaviest yet on Bench press"), and warm-up sets added, are read out in a browser too.
- **The stopwatch on a plank or hold**:
  - starting it says "Stopwatch started: Plank, set 1";
  - stopping it says how long the set was ("Plank, set 1 done: 42 seconds"), with any record ("… Longest yet on Plank"). The same goes for ticking the set while its stopwatch runs.
  - While running it's a **timer** to a screen reader, labelled with the time so far in words ("stopwatch running, 42 seconds"), not "zero forty-two". It doesn't speak every second.
  - **Stop no longer drops focus.** The button goes once the set is ticked, and focus went with it, to the page itself. Now it moves on to what's next, the set's done box (lib/focusNext.ts, as elsewhere).
- **GymPal**: his answers, and the "waiting to be set up" apology, are read out in a browser too, from inside his panel; the wording is unchanged. His problem line ("GymPal couldn’t answer. Try again?") sits in a live region that's always there, as one that arrives with its words often isn't read.
- `spokenClock` (lib/training.ts): "42 seconds", "1 minute 5 seconds", "1 hour 2 minutes 5 seconds", tested.
- Checked in a browser: a plank by keyboard at 1280 (light) and 390 (dark). Each announcement was read from the live regions, focus landed on the done box after Stop, and axe was clean with the stopwatch running and with GymPal open. App tests 660; the iPhone and Android bundles build.
- Not checked: VoiceOver and TalkBack on a real phone.

## Update 258 · Checked: the new screens from Updates 248 to 256

*24 Nov 2026 · `f8ae3cc`*

The other session's recent work (the friends' feed, tagging the gym, sharing a workout as a picture, the Pro page's new ways to pay, the roomier Home and Progress's weekly bars) was put through the same checks as the rest of the app:

- **axe** on the feed, Which gym?, Share, GymGO Pro, Friends, Workout, Home and Progress, light and dark, phone and desktop: clean.
- **One heading for each page** to start from ("Feed", "Which gym?", "Share", "GymGO Pro" and so on); **labels match their words**; **nothing cut short** with text spacing turned up; **every target big enough** (WCAG 2.2's 24 points); **no console messages** beyond Reanimated's development note.
- **Curly quotes**: the app's new words have none straight. One fix: the email moderators get when a comment in the feed is reported said "friends' feed" with a straight apostrophe; it's curly now.
- Not covered here: the feed with friends' workouts in it (the test account's friend has logged none), and a workout in progress with a timed set.
- Server tests 360.

## Update 257 · The workout editor tells a screen reader where an exercise moved

*24 Nov 2026 · `2e4a2f6` (code) and `6b3b320` (docs)*

Following Update 247 (Customise Home) to the other place things are put in order: the editor for your own workouts and splits.

- **Moving an exercise up or down now says where to**: "Bench press moved to 2 of 5". Before, the list changed in silence while focus stayed on the button. Removing one says so too ("Bench press removed from Push day").
- The announcing is one shared piece now (`useAnnouncer` in components/ui.tsx), used by Customise Home and the workout editor alike: the screen reader's own announcement on a phone, a polite live region that isn't seen and takes no room in a browser.
- Checked: typecheck, hooks rules, app tests (660, with Updates 248 to 256 merged in) and server tests (360); and afterwards in the browser, on a saved workout of six exercises (not saved): Move down on the first said "Incline dumbbell press moved to 2 of 6", with focus staying on its button, and Move up said "moved to 1 of 6"; no page errors. Still to try with a phone's screen reader.

## Update 256 · Planks, holds, cardio and carries are logged, with a stopwatch

*24 Nov 2026 · `a04e1e1`*

You asked to keep polishing and add more of Hevy's features. Until now, a plank, a wall sit, a rower finisher or a farmer's carry in a workout had a "Done?" tick, but it wasn't saved: only sets of reps were. Hevy logs these by time or distance, and now GymGO does too, in its own look.

- **Holds and cardio, by time.** A plank, side plank, hollow hold, wall sit, rower or bike sprints has a **TIME** box in place of weight and reps:
  - Type "1:30" or "90"; it tidies to a clock as you leave the box.
  - Or tap **▶** to start a **stopwatch** on that set, then tap again to stop: its time goes in and the set is ticked. Ticking the set while the stopwatch runs does the same.
  - A set left blank stands for last time's at the same place, else the set above, else the plan ("30–45 s" → 0:30).
- **Carries, by distance.** A farmer's carry has the weight carried and **METRES** (or "1.2 km").
- **Everywhere a set shows:**
  - Previous beside each set ("1:15", "24 × 40 m"), to tap and copy in;
  - "Last time", the summary, your workout's page and friends' feed ("Plank 1:15, 1:00, 0:45");
  - Edit workout, with the same boxes. Before, editing a workout would have dropped any such set.
  - The share picture and the shared text, and the CSV export, which has new **seconds** and **metres** columns at the end so older sheets keep their columns.
  - GymPal's summary of your training.
- **Their own records.** Longest set ("Longest yet") and furthest ("Furthest yet"):
  - marked with the trophy as you tick;
  - on the summary, the feed and Progress ("Longest 1:15");
  - on the exercise's page, with a chart of your longest (or furthest) set each day;
  - in Head to head.
  
  A plate on your back during a plank never counts as a heavy lift.
- **Weight lifted so far**, beside the time and sets at the top of a workout ("12:06 so far · 480 kg · 1 of 5 sets").
- **The server** keeps a set's `seconds` (whole, up to six hours) and `metres` (whole, up to 100 km), and a workout of only planks counts as a workout.

- Checked: every package's tests, lint and typecheck pass (app 660, with 9 new and three widened; server 360, with 1 new; domain 205). In a browser against the local server, at 390 light, 1280 dark and 320:
  - a plank, a carry and a bench press logged: a typed time, the stopwatch, a time as planned and 24 kg × 40 m;
  - "Finish anyway" with one carry set unticked;
  - the summary;
  - the plank's page (Longest, its chart);
  - Edit workout showing the times and distance;
  - ticking while the stopwatch ran;
  - no sideways scroll at 320.
- Not checked: on a phone (the iPhone's numbers-and-punctuation keyboard for the time box is unseen).

## Update 255 · Your weeks as bars, save a friend's workout, share a workout as a picture

*24 Nov 2026 · `b8d8a0a`*

You asked to keep polishing and add more of Hevy's features. You also said the web version of Home was fine and only the phone's looked compacted. As before, Hevy's patterns are drawn in GymGO's own look.

- **Home is roomy on phones only.** Update 254's roomier Home now applies only below 600 points wide:
  - the quick-search pills;
  - the lifter card;
  - the templates link on its own;
  - the finder tiles;
  - the wider gaps.
  
  On a computer or tablet, Home is as it was before. The weather's one-line caption is phone-only too.
- **Your workouts, with your weeks as bars** (Profile → Your workouts): your own workouts as friends see them. On top are your last twelve weeks as bars, for time trained, weight lifted or reps. This week's bar is in the accent, with its total and workout count above. Tap any bar to read that week.
- **Save to my workouts** (Pro), on a friend's workout: it saves the same exercises, sets and reps to My workouts, ready to start again any time. Exercises they made themselves are left out. On a free account it opens Pro.
- **Share as a picture**: on your own workout's page, and in the list when you finish one. The picture is a card with:
  - the workout's name, day and gym;
  - its time, volume, sets and any records (in gold);
  - up to six exercises with their best set.
  
  On a phone it goes to the share sheet. In a browser it's shared or saved to your downloads. "Share as text" is next to it. Notes never go on the picture.
- **Fixed before it shipped:**
  - The picture cut short a gym name and best sets ("Doherty's G…"), because an exported picture draws text a little wider than the screen. Those lines now have no length limit.
  - The chart's month names were clipped to one letter. They now run on under the next bars.

- Checked: every package's tests, lint and typecheck pass (app 651, with 5 new: 3 for the weekly totals and 2 for a friend's workout as a plan; server 359; domain 205). In a browser against the local server with test friends:
  - Profile → Your workouts showed the chart (This week 55 min, 3 workouts; Volume 3,855 kg; Reps 42);
  - a friend's workout saved to My workouts;
  - the picture downloaded and looked at, with nothing cut off;
  - Home at 390 (roomy) and 1280 (as before) wide.
- Not checked: the phone's share sheet for the picture (no phone here).

## Update 254 · A roomier Home, Previous beside every set, and how it compares with last time

*23 Nov 2026 · `d6099c3`*

You said the phone's Home felt cramped and asked to make it spacious and good to look at, to keep polishing, and for more of Hevy's features. Hevy's patterns are drawn in GymGO's own look.

- **Home, with room to breathe.** The top of Home was seven boxes stacked tight. Now:
  - **Quick searches** (Near me, Early start, After work, Under A$30) are one row of pills that slides sideways, instead of four squeezed tiles.
  - **Build a workout** is a roomier card, with "Start building" on a white pill and a lifter at the bar who does two reps as Home opens, then rests.
  - **Templates and programmes** is a plain link under it, not another box (it's still a card when something's up next).
  - **Machines and Trips** have their icons on soft round tiles, with more padding, and there's more space between groups.
  - **The weather** says just the place and MET Norway on one line (a screen reader still hears when the forecast was made).
- **Previous, beside every set** (as Hevy has it): while you train, each set row shows the set at the same place last time ("90 × 5"), a warm-up beside a warm-up, in this workout's unit. Tap it to copy it in. (Not beside the RPE column, where there's no room.)
- **Compared with last time**, when you finish: against the last time you did the same workout (by saved workout or name), how much more you lifted, how many more sets and how long it took, with what went up in green.
- **Polish:**
  - The finished workout's three figures sit in one card, as Progress's do.
  - A friend who hasn't collected a gym no longer has a purple box of four zeros on their page.
  - Fixed: "Do it again" kept the last workout's gym but showed "Tag your gym"; it now shows the gym's name.

- Checked: every package's tests, lint and typecheck pass (app 646, with 8 new for Previous and the comparison; server 359; domain 205). In a browser against the local server:
  - Home at phone and computer width, light and dark;
  - Do it again showing Previous, copying it in, ticking the sets and finishing, which showed the comparison;
  - the gym chip after Do it again.

## Update 253 · Tag your gym, friends' profiles, muscle split, and a calmer look

*23 Nov 2026 · `e127500`*

You asked to make the app cleaner and less clunky, to be able to tag which gym you went to on a workout, and for more from Hevy, looking really good. Hevy's features and patterns are drawn in GymGO's own look; nothing of Hevy's art or design is copied.

- **Tag your gym.** A workout in progress has a gym chip under its title ("Tag your gym", or the gym's name). It opens **Which gym?**: your usual gyms first (the ones your workouts were at), then saved, visited and nearby ones, with distances, and a search. A workout built for a gym starts tagged with it. The gym:
  - shows on the summary when you finish, in your history, and on the workout in the feed, where it opens the gym's page;
  - can be changed or taken off later, from Edit workout.
  - It's named as GymGO knows the gym, never typed text. Friends see it only when you've tagged one; workouts logged before today show none.
- **A friend's workouts.** A friend's page now lists their latest workouts, with a count and See all. Like and comment right there, as on Hevy's profiles. Your own list shows hidden workouts too.
- **Muscle split** on a workout's page: which muscles it worked, as bars by share of its sets (main muscles count fully, others half, as in your month report).
- **A calmer look:**
  - Quiet buttons ("Share your week", "Cancel", "See GymGO Pro") are now a step down from the main one: 44 points tall instead of 52, lighter words. A page reads as one thing to press first, not a stack of slabs.
  - Progress's three figures sit in one card with hairlines between them, not three boxes.
  - The calendar's explanation is one short line.
  - Home's template link just says "Templates and programmes".

- Checked: every package's tests, lint and typecheck pass (server 359, with 2 new for gym tags and a person's workouts; app 638, with 2 new for muscle split; domain 205). In a browser against the local server, at phone and computer width, light and dark:
  - the gym chip, the picker and tagging a workout all worked;
  - the gym showed on the feed card and the workout's page, where it opens the gym;
  - the muscle split, a friend's workout list and the Progress card all showed.
  - One thing fixed on the way: the workout's page showed its gym twice.

## Update 252 · A feed of your friends' workouts, and Head to head

*23 Nov 2026 · `f5ab6ad`*

You asked to keep polishing, add the features it needs and more Pro features, and a workout feed where you can see all your friends' workouts, taking inspiration from Hevy.

- **Feed** (sidebar → Feed, Profile → Friends, the Friends page): your friends' workouts, newest first. Each card says who and when, the workout's name, its **time, volume, sets and records**, and the first exercises with their best set ("85 kg × 5") and any record ("Heaviest yet"). Below are who liked it, and **Like** (a heart) and **Comment**. Twenty at a time, with Show older.
- **A workout's page**: every exercise and every set (warm-ups and drop sets tagged, RPE, a trophy on the set that made a record), the likes and the comments, with a box to add one.
  - On a friend's: **Do this workout** turns it into a workout to start, with your own weights.
  - On yours: **Hide from friends**.
- **On your workouts**, at the top of the feed: who liked or commented on yours lately, with the new ones marked.
- **Head to head** (new in Pro), on a friend's page: your best lifts beside theirs on every exercise you've both done (heaviest, estimated 1-rep max, most reps), with whoever's ahead marked. Free shows what it is and the way to Pro, and Pro's comparison table lists it.
- **Your choice what's shared.** Sharing your own workouts is off until you turn it on in the feed, which says plainly what friends see: the exercises, sets, time and records. Friends never see your notes or which gym. Hide any one workout, or stop sharing at once. You can see friends' workouts without sharing yours.
- **Comments** are between friends, up to 300 characters. Whoever wrote one, or whoever's workout it's on, can delete it. Anyone else can report it to the team, which sends it like a bug report. Unfriending takes away each one's likes and comments on the other's workouts. Download my data includes them all.
- The records a friend sees are worked out the same way as on your phone. The code for them now lives in the shared domain package, so the server uses it too.
- The sidebar's Feed has its own icon: a pulse, whose line draws itself under the mouse like the other icons' scenes.

**Yours to decide:** the Privacy Policy lists what friends see (your name, picture, cards and totals). For anyone who turns sharing on, they now see workouts too. I haven't changed the policy, because that wording is yours to approve and changing it asks everyone to agree again. `docs/FEED.md` has the lines that would change.

- Checked: every package's tests, lint and typecheck pass (server 357, with 11 new for the feed; app 636, with 10 new; domain 205). In a browser against the local server, with two test friends' workouts, at phone and computer width, light and dark:
  - the feed, a workout's page, liking and commenting, and sharing on and off all worked;
  - activity on your workouts listed the friends' likes and comment;
  - Head to head showed the bench press both had done;
  - Do this workout started the friend's leg day with the account's own weights.
  - The tests caught one real bug, fixed: a comment kept the spaces at the end of a line.

## Update 251 · Apple Pay's and Google Pay's own buttons, for the device you're on

*23 Nov 2026 · `16094db`*

You asked for Apple Pay and Google Pay buttons like the PayPal one, showing the right one for the device. On the website's Pro page, under Subscribe:

- **Apple Pay on an iPhone, iPad or Mac; Google Pay on Android** (and on Windows, Linux or ChromeOS, in Chrome). Which device it is comes from what the browser says it runs on.
- **The real buttons, in their own colours.** "Subscribe with Apple Pay" and "Subscribe with Google Pay", drawn by Stripe from Apple's and Google's own artwork: black on a light page, white in dark mode, the same height and corners as Subscribe and PayPal.
- **One tap opens the wallet.** Apple and Google require their buttons to open their payment sheet straight away, not lead to another page. So these use Stripe's Express Checkout: Stripe's code shows the button on GymGO's page and opens Apple Pay or Google Pay itself. Once paid, the browser comes back through the server and Pro turns on, as after Stripe's page.
- **Only when it can work.** The button shows only if the device can really pay with that wallet (Apple Pay set up in Safari, a card saved in Google Pay). Otherwise nothing shows and there's no gap. A Mac in Chrome, where Apple Pay can't show, gets no wallet button; Subscribe's page still takes Google Pay there.
- The renewal terms name the button when it shows ("Tapping Subscribe, Apple Pay or PayPal agrees…"). A declined payment says why on the page.
- **Not in the phone apps.** There, Pro is sold through the App Store's and Google Play's own purchase, and Apple doesn't allow Apple Pay for a subscription inside an iPhone app.

**Yours, when you want it on:** Stripe's publishable key (`pk_test_…`, the same mode as the secret key) in `apps/server/.env.local` as `STRIPE_PUBLISHABLE_KEY`, and the web app's domain registered in Stripe (Settings → Payment method domains), in test and live mode. **Before it takes real payments**, the Privacy Policy needs a few words: the button brings Stripe's code onto GymGO's Pro page (Stripe uses it against fraud, with its own cookies), and Google Pay's button comes from Google. The policy now says Stripe takes payment "on its own page" and that GymGO has no tracking code. I haven't changed it, because that wording is yours to approve. `docs/PAYMENTS.md` has the steps and the wording. Until the key is set, nothing changes and nothing of Stripe's loads on GymGO's pages.

- Checked: typecheck, lint and every package's tests pass (server 346, with 5 new for the wallet checkout; 4 new for which wallet a device gets). In a browser, with the server's answers and Stripe.js stood in, as an iPhone, a Mac, Android and Windows, in light and dark: each got the right wallet. A device that can't pay showed nothing and no gap, with PayPal still tappable. Three quick plan taps made one checkout, and a declined payment showed its message. With the real Stripe.js and a dummy key, no button and no errors. Nothing has talked to the real Stripe, and no real wallet payment has been tried: there are no keys here.

## Update 250 · The PayPal button is PayPal's own

*23 Nov 2026 · `3452d29`*

You asked for the PayPal button to be the PayPal logo, clean, standing out, in PayPal's colours. It's now just PayPal's wordmark on PayPal's button colour, the size and corners of the Subscribe button above it:

- **PayPal's current colours.** PayPal changed its buttons in August 2026: the gold one became blue. On a light page the button is PayPal's light blue (#60CDFF) with the black wordmark; in dark mode it's PayPal's white button, as PayPal's own guidance says for contrast on dark pages. A touch darker under the mouse.
- **PayPal's own wordmark,** taken unchanged from PayPal's published button artwork (paypalobjects.com), not redrawn. A screen reader hears "Pay with PayPal". While PayPal's page is opening, a spinner takes the wordmark's place.
- The renewal terms under it now say "Tapping Subscribe or PayPal agrees…", since the button no longer has words.

- Checked: typecheck passes; on the Pro page (with the server's answers stood in) the button shows in light and dark, its blue darkens on hover, no page errors. It shows only once PayPal is set up (docs/PAYMENTS.md).

## Update 249 · Apple Pay, Google Pay and PayPal, ready for you to switch on

*22 Nov 2026 · `05cf947`*

You asked to polish the app and include paying with Apple Pay, Google Pay and PayPal, which you'll set up later. Everything is built and switched off until you connect it; `docs/PAYMENTS.md` has the steps.

- **Apple Pay and Google Pay come with Stripe's checkout page.** Turn them on in the Stripe Dashboard (Settings → Payment methods) and they appear on devices that have them, with no code or domain set-up. The server reads Stripe's own settings, so the Pro page says only what's really on: "Card, Apple Pay or Google Pay, on Stripe's secure page", under Subscribe.
- **PayPal has its own button,** "Pay with PayPal", under Subscribe, once your PayPal business account's keys are set and `paypal:setup` has made GymGO's plans in PayPal. It works for monthly and yearly Pro and Duo, A$ and US$, and the free trial. Stripe offers PayPal on its page only to businesses in Europe, and GymGO's A$ and US$ prices suggest yours isn't, so PayPal is connected directly (PayPal's Subscriptions API). If your Stripe account is European, PayPal can simply be turned on in Stripe instead; the page then lists it there.
- **Pro is the same whichever way you pay.** A PayPal subscription is checked with PayPal when you come back (Pro turns on at once), kept in step by PayPal's webhook or a re-check every ten minutes, and keeps Pro until the end of what was paid for if cancelled. Manage subscription opens PayPal's page for PayPal subscribers, and deleting an account cancels at PayPal first.
- **Polish on the Pro page:** the renewal terms now say that "Pay with PayPal" agrees to them too, and the trial's line names PayPal when it's offered. Walking the main screens at phone and computer width, light and dark, found nothing else broken.

**Yours, when you want it on:** turn on Apple Pay and Google Pay in Stripe; for PayPal, a business account, an app at developer.paypal.com (its keys in `.env.local`), `paypal:setup`, and the webhook. **Before PayPal takes real money**, the Privacy Policy and Terms must name PayPal (they name only Stripe). I haven't changed them, because that wording is yours to approve; `docs/PAYMENTS.md` lists what would change. Inside the phone apps, the stores' own rules for selling subscriptions still apply, as before.

- Checked: typecheck and every package's tests pass (server 341, with 26 new for PayPal and the ways to pay). With the server's answers stood in, the Pro page shows the line and the PayPal button in light and dark, at phone and computer width, with no page errors. Nothing has talked to the real Stripe or PayPal: there are no keys here.

## Update 248 · No more hitch when you click the map

*22 Nov 2026 · `66ae240`*

You asked to fix the momentary lag when you click the map. Measured in the browser, clicking a gym's pin did a lot of work all at once, on the very frame the map set off towards the gym and its card opened:

- **The whole app was redrawn** (744 parts), because the gym was added to your recently viewed gyms, which lives in the app-wide state.
- **The results panel was redrawn** (some 470 of those parts: its search, chips and list), though nothing in it had changed.
- **The whole card was built** at once (about 900 parts), most of them its folded sections, below what you see first.

Now:

- **Recently viewed is updated as a background task**: React does it in small slices between the map's frames, and opening the same gym again changes nothing at all.
- **The results panel is drawn again only when something in it changes**: Explore hands it the same things each time, so picking a gym or closing its card leaves it alone.
- **The card's top comes at once and its folded sections a frame later**, also as a background task. The top is the photos, actions, facts, and the Google and workout rows. The gym's own page still draws everything at once, so it can scroll back to where you were after a change of colours.

Clicking a pin now redraws 84 parts plus the top of the card, instead of 744 plus the whole card. In this workspace's development build that frame took 41 to 68 ms, down from 74 to 125 ms. Closing a card by clicking the map is down to 84 parts in under 5 ms. On a phone-width screen, a tap redraws 141 parts in 13 ms. A click on empty map does no React work at all, just one map frame, which a graphics card draws in a moment.

- Checked: typecheck and every package's tests pass (app 626, server 315). In the browser: the card opens complete (its folded sections arrive just after), the list beside it is untouched, closing still works, phone width still works, no page errors. The timings come from this workspace's development build and software graphics; a production build on a real computer is faster throughout.

## Update 247 · A screen reader hears where a widget went

*22 Nov 2026 · `47e7248`*

- **After a widget moves, a screen reader says where to**: "Quick searches moved to 2 of 11". Before, moving one (with Update 246's buttons, a screen reader's own Move up and Move down, or a drag) changed the order in silence, so someone who can't see it had to go looking. Taking one off says so too ("Weather taken off Home"). On a phone it's the screen reader's own announcement; in a browser, a polite live region that takes no room and isn't seen.
- Checked in the browser: Move down twice then back up, announced as "moved to 2 of 11", "3 of 11" and "1 of 11", with focus staying on the button between presses; the order back as it was afterwards. App tests 626.

## Update 246 · Home's widgets can be moved with buttons, for anyone who finds dragging hard

*22 Nov 2026 · `34b34b3`*

Update 230 left a question open: on Home a widget is moved only by holding and dragging it, and someone who can't hold and drag had no other way with a mouse or a finger (WCAG 2.2's 2.5.7; screen readers and the keyboard already had Move up and Move down). Up and down buttons on every widget would have changed the iPhone-style editing you asked for in Update 72, so they're a setting instead, off unless you turn it on:

- **Appearance → Motion → Move widgets with buttons.** With it on, while you customise Home each widget has a round up button at its top-right corner and a down button at its bottom-right, in the accent, matching the − badges at the left (the first has no up, the last no down). Each moves its widget one place; focus stays on the button, so it can be pressed again to keep going. Widgets also stop jiggling while it's on, so the buttons hold still to press.
- **With it off (as it starts), Customise Home is exactly as before**: jiggle, − badges, hold and drag, + and Done.
- If you'd rather the buttons always showed, or weren't offered at all, it's a one-line change either way.
- Checked in the browser: with the setting off, no move buttons; with it on, 20 on 11 widgets; Move down on the first widget moved it to second with focus staying on its button, and Move up put it back; nothing jiggles; axe and the target-size rule on Home while customising, light and dark, phone and desktop: clean. The setting is stored like the rest of Appearance (the settings test now covers it). App tests 626.

## Update 245 · Checked: this week's type rules in every look

*22 Nov 2026 · `123db97`*

The week's type changes (labels centred by their capitals, the growing welcome headline, hyphenation, bold that doesn't move, two-line card titles) had only been tried in the Standard look. The other ten looks draw in very different faces (Paper's serif, Terminal's monospace, 8-bit's pixels, Comic's display letters), so each was swept:

- **Nothing cut short, no label spilling out of its tab, chip or button**, in Frost, Liquid, Soft, Paper, Material, Neon, Terminal, 8-bit, Classic and Comic, on Home, Appearance, the programme, a gym's page, Templates and the monthly report at phone width, and on Home, the welcome tour, Appearance, a gym's page and the programme at desktop width.
- **The welcome headline holds up in the widest faces**: in 8-bit it's 35.5 points on a phone (four lines) and 64 at desktop width, balanced into three even lines of "Find a gym / that lets / you in"; in Comic it fits one line at both sizes. Neither runs off the side.
- Nothing needed changing.

## Update 244 · Checked: the iPhone and Android bundles build with this week's work

*22 Nov 2026 · `4f5b598`*

Everything this week was driven in a browser, but the same code makes the phone apps. Without a phone here, the next best thing was to build the apps' code as the phone builds do (Hermes, for iPhone and Android, 85 seconds) and look inside:

- **Both build with no errors or warnings.**
- **The browser-only parts stayed out**: the rows' give and their swipe claim, the tooltips, and the browser's type rules (hyphenation, trimmed labels, the fluid headline, small capitals) aren't in either bundle; each has a phone version that does nothing, or a phone's own way (Android hyphenates with its own setting).
- **What's shared is in both**: "Saved as …", "visit price", "GymPal on the left side" and the rest. The theme switch's pause on transitions is in them too, and does nothing on a phone, where there's no page to mark.
- What a bundle can't show is how it all feels on a phone (the 97% press, the shake, the card's glare and foil, Android's hyphens): that's still for a real device.

## Update 243 · Scrolling never waits on the rows or the tooltips

*22 Nov 2026 · `bbdc067`*

Two costs that Updates 236 and 241 added to every page in a browser, taken back out:

- **Scrolling and the map's zoom no longer wait on the app.** To stop a swipe past a row's start going Back (Update 241), the page listened to every wheel and trackpad movement in a way that could cancel it, and a browser has to wait for such a listener before it scrolls anything: the page, a sheet, the map. Now each row listens for itself, starting the moment the pointer comes onto it, and the page's own listener can't cancel anything, so the browser never waits for it. Rows still claim a swipe past their ends.
- **Moving the mouse no longer makes the page lay itself out.** To decide whether a button is only an icon (and so gets a tooltip), the label code read the button's visible text in a way that makes the browser work out the page's layout again, on every movement onto something new. It now reads the button's words directly, leaving out its icon's glyph (which is hidden from screen readers), which needs no layout.
- Checked in the browser: through Chrome's own tools, the page's only wheel listener is passive, and the row being pointed at has the one that can claim a swipe; swipes past the start of Home's rail (with and without Reduce motion), Explore's chips, Exercises and the welcome tour still stay on the page; tooltips still show on icon-only buttons (Save, Add to Compare, Ask GymPal) by mouse and by Tab, and not on a button with words. App tests 626.

## Update 242 · Checked: the full app's production build, served by the server

*22 Nov 2026 · `9de9b66`*

Update 241 checked the website's build. This time the full app (accounts, workouts, cards) was built for production as online mode builds it (served by the GymGO server from the same address) and the week's work was driven on it, signed in. Nothing needed changing:

- **No console messages** beyond the expected map and WebGL notes, and **no failed requests**, on 16 pages: Home, Explore (and Filters), Saved, Profile, Workout, Progress, the monthly report, the programme, Collection, a Legendary card, Appearance, Account, Templates, Exercises and a gym's page.
- **The same behaviour as on the development server**: tooltips (the first after a wait, the next at once, Escape), the theme switch's pause on transitions (from 274 to 575 ms after the tap), Earlier on the monthly report sliding in from the left, the wrong-password shake and red fields, hyphenated tiles, EMOM in small capitals, the 35.5 and 64-point welcome headline, "Saved as …" giving way in the middle, the card's glare and foil, and Home's rail giving 156 points past its start and staying on the page when the mouse moves on.
- Two differences in the first readings were the test's, not the app's, and are noted so they aren't chased again: at 1280 by 860, Home's rail starts just below the fold (scroll it into view before swiping), and a one-line label clipped by a line limit shows as taller than its box, not wider.
- Not checkable here: Safari and Firefox (only Chromium is installed, and installing others isn't allowed in this setup), so text-box trim, text-wrap and hyphenation are unconfirmed in them; each has a plain fallback where a browser doesn't know it.

## Update 241 · The website built as Netlify builds it; a swipe past a row's start really doesn't go Back now

*22 Nov 2026 · `024e3e0`*

The checks this week had all been on the development server. This time the website was exported exactly as Netlify does (the limited version, no server, guests welcome; 40 seconds, 16 MB) and served as Netlify serves it, then tested:

- **Fixed (Updates 236 and 237 said this was done, and it wasn't): a sideways swipe past the start of a row could still go Back a page.** The rows were marked so the browser wouldn't hand the swipe on (overscroll-behavior), but a row already at its start can't take a swipe that way, so the browser gave it to the page anyway, and went Back as the gesture ended. My earlier check never moved the mouse afterwards, which is when the browser finishes the gesture, so it missed it. Now while a row is being pulled past an end, it claims the swipe itself, so it goes nowhere else; with Reduce motion on it still claims it, just without the stretch. A row that fits the window and doesn't scroll is left alone, like any still part of a page.
- **The production build has everything from this week**: all the new style rules (theme switch, height animation, trimmed labels, the fluid headline, small capitals, hyphenation, wrong fields in High Contrast, balanced headings, the rows), the tooltips, the rows' give, the 64-point welcome headline at desktop width and Prime Athletica's three plan names in full. No console messages, no failed requests (it asks nothing of a server) and no page errors.
- Checked: with a page to go Back to, a swipe past the start of Home's rail (with and without Reduce motion), Explore's chips, Exercises' row and the welcome tour, then moving the mouse on: still on the same page, on the development server and on the rebuilt production site. The same test on the production site built before the fix went Back each time, so the test catches it. App tests 626.

## Update 240 · A fix to Update 236's centred labels; wrong fields in High Contrast; even headings

*22 Nov 2026 · `4add786`*

- **Fixed (my mistake in Update 236): two-way switches had shrunk and cut letters.** Centring labels by their capitals (text-box trim) makes the words' box shorter. On a button (52 points) or a chip (36) that's what's wanted, as they keep their height. But the two-way switches (Sign in / Create account, Appearance's choices, everywhere the segmented control is used) and Home's Start pill size themselves by their words: they had shrunk from 32 points to 23, and as their labels may take two lines, the clipping that goes with that cut off the tails of g, p and y ("Sign in"). Trimming is now only on buttons and chips; the switches and the pill are back to 32 points, letters whole. The rule is written down beside the option, so it isn't used that way again.
- **Wrong fields show in Windows High Contrast.** Forced colours draw every field's border the same, so a password that didn't match left the two fields looking like any others (the message under them still said so). A field marked wrong now has a dashed outline there as well.
- **Headings break into even lines** in a browser rather than leaving one word on the last, and paragraphs avoid ending on a lone word (text-wrap balance and pretty). Nothing that was whole is cut by it: a sweep of 16 signed-in pages, the sign-in page and 5 website pages found nothing new.
- **Two decorations hidden from screen readers on the website too**, as they already were on phones: Appearance's little Liquid Glass map (with its sample "Search" and "Gyms near you") and the "or use email" line between the sign-in buttons.
- Checked in the browser: the switches 32 points with whole letters; chips 36 and the main button 52 with their words centred and their tails whole; in forced colours, both wrong fields with a dashed outline; axe on Home, Appearance, Programme, the monthly report and sign-in, light and dark, phone and desktop: clean. App tests 626.

## Update 239 · A programme's days slide the way you move through them

*22 Nov 2026 · `5cfdf47`*

The reels' rule that a step slides in from the direction of travel (Update 236, for the monthly report) also fits a training programme's days, which run in order (Push, Pull, Legs):

- **Choosing a day's chip slides its plan in from that side**: a later day from the right, an earlier one from the left. Both when you're choosing a programme and on the one you're following. Before, the list swapped in place. Still with Reduce motion.
- Checked in the browser: Pull's plan came in from the right (21 points out) and Push's from the left; no page errors. App tests 626.

## Update 238 · Icon buttons name themselves to the keyboard too; Reduce motion and the legal pages checked

*22 Nov 2026 · `8457b8d`*

- **Tabbing to an icon-only button shows its name**, with the same wait as the mouse (the first after half a second, the next at once). Before, only a mouse got the label, so someone who can see but uses the keyboard had to guess what Save or the map's buttons were. Clicking a button doesn't show one, and if the browser scrolls to the button you tabbed to, the label goes with it rather than vanishing. A screen reader still hears the button's name once.
- **Checked, nothing to change: Reduce motion.** With the system's Reduce motion on, and separately with GymGO's own (Appearance), Home's rail doesn't stretch past its ends, a card on its page stays flat under the mouse and has no glare or foil, and the earlier rules (entrances, the shake, the month's slide) are still by Reanimated's Reduce motion setting.
- **Checked: the Terms page** (and so Privacy, Refunds and Community, which share its style): the title is 35.5 points on a phone and 64 on a wide window, links' underlines sit 0.2em below the words, and the footnote-mark and acronym rules are in its style sheet.
- Checked in the browser: tabbing through a gym's page, Save's label showed on focus; after a click on it and moving away, no label. App tests 626, hooks rules clean.

## Update 237 · Every sideways row gives at its ends; tooltips keep an edge in the dark

*22 Nov 2026 · `90c979d`*

Following Update 236 through the rest of the app:

- **Every sideways row now behaves like Home's.** Explore's chips, Collection's rows of sets and rarities, Exercises' "Yours", kit and muscle chips, Google's photos on a gym's page, Compare's table and the welcome tour all give a little at their ends under a trackpad in a browser and spring back, and a swipe past the start no longer sends the browser Back. Their fading edges are kept; on the welcome tour, its quiet focus ring is kept too (the two marks were merged, where the second would have replaced the first).
- **Tooltips keep an edge in dark mode.** The label is a dark pill, which had no edge on a black page; it now has a faint light rim. Over the tab bar it opens above the icon, centred on it, as there's no room below.
- Checked in the browser: each row marked (and its fade or focus mark kept) on Explore, Exercises and the welcome tour, and pulled 100 to 125 points past its start; the tab bar's Explore label in dark mode, above the icon. No page errors. App tests 626.

## Update 236 · The rules from your four reels: motion, type and a holographic card

*22 Nov 2026 · `0055adb`*

You sent four Instagram reels to take note of and implement. Three are lists of rules for building interfaces (ten for animation, ten for typography, and five libraries); the fourth only asks people to comment to be sent a "skill", with nothing in it to build, so there was nothing to take from it. Each rule was checked against GymGO and applied where it fits:

**Animation**
- **Entrances never grow from nothing.** Something that pops in to be noticed (a new record, a set completed, the collect card, GymPal's corner button) used to grow from a dot. Now everything that arrives fades up from 97% of its size, goes a touch past full size and settles. Same on phones and in a browser.
- **One press for everything.** Buttons and cards sank by anything from 85% to 98% when pressed, depending on who drew them. Every one now sinks to 97%, so a press feels the same everywhere.
- **A wrong password shakes and turns red.** Signing in with an email and password that don't match now shakes the form side to side for 360 ms, and both fields go red (their icons too) until you change either one. Before, it shook for 270 ms and nothing else marked the fields.
- **The monthly report slides the way you went.** Earlier brings the month in from the left, Later from the right, rather than swapping it in place.
- **Progress bars move by transform.** The check-in's scan bar and the workout's sets bar grew by width, which makes the page lay itself out every frame; they now slide. (Left as they are: the sign-in building bar you asked to keep unchanged, Liquid Glass's slider, whose fill carries the accent's paint, and the sidebar's opening, which changes its real size.)
- **A theme switch lands in one go.** While the colours change, a browser's transitions are switched off for a moment, so nothing fades across from the old theme while the rest has already switched.
- **Icon buttons name themselves under a mouse.** GymGO had no tooltips. Now, in a browser, a button that's only an icon (Save, Ask GymPal, the map's buttons) shows its name when the pointer rests on it. The first waits half a second, so a pointer passing over doesn't set one off; the next ones show at once as you move along a row. The label can be pointed at without going, Escape, a press or a scroll puts it away, and a screen reader isn't told twice. Phones have no hover, so nothing changes there.
- **A throw keeps its speed.** Flicking the tab bar's lens now picks the tab it would coast to and springs there at the speed you let go; GymPal's edge tab springs back from your throw rather than from a standstill.
- **Rows give at their ends in a browser.** Home's rail of gyms and a gym's photos already bounce at their ends on a phone. In a desktop browser a trackpad swipe stopped dead, and on a Mac a swipe past the first card could go Back a page. Now the row follows a little past its end, less the further you pull, and springs back when you stop; going Back from there is switched off.
- **Accordions** already animate their height as they open (Join this gym, Your notes); a browser is also allowed to animate to a natural height now (interpolate-size).

**Type**
- **Bold without moving.** A chosen segment, sidebar item, choice in a list or Appearance tile turns bold, which made its words wider and could wrap them onto another line. A hidden bold copy now holds that room, so nothing shifts as they thicken.
- **Labels centred by their letters.** In a browser that can, buttons', chips' and the Start pill's words are centred by their capitals rather than their line, so they sit in the optical middle (text-box trim).
- **The website's welcome headline grows with the window**: 35.5 points on a phone-sized window, up to 64 on a wide one, from the reel's clamp(2rem, 1rem + 5vw, 4rem).
- **Acronyms in small capitals.** In a sentence, "EMOM", "RPE" and "AI" are drawn as small capitals in a browser, at the height of the words around them (Pro's timer line, the effort picker, GymPal's note). Still capitals to a screen reader and when copied.
- **Curly quotes.** The straight apostrophes left in the app's words are now curly: the collect button's "You’re at…", the gym page's workout link, the reviews link, the questions passed to GymPal, and "days’ cancellation notice". Place names in the city lists ("St. John's") are left as their sources write them, as searches match them.
- **File names give way in the middle.** After Download my data, the page now says what it saved: "Saved as gymgo-my-data-2026-11-22.json". Where there isn't room, the middle gives way and the date and ".json" stay.
- **Narrow columns hyphenate.** A long word in a price box, a fact under a gym's photo, a Home shortcut, a segment or an Appearance tile breaks with a hyphen in a browser and on Android, rather than leaving a gap or running out of room. The gym page's facts take two lines now, so "visit price" fits.
- **Card titles take two lines at most.** Home's gym cards, a set's card, a workout card, the last-workout widget and a template's card now stop at two lines with "…". This takes back Update 232's four-line gym names on Home's cards; the full name is in each card's spoken label and on the gym's page. The list on Explore isn't cards and keeps three.
- **On the Terms and Privacy pages** (the server's): link underlines sit a little lower (0.2em), the title grows with the window, a footnote mark wouldn't push its line apart, and any acronym marked as one is in small capitals.

**Libraries**
- **The holographic cards idea is in.** A card already tilted in your hand on its own page. Now it catches the light as it does: a soft glare slides the way the card leans, brighter the further it goes, and on a Foil, Epic or Legendary card a band of rainbow foil slides across the other way. Nothing at rest, only on the card's own page, and not with Reduce motion. It's light over the picture, never in place of one.
- **Not used:** Spark (3D scans dissolving into dust) needs 3D scans of gyms, which don't exist and couldn't be made up; Canvas UI's shader effects and ShaderGradient's moving gradients are heavy WebGL decoration that would undo the website's speed work and add nothing to finding a gym; Pretext wraps text round shapes, which nothing in GymGO does.

- Checked in the browser: tooltips (none at 250 ms, Save at 700 ms, the next at once, gone with Escape); the theme-switch mark on while the colours change and off after; Home's rail pulled 156 px past its start and back to rest; Earlier on the monthly report (from the left); a wrong password (shake, both fields red, cleared on typing, no page errors); steady bold (Appearance's tiles the same size before and after choosing); the trimmed Start label; EMOM in small capitals; the welcome headline at 390 and 1280 wide; "Saved as …" at 320 wide, giving way in the middle when squeezed to 190; the holographic light on an Uncommon card (glare) and a Legendary one (glare and foil). axe on 12 pages of the full app and 5 of the website version, light and dark, phone and desktop: clean. Labels match their words, headings and text spacing unchanged, no console messages. Tests: app 626 (two new, for a row's give and the tooltip's wait), server 315, shared rules 199. Hooks rules clean.

## Update 235 · Yearly plans say "per year"; an unknown visit price is called that

*22 Nov 2026 · `ee7cb10`*

Two pieces of wording found looking at real gyms in other countries on the website version:

- **"per year", not "every 365 days".** A plan paid a year at a time (Activ Fitness in Zurich, Equilibrium Fitness in North Melbourne) read "599 CHF every 365 days". It now reads "599 CHF per year", on the gym's price boxes and in Join this gym. Other odd lengths still say their days ("every 90 days"). In the shared money rules, so the server and app agree; a new test covers each length.
- **"Unknown visit price", not "Unknown price".** On Activ Fitness's page, the membership prices sat a little above a fact that said "Unknown price", which read as a contradiction. That fact is about one visit, so it now says so. Known prices are unchanged ("A$22 per visit").
- Checked in the browser on the website version: both pages' price boxes read "per year"; Zurich, Madrid and Detroit on Explore with nothing cut short; 18 of the longest real gym names (Detroit, Brisbane, Tampa, Sydney, Madrid, Nashville, Adelaide, Honolulu, New York, Washington, Barcelona, Zurich, Perth) on their pages and Home at 390 and 320 wide, nothing cut short. Tests: shared rules 199, app 619, server 315.

## Update 234 · Each navigation icon plays its own little scene

*21 Nov 2026 · `aa6ec54`*

You said Update 233's motions weren't what you meant: you wanted a custom animation for each icon, like Progress's arrow coming out of the axis as the graph grows and the dumbbell having plates added. So the tab bar's and the sidebar's icons are now drawn in parts, and each plays a scene of its own when the mouse is on it, in a browser:

- **Progress:** the graph line draws itself out of the axis, and as it reaches the top the arrow shoots out past the end and settles.
- **Workout:** the inner plates slide onto the bar, then the outer plates, each with a little clank, and the bar dips with the weight.
- **Home:** the roof hops and lands, and the door swings open on its hinge.
- **Explore:** the map's two outer panels unfold from the middle one.
- **Saved:** the bookmark drops in and bounces, and a fill runs down it.
- **Profile** (when you're signed out and it shows the icon): the head pops up as the ring draws round.
- **My workouts:** the clip snaps down and the two lines write themselves, one after the other.
- **Programme:** the calendar's rings flick and the days pop in, one by one.
- **Collection:** the front card flips over and the one behind slides out.
- **Friends:** the one in the middle hops and a friend steps out from behind each side.
- **Appearance:** the palette rocks and its four paints pop and light up in colour.

At rest each icon looks exactly as before: they're Phosphor's own outlines, redrawn from the strokes they're designed from (laid over the old ones, they match). The page you're on (its filled icon) doesn't play, nor does anything with Reduce motion on, and moving the mouse away ends a scene at once. Phones and tablets have no hover, so they keep the icons as they were. Other icons around the app keep Update 233's small motions; they're font glyphs in a browser, so they can't be taken apart the same way.

- Checked: typecheck and all app tests pass (624; the scene tests check each icon has a scene and every animation it names exists). In the browser, frames caught along each scene at 120, 300, 480, 700 and 1100 ms show each one playing as described; a line waits hidden for its turn; leaving mid-scene puts the icon back at rest; the tab bar's icons play too, in dark mode; no page errors.

## Update 233 · Icons move a little under the mouse

*21 Nov 2026 · `854b2ec`*

You asked for little animations on icons when you hover over them. On the website (and in a browser on a computer), pointing at a button, link or row now moves its icon a little, in a way that says what it does:

- **A chevron steps forward and Back steps back**, Share, Send, Progress and Workout rise, Download dips, an outside link or Directions moves up and out.
- **Settings' gear turns, Refresh and History wind back, Plus and Close turn a quarter.**
- **The bell and the phone ring, Save and the stars pop, Search and the palette tilt, the eye blinks, a bin or a warning gives a small shake**, Expand grows, Collapse shrinks, the menu widens.
- **Anything else lifts a point and grows a touch**, the sidebar's and the tab bar's icons included.

Kept calm on purpose: only the icons of the one thing under the pointer move, never those of a button inside it. A big card, like a gym's, moves only its arrow, so its little icons don't all go at once, and nothing with more than three icons moves. **Reduce motion** (yours in Appearance, or your system's) keeps them still. Phones and tablets have no hover, so nothing changes there.

- Checked: typecheck and all app tests pass (623, four new ones on the motions, the rules and Reduce motion). In the browser, at computer and phone width: the icons are tagged (71 on Profile); a row's icon lifts and its chevron steps forward, then both settle back when the pointer leaves; the sidebar's palette tilts and Saved's bookmark pops; with Reduce motion on, nothing moves; no page errors.

## Update 232 · The website version checked as it's built: long real names and plan names in full

*20 Nov 2026 · `ba23a34`*

The checks so far had run on the full app with the invented demo gyms. This round ran them on the website version as gymgo.site builds it (the limited version, no account needed, no server), where every gym is a real one with its own, sometimes long, name. Headings, axe, target size, focus behind the bars, the console and keyboard order were all clean there. Real names and real plan names turned up text that lost its end:

- **Fixed: a plan's name cut short on a gym's page.** On Prime Athletica in Fitzroy, the membership "Unlimited classes and gym" showed as "Unlimited classes and…" in its price box, at normal text size. A plan's name is part of what it costs, so plan names (and who a plan is for) now show in full, however many lines they take.
- **Fixed: long gym names cut short.** "Kensington Community Aquatic and Recreation Centre" lost "Centre" on Home's gym cards and in the search suggestions. Card names now take up to four lines (the cards in a row stay one height), search suggestions two lines each, and a name in Explore's list three, so "North Melbourne Boxing and fitness centre" keeps its end when someone turns text spacing up. A card's suburb and distance take two lines for the same reason.
- **Fixed: a workout's exercise list ended in "…".** Home's Up next card listed every exercise on one line, so a long day lost most of them. It now names as many as fit about two lines, then says how many more ("Leg press, Seated dumbbell shoulder press, Seated cable row and 2 more"), with no line limit, so it can grow with text spacing.
- **Fixed: two labels that didn't match their words** (so voice control could miss them): Home's "Start from a template, or a programme planned over weeks" now has that as its name, and Appearance's "Left side" and "Right side" for GymPal are named "GymPal on the left side" and "… right side". Appearance's small look samples, which say "GymGO" and "Go", are hidden from screen readers, as the tile's own name says which look it is.
- **Checked, nothing to change:** on the website version the console has nothing new, and no requests are made to a server. (With a server, the website's guests get a 401 for the account-only lists and the app falls back to the built-in gyms, as designed; and a gym's icon or photo that the server doesn't have answers 404, which is how the app knows there's none.) The server and shared packages' own words were also run through the British English spelling check: no misspellings (the odd ones are place names, brand names and the data's own spellings, left as the sources give them).
- Checked in the browser: 20 real Melbourne gyms' pages, Home, Explore and Saved with no text cut short; text spacing on Home, Explore, Filters, a gym's page and the programme page with nothing lost; labels matching their words across 16 pages signed in, and the website version's pages; axe on 26 pages of the website version and 5 of the full app in the standard look, light and dark, phone and desktop, all clean. Hooks rules clean. App tests 619 (two new, for the exercise list).

## Update 231 · Appearance and the rest: every section has a heading; a spelling check

*20 Nov 2026 · `cb1f0df`*

The app's own words (3,389 pieces of text: labels, buttons, messages, explanations) were run through a spelling checker in British English, the app's spelling. It found no misspellings. The words it didn't know were place names from the list of cities, gym terms (deadlift, glutes, EMOM, Pallof press, woodchop) and brand names. But it turned up one label typed in capitals, "GYMPAL’S BUTTON" on Appearance, and following that up showed Appearance's section names weren't headings at all.

- **Appearance's 14 section names are now headings** (level 2): Mode, Dark mode, Layout, Text, Motion, Look, Corners, Liquid Glass, Accent, Map, Celebrations, Sounds, Clock and GymPal's button. Update 219 missed them, as they're written in a different text style from the other pages' section names. They're now written as words and drawn in capitals by the style, so "GymPal's button" is read as a name and not spelt out. On screen they look as before.
- **Six more section names elsewhere are headings:** on Workout "YOUR WORKOUTS" and "START ANOTHER WAY" (not when it's just "OR" between two choices), on the interval timer "TIMERS" and "SETTINGS", and Explore's "RECENT" places when you open the search box. Also "LOOKED AT LATELY" on Saved, "YOUR CARDS" on the monthly challenge, and "DAYS" and "TIME" on Reminders; those only show once there's something in them.
- Left as they are: the "PRO" marks beside choices, the SET, REPS and RPE column labels, and the words inside cards (a new record, a week's best card), which aren't sections of a page.
- Checked in the browser: Appearance's outline (its title, then 14 sections), Workout's, the timer's and Explore's with the search open. Appearance's names are drawn in capitals and written as words, "GymPal's button" among them in the accessibility tree. axe on Appearance, Workout, the timer, Explore, Reminders and the monthly challenge in the standard look, light and dark, phone and desktop: 24 checks, all clean. Hooks rules clean. App tests 617.

## Update 230 · Checked: the other sheets hold focus; one question about moving widgets

*20 Nov 2026 · `5a6c310`*

Following Update 229, the other things that open over a page were tried by keyboard, along with the desktop layout:

- **Customise Home's widget gallery** (+ on the editing bar) is a dialog named "Widgets". Forty Tabs stay inside it, and Escape closes it with focus back on "Add a widget". **The card that shows when you collect a gym** uses the same kind of dialog, with its own focus trap. The sort and time choices were already checked (Update 224). Nothing to change.
- **Desktop width (1280):** tabbing through Home, Explore (with a gym or Filters open), Profile, Saved, Progress, a workout in progress, Customise Home and a gym's page, nothing that has focus is hidden. The recovery map's muscles fool the check, as on phones, but each draws its own outline.
- **Dragging (WCAG 2.5.7) — a question for you, not changed.** On Home, a widget is moved by holding and dragging it, as on an iPhone. A screen reader has Move up and Move down for each widget, and the keyboard has its own way (Update 210). But someone using a mouse or a finger who can't hold and drag has no other way to move one. WCAG 2.2 asks for one, and the usual answer is a small pair of up and down buttons on each widget while editing. That would change the iPhone-style editing (jiggle, − badges, hold and drag) asked for in Update 72, so it's left for you to decide. The map's own dragging is fine: the search and the list find the same gyms without it. The tour (Next and the dots) and GymPal's edge tab (a tap opens it) are fine too.

## Update 229 · Filters keeps the keyboard in it; Escape closes only what's on top

*20 Nov 2026 · `7bd3d91`*

Tabbing through Explore with Filters open (Update 228's check, carried on) found two things:

- **Fixed: Tab walked out of Filters.** Filters opens over a dimmed page, and tapping outside it closes it, so it's a dialog. But Tab past its last button went on to the page underneath: the map, its credits and its buttons, all out of sight behind the sheet. Now focus that leaves Filters comes back to its first control (Reset) going forwards, or its last (Show … gyms) going backwards. The sheet is also named "Filters" as a dialog for a screen reader. A dialog opened over it keeps its own focus: in GymPal, Tab stays in GymPal. A gym's card isn't a dialog in this sense (the map stays usable beside it, as in a maps app), so it's left as it is.
- **Fixed: one Escape closed two things.** With GymPal open over Filters, Escape closed GymPal and Filters with it. GymPal's dialog (and the sort and time choices) don't mark their Escape as handled, so Explore's own Escape closed its sheet too. Explore now leaves alone an Escape pressed inside another dialog. Now the first Escape closes GymPal and puts you back in Filters; the second closes Filters and puts you back on its button.
- Checked in the browser: 40 Tabs in Filters, all inside it; Tab from the last control goes to the first, Shift+Tab from the first to the last; Show … gyms closes it with focus back on Filters; GymPal over Filters, then two Escapes, as above. axe on Explore in the standard look, light and dark, phone and desktop: 4 checks, all clean. Hooks rules clean. App tests 617.

## Update 228 · What has focus is never hidden behind a bar or a sheet

*20 Nov 2026 · `a6d997f`*

WCAG 2.2 asks that what has keyboard focus isn't hidden behind something that stays on screen (2.4.11). Pages were tabbed through, 50 to 70 stops each, checking at every stop whether the focused control was under something else. The tab pages were already fine: their scrolling keeps focus clear of the tab bar. Two places weren't:

- **Customise Home:** a widget near the bottom took focus behind the editing bar (Add a widget, Done). The page made room under its last widget for the bar, but left the bar out of the room it keeps clear when scrolling to what has focus. Now it's in that room too (`scrollPaddingBottom` in `components/ios.tsx`), and no widget is hidden.
- **Explore, at a phone's width:** Tab through the results opens the sheet all the way, then Tab goes on round to the map's own controls (Show every gym, Show gyms near me, the weather). Those were under the sheet, so focus couldn't be seen. Now focus anywhere on Explore outside the sheet brings the sheet down to the middle, and the control shows, with its ring. Phones aren't affected: this listens only in a browser.
- Not counted: the muscles on the recovery map and in the workout builder overlap each other's boxes, which fools this check, but each muscle draws its own outline when it has focus. And the map itself is one large area, which stays partly in view.
- Checked in the browser: 60 stops on Explore and in Customise Home, with nothing hidden; Home, Profile and Saved still with nothing hidden; a picture of Explore as focus comes round to "Show gyms near me". axe on Home and Explore in the standard look, light and dark, phone and desktop: 8 checks, all clean. Hooks rules clean. App tests 617.

## Update 227 · Checked: a quiet console, forms that fill themselves

*20 Nov 2026 · `b1085a7`*

Three checks that found nothing to change, written down so they needn't be repeated:

- **The browser's console** was read on every page and on what opens over a page. Signed in (the dev account), signed out and as a free account, React reports nothing in the development build: no list without keys, no state set while another part draws, no failed request. What's left is expected. There's Reanimated's note that reduced motion is on (the check turns it on), WebGL's notes from drawing the map without a graphics card, and one map warning on Explore ("Expected value to be of type number, but found null"). That warning comes from the map style GymGO borrows from OpenFreeMap (a rule of theirs meeting a map feature without that value), not from GymGO's code.
- **Forms fill themselves.** Creating an account asks the browser for your name, email and a new password (`autocomplete` name, email, new-password); signing in for the email and saved password (current-password). The month and year you were born is left out of autofill on purpose; there's no single autofill value for month and year anyway. WCAG 1.3.5 asks for this, and it was already right.
- **The white box behind "Good morning" in High Contrast** (Update 225's pictures) isn't GymGO's. In forced colours Chromium draws a plain backplate behind text over a background picture, here Home's soft wash, so the text stays readable. That's as it should be.

## Update 226 · High Contrast mode: buttons look like buttons

*20 Nov 2026 · `83b71c2`*

Looking at whole pages with forced colours on, after Update 225, one more thing was lost with the fills: the edge of a button. "Do it again" on Workout, "Start" on Home's Up next card and "Change" on Plates were words on the page, like any other text, with nothing to say they could be pressed. So were the cards and rows that open something.

- **Now every button is outlined in forced colours**, as Windows draws its own buttons in High Contrast. That's the same one-pixel outline in the text colour that Update 225 gave tabs, chips and choices. It takes no room, and nothing changes without forced colours.
- On Home the quick searches, Build a workout, the tool tiles and the stat cards now have edges. On Workout "Do it again" is a button again, and on Plates so is "Change". On Profile each row has its own box: plainer than the normal look, but it says where each one is.
- Checked in the browser with forced colours on: Home, Workout, Plates and Profile. Last round's ring, switch, kg/lb and chips still show as they did, and without forced colours they look as before. App tests 617.

## Update 225 · High Contrast mode: focus, switches and choices can be seen

*20 Nov 2026 · `963f811`*

Windows' High Contrast themes (forced colours) make the browser redraw a page in a few system colours. It drops every shadow and replaces every fill with the page's own colour. GymGO draws its focus ring with a shadow and shows state with fills, so with forced colours on (emulated in the browser):

- **There was no focus ring at all.** A keyboard user couldn't see where they were. Now the ring is drawn as an outline in the system's highlight colour, which forced colours keep. Without forced colours it's the same two-tone ring as before.
- **Switches vanished.** Track and knob are both fills, so only the label was left, with no switch to see or tell on from off. Now the track is outlined, the knob drawn in the text colour, and a switch that's on fills with the highlight colour.
- **Selected choices looked like the rest.** The selected segment (kg/lb), a filter chip that's on and the current tab were told apart only by a fill. Every tab, chip, tick and choice is now outlined. The selected ones fill with the highlight colour, their words and icons in the highlight's own text colour.
- All of this is CSS in one place (`app/_layout.tsx`), keyed on what each control already tells a screen reader (`aria-checked`, `aria-selected`, `role=switch`). It applies only when forced colours are on, and the outlines take no room.
- **Checked, nothing to change: reflow.** At 320 pixels wide (a 1280-pixel screen at 400%), no page scrolls sideways and no text runs off the edge outside the rows made to scroll (carousels, chip rows). That covers every page and the opened sheets, and Sign in signed out.
- Checked in the browser, with forced colours on and off: the focus ring on Plates' unit choice; a switch on Report a bug; Plates' kg/lb; Explore's chips with "Open late" on; the tab bar. Without forced colours each looks as before. axe on Home, Explore, Plates and Report a bug in the standard look, light and dark, phone and desktop: 16 checks, all clean. Hooks rules clean. App tests 617. Real Windows High Contrast, as opposed to the browser's emulation of it, is still to be tried on a Windows machine.

## Update 224 · Wider text isn't cut off; reduced motion holds

*20 Nov 2026 · `892cb1a`*

Some people read with their own text settings: more space between lines, letters and words. WCAG 1.4.12 says nothing may be cut off when they do (line height 1.5, letter spacing 0.12em, word spacing 0.16em, paragraphs 2em apart). Every page was opened twice, once plainly and once with that spacing in place from the start, and the text cut off only the second time was listed.

- **Fixed, wrapping instead of being cut short:** the monthly report's figures ("6 h 15 min" lost its end), gym names on Home's cards, a row's value on the right (Profile's "None picked"), Appearance's swatch names ("Your own"), My workouts' rows (beside the Start button they now take up to three lines) and the choices in a segmented control ("Standard · 6" in the workout builder).
- **Home's gym cards stay even.** A two-line name ("Waterloo Aquatic & Fitness Centre", already cut short at ordinary spacing) made that one card taller than the rest. Each card in a row now grows to the tallest, with its chip and price along the bottom: all 238 pixels high, the bottom row 12 pixels from the edge. A segmented choice that wraps stays centred.
- At ordinary spacing nothing else changes: these only take another line when the words need it. The builder's segmented control is still 36 pixels high.
- Left as they are: the preview of Up next's exercises (the full list is on the workout) and the words inside Appearance's small theme previews.
- **Checked, nothing to change:**
  - **Reduced motion.** With it on, none of the 13 pages and opened states tried (the main pages, Welcome, the timer, a gym's page and sheet, Customise Home, a workout in progress) has anything running: no animations, and nothing on screen whose position or fade changes over half a second. With motion allowed, the same check does see the jiggle in Customise Home (11 endless animations), so it isn't blind.
  - **The two Tab stops in the sort and time sheets with no role** are React Native Web's own: zero-size stops before and after the dialog that send focus back inside. That's the dialog's focus trap working as meant.
- Checked in the browser: the spacing check over every page and the opened sheets, the cards' heights and bottom rows, and the segmented control both ways. axe on Home, the monthly report, Profile, Appearance, My workouts, the builder and Collection in the standard look, light and dark, phone and desktop: 28 checks, all clean. Hooks rules clean. App tests 617.

## Update 223 · One Tab per switch, and no repeated ids

*20 Nov 2026 · `3ecaa6c`*

The rest of the rules axe leaves out of its default run were tried over the pages: headings made of bold lines, controls without a role in the Tab order, repeated ids, a page locked to one orientation, and made-up role names. Three things came up:

- **Fixed: a switch took two Tabs.** The row a switch sits in (Haptics, Sounds, RPE on sets, Location, GymPal, Google content and Demo mode on Profile; "Email me about this" and "App and device details" on Report a bug) was a Tab stop of its own. It had no role, and Enter on it did nothing, so the switch was one more Tab after it. React Native Web makes every pressable a Tab stop unless it's given `tabIndex`, and it ignores `focusable`. A row with nothing to press is now `tabIndex` −1 in a browser (Android keeps `focusable`). Report a bug now goes text box, switch, switch. On Profile all 32 buttons, the rows that do open something among them, are still Tab stops.
- **Fixed: the GymPal logo repeated its ids.** Each of its two layers named its gradients "gympal-ground" and "gympal-iron", so every page showing the logo twice had the same ids four times. Nothing looked wrong. But a logo's fill takes the first gradient of that name, and one in a hidden page doesn't paint. Each layer of each logo now names its own (React's `useId`). The logos paint the same colours as before, sampled from the drawn tile on Profile, Templates and Appearance.
- **Fixed: Collection's badge row** is a Tab stop so the keyboard can scroll it, and it was marked a group. A group isn't a role for a scrolling part, so it's now a region, still named "Badges".
- No headings made of bold lines, no orientation lock and no made-up roles were found.
- Checked in the browser: Report a bug's Tab order; the two rules now pass on Profile, Report a bug, Appearance, Templates and Collection; Profile has no repeated ids; the logos' colours. axe on those five pages in the standard look, light and dark, phone and desktop: 20 checks, all clean. Hooks rules clean. App tests 617.

## Update 222 · Say what you see: buttons named by their own words

*20 Nov 2026 · `215f32b`*

With voice control you press a button by saying what's written on it. That only works if the button's name, which is what a screen reader says, contains those words (WCAG 2.5.3, "Label in Name"). axe has a rule for this but leaves it out of its default run. So every page was checked another way: does each named control's visible title, its first line of words, appear in its name? Fifteen didn't:

- **Home's "Machines" tile** was named "Find a machine". Now "Machines: who has what".
- **On a gym's card and page:** "Build a workout here" (was "Build a workout for this gym"), "See it on Google" (was "See this gym on Google Maps") and the photo strip's "Add one" (was "Add a photo"). Each name now starts with its words.
- **"Make your own split" and "Make your own exercise"** were named "Make a split of your own" and "Make an exercise of your own". Free accounts get the same words, with "with GymGO Pro" after.
- **Templates' "5 exercises" buttons** were named "Show the exercises for Full body B". Now "5 exercises in Full body B: show them", and "Hide exercises: Full body B" once open.
- **In a workout and when editing one:** "Add set" (was "Add a set of Incline barbell bench press") is now "Add set: Incline barbell bench press", and "Warm-ups" now starts with "Warm-ups".
- **Collection's finished sets** were both named "Melbourne set complete" when the card says "SUBURB SET COMPLETE" or "CITY SET COMPLETE". A screen reader couldn't tell the two apart. Now "City set complete: Melbourne. Open to share".
- **Also:** Friends' "Send your code", Plates' "Change", the monthly challenge's "Share it", the split editor's "Remove this day" and an exercise's "Volume" chart choice ("Volume: Weight lifted that day").
- Judged fine and left: the Up next card (its name holds its words, in another order), "All 8" on Templates (its name starts with "All"), and cards whose first line is a picture's "Illustration" badge or a theme's preview (their names start with their real titles).
- Checked in the browser: the same check, rerun on every page that had one, finds none; the new names read in the accessibility tree. axe on the ten pages in the standard look, light and dark, phone and desktop: 40 checks, all clean. Hooks rules clean. App tests 617.

## Update 221 · Every control is big enough to press: the tour's dots were 8 pixels

*20 Nov 2026 · `82cab54`*

WCAG 2.2 asks for controls of at least 24 by 24 pixels, or enough room around a smaller one. axe has a rule for it (`target-size`), but it isn't in axe's default run, so none of the axe checks so far had tested this. It was run on its own over every page, and on what opens over a page.

- **Found: the tour's page dots on Welcome.** They were 8 by 8 pixels (the current one 22 by 8), close together. On a phone each had a larger touch area (`hitSlop`), but a browser has no such thing, so on the website the target was the dot itself.
- **Fixed:** each dot is now drawn inside a 24-pixel-tall target, as wide as its dot plus 16. The targets' centres are 24 and 31 pixels apart, and the row is as tall as before, so Next hasn't moved. The one visible change is the dots spreading from 8 to 16 pixels apart. Pressing one still turns to its page.
- **Everything else passes**, at phone width on every page (with and without an id in the path, and Sign in signed out), and at desktop width on the main pages: Filters, the sort and time choices, a gym's sheet, a gym's page, GymPal, customising Home and a workout in progress. axe was unsure about only two kinds of target. One is map markers partly under an open sheet (covered, so not meant to be pressed there). The other is the map's credit links (OpenFreeMap, OpenMapTiles, OpenStreetMap), which are text links in a line of credits; the rule exempts targets in a line of text.
- Checked in the browser: the dots' sizes and spacing, pressing the third, and the picture of the row. axe on Welcome in all three looks, light and dark, phone and desktop: 12 checks, all clean. Hooks rules clean. App tests 617.

## Update 220 · "GymGO Pro" is read as a name, not spelt out

*20 Nov 2026 · `c24b877`*

Grouped lists already write their labels as words and let the style draw the capitals, because VoiceOver spelt out "GYMGO" typed in capitals (`components/ios.tsx`). Four labels still had a name typed in capitals, and the browser passed them on that way too: the accessibility tree said "GYMGO’S TEMPLATES".

- **Now written as words, drawn in capitals:** "GymGO’s templates" on Templates, "GymGO Pro" on Account and on the Pro card for a free account, and Profile's "Pro", "Free" and "Moderator" badges. On screen they look exactly as before. In the browser each is shown as "GYMGO PRO" but read as "GymGO Pro" (its text is written as words and `text-transform` makes the capitals).
- Left alone: the section titles typed in capitals ("HISTORY", "BADGES · 7 OF 12"), which are ordinary words. Turning on capitals for every small label would also change the few written in normal case on purpose ("Your workout", "Saved 18 November").
- **Build a workout is a heading** (level 2, under the bar's "Workout"). It was the last large page title that wasn't one; the other large text is figures (the timer, a friend code, a 1-rep max, a rating).
- Checked in the browser: each label's drawn text in capitals, its written text in words, and the accessibility tree's names. That covers the Pro card on Home for the local free test account, with Pro made to look on sale, as the contrast checks do. Profile's badges look as before, and the builder's headings read "Workout", then "Build a workout". axe on Templates, Account, Profile and the builder in the standard look, light and dark, phone and desktop: 16 checks, all clean. Hooks rules clean. App tests 617.

## Update 219 · Long pages have sections a screen reader can jump between

*20 Nov 2026 · `c7dee6a`*

After Update 218 every page has its main heading, but many long pages had nothing under it. Their sections are marked by small capitals ("BADGES · 7 OF 12", "HISTORY", "EVERY COUNTRY"), which a screen reader read as plain lines. To reach the bottom of Progress or past 200 countries, it had to go line by line. Grouped lists already did this (each group's label is a heading), and Templates and Exercises did too.

- **Now the section titles are headings (level 2)**: 30 places in the code, and the one that draws the country chooser's three. On Progress, an exercise's progress, the monthly report, Collection, Measurements, Lifetime, Friends, a friend's page, editing a split, your own exercise, and the country chooser ("Suggested", "With cities built in", "Every country").
- On Progress the log's days ("Today", "Wednesday, November 18"…) were level 2 beside the sections; they're now level 3, under History.
- Nothing moves: the browser makes these `h2` and `h3` elements, and every margin on them is the app's own (20/8/16 px on Country, 8/16 on Collection, 12/16 and 16 on Progress), with none of a browser's default heading margins. The sizes are as before (11 and 13 px).
- Left alone: the small-capitals labels inside a card (the recap, the timer's ring, an ad), which aren't sections of the page. The titles are still typed in capitals, which a screen reader may spell out when a word is short. Writing them as words and letting the style put them in capitals, as grouped lists do, is a change of its own.
- Checked in the browser, the outline of each of the eleven pages: one main heading, then its sections, then Progress's days under History. axe on the eleven pages in the standard look, light and dark, phone and desktop: 44 checks, all clean (headings change no colours or surfaces, so the frost and liquid looks weren't rerun). Hooks rules clean. App tests 617.

## Update 218 · Every page has one main heading

*20 Nov 2026 · `fff6f8d`*

A screen reader can jump from heading to heading, and its first stop is a page's main heading (level 1). Every page was opened to count them. Most have exactly one: the title in the bar at the top, or the page's own. Four didn't:

- **Explore had no heading at all**, so the jump found nothing. A screen reader met the map's 15 markers and its credits before the search box, with no way past them. The results' "Near Surry Hills" is now the main heading, so one jump lands on the results. It looks the same as before (22 px bold, no margin).
- **Welcome had none either.** Each page of the tour is read whole as one group, so its title can't be the heading. A heading nobody sees, "Welcome to GymGO", now comes first. It's in the same unseen 1×1 box as the line that says a page's name, and it paints nothing: the pixels there match with its text made transparent, light and dark.
- **Monthly challenge and Training programme had two**: the bar's title and the page's own large title. The page's title, and the plan's card once a programme is running, are now level 2 under the bar's.
- Checked in the browser at phone and desktop width: each of the four now has exactly one main heading. Every other page without an id in its path has one, and so do the ones with an id that were opened: a gym, a friend, the two legal pages and the workout builder. A trip, an exercise's progress and a saved workout weren't opened. The page under a pushed page (Home under Plates) is hidden from a screen reader as it should be (`display: none`, `aria-hidden`). Each page's title, which is said on arriving (Update 211), is its own: Sign in is "Create an account", and only Home is plain "GymGO". axe on the four pages, in all three looks, light and dark, phone and desktop: 48 checks, all clean. Hooks rules clean. App tests 617.

## Update 217 · What the calculators, measurements and offline screens tell you is said too

*20 Nov 2026 · `d7649ee`*

Updates 215 and 216 went by what a message is called. This round went by how it looks: every line that comes and goes in the colours of a problem, a warning or a success. Most of those are facts drawn with the page (a gym's prices, a chart's legend, a programme's week) and are right as they are. Nine answer something you did, and weren't said:

- **The plate and strength calculators:** "That doesn’t read as a weight.", "Reps are a whole number, like 5." and "Past 12 reps the estimate isn’t worth much…", as you type.
- **Measurements:** "Kept for today. Measuring something again today replaces it." after Keep today’s.
- **Editing a split or workout:** "Reps as a number (8), a range (8–10) or a time (30 s)." under reps it can't read.
- **Inviting a friend to train:** "That time has passed today. Pick a later one, or another day."
- **When GymGO's server can't be reached:** "Still no answer…" after Try again on the server card (Profile, Account and others), and the reason on Progress and on Workout ("Couldn’t reach the GymGO server for your log…"), which shows once loading has failed.
- Each is now in a `LiveLine`, the same as Updates 215 and 216. Every one sits in a column spaced by `gap`, where an empty line takes no room, so nothing moves.
- Checked in the browser, all nine said: the calculators by typing "abc" and 15 reps; Measurements by keeping a value; the split editor by adding a back squat and typing "lots" for its reps, not saved; a friend's invite by picking Today at 6 am, not sent; and Profile, Progress and Workout with the server blocked. Every one except the two offline lines came from a line already on the page before the message appeared. Those two show once loading has failed, so instead their lines were seen on the page, empty, while all was well. axe on the eight screens (Plates, 1-rep max, Measurements, Progress, Workout, Profile, the split editor, a friend's page), in all three looks, light and dark, phone and desktop: 96 checks, all clean. React's hooks rules still clean. App tests 617.

## Update 216 · Shared, copied, hints and the map's notices are said too; a fading notice still fades

*20 Nov 2026 · `4c11c97`*

Update 215 looked for messages held as a "problem", "error", "note" or "notice" that start with a line of text. This round looked wider: messages under other names ("shared", "hint", "sent", Report a bug's two email lines) and messages drawn in a box with an icon. A script listed every message that comes and goes and isn't in a line a screen reader hears: 17 more, in 14 files.

- **Now said as they appear:** "Copied, ready to paste." after sharing your collection or a finished workout; "Type how many reps you did." when a set is ticked with none; Report a bug's "That email address doesn’t look right." and, on a copyright notice, "A notice needs an email address…", and its problem sending; a problem on Pro; Workouts failing to load; Account's notices; an invite sent from a friend's page; the notices of the five member tools on a gym's page; the gym card's notices (a demo listing's Call, no phone or website on record); and Explore's, such as "Couldn’t find a place called …".
- **Caught on the way: a notice that fades out would have stopped fading.** In a browser the fading copy is drawn inside the box that holds the message, which is now the `LiveLine`, and that box leaves the layout the moment the message goes. So Explore's notice was clipped to nothing as it went, and drawn at the top of the list besides. Seen in the browser with the change held back for one run: the copy's box was 0×0 with its overflow hidden, at y 45 against the notice's 279. `<LiveLine fadesOut>` now keeps its place until the copy has gone. In a browser it watches for that, which a busy page can delay well past the fade's 150 ms (up to about 400 ms here), and gives up after a second. On a phone it waits the fade's length (`FADE_OUT_MS`, now exported from `components/motion.tsx`). Only the three notices that fade out use it: Explore's, Account's and the gym card's. Only Explore's is ever cleared; the other two are only replaced.
- Checked in the browser, each message said from a line that was on the page before it appeared: Collection's share, both Report a bug email lines, a workout's reps hint, Explore's "Couldn’t find a place", the gym card's demo Call. Explore's notice, cleared by picking a recent place, faded where it was, in the kept box, in three runs (opacity seen at 0.48 and 0.17 on the way), and afterwards the box was out of the layout again. axe on the eight screens this touched most (Collection, Report a bug, a workout, Explore, Account, Pro, Workouts, a gym's page) in all three looks, light and dark, phone and desktop: 96 checks, all clean. React's hooks rules still clean over the app. App tests 617.

## Update 215 · Every problem message is now said to a screen reader

*20 Nov 2026 · `21a4a23`*

Update 214 found messages that showed but weren't said. Rather than go form by form, the app was searched for every message that comes and goes (a problem, a notice) and 29 more were found on 23 screens that a screen reader wouldn't hear. Among them: Profile, Progress, Train, Spend, Measurements, Photos, Challenges, the leaderboard, a friend's page, editing a workout, a split or an exercise, a session's note, the day pass, the gym owner's tools, moderation, the Pro extras, the collection's data and the crash screen.

- **Now they're all said as they appear**, through one small piece (`LiveLine` in `components/ui.tsx`): a line a screen reader listens to, always on the page (one made only with its words isn't reliably read), and out of the layout while there's nothing to say, so it adds no space between its neighbours. Update 214's two lines use it too.
- Checked: 29 wrapped by one script that matches each message by its indentation and leaves alone any already in such a line (one slip, a closing tag on Friends, was put right before anything ran); the Friends screen draws exactly as before (the empty lines are 0×0, out of the flow), and a message, when there is one, sits in the flow and is said; axe clean on the ten screens it touched most, light and dark, phone and desktop; React's hooks rules still clean over the app. App tests 617.

## Update 214 · Adding a friend and logging your weight: you're told, and you stay in the field

*20 Nov 2026 · `e58079d`*

Two small forms were tried by keyboard on the website: a friend's code on Friends, and today's weight on Progress.

- **Fixed: their results weren't said.** "No one has that code. Check it with your friend?" and a weight GymGO can't read ("Type your weight in kg, like 72.5.") showed, but a screen reader wasn't told. Both now sit in a line a screen reader hears as it changes. A weight that's logged now says so too: "Logged 72.6 kg for today." (until you type again).
- **Fixed: Enter dropped you out of the field.** A one-line field lets go of focus on Enter in a browser, so a wrong code couldn't be put right without finding the field again. Both fields now keep focus. Phones keep their own keyboard behaviour.
- **Caught on the way:** my first go put the new line's state below the card's early return, which breaks React's rules of hooks; the browser check showed the "Something went wrong" screen on Progress, and it was fixed before anything was committed. As the repo's own lint is the type check and doesn't look for this, React's hooks rules were then run over the whole app: nothing else breaks them (a helper in the country packs named `use`, which isn't React's, is renamed `adopt` so it doesn't look as if it does).
- Checked in the browser: both messages said, focus kept, Home and Progress draw; axe clean. App tests 617.

## Update 213 · Writing a review by keyboard keeps your place

*20 Nov 2026 · `0aaf1c8`*

A review was written with only the keyboard, on demo gyms, as a free account.

- **What worked:** Space picks a star (Update 197), and the form sends.
- **Fixed: opening the form lost focus.** Write a review gives way to the form, and focus went with the button to the page itself. The form's "Your review" heading now takes focus, and the next Tab is the first star.
- **Fixed: sending lost focus.** The form gives way to "Your review is waiting for a moderator" once the reviews are read again. That card now takes focus then, only after you've sent: opening a gym's page that already has your waiting review leaves focus where you put it.
- Checked in the browser: open, Tab, stars by Space, send; the page with a waiting review; axe clean with the form open. App tests 617.

## Update 212 · Sending a bug report says so

*20 Nov 2026 · `1d1f213`*

Report a bug was tried by keyboard on the local server (where no email can go out: no mail account is set).

- **What worked:** a few letters in gets "A few more words, please · 3 / 4,000", and Send report goes through.
- **Fixed: after sending, focus went nowhere.** The form, Send button and all, gives way to "Thanks, that's sent", and focus fell to the page itself, as Workout done's did (Update 208). Its heading now takes focus, so a screen reader reads it, and the next Tab is Done. Workout done and this now share one small helper (`useFocusOnArrival` in `lib/focusNext.ts`).
- Checked in the browser: focus on "Thanks, that's sent", then Done; Workout done still takes focus after a keyboard workout. App tests 617.

## Update 211 · Moving between pages: the new page is said, and Back puts you where you were

*20 Nov 2026 · `c1092b2`*

Going from page to page was tried by keyboard on the website (Profile → Progress, back; Profile → Lifetime, the browser's back).

- **Going forward was fine:** the tab's title changes, and the next Tab is the new page's first control (Back to Profile), as on a fresh page.
- **Fixed: a screen reader wasn't told the page had changed.** In a one-page app the browser doesn't announce a new title. Each new page's name ("Progress", "Profile") is now said politely by a line nobody sees.
- **Fixed: going back lost your place.** Focus fell to the page itself, and Tab started again from the top. Now the control you left a page from is remembered, and coming back puts focus on it: the Progress row after Back, the Lifetime row after the browser's back button. Moving between the tabs is unchanged (focus stays on the tab).
- Checked in the browser at 390 and 1280 with the app's Back and the browser's; axe clean. Phones' screen readers do both themselves, so nothing changes there. App tests 617.
- **And a sweep after Updates 202 to 211**, since they changed parts many screens share (the tap-to-close backdrop, the focus helpers, the page announcer): axe on 30 pages, light and dark, at 390 and 1280 (120 page loads), all clean with no page errors. The screen measure on Welcome, Train, Friends, Explore and Home, in Standard and Liquid, found every word over 4.5:1.

## Update 210 · Customising Home by keyboard keeps your place

*20 Nov 2026 · `6348380`*

Customise Home was tried with only the keyboard.

- **Fixed: starting to edit lost focus.** The Customise Home button goes as editing starts, and focus went with it to the page itself. The bar at the foot now takes focus as a toolbar named "Customising Home", so a screen reader reads how editing works ("Hold a widget to move it. − takes it off.") and the next Tab is Add a widget, then Done.
- **Fixed: taking a widget off lost focus.** Its − goes with it. Focus now moves on to the next widget (Update 209's helper).
- **Fixed: Done lost focus.** The bar goes, and focus now comes back to Customise Home.
- Checked in the browser at 390 and 1280: start, Tab, take Weather off, Done; axe clean while editing. App tests 617.

## Update 209 · "Not now" on the Pro card moves focus on, not away

*20 Nov 2026 · `cf1e9f6`*

Following Update 208, other buttons that take themselves away were tried by keyboard.

- **Fixed: "Not now" on GymGO's Pro card.** The card goes, and focus went with it to the page itself, so a screen reader went quiet and Tab started again from the top. Focus now moves on to the next thing on the page ("See all" under Saved, on Home), with its ring. Remove on a saved gym that's no longer on the map does the same (one small helper, `lib/focusNext.ts`).
- **Left as it is:** Discard workout takes you back to Home, a new page, and focus starting at the top of a new page is what browsers do.
- Checked in the browser at 390 and 1280 as a free account. App tests 617.

## Update 208 · A workout by keyboard alone; finishing tells you it's saved

*18 Nov 2026 · `6b954a7`*

A whole workout was logged with only the keyboard, at a computer's width and a phone's: Do it again, then Tab to the first set, a weight, Tab, reps, Tab to the tick, Space, and on to Finish workout.

- **What worked:** Tab goes through each exercise in order (how to do it, swap, rest, plates, the set's kind, weight, reps, the tick), then adding a set, a warm-up, a note, an exercise, then Finish and Discard. Space ticks the set (Update 197), and focus stays on the tick, whose name then says it's your heaviest.
- **Fixed: after Finish, focus went nowhere.** The Finish button goes with the workout, so focus fell to the page itself: a screen reader said nothing of the workout being saved, and Tab started again from the top. The "Workout done" (or "1 new record") heading now takes focus as it appears, so it's read out and Tab goes on from there.
- **Also checked:** a wrong password says "That email and password don't match.", read out at once.
- Checked in the browser at 1280 and 390: focus on "Workout done" after finishing. App tests 617.

## Update 207 · Without the server: every page says so; Train did not

*18 Nov 2026 · `aabb99f`*

The app was tried signed in with the GymGO server cut off, as on a dropped connection, page by page.

- **What it does well.** Saved shows the device's copy and says the server isn't reachable. Profile says "Can't reach GymGO. You're still signed in." with Try again. Explore's map is marked as an offline copy. Progress says it couldn't reach the server for your log. A gym's page says its members' photos didn't load. Home keeps its widgets, with "No forecast just now". No page broke.
- **Fixed: Train looked like a new account.** Without the server, your last workout and your own workouts can't load, and Train quietly showed the first-time screen, as if they'd gone. It now says the same as Progress, "Couldn't reach the GymGO server for your log. Your last workout shows here again once it's back.", with Try again, which loads both again.
- **Also tried, nothing to change:** a workout finished with the server cut off says "Couldn't reach the GymGO server. Your workout is still here; try again.", keeps the workout and its ticks through a reload, and finishes ("Workout done") once the server is back. On the sign-in page, an email that's already used, a birth year under 13 and too many attempts each get a plain message that a screen reader hears at once.
- Checked in the browser with the server's requests refused: the note and Try again show; with the server back, Try again brings back "Do it again" and your workouts, and the note goes. (The first try was a false all-clear: in development the app reaches the server through Metro's own address, which the test hadn't cut off.) App tests 617.

## Update 206 · Pop-ups: no invisible stop behind them, and GymPal gives focus back

*18 Nov 2026 · `34ee181`*

The same open-and-Escape check, on the pop-ups: the sort and time choices on Explore, and GymPal.

- **Fixed: an invisible stop behind the pop-ups.** The area behind GymPal, the sort and time choices, Home's widget tray and the card reveal (a tap there closes them) was a button to the keyboard in a browser, because React Native Web gives every Pressable a tab stop. So a pop-up's focus trap landed on it first, with a focus ring round the whole screen, Tab stopped there, and Enter on it closed the pop-up. It's now a plain area that answers a tap (a new `Backdrop`). Opening the sort choice puts focus on its first option, "Best match", and Tab in GymPal goes from its text box to Close. Phones keep what they had.
- **Fixed: closing GymPal lost focus.** Escape left focus nowhere (on the page itself). The Modal does try to put it back, but it noted the text box, which had already taken focus and leaves with him. GymPal now keeps track of what last had focus outside it and returns there once he's fully gone: his button (drawn afresh as he closes) or the Ask GymPal row on Profile.
- Checked in the browser at 390 and 1280: sort, time and GymPal each take focus inside, Tab stays in them, and Escape returns to what opened them. A tap or click on the area behind still closes them. axe is clean with each one open. App tests 617.

## Update 205 · Filters on a computer take focus too

*18 Nov 2026 · `3b7fc09`*

Straight after Update 204, the same check on Filters: on a computer they open in the side panel, but focus stayed on the Filters button, so Tab went on to "Your account", and Escape left focus where it was.

- **Both side panels now work the same way**, through one piece of code. As the panel opens (or another gym is picked), its content takes focus. When it closes, focus goes back to what opened it: the Filters button, a row, a pin or the search box. Going from Filters back to a gym's card (Escape or Done) puts focus in the card and keeps the earlier opener.
- Checked in the browser at 1280: Filters by keyboard (focus in, Tab to its first control, Escape back to the button); a gym, a second gym, Escape back to the second row; a gym, then Filters, then Escape back into the gym's card. App tests 617.

## Update 204 · On a computer, a gym's card takes the keyboard's focus

*18 Nov 2026 · `74ba0ae`*

Opening a gym from Explore's list was tried by keyboard. On a phone's width it was right: the gym's sheet takes focus, and Escape brings you back to the row. On a computer the card opens in a panel beside the list, but focus stayed on the row, and Tab went down the rest of the list first: **77 presses** near the CBD before the card.

- **Now the card takes focus as it opens**, as the phone's sheet does, so the next Tab is its first button (Open full screen, then Add to Compare, Close). Opening another gym from the list moves focus into that one. When the card closes (Escape, its close button or a tap on the map), focus goes back to whatever opened it: the row, a pin or the search box.
- Checked in the browser at 1280: Tab after opening reaches the card's buttons; a second gym opened from its row takes focus, and Escape returns to that row; the close button returns to its row; axe clean with the card open in Standard and Liquid, light and dark. The phone's sheet is unchanged. App tests 617.

## Update 203 · Every control shows keyboard focus; the tour's ring only for the keyboard

*18 Nov 2026 · `436b828`*

- **A sweep of keyboard focus.** Tab was pressed through Home, Explore, Saved, Profile, Train and Progress (about 45 stops each), and each control that took focus was checked for a visible mark. All of them showed GymGO's ring (an accent ring with a band of the page's colour inside, drawn over the control's edge), except Explore's search box, which shows focus with its accent border instead.
- **Fixed: the tour's ring (Update 202) showed on a tap too.** A tap or swipe in a phone's browser also gives the tour focus, so a ring would have appeared around it on every swipe. It now shows only when focus comes from the keyboard, as the browser itself judges it. The app's general ring is turned off for the tour, since inside the scrolling pages it would have slid away with the first one.
- Checked in the browser: a click focuses the tour with no ring; Tab focuses it with the ring, and the arrow keys turn its pages. App tests 617.

## Update 202 · The first run, tried as someone new; the tour works by keyboard

*18 Nov 2026 · `a2a9501`*

A brand-new account was made through the form on the local server, by keyboard where possible, and taken through what GymGO asks first.

- **What worked:** the date of birth field writes itself as "01 / 1990", Space ticks the agreement (Update 197), and Create account goes on to the welcome tour, then "Where do you train?", then Home. axe was clean at each step except one.
- **Fixed: the tour couldn't be reached by keyboard.** Its sideways pages were a scrolling part with nothing inside it a keyboard can land on, so axe flagged it. The tour is now a labelled region you can tab to, with the app's focus ring, and the arrow keys turn its pages: Right goes on and stops at the last, Left goes back. Next and the dots work as before.
- **Fixed: the page dots didn't say which page is showing**, in a browser. This version of React Native Web ignores React Native's older `accessibilityState`, so every state written that way said nothing on the website. All eleven uses were looked at. The dots now say which page is selected, the % slider says when it's off, and the share row says when it's busy. The rest already said it another way: in their own labels, which change ("Remove from Saved"), or in aria attributes or `disabled`, which the website reads.
- Checked in the browser: Tab reaches the tour; the arrow keys and the dots follow each other through all three pages; axe is clean at 390 and 1280. App tests 617.

## Update 201 · The sign-in form's prompts read; the password rule's mark too

*18 Nov 2026 · `81669ab`*

The signed-out screens had never been through the checks (they always ran signed in). Sign in and Welcome came back axe-clean in all three looks, and every word on them passes, but two things the measure can't see needed a look by hand:

- **The fields' prompts.** On the sign-in form each field shows only an icon and a grey prompt ("Name shown on reviews", "A new password", "MM / YYYY"), so the prompt is its only visible label, and it was in the faintest grey (3.3:1). The prompts are now a readable grey wherever they're a field's only label: sign-in, the account page's password fields, the timer's name, GymPal's question box, and the country and Explore searches. Worked out on each field's own fill, that's 5.1 to 8.8:1. Where a field has its label above it, or the grey number is an example or last time's value (the 1-rep max, a workout's sets), it stays faint, so it doesn't look typed in.
- **The password rule's mark.** The circle beside "8 characters or more" (2.9:1) is now the secondary grey, and the tick it turns into is the readable green; the plain green was about 2.2:1 on white.
- Checked: placeholder contrast read from the browser for each field in three looks, light and dark; app tests 617.

## Update 200 · "Students only" on a price reads in light

*18 Nov 2026 · `1e9797a`*

The last pairing from Update 199's search, worked out from the theme rather than seen, since no gym in the data limits a price yet: when a gym's price is only for some people ("Students only"), that line was orange on the accent's tint. In light that's 4.0 to 4.2:1 for every accent, under 4.5. It's now in the full ink, still semibold; the words say who it's for, so the colour wasn't the only sign.

- Checked: worked out for every look, light and dark, and every accent (two other places the search flagged sit just outside their tint); app tests 617.

## Update 199 · Grey words on the accent's tint get their own shade

*18 Nov 2026 · `8238ac4`*

Update 198's card had grey words on the accent's light tint. The app does that in other places too, so they were looked for together.

- **A new shade, made the way the others are.** The theme already darkens (or, in dark, lightens) the accent on its tint and the grey on a grey tile until they read at 4.5:1 on every surface a look paints. Grey on the accent's tint now gets the same: `labelSecondaryOnTint`, worked out for each look, light and dark, Dim and every accent, on the page, on cards and on glass.
- **Used wherever grey words sit on the tint** (found by searching for every tinted style and the words inside it):
  - Home's trip card and its Pro-country card;
  - the chosen clock sample in Appearance;
  - an earned badge in your collection;
  - your own row on the leaderboard;
  - the chosen measurement and programme goal;
  - the streak freeze cards on Progress;
  - GymPal's "About: …" chip;
  - the price pills when joining a gym.

  Where the tint only shows when something's chosen, the shade follows it.
- Checked: the theme's tests now hold the new shade to 4.5:1 for every look, scheme and accent, on the page, on a card and on glass over the glow. The screen measure found every word on those pages over 4.5:1 in all three looks, light and dark, at 390 and 1280, and axe was clean. App tests 617.

## Update 198 · Another country without Pro: the card reads in light

*18 Nov 2026 · `a76e51a`*

The last of the free plan's limits, tried as an Australian free account: Paris typed into Explore's search.

- **It does the right thing.** The map goes to Paris, the list says "In France, with GymGO Pro", and a card explains it: "Gyms in France are part of GymGO Pro. GymGO Free covers Australia, the country you chose, with every gym in it." It offers See GymGO Pro and Back to Australia. axe was clean at phone and desktop width.
- **Fixed: the card's words were just under 4.5:1 in light.** The card was an accent wash, and its grey words (4.42) and the quiet "Back to Australia" button (a second wash on the first, 4.43) fell short in all three looks. It's now on the list's own card, inset like the list, with the accent on the round badge behind the globe. It's the same build as the trip page's card for the same case.
- Checked: every word on it over 4.5:1 in all three looks, light and dark, at 390 and 1280 (at 390 only the card's top shows above the fold of the half-open sheet; the measure there reads the part under the tab bar, as usual); axe clean; app tests 617.

## Update 197 · Space ticks a box on the website

*18 Nov 2026 · `761e927`*

The free account's compare limit was tried with the keyboard: tick two saved gyms, Compare, then tick a third.

- **The limit itself works.** Two ticks, Compare 2, the comparison (axe clean at phone and desktop width), and a third tick opens Pro with "Free compares two gyms at a time. Pro lines up four."
- **Fixed: Space did nothing on a tick.** In a browser, React Native Web presses a control from the keyboard with Enter, and with Space only when it's a button. GymGO's ticks, choices, switches and tabs tell a screen reader they're checkboxes, radios, switches and tabs, and people expect Space to work on those, but Space only scrolled the page. The website now listens for Space once, on the page, and presses the focused control. Typing places and the browser's own controls keep their Space; a link keeps it for scrolling unless it's one of the tab bar's tabs.
- Checked in the browser: Space ticks the compare boxes on Saved, picks a choice in Appearance ("Automatic"), turns Bold text and RPE on sets on and off, and moves between the tab bar's tabs, while Enter still works. 5 new tests for which controls Space presses; app tests 617.

## Update 196 · A stray semicolon out of a gym's name

*18 Nov 2026 · `f5637bd`*

The free account's Saved list (Update 195's check) showed a Lisbon gym as **"110% Studio;"**. In OpenStreetMap a ";" separates several values in one tag, and this gym's name had one by mistake.

- **The name is now the first value** wherever GymGO reads a gym from the map: the bundled countries' generators, the live area search and the country packs (one shared function, `nameOf`, in `packages/osm`). A semicolon that's really part of a name is written ";;" on the map, and that stays a semicolon.
- **The one gym already in the data** reads "110% Studio" now (its id didn't change, so anyone who saved it keeps it). It was the only such name among the 3,012 gyms GymGO carries.
- Checked: three new tests (a stray separator, two values, ";;", and what the map reader hands on); every package's tests pass (app 612, server 315, domain 198, OSM 40, the data packages); the Saved page shows the name without it.

## Update 195 · A saved gym looks saved on the website and Android

*18 Nov 2026 · `991a9e0`*

Saving gyms was tried as a free account would: nine saved, the Saved page, a tenth from a gym's page, then an eleventh.

- **What worked:** the Saved page said "9 of 10 saved on Free." with a link to Pro, the tenth saved, and the eleventh opened the Pro page with "You've saved as many gyms as Free keeps." Where Pro isn't on sale, the page says so plainly ("Not on sale yet").
- **Fixed: Save and Saved looked the same.** On the website and on Android the icons come from Material Symbols' font, which only has the outline, so "bookmark" and "bookmark_border" drew the same glyph. The only sign a gym was saved was the button's spoken label. Off iPhone they're now Phosphor's bookmark, outline for Save and filled for Saved, the same one as the Saved tab. The iPhone keeps its own symbols, which were already different.
- Checked: no other icon pair in the app depends on outline versus filled (the rest use different glyphs). Close-ups of a saved and an unsaved gym's header in the browser; app tests 612.

## Update 194 · A free account's screens; words out of the faintest grey; Liquid's shine kept off tall cards

*18 Nov 2026 · `df033ae`*

Most of the screen checks so far were signed in as the Pro test account. Free accounts see other things (Pro offers, locked charts, limits), so this round went through the app as a throwaway free account on the local server, with Pro pretended on sale in the check only.

- **axe:** clean on 15 pages (Profile, Progress, Appearance, Pro, Train, Saved, Templates, Exercises, Compare, Country, 1-rep max, Lifetime, Collection, Challenges, Spend), light and dark, phone and desktop width.
- **Words in the faintest grey, fixed.** That grey is for chevrons and placeholders (3:1); words need 4.5:1, and these had 2.7 to 3.2:1. Now in the secondary grey:
  - the 1-rep max page's preview before anything's typed ("Estimated 1-rep max", "≈ — kg");
  - the source and date line when joining a gym ("… · read 3 Nov 2026"), which is where a fact's source shows;
  - the weather card's place and time line;
  - GymPal's "about …" line;
  - the recovery and body weight Home widgets' notes;
  - the chart's scale and dates;
  - the gym scan's percentage;
  - Report a bug's privacy note and its character count, and a workout note's count;
  - two lines only the developer sees.

  The separators (×, •, ···) stay faint: they carry nothing the words around them don't.
- **Accent words on an accent wash, fixed.** Two places the earlier sweep missed, because their colour was picked by a condition: an exercise's main muscles on its chart page (4.4:1 in dark) and Friends' quiet small button. Both now use the shade made for washes.
- **Liquid's shine on tall accent cards.** The light across the top of a filled control was set as a share of its height, so on a tall card it reached 86 points down and lay over the first line: Friends' "Your friend code" was 3.5:1. Fixed points alone would have covered most of Profile's small PRO badge instead (that was tried: 4.2:1). Each control now works its shine out from its own height, and never further than 7 and 16 points. Buttons look as before, and tall cards get a thin rim.
- Checked: every word on those pages measured over 4.5:1 in all three looks, light and dark, at 390 and 1280; the 1-rep max card with a set typed in; axe clean again on the changed pages in Liquid and Frost. App tests 612.

## Update 193 · The ads round checked on the screens; the Pro card's × reads

*18 Nov 2026 · `273a10e`*

Updates 190 to 192 (the ads) were new to the screens, so they went through the same checks as everything else, on the website (no ads there: GymGO's own Pro card takes the space, for free accounts only).

- **A scare that wasn't the ads.** The first run found faults on every page. This checkout simply hadn't installed the new ads package (it was in the lockfile already), so the website didn't build. Installed from the lockfile, nothing added: Home and Explore come back clean in all three looks, light and dark, at phone and desktop width.
- **The Pro card, seen as a free account sees it.** Locally Pro isn't on sale (no Stripe here), so the card hides; for the check, a throwaway free account on the local server and a test that tells the page Pro is on sale (only in the check, nothing in the app). On Home and under Explore's list, in all three looks, light and dark, at 390 and 1280 points:
  - axe clean on Home, Explore and Profile (36 page loads).
  - All the card's words pass 4.5:1 on its card.
  - **Fixed:** its "Not now" × was the only close mark in the light tertiary grey, 2.7:1 on light Frost and Liquid, under the 3:1 a control's mark needs. It's now the secondary grey, like the app's seven other close buttons.
  - Reached by the keyboard, the card shows its focus ring and only Explore's list scrolls to it; the sheet stays where it was.
- App tests 612.

## Update 192 · app-ads.txt on gymgo.site

*18 Nov 2026 · the commit "Website: app-ads.txt with AdMob's line"*

You sent AdMob's app-ads.txt instructions and asked for it on the website. **gymgo.site/app-ads.txt** now carries AdMob's line, exactly as it gave it (`google.com, pub-7227955677859980, DIRECT, f08c47fec0942fa0`), from `apps/mobile/public/app-ads.txt`, which every website build puts at the site's root. It says only that Google may sell ads in GymGO's apps; nothing on the website loads ads.

**What AdMob still needs before it shows as verified:** the app in the App Store (or Google Play) with `https://gymgo.site` as its developer website, written exactly so, then about 24 hours for AdMob to look. Until GymGO is in a store, AdMob can't connect the file to the app, so a "not found" or "not verified" status there before then is expected.

- Checked: a web build puts the file at the site's root, unchanged; it goes live with this update's website build.

## Update 191 · Native ads in GymGO's own card, with your AdMob IDs

*18 Nov 2026 · the commits "Ads: native advanced ads in GymGO's card, with the owner's AdMob IDs; real ads stay off" (which by mistake held only the files' new names) and "Ads: the native card itself, the owner's IDs and the docs", pushed straight after*

You sent your AdMob setup: the iPhone app and one **native advanced** ad unit. Update 190 asked for banners, which a native unit can't serve, so the ad is now native:

- **The ad is GymGO's own card.** Google sends the ad's parts (advertiser, headline, words, icon, picture or video, button) and GymGO sets them in a card like its others, with an **"Ad"** badge beside the advertiser and Google's AdChoices mark in the top corner. The picture or video is Google's own media view, at least 120 points each way, as Google's rules ask. Nothing takes the space until an ad has come; if none does, the Pro card shows, as before.
- **Your IDs are in.** The iPhone build now carries your AdMob app ID, and your native unit is kept for both places (Home and under Explore's list). They aren't secrets: every copy of the app carries them.
- **Real ads stay off.** A development build (`gymgo --xcode`) only ever asks Google's **test** ads, on purpose: tapping your own real ads is what AdMob calls invalid traffic, and it can get a new account limited. A release build asks your unit only once `ADS_LIVE` is turned on in `lib/ads.ts`, which waits for the privacy wording (it still says "no ads") and your go-ahead.
- **Android** keeps Google's sample app ID until there's an Android app in your AdMob account.

**Still yours** (`docs/ADS.md` has the steps): the Android app in AdMob, Privacy & messaging (the consent message for Europe and the UK), `app-ads.txt` on gymgo.site (the line is in ADS.md; I can add it when you say), the store forms, and the new legal wording.

- Checked: typecheck and all 612 app tests pass (a new one: a release asks no real ad until ads are live); the phone config shows your iPhone app ID; the iPhone app's code bundles with both the test unit and yours in it; the website loads with no errors and no ad code. **Not yet seen on a phone:** try `gymgo --xcode` on your Mac. Expect a card on Home under the gyms near you with Google's test ad in it.

## Update 190 · Ads, built with Google's test ads

*18 Nov 2026 · the commit "Ads: Google AdMob test ads in phone development builds, the Pro card everywhere else"*

You asked for ads, built with test ads. The two ad spaces (Home, under the gyms near you, and under Explore's list) can now show **Google AdMob ads**:

- **In a phone development build** (the Mac's Xcode route, `gymgo --xcode`, on the Simulator or your iPhone): a banner from Google's test ads, in one of GymGO's cards marked "Advertisement". It uses Google's public sample app IDs and test ad units, so nothing real is requested, shown or paid. Google labels each one "Test Ad".
- **Before any ad,** Google's consent message appears where the law needs one (Europe, the UK, some US states). Profile → Legal then has **Privacy choices** to change your answer, which Google requires there.
- **Non-personalised ads only** (no tracking across apps, so no Apple tracking prompt), **rated Teen at most** (GymGO takes members from 13), never for Pro members, never between gyms, on a gym's page, over the map, during a workout or full screen.
- **Everywhere else, GymGO's own Pro card, as before:** the website, Expo Go (it can't hold Google's ad library), a release build until your own ad units are set, and whenever no ad comes back or consent is refused. The website makes no requests to any ad network (checked).

**Not done, and yours:** an AdMob account and its app and ad unit IDs, the store forms, and new privacy wording. Today's privacy text says "no ads" and "no advertising code", and Google's library is now inside every phone build, so the wording must change before any App Store or Google Play release. `docs/ADS.md` has the steps and the settings the IDs go in.

- Checked: the library (17.4.0) supports this React Native; the phone config gets the AdMob app ID; the iPhone app's code bundles with the library; the website still shows the Pro card with no ad requests; new unit tests for which ad unit each build asks for. All typechecks and tests pass. **Not yet seen on a phone:** this workspace can't build an iPhone or Android app. Try `gymgo --xcode` on your Mac; it remakes the Xcode project by itself, since the app's packages changed.

## Update 189 · Writing a review, tried end to end; the form fits the largest text

*18 Nov 2026 · `f3a0ef7`*

- **Writing a review was tried through the screens**, on invented demo gyms, from a gym's page and from its sheet on Explore. What happened:
  - The hint under the form went from "Tap a star to rate it." to "Say a little more… (5 to go)" to "A moderator reads every review before it appears."
  - Send review waited until the review was complete.
  - Tapping an aspect's star again cleared it.
  - The review reached the server with the aspects as set, the cleared one as none.
  - The waiting card took Write a review's place.
  - From a link while signed out, GymGO asks you to sign in and then opens that gym. Nothing there needed changing.
- **The form at the largest text on a small phone:** the aspect rows' stars ran past the card's edge (Atmosphere's fifth star was cut off).
  - Each row now puts its stars under the label when they won't fit beside it.
  - Every label has the same least width, so the four rows change together rather than some beside and some under.
  - Checked at 320 points with the largest bold text (all under) and at 390 with the usual text (all beside, lined up on the right).
- App tests 608.

## Update 188 · GymPal can use Groq's free plan too

*18 Nov 2026 · `6c9f208`*

You asked me to find a free, unlimited key for GymPal. **There isn't one:** every free AI service has daily limits, and "unlimited" keys passed around online are other people's, leaked or stolen, which GymGO won't use. I can't make accounts for you either. So GymPal now chains two free services, asking the next when one runs out:

- **Groq first** (groq.com), if `GROQ_API_KEY` is set. Its free plan needs no card. Each model gets 30 questions a minute, 1,000 a day and 200,000 tokens a day. GymPal's guide alone is about 5,000 tokens a question, so tokens run out first: roughly 25 to 35 questions a day for each of three models (`openai/gpt-oss-120b`, `openai/gpt-oss-20b`, then `qwen/qwen3.8-27b`), more if Groq's caching of the repeated guide applies. Past that Groq says no rather than charging, unless a payment method is added there (don't). Groq says it doesn't keep what's sent by default. All of this was checked on Groq's own docs today.
- **Then OpenRouter's free models**, if its key is set too (50 questions a day without credit).
- Each refusal is logged with its reason, and `gympal:check` says which service and model answered.
- **Others I looked at and left out:** Google's Gemini free tier is now about 20 questions a day on its main model, and Google may use what's sent to improve its products. Cerebras and Mistral need a card or an opt-in to training.
- **The note under GymPal's box** says "Chats go to Groq or OpenRouter, AI services…". The Privacy Policy and Terms name Groq (version 2026-11-18.2), so existing accounts see the terms card once.

- New tests: Groq asked first with the right fields (its own token field; short, hidden thinking for GPT-OSS, none for Qwen), the next Groq model when one has used its day or answers with nothing, OpenRouter after them, "busy" with no OpenRouter, a turned-down key never logged. All typechecks and tests pass. Not tried with a real Groq key here.
## Update 187 · Dark mode's Dim checked, and GymPal knows the new reviews

*18 Nov 2026 · `9ec4f27`*

- **Dim** (Standard's softer dark mode, in Appearance) hadn't been checked: every dark measurement used black. It has now, with the same measure from the screen on Home, Profile, Progress, Appearance, a gym's page and Explore, and on a workout in progress, Filters, a gym's sheet, GymPal and a gym's reviews (with and without reviews). axe found nothing, and no words were under 4.5 to 1. Nothing needed changing.
- **GymPal's guide** mentioned reviews only in passing, so GymPal couldn't explain the new ones. It now knows what the summary shows, how to write a review (stars, the four optional ratings, at least 10 characters, one per gym, checked by a moderator), that visits aren't verified, and that Reviews on other maps opens Google's or Apple's listing without copying their reviews in. A test checks that last part. The rule that GymPal never states a real gym's reviews or rating is unchanged.
- **Read more** on a long review now tells a screen reader whether it's open.
- App 608, server 310 tests.

## Update 186 · The review ratings reach your data download and the moderators, and stars are said as words

*18 Nov 2026 · `2f4ea36`*

- **Download my data left out the new ratings.** Update 184 began keeping the equipment, cleanliness, atmosphere and value ratings, but the download names each column it includes, and those four weren't there. It promises everything GymGO holds about you, so they're in it now. A test checks it.
- **Moderators couldn't see them either**, though they're published along with the review. The queue now shows them under the text ("Equipment 4 of 5"), and gives the rating as "4 of 5 stars" rather than "★★★★".
- **Stars said as words to a screen reader**, not as "black star":
  - A gym's Reviews row says "3.8 out of 5, from 4 reviews".
  - Compare's rating cells say just the number, as the row's heading says it's a rating.
  - On "See it on Google", the rating is said as a number, and each review's row of stars as "4 out of 5 stars".
  - The stars still show as before.
- Checked:
  - The download has the four ratings.
  - In the browser, the queue shows "4 of 5 stars" and "Equipment 4 of 5" for a review waiting on an invented demo gym, and the Reviews row's spoken name is as above.
  - App 608, server 309, domain 198 tests.

## Update 185 · The largest text on a small phone: no choice cut off, no word broken

*18 Nov 2026 · `d56c320`*

- This round looked at Appearance's largest text with Bold text on, at 320 points (the smallest phones) and 390, in Standard and Liquid. Ten pages were checked for text cut short, spilling out of its box, or making the page scroll sideways. Long gym names, suburbs and a workout's list of exercises shorten on purpose, and still do. Three things lost words:
  - **A segmented control cut a choice short.** Build a workout's Goal read "Strength, Muscle, Endura…". A segmented control now measures its longest label (with the label's own font in a browser). When that won't fit in an equal share, the segments flow onto two rows, the chosen one raised where it is. At the usual sizes it's one row with the sliding pill, as before (checked at 390 and 320).
  - **A row's title broke mid-word.** Profile's Compare read "Comp / are" beside "None pic…", because a row's value could take more than half the room. A row's title now always gets at least 45%, and the value shortens instead.
  - **Home's collection tile cut its own words** to "gyms coll…" and "1 cou…". Both lines can now take two lines before they shorten.
- Checked in the browser at the largest size: the Goal and Length controls wrap with nothing cut, and the collection tile and Compare read in full. App tests 608.

## Update 184 · Reviews, redesigned, with links to Google Maps and Apple Maps

*18 Nov 2026 · `ea94cfe`*

You asked for the review system to look better, and for reviews from Google Maps and Apple Maps to be brought into GymGO.

- **A gym's reviews, redesigned** (in Reviews on a gym's page and in its sheet on Explore):
  - **A summary card:** the average, large, with its stars; how many reviews; a bar for each of 5 to 1 stars; and averages for equipment, cleanliness, atmosphere and value, where people rated them. It still says visits aren't verified and that a moderator reads every review first.
  - **Each review is a card:** the writer's initials, their name and the date, the visit month when given, solid stars, and the aspects they rated. A long review opens with "Read more". After three reviews, "Show all".
  - **Writing one:** big stars with a word for each (Poor to Excellent), then optional stars for equipment, cleanliness, atmosphere and value (tap a star again to clear it), then the text.
  - **No reviews yet** is a card that says so, never a score of zero. Your review waiting for a moderator is a card of its own.
  - The stars are Phosphor's solid star: in a browser the icon font's was only an outline, which made 3.8 hard to tell from 5.
- **The four aspect ratings are kept now.** The data model always had them, but the server stored only the stars and text. Each is optional, 1 to 5; anything else is refused. Older reviews simply have none.
- **Google Maps and Apple Maps:** every real gym's reviews end with "Reviews on other maps", two buttons that open the gym's listing there, with its own ratings and reviews.
  - Their reviews aren't copied into GymGO. They belong to their writers and to Google and Apple, whose terms allow showing them only inside their own products. Your own rule is that every fact carries its source.
  - GymGO's own reviews are never averaged with theirs.
  - With your own Google Places API key on the server (Google bills for it), each gym's "See it on Google" page already shows Google's reviews live, credited to their writers and never stored. That's the one allowed way to show them in GymGO. It's off until you choose to add a key. Apple offers no such way.
  - An invented demo gym gets no links, as there's nothing real to find.
- **Checked:**
  - In the browser, with four test reviews and one waiting for a moderator, all on an invented demo gym (no real gym was given a made-up review): Standard, Frost and Liquid, light and dark, 390 and 1280 points.
  - A real gym's empty card and its links.
  - axe: no violations, after giving the stars and bars a picture role. The screen measure: no text under 4.5 to 1.
  - New tests for the aspects (kept, optional, refused out of range), the breakdown and the Apple Maps link.
  - App 608, server 309, domain 198 tests.

## Update 183 · Opened screens on the glass: a workout, a gym's sheet, GymPal; and two screen-reader cues that were lost

*18 Nov 2026 · `50ff93c`*

- The screen measure ran on the opened states: a workout in progress, Filters, a gym's sheet on Explore and GymPal, in Standard, Frost and Liquid, light and dark. axe found nothing. Measured from the screen, 22 words were under 4.5 to 1, after setting aside text behind the opened sheet or panel. Six remain, and none of them need a fix (below).
- **A workout's column headings** (SET, KG, REPS, RPE) were 3.1 to 1, in the faint grey. They're now secondary grey, in a workout and in Edit workout. The "×" between the boxes stays faint, as decoration: the headings say what the boxes are. It's now hidden from screen readers.
- **GymPal's note under the message box** ("GymPal is AI and can be wrong… Not medical advice", and where chats go) was 2.9 to 1. It's now secondary grey.
- **A gym's sheet in dark:** Call, Website, Saved, Share and "Membership · 4 options" were 4.3 to 4.4, and "Add one" was 3.95.
  - Those words sit on a glass card inside the sheet, over the map: measured at #29292A, lighter than a card. Standard's accent is now checked against that, so dark Indigo is one step lighter (#7D7AFF to #8481FF). No other accent's words change, and light is unchanged.
  - The accent on a tint or a grey pill is checked on a grey slot (a raised card) and on glass on glass too. In dark it's now a paler lavender, in line with Frost's and Liquid's.
- **The accent on a grey pill:** "Superset with the next" was 4.1 in dark. It and nine other grey pills (Back to it, See Pro, Change, Reset Home and the choice sheets' ticks) now use the accent made for a wash.
- **Two screen-reader cues were being dropped.** The text component took a fixed list of settings, and TypeScript let `aria-hidden` and `aria-live` through without a word, so they never reached the page.
  - The recovery map's line for a picked muscle ("Chest: today") was meant to be read out when it changes, and wasn't. It now is: it stays in the page, empty until a muscle is picked, since a screen reader may say nothing of a region that arrives already full.
  - GymPal's "about …" line was meant to be skipped, as its message already says it, and wasn't. It is now.
  - Both are declared now, so the same slip is caught as it's typed.
  - Checked in the browser: picking Chest by keyboard fills the live region; the "×" is hidden, 15 of 15.
- The six left: the "×" itself (decoration, hidden), and the avatar behind Filters. App tests 607.

## Update 182 · "1,000 lb" is a thousand, and the sidebar's chosen place reads in dark

*18 Nov 2026 · `4c04934`*

- **A comma before three digits now groups them.** Update 169 let weight boxes read "62,5" as 62.5, but it read every comma as a decimal point. So "1,000" in a pound workout (a leg press) was logged as 1 lb, and 1 is a valid weight, so nothing said otherwise.
  - Now "1,000" and "1,200.5" read as a thousand and more, while "62,5" and "2,25" are still decimals.
  - "62,500" isn't quietly read as 62.5: it's over the limit, so the box shows its hint.
  - Reps typed as "08" tidy to 8.
  - This is the one reader behind the workout's sets, 1-rep max, the plate calculator and body weight. In the plate calculator, in a pound account: "1,000" now gives ten 45s, a 25 and a 2.5 a side; "62,5" reads 62.5; "225 lbs" reads 225. Body measurements were already safe: "1,000" there shows the hint.
- **The sidebar was checked too.** None of the earlier audits had it on.
  - axe ran on 72 pages with the sidebar (Standard, Frost and Liquid, light and dark, 390 and 1280 points), with no violations. Then the words axe couldn't judge were measured from the screen.
  - In dark, the chosen place (the accent on its sliding pill) was 3.3 to 1 in Standard and 4.4 in Frost. It now uses the accent made for a tint.
  - That colour is now also checked over the glass of the sidebar, bars and sheets, under the light of their sheen. In dark that glass is lighter than a card, which was all it had been checked on.
  - The chosen goal on Training programme and the chosen sample faces in Appearance (text size, dark style) sit on the same tint, and now use it too.
- Sidebar pages afterwards: no text under 4.5 to 1. New tests for the thousands comma, the zeros, and the accent on its tint over every glass layer in every look. App tests 607.

## Update 181 · Words on the glass looks, measured and made readable

*18 Nov 2026 · `683f22f`*

- The merge brought nineteen rounds of see-through glass (Standard's clearer cards, Frost, Liquid). This round checked their words.
  - axe ran on Home, Profile, Progress, Appearance, a gym's page and Explore, in Standard, Frost and Liquid, light and dark, at 390 and 1280 points. That's 72 pages, with no violations.
  - But axe can't judge text on glass or gradients, and it left 2,644 such words to check by hand. So each was measured from the screen itself: its text hidden, what's behind sampled across its box, and the worst point counted.
- After setting aside icons and rows under the tab bar, 53 words were under WCAG AA's 4.5 to 1. All 53 are now at 4.5 or more. What was wrong, and the fix:
  - **Liquid's Build a workout card** was 2.6 to 1. It took a clear card's face (a white sheen across its corner and a soft light inside), which washed out its white words. It now keeps only its shadow (`shadowUnder` in the theme). The shine on filled buttons now fades sooner, so it's gone before the words start.
  - **Grey words straight on Standard's page** were 4.3 to 4.45: Home's date, Profile's and Appearance's headings and footnotes. They had only been checked against the plain page, not the glow of your accent behind it. The grey is now checked against that glow too: one step darker on Indigo (#6C6C70 to #67676A), two on the darker accents. Your accent and the faint grey are unchanged.
  - **The accent on its own tint** was 4.1 to 4.46 ("Add one", "Aim for 3 a week", Pro tags, Swap, Rest, Plates, and other quiet pills). The colour made for this existed, but only one button used it. The 76 places on a tint now use it, and it's now checked against a glass card over the glow as well.
  - **Grey on a grey tile** was 4.33 to 4.39: Profile's counts and Moderator badge, a gym's membership tiles, and Home's search box. These now use the grey made for tiles, checked the same way.
  - **Progress's weekday letters** (M, W, F, S) were 3.1 to 1, in the faint grey that's meant for what needn't be read. They're now secondary grey.
- New tests check the grey on the glow, the accent on its tint, and grey on a tile, for every accent, light and dark, and `shadowUnder`. App tests 604.
- Not changed: text boxes' placeholders keep the faint grey, as on iPhone. The Call button of a gym with no phone number stays grey, as it's switched off.

## Update 180 · GymPal copes with models that think first, or have gone

*18 Nov 2026 · `280cffa`*

Your two checks showed two more ways GymPal could fail. Before the update, OpenRouter answered 404: one of GymPal's models had been withdrawn, and OpenRouter turns down the whole question when any model in the list has gone. After the update, a model answered with nothing at all. Today's free models think before they answer, and the check gave the answer so little room that the thinking used it all.

- **Short thinking.** GymPal asks models that think first to keep it brief and not send the thinking back, so the answer has room.
- **The next model on an empty answer.** If one model sends nothing back, GymPal asks the next one, and the server's log says which model and why it stopped.
- **Only models OpenRouter still lists.** Before asking, the server checks OpenRouter's public list of models (no key needed, read again every 6 hours) and leaves out any that have gone, saying so in its log. If none of its models are left, it asks up to three of the free ones OpenRouter lists, each from a different maker. A withdrawn model can no longer stop GymPal.
- **`gympal:check` gives the answer as much room as the app does** (it gave 120 words' worth, a fifth of the app's).

- New tests: short thinking is asked for, the next model is asked after an empty answer, a model OpenRouter no longer lists is left out (or free ones are found when none are left), and the list being unreachable changes nothing. All typechecks and tests pass. Not tried with a real key here: run the check on your Mac.

## Update 179 · Three short videos: the app is coming, the website is out

*18 Nov 2026 · `5fb2309`*

- You asked for the explainer-video skills from iart-ai/explainer-video-skills, and for three short vertical videos showing GymGO that advertise the limited version, out now at gymgo.site, and say the app is coming soon. Then: footage from the real app, not the limited website.
- The five skills are in `.claude/skills/` (MIT, with their notice and licence). One line of their probe script was fixed, as ffprobe 6 wrote a trailing comma that failed a correct file.
- The videos are made in `marketing/shorts/` with Remotion, each about 20 seconds at 1080 × 1920 and 30 fps:
  - **WalkIn:** most gyms never say if you can walk in. GymGO finds them, shows prices with their source, and says what to ask when nothing's published.
  - **Build:** tap the muscles you want, GymGO builds the workout, and logging a set starts the rest timer.
  - **OnePlace:** weeks in a row, strength going up, which muscles you've trained, and a card for each gym you check in at.
- Every app frame is a screenshot of the full app, tagged "GymGO app · coming soon". Every short ends on "The GymGO app is coming soon. Try the limited version now: gymgo.site. Free in your browser · no account needed".
- What they don't do:
  - No gym is shown by its brand, and no short shows or claims "Good to go", as no real search gives it yet.
  - Lines too small to read are shown bigger by cropping the same screenshot, not redrawn.
  - The training shown is sample data in the local test account.
  - There's no narration, so the captions carry it. Add music from the platform's library when posting.
- Stills of every scene were checked before encoding. Each file was read back as 1080x1920, h264, 30 fps. Nothing was posted anywhere. The MP4s aren't committed; `marketing/shorts/README.md` says how to make them again.

## Update 178 · Sign-in says what's wrong, out loud

*18 Nov 2026 · `8216503`*

- This round tried creating an account with each thing wrong in turn (a short password, a common one, an email already used, a mistyped email, the terms not ticked, a birth year under 13) and asked for a password reset with no email and with an unknown one. Every case was handled, but two were silent to a screen reader:
  - "That email doesn't look right yet" appeared under the field without being read out, so the disabled Create account button gave no reason. It's now read out as it appears, and the field is marked as having a problem.
  - The under-13 message replaces the whole form; it's now read out when it does.
- The terms checkbox, and the one for each day in Reminders, told a browser nothing while unticked (the accessibility audit flagged it). They now say ticked or not, as the app's other six checkboxes already did.
- The sign-in page (both tabs, with a mistyped email), welcome, the in-app legal pages and Report a bug pass the accessibility audit signed out, light and dark. App tests 578.

## Update 177 · GymPal's free models refreshed, and OpenRouter's reasons shown

*18 Nov 2026 · `bf30322`*

Your OpenRouter check said "GymPal's had a lot of questions": OpenRouter took the key but refused the question as rate-limited (429), and the server didn't say why.

- **One of GymPal's three free models had been withdrawn**: `thinkingmachines/inkling-small:free` is no longer on OpenRouter. GymPal now asks `google/gemma-4-31b-it:free`, then `thinkingmachines/inkling-2-small:free`, then `nvidia/nemotron-3.5-super-vl:free`. That's three different makers, so one busy maker doesn't stop GymPal; before, two of the three were Google's Gemma, the most popular free models and often "rate-limited upstream". All three were checked on OpenRouter's public model list today.
- **When OpenRouter says no, the server's log and `gympal:check` now show its own reason**, such as "temporarily rate-limited upstream" and which provider said so. Never the key.

- New tests: the reason is logged (and cut to one line when it's long), and the key never is. All typechecks and tests pass. Not tried with a real key here (none is set in this workspace).

## Update 176 · GitHub Models is gone, so GymPal is back to OpenRouter

*18 Nov 2026 · the commit "Take GitHub Models out of GymPal: GitHub retired it on 30 July"*

Your Mac's check failed the same way as the one here, which showed the problem wasn't this workspace: **GitHub retired GitHub Models on 30 July 2026**. Its playground, catalogue and API are gone, and its address now answers every request with a bare "OK". GitHub's own docs say so. No GitHub token can make GymPal work there, and I should have checked before building Updates 173 to 175.

- **GymPal is OpenRouter only again**, as before Update 173. The GitHub Models code is out.
- **The token on your Mac now does nothing.** Without this fix, it made the server think GymPal was switched on, so every question would have failed. The server now says at start-up that the line does nothing and should be deleted. `gymgo-mac.sh --gympal` (Mac) and `gymgo -GymPal` (Windows) now take that line out of `apps/server/.env.local` for you, keep everything else, and point to the OpenRouter steps.
- **The Privacy Policy and Terms are back to the 4 November version**: GitHub Models is no longer named. Anyone who agreed to the 18 November version sees the terms card once more.
- **Kept from that work:** `pnpm --filter @gymgo/server gympal:check` now checks OpenRouter, the server tells the app which service it uses, and the note under GymPal's box names it.
- **To switch GymPal on:** a free key from openrouter.ai (Keys → Create key) in `apps/server/.env.local` as `OPENROUTER_API_KEY=…`, then run the check. README, GymPal, has the steps.

- Checked: the server's GymPal tests (25), the check command with and without the leftover token, and the Mac `--gympal` cleanup on a test file here (token line out, other settings kept, file still private). All typechecks and tests pass. The Windows `-GymPal` cleanup was read through, not run.

## Update 175 · GymPal setup on a Mac too

*18 Nov 2026 · the commit "gymgo-mac.sh --gympal: the same GymPal setup on a Mac"*

You asked about the Mac. The Mac launcher now has the same step as Windows' `gymgo -GymPal`:

- **In Terminal, one line:** `curl -fsSL https://raw.githubusercontent.com/ashenkodituwakku/GymGO/claude/friendly-johnson-9rzxrj/scripts/gymgo-mac.sh | bash -s -- --gympal`. That fetches the newest launcher from GitHub, so it knows the new option even if your copy is old, and brings `~/GymGO` up to date. Once your copy is current, `gymgo --gympal` does the same.
- It asks for your GitHub token, which doesn't show as you paste, and saves it in `~/GymGO/apps/server/.env.local`. Other settings in that file are kept and an older token is replaced. Only your Mac user can read the file, it's never uploaded, and updates leave it alone. Then it asks GymPal one question and says whether he answered.
- Its `--help` also now prints just the list of options (it used to print two lines of code after them).

- Run here in a Linux shell with a made-up token: the other line in the file was kept, the old token replaced, the file readable only by its owner, and git ignored it. The check then failed only because this workspace can't reach GitHub Models. The test file was deleted afterwards. Not yet run on a Mac.

## Update 174 · `gymgo -GymPal` sets GymPal up for you

*18 Nov 2026 · the commit "gymgo -GymPal: paste the token once, saved and checked"*

You asked me to set GymPal up for you. I can't reach your PC from here (no folder on it is shared with this session), so the launcher now does it in one command:

- **`gymgo -GymPal`** asks you to paste your GitHub token, and it doesn't show as you paste. It saves the token in `apps\server\.env.local` on your PC, replacing any older one and keeping every other setting. That file is never uploaded to GitHub, and `gymgo -Update` leaves it alone. Then it asks GymPal one question and says whether he answered, and which model did.
- It refuses anything that doesn't look like a GitHub token (one starting `github_pat_` or `ghp_`), and says why.
- To use it, run **`gymgo -Update`** once and press Ctrl+C when GymGO has started, so your launcher knows the new option. Then run **`gymgo -GymPal`**, and then `gymgo` or `gymgo -Online` as usual.

- The launcher is still plain ASCII (its test checks). I couldn't run PowerShell here to try the new step, so it was checked by reading it through. Not yet run on your PC.

## Update 173 · GymPal can use GitHub Models

*18 Nov 2026 · the commit "GymPal answers through GitHub Models with the owner's token"*

You sent a GitHub token for GitHub Models and asked for GymPal to work with it.

- **GymPal now asks GitHub Models first** when the server has a GitHub token, trying `openai/gpt-4.1-mini`, then `openai/gpt-4o-mini`, then `mistral-ai/mistral-small-2503`: the next when one is busy, isn't available, or doesn't answer. If GitHub turns the token down or every model is busy, GymPal falls back to OpenRouter's free models, if that key is set too.
- **It doesn't cost money**: GitHub Models is free within GitHub's daily limits, and past them GitHub says no rather than charging, unless paid use for Models is switched on in your GitHub billing settings (leave it off).
- **The token is not in the code.** It goes in `apps/server/.env.local` on your PC, as `GITHUB_MODELS_TOKEN=…`. That file is never uploaded to GitHub, and the server never prints it.
- **A check you can run**: `pnpm --filter @gymgo/server gympal:check` asks GymPal one short question with your settings and says which model answered, or why none did. The server's first lines also say "GymPal: on, GitHub Models first (…)".
- **The note under GymPal's message box** now names the service chats go to: "Chats go to GitHub Models…" (or OpenRouter). The Privacy Policy and Terms name GitHub Models (GitHub, part of Microsoft) too. That's a new version (18 November 2026), so existing accounts see the card on Profile asking them to agree.

- **Not yet tried with your token.** This cloud workspace can't reach GitHub Models: every request to it comes back as a plain "OK" from the workspace's own network gate, never reaching GitHub, so the token was never used from here. New tests cover the GitHub requests (the address, the token header, one model at a time, the next model when one is busy or gone, the fall-back to OpenRouter, stopping at a turned-down token without ever logging it). All typechecks and tests pass.

## Update 172 · Home's cards answer the mouse

*18 Nov 2026 · the commit "Home's cards drift towards the mouse and catch the light"*

You asked for Home's cards to move as the pointer passes over them, or to catch a Liquid Glass shine. They now do both, in a browser with a mouse or trackpad:

- **They move.** The card under the pointer lifts 2 points and drifts up to 3 points towards it, easing back when the pointer leaves.
- **They shine** in a glass look (Standard, Frost, Liquid). A soft light follows the pointer across the card's face, and the card's rim catches the light nearest the pointer, as Liquid Glass does. The light sits behind the card's words and pictures, so text never washes out under it (a first try put it on top, and a gym card's name went grey). It's fainter in dark mode. The solid looks (8-bit, Paper and the rest) keep their flat plates and only move.
- **Where:** every card, tile and chip on Home: the quick searches, Build a workout, the templates card, Machines and Trips, the weather, the widgets, gym cards, and the place and city chips. A text link (Map) and bare icons are left alone. A row inside a card (Templates) lights the card it sits in. It's off while you're rearranging Home.
- **Reduce motion** (yours in Appearance, or the system's): the cards stay put and only the light moves.
- Touch screens have no hover, so phones and the app are unchanged.

- Checked in the browser at 1280 points in Liquid and Frost (light), Standard (dark) and Paper: the right card is picked under the pointer (not the Map link or the gap between cards), it moves and shines, Paper moves without the shine, and with Reduce motion the cards stay still. All typechecks and tests pass.

## Update 171 · More frosted glass, a Liquid Glass look, and no seam beside the sidebar

*18 Nov 2026 · the commit "More frosted glass, a Liquid look, and the page running on under the sidebar"*

You asked for most of the UI to be more frosted glass, for a Liquid Glass appearance that puts everything in Liquid Glass, and, with a screenshot, for the hard edge on Home beside the sidebar to go.

**The seam beside the sidebar.** With the sidebar docked, each page started at the sidebar's edge, so its background did too. Frost's blues stopped in a straight line down the side of the sidebar, with the plain page colour under the glass. Now, with the sidebar docked, the page's background is drawn the full width of the window, under the sidebar as well, and the page draws none of its own. Frost's blues, Liquid's colours and Standard's glow run on unbroken under the glass on every page, not just Home.

**More frosted glass (Standard, Frost and Liquid).** This follows your Liquid Glass slider as before: 0% is still solid, and 100% is unchanged.
- At the default, the glass over the map and pages is more see-through, so what passes under it shows as soft colour through the blur. Controls are 72% solid (were 80%), sheets 86% (were 94%), and pinned headers and bars 88% (were 98%). Android draws no blur behind its glass, so it keeps the old amounts, which stay readable over the map.
- Cards on the page are more see-through at the default in Standard: 74% solid in light (was 82%) and 76% in dark (was 84%). They never get so clear that their text drops below WCAG AA over the glow.
- Chips, search boxes (Home's and Explore's), segmented controls and text boxes now have a glass edge: light along the top and a fine line all round. It's brighter the higher the slider, brightest in Liquid, and absent in the solid looks.

**Liquid, a new look (Pro).** Everything in Liquid Glass:
- Clear cards: 42% solid at the default (50% in dark) and 28% at 100%, but more solid wherever their text needs it. Each has a bright edge that catches the light along its top, fainter down the sides and along the bottom, a soft light inside the rim, a sheen across its face from the top corner, and a glint at the far one.
- In a browser each card also blurs what's behind it and deepens its colours, as thick glass does. On a phone the cards are see-through without a blur behind them.
- Glass needs colour behind it to look like glass, so the page has three soft pools: your accent's colour and the colours either side of it, made in OKLCH so each is as light and vivid as the next. A grey accent (Slate, Graphite) gets blue-violet pools.
- Filled buttons (Build a workout, Go, chosen chips) are tinted glass with a shine along the top. The shine is gone by the middle, where the words are, so white text keeps its contrast.
- The glass over the map, sheets, the tab bar and the sidebar is the same Liquid Glass as in Standard (Apple's own on iOS 26). Corners are rounder, like iOS 26.
- Appearance's look grid now has eleven tiles: rows of five when it's wide enough, otherwise rows of three, with the last row centred.
- The Pro page, the plans table, GymPal's guide and the README now say ten looks.

- Checked in the browser at 390 and 1280 points in light and dark: Home, Profile, Progress, a gym's page, Explore and Appearance, in Standard, Frost and Liquid, with the sidebar and with the tab bar; the colours either side of the sidebar's edge measured to confirm the step is gone. The contrast tests cover Liquid's cards over every colour of its page (and under its sheen) for every accent at 25, 50, 75 and 100%. A new test covers Liquid's sheen, blur and glass edges, and that the edges disappear at 0% and in solid looks. All typechecks and tests pass. Not yet seen on a phone.

## Update 170 · Frost: a frosted-glass look from a reel

*17 Nov 2026 · the commit "Frost: a frosted glass look on a blue-and-white page"*

You sent a third reel (code.xr) and asked for it as an Appearance option. I can't watch videos, so I went by its caption: "Glassy Dashboard V5", a glassmorphism dashboard "featuring elegant translucent cards ... and a clean blue-and-white design". It is now **Frost**, a new look in Appearance → Look, beside Soft, Paper and the others, and part of Pro like them:

- **The page** is white at the top fading to pale blue, with two soft pools of a stronger blue (top right and left), and it stays still as you scroll, so each card shows a little of the blue behind it. In dark mode it is deep navy, with the pools in a darker blue.
- **Cards** are frosted glass: see-through white (navy in dark), with a fine white edge that is brighter along the top, and a soft blue shadow. Corners are a little rounder than Standard's.
- **The Liquid Glass slider works in Frost too**, setting how see-through the cards are. At the default they are 60% solid; at 100% they are 42% solid (44% in dark); at 0% they are solid and the blue page stays. They never get so clear that text on them drops below WCAG AA over the deepest blue of the page, for any accent.
- **The glass over the map, sheets, the tab bar and the sidebar** is tinted the page's blue in dark mode, not Standard's grey. Settings icons get Standard's lit tiles, as Frost is a glass look too.
- **Appearance's look grid** now has ten tiles: two rows of five when it's wide enough, otherwise rows of three with the last tile centred. Frost's tile shows its blue page and a frosted card.
- Standard's glow of your accent isn't drawn in Frost; its blue page takes that place. Your accent still colours buttons and links, and green, orange and grey keep their meaning.
- The Pro page, the plans table, GymPal's guide and the README now say nine looks.

- Checked in the browser at 320, 390 and 1280 points, in light and dark: Home, Profile, Progress, a gym's page, Explore (with the sidebar folded and the bar), and Appearance; the glass at 50% and 100%. No errors. New unit tests check that Frost's cards follow the level and its page is drawn behind each page, and the WCAG tests now cover Frost's cards over every colour of its page. All typechecks and tests pass. Not yet seen on a phone. On a phone the cards are see-through over the page without a blur behind them (as in Standard): over a smooth backdrop a blur looks the same.

## Update 169 · Animation principles and UX laws from a second reel

*17 Nov 2026 · the commit "Motion and input from a reel: under 300ms, less for what's frequent, forgiving boxes"*

You sent a second reel (charles.unemployed) to treat the same way. Its caption lists twelve animation principles (from Disney's *The Illusion of Life*) and eight UX laws (from *Laws of UX*, and Emil Kowalski on frequency of use). Most are judgement rules, so each was checked against GymGO, and changes made where the app fell short:

**Changed**
- **Snappy timing** (UI motion under 300ms): the sidebar's unfold now settles in about 300ms (it was about 450). Also:
  - a page opening in a browser: 280ms (was 380);
  - the workout plan's entrance: 280 (was 420);
  - a gym's page growing from its card: 280 (was 340);
  - rows making room: 260 in a browser (was 320);
  - pop-ins and map pins: 260 and 240 (were 320);
  - the tab bar's lens settling after a drag: 240 (was 320);
  - small settles like a pill sliding: about 300 (was 340).
- **Frequency of use** (the more often, the less it moves): switching tabs, the move you make most, is now a quick 160ms fade with no lift (it was a 300ms fade and lift). The tab bar's and sidebar's icons no longer blur in when they change (Update 168), since they change on every move; Save and Appearance's ticks still do. The workout's sets bar fills in 240ms (was 420), since it moves on every set you tick.
- **Postel's law** (accept messy input, return clean output): weight, reps and measurement boxes now read what people type rather than refusing it.
  - "62.5 kg", "62,5kg" and "100." read as weights; "8 reps", "8x" and "x 8" as reps; "82.5 cm", "32 in" and "18 %" as measurements.
  - A weight in the other unit is converted to yours ("135 lb" in a kg workout becomes 61.2), as is a length.
  - Leaving a box tidies its text to the plain number. Ticking a set straight from the box reads it the same way.
  - This applies to the workout's set boxes, body weight, the plate calculator, 1-rep max and measurements. Anything that still isn't a number gets the usual hint.
- **Fitts's law / bigger hit areas**: the search row's Filters and account buttons (40 points) now answer a tap 4 points beyond their edge.

**Already so**
- **Squash and stretch, anticipation**: the tab bar's glass lens stretches as you drag it, and buttons sink as you touch them, before they act.
- **Slow in and slow out**: done in Update 165. The only constant-speed clocks left drive a celebration's physics and an exercise glyph's loop, not UI moves.
- **Staging, pose to pose, follow through, secondary action, exaggerated feedback, solid drawing**: a gym's card takes the results' place rather than squeezing in beside them; animations run between key poses; the sidebar's menu fades up after the pane; Save pops; glass has rims and shadows.
- **Doherty threshold** (answer within 400ms): Save changes at the tap and saves behind it; search suggestions are worked out on the device; loading shows placeholder rows straight away.
- **Miller's law, Jakob's law**: the sidebar's eleven places come in three groups of four or fewer; Escape closes things, "/" goes to search, and back buttons and tab bars work as elsewhere.

**Not applied**
- **Arcs**: GymGO's moves are short slides and fades, where a curved path would read as decoration.
- **Hick's law** (fewer choices): cutting choices means removing features, which is yours to decide.

- Checked in the browser: "100 kg" on the plate calculator loads 25 + 15 kg a side; "225 lb" × "5 reps" on a kg 1-rep max page reads as 102.1 kg × 5 (about 120 kg), and leaving the boxes tidies them to "102.1" and "5". Pages open without errors. New unit tests for reading typed weights, reps and measurements. All typechecks and tests pass. Not yet seen on a phone.

## Update 168 · Ten design tips from a reel, applied where they fit

*17 Nov 2026 · the commit "Design tips from a reel: corners, edge fades, OKLCH, bold icons, icon swaps, logos, dvh"*

You sent an Instagram reel (charles.unemployed) and asked for its changes. I can't hear or watch a video, but its caption lists the tips it covers, ten small UI rules. Each was checked against GymGO:

1. **Nested corners** (an inner corner is the outer one less the gap): done. A helper (`concentric` in the theme) now sets them on Appearance's tiles, faces and sample (the tile plates' padding came to 12 to match the cards'), the map tiles in their rings, the look previews, and Explore's results list, inside the phone's sheet or the wide panel.
2. **Borders of see-through black or white** rather than solid grey: already so. Separators, fills and glass edges are all see-through colours; the only solid borders are Google's sign-in button, whose colours Google sets.
3. **Palettes in OKLCH**: done for **your own colour** (Pro). It's now made in OKLCH at one lightness and saturation, so every point on the hue slider looks as vivid as its neighbours; in HSL yellows glared and blues sank. It's still shaded until text in it reads at 4.6:1 or better (the existing test, every 15°, passes). A colour you picked before may look a little different, in the same hue.
4. **Gradients "in OKLCH"**: done for **Rainbow** (Pro), the one gradient that runs between far-apart colours. It's blended through OKLCH into 21 stops, so it stays bright between green and blue rather than going muddy. Done in code rather than with CSS's `in oklch`, so older browsers and both phones draw it too.
5. **Icon stroke matching the text's weight**: done for the outline icons (the tab bar's and the sidebar's). With **Bold text** on, they're drawn in Phosphor's bold cut, as the words go a step heavier. Other icons are already filled or two-tone.
6. **Fades at the edges of sideways rows**: done in a browser, on Explore's quick filters, Home's carousel, the Exercises chips and Collection's rows. A chip cut off at the edge now fades out, saying there's more, instead of looking clipped. The first chip shows whole until you scroll. Phones show the rows as before.
7. **Blurred icon swaps**: done in a browser. An icon that changes in place (Save to Saved, a tick coming on, a tab's outline filling) now blurs in from a little smaller over a fifth of a second, instead of swapping in one frame. It's in the two shared icon components, so it applies everywhere, and not with Reduce motion. Phones swap as before.
8. **Lighter surfaces for depth in dark mode**: already so. Dark mode goes black page, #1C1C1E cards and #3A3A3C raised controls, as iOS does, rather than relying on shadows.
9. **`100dvh` instead of `100vh`**: done where `100vh` was used, the older website (apps/web) and the server's billing return page, with `100vh` kept first for browsers that don't know `dvh`. The app itself fills the screen without either.
10. **Multiply for pictures on white**: done for gym logos. Many come on a white square, which showed as a white box on dark mode's grey logo plate; multiplied onto the plate, the white takes the plate's colour. In light mode the plate is white, so nothing changes there.

- The reel's comments note that multiply drops a picture's highlights. Fine for logos on their plate, where white was the problem.
- Checked in the browser at 1280 points: Appearance's corners, the hue slider and Rainbow in light; Explore in dark, the chips' mask and the logos' blend mode. A tick changing ran the blur, and Bold text drew the sidebar's icons in their bold cut. New unit tests for the OKLCH maths. All typechecks and tests pass. Not yet seen on a phone.

## Update 167 · Appearance's switch bars become picture tiles

*17 Nov 2026 · the commit "Appearance: text size, clock and GymPal's button as tiles"*

You asked for the bar options (the switches for the clock and GymPal's button) to be better.

- **Clock**: two faces showing a time as the app writes it in each, "7 pm, until 9:30 pm" and "19:00, until 21:30", instead of a two-part bar. The one in use is outlined and tinted in your accent.
- **GymPal's button**: three small screens showing where he waits, drawn as the app draws him: **Edge tab** (a light tab flush with the edge holding his mark), **Corner** (his mark in the corner) and **Hidden** (only the faint strip you swipe in from), each with a line saying what it is. Under them, **Left side** and **Right side** as two screens showing your chosen button on that side. Each set of screens follows the other, so what you see is what you'll get.
- **Text size**, the last bar on the page: four tiles with "Aa" at each size, Smaller to Largest, above Bold text.
- These now match the page's other choices (Mode, Dark mode, Layout, Look): tiles with a picture of the choice rather than words on a bar. Nothing they do has changed.
- Checked in the browser at 1280 points (light) and on a 390-point phone (dark): choosing 24-hour, Edge tab on the left and Larger text each saved and showed straight away (the clock's note read "19:00"). All typechecks and app tests pass. Not yet seen on a phone.

## Update 166 · Appearance: a better Layout section, map styles, and Reduce motion

*17 Nov 2026 · the commit "Appearance: Layout tiles, map styles (Pro), Reduce motion, folding on the map"*

You asked for the Layout section to look better, for more to customise in Appearance, and for some of it to be Pro.

- **Layout** is now two picture tiles, like Mode and Dark mode above it: a small screen with the tab bar floating at its foot, and one with the sidebar down its left, each with a line saying what it is. With Sidebar chosen, a switch under the tiles, **Fold away on the map**, decides whether the sidebar folds to its capsule on Explore (on, as before) or stays open there like everywhere else. For everyone.
- **Map** (new, Pro): the style of Explore's map. **Standard** stays everyone's; **Muted** (pale greys so the pins stand out), **Classic** (the classic OpenStreetMap look: deep green woods, orange motorways) and **Deep blue** (a dark blue map, day or night) are Pro. They're OpenFreeMap's own styles (Liberty, Positron, OSM Bright and Fiord), and each tile is drawn in its style's own colours, read from those styles. In dark mode every style but Deep blue uses the dark map, and the page says so. On an iPhone the map is Apple's, so Muted is Apple's muted map, Deep blue its dark one, and Classic its standard map (Apple has nothing like it). Without Pro the three show a crown and open the Pro page; a Pro style kept after Pro ends shows as Standard. Choosing one while the map is open loads it in place.
- **Reduce motion** (new, for everyone): GymGO keeps still, as the phone's own Reduce Motion makes it, without changing the phone. Things appear in place instead of sliding, gliding and popping (the sidebar opens at once), pages arrive without their lift, the map's pins don't bounce, and celebrations don't play. If the phone's setting is already on, the switch shows on and says so. It's an accessibility setting, so it isn't Pro.
- The Pro page, the plans table, the README and GymPal's guide now mention the map styles (and the guide the new free settings).
- While testing, turning folding off showed the map's panels sitting a sidebar's width too far right; fixed before this went out.
- Checked in the browser at 1280 points (light and dark) and on a 390-point phone (dark): the tiles and sections; Muted loading OpenFreeMap's Positron on Explore; folding off keeping the sidebar open with the panels beside it; with Reduce motion on, the sidebar fully open at the first frame checked (with it off, mid-glide); and, with the plan rewritten to Free in the test browser, the PRO tags, crowns, Standard in use with Deep blue kept, and Muted opening the Pro page. New unit tests for the map styles, the fold switch and reading the new settings. Not yet seen on a phone.

## Update 165 · The map responds again, and the app's animations ease in the browser

*17 Nov 2026 · the commit "Explore: the map takes clicks and drags again; animations ease in the browser"*

You said the map was glitched, so you couldn't move it or click anything on it, and asked for the other animations in the app to be smooth too.

- **The map works again.** Update 164 slid Explore's panels with one layer laid over the whole window, meant to let clicks through to the map. In a browser that setting is lost on an animated layer, so the layer caught every click and drag. Each panel now slides itself, and the Search this area button inside its own row, so nothing covers the map. Checked: dragging moves the map (with the sidebar open and folded, and in the Tab bar layout), and clicking a gym's pin opens its card.
- **Fades, pops and glides ease in the browser.** Every fade-in, fade-out and pop in the app, and the glide when rows make room for each other, ran at one constant speed in a browser, starting and stopping with a jolt: the browser runs these itself and takes only a standard curve, which the app wasn't giving it. They now get the same curves as on a phone: fades come in quickly and settle softly, things leave gathering pace, rows glide with a soft start and stop, and a pop goes a touch past and settles back.
- **Hover fades.** Under a mouse, a button's or row's hover shade now fades in quickly and out a little slower, instead of snapping, on every button that uses the app's shared button.
- **No dark flicker on press.** A highlight fading from clear used to pass through a darker tint on the way, because "clear" is clear black. It now fades from a clear version of its own colour. A new unit test covers how that colour is worked out.
- The loading placeholders' pulse now eases at both ends in the browser too.
- Page changes and tab switches already fade and lift in the browser (they're run by the browser itself), so they're unchanged.
- Checked in the browser at 1280 points: the gym card's fade, the rows' glide and the hover fade each read back with their curves; a walk of eleven pages showed no errors. Not yet seen on a phone (its animations already used these curves).

## Update 164 · The sidebar unfolds beside the map, smoothly

*17 Nov 2026 · the commit "Sidebar: unfold from the capsule beside the map, one smooth motion"*

You asked for the capsule to open the sidebar with a smoother animation, not over the map's panels but moving them across, and for the animations to be smooth and sleek.

- The arrow now unfolds the sidebar out of the capsule: the capsule grows into the full pane, the menu fading up once there's room for it, while the results panel, a gym's card and the Search this area button slide across to make room. Both move together on one even glide, with no bounce, and the map eases its centre across with them. Folding reverses it: the pane shrinks back into the capsule and the panels slide back.
- The sidebar no longer covers the map's panels, and you can keep using them with it open. It folds away with the arrow at its top or Escape (a gym's card or Filters, if open, closes first). Clicking the map no longer folds it.
- Going between the map and another page now folds or unfolds the sidebar in the same way instead of swapping one for the other: choose Progress from the map and the pane is already in place; come back to the map and it folds itself away into the capsule as the panels slide back.
- The pill under the place you're on now glides from place to place as you go, instead of jumping.
- On the map, a gym's card and Filters fade in and out, and the results fade back when a card that covered them closes, instead of appearing and disappearing in one frame. The phone's Menu slides in on the same glide as the sidebar.
- From the keyboard: opening the sidebar puts focus on its fold arrow, and folding it puts focus back on the capsule.
- Checked in the browser at 1280 points, light and dark: frames taken in slow motion (the page's clock slowed tenfold) of the unfold, the fold, the pill gliding from Progress to Saved, and the sidebar folding on arrival at the map. Also checked: the panels end exactly the sidebar's extra width across (188 points), the menu rows sit at the same height on the map and on other pages, and the phone's Menu opens and closes. The glass's blur still can't be seen in this test browser (see Update 159). Not yet seen on a phone or an iPad.

## Update 163 · On the map, the sidebar folds away to a small capsule

*14 Nov 2026 · the commit "Sidebar: folded away to a capsule on the map, opening over it"*

You asked for the sidebar to fold into a small capsule with an arrow on the map, which you can open to go somewhere else.

- On Explore, with the sidebar layout on a wide screen, the sidebar is now folded away to a small glass capsule with an arrow, at the top left. The results panel moves up beside it, so the map gets about 190 more points of width.
- The arrow opens the sidebar over the map, in the same place and size as on other pages. Choosing a place takes you there, where the sidebar is open as usual. The arrow at its top, a click anywhere beside it or Escape folds it away again. Coming back to the map folds it again.
- With the extra room, a gym's card now fits beside the results at 1280 points wide, with about 390 points of map left (before, it covered the results at that width). At 1000 points it still takes the results' place.
- GymPal's button follows the capsule when it's on the left.
- Every other page is unchanged, and so are phones and the Tab bar layout.
- Checked in the browser at 1280 and 1000 points, light and dark: folded, opened, folded again with Escape and with a click on the map, a gym's card opened, Progress chosen from it (full sidebar there) and back to Explore (folded again). A new unit test covers where it folds. The blur behind the glass still can't be seen in this test browser (see Update 159), so when it's open the results show faintly through it here. Not yet seen on a phone or an iPad.

## Update 162 · The search stays put while the results scroll beside the map

*14 Nov 2026 · the commit "Explore: the search and quick filters stay at the top of the panel beside the map"*

You said scrolling the results panel beside the map didn't look laid out properly.

- On a wide screen, the results panel scrolled as one piece: the search box and the quick filters went off the top, and the gyms ran up into the panel's rounded top corners and were cut off there.
- Now the search box and the quick filters stay at the top of the panel, and only the results scroll, under a thin line that shows once you've scrolled. The search box also sits 16 points down from the panel's top edge, the same as a gym's card, instead of 4.
- While you type, the suggestions show under the search box as before. In a short window they scroll on their own, so the quick filters don't get pushed out of the panel.
- Phones are unchanged: the results sheet works as before.
- Checked in the browser at 1280 by 800 (light and dark, scrolled and not) and 1280 by 600 (typing, with eight suggestions), and on a 390-point phone. Not yet seen on a phone with the sidebar, or on an iPad.

## Update 161 · Even spacing beside the sidebar, and room on the map

*14 Nov 2026 · the commit "Sidebar and Explore: even spacing, and a card in the results' place when there's no room"*

You said the sidebar's spacing was off, especially on the map, where the panel beside it felt squished.

- The sidebar's pane now sits 16 points in from the window's edges, the same as Explore's panels, so the two line up at the top and the bottom with an even 16-point gap between them. Its corners match the panels' too. Before, the sidebar was 12 points in, the panels stopped short of the window's foot, and the gap between them was uneven.
- When a gym's card or Filters is open and there isn't room for it beside the results plus a fair amount of map (at least 360 points), the card now takes the results' place instead of squeezing in as a third pane. Close it and the results come back, scrolled where you left them. Before, at 1280 points with the sidebar there was only a sliver of map left, and at 1000 points the card ran off the window.
- With the sidebar, that means the card sits beside the results from about 1440 points wide. Without the sidebar the same rule applies, from about 1190 points; between 900 and 1190 points the card now covers the results there too, where before it left the map a strip.
- While a card covers the results, they can't be clicked, tabbed to or read out by a screen reader.
- Checked in the browser at 1280 and 1000 points, light and dark, with a gym's card open and closed. Not yet seen on a phone (phones use the sheet and are unchanged).

## Update 160 · The sidebar hovers over the page

*14 Nov 2026 · the commit "Sidebar: hover over the page, not beside it"*

You asked for the sidebar to hover above the page instead of being a separate rectangle.

- On a wide screen the page now runs the whole width of the window, and the sidebar's glass pane floats over its left edge, as iPadOS 26 draws its sidebars. A page's header bar and background carry on underneath the glass instead of stopping at a strip beside it.
- On Explore the map runs right under the sidebar, so you see it through the glass and round its edges. The results and filter panels, the Search this area button and the time-zone warning start just past the sidebar.
- Everything you use on a page (its back button, title, cards and buttons) stays clear of the sidebar, so nothing is hidden under it. Clicks in the gap beside the pane reach the page.
- Phones are unchanged: Menu still slides the glass pane in over the page.
- Checked in the browser at 1280 and 1000 points, light and dark: Home, Explore, Progress, Profile, a gym page and My workouts, and a sidebar link opening its page. The blur behind the glass still can't be seen in this test browser (see Update 159). Not yet seen on a phone.

## Update 159 · The sidebar in Liquid Glass, and it stays put

*12 Nov 2026 · the commit "Sidebar: a floating pane of Liquid Glass, beside every page"*

You asked for the sidebar to look better, in Liquid Glass.

- The sidebar (Appearance → Layout → Sidebar) is now a pane of Liquid Glass floating in from the screen's edges, with rounded corners and a soft shadow, as iPadOS 26 draws its sidebars. It's the tab bar's own glass: Apple's on iOS 26, the imitation on older iPhones, and in a browser a blur with light along its rim and a slight bend at its edges (Chrome and Edge). How clear it is follows your Liquid Glass level; at 0%, or in a solid look, it's a plain plate.
- On a phone, Menu slides the same glass pane in over the page, which now shows through it, dimmed less than before.
- Every place has an icon from the same set as the tab bar (it was two sets of different sizes): outline, filled for the place you're on. The place you're on sits in a pill of your accent, lit along its top. Under a mouse a row shades as you point at it. "TRAINING" and "YOU" are now "Training" and "You", like the rest of the app's headings.
- On a wide screen the sidebar stays beside every page. Opening Progress, My workouts, Collection or any other page from it used to cover it, leaving only a back button; now the page opens beside it with its place marked. It steps aside only for the welcome tour and when you're signed out.
- Checked in the browser at 1280 and 1000 points and on a 390-point phone, in light and dark, at 0%, 50% and 100% Liquid Glass. In these screenshots the page behind the glass isn't blurred, under the tab bar either, though the same browser blurs a plain test page; so the blur itself hasn't been seen working here. Not yet seen on a phone.

## Update 158 · The keyboard run, finished (no change to the app)

*11 Nov 2026 · the commit "Docs: a workout finished from the keyboard, end to end"*

- Update 155 said a workout could be logged and finished from the keyboard alone. When that was written, Finish workout had only been shown to be a named button that takes focus; it hadn't been tabbed to and pressed. It now has been: start the suggested workout, type a weight and reps, tick the set, Tab to Finish workout, Enter, then Enter again on "Finish anyway" (focus is put on it, under the line saying the unticked sets won't be logged). The app shows "Workout done" and the account's log has one more workout.
- Finish workout is the last but one stop on the page, after every set of every exercise, so it is a long way by Tab on a six-exercise workout. Nothing was changed for that.

## Update 157 · Moderation shows that it's loading

*11 Nov 2026 · `3971b69`*

- This round held each screen's own request for six seconds, as a slow connection would, on Friends, the monthly challenge, My workouts, the leaderboard, Collection, Moderation, the monthly report and Progress. All but one showed rows standing in for what was coming.
- Moderation showed its headings ("Photos waiting", "Reviews waiting") with nothing under them and no sign anything was on its way. Its five lists (photos, reviews, owners' updates, gym claims, member reports) now show the same stand-in rows as the rest, each named for a screen reader, until the list arrives.
- Tried in the browser on all three Moderation tabs, with the requests held and after they arrive. App tests 578.

## Update 156 · Two more "couldn't reach the server" that weren't

*11 Nov 2026 · `dcd2940`*

- **Download my data** (Account) said "Couldn't reach the server" for any failure. When the server answers but can't do it, the row now says "Couldn't prepare it".
- **Deleting your collection** said it couldn't reach the server, and to try again when you're online, for any failure. If the server answered, its own words are shown, followed by "Nothing was deleted."
- Download my data was tried in the browser both ways. The collection one wasn't, as trying it risks the test account's collection; it's the same one-line change, type-checked.
- A search of the app found no others. App tests 578.

## Update 155 · When the server says no, say what it said

*11 Nov 2026 · `eec191b`*

- This round broke each screen's own request two ways (the server answering with an error, and not answering at all) on Friends, the monthly challenge, My workouts, the leaderboard, Collection, a gym's page and the moderation queue. Every one stayed up and said something sensible, with no stray text.
- One was wrong: My workouts, a saved workout's page and its editor said they "couldn't reach the GymGO server" for any failure, including when the server had answered with an error or said the workout no longer exists. They now pass on what the server said, and keep "couldn't reach" for when that's true.
- Also tried from the keyboard alone, and needing no change: building a workout (the body figure's muscles take focus and have names; the list underneath works too), entering a set, ticking it, and reaching Finish workout.
- App tests 578 (1 new); the school report and README say 1,237 tests.

## Update 154 · Checks on this session's website work (no change to the app)

*10 Nov 2026 · `97ba715`, and the note after it*

- **The GitHub Pages build**, which Updates 148 to 150 changed the page and the entry point of, was run here as Pages runs it and opened both ways. With its server off it comes up as the limited version; with it on, as the full one. Either way the loading screen goes and there are no errors, and the limited version's twelve main screens pass the accessibility audit in light and dark. Netlify's build script was run too and its output checked (the loading screen and its picture are in it). Nothing was published from here.
- **A correction to Update 151.** The gym address in that audit wasn't a real gym's, so what was checked there was the "Gym not found" page (and, in Update 152, a gym's sheet inside Explore). Four real gym pages have now been audited in light and dark, two of them with every row opened: all clean.
- **A production build of all of it** opens 20 main screens with no errors, one main landmark each, and no loading screen left behind. `pnpm verify` passes: 1,236 tests across the eleven packages.
- **Loading only your region's gyms** was measured and left alone. Fetching the US and European gyms later would save about 100 KB of a 2.2 MB first visit, roughly a tenth of a second on fast 4G. Every screen reads the built-in gyms directly and the limited website has nothing else, so the rework isn't worth what it could break.

## Update 153 · Sheets take the keyboard

*10 Nov 2026 · `9d31c5a`*

- On the website, opening Filters or a gym from the keyboard left focus on the button behind the sheet, and Tab walked through the page underneath before it reached anything in the sheet. A sheet that opens now takes focus: the next Tab is its first control (Reset, then Today, Tomorrow, the times).
- When the sheet closes (Escape, or its own button), focus goes back to what opened it: the Filters button, or the gym's card.
- No ring is drawn round the whole sheet while it holds focus: it's the sheet, not a control. With a mouse or a finger nothing looks different.
- Tried in the browser with the keyboard only, on Filters and a gym's sheet; GymPal already did this. The opened-state audit is still clean. App tests 577. Phones are unchanged.

## Update 152 · The audit, with things open

*10 Nov 2026 · `0b06b6c`*

Update 151 audited screens as they load. This one opened things first: Filters, a gym's sheet, GymPal, a workout before and after Start, and the Home widget gallery.

- **Dialogs had no name.** In a browser GymPal, a choice sheet, a new card, the widget gallery and a gym's Google page each open as a dialog, and a screen reader said only "dialog". Each now says what it is: "GymPal", the sheet's own title ("Sort gyms by"), "New card", "Widgets", "Doherty's Gym on Google". GymPal, the sort sheet and the gallery were opened and checked; the new-card pop-up and the Google page use the same code and weren't opened here.
- **GymPal's starter questions** were marked as a list holding buttons, which is an error to a screen reader. They're a named group.
- **Membership prices** on a gym's sheet were a "region" with no name; now a group called "Membership prices".
- **Grey words on grey tiles.** The widget gallery's descriptions (4.1:1) and the small captions under This month's figures (4.3:1) were under the 4.5 minimum where the tile sits on the page's grey. The theme has a colour for secondary words on the grey fill, checked in every look, mode and accent by the same test as the rest; the gym initials tile from Update 151 uses it too.

All six opened states are clean in light and dark, and the screens audited before still are. App tests 577 (1 new); the school report and README say 1,236 tests. Not yet tried with a screen reader on a phone.

## Update 151 · An accessibility audit, and what it found

*10 Nov 2026 · `bdf9f22`*

GymGO's own checks look for controls with no name and for contrast on a few screens. This round ran axe, the standard set of accessibility rules, over 32 screens in the browser, light and dark. What it found, now fixed:

- **Explore's sheets.** The results sheet, the gym sheet and Filters each told a screen reader they were one "adjustable" control called "Bottom Sheet" (the sheet library's default). In a browser that reads as a slider with no value; on an iPhone it can hide everything inside from VoiceOver. They're now read as what's in them: the search box, the filters, each gym. Their grab handles, a slider that couldn't be moved from the keyboard, are plain marks in a browser.
- **Landmarks.** No screen had one, so a screen reader had nothing to jump to. In a browser the app is now the page's main landmark.
- **Contrast.** A quiet button's accent-coloured words on its tint came to 4.3:1 on the page's grey (4.5 is the minimum). The theme has a new colour for words on the tint, a step stronger only where needed, and the test that checks every look, mode and accent now checks it too. "Send your code" on Friends and "Share it" on a finished challenge were white on a faint white wash (3.8:1): they're white pills with the accent's words. A gym's initials on their grey tile were 4.43:1 and are a step darker.
- **Collection's badges.** The row scrolls sideways and nothing in it is a control, so the keyboard couldn't reach the badges past its edge. In a browser the row takes focus and the arrow keys scroll it.

All 32 screens come back clean, light and dark. App tests 576, typecheck. Not yet tried with VoiceOver or TalkBack on a phone, which is where the sheet change matters most.

## Update 150 · Tabs open at once on the website

*10 Nov 2026 · `75b9c63`*

- On the website, a screen's code is fetched the first time it's opened. Tapping Explore, Saved or Profile for the first time left the page empty, with only the tab bar, until it arrived: 1.3 seconds for Explore on a fast 4G phone.
- Once the first screen has settled, GymGO now fetches the code for the screens people go to next (Explore, Saved, Profile, a gym's page and Build a workout), one at a time while the browser is idle. Nothing is drawn ahead, only fetched. A first tap then shows the screen with nothing to wait for: Explore in 0.8 seconds (the map being drawn), Saved in 0.2, Profile in 0.3.
- It holds back for anyone who has asked their browser to save data, and on a very slow (2G) connection. The phone apps are unchanged: every screen is inside them already.
- Measured in Chromium on a production build at fast 4G and quarter processor speed, timed inside the page from the tap to the new screen's words. App tests 576 (2 new); the school report and README say 1,235 tests.
- Not yet seen on a phone.

## Update 149 · Fonts fetched while the app starts

*10 Nov 2026 · `35e47f5`*

- In a browser the app's typeface (Inter, where the device has no SF Pro) and its icon font are downloads. The app asked for them only when its first screen was being put together, over a second after its code had arrived, and held that screen until Inter came. It now asks the moment its code starts to run, so they download through that second.
- On a fast 4G phone the website is usable at about 4.4 seconds, from 4.9 (and 10.2 before Update 148). Icons are there with the first screen; they used to appear about half a second after it.
- Apple devices still fetch only the icon font, as they draw in SF Pro. The phone apps are unchanged: their fonts are inside the app.
- A hint in the page to fetch the fonts from the very start was tried first and dropped: on a phone connection they only took bandwidth from the code, with nothing gained.
- Measured in Chromium on a production build at fast 4G and quarter processor speed, as an iPhone and as an Android phone. App tests 574, typecheck.

## Update 148 · A faster first visit to the website

*10 Nov 2026 · `0cbe7d2`*

- Opening the website for the first time showed an empty page until all of the app's code had arrived and run: 7.3 seconds on a fast 4G phone. It now shows GymGO's splash picture on the page's own colour straight away (0.5 s), as the phone app does, and the app takes over once it has drawn. If it's taking long, a line under the picture says so after 6 seconds.
- The loading screen is light or dark as the device is, or as chosen in GymGO's Appearance settings (Dim included), so there's no flash of the wrong colour.
- GymGO's own server (GymGO online from one computer) sent the app's code as written: 7.3 MB on a first visit. It now sends text and fonts compressed (Brotli, or gzip for older browsers), each file compressed once and kept: 2.2 MB. On that same phone the app is usable in 4.9 seconds, down from 10.2. Caddy, Cloudflare, Netlify and GitHub Pages already compressed on their own, so there the gain is the loading screen.
- Measured in Chromium on a production build, with the network held to fast 4G and the processor to a quarter speed, light and dark. Server tests 299 (4 new); the school report and README say 1,233 tests.
- Not yet seen on a phone.

## Update 147 · A shorter school report

*10 Nov 2026 · `73c5755`*

- The project report is about 7 pages instead of 13: 12 functional and 8 non-functional requirements, shorter constraints, the flowchart, the same four tests, and an evaluation matrix to match. It reads more plainly, with fewer bold lead-ins, and the pseudocode appendix is gone.
- The team is Ashen and Liam, in the report, the README and the Gantt spreadsheet (owners Ashen, Liam or Both).
- The Gantt chart is no longer in the report, as asked; GymGO-Gantt.xlsx is still in the ZIP on its own.
- The README / product page is about half as long.

## Update 146 · Exercises done at body weight

*10 Nov 2026 · `123546d`*

- An exercise logged without weights (push-ups, say) showed "Heaviest —" and "1-rep max —" at the top, read aloud as dashes. It now shows "Most reps 10, in one set" beside Sessions, and the Records list doesn't repeat it.
- Its chart opened on 1-rep max, which said it needed a weighted set; it opens on Reps, which has the data. Weighted exercises still open on 1-rep max.
- A flat line of whole numbers (10 reps every time) had gridlines at 9.5 and 10.5 reps, the top one cut to "10.5 re…". Whole numbers now get whole gridlines: 9, 10 and 11. The rule is in lib/chartScale.ts, with tests.
- Compare's distance says "Unknown" rather than "—" when it isn't known.
- Seen in the browser at 320 and 390: push-ups (Most reps, opens on Reps, 11 / 10 reps) and bench press (unchanged). App tests 574 (3 new), typecheck.

## Update 145 · Pro's table in plain words

*10 Nov 2026 · `88f1b97`*

- Pro's table of what Free and Pro get had its headings in small spaced capitals ("FINDING GYMS", "FREE", "PRO") inside the card. They're now "Finding gyms", "Free" and "Pro", as card headings are everywhere else.
- Gym notes, Streak freeze and Lifetime stats showed a bare "—" for Free, which a screen reader reads as a dash. They say "Not included".
- Each row in the shared list carried an emoji the screen never showed (it draws its own icons); gone.
- Also swept 16 screens at tablet width (768): no errors, nothing past the edge, columns held to a readable width where they should be.
- Seen in the browser at 390 wide, light and dark, as the free account. Tests: app 571, server 295, shared rules 197; typecheck.

## Update 144 · "Check you’re online"

*10 Nov 2026 · `6965de2`*

- When the server couldn't be reached, sign-in said "Start GymGO on this computer, then try again". That's right while you run GymGO yourself, but GymGO online (or a release build with its own server) would have told a visitor to start a server they don't have. A hosted GymGO now says "Can’t reach GymGO. Check you’re online, then try again."
- Hosted means the build names a server on the internet: not localhost, a .local name or a home-network address (192.168…, 10…, 172.16 to 31…). GymGO online counts as hosted unless it's opened at localhost.
- Sign-in, Account, Account's member tools and Pro now share that one line; Account had "just now" and Pro "Check it’s running", each its own way. Pro's "Manage it from GymGO on your computer" (on a phone build that can't open Stripe) says "on GymGO’s website" when the server is hosted.
- Seen in the browser at 390 wide with the server stopped: sign-in in development shows the computer wording; a build pointed at an address that can't exist shows "Check you’re online". App tests 571 (2 new), typecheck; the school report and README now say 1,226 tests.

## Update 143 · The server's own pages

*10 Nov 2026 · `f09baaa`*

- The Legal page listed the four documents as cards and then again as a row of links underneath. The row is gone there; each document still links to the others.
- Choosing a new password: the rule ("At least 8 characters…") was under the button, after you'd pressed it. It now sits above it, and the screen reader reads it with the first field. The heading on the reset pages has room under it, as on the legal pages.
- "This link has stopped working" says where to ask for a new one as "on Sign in, tap **Forgot your password?**", and the app's own hint puts the button's name in quotes, so the question mark doesn't end the sentence by accident.
- Seen in the browser at 390 wide, light and dark: Legal, Terms, the reset link that has stopped working, the reset form with and without a problem, and Password changed. Server tests 295 (one more check), typecheck.

## Update 142 · "A$20 you can’t use"

*10 Nov 2026 · `4a7d777`*

- A price a gym has but you can't use (locals only, say) showed "A$20" over "not for you". It now reads "A$20" over "you can’t use", together "A$20 you can’t use", and a screen reader hears "A$20, which you can’t use".
- Tests cover both price phrases (this one and "Ask for the total"); the demo gyms show "Ask for the total" in Explore's list.
- Not yet seen on a phone.

## Update 141 · "Ask for the total"

*10 Nov 2026 · `2e0e424`*

- A gym whose single-visit price is known but some must-pay fee isn't showed "Ask" over "fees unclear", which read as one muddled phrase. It now reads "Ask" over "for the total", together "Ask for the total"; the Prices row says the same, and a screen reader hears "Ask for the total: some fees aren’t published".
- Also checked: GymGO Free's compare limit end to end (two gyms join Compare; the third opens GymGO Pro, which says "Free compares two gyms at a time. Pro lines up four.").
- Not yet seen on a phone.

## Update 140 · A deposit said plainly

*10 Nov 2026 · `3adec77`*

- A gym's deposit read "Plus a A$20 refundable deposit — A$45 on the day." It now reads "Plus a refundable deposit of A$20, so A$45 on the day." (no "a A$", no dashed aside).
- A demo gym's notices read "Demo listing: that number isn’t real…" rather than with a dash. A scan of every string in the app finds no other dashed aside.
- Not yet seen on a phone.

## Update 139 · One quick budget

*10 Nov 2026 · `70d11a0`*

- Home's budget shortcut said "Under A$25" while Explore's budget chip offered "Under A$30", so one tap set a different budget depending on where you were. Both now set the same, A$30 (in each country's own sizes, so not A$30 in Japan). Filters still offers A$15 to A$40.
- Also checked: 24 screens at 390 in light with no errors and nothing wider than the screen.
- Not yet seen on a phone.

## Update 138 · One title on the legal pages

*10 Nov 2026 · `42b466e`*

- The Terms of Service, Privacy Policy and Community Guidelines no longer say their name twice (in the bar and above the page): the bar is empty and the page's own title is its heading, which a screen reader now hears as one, as on the other pages with a big title.
- Also looked at, with nothing to change: an exercise's page, Moderation, and the editors for your own workout and exercise.
- Not yet seen on a phone.

## Update 137 · The password rule said once

*10 Nov 2026 · `288d492`*

- Creating an account, the password box said "At least 8 characters" right above a check saying "8 characters or more" that ticks as you type. The box now just says "A new password", and the rule is said once, by the check.
- Also checked: the unnamed-controls scan on 18 more screens (all named; only the map's credit links are small, as the map draws them), and colour contrast on 8 screens in light and dark (all pass).
- Not yet seen on a phone.

## Update 136 · No repeated place name on a computer

*10 Nov 2026 · `69e8790`*

- On a computer, Explore's panel opened with a label naming the place ("Melbourne CBD") right above its heading saying the same ("Near Melbourne CBD"). The label now shows there only when it has more to say (demo gyms, an offline copy, map data, a place that's part of Pro). On a phone it stays on the map, where it names the place while the list is pulled down.
- Also checked at 1280 points: Friends (its new rows), Templates in dark, a gym's page.
- Not yet seen on a phone.

## Update 135 · Cities counted the same way everywhere

*10 Nov 2026 · `02820db`*

- Your collection and a friend's totals now count cities the same way: the same name in any capitals is one city ("melbourne" and "Melbourne"), and a gym collected far from any known city, with no suburb on the map, no longer counts as a city of its own. Before, the app counted capitals apart and the server counted the blank.
- Tests cover both (each failed before the fix).
- A change you'd only see in those rare cases; not seen on a phone.

## Update 134 · A visit counted once in what you pay

*10 Nov 2026 · `bd46320`*

- What each visit costs added up each payment's visits, so a visit covered by two of them (a membership at a gym and a pass for any gym, say) was counted twice, and the cost per visit came out at half what it was. The total now counts each day you went once: two passes over the same 3 visits now say "A$180 over 3 visits, A$60 a visit", where they said 6 visits and A$30. Each payment's own line is unchanged.
- A test covers it (it failed before the fix).
- Not yet seen on a phone.

## Update 133 · One kind of apostrophe

*10 Nov 2026 · `da429d0`*

- A few lines used a straight apostrophe (don't) where the rest of the app uses a curly one (don’t): three of the Filters' hints, the gym page's demo and "can't make calls" notices, the location notices ("Couldn't get a fix…", "Here's Sydney…"), the crowd line, the Pro page's small print, the time-zone warning and the leg press cue. They now match. Place names from the map data (St. John's) are left as their sources spell them.
- Checked by reading what 12 screens and the Filters sheet show: no straight apostrophe left on them.
- Not yet seen on a phone.

## Update 132 · A programme counts only its own weeks

*10 Nov 2026 · `10ce3ad`, `d85f7e4`*

- A training programme's total ("Done: 3 workouts in 8 weeks") counted every later workout with the programme's name, even after its weeks were over: one from November counted towards a programme that ran in January and February. It now counts only the workouts within its own weeks (tested).
- A programme whose weeks ran out with nothing logged says so ("Its 6 weeks are over, with no workouts logged."), not "Done: 0 workouts".
- On Friends, a friend who hasn't collected anything says "No gyms collected yet" rather than "0 gyms · 0 cities · 0 visits".
- Not yet seen on a phone.

## Update 131 · The map names the place you searched

*10 Nov 2026 · `88b8bab`*

- After you search a suburb, the map's corner label names it ("Fitzroy"), as the list's heading does ("Near Fitzroy"), instead of the city ("Melbourne"). Demo gyms, an offline copy, map data and Pro-only places still say so with a dot.
- What each visit costs no longer says "A$150 over 0 visits" under "No visits yet": it says "A$150 paid in this time".
- The school report (Update 130) notes the map label as found in test T1 and fixed after it, and its README no longer lists it as a known issue.
- Not yet seen on a phone.

## Update 130 · The school project report

*10 Nov 2026 · `0a28b25`*

- `docs/school/` holds GymGO written up for the class's Interactive Digital Solution task: the report (`GymGO-Project-Report.docx`, also as Markdown) with 21 functional and 12 non-functional requirements, the constraints, a test plan, the evaluation matrix and the verdict rule as pseudocode; the Gantt chart (`GymGO-Gantt.xlsx` and a picture); the flowchart of the main user journey; the README / product page; and screenshots from the four tests.
- The four tests were run in the browser on 10 November 2026 and all passed (search for Fitzroy in 1.2 s; 101Fitness's price shown as unknown, never $0; a Chest and Triceps plan in 3.4 s; five screens at 320 points with no sideways scrolling). The peer user-testing tables are left empty for the team's real sessions, and team names are placeholders.
- No change to the app.

## Update 129 · What each visit costs, in plain words

*10 Nov 2026 · `5eecfac`*

- What each visit costs heads its summary card "Last 30 days" (or "Last year") in sentence case, as the app's other cards do, instead of "LAST 30 DAYS".
- Not yet seen on a phone, and not seen in the browser (the card needs something entered as paid): a change of words and style only.

## Update 128 · Compare's rows in plain words

*8 Nov 2026 · `55f61be`*

- Compare names each row as the app's other cards do ("A visit costs", "Guest hours", "Photo ID"), in sentence case, instead of spaced capitals ("A VISIT COSTS").
- Also looked at, with nothing to change: GymPal's panel (its greeting is the owner's own words) and Profile. Capitals stay where they head a list (Profile's TRAINING, Country's YOURS) or a column of numbers (a set's KG).
- Not yet seen on a phone.

## Update 127 · "Melbourne", not "Melbourne · live data"

*8 Nov 2026 · `3f316dc`*

- The map's label in the corner says just the city's name when it shows GymGO's own gyms, instead of "Melbourne · live data" with a green dot: "live" read as if GymGO knew how busy gyms are now, which it doesn't. Anything out of the ordinary keeps its dot and its words: demo gyms, an offline copy, map data outside the cities, or a country that's part of Pro.
- Also looked at, with nothing to change: Saved.
- Not yet seen on a phone.

## Update 126 · No greyed-out "Keep it"

*8 Nov 2026 · `c005205`*

- In the monthly challenge, Change your target no longer shows a greyed-out "Keep it" button under the target you already have. The button ("Make it 12 days") comes when you pick another.
- Also checked after this run of changes: 24 screens at 320 points in dark with no errors and nothing wider than the screen; 10 screens with no cut-off words (bar Home's list of exercises, cut on purpose) and no unnamed buttons.
- Not yet seen on a phone.

## Update 125 · Milestones with plain icons

*8 Nov 2026 · `ddfb583`*

- Progress's milestones (workouts, weeks in a row, records broken, sets logged) show their icon on its own, in the accent once you've reached the first step and grey before, instead of white on a filled circle.
- Also looked at: the round buttons for steppers, close, send and play, which stay round, as buttons do.
- Not yet seen on a phone.

## Update 124 · A gym's facts without their circles

*8 Nov 2026 · `a6b0ac9`*

- On a gym's page, the three tiles for price, reviews and kit show their icon on its own instead of in a tinted circle, like the rows of facts beneath them.
- "Is it busy?" shows its people icon on its own, in the colour of how busy members say it is, instead of on a coloured circle.
- Tidied away: styles for emoji the app no longer draws, and a gym page section's old emoji option, now that every one has an icon.
- Not yet seen on a phone.

## Update 123 · Rows to open, not stacks of buttons

*8 Nov 2026 · `76dad14`*

- Friends lists Leaderboard and Monthly challenge as two rows with a line of what each is, as Profile lists them, instead of two big buttons one on top of the other.
- Progress ends with Plate calculator and Export your log as rows (the note on what the export is sits under them), and My workouts ends with Make your own and Build one from muscles the same way.
- Not yet seen on a phone.

## Update 122 · Fewer pats on the back

*8 Nov 2026 · `865b3b1`*

- Progress says "Goal of 3 met this week" instead of "Goal of 3 met. Nice work.", a workout's summary says "2 new records" without an exclamation mark, and finishing a set of cards says "You've finished the (name) set" plainly.
- Kept as they are: a rare card's reveal ("Epic!"), which only a rare pull gets, and GymPal's greeting, which is the owner's own wording. The 3-second Build my workout bar also stays: the owner asked for it.
- Not yet seen on a phone, and these lines weren't seen in the browser either (they need a new record, a first goal week or a finished set): a change of words only.

## Update 121 · GymGO's own icon on the Pro page

*8 Nov 2026 · `784ff87`*

- The GymGO Pro page starts with GymGO's app icon, as a subscription page in the App Store shows the app's own icon, instead of a crown on an accent square.
- Not yet seen on a phone.

## Update 120 · Ticks as icons, not typed marks

*8 Nov 2026 · `bcfddb2`*

- In a workout built for a gym, each exercise's kit shows the app's green tick or orange mark in front of it, instead of a typed "✓" or "?", as a gym's page already shows what it has. A screen reader hears "confirmed at this gym" or "not confirmed here".
- "Uses only what (the gym) lists or members report" has the same tick, and a saved workout's note says what the tick and the orange mark mean in words.
- Not yet seen on a phone.

## Update 119 · Programme and trips, plainly

*8 Nov 2026 · `4c59ae9`*

- Your programme's page starts with its name ("Strength programme") instead of an icon on an accent square, as the templates now do.
- Home's card for a trip coming up shows its globe on its own, like Machines and Trips beneath it, instead of white on a circle.
- Also looked at, with nothing to change: the search suggestions' place pins (as Apple Maps marks a place), the rows with a coloured tile (as Settings draws them), the monthly challenge card (a picture to share) and a gym page's answer.
- Not yet seen on a phone.

## Update 118 · Home's week and collection without their circles

*8 Nov 2026 · `8712672`*

- Home's This week and Your collection widgets show their icon on its own (an orange flame; the cards in the metal of your best tier) instead of white on a coloured circle, as a tile and as a full-width row, like Machines and Trips beside them. The nudge that you're at a gym does the same.
- Your country leaves the bar empty under its own title (it said "Country" over "Your country"), and Report a bug starts with its line of text, without the red bug square beside it.
- Also looked at, with nothing to change: Account, Exercises, Compare, Home from top to bottom. The weather symbol keeps its pale disc in dark mode, where MET Norway's dark moon and cloud outlines would otherwise be lost.
- Not yet seen on a phone.

## Update 117 · One title per page, and plain template cards

*8 Nov 2026 · `4ac4f7d`*

- Templates' cards start with the plan's name instead of an icon on an accent square; the strip of exercise icons below already shows what each plan is.
- Progress photos and What each visit costs no longer put a second title in the bar above their own big one ("Progress photos" twice, "What you pay" over "What each visit costs"), as Body measurements already did.
- Also looked at, with nothing to change: Your week, the interval timer, Trips, Reminders, Body measurements, Find a machine and GymGO Pro.
- Not yet seen on a phone.

## Update 116 · Icons, not emoji, and fewer exclamation marks

*8 Nov 2026 · `ade25a4`*

- Appearance's Celebrations and Sounds show the app's own icons (a party popper, fireworks, a star, a smiling face; a note and a game controller) in place of emoji, so they match every other icon in GymGO. The Emoji celebration itself still rains emoji.
- The slider in Appearance (how glassy GymGO is) no longer glows in the accent under your finger: the glass lens is enough, as on iOS.
- Messages say thanks plainly: "Thanks." after a member report or a photo, "Collected" for a new card, and "You're at (the gym)" once a check-in finds you, instead of "Thanks!", "Collected!" and "You're here!".
- The page Stripe sends you back to after paying has no 🎉, 👋 or ✅ above its title, says "Thanks for subscribing.", and only says it's taking you back to GymGO when it is.
- Not yet seen on a phone.

## Update 115 · Room for GymPal's button

*8 Nov 2026 · `7b3b5cf`*

- A full page's last line no longer ends under GymPal's round button in the bottom corner: pages leave a little more room at their foot, so the last row scrolls up clear of it (the workout builder's "Warm up, and pick weights you can move well." at 320 points was half hidden). With GymPal's button hidden in Appearance, pages end as before.
- Not yet seen on a phone.

## Update 114 · A ticked set, settled

*8 Nov 2026 · `1e6fe7d`*

- In a workout, a ticked set's weight and reps sit plainly in their row instead of in green boxes: the row's faint tint (green, or gold for a record) and the green tick already say it's done, so it no longer stacks three colours on one line. The numbers can still be tapped to change.
- Also checked: the rest timer bar in light and dark, and a walk through 14 screens for console warnings (the only one is from the map's own style, OpenFreeMap's, not GymGO); Reduce Motion is still fully respected.
- Not yet seen on a phone.

## Update 113 · Search suggestions as Maps draws them

*8 Nov 2026 · `ece976d`*

- In the map's search suggestions, "Look up …" and places you searched before show their icon on a grey circle, as Apple Maps draws a search or a recent one, instead of a tint of the accent. The coloured circles are left for places and gyms.
- Also looked at: Progress's records, milestones and history, and Find a machine with a machine picked; no changes needed.
- Not yet seen on a phone.

## Update 112 · Icons on the accent cards on their own

*8 Nov 2026 · `ffed9e9`, `7cd854d`*

- Home's Build a workout and Profile's plan card show their icon on its own, a little larger, instead of in a faint white square, as the plain cards' icons already do.
- Not yet seen on a phone.

## Update 111 · Pro said plainly

*8 Nov 2026 · `7d357b0`, `c569926`, `77fa886`*

- On GymGO Free, Home's Other cities put "PRO" on every city outside your country (more than 30 of them). Now each group that's all Pro says it once beside its name ("USA · with GymGO Pro"), and the cities show just their flag and name. A screen reader still hears "with GymGO Pro" on each city, and a group mixing free and Pro cities keeps the tag on the Pro ones.
- Profile's plan card on Free says what you're on, GymGO Free, and what it covers ("Up to 10 saved gyms, and 2 side by side to compare"), instead of the slogan "Go further with Pro". Its button to see Pro is unchanged.
- The Pro page, opened from Profile, says "What Free covers, and what Pro adds." under its title instead of the tagline "Keep more of what you find." (Opened from a locked feature, it still says what that feature does with Pro.)
- Also looked at: Compare with two gyms, Appearance and Profile for a free account, and five screens at 1280 wide; no other changes needed.
- Not yet seen on a phone.

## Update 110 · Plainer sentences

*8 Nov 2026 · `422b9fd`*

- The few lines that leaned on a dash for effect say it plainly: the filters button with nothing left reads "No gyms: loosen a filter"; with location turned down, "Location is off for GymGO. Search a suburb or city instead." (it said "No worries —"); "GymGO doesn't have live crowd info, so it won't guess."; Reviews with none says "None yet" (it said "None yet — be the first"); and the filters' hint says "The hours visitors can walk in, not members' hours."
- Not yet seen on a phone.

## Update 109 · A plain slot where a photo would be

*8 Nov 2026 · `62565ba`*

- On a gym's card, "No photo supplied yet" sits in a plain grey slot, instead of a tint of the accent with a dashed accent border. Its Add one button is unchanged.
- Also checked: Tab reaches Workout's new list rows in a browser, each showing a clear accent focus ring.
- Not yet seen on a phone.

## Update 108 · The builder's options fit a small phone

*8 Nov 2026 · `e1d4ffe`*

- The workout builder's length choice said "Standard…" on a 320-point phone; there it reads Quick, Standard and Long, with the number of exercises (· 4, · 6, · 8) where there's room. The built plan still says how many exercises it has.
- Its Goal, Length and Machines headings, inside their card, are in sentence case.
- Checked: the screens not looked at before (Saved, Trips, Reminders, Account, Appearance, Compare, Machines, Your week, Progress photos, Pro, the welcome tour, the builder, the three editors, a card's page) at 320 for cut-off text. Only Account's Name row shortens a long name, as iOS's Settings does, with the whole name large above it.
- Not yet seen on a phone.

## Update 107 · Kit in fewer words

*8 Nov 2026 · `ccc2682`*

- The Exercises list and Add exercise say what an exercise needs in fewer words, so the line fits on a small phone (the longest were cut off at 320 points):
  - where the ways to do it differ by one piece of kit, that piece is the choice: "Barbell + Squat rack or Power rack", not "Barbell + Squat rack, or Barbell + Power rack";
  - where one way is the other with one thing more, that thing is optional: "Dumbbells, Bench optional".
- Anything else is said in full as before, an exercise's own page always lists every way in full, and a screen reader hears the full wording.
- Not yet seen on a phone.

## Update 106 · Headings inside the tools' cards

*8 Nov 2026 · `8580111`*

- The plate calculator's Each side and Warm-up, 1-rep max's Percent of your max and What you could do for, and the monthly report's switcher title (Monthly report, over the month) are in sentence case, like the other headings inside cards. Section headings over lists (Records, Done most, Latest…) keep their small capitals.
- Not yet seen on a phone.

## Update 105 · Figures and names that fit a small phone

*8 Nov 2026 · `bf77524`, `7b3c822`*

- Home's This month widget showed "11,563 kg" cut off on a 320-point phone. The figure is now the number and its word says the unit ("11,563 · kg lifted"), as a finished workout's summary does; a screen reader hears "11,563 kg lifted".
- Workout: a saved workout's name gets two lines on a small phone; "Chest, Shoulders, Triceps" was cut short.
- Checked: 20 screens at 320 for cut-off text; only the Exercises list's longest kit lines are cut (two lines in a narrow column), and each exercise's page lists them in full.
- Checked: every widget on Home at once, at 320 dark and 390 light, with nothing cut off apart from the last workout's exercise list, which is meant to end in "…".
- Not yet seen on a phone.

## Update 104 · Tidying behind the scenes

*8 Nov 2026 · `51ec148`*

- No change you can see. Code nothing used any more is gone: three old interface pieces (a tier pill, a section title and a divider), four unused helpers and a colour for hovering over the body figure that the figure no longer reads. The app's code now has no unused locals (checked with the compiler's own check), apart from one researched figure kept in the Australian data.
- Checked: every package's tests, and Home, the map, a gym page, Exercises, Workout and Progress load with no errors.

## Update 103 · Works, Needs, Membership

*8 Nov 2026 · `14d63b7`, `344b0b2`*

- An exercise's Works, Needs and Counted, a gym's Membership banner and Google's page heading (On Google Maps) are in sentence case like the other small headings inside cards. Nothing in the app is forced into capitals now except the section headings over lists, as iOS does.
- A finished workout's three figures (time, sets, lifted) are the number and its word, without an icon over each, as on Progress and Lifetime.
- Not yet seen on a phone.

## Update 102 · A workout's summary ends with one button

*8 Nov 2026 · `b50c5b7`, `9f00aea`*

- After a workout, the summary's four full-width buttons stacked one on another are a short list (Share your record when you set one, Share this workout, See your progress) and one solid Done. While the record's picture is being made, its row says "Making the picture…" and can't be tapped twice.
- My workouts with nothing saved: Make your own and Build one from muscles as the two buttons, and Or start from a template as a plain link under them, instead of three full-width buttons.
- Google's rating line on a gym page has an ordinary separator ("4.3 · 120 Google reviews"), not one padded with double spaces.
- Not yet seen on a phone.

## Update 101 · The last capitals in cards, and no fake text

*8 Nov 2026 · `0151410`*

- The headings on the accent cards are in sentence case too: Your plan (Profile), Your friend code, a friend's collection, Monthly challenge, Estimated 1-rep max and Since October 2026 (Lifetime). The shareable pictures (your week, your lifetime, a record) keep their capitals: they're designed as images to post.
- 1-rep max, before you type anything: the outlined card showing where the estimate will go no longer has grey bars standing in for text (they looked like something still loading); How it works is in sentence case.
- Not yet seen on a phone.

## Update 100 · The map says what it does

*8 Nov 2026 · `1372572`, `bdb5488`*

- The map's results no longer open with a time-of-day quip in capitals ("LUNCH-BREAK PUMP?", "CAN'T SLEEP? SAME."): the line under the heading already says the time you're looking for ("none a sure thing at 1 pm").
- Its search box asks for what it takes, as Home's does: "Suburb, city or gym" (a city or ZIP code in the US, a town elsewhere), and "Search" on the smallest phones, instead of "Where are we lifting?" and "Where to?".
- A new card's pop-up closes with Done (it said "Nice!"), and its Collection button shows the collection's cards icon. The welcome tour ends with Get started (it said "Let's go"), and its page about collecting shows the cards icon too. Collected! and You're here! stay: those are moments worth the exclamation mark.
- (GymPal's greeting stays word for word as you wrote it.)
- Also checked: the 16 screens changed in this clean-up at 320 points in dark, with no errors and nothing overflowing.
- Not yet seen on a phone.

## Update 99 · How to do it, as a card like the rest

*8 Nov 2026 · `f6afa8f`*

- An exercise's How to do it is a card like the ones under it, with the moving figure on its usual tile beside the cue, instead of a block of the accent. The accent is kept for your own numbers (Lifetime, the 1-rep max, Collection).
- Exercise tiles everywhere (lists, plans, a workout, the monthly report) lose the white gloss drawn across their top corner.
- Not yet seen on a phone.

## Update 98 · The welcome tour on a plain page

*8 Nov 2026 · `561c9f5`*

- The three welcome pages after making an account sit on the plain page, without the large glow of the accent behind them. Each page's symbol, in the accent, is enough.
- (A gym page's Go, Call and Website buttons keep their Liquid Glass: that's the material you chose for controls, as in iOS, not decoration.)
- Not yet seen on a phone.

## Update 97 · A gym's page as a plain list

*8 Nov 2026 · `9cda0fc`*

- A gym's page lists its sections (Prices, Join this gym, Getting in, Equipment, Facilities, Reviews, Your notes, the owner…) with each icon on its own, a little larger, instead of in a tinted circle; the titles still line up. Any other folding list in the app looks the same.
- Facilities, and the yes-or-no details on Google's page, show a tick or a cross icon rather than typed ✓ and ✗ characters; a screen reader says "yes" or "no" after each.
- Not yet seen on a phone.

## Update 96 · The last tinted circles

*8 Nov 2026 · `63f11c5`*

- The rest of the decorative icons in tinted circles and squares show on their own: Trips, the Pro offer, the Google gate, the Leaderboard's join card, Friends' empty card and Progress's Lifetime row. Tinted round buttons you press (the steppers, add and save) keep their circles: those are controls.
- Collection's Next to collect: a gym with no logo shows its initials in a plain tile, as a gym card does, instead of the same dumbbell on every row. Three-character initials (F45, 24/7) fit the small tile; they were cut to "F…".
- Not yet seen on a phone.

## Update 95 · Numbers without ornaments

*8 Nov 2026 · `03c0d24`*

- Progress's three figures at the top (weeks in a row, this week, workouts) and Lifetime's six (workouts, hours, sets, reps, records, best streak) are the number and its word, without a small coloured icon over each.
- Lifetime's favourites and Pro's comparison table show their icons on their own, not in tinted squares and circles.
- Not yet seen on a phone.

## Update 94 · Plainer words and headings

*8 Nov 2026 · `aa20c07`*

More of the same clean-up, in the type and the headings:

- Small headings inside cards are in sentence case instead of spaced-out capitals: Home's widgets ("Muscles trained"), an exercise's how-to card ("How to do it · Compound"), a plan's summary ("Your workout", "Saved 3 November"), Up next and Last time on Workout, What you did and Your note after a workout, Your collection, and Your place on the leaderboard. Section headings over lists stay in small capitals, as iOS's own do, and so does the date over Home's title.
- An exercise's place in a plan or a workout no longer has a zero-padded number in front ("01 · CHEST"): a workout says "0 of 3 sets done", a plan the muscles it works, and the workout editor "Exercise 1".
- Home's section titles (Near …, Saved, Recently viewed, Browse …, Other cities) are plain bold titles, without a two-tone icon in front of each.
- A gym with no photo or logo shows its initials on a plain grey surface with the "No photo supplied" tag, instead of on a tinted gradient with rings and halos drawn round them.
- Not yet seen on a phone.

## Update 93 · Less decoration

*8 Nov 2026 · `5c5748d`*

You asked for the app to look less "vibe coded". This round takes away the effects that made it look generated rather than designed:

- Buttons and cards filled with the accent are flat: no coloured glow under them and no glossy white wash across them (Start workout, Build a workout on Home, the exercise page's how-to card, a plan's summary, the 1-rep max, Lifetime, Collection, Friends, Leaderboard, Pro and the rest).
- The accent's haze behind every page is half as strong at the usual Liquid Glass level, a faint tint rather than a purple bloom. Turning Liquid Glass up still deepens it.
- An empty page (no workout in progress, nothing saved, no trips, no friends yet, not found) shows its symbol large and quiet in grey, as iOS does, instead of a glowing tile of the accent in a pool of colour. The welcome pages keep the accent; a finished workout keeps its green or gold.
- No more sparkles, the stock "magic" icon. Pro shows its crown, a streak freeze its flame, building from muscles a body, a new gym collected a card, loosening search filters the filters icon, Haptics a vibrating phone; the Fresh muscles chip has no icon, like the chips beside it. (A Legendary card still twinkles: that's the card, not decoration.)
- Workout, with nothing in progress: the three big tinted buttons stacked one on another are a list, Start another way: Build from muscles, Make your own, From a template. Someone with nothing logged yet still gets one solid Build a workout button first.
- Home: the shortcuts, Machines, Trips and Tools show their icons on their own instead of in tinted circles, and Up next drops its play circle (its Start button already says it).
- Not yet seen on a phone.

## Update 92 · A finished workout's summary opens at its top

*7 Nov 2026 · `147a943`*

- Finishing a workout from the bottom of the page opened its summary part way down, with its heading and totals off the top of the screen. The summary now opens at its top. The same goes for any screen that swaps one page for another in place.
- Changing the colours (an accent, dark mode) still keeps the page where it was scrolled, as before.
- Not yet seen on a phone.

## Update 91 · What you just made comes into view

*5 Nov 2026 · `6b0a67b`, `9c6b521`*

- Starting a training programme shows it from the top (its name, the week and your progress). The page stayed scrolled down where the Start button was, so it opened on the middle of the programme. Ending it, or picking another, goes back to the top of the choices too.
- After Build my workout, the page brings the plan up to where you can see it (its summary, Start workout and the first exercise). It used to stay put, with the plan just peeking in at the bottom of the screen under the options. With Reduce Motion it moves there at once instead of scrolling.
- Not yet seen on a phone.

## Update 90 · Icons that say what they are

*5 Nov 2026 · `d36ae90`, `db8bd50`*

- Note during a workout, Add a note on an exercise's page and the note itself show a note's icon. They showed a map pin, which reads as a place (and is what an address shows).
- The collection's icon is a stack of cards (Profile's Collection row, Home's collection tile and widget, the Collection button after a check-in) instead of the trophy that Lifetime and the Leaderboard also use. A gym's tier medal keeps its trophy.
- Swept 19 less-visited screens at 320 points in dark (plate calculator, 1-rep max, timer, reminders, what you pay, compare, leaderboard, your week, programme, templates, progress photos, Pro, account, machines, trips, report a bug, and the three editors): no errors, nothing cut off or overflowing. The screens changed today pass the check for unnamed buttons.
- Not yet seen on a phone.

## Update 89 · The whole body at a glance on Home

*5 Nov 2026 · `24aaff1`, `7b289c4`*

- Home's Muscles trained widget shows the recovery map in small beside its lists, front and back, in the same heat colours, so you see the whole body at a glance as well as the muscles it names. Your male or female choice applies here too.
- The monthly report's Sets for each muscle shows the body above its bars: each muscle you trained that month in the accent, deeper the more sets it had, so a month heavy on chest and light on legs shows at a glance.
- Checked the body in the looks that paint their own cards (Classic light and dark, Paper, Material): it reads on each. And a sweep of 13 screens at 1024 wide in dark: no errors, nothing cut off or overflowing.
- Not yet seen on a phone.

## Update 88 · The body on each exercise, and your choice of figure kept

*5 Nov 2026 · `2955b49`, `f67981b`*

- An exercise's page shows the muscles it works on a small body, front and back, beside the Works list: what it mainly works in the accent colour, what it also works in a paler tint, the rest of the body grey. It's only a picture of the list next to it, so a screen reader skips it.
- Male or female, picked in the workout builder, is kept on this device and used wherever the body is drawn: the builder, the recovery map and each exercise's page. It went back to male each time you opened the builder, and the recovery map was always male.
- The recovery map has the same Male / Female switch under the body, so you can choose there without opening the builder.
- In light mode the head, hands and feet are a shade darker, so they stand out from the white card, and the female figure's hair is a shade off her head (it was the same grey, so it read as one blob).
- Not yet seen on a phone.

## Update 87 · A better-looking body figure

*5 Nov 2026 · `d6f40b1`, `a5562f8`, `4cc096c`*

- The body in the workout builder and on the recovery map is drawn with depth instead of as a flat grey chart: the body shows between the muscles (as creases, not the white card), each muscle is shaded from its top so it looks rounded, and a soft shadow sits under the feet. Male and female, front and back, light and dark, every look.
- A muscle you pick glows in its colour, with a fine light edge. On the website, the muscle under the mouse tints towards the accent in the builder (as picking it would), and on the recovery map its own heat colour lifts instead of turning grey.
- The recovery map is a heat scale: deep red for a muscle trained today, orange yesterday, amber 2–3 days ago, a faint warmth for 4 days or more, the body's grey if it's not in your log. The four purples it used were hard to tell apart. No green, as GymGO can't know a muscle is ready.
- Home's Muscles trained widget shows each muscle with the same heat dot as the map.
- Not yet seen on a phone.

## Update 86 · Titles clear of the back button

*5 Nov 2026 · `472142b`*

- On the website on a small phone (under 360 points), the back button is its chevron alone, as on an iPhone when the title needs the room: "Monthly challenge", "Find a machine" and "Progress photos" ran into "‹ Home". A screen reader still hears where it goes.
- Monthly challenge: the four targets are one row of equal choices, like the programme's days a week, instead of chips with "20 days" alone on a second line.
- A shared card is always pictured lying flat, even while you're tilting it.
- Progress: a trained day on the calendar is an easier target to tap (26 points around its 22-point square), with the calendar looking just as it did.
- Not yet seen on a phone.

## Update 85 · The whole card in a shared picture

*5 Nov 2026 · `40a0eb3`*

- Share card in the new-card pop-up now takes the whole card: its frame's glow and corners were cut off at the picture's edges.
- Next to collect shows a gym's full name on two lines when it needs them ("Absolute MMA · Melbourne CBD" was cut short on a small phone).
- Not yet seen on a phone.

## Update 84 · Collection on a tablet or a computer

*5 Nov 2026 · `4b7b962`*

- Where the page is wide enough (a tablet, a computer), your cards are three to a row instead of two very large ones, and so are a friend's.
- There, the badges and the rarity filter wrap onto more lines, so all of them show; they used to be one row cut off mid-badge at the page's edge. On a phone they're still one row to swipe.
- Also tidied this round, with no change you'd see: unused code removed across the app and the server's tests.
- Not yet seen on a tablet.

## Update 83 · A friend code or a gift, copied and said so

*5 Nov 2026 · `b0bf865`*

- Friends: on a computer, Send your code copies "Add me on GymGO: my friend code is …" and the button says "Copied, ready to paste" (before, nothing showed whether anything happened).
- A Pro gift code's Send button says "Copied", with a tick, when it was copied rather than shared.
- Not yet seen on a phone (phones use their share sheet, unchanged).

## Update 82 · Sharing on a computer copies instead

*5 Nov 2026 · `2c8d698`*

- On the website on a computer (no share sheet), sharing a gym now copies its name, address and website to paste anywhere, and says so; it used to say "Sharing isn't available here". The Share button at the top of a gym's page shows a tick and "Copied" for a moment.
- Every share falls back to copying in more browsers: where the page can't use the clipboard directly (an address without https, older Safari), it copies the older way.
- Not yet seen on a phone (phones use their share sheet, unchanged).

## Update 81 · Every field's hint fits

*5 Nov 2026 · `69bab57`*

Every text field's hint was measured against its field on a 320-point phone:

- Create account: the name field's hint is "Name shown on reviews" (it was cut off at "…as reviewers see").
- The map's search says "Where to?" on the smallest phones, where "Where are we lifting?" didn't fit beside the filters and your picture.
- Not yet seen on a phone.

## Update 80 · Sharing a picture works again on the website

*5 Nov 2026 · `68790e4`*

- Fixed: on the website, "Share as a picture" (a card, a finished set, your week, Lifetime) always said "Couldn't make the picture here". The picture library's newer version, which came with the SDK 58 upgrade, needs a companion package for browsers that wasn't installed (html2canvas-pro, MIT).
- The picture now has the page's own background, so a dark-mode card isn't on white, and it's drawn at least twice as sharp.
- Not yet tried on a phone (phones use a different path, unchanged).

## Update 79 · Tilt your card

*5 Nov 2026 · `fbd5aaf`*

- On a card's own page, drag across the card (or move the mouse over it on the website) and it leans towards you in 3D, as you'd turn a trading card to catch the light; let go and it springs back flat.
- Only sideways drags tilt it, so the page still scrolls from on top of it. It stays still with Reduce Motion, and a shared picture is always of the card lying flat.
- Not yet seen on a phone.

## Update 78 · Saying truly what's down

*5 Nov 2026 · `3e13d11`*

- With GymGO's server down, Home's weather said MET Norway couldn't be reached. It now says GymGO's server can't be, and says MET Norway only when it's MET Norway.
- When something in front of the server (the website's proxy, a tunnel) answers for it because the server is off, the app now says it can't reach the server everywhere, instead of a vague "couldn't load" or, for a page that isn't GymGO's answer, an error from reading it. (Corrected the same day: the server's own busy messages, such as the place finder being busy, keep their own words.)
- Not yet seen on a phone.

## Update 77 · Small phones, tidied

*5 Nov 2026 · `bebbcc5`*

Found by measuring every screen at 320 points (the smallest phones) for text cut short and buttons too small to tap:

- An exercise's page: its three figures no longer break mid-way ("85 kg ×" / "6"); each is the figure with what it's of under it ("85 kg", "for 6 reps").
- Lifetime: the streak tile reads "5 wk, best streak" instead of a cut-off "weeks, best …".
- A gym's "Is it busy?": on a small phone the button goes under the words, which it had squeezed to a few.
- My workouts: on a small phone Start is a round ▷, as on Workout, so a workout's name and details aren't cut short.
- A gym's "Can I do my workout here?" summary is shorter, so it fits.
- Templates: "5 exercises" is a bigger target to tap.
- Not yet seen on a phone.

## Update 76 · A clearer start to the collection

*5 Nov 2026 · `5f0a75d`*

- An empty Collection shows the five card shapes, Common to Legendary, so you can see what there is to get.
- In a set, two branches of one chain in the same suburb are told apart by their street ("Anytime Fitness (12 Smith Street)"), not listed twice under one name.
- Not yet seen on a phone.

## Update 75 · The new cards everywhere

*5 Nov 2026 · `f01fddb`*

- A gym's page shows your card as a small card in its rarity's shape and metal, not a gem dot.
- Home's Collection tile shows your best card's shape and rarity on its own line, instead of "best Silver" wrapping.
- The card reveal glows in the rarity's metal, the same as the card's frame (green for Uncommon, gold for Legendary).
- Not yet seen on a phone.

## Update 74 · Collection cards: a shape for each rarity, the gym's own colour

*4 Nov 2026 · `c8bc8f2`*

- Each rarity has its own card shape and metal: rounded steel (Common), cut green corners (Uncommon), notched blue (Rare), scooped purple with a second line (Epic), and gold with a raised crest, a crown, studs and a rainbow line (Legendary).
- A card takes the colour of the gym's own logo or website icon: red for Snap Fitness and Fitness First, blue for Kieser. When the logo is black, white or grey, the card keeps its gem's colour.
- The gym's logo or photo sits in a framed box under the rarity and gem, so the tag never covers it. Rare and above glow in their metal.
- Each card shows how many visits to the next tier ("5 to Gold").
- Collection can show one rarity at a time, with how many of each you have.
- A card's own page says its rarity, gem, where its colour came from, and the visit that rolled it.
- Not yet seen on a phone.

## Update 73 · Customise Home, smoothed

*4 Nov 2026 · `ffcad52`*

- While customising, **More widgets** under your widgets shows every one that isn't on Home, as it would look; tap one to add it.
- Smoother: the jiggle and the widgets sliding out of the way are run by the browser or phone itself, and a widget you let go of glides into its place.
- Nothing jumps when editing starts: the + and Done bar now floats above the tab bar, and the spacing stays as Home's.
- Fixed: empty widgets left gaps with a lone − badge; the page could keep scrolling and lose a widget you'd dropped; text was selected while dragging with a mouse.
- Not yet seen on a phone.

## Update 72 · Customise Home like an iPhone

*4 Nov 2026 · `db47096`*

- Customise Home now edits Home itself, as on an iPhone: the widgets jiggle, each with a − to take it off.
- Hold a widget and drag it to move it; the others make room, and the page scrolls when you near the top or bottom.
- + opens a widget gallery that shows each widget as it would look; Add puts it at the top. Done finishes.
- The list with up and down buttons is gone.
- The weather comes through more reliably: a cut-off answer from MET Norway is no longer asked for.
- Not yet seen on a phone.

## Update 71 · Customise Home, more widgets, better weather symbols

*4 Nov 2026 · `a4b67d0`*

- **Customise Home**, at the foot of Home: move widgets up or down, take them off, add new ones, or put Home back as it came. Kept on this device.
- Six new widgets: Last workout (with Again), This month, Muscles trained, Body weight, Tools and Weather by the hour; 17 in all.
- The weather on Home is now one small line; Weather by the hour is its own widget.
- Clearer weather symbols: MET Norway's own, made for its forecast, readable in light and dark mode.
- The map's weather circle is always there; with no forecast it shows a thermometer and says why.
- Not yet seen on a phone.

## Update 70 · Weather on Home and the map

*4 Nov 2026 · `a7e0c4c`*

- Home has a weather card for where you're searching: the temperature and weather now, the next six hours, and whose forecast it is and when it was made.
- The map has a small circle with a weather symbol and the degrees; tap it for the words and the source.
- °C, or °F in the United States; the phone's own weather symbols, day and night.
- It's MET Norway's forecast (Norway's national weather service: free, no key), asked for by map square, so your exact location still never leaves your phone. The Privacy Policy says so, so accounts are asked to agree to the new version.
- Nothing shows if there's no forecast to show; never a made-up temperature.
- Not yet seen on a phone.

## Update 69 · GymPal's new logo and a quieter button

*4 Nov 2026 · `0d649eb`*

- A new logo: a speech bubble holding a dumbbell, on GymGO's blue-violet. The dumbbell lifts when the chat opens and with each answer, and otherwise keeps still.
- GymPal now waits as a small tab on the edge of the screen instead of a big round button: tap it, or pull it in from the edge.
- On a computer, Ctrl + / (⌘ / on a Mac) opens and closes GymPal from anywhere; Esc closes it.
- Appearance → GymPal's button: Edge tab (the default), Corner (a smaller button than before) or Hidden (a swipe in from the edge on a phone), on the left or right.
- Not yet seen on a phone: pulling the tab and the Hidden swipe. On Android with gesture navigation, a swipe from the edge may go back instead; tapping the tab still works.

## Update 68 · Polish: Finish asks, Tap again resets

*4 Nov 2026 · `a2a3ade`*

- Finish with sets not ticked says how many won't be logged and becomes "Finish anyway", so a stray tap doesn't end a workout half done.
- Every "Tap again to delete it" button goes back to normal after 8 seconds (Delete account after 20), so a tap much later can't delete something.
- Make your own is on the Workout page when no workout is going; My workouts says you can change one.
- Profile's My workouts and Plate calculator say what they are; the empty Monthly report says what it will show, with Start a workout.
- Not yet seen on a phone.

## Update 67 · Your own workouts, splits and exercises

*3 Nov 2026 · `b918dee`*

- Make your own workout from scratch: pick the exercises, then each one's sets, reps and rest, put them in order and make supersets. Starting it is free; keeping it in My workouts is Pro, as before, and a kept one can now be changed.
- A plan from the builder can be changed the same way before you start it.
- Your own splits (Pro): up to seven days of your own, listed above GymGO's templates and taking turns like them.
- Your own exercises (Pro): a name, the muscles, the kit, reps or a time, how to do it, and a GymGO icon it borrows. They show up everywhere you pick an exercise, with their own records and history.
- Deleting an exercise of yours keeps its name on the workouts you logged with it.
- Not yet seen on a phone: the editors with a phone's keyboard, and the iPhone's own "Discard" alert.

## Update 66 · The Hevy features, polished

*3 Nov 2026 · `6314dcd`*

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
