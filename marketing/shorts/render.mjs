#!/usr/bin/env node
/**
 * Renders GymGO's shorts the way the explainer-video skill asks: stills first
 * (the first frame, one from inside each scene, the end card and the last
 * frame), tiled into a contact sheet to check, then the MP4, then its real
 * spec read back from the file with the skill's probe script.
 *
 *   node render.mjs [WalkIn Build OnePlace] [--stills-only]
 *
 * Output in out/: <id>.mp4, stills/<id>-NN.png and <id>-sheet.png.
 * Set REMOTION_BROWSER to a Chrome Headless Shell already on the machine;
 * without it Remotion downloads its own the first time.
 */

import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const scripts = join(here, '..', '..', '.claude', 'skills', 'explainer-video', 'scripts');
const args = process.argv.slice(2);
const stillsOnly = args.includes('--stills-only');
const wanted = args.filter((arg) => !arg.startsWith('--'));
const ids = wanted.length ? wanted : ['WalkIn', 'Build', 'OnePlace'];
const browserExecutable = process.env.REMOTION_BROWSER || null;
const out = join(here, 'out');
mkdirSync(join(out, 'stills'), { recursive: true });

const sh = (command, list) => {
  const result = spawnSync(command, list, { cwd: here, encoding: 'utf8' });
  process.stdout.write(result.stdout ?? '');
  if (result.status !== 0) {
    process.stderr.write(result.stderr ?? '');
    throw new Error(`${command} failed`);
  }
};

console.log('Bundling…');
const serveUrl = await bundle({ entryPoint: join(here, 'src', 'index.ts') });

for (const id of ids) {
  const composition = await selectComposition({ serveUrl, id, browserExecutable });
  const script = composition.props;
  // The first frame, the middle of each scene (and its callout, once up), the end card settled, and the last frame.
  const frames = [0];
  let start = 0;
  for (const scene of script.scenes) {
    frames.push(start + Math.floor(scene.frames * 0.62));
    if (scene.callout) frames.push(start + scene.callout.at + 20);
    start += scene.frames;
  }
  frames.push(start + 30, composition.durationInFrames - 1);
  frames.sort((a, b) => a - b);

  const stills = [];
  for (const [n, frame] of frames.entries()) {
    const output = join(out, 'stills', `${id}-${String(n).padStart(2, '0')}.png`);
    await renderStill({ serveUrl, composition, frame, output, inputProps: script, browserExecutable });
    stills.push(output);
  }
  // Tiled small, for one look at the whole short.
  const small = stills.map((file) => file.replace(/\.png$/, '.small.png'));
  for (const [i, file] of stills.entries()) sh('ffmpeg', ['-y', '-loglevel', 'error', '-i', file, '-vf', 'scale=270:-1', small[i]]);
  sh('bash', [join(scripts, 'contact-sheet.sh'), join(out, `${id}-sheet.png`), ...small]);

  if (stillsOnly) continue;
  const file = join(out, `${id}.mp4`);
  console.log(`Rendering ${id} (${composition.durationInFrames} frames)…`);
  await renderMedia({ serveUrl, composition, codec: 'h264', crf: 18, pixelFormat: 'yuv420p', outputLocation: file, inputProps: script, browserExecutable });
  sh('bash', [join(scripts, 'probe-mp4.sh'), file, '1080x1920', '30']);
}
