// GymGO's sound effects, made from scratch: bell-like tones, sparkles and
// pops, written as 32 kHz mono WAV files in assets/sounds/. Nothing is
// sampled or licensed, and the same run always writes the same files.
//
//   node scripts/make-sounds.mjs
//
// Each card rarity gets a richer reveal than the last: two notes for Common,
// up to a rising run, a chord and a shower of sparkles for Legendary. Foil
// adds its own sparkle on top.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 32000;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');

const NOTE = {
  C4: 261.63, G4: 392.0, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0, B5: 987.77,
  C6: 1046.5, D6: 1174.66, E6: 1318.51, G6: 1567.98, C7: 2093.0,
};

/** Small seeded random, so a run always writes the same sparkles. */
function random(seed) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

const buffer = (seconds) => new Float32Array(Math.ceil(seconds * RATE));

/**
 * A struck tone: partials as [ratio, amplitude, decay multiplier], each
 * dying away exponentially (higher ones faster), after a short attack.
 */
function tone(buf, at, freq, { amp = 0.5, attack = 0.004, decay = 0.35, partials = [[1, 1, 1]], length = decay * 6 } = {}) {
  const start = Math.floor(at * RATE);
  const count = Math.min(buf.length - start, Math.floor(length * RATE));
  for (let i = 0; i < count; i += 1) {
    const t = i / RATE;
    const rise = t < attack ? t / attack : 1;
    let sample = 0;
    for (const [ratio, level, fade] of partials) sample += level * Math.sin(2 * Math.PI * freq * ratio * t) * Math.exp(-t / (decay * fade));
    buf[start + i] += amp * rise * sample;
  }
}

/** A sine sliding from one pitch to another, rising and dying away. */
function glide(buf, at, from, to, seconds, { amp = 0.4, attack = 0.01 } = {}) {
  const start = Math.floor(at * RATE);
  const count = Math.min(buf.length - start, Math.floor(seconds * RATE));
  let phase = 0;
  for (let i = 0; i < count; i += 1) {
    const t = i / RATE;
    const freq = from * (to / from) ** (t / seconds);
    phase += (2 * Math.PI * freq) / RATE;
    const env = Math.min(1, t / attack) * Math.sin((Math.PI * t) / seconds) ** 0.6;
    buf[start + i] += amp * env * Math.sin(phase);
  }
}

/** A brief burst of bright noise: the click at the front of a tick. */
function click(buf, at, { amp = 0.25, seconds = 0.012, seed = 7 } = {}) {
  const rand = random(seed);
  const start = Math.floor(at * RATE);
  let last = 0;
  for (let i = 0; i < Math.floor(seconds * RATE) && start + i < buf.length; i += 1) {
    const noise = rand() * 2 - 1;
    const high = noise - last;
    last = noise;
    buf[start + i] += amp * high * (1 - i / (seconds * RATE));
  }
}

const BELL = [[1, 1, 1], [2, 0.42, 0.6], [3, 0.2, 0.45], [4.2, 0.1, 0.3]];
const CHIME = [[1, 1, 1], [2.76, 0.38, 0.55], [5.4, 0.16, 0.35], [8.93, 0.06, 0.2]];
const SOFT = [[1, 1, 1], [2, 0.25, 0.7], [3, 0.08, 0.5]];
const BRASS = [1, 2, 3, 4, 5, 6, 7].map((n) => [n, 1 / n ** 1.15, 1 - n * 0.06]);

/** A shower of tiny high pings, like light off foil. */
function sparkle(buf, at, { count = 10, spread = 0.5, seed = 3, amp = 0.12, low = 2600, high = 6200 } = {}) {
  const rand = random(seed);
  for (let i = 0; i < count; i += 1) {
    const when = at + spread * (i / count) + rand() * (spread / count);
    tone(buf, when, low + rand() * (high - low), { amp: amp * (0.6 + rand() * 0.4) * (1 - (i / count) * 0.5), decay: 0.07 + rand() * 0.05, partials: [[1, 1, 1], [2, 0.2, 0.5]] });
  }
}

/** A short, soft echo, for room. */
function echo(buf, { delay = 0.11, feedback = 0.24, mix = 0.28 } = {}) {
  const gap = Math.floor(delay * RATE);
  const wet = new Float32Array(buf.length);
  for (let i = 0; i < buf.length; i += 1) wet[i] = buf[i] + (i >= gap ? wet[i - gap] * feedback : 0);
  for (let i = 0; i < buf.length; i += 1) buf[i] = buf[i] * (1 - mix) + (i >= gap ? wet[i - gap] : 0) * mix + buf[i] * mix;
  return buf;
}

/** Peak at `peak`, gently rounded, with no click at either end. */
function finish(buf, peak = 0.7) {
  let max = 0;
  for (const sample of buf) max = Math.max(max, Math.abs(sample));
  const gain = max > 0 ? peak / max : 1;
  const fade = Math.floor(0.012 * RATE);
  for (let i = 0; i < buf.length; i += 1) {
    let sample = Math.tanh(buf[i] * gain * 1.1) / Math.tanh(1.1);
    if (i < 32) sample *= i / 32;
    if (i > buf.length - fade) sample *= (buf.length - i) / fade;
    buf[i] = sample;
  }
  return buf;
}

