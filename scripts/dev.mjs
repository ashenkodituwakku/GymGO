#!/usr/bin/env node
/**
 * Start GymGO: the server (accounts, saved gyms, reviews, and the gym data)
 * and the app, together. The app opens in your browser, and Expo prints a QR
 * code for Expo Go on your phone. Ctrl+C stops both.
 *
 *   node scripts/dev.mjs               server + app, opens the browser
 *   node scripts/dev.mjs --no-browser  same, without opening a browser
 *   node scripts/dev.mjs --tunnel      reach the app from a phone on another network
 *   node scripts/dev.mjs --xcode       on a Mac: make the Xcode project, open it, and
 *                                      serve the app's code to it (see scripts/xcode.mjs;
 *                                      also takes --team ABCDE12345 and --clean)
 *   node scripts/dev.mjs --auto-update keep this copy up to date while it runs: every
 *                                      three minutes, fetch GymGO's branch and move to it
 *                                      when nothing's been edited here. The app reloads
 *                                      itself; the server restarts; new dependencies are
 *                                      installed; a changed Xcode project is remade.
 */

import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const args = new Set(argv);
const mobileDir = join(root, 'apps', 'mobile');
const serverDir = join(root, 'apps', 'server');
const BRANCH = process.env.GYMGO_BRANCH || 'claude/friendly-johnson-9rzxrj';
const say = (line) => console.log(`\x1b[36m[update]\x1b[0m ${line}`);

// Xcode first, before anything else prints: making the project can take minutes.
let xcodeNotes = null;
let xcode = null;
let xcodeTeam;
if (args.has('--xcode')) {
  xcode = await import('./xcode.mjs');
  const teamAt = argv.indexOf('--team');
  xcodeTeam = teamAt >= 0 ? argv[teamAt + 1] : undefined;
  try {
    const made = xcode.prepareXcode({ clean: args.has('--clean'), team: xcodeTeam });
    xcodeNotes = xcode.xcodeSteps(made);
    // Sign in with Apple, when built in, is for this app id; the server checks tokens against it.
    if ((process.env.GYMGO_APPLE_SIGN_IN ?? '').toLowerCase() === 'on' && !process.env.GYMGO_APPLE_CLIENT_IDS) {
      process.env.GYMGO_APPLE_CLIENT_IDS = made.bundleId;
    }
  } catch (error) {
    if (!(error instanceof xcode.Stop)) throw error;
    console.error(`\n  X  ${error.message}\n     ${error.fix}\n`);
    process.exit(1);
  }
}

// Run both through this same Node, so nothing depends on a shell or on how
// pnpm was installed.
let server = null;
let stopping = false;
function startServer() {
  server = spawn(process.execPath, ['--no-warnings=ExperimentalWarning', '--import', 'tsx', 'src/main.ts'], {
    cwd: serverDir,
    stdio: ['ignore', 'inherit', 'inherit'],
    env: process.env,
  });
  const mine = server;
  mine.on('exit', (code) => {
    if (!stopping && mine === server && code && code !== 0) {
      console.log('[server] stopped. The app still works from its offline copy; sign-in and reviews need the server.');
    }
  });
}
function restartServer() {
  const old = server;
  server = null;
  if (old && old.exitCode === null) {
    old.once('exit', startServer);
    old.kill();
  } else {
    startServer();
  }
}
startServer();

const expoCli = createRequire(join(mobileDir, 'package.json')).resolve('expo/bin/cli');
const expoArgs = ['start'];
// With Xcode, the app on the iPhone is what you use, so no browser.
if (!args.has('--no-browser') && !args.has('--xcode')) expoArgs.push('--web');
if (args.has('--tunnel')) expoArgs.push('--tunnel');

if (xcodeNotes) console.log(xcodeNotes);
const app = spawn(process.execPath, [expoCli, ...expoArgs], { cwd: mobileDir, stdio: 'inherit', env: process.env });

// --- Keeping up to date ------------------------------------------------------------
const git = (...gitArgs) => spawnSync('git', ['-C', root, ...gitArgs], { encoding: 'utf8' });
let toldEdited = false;

function checkForUpdate() {
  if (git('fetch', '--quiet', 'origin', BRANCH).status !== 0) return; // offline: try again later
  const here = git('rev-parse', 'HEAD').stdout.trim();
  const there = git('rev-parse', `origin/${BRANCH}`).stdout.trim();
  if (!here || !there || here === there) return;
  if (git('merge-base', '--is-ancestor', here, there).status !== 0) return; // local commits: leave it alone
  if (git('status', '--porcelain').stdout.trim()) {
    if (!toldEdited) say('A newer GymGO is out, but files here have been edited, so it waits. Restart the launcher to update.');
    toldEdited = true;
    return;
  }
  const changed = git('diff', '--name-only', here, there).stdout.split('\n').filter(Boolean);
  const nativeBefore = xcode ? xcode.configFingerprint(undefined, xcodeTeam ?? process.env.GYMGO_APPLE_TEAM_ID ?? null) : null;
  if (git('merge', '--ff-only', '--quiet', `origin/${BRANCH}`).status !== 0) return;
  const subject = git('log', '-1', '--format=%s').stdout.trim();
  say(`Updated to ${there.slice(0, 7)}: ${subject}`);

  if (changed.includes('pnpm-lock.yaml')) {
    say('New dependencies: installing them…');
    const pnpm = (process.env.GYMGO_PNPM || 'npx --yes pnpm@10.33.0').split(' ');
    spawnSync(pnpm[0], [...pnpm.slice(1), 'install', '--frozen-lockfile'], { cwd: root, stdio: 'inherit' });
  }
  if (changed.some((file) => file.startsWith('apps/server/') || file.startsWith('packages/'))) {
    say('Restarting the server with the new code.');
    restartServer();
  }
  if (xcode && xcode.configFingerprint(undefined, xcodeTeam ?? process.env.GYMGO_APPLE_TEAM_ID ?? null) !== nativeBefore) {
    say('GymGO’s native parts changed: remaking the Xcode project…');
    try {
      xcode.prepareXcode({ open: false, team: xcodeTeam });
      say('Done. In Xcode, press Run (Cmd+R) to build the new version. If Xcode shows the old project, close it and reopen apps/mobile/ios/GymGO.xcworkspace.');
    } catch (error) {
      say(`Couldn’t remake the Xcode project: ${error.message} ${error.fix ?? ''}`);
    }
  } else if (changed.some((file) => file.startsWith('apps/mobile/') || file.startsWith('packages/'))) {
    say('The app reloads itself with the new code in a moment.');
  }
}

if (args.has('--auto-update')) {
  const every = Number(process.env.GYMGO_UPDATE_EVERY_MS) || 3 * 60_000;
  say(`On: checking for a newer GymGO every ${Math.round(every / 60_000) || 1} minutes (branch ${BRANCH}).`);
  setInterval(checkForUpdate, every).unref();
}

const stopAll = (code = 0) => {
  stopping = true;
  if (server && server.exitCode === null) server.kill();
  process.exit(code);
};
app.on('exit', (code) => stopAll(code ?? 0));
process.on('SIGINT', () => {
  app.kill('SIGINT');
  stopAll(0);
});
process.on('SIGTERM', () => {
  app.kill('SIGTERM');
  stopAll(0);
});
