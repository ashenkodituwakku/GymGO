#!/usr/bin/env python3
"""
The launch ads' music and sound effects, made from scratch: plain numpy
synthesis, no samples, no loops from anywhere, so nothing to license.

    python3 music.py            writes public/audio/*.wav

One tempo for everything, 120 BPM (a beat is 15 frames at 30 fps), so the
ads cut on the beat. Each ad plays:

  intro.wav   the hook, before the drop: a filtered pulse and a riser into it
  groove.wav  the groove, 32 bars (Am F C G), started on a beat at the drop
  end.wav     the end card: one hit, then the chord ringing out
  whoosh.wav, pop.wav, tap.wav, hit.wav   the effects

The app's own sounds (scan, check-in, the card reveals, a set done) are
copied from apps/mobile/assets/sounds by render.mjs: GymGO made them with a
script too (README, "Sounds").
"""

import os
import wave

import numpy as np

SR = 44100
BPM = 120
BEAT = 60 / BPM
BAR = 4 * BEAT
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public", "audio")
rng = np.random.default_rng(7)


def write(name, signal, peak=0.89):
    """Stereo or mono float signal to 16-bit WAV, peak-normalised."""
    if signal.ndim == 1:
        signal = np.stack([signal, signal], axis=1)
    top = np.max(np.abs(signal)) or 1.0
    data = (signal / top * peak * 32767).astype(np.int16)
    with wave.open(os.path.join(OUT, name), "wb") as file:
        file.setnchannels(2)
        file.setsampwidth(2)
        file.setframerate(SR)
        file.writeframes(data.tobytes())
    print(f"  {name}: {len(signal) / SR:.2f} s")


def t_(seconds):
    return np.arange(int(seconds * SR)) / SR


def hz(note):
    """MIDI note number to frequency."""
    return 440.0 * 2 ** ((note - 69) / 12)


def fft_filter(signal, low=None, high=None):
    """Brick-wall-ish band filter in the frequency domain, with soft edges."""
    spectrum = np.fft.rfft(signal)
    freqs = np.fft.rfftfreq(len(signal), 1 / SR)
    gain = np.ones_like(freqs)
    if low:
        gain *= 1 / (1 + (low / np.maximum(freqs, 1)) ** 4)
    if high:
        gain *= 1 / (1 + (freqs / high) ** 4)
    return np.fft.irfft(spectrum * gain, len(signal))


def place(track, sound, at):
    start = int(at * SR)
    end = min(len(track), start + len(sound))
    if start < len(track):
        track[start:end] += sound[: end - start]


def env(length, attack, decay):
    """Attack then exponential decay, over `length` seconds."""
    t = t_(length)
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-np.maximum(t - attack, 0) / decay)


# --- Voices ---------------------------------------------------------------------------

def kick():
    t = t_(0.42)
    pitch = 46 + 95 * np.exp(-t / 0.035)
    phase = 2 * np.pi * np.cumsum(pitch) / SR
    body = np.sin(phase) * np.exp(-t / 0.2)
    click = fft_filter(rng.standard_normal(len(t)), low=1500) * np.exp(-t / 0.004) * 0.35
    return np.tanh(1.6 * (body + click))


def clap():
    t = t_(0.35)
    noise = fft_filter(rng.standard_normal(len(t)), low=900, high=5200)
    shape = np.zeros(len(t))
    for offset in (0.0, 0.011, 0.022):
        shape += np.where(t >= offset, np.exp(-np.maximum(t - offset, 0) / (0.012 if offset < 0.02 else 0.13)), 0)
    return noise * shape * 0.4


def hat(open_=False):
    t = t_(0.25 if open_ else 0.06)
    noise = fft_filter(rng.standard_normal(len(t)), low=7000)
    return noise * np.exp(-t / (0.07 if open_ else 0.014)) * (0.32 if open_ else 0.22)


