/**
 * Whether the app's packages can all be found where Metro will look for
 * them. The launchers run it after installing: pnpm trusts its own record
 * of what it installed, so a link left half made (on Windows, a file held
 * open while an update installed, say) goes unnoticed until the app fails
 * to build with "Unable to resolve …".
 *
 * Checks each package the app lists, from the app's folder, and Expo from
 * React Native's own folder (Metro swaps in Expo's reload client from
 * there). Prints what's missing and exits 1, or exits 0 quietly.
 *
 *     node scripts/check-deps.mjs
 */

import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = join(root, 'apps', 'mobile');

/** The nearest `node_modules/<name>` from `dir` upwards, as Node and Metro look for it. */
function findUp(dir, name) {
  for (let at = dir; ; at = dirname(at)) {
    const candidate = join(at, 'node_modules', name, 'package.json');
    if (existsSync(candidate)) return candidate;
    if (dirname(at) === at) return null;
  }
}

const missing = [];
const { dependencies = {} } = JSON.parse(readFileSync(join(app, 'package.json'), 'utf8'));
for (const name of Object.keys(dependencies)) {
  // existsSync follows the link, so a link to a folder that's gone counts as missing.
  if (!findUp(app, name)) missing.push(name);
}

const reactNative = findUp(app, 'react-native');
if (reactNative && !findUp(dirname(realpathSync(reactNative)), 'expo')) missing.push('expo (as React Native finds it)');

if (missing.length) {
  console.log(`  Missing or half-installed: ${missing.join(', ')}`);
  process.exit(1);
}
