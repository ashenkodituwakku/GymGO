#!/usr/bin/env node
/**
 * GymGO online from this computer, free: the server, the web app it serves
 * itself, and a Cloudflare Tunnel that gives it a public https address, with
 * nothing to open on the router and no card. It's online while this window
 * is open and the computer is awake. Ctrl+C takes it offline.
 *
 *   node scripts/online.mjs            build the web app if GymGO changed, then go online
 *   node scripts/online.mjs --rebuild  build the web app again first, changed or not
 *
 * The Windows launcher runs it: gymgo -Online.
 *
 * The address:
 *  - Out of the box, a quick tunnel: Cloudflare hands out a random
 *    https://….trycloudflare.com address, new each time. No account needed.
 *  - Your own, the same every time (app.gymgo.site, say): make a tunnel in
 *    Cloudflare (Zero Trust → Networks → Tunnels), give it a public hostname
 *    pointing at http://localhost:4000, and put its token and that address in
 *    apps/server/.env.local as CLOUDFLARE_TUNNEL_TOKEN and GYMGO_PUBLIC_URL.
 *    README, "GymGO online from your PC", says how.
 *
 * With a public address the server never makes the ready-made Pro test
 * account, and switches off one made earlier (its password is published).
 * Needs cloudflared, Cloudflare's free tunnel program: the script says how to
 * install it if it's missing.
 */

import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mobileDir = join(root, 'apps', 'mobile');
const serverDir = join(root, 'apps', 'server');
const webDir = join(mobileDir, 'dist-online');
const stampFile = join(webDir, '.gymgo-build');
const PORT = 4000;
const args = new Set(process.argv.slice(2));
const cloudflared = process.env.GYMGO_CLOUDFLARED || 'cloudflared';

const step = (line) => console.log(`  >  ${line}`);
const done = (line) => console.log(`  OK ${line}`);
function stop(message, fix) {
  console.error(`\n  !! ${message}`);
  if (fix) console.error(`     ${fix}`);
  console.error('');
  process.exit(1);
}

// --- Settings ----------------------------------------------------------------
// Only the two this script needs; the server reads the rest of .env.local itself.
const envFile = join(serverDir, '.env.local');
const local = existsSync(envFile) ? parseEnv(readFileSync(envFile, 'utf8')) : {};
const token = (process.env.CLOUDFLARE_TUNNEL_TOKEN ?? local.CLOUDFLARE_TUNNEL_TOKEN ?? '').trim();
const fixedUrl = (process.env.GYMGO_PUBLIC_URL ?? local.GYMGO_PUBLIC_URL ?? '').trim().replace(/\/+$/, '');
if (token && !/^https:\/\/[^/]+$/.test(fixedUrl)) {
  stop('A tunnel token is set, but not the address it serves.', 'Add GYMGO_PUBLIC_URL=https://your-address to apps/server/.env.local (the public hostname you gave the tunnel).');
}

// --- cloudflared -------------------------------------------------------------
const version = spawnSync(cloudflared, ['--version'], { encoding: 'utf8' });
if (version.error || version.status !== 0) {
  const install =
    process.platform === 'win32'
      ? 'Install it with: winget install --id Cloudflare.cloudflared   (then open a new terminal)'
      : process.platform === 'darwin'
        ? 'Install it with: brew install cloudflared'
        : 'Install it from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/';
  stop('cloudflared, Cloudflare’s free tunnel program, isn’t installed.', install);
}
done(`cloudflared ${(version.stdout.match(/\d+\.\d+\.\d+/) ?? ['found'])[0]}`);

// --- Port --------------------------------------------------------------------
const free = await new Promise((resolve) => {
  const probe = createServer();
  probe.once('error', () => resolve(false));
  probe.listen(PORT, () => probe.close(() => resolve(true)));
});
if (!free) stop(`Something is already using port ${PORT}: probably GymGO itself.`, 'Stop the other GymGO window (Ctrl+C there), then try again.');

// --- The web app -------------------------------------------------------------
// Built once per version of GymGO: the same code needn't be built again.
const git = (...gitArgs) => spawnSync('git', ['-C', root, ...gitArgs], { encoding: 'utf8' }).stdout?.trim() ?? '';
// The commit, and any edits on top of it (what they say, not just which files), in the app and its packages.
const fingerprint = createHash('sha256')
  .update(git('rev-parse', 'HEAD'))
  .update(git('diff', 'HEAD', '--', 'apps/mobile', 'packages'))
  .update(git('status', '--porcelain', '--untracked-files=all', '--', 'apps/mobile', 'packages'))
  .digest('hex');