def additive_saw(freq, length, cutoff, detune_cents=(0,), phase_seed=0):
    """A band-limited saw (harmonics up to `cutoff`), detuned voices summed."""
    t = t_(length)
    out = np.zeros(len(t))
    local = np.random.default_rng(phase_seed)
    for cents in detune_cents:
        f = freq * 2 ** (cents / 1200)
        n = 1
        start = local.uniform(0, 2 * np.pi)
        while n * f < min(cutoff, SR / 2 - 500):
            rolloff = 1 / (1 + (n * f / cutoff) ** 2)
            out += np.sin(2 * np.pi * n * f * t + start * n) / n * rolloff
            n += 1
    return out / len(detune_cents)


def pluck_chord(notes, length):
    sound = sum(additive_saw(hz(n), length, cutoff=3200, detune_cents=(-9, 0, 9), phase_seed=n) for n in notes)
    return sound * env(length, 0.004, 0.16) * 0.55


def pad_chord(notes, length):
    sound = sum(additive_saw(hz(n), length, cutoff=1800, detune_cents=(-12, -4, 4, 12), phase_seed=n + 50) for n in notes)
    t = t_(length)
    shape = np.clip(t / 0.02, 0, 1) * np.exp(-t / 1.6)
    return sound * shape * 0.4


def bass_note(note, length):
    t = t_(length)
    body = additive_saw(hz(note), length, cutoff=520, phase_seed=note + 99) + 0.6 * np.sin(2 * np.pi * hz(note) * t)
    return body * env(length, 0.005, 0.18) * 0.55


def reverb(signal, seconds=1.4, mix=0.22):
    t = t_(seconds)
    ir = rng.standard_normal(len(t)) * np.exp(-t / (seconds / 5))
    ir = fft_filter(ir, low=200, high=7000)
    ir /= np.sqrt(np.sum(ir**2))
    n = len(signal) + len(ir)
    wet = np.fft.irfft(np.fft.rfft(signal, n) * np.fft.rfft(ir, n), n)[: len(signal)]
    return signal + mix * wet


# Am  F  C  G, in voicings that move little; bass roots an octave down.
CHORDS = [[57, 60, 64, 69], [57, 60, 65, 69], [55, 60, 64, 67], [55, 59, 62, 67]]
ROOTS = [45, 41, 48, 43]
# Where each bar's chord stab lands, in beats: the 1, the "and" of 2, the 4.
STABS = [0, 1.5, 3, 3.5]


def groove(bars=32):
    length = bars * BAR + 2.0
    drums = np.zeros(int(length * SR))
    music = np.zeros(int(length * SR))
    bass = np.zeros(int(length * SR))
    pump = np.ones(int(length * SR))
    k, c, h, ho = kick(), clap(), hat(), hat(True)
    duck = 1 - 0.65 * env(BEAT, 0.003, 0.11)
    for bar in range(bars):
        at = bar * BAR
        chord, root = CHORDS[bar % 4], ROOTS[bar % 4]
        for beat in range(4):
            place(drums, k, at + beat * BEAT)
            start = int((at + beat * BEAT) * SR)
            pump[start : start + len(duck)] = np.minimum(pump[start : start + len(duck)], duck[: len(pump) - start])
            place(drums, ho if beat % 2 else h, at + (beat + 0.5) * BEAT)
            for sixteenth in (0.25, 0.75):
                place(drums, h * 0.35, at + (beat + sixteenth) * BEAT)
        for beat in (1, 3):
            place(drums, c, at + beat * BEAT)
        for stab in STABS:
            place(music, pluck_chord(chord, 0.45), at + stab * BEAT)
        if bar % 4 == 0:
            place(music, pad_chord([n + 12 for n in chord[1:]], BAR * 4), at)
        # Off-beat bass, the house way: on every "and".
        for beat in range(4):
            place(bass, bass_note(root, 0.24), at + (beat + 0.5) * BEAT)
    music = reverb(music, mix=0.3)
    mix = drums * 0.9 + (music * 0.85 + bass) * pump
    return fade_out(mix[: int(bars * BAR * SR)], 0.01)


