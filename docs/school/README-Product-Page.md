# GymGO

**Find a gym you can walk into, then plan and log your workout there.**

GymGO is an app for iPhone, Android and your computer's web browser. Most gyms don't say whether a visitor can come in, what one visit costs or what equipment they have. GymGO shows what each gym *has* published, where it came from and when it was checked, says plainly what isn't known, and tells you what to ask when you call.

*Team: [Student A], [Student B], [Student C] · [Class] · [Date]*

---

## Features

**Finding a gym**

- Search by suburb, city or gym name, and see the gyms nearby on a map and in a list.
- Pick your visit time and budget, and the equipment you need.
- Each gym gets a verdict for your visit time: **Good to go**, **Call first** or **Not a fit**.
- Gym pages show the price of one visit, visitor and member hours, equipment and facilities, each with its source and the date it was checked. Anything not published says *Unknown*, with the questions to ask.
- Save gyms (10 on the free plan) and compare two side by side.
- About 3,000 real gyms: 23 in inner Melbourne researched from their own websites, plus others in Australia, the USA and Europe from OpenStreetMap.

**Training**

- **Build a workout:** tap the muscles you want on a body figure, pick a goal and a length, and get a plan with sets, reps and rest. Swap any exercise.
- **Log it:** enter the weight and reps, tick each set, and a rest timer starts.
- **Progress:** personal records, a weekly goal, weeks in a row, milestones and history.
- **Recovery map:** the muscles you've trained recently, shown on the body.
- Templates, multi-week programmes, a plate calculator and an interval timer.

**More**

- **Collection:** check in at a gym to collect its card.
- **GymPal:** an AI assistant for gym and training questions (once it has an API key).
- Light, dark or automatic appearance, with your choice of accent colour.
- An offline copy of gyms for when there's no signal.
- Friends, a monthly challenge and an optional leaderboard.

## Controls

| Where | How |
|---|---|
| Moving around | Four tabs at the bottom: **Home**, **Explore** (the map), **Saved** and **Profile**. **< Back** at the top left goes back. |
| Explore | Type in **Suburb, city or gym** and press Enter. Drag the panel up or down. Tap a pin to open that gym; tap a numbered pin to zoom in. **Filters** (the sliders button) sets time, budget and equipment. The arrow button finds gyms near you. |
| A gym's page | **Go** (directions), **Call**, **Website**; the bookmark saves it; the columns button adds it to Compare. Tap a row (Prices, Getting in, Equipment…) to open it. |
| Build a workout | Tap muscles on the body (switch front/back and Male/Female). Choose **Goal**, **Length** and **Machines**, then **Build my workout**. **Swap** changes one exercise; **Start workout** begins. |
| In a workout | Tap the weight and reps to type them; tap the circle to tick a set. **Finish** saves it. |
| GymPal | Tap the small tab on the edge of the screen (or swipe it in). On a computer, **Ctrl + /** opens it. |
| Keyboard (browser) | **Tab** moves between controls, **Enter** presses them, and the arrow keys move sliders. |
| Settings | **Profile → Appearance** for light/dark and colours; **Profile → Report a bug** to tell us about a problem. |

## How to run it

GymGO needs **Node.js 22.13 or newer** and an internet connection the first time, to install its packages (this takes a few minutes). Nothing needs to be paid for, and no API key is needed.

**On Windows (PowerShell):**

1. Install Node.js and Git: `winget install OpenJS.NodeJS.LTS Git.Git`, then open a new PowerShell window.
2. Allow scripts once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`
3. Unzip the project, open its folder in PowerShell (`cd` into it), and run: `.\scripts\gymgo.ps1 -Path "$PWD"`. Without `-Path`, the launcher looks in a `GymGO` folder in your user folder, and downloads a fresh copy there if there isn't one.
4. GymGO opens in your browser at **http://localhost:8081**. Press **Ctrl + C** to stop it.

**On a Mac or Linux:** from inside the project folder, run `npx pnpm@10 install`, then `npx pnpm@10 app`.

**On a phone:** install **Expo Go** (it must be the version that runs Expo SDK 58), join the same Wi-Fi as the computer, and scan the QR code shown in the terminal. If the phone can't connect, start it with `.\scripts\gymgo.ps1 -Path "$PWD" -Tunnel`.

**Trying GymGO Pro:** the launcher makes a test account on your own computer only. In the app, go to Profile → Sign in, then use email `dev@gymgo.test` and password `GymGO-dev-pro-2026`.

**Checking the code:** `npx pnpm@10 verify` runs the type checks, lint and all 1,219 automated tests.

## Known issues

- **Not yet tried on a real phone.** GymGO has been tested in the browser and with automated checks. The iPhone and Android versions build, but haven't been run on a phone.
- **Most gym details are unknown**, because gyms don't publish them, so many gyms say *Call first*. GymGO doesn't guess. Gyms from OpenStreetMap haven't been checked to be still open.
- **GymPal needs an API key** on the server. Until one is added, it only says it is being set up.
- **No payments.** GymGO Pro can only be tried with the local test account; real subscriptions aren't set up.
- **No App Store listing or home-screen widget**, because those need a paid Apple Developer membership. **Apple Health and Google Fit aren't connected**, because Expo Go can't use them.
- After a suburb search, the map's corner label shows the city (for example "Melbourne") rather than the suburb.
- In the browser's developer console, the map can print a warning ("Expected value to be of type number…"). It comes from the free map style itself, and doesn't affect GymGO.

## Credits

Map data © OpenStreetMap contributors (ODbL), with map tiles from OpenFreeMap and OpenMapTiles. Weather from MET Norway. Gym logos from Wikimedia Commons, where available. The body drawings come from react-native-body-highlighter (MIT). Every component and its licence is listed in `CREDITS.md`. No gym supplied information to or endorses GymGO.
