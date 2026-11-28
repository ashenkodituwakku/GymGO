# How GymGO's words should read

The owner, 24 Nov 2026: the app's text read as AI-written and should sound
like a well-made consumer app. This is the house style for every word a
person sees: screens, buttons, empty states, errors, the Pro page, emails
and the server's messages. Both Claude sessions write new text this way.

## The voice

Plain, short and confident, like Apple's, Strava's or Hevy's own apps. Say
what a thing is or does, then stop.

- **Lead with the benefit or the action.** "Charts for every exercise", not
  "Charts per exercise: 1-rep max, heaviest, best set, volume, reps".
- **Most UI text is a fragment.** Feature lines, subtitles and table cells
  don't need full sentences. Keep a subtitle under about 12 words.
- **One idea per sentence.** Split long sentences rather than chaining them
  with colons, semicolons or "and".
- **Name features with nouns** ("Custom exercises", "Next-session targets"),
  and keep the name the same everywhere it appears.
- **Buttons start with a verb** and are one to three words: "Start workout",
  "Save", "Try again".
- **Errors say what happened and what to do**, in one or two short
  sentences, without blame: "Couldn't load workouts. Check your connection
  and try again."

## What makes text read as AI-written (avoid)

From research into common tells (Wikipedia's "Signs of AI writing" and
coverage of it, and lists of overused chatbot words), and from what GymGO's
own text did too often:

- **Colon chains**: "X: Y, and Z". Use a heading and a short line instead.
- **Contrasts**: "not X, but Y", "X, not Y", "never X, just Y".
- **Over-reassurance and absolutes**: "never", "just", "simply", "only",
  "exactly", "nothing", "always", unless the word carries a fact the person
  needs (a privacy promise, a real limit).
- **Narrating the machinery**: "the server checks…", "the app asks…",
  "re-read from Stripe". Say it only when trust or privacy needs it, in one
  plain sentence.
- **Over-precise quirks** that read as written by a model: "he remembers
  twice as much of the chat". Write "Longer conversations".
- **Personifying Verity.** Verity is "Verity" (or "it"), not "he".
- **Lists of exactly three by habit**, and every sentence the same length.
- **Stock words**: journey, seamless, unlock, elevate, delve, crucial,
  vital, robust, leverage, effortless, empower, dive in, game-changer,
  "whether you're…", "ready to…?", "here's…".
- **Exclamation marks and emoji** in UI text.

## What doesn't change

- **Facts.** Prices, limits, sources, dates and the owner's rules about
  venue facts stay exactly true: unknown isn't "no", a missing fee isn't $0,
  and every fact keeps its source and date. Rewording never makes a claim
  the app can't back up (Max doesn't use smarter models, so the copy
  doesn't say it does).
- **The legal pages** (packages/domain/src/legal.ts): the wording is the
  owner's to approve, with a new legal version.
- **Verity's greeting and "waiting to be set up" message**, and the
  BuildingBar, as the owner asked.
- **Spelling**: Australian English (colour, metres, kilograms).
- **Accessibility labels** follow the same voice, and still say everything
  a screen reader user needs.
