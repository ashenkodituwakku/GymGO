// GymGO's sound effects, made from scratch: soft marimba and bell tones,
// warm chords and a little glitter, written as 24 kHz mono WAV files in
// assets/sounds/. Nothing is sampled or licensed, and the same run always
// writes the same files.
//
//   node scripts/make-sounds.mjs
//
// Soft on purpose: every note swells in over a few milliseconds instead of
// starting with a click, the brightest overtones die first, everything is
// rounded off above a few kHz, and a small room (a short reverb) gives the
// tails somewhere to go. Buttons make no sound at all (their haptic is
// enough); these are for the collection's moments, a new record, and the
// timers' cues.
//
// A card's reveal is two layers that always agree. Its rarity says how big:
// two notes for Common, up to a rising run, a warm chord and a shower of
// glitter for Legendary, all in C. Its gem says how it sounds: a short
// signature in the gem's own voice, on C major's pentatonic notes so it
// never clashes (a warm bell for Ruby, glass for Sapphire, a marimba trill
// for Emerald, and so on). Foil adds its own glitter on top.

import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 24000;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');

const NOTE = {
  C3: 130.81, C4: 261.63, G4: 392.0, A4: 440.0, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0, B5: 987.77,
  C6: 1046.5, D6: 1174.66, E6: 1318.51, G6: 1567.98, A6: 1760.0,
};

/** Small seeded random, so a run always writes the same glitter. */
function random(seed) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

const buffer = (seconds) => new Float32Array(Math.ceil(seconds * RATE));

/** A rounded swell from nothing to full over `attack` seconds: no click at the front. */
const swell = (t, attack) => (t >= attack ? 1 : 0.5 - 0.5 * Math.cos((Math.PI * t) / attack));

/**
 * A struck note: partials as [ratio, level, decay multiplier], each dying
 * away exponentially (the higher ones sooner), after a soft swell.
 */
function note(buf, at, freq, { amp = 0.5, attack = 0.006, decay = 0.3, partials = MARIMBA, length = decay * 6 } = {}) {
  const start = Math.floor(at * RATE);
  const count = Math.min(buf.length - start, Math.floor(length * RATE));
  for (let i = 0; i < count; i += 1) {
    const t = i / RATE;
    let sample = 0;
    for (const [ratio, level, fade] of partials) sample += level * Math.sin(2 * Math.PI * freq * ratio * t) * Math.exp(-t / (decay * fade));
    buf[start + i] += amp * swell(t, attack) * sample;
  }
}

/** A sine sliding from one pitch to another under a smooth arch. */
function glide(buf, at, from, to, seconds, { amp = 0.4 } = {}) {
  const start = Math.floor(at * RATE);
  const count = Math.min(buf.length - start, Math.floor(seconds * RATE));
  let phase = 0;
  for (let i = 0; i < count; i += 1) {
    const t = i / RATE;
    const freq = from * (to / from) ** (t / seconds);
    phase += (2 * Math.PI * freq) / RATE;
    buf[start + i] += amp * Math.sin((Math.PI * t) / seconds) ** 2 * (Math.sin(phase) + 0.12 * Math.sin(2 * phase));
  }
}

// Tone colours. A marimba bar: the fundamental, a soft fourth harmonic that
// fades fast, a trace of the tenth. A warm bell, with its overtones low. A
// glass, a little brighter, for the cards. A pad, for chords that bloom.
const MARIMBA = [[1, 1, 1], [4, 0.12, 0.2], [10, 0.025, 0.08]];
const BELL = [[1, 1, 1], [2, 0.28, 0.6], [3, 0.1, 0.42], [4.07, 0.04, 0.28]];
const GLASS = [[1, 1, 1], [2, 0.2, 0.6], [2.76, 0.12, 0.45], [5.4, 0.035, 0.25]];
const PAD = [1, 2, 3, 4].map((n) => [n, 1 / n ** 1.7, 1 - n * 0.08]);