function wav(buf) {
  const data = Buffer.alloc(buf.length * 2);
  buf.forEach((sample, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32767), i * 2));
  const head = Buffer.alloc(44);
  head.write('RIFF', 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write('WAVE', 8);
  head.write('fmt ', 12);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(1, 22);
  head.writeUInt32LE(RATE, 24);
  head.writeUInt32LE(RATE * 2, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write('data', 36);
  head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}

const arpeggio = (buf, at, notes, step, options) => notes.forEach((note, i) => tone(buf, at + i * step, NOTE[note], options));

const SOUNDS = {
  // Everyday feedback, quiet, alongside each haptic: a choice changing.
  select() {
    const buf = buffer(0.05);
    glide(buf, 0, 1900, 1350, 0.03, { amp: 0.5, attack: 0.001 });
    return finish(buf, 0.35);
  },
  // Opening something: a soft tup.
  tap() {
    const buf = buffer(0.08);
    click(buf, 0, { amp: 0.1, seconds: 0.006, seed: 9 });
    glide(buf, 0, 950, 620, 0.045, { amp: 0.5, attack: 0.002 });
    return finish(buf, 0.4);
  },
  // Something kept or done: two quick notes up.
  success() {
    const buf = buffer(0.45);
    tone(buf, 0, NOTE.C6, { amp: 0.45, decay: 0.12, partials: BELL });
    tone(buf, 0.07, NOTE.G6, { amp: 0.45, decay: 0.18, partials: BELL });
    return finish(buf, 0.5);
  },
  // Something that couldn't be done: two soft notes down.
  warn() {
    const buf = buffer(0.4);
    tone(buf, 0, NOTE.E5, { amp: 0.45, decay: 0.1, partials: SOFT });
    tone(buf, 0.09, NOTE.C5, { amp: 0.45, decay: 0.14, partials: SOFT });
    return finish(buf, 0.45);
  },
  // A set ticked off in a workout: a small, crisp tock.
  tick() {
    const buf = buffer(0.12);
    click(buf, 0, { amp: 0.18 });
    glide(buf, 0, 1500, 950, 0.07, { amp: 0.5, attack: 0.002 });
    return finish(buf, 0.55);
  },
  // Saving a gym: a bubbly pop.
  save() {
    const buf = buffer(0.2);
    glide(buf, 0, 520, 1150, 0.09, { amp: 0.5, attack: 0.003 });
    tone(buf, 0.06, 1150, { amp: 0.18, decay: 0.05, partials: SOFT });
    return finish(buf, 0.55);
  },
  // Checking where you are: a soft rising sweep.
  scan() {
    const buf = buffer(0.45);
    glide(buf, 0, 380, 920, 0.4, { amp: 0.35, attack: 0.05 });
    return finish(buf, 0.4);
  },
  // "You're here!": ding-ding.
  checkin() {
    const buf = buffer(0.9);
    tone(buf, 0, NOTE.G5, { amp: 0.5, decay: 0.32, partials: BELL });
    tone(buf, 0.11, NOTE.D6, { amp: 0.55, decay: 0.4, partials: BELL });
    return finish(echo(buf), 0.65);
  },
  'card-common'() {
    const buf = buffer(0.9);
    tone(buf, 0, NOTE.E5, { amp: 0.5, decay: 0.3, partials: CHIME });
    tone(buf, 0.09, NOTE.B5, { amp: 0.5, decay: 0.38, partials: CHIME });
    return finish(echo(buf), 0.62);
  },
  'card-uncommon'() {
    const buf = buffer(1.1);
    arpeggio(buf, 0, ['C5', 'E5', 'G5'], 0.08, { amp: 0.48, decay: 0.36, partials: CHIME });
    sparkle(buf, 0.24, { count: 4, spread: 0.25, seed: 11, amp: 0.08 });
    return finish(echo(buf), 0.66);
  },
  'card-rare'() {
    const buf = buffer(1.4);
    arpeggio(buf, 0, ['C5', 'E5', 'G5', 'C6'], 0.07, { amp: 0.46, decay: 0.4, partials: CHIME });
    sparkle(buf, 0.27, { count: 8, spread: 0.45, seed: 21, amp: 0.1 });
    return finish(echo(buf), 0.7);
  },
  'card-epic'() {
    const buf = buffer(1.8);
    tone(buf, 0, NOTE.C4, { amp: 0.32, attack: 0.18, decay: 0.55, partials: SOFT, length: 1.6 });
    arpeggio(buf, 0.12, ['C5', 'E5', 'G5', 'C6', 'E6'], 0.062, { amp: 0.44, decay: 0.42, partials: CHIME });
    tone(buf, 0.45, NOTE.G5, { amp: 0.22, attack: 0.03, decay: 0.6, partials: SOFT });
    sparkle(buf, 0.42, { count: 12, spread: 0.6, seed: 31, amp: 0.11 });
    return finish(echo(buf, { feedback: 0.3 }), 0.74);
  },
  'card-legendary'() {
    const buf = buffer(2.6);
    tone(buf, 0, NOTE.C4, { amp: 0.36, attack: 0.25, decay: 0.8, partials: SOFT, length: 2.2 });
    tone(buf, 0, NOTE.G4, { amp: 0.22, attack: 0.25, decay: 0.8, partials: SOFT, length: 2.2 });
    arpeggio(buf, 0.15, ['C5', 'E5', 'G5', 'C6', 'E6', 'G6'], 0.058, { amp: 0.42, decay: 0.4, partials: CHIME });
    for (const note of ['C5', 'E5', 'G5', 'C6']) tone(buf, 0.55, NOTE[note], { amp: 0.26, attack: 0.02, decay: 0.75, partials: BRASS, length: 1.9 });
    tone(buf, 0.55, NOTE.C7, { amp: 0.12, decay: 0.5, partials: BELL });
    sparkle(buf, 0.5, { count: 22, spread: 1.1, seed: 41, amp: 0.12 });
    return finish(echo(buf, { feedback: 0.32 }), 0.78);
  },
  // A foil card: extra glitter, played over its rarity's sound.
  foil() {
    const buf = buffer(0.9);
    sparkle(buf, 0, { count: 16, spread: 0.6, seed: 51, amp: 0.14, low: 3200, high: 7200 });
    return finish(echo(buf, { delay: 0.07, feedback: 0.2 }), 0.5);
  },
  // A suburb or city set finished.
  'set-complete'() {
    const buf = buffer(2.0);
    for (const [i, note] of ['C5', 'E5', 'G5', 'C6'].entries()) tone(buf, i * 0.03, NOTE[note], { amp: 0.3, attack: 0.07, decay: 0.7, partials: BRASS, length: 1.8 });
    sparkle(buf, 0.2, { count: 14, spread: 0.9, seed: 61, amp: 0.1 });
    return finish(echo(buf, { feedback: 0.3 }), 0.72);
  },
  // A new personal record: a short fanfare.
  record() {
    const buf = buffer(1.8);
    for (const at of [0, 0.09, 0.18]) tone(buf, at, NOTE.G5, { amp: 0.32, attack: 0.012, decay: 0.07, partials: BRASS, length: 0.12 });
    for (const note of ['C6', 'E6', 'G6']) tone(buf, 0.3, NOTE[note], { amp: 0.28, attack: 0.02, decay: 0.6, partials: BRASS, length: 1.4 });
    sparkle(buf, 0.34, { count: 12, spread: 0.7, seed: 71, amp: 0.1 });
    return finish(echo(buf), 0.74);
  },
  // A workout finished: a warm chord.
  finish() {
    const buf = buffer(1.3);
    for (const [i, note] of ['F5', 'A5', 'C6'].entries()) tone(buf, i * 0.04, NOTE[note], { amp: 0.34, attack: 0.04, decay: 0.55, partials: SOFT, length: 1.2 });
    return finish(echo(buf), 0.66);
  },
  // A rest over, while you're on the workout screen: a gentle bell.
  'rest-done'() {
    const buf = buffer(1.6);
    tone(buf, 0, NOTE.A5, { amp: 0.5, decay: 0.55, partials: CHIME });
    tone(buf, 0.18, NOTE.E6, { amp: 0.3, decay: 0.5, partials: CHIME });
    return finish(echo(buf), 0.6);
  },
  // The interval timer: high for "go", low for the count-down.
  'timer-go'() {
    const buf = buffer(0.45);
    tone(buf, 0, 880, { amp: 0.6, decay: 0.15, partials: SOFT, length: 0.45 });
    return finish(buf, 0.6);
  },
  'timer-count'() {
    const buf = buffer(0.24);
    tone(buf, 0, 587, { amp: 0.6, decay: 0.08, partials: SOFT, length: 0.24 });
    return finish(buf, 0.55);
  },
};

// How loud each plays, written into the file (browsers on an iPhone ignore
// a player's volume): everyday feedback quietly, the moments fuller.
const LEVEL = { select: 0.16, tap: 0.22, success: 0.32, warn: 0.32, tick: 0.45, save: 0.45, scan: 0.3 };
const FULL = 0.7;

mkdirSync(OUT, { recursive: true });
let bytes = 0;
for (const [name, make] of Object.entries(SOUNDS)) {
  const level = LEVEL[name] ?? FULL;
  const file = wav(make().map((sample) => sample * level));
  writeFileSync(join(OUT, `${name}.wav`), file);
  bytes += file.length;
}
console.log(`${Object.keys(SOUNDS).length} sounds, ${(bytes / 1024).toFixed(0)} KB, in ${OUT}`);