def fade_out(signal, seconds):
    n = int(seconds * SR)
    signal[-n:] *= np.linspace(1, 0, n)
    return signal


def riser(length):
    t = t_(length)
    noise = rng.standard_normal(len(t))
    # A sweep upward: blocks of noise, each filtered a little higher.
    out = np.zeros(len(t))
    block = 2048
    for start in range(0, len(t), block // 2):
        piece = noise[start : start + block]
        if len(piece) < 16:
            break
        frac = start / len(t)
        filtered = fft_filter(piece, low=300 + 2500 * frac, high=1200 + 9000 * frac) * np.hanning(len(piece))
        out[start : start + len(piece)] += filtered
    tone = np.sin(2 * np.pi * np.cumsum(220 + 660 * (t / length) ** 2) / SR) * 0.25
    return (out * 0.5 + tone) * (t / length) ** 2


def intro(beats=8):
    """The hook: a muffled kick and pad, the chords low-passed, and a riser into the drop."""
    length = beats * BEAT
    out = np.zeros(int(length * SR))
    k = fft_filter(kick(), high=300)
    for beat in range(beats):
        place(out, k * 0.8, beat * BEAT)
    pad = fft_filter(pad_chord(CHORDS[0], length), high=900) * 1.6
    place(out, pad, 0)
    place(out, riser(2 * BEAT) * 0.8, length - 2 * BEAT)
    return reverb(out, mix=0.2)


def end_card(seconds=5.0):
    out = np.zeros(int(seconds * SR))
    place(out, kick() * 1.2, 0)
    place(out, hit(), 0)
    place(out, clap(), 0)
    chord = [57, 60, 64, 69, 72]
    place(out, pad_chord(chord, seconds) * 1.6, 0)
    place(out, pluck_chord([n + 12 for n in chord], 1.2) * 1.2, 0)
    t = t_(seconds)
    sub = np.sin(2 * np.pi * hz(33) * t) * np.exp(-t / 0.9) * 0.6
    out += sub
    return fade_out(reverb(out, seconds=2.2, mix=0.35), 0.6)


def hit():
    t = t_(1.6)
    boom = np.sin(2 * np.pi * np.cumsum(38 + 70 * np.exp(-t / 0.08)) / SR) * np.exp(-t / 0.5)
    crash = fft_filter(rng.standard_normal(len(t)), low=3000) * np.exp(-t / 0.45) * 0.25
    return np.tanh(1.4 * (boom + crash))


def whoosh(length=0.42):
    t = t_(length)
    noise = rng.standard_normal(len(t))
    out = np.zeros(len(t))
    block = 1024
    for start in range(0, len(t), block // 2):
        piece = noise[start : start + block]
        if len(piece) < 16:
            break
        frac = start / len(t)
        centre = 500 + 5500 * np.sin(np.pi * frac)
        out[start : start + len(piece)] += fft_filter(piece, low=centre * 0.5, high=centre * 1.6) * np.hanning(len(piece))
    return out * np.sin(np.pi * t / length) ** 1.5


def pop():
    t = t_(0.09)
    f = 700 + 900 * (1 - np.exp(-t / 0.012))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(0.09, 0.002, 0.025)


def tap():
    t = t_(0.05)
    click = fft_filter(rng.standard_normal(len(t)), low=2000, high=9000) * np.exp(-t / 0.004)
    tone = np.sin(2 * np.pi * 1800 * t) * np.exp(-t / 0.012) * 0.4
    return click + tone


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    write("groove.wav", groove())
    write("intro.wav", intro())
    write("end.wav", end_card())
    write("hit.wav", hit())
    write("whoosh.wav", whoosh())
    write("pop.wav", pop())
    write("tap.wav", tap())
