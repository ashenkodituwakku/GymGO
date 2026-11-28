# GymGO shorts

Three vertical videos (1080 × 1920, 30 fps, about 20 seconds each) for
TikTok, Reels and Shorts. They show the full GymGO app, which is coming
soon, and end on what's out today: the limited version at gymgo.site.

| Short | Says | Length |
|---|---|---|
| `WalkIn` | Most gyms never say if you can walk in. GymGO finds them, shows prices with their source, and tells you what to ask when nothing's published | 23 s |
| `Build` | Tap the muscles you want, GymGO builds the workout, log a set and the rest timer starts | 24 s |
| `OnePlace` | Weeks in a row, strength going up, which muscles you've trained, a card for each gym you check in at | 20 s |

Every short ends on the same card: "The GymGO app is coming soon. Try the
limited version now: gymgo.site. Free in your browser · no account needed"
(the last line is the limited version's own description of itself).

They're made with the `explainer-video` skill in `.claude/skills/`: a script
of one-idea scenes, captions timed at about 2.3 words a second, stills
checked before the encode, and the file's real size and frame rate read back
afterwards.

## What's in a frame

- **The app:** screenshots of the full app (`capture.cjs`), shown exactly
  as shot. The camera moves the whole phone, never the picture inside it, so
  no line of the app is cut off at the sides.
- **Callouts:** where a line is too small to read on a phone in a phone (a
  price's source, the questions to ask, sets and reps, the rest timer), the
  same screenshot is cropped and shown bigger over the phone. It's the
  app's own pixels; nothing is redrawn.
- **Taps:** a ring where `capture.cjs` really tapped.
- **No sound.** There's no narration; the captions carry it, as most
  people watch muted. Add music from the platform's own licensed library
  when posting.

## The rules these follow

- Footage only from the full app. The limited website is advertised, not
  shown. A "GymGO app · coming soon" tag sits on every app frame.
- No gym shown by its brand: the gyms on screen are independents with no
  logo. The typed search isn't shown, as its suggestions include chains'
  logos.
- Only what the app shows. Every real search says "Call first" (no gym has
  published its visitor rules yet), so no short shows or claims "Good to
  go". Prices are shown with the source and date the app gives them.
- The training (workouts, records, check-ins, the name "Alex") is sample
  data in the local test account, not a real person's.

## Making them again

The videos aren't committed (`out/` is ignored); the source and these steps
make them.

1. Run the app and server locally (`pnpm app`) and sign in to the test
   account.
2. Capture the footage. It logs one workout to that account.

   ```bash
   cd marketing/shorts
   npm install
   GYMGO_TOKEN=<the gymgo.session.v1 value from the browser> node capture.cjs
   ```

3. Render. Stills and a contact sheet come first, in `out/`; look at them
   before the MP4s.

   ```bash
   node render.mjs --stills-only      # out/stills, out/<id>-sheet.png
   node render.mjs                    # out/<id>.mp4, checked as 1080x1920 at 30 fps
   npx remotion studio src/index.ts   # to scrub through them
   ```

   Set `REMOTION_BROWSER` to a Chrome Headless Shell already on the machine
   to skip Remotion's own download.

The scenes, captions, timings, camera and callouts are all data in
`src/script.ts`; `src/Root.tsx` holds every script to the caption rules (a
line at most 22 characters, two lines at most, a scene at least a second).

## Licences

Remotion is free for individuals, for-profit companies of up to three
employees and non-profits; a bigger company needs a Remotion Company License
(`node_modules/remotion/LICENSE.md`).
Inter (`public/fonts`) is under the SIL Open Font License 1.1
(`public/fonts/OFL.txt`). See `CREDITS.md`.
