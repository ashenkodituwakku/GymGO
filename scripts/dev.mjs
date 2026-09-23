#!/usr/bin/env node
/**
 * Start GymGO: the server (accounts, saved gyms, reviews, and the gym data)
 * and the app, together. The app opens in your browser, and Expo prints a QR
 * code for Expo Go on your phone. Ctrl+C stops both.
 *
 *   node scripts/dev.mjs               server + app, opens the browser
 *   node scripts/dev.mjs --no-browser  same, without opening a browser
 *   node scripts/dev.mjs --tunnel      reach the app from a phone on another network
 */

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const mobileDir = join(root, 'apps', 'mobile');
const serverDir = join(root, 'apps', 'server');

// Run both through this same Node, so nothing depends on a shell or on how
// pnpm was installed.
const server = spawn(process.execPath, ['--no-warnings=ExperimentalWarning', '--import', 'tsx', 'src/main.ts'], {
  cwd: serverDir,
  stdio: ['ignore', 'inherit', 'inherit'],
  env: process.env,
});
server.on('exit', (code) => {
  if (code && code !== 0) {
    console.log('[server] stopped. The app still works from its offline copy; sign-in and reviews need the server.');
  }
});

const expoCli = createRequire(join(mobileDir, 'package.json')).resolve('expo/bin/cli');
const expoArgs = ['start'];
if (!args.has('--no-browser')) expoArgs.push('--web');
if (args.has('--tunnel')) expoArgs.push('--tunnel');

const app = spawn(process.execPath, [expoCli, ...expoArgs], { cwd: mobileDir, stdio: 'inherit', env: process.env });

const stopAll = (code = 0) => {
  if (!server.killed) server.kill();
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
