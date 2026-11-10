# GymGO

Find a gym you can walk into, then plan and log your workout there.

Team: Ashen, Liam · [Class] · [Date]

GymGO runs on iPhone, Android and in a web browser. Most gyms don't say whether a visitor can come in, what a visit costs or what equipment they have. GymGO shows what each gym has published and where it came from, marks the rest as unknown, and tells you what to ask when you call.

## Features

- Search by suburb, city or gym name, and see nearby gyms on a map and in a list.
- Set your visit time, budget and the equipment you need. Each gym gets a verdict: Good to go, Call first or Not a fit.
- Gym pages with prices, visitor and member hours and equipment, each with its source.
- Save gyms and compare two side by side.
- Build a workout by tapping muscles on a body diagram, then log each set with a rest timer.
- Personal records, a weekly goal, workout history, templates and programmes.
- Light and dark mode.

## Controls

| Where | How |
|---|---|
| Moving around | Tabs at the bottom: Home, Explore (the map), Saved and Profile. Back is at the top left. |
| Explore | Type a place in the search box and press Enter. Tap a pin to open a gym. The sliders button opens the filters. |
| Gym page | Go, Call and Website buttons. The bookmark saves the gym. |
| Build a workout | Tap muscles on the body, pick a goal and length, then Build my workout. |
| During a workout | Type the weight and reps, then tap the circle to tick the set. Finish saves it. |
| Keyboard (browser) | Tab moves between controls and Enter presses them. |

## How to run it

You need Node.js 22.13 or newer, and an internet connection the first time so it can install its packages (this takes a few minutes). Nothing costs money and no API key is needed.

On Windows (PowerShell):

1. Install Node.js and Git: `winget install OpenJS.NodeJS.LTS Git.Git`, then open a new PowerShell window.
2. Allow scripts once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`
3. Unzip the project, `cd` into its folder and run `.\scripts\gymgo.ps1 -Path "$PWD"`
4. GymGO opens at http://localhost:8081. Press Ctrl + C to stop it.

On a Mac or Linux, run `npx pnpm@10 install` and then `npx pnpm@10 app` inside the project folder.

On a phone, install Expo Go (the version for Expo SDK 58), join the same Wi-Fi as the computer and scan the QR code in the terminal.

To try GymGO Pro, sign in with the local test account: `dev@gymgo.test`, password `GymGO-dev-pro-2026`. It only exists on your own computer.

`npx pnpm@10 verify` runs the type checks and all 1,233 automated tests.

## Known issues

- Not tried on a real phone yet, only in the browser.
- Most gyms don't publish their details, so many say Call first.
- GymPal needs an API key on the server before it can answer.
- No payments or App Store listing, as those need paid accounts.

## Credits

Map data © OpenStreetMap contributors (ODbL), map tiles from OpenFreeMap, weather from MET Norway, and body drawings from react-native-body-highlighter (MIT). The full list is in `CREDITS.md`. No gym supplied information to or endorses GymGO.
