# GymGO launch ads

Four vertical ads (1080 × 1920, 30 fps, with sound) for TikTok, Reels and
Shorts, made for GymGO's public release. They show the app and end on the
same call to action: **GymGO is live now · app.gymgo.site · Free account ·
works in any browser.**

| Ad | Hook (first 2 s) | Says | Length |
|---|---|---|---|
| `WalkIn` | "POV: new city, need a gym today 😩" | Filters for your visit time and budget; most gyms never say if you can walk in; real prices with their source; when nothing's published, what to ask | 19 s |
| `Build` | "Walked into the gym with no plan? 🤔" | Tap the muscles, GymGO builds the workout, sets, reps and rest for each move, tick a set and the rest timer starts, every workout saved | 19 s |
| `Collect` | "Gym check-ins, but collectible 👀" | Tap I'm here, GymGO checks you're there, a new card, every visit rolls again, the Legendary foil, badges and sets | 19 s |
| `Launch` | "GymGO is finally here 🚨" | A one-second-a-feature montage: gyms, prices, what to ask, workouts, sets, streak, collection | 13 s |

## How they're made

The TikTok grammar, applied to the app's real screens:

- **A hook in the first frame.** A white sticker caption, already on screen
  at frame 0 (the frame TikTok shows before anyone taps).
- **One idea a scene, captions word by word.** Plain words pop in two frames
  apart; the one phrase that matters sits on lime. At most two lines, inside
  TikTok's safe area (clear of the tabs at the top, the buttons down the right
  and the caption along the bottom).
- **Cut on the beat.** An original 120 BPM track (`music.py`): the hook plays
  over a muffled intro with a riser, the beat drops (with a flash and a hit)
  on the first real screen, every scene change lands on a beat with a punch-in
  and a whoosh, and the music stops for one beat before the end card's hit.
- **The app's own sounds where the app plays them:** the check-in's scan, the
  "you're here" chime, the card's reveal in its rarity's sound, its gem's
  signature, the Legendary and foil sounds. GymGO made these with its own
  script (README, "Sounds"), so they're free to use.
- **Sound mixed for the platform:** brought to -14 LUFS with peaks under
  -1.5 dB, so TikTok doesn't turn it down or squash it.
- **An end card that holds still** for about three seconds, so a pause or a
  screenshot lands on the address.

## The rules these follow

The same as GymGO's other videos (`marketing/shorts`):

- **Footage only from the real app**, from a **free** account (not Pro and not
  the dev account), so nothing shown is behind a paywall the ad doesn't
  mention. Callouts are crops of the same screenshots, enlarged; nothing is
  redrawn. Taps are drawn where `capture.cjs` really tapped.
- **No chain's brand on screen.** The gyms opened are independents, and the
  map is framed so the chain at the top of its list near Fitzroy stays below
  the canvas. (Independents' own website icons do show on their cards, as in
  the app.)
- **Only what the app says.** Every search near Fitzroy says "none a sure
  thing at 3 pm", so no ad claims a gym is "good to go"; the price is shown
  with the source and date the app gives it. "Free account" is the sign-up
  screen's own wording; "Find a gym that fits your workout, budget and visit
  time" is the app's own description.
- **The training and the collection are sample data** in a local test account
  named "Alex" (`seed.mjs`), not a real person's. The cards' seeds were picked
  so the collection shows each rarity (one Legendary foil); a real collection
  rolls its own, and the ads don't claim odds. The check-in and its new card
  were real: checked in at the gym's own map position, the card rolled by the
  app.

## Making them again

The videos, screenshots and sound files aren't committed (`out/`,
`public/shots/` and `public/audio/` are ignored); these steps make them.

1. Run the app and its server locally (`pnpm app`), and make a free test
   account on that local server (not on app.gymgo.site), for example:

   ```bash
   curl -s -X POST http://localhost:8081/_gymgo/api/auth/signup -H 'content-type: application/json' -d '{"email":"alex@gymgo.test","password":"<any>","displayName":"Alex","birthMonth":"1996-04","acceptTerms":true}'
   ```

   The `token` in the answer is the session token below.

2. Give it sample training and a collection:

   ```bash
   cd apps/server
   GYMGO_TOKEN=<token> node --import tsx ../../marketing/launch-ads/seed.mjs
   ```

3. Capture the footage. It logs one workout and collects one gym (the first of
   `CHECK_IN` in `capture.cjs` that isn't collected yet).

   ```bash
   cd marketing/launch-ads
   npm ci
   GYMGO_TOKEN=<token> node capture.cjs
   ```

   `--only=walkin,build,collect,montage` reshoots just those parts.

4. Render. Stills and a contact sheet per ad come first, in `out/`; look at
   them before the MP4s. The music is made on the first render (`music.py`,
   numpy only).

   ```bash
   node render.mjs --stills-only       # out/stills, out/<id>-sheet.png
   node render.mjs                     # out/<id>.mp4, checked as 1080x1920 at 30 fps
   npx remotion studio src/index.ts    # to scrub through them
   ```

   Set `REMOTION_BROWSER` to a Chrome Headless Shell already on the machine
   to skip Remotion's own download.

The scenes, captions, timings, camera and callouts are all data in
`src/ads.ts`; `src/Root.tsx` holds every script to the caption rules (a hook
first, one or two lines a scene, a scene at least two beats).

## When posting

- **Caption ideas:** "GymGO is live 🎉 find a gym that fits your workout,
  budget and visit time. Free at app.gymgo.site", with #gym #gymtok
  #fitness #travelworkout.
- **Sound:** the track is original, so it's safe for ads. To ride a trending
  sound instead, lower the video's own sound in TikTok's editor and add one
  from TikTok's Commercial Music Library (a Business account can only use
  that library).
- **Text:** the captions are burned in, so skip TikTok's auto-captions or
  they'll double up.

## Tools considered

From [awesome-claude-video-skills](https://github.com/zhuyansen/awesome-claude-video-skills),
the ones closest to this job: `remotion-dev/skills` (build your own look in
Remotion), `heygen-com/hyperframes` (HTML + GSAP to MP4), `hamen/app-promo-reel`
(beat-synced 9:16 app promos), `leosssvip-dot/remotion-ad-video-skill` (an ad
from a URL) and `vincentsch/explainroo` (the fastest in that list's own test).
These ads stay on Remotion, which GymGO's shorts and the iart.ai skills in
`.claude/skills` already use, so there's one video toolchain in the repo; the
techniques above (beat-locked cuts, word-by-word captions, a hook frame) are
the ones those skills describe.

## Licences

Remotion is free for individuals, for-profit companies of up to three
employees and non-profits; a bigger company needs a Remotion Company License
(`node_modules/remotion/LICENSE.md`). Inter (`public/fonts`) is under the
SIL Open Font License 1.1 (`public/fonts/OFL.txt`). The music and effects are
made from scratch by `music.py`. See `CREDITS.md`.
