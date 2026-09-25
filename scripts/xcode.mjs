#!/usr/bin/env node
/**
 * Make GymGO's Xcode project on a Mac and open it, ready to run on the
 * Simulator or your iPhone.
 *
 *   node scripts/xcode.mjs                 make the project (first time) and open Xcode
 *   node scripts/xcode.mjs --team ABCDE12345   sign with your team, so you needn't pick it in Xcode
 *   node scripts/xcode.mjs --clean         start the project again from scratch
 *   node scripts/xcode.mjs --no-open       make it, don't open Xcode
 *
 * The project (apps/mobile/ios) is generated from the app's config by
 * `expo prebuild` and isn't kept in git: run this again after updating
 * GymGO and it's remade when the config changed. Usually you start it
 * through `node scripts/dev.mjs --xcode`, which also starts the server and
 * the bundler the app loads its code from.
 *
 * Nothing here signs up for anything or costs money. Running on your own
 * iPhone needs only a free Apple ID in Xcode (a "Personal Team").
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { networkInterfaces, userInfo } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mobileDir = join(root, 'apps', 'mobile');
const iosDir = join(mobileDir, 'ios');
const STAMP = join(iosDir, '.gymgo-prebuild.json');
export const SERVER_PORT = 4000;

export class Stop extends Error {
  constructor(problem, fix) {
    super(problem);
    this.fix = fix;
  }
}

const ok = (command, args) => spawnSync(command, args, { stdio: 'ignore' }).status === 0;

/** "Jane.Doe" → "com.janedoe.gymgo": unique enough for a free team, and stable. */
export function defaultBundleId(name = userInfo().username) {
  const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const safe = /^[a-z]/.test(clean) ? clean : `u${clean}`;
  return `com.${safe.length > 1 ? safe : 'me'}.gymgo`;
}

/** This Mac's address on the Wi-Fi (or cable), where a phone can reach the server. */
export function lanAddress(interfaces = networkInterfaces()) {
  const candidates = Object.entries(interfaces).flatMap(([name, addresses]) =>
    (addresses ?? []).filter((address) => address.family === 'IPv4' && !address.internal).map((address) => ({ name, address: address.address })),
  );
  // en0 is the Wi-Fi on most Macs; then any other real network.
  const preferred = candidates.find((item) => item.name === 'en0') ?? candidates.find((item) => /^en\d/.test(item.name)) ?? candidates[0];
  return preferred?.address ?? null;
}

/** What the project is made from: remake it when any of these change. */
export function configFingerprint(bundleId = process.env.GYMGO_IOS_BUNDLE_ID || defaultBundleId(), team = process.env.GYMGO_APPLE_TEAM_ID || null) {
  const hash = createHash('sha256');
  for (const file of ['app.json', 'app.config.js', 'package.json']) hash.update(readFileSync(join(mobileDir, file)));
  hash.update(`${bundleId}|${team ?? ''}|${process.env.GYMGO_APPLE_SIGN_IN ?? ''}|${process.env.GYMGO_GOOGLE_CLIENT_ID_IOS ?? ''}`);
  return hash.digest('hex').slice(0, 16);
}

/** The same settings file the server reads, so Google and Apple sign-in are set up once for both. */
function loadServerSettings() {
  const file = join(root, 'apps', 'server', '.env.local');
  if (!existsSync(file)) return;
  const before = { ...process.env };
  process.loadEnvFile(file);
  Object.assign(process.env, before);
}