/** A few tiny high pings, like light off foil: quiet, and never shrill. */
function glitter(buf, at, { count = 8, spread = 0.5, seed = 3, amp = 0.07, low = 1900, high = 4300 } = {}) {
  const rand = random(seed);
  for (let i = 0; i < count; i += 1) {
    const when = at + spread * (i / count) + rand() * (spread / count);
    note(buf, when, low + rand() * (high - low), {
      amp: amp * (0.55 + rand() * 0.45) * (1 - (i / count) * 0.5),
      attack: 0.003,
      decay: 0.08 + rand() * 0.06,
      partials: [[1, 1, 1], [2, 0.12, 0.5]],
    });
  }
}

/** A gentle low-pass: rounds off what's left above `hz`. */
function soften(buf, hz) {
  const a = 1 - Math.exp((-2 * Math.PI * hz) / RATE);
  let y = 0;
  for (let i = 0; i < buf.length; i += 1) {
    y += a * (buf[i] - y);
    buf[i] = y;
  }
  return buf;
}

/**
 * A small room: four damped comb filters side by side, then two all-passes
 * (the shape of Freeverb), mixed under the dry sound. Short and soft, so a
 * tail glows rather than echoes.
 */
function room(buf, { mix = 0.22, size = 0.72, damp = 0.45 } = {}) {
  const scale = RATE / 44100;
  const combs = [1116, 1188, 1277, 1356].map((n) => Math.round(n * scale * 0.8));
  const passes = [556, 225].map((n) => Math.round(n * scale));
  const wet = new Float32Array(buf.length);
  for (const length of combs) {
    const line = new Float32Array(length);
    let at = 0;
    let store = 0;
    for (let i = 0; i < buf.length; i += 1) {
      const out = line[at];
      store = out * (1 - damp) + store * damp;
      line[at] = buf[i] + store * size;
      at = (at + 1) % length;
      wet[i] += out / combs.length;
    }
  }
  for (const length of passes) {
    const line = new Float32Array(length);
    let at = 0;
    for (let i = 0; i < wet.length; i += 1) {
      const delayed = line[at];
      const input = wet[i];
      line[at] = input + delayed * 0.5;
      wet[i] = delayed - input * 0.5;
      at = (at + 1) % length;
    }
  }
  for (let i = 0; i < buf.length; i += 1) buf[i] = buf[i] * (1 - mix * 0.5) + wet[i] * mix * 2.2;
  return buf;
}