const built = existsSync(join(webDir, 'index.html')) && existsSync(stampFile) && readFileSync(stampFile, 'utf8') === fingerprint;
if (built && !args.has('--rebuild')) {
  done('Web app already built for this version');
} else {
  step('Building the web app (a few minutes the first time)');
  rmSync(webDir, { recursive: true, force: true });
  const expoCli = createRequire(join(mobileDir, 'package.json')).resolve('expo/bin/cli');
  const env = { ...process.env, EXPO_PUBLIC_API_URL: 'same-origin', CI: '1' };
  // The full app, not the limited website, and accounts as the app has them.
  delete env.EXPO_PUBLIC_LIMITED;
  delete env.EXPO_PUBLIC_ACCOUNT;
  const build = spawnSync(process.execPath, [expoCli, 'export', '--platform', 'web', '--output-dir', 'dist-online'], { cwd: mobileDir, stdio: 'inherit', env });
  if (build.status !== 0 || !existsSync(join(webDir, 'index.html'))) stop('Building the web app failed.', 'Scroll up for the error, then try: gymgo -Repair, and then -Online again.');
  mkdirSync(webDir, { recursive: true });
  writeFileSync(stampFile, fingerprint);
  done('Web app built');
}

// --- Tunnel ------------------------------------------------------------------
let stopping = false;
let tunnelLog = '';
step(token ? `Opening your Cloudflare tunnel (${fixedUrl})` : 'Opening a Cloudflare tunnel');
// The token goes by environment, not on the command line, where other programs could read it.
const tunnel = token
  ? spawn(cloudflared, ['tunnel', '--no-autoupdate', 'run'], { env: { ...process.env, TUNNEL_TOKEN: token }, stdio: ['ignore', 'pipe', 'pipe'] })
  : // 127.0.0.1, not localhost: on Windows localhost can mean the IPv6 address first, where the server isn't listening.
    spawn(cloudflared, ['tunnel', '--no-autoupdate', '--url', `http://127.0.0.1:${PORT}`], { stdio: ['ignore', 'pipe', 'pipe'] });
// What it says is kept (its last lines, for when something goes wrong), not shown: it's chatty.
let heard = () => undefined;
const listen = (chunk) => {
  tunnelLog = (tunnelLog + String(chunk)).slice(-4000);
  heard(String(chunk));
};
tunnel.stdout.on('data', listen);
tunnel.stderr.on('data', listen);
// Your own tunnel's address is known; a quick tunnel's is in what cloudflared says.
const url = token
  ? fixedUrl
  : await new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), 60_000);
      heard = (text) => {
        const found = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
        if (found) {
          clearTimeout(timer);
          resolve(found[0]);
        }
      };
      tunnel.once('exit', () => {
        clearTimeout(timer);
        resolve(null);
      });
    });
if (!url) {
  tunnel.kill();
  stop('Cloudflare didn’t open a tunnel.', `What cloudflared said last:\n${tunnelLog.trim().split('\n').slice(-6).join('\n')}`);
}
done(`Tunnel open: ${url}`);

// --- Server ------------------------------------------------------------------
const serverEnv = {
  ...process.env,
  PORT: String(PORT),
  GYMGO_PUBLIC_URL: url,
  GYMGO_WEB_DIR: webDir,
  // Everyone arrives through the tunnel: rate limits go by the address Cloudflare passes on.
  GYMGO_TRUST_PROXY: 'on',
  // Never the ready-made Pro account online (the server also refuses, having a public address).
  GYMGO_DEV_PRO: '',
};
delete serverEnv.CLOUDFLARE_TUNNEL_TOKEN;
step('Starting the GymGO server');
const server = spawn(process.execPath, ['--no-warnings=ExperimentalWarning', '--import', 'tsx', 'src/main.ts'], { cwd: serverDir, stdio: ['ignore', 'inherit', 'inherit'], env: serverEnv });

const stopAll = (code = 0) => {
  if (stopping) return;
  stopping = true;
  if (server.exitCode === null) server.kill();
  if (tunnel.exitCode === null) tunnel.kill();
  console.log('\n  GymGO is offline.\n');
  process.exit(code);
};
server.on('exit', (code) => {
  if (!stopping) {
    console.error('\n  !! The GymGO server stopped. Scroll up for why.');
    stopAll(code || 1);
  }
});
tunnel.on('exit', () => {
  if (!stopping) {
    console.error(`\n  !! The Cloudflare tunnel closed. What it said last:\n${tunnelLog.trim().split('\n').slice(-6).join('\n')}`);
    stopAll(1);
  }
});
process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));

// Ready once it answers.
for (let attempt = 0; attempt < 120 && !stopping; attempt += 1) {
  const ok = await fetch(`http://127.0.0.1:${PORT}/api/health`).then((response) => response.ok, () => false);
  if (ok) break;
  await new Promise((resolve) => setTimeout(resolve, 500));
}

console.log('');
console.log(`  GymGO is online at ${url}`);
console.log('');
console.log('  Anyone with that link can use GymGO while this window stays open');
console.log('  and this computer is awake. Ctrl+C takes it offline.');
if (!token) {
  console.log('  The address is new each time. For one that stays (app.gymgo.site, say),');
  console.log('  see README, "GymGO online from your PC".');
}
console.log('  Accounts, photos and workouts are kept on this computer.');
console.log('');