export function prepareXcode(options = {}) {
  loadServerSettings();
  const { clean = false, open = true, team = process.env.GYMGO_APPLE_TEAM_ID || null } = options;
  if (process.platform !== 'darwin') {
    throw new Stop('Xcode runs only on a Mac.', 'On Windows or Linux, use Expo Go on your phone instead: see README → Start GymGO.');
  }
  const developerDir = spawnSync('xcode-select', ['-p'], { encoding: 'utf8' }).stdout?.trim() ?? '';
  if (developerDir.includes('CommandLineTools') && existsSync('/Applications/Xcode.app')) {
    throw new Stop(
      'Xcode is installed, but the Mac is set to use only its command line tools.',
      'Point it at Xcode (it asks for your Mac password):\n      sudo xcode-select -s /Applications/Xcode.app/Contents/Developer',
    );
  }
  if (!ok('xcodebuild', ['-version'])) {
    throw new Stop(
      'Xcode is not installed, or not selected.',
      'Install Xcode from the App Store (free), open it once to finish installing, then run:\n      sudo xcode-select -s /Applications/Xcode.app/Contents/Developer',
    );
  }
  if (!ok('pod', ['--version'])) {
    throw new Stop('CocoaPods is not installed. Xcode needs it to fetch the app\'s native parts.', 'Install it with Homebrew (https://brew.sh):  brew install cocoapods');
  }

  const bundleId = process.env.GYMGO_IOS_BUNDLE_ID || defaultBundleId();
  const env = { ...process.env, GYMGO_IOS_BUNDLE_ID: bundleId, ...(team ? { GYMGO_APPLE_TEAM_ID: team } : {}) };
  const fingerprint = configFingerprint(bundleId, team);
  const stamp = existsSync(STAMP) ? JSON.parse(readFileSync(STAMP, 'utf8')) : null;
  const workspace = join(iosDir, 'GymGO.xcworkspace');

  if (clean || !existsSync(workspace) || stamp?.fingerprint !== fingerprint) {
    console.log(`  >  Making the Xcode project (app id ${bundleId}${team ? `, team ${team}` : ''}). The first time takes a few minutes.`);
    const expoCli = createRequire(join(mobileDir, 'package.json')).resolve('expo/bin/cli');
    const args = [expoCli, 'prebuild', '--platform', 'ios'];
    // Remaking an existing project starts it fresh, so nothing stale is left behind.
    if (existsSync(iosDir)) args.push('--clean');
    const made = spawnSync(process.execPath, args, { cwd: mobileDir, stdio: 'inherit', env: { ...env, CI: '1', LANG: env.LANG || 'en_US.UTF-8' } });
    // Prebuild fetches the native parts itself; if that was skipped or
    // stopped short, the workspace Xcode opens is missing, so fetch them here.
    if (made.status === 0 && !existsSync(workspace) && existsSync(join(iosDir, 'GymGO.xcodeproj'))) {
      console.log('  >  Fetching the native parts (pod install)');
      const pods = spawnSync('pod', ['install'], { cwd: iosDir, stdio: 'inherit', env: { ...env, LANG: env.LANG || 'en_US.UTF-8' } });
      if (pods.status !== 0) {
        throw new Stop(
          'CocoaPods couldn’t fetch the native parts.',
          'Update its list of parts and try again:\n      pod repo update && bash ~/GymGO/scripts/gymgo-mac.sh --xcode --clean',
        );
      }
    }
    if (made.status !== 0 || !existsSync(workspace)) {
      throw new Stop(
        'Making the Xcode project failed.',
        'Scroll up for the error. `bash ~/GymGO/scripts/gymgo-mac.sh --xcode --clean` starts it again from scratch; `--doctor` prints what to share.',
      );
    }
    writeFileSync(STAMP, JSON.stringify({ fingerprint, bundleId, team }, null, 2));
  } else {
    console.log('  OK The Xcode project is up to date.');
  }

  // A release build carries its code inside the app, so it can't ask the
  // bundler where the server is: it's told here, at build time. (A debug
  // build finds it on its own: the Mac it loaded its code from.)
  // And Xcode's own build steps run Node, but Xcode doesn't see Homebrew's
  // folders, so it's told exactly which Node: without this a build stops
  // with "node: command not found".
  const address = lanAddress();
  writeFileSync(
    join(iosDir, '.xcode.env.local'),
    [
      '# Written by scripts/xcode.mjs each time GymGO starts.',
      `export NODE_BINARY=${JSON.stringify(process.execPath)}`,
      ...(address ? [`export EXPO_PUBLIC_API_URL=http://${address}:${SERVER_PORT}`] : []),
      '',
    ].join('\n'),
  );

  if (open) {
    execFileSync('open', ['-a', 'Xcode', workspace]);
    console.log('  OK Opened GymGO in Xcode.');
  }
  return { bundleId, team, address, workspace };
}

export function xcodeSteps({ bundleId, team, address }) {
  return [
    '',
    '  In Xcode:',
    '    1. At the top, next to "GymGO", pick where to run it: an iPhone',
    '       Simulator, or your iPhone (plug it in with a cable the first time).',
    team
      ? `    2. Signing is set to team ${team}.`
      : '    2. Click the GymGO project on the left > Signing & Capabilities >\n       Team: pick your Apple ID ("Personal Team"). Add it in Xcode >\n       Settings > Accounts if it isn\'t there. It\'s free.',
    '    3. Press the Run button (or Cmd+R).',
    '',
    '  On your iPhone, the first time:',
    '    - Settings > Privacy & Security > Developer Mode: turn it on (the phone restarts).',
    '    - If it says "Untrusted Developer": Settings > General >',
    '      VPN & Device Management > your Apple ID > Trust.',
    '    - Allow GymGO to find devices on your local network when asked: that is',
    '      how it reaches the server on this Mac.',
    '',
    `  The app loads its code from this Mac, so keep this window open while you${address ? `\n  use it. The server is at http://${address}:${SERVER_PORT}; the iPhone needs the same Wi-Fi.` : ' use it.'}`,
    `  App id: ${bundleId} (set GYMGO_IOS_BUNDLE_ID to change it).`,
    '',
  ].join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const teamAt = args.indexOf('--team');
  try {
    const made = prepareXcode({
      clean: args.includes('--clean'),
      open: !args.includes('--no-open'),
      team: teamAt >= 0 ? args[teamAt + 1] : undefined,
    });
    console.log(xcodeSteps(made));
    console.log('  Start the server and the bundler with:  node scripts/dev.mjs --xcode\n');
  } catch (error) {
    if (!(error instanceof Stop)) throw error;
    console.error(`\n  X  ${error.message}\n     ${error.fix}\n`);
    process.exit(1);
  }
}