/** Peak at `peak`, gently rounded, with no click at either end. */
function finish(buf, peak = 0.7) {
  let max = 0;
  for (const sample of buf) max = Math.max(max, Math.abs(sample));
  const gain = max > 0 ? peak / max : 1;
  const tail = Math.floor(0.03 * RATE);
  for (let i = 0; i < buf.length; i += 1) {
    let sample = Math.tanh(buf[i] * gain * 1.05) / Math.tanh(1.05);
    if (i < 48) sample *= i / 48;
    if (i > buf.length - tail) sample *= (buf.length - i) / tail;
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

const run = (buf, at, notes, step, options) => notes.forEach((name, i) => note(buf, at + i * step, NOTE[name], options));

const SOUNDS = {
  // Checking where you are: an airy swell rising.
  scan() {
    const buf = buffer(0.7);
    glide(buf, 0, 330, 660, 0.5, { amp: 0.3 });
    glide(buf, 0, 333, 666, 0.5, { amp: 0.22 });
    return finish(room(soften(buf, 2600), { mix: 0.28 }), 0.55);
  },
  // "You're here!": a warm ding-ding.
  checkin() {
    const buf = buffer(1.3);
    note(buf, 0, NOTE.G5, { amp: 0.5, decay: 0.32, partials: BELL });
    note(buf, 0.12, NOTE.D6, { amp: 0.5, decay: 0.42, partials: BELL });
    return finish(room(soften(buf, 5200), { mix: 0.24 }), 0.66);
  },
  'card-common'() {
    const buf = buffer(1.2);
    note(buf, 0, NOTE.E5, { amp: 0.5, decay: 0.3, partials: GLASS });
    note(buf, 0.09, NOTE.B5, { amp: 0.48, decay: 0.36, partials: GLASS });
    return finish(room(soften(buf, 5500), { mix: 0.24 }), 0.62);
  },
  'card-uncommon'() {
    const buf = buffer(1.4);
    run(buf, 0, ['C5', 'E5', 'G5'], 0.08, { amp: 0.48, decay: 0.34, partials: GLASS });
    glitter(buf, 0.24, { count: 4, spread: 0.25, seed: 11 });
    return finish(room(soften(buf, 5500), { mix: 0.25 }), 0.66);
  },
  'card-rare'() {
    const buf = buffer(1.7);
    run(buf, 0, ['C5', 'E5', 'G5', 'C6'], 0.07, { amp: 0.46, decay: 0.38, partials: GLASS });
    glitter(buf, 0.27, { count: 7, spread: 0.45, seed: 21 });
    return finish(room(soften(buf, 5800), { mix: 0.26 }), 0.68);
  },
  'card-epic'() {
    const buf = buffer(2.2);
    note(buf, 0, NOTE.C4, { amp: 0.3, attack: 0.2, decay: 0.6, partials: PAD, length: 1.8 });
    run(buf, 0.12, ['C5', 'E5', 'G5', 'C6', 'E6'], 0.062, { amp: 0.42, decay: 0.4, partials: GLASS });
    note(buf, 0.45, NOTE.G5, { amp: 0.2, attack: 0.05, decay: 0.6, partials: PAD });
    glitter(buf, 0.42, { count: 10, spread: 0.6, seed: 31, amp: 0.075 });
    return finish(room(soften(buf, 6000), { mix: 0.28, size: 0.76 }), 0.7);
  },
  'card-legendary'() {
    const buf = buffer(3.0);
    note(buf, 0, NOTE.C4, { amp: 0.32, attack: 0.28, decay: 0.85, partials: PAD, length: 2.4 });
    note(buf, 0, NOTE.G4, { amp: 0.2, attack: 0.28, decay: 0.85, partials: PAD, length: 2.4 });
    run(buf, 0.15, ['C5', 'E5', 'G5', 'C6', 'E6', 'G6'], 0.058, { amp: 0.4, decay: 0.4, partials: GLASS });
    for (const name of ['C5', 'E5', 'G5', 'C6']) note(buf, 0.55, NOTE[name], { amp: 0.22, attack: 0.08, decay: 0.8, partials: PAD, length: 2.1 });
    note(buf, 0.55, NOTE.C6 * 2, { amp: 0.06, attack: 0.01, decay: 0.45, partials: BELL });
    glitter(buf, 0.5, { count: 16, spread: 1.1, seed: 41, amp: 0.08 });
    return finish(room(soften(buf, 6000), { mix: 0.3, size: 0.8 }), 0.74);
  },
  // A foil card: extra glitter, played over its rarity's sound.
  foil() {
    const buf = buffer(1.1);
    glitter(buf, 0, { count: 12, spread: 0.6, seed: 51, amp: 0.1, low: 2400, high: 5200 });
    return finish(room(soften(buf, 6500), { mix: 0.3 }), 0.42);
  },
  // Each gem's signature, played over its card's rarity sound as it turns.
  'gem-ruby'() {
    // Warm and deep: a low bell chord, rolled.
    const buf = buffer(1.4);
    for (const [i, name] of ['G4', 'C5', 'E5'].entries()) note(buf, i * 0.045, NOTE[name], { amp: 0.42, attack: 0.008, decay: 0.45, partials: BELL });
    return finish(room(soften(buf, 3600), { mix: 0.26 }), 0.62);
  },
  'gem-sapphire'() {
    // Cool and clear: two high glass notes, each a hair out of tune with itself, so they shimmer.
    const buf = buffer(1.4);
    for (const [at, name] of [[0, 'E6'], [0.11, 'G6']]) {
      note(buf, at, NOTE[name], { amp: 0.32, decay: 0.42, partials: GLASS });
      note(buf, at, NOTE[name] * 1.004, { amp: 0.24, decay: 0.42, partials: GLASS });
    }
    return finish(room(soften(buf, 7000), { mix: 0.34, size: 0.8 }), 0.58);
  },
  'gem-emerald'() {
    // Green and woody: a quick marimba trill up.
    const buf = buffer(1.0);
    run(buf, 0, ['C6', 'D6', 'E6', 'G6'], 0.048, { amp: 0.42, decay: 0.13 });
    return finish(room(soften(buf, 5000), { mix: 0.18 }), 0.6);
  },
  'gem-amethyst'() {
    // Mysterious: a soft open chord that swells in, with a glint on top.
    const buf = buffer(1.6);
    for (const name of ['C5', 'G5', 'D6']) note(buf, 0, NOTE[name], { amp: 0.3, attack: 0.12, decay: 0.55, partials: PAD, length: 1.4 });
    note(buf, 0.16, NOTE.A6, { amp: 0.08, attack: 0.01, decay: 0.3, partials: GLASS });
    return finish(room(soften(buf, 5200), { mix: 0.34, size: 0.8 }), 0.58);
  },
  'gem-topaz'() {
    // Golden and bright: bells tumbling up.
    const buf = buffer(1.2);
    run(buf, 0, ['G5', 'C6', 'E6', 'G6'], 0.05, { amp: 0.36, decay: 0.24, partials: BELL });
    return finish(room(soften(buf, 6500), { mix: 0.22 }), 0.6);
  },
  'gem-aquamarine'() {
    // Watery: three drops, each sliding up into its note.
    const buf = buffer(1.1);
    for (const [at, name] of [[0, 'D6'], [0.09, 'A5'], [0.18, 'E6']]) {
      glide(buf, at, NOTE[name] * 0.72, NOTE[name], 0.05, { amp: 0.3 });
      note(buf, at + 0.03, NOTE[name], { amp: 0.36, attack: 0.004, decay: 0.12, partials: [[1, 1, 1], [2, 0.08, 0.5]] });
    }
    return finish(room(soften(buf, 5500), { mix: 0.3 }), 0.58);
  },
  'gem-rose'() {
    // Sweet: a few notes of a music box.
    const buf = buffer(1.3);
    run(buf, 0, ['C6', 'E6', 'G6', 'E6'], 0.1, { amp: 0.36, attack: 0.003, decay: 0.3, partials: [[1, 1, 1], [3, 0.05, 0.3], [5.4, 0.035, 0.18]] });
    return finish(room(soften(buf, 6000), { mix: 0.26 }), 0.56);
  },
  'gem-onyx'() {
    // Dark and solid: a low gong with a soft thump under it.
    const buf = buffer(1.6);
    note(buf, 0, NOTE.C3, { amp: 0.4, attack: 0.006, decay: 0.09, partials: [[1, 1, 1]] });
    note(buf, 0.01, NOTE.C4, { amp: 0.44, attack: 0.012, decay: 0.6, partials: [[1, 1, 1], [1.48, 0.22, 0.6], [2, 0.18, 0.5], [2.76, 0.07, 0.35]] });
    note(buf, 0.06, NOTE.G4, { amp: 0.24, attack: 0.02, decay: 0.55, partials: BELL });
    return finish(room(soften(buf, 2600), { mix: 0.3 }), 0.64);
  },
  // A suburb or city set finished: a chord that blooms, with glitter.
  'set-complete'() {
    const buf = buffer(2.3);
    for (const [i, name] of ['C5', 'E5', 'G5', 'C6'].entries()) note(buf, i * 0.035, NOTE[name], { amp: 0.3, attack: 0.08, decay: 0.75, partials: PAD, length: 2.0 });
    run(buf, 0.05, ['C5', 'G5', 'C6'], 0.06, { amp: 0.3, decay: 0.3, partials: GLASS });
    glitter(buf, 0.2, { count: 12, spread: 0.9, seed: 61 });
    return finish(room(soften(buf, 5800), { mix: 0.28, size: 0.78 }), 0.7);
  },
  // A new personal record: three quick notes, then the chord.
  record() {
    const buf = buffer(2.1);
    for (const at of [0, 0.09, 0.18]) note(buf, at, NOTE.G5, { amp: 0.36, decay: 0.07, length: 0.2 });
    for (const name of ['C5', 'E5', 'G5', 'C6']) note(buf, 0.3, NOTE[name], { amp: 0.26, attack: 0.04, decay: 0.7, partials: PAD, length: 1.6 });
    note(buf, 0.3, NOTE.C6, { amp: 0.3, decay: 0.4, partials: BELL });
    glitter(buf, 0.34, { count: 10, spread: 0.7, seed: 71 });
    return finish(room(soften(buf, 5800), { mix: 0.26 }), 0.7);
  },
  // A rest over, while you're on the workout screen: a gentle bell.
  'rest-done'() {
    const buf = buffer(1.8);
    note(buf, 0, NOTE.A5, { amp: 0.5, decay: 0.5, partials: BELL });
    note(buf, 0.18, NOTE.E6, { amp: 0.3, decay: 0.45, partials: BELL });
    return finish(room(soften(buf, 5200), { mix: 0.24 }), 0.62);
  },
  // The interval timer: clear but soft, high for "go", lower for the count-down.
  'timer-go'() {
    const buf = buffer(0.55);
    note(buf, 0, NOTE.A5, { amp: 0.6, attack: 0.01, decay: 0.16, partials: [[1, 1, 1], [2, 0.14, 0.6]], length: 0.5 });
    return finish(room(soften(buf, 4500), { mix: 0.1 }), 0.62);
  },
  'timer-count'() {
    const buf = buffer(0.35);
    note(buf, 0, NOTE.D5, { amp: 0.6, attack: 0.01, decay: 0.09, partials: [[1, 1, 1], [2, 0.12, 0.6]], length: 0.3 });
    return finish(room(soften(buf, 4000), { mix: 0.08 }), 0.58);
  },
};

// How loud each plays, written into the file (browsers on an iPhone ignore
// a player's volume): the small ones quietly, the moments a little fuller,
// and nothing at full blast.
const GEM = 0.46;
const LEVEL = {
  scan: 0.24,
  foil: 0.6,
  'timer-count': 0.5,
  'timer-go': 0.55,
  'gem-ruby': GEM,
  'gem-sapphire': GEM,
  'gem-emerald': GEM,
  'gem-amethyst': GEM,
  'gem-topaz': GEM,
  'gem-aquamarine': GEM,
  'gem-rose': GEM,
  'gem-onyx': GEM,
};
// The rarity layer a touch under full, as its gem plays over it.
const FULL = 0.56;

mkdirSync(OUT, { recursive: true });
// Sounds no longer made go (buttons have none now).
for (const file of readdirSync(OUT)) if (file.endsWith('.wav') && !(file.slice(0, -4) in SOUNDS)) unlinkSync(join(OUT, file));
let bytes = 0;
for (const [name, make] of Object.entries(SOUNDS)) {
  const level = LEVEL[name] ?? FULL;
  const file = wav(make().map((sample) => sample * level));
  writeFileSync(join(OUT, `${name}.wav`), file);
  bytes += file.length;
}
console.log(`${Object.keys(SOUNDS).length} sounds, ${(bytes / 1024).toFixed(0)} KB, in ${OUT}`);
