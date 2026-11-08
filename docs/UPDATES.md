# GymGO updates

Every update to GymGO, numbered from the first, newest first. An update is
one piece of work you asked for, shipped together. The commits it covers
are named by their short id, so `git show <id>` finds any of them; the
documentation commits that followed a change count with it.

Updates 1 to 64 were written up on 3 Nov 2026 from the project's history
(557 commits from 22 Sep 2026). From now on, each update adds the
next number here as part of the update itself.

## Update 126 · No greyed-out "Keep it"

*8 Nov 2026 · the commit "Monthly challenge: the change button only once you pick another target"*

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
