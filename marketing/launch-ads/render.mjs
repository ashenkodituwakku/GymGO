#!/usr/bin/env node
/**
 * Renders GymGO's launch ads: the app's own sounds copied in, stills first
 * (the first frame, a frame from inside each scene, the end card settled and
 * the last frame) tiled into a contact sheet to check, then the MP4, its
 * sound brought to TikTok's loudness (-14 LUFS, peaks under -1 dB), and its
 * real spec read back from the file.
 *
 *   node render.mjs [WalkIn Build Collect Launch] [--stills-only]
 *
 * Output in out/: <id>.mp4, stills/<id>-NN.png and <id>-sheet.png.
 * Set REMOTION_BROWSER to a Chrome Headless Shell already on the machine;
 * without it Remotion downloads its own the first time.
 */

import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const scripts = join(root, '.claude', 'skills', 'explainer-video', 'scripts');
const args = process.argv.slice(2);
const stillsOnly = args.includes('--stills-only');
const wanted = args.filter((arg) => !arg.startsWith('--'));
const ids = wanted.length ? wanted : ['WalkIn', 'Build', 'Collect', 'Launch'];
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
  return result;
};

// The music and effects (music.py), and the app's own sounds, made by GymGO's own script.
if (!existsSync(join(here, 'public', 'audio', 'groove.wav'))) sh('python3', ['music.py']);
const appSounds = join(root, 'apps', 'mobile', 'assets', 'sounds');
mkdirSync(join(here, 'public', 'audio', 'app'), { recursive: true });
for (const file of readdirSync(appSounds)) if (file.endsWith('.wav')) copyFileSync(join(appSounds, file), join(here, 'public', 'audio', 'app', file));

console.log('Bundling…');
const serveUrl = await bundle({ entryPoint: join(here, 'src', 'index.ts') });

for (const id of ids) {
  const composition = await selectComposition({ serveUrl, id, browserExecutable });
  const script = composition.props;
  // The first frame, two-thirds into each scene (a callout is up by then), the end card settled, and the last frame.
  const frames = [0];
  let start = 0;
  for (const scene of script.scenes) {
    frames.push(start + Math.floor(scene.frames * 0.66));
    start += scene.frames;
  }
  frames.push(start + 40, composition.durationInFrames - 1);

  const stills = [];
  for (const [n, frame] of frames.entries()) {
    const output = join(out, 'stills', `${id}-${String(n).padStart(2, '0')}.png`);
    await renderStill({ serveUrl, composition, frame, output, inputProps: script, browserExecutable });
    stills.push(output);
  }
  // Tiled small, for one look at the whole ad.
  const small = stills.map((file) => file.replace(/\.png$/, '.small.png'));
  for (const [i, file] of stills.entries()) sh('ffmpeg', ['-y', '-loglevel', 'error', '-i', file, '-vf', 'scale=270:-1', small[i]]);
  sh('bash', [join(scripts, 'contact-sheet.sh'), join(out, `${id}-sheet.png`), ...small]);

  if (stillsOnly) continue;
  const raw = join(out, `${id}.raw.mp4`);
  const file = join(out, `${id}.mp4`);
  console.log(`Rendering ${id} (${composition.durationInFrames} frames)…`);
  await renderMedia({ serveUrl, composition, codec: 'h264', crf: 17, pixelFormat: 'yuv420p', audioCodec: 'aac', outputLocation: raw, inputProps: script, browserExecutable });
  // TikTok plays everything at about -14 LUFS: mixed to that here, so the platform doesn't squash it.
  sh('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-c:v', 'copy', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=9', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', file]);
  renameSync(raw, join(out, 'stills', `${id}.raw.mp4`));
  sh('bash', [join(scripts, 'probe-mp4.sh'), file, '1080x1920', '30']);
}
