/**
 * One launch ad: GymGO's indigo, a "live now" pill, the scene's caption in a
 * creator's style (a sticker for the hook, then words that pop in one by one
 * with the key word on lime), a phone showing the real app, and the end card.
 * The music drops on the first real screen and every cut lands on a beat.
 * Every move is driven by the frame number alone (no timers, no randomness),
 * so any frame renders the same every time.
 */

import { AbsoluteFill, Audio, Easing, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import type { AdScript, Callout, Cam, CaptionStyle, Sfx } from './ads';
import { dropAt, sceneTotal } from './ads';
import { EndCard } from './EndCard';
import { BEAT, CALLOUT_MIDDLE, CALLOUT_WIDTH, FOCUS_Y, HEIGHT, POINT, WIDTH, beats, color, font, phone, phoneHeight, safe, screenHeight, type } from './theme';

const ease = Easing.bezier(0.22, 1, 0.36, 1);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Frames the camera takes to reach a new framing: quick, as an editor's punch-in. */
const MOVE = 10;
/** Frames two screens of the app cross-fade over (the app's own change, not a cut). */
const FADE = 3;

type Placed = { src: string; start: number; cam: Cam; scene: number };
type PlacedTap = { x: number; y: number; at: number };
type PlacedCaption = { lines: string[]; style: CaptionStyle; start: number; end: number; index: number };
type PlacedCallout = Callout & { start: number; end: number; index: number };
type PlacedSfx = Sfx & { start: number };
type Span = { start: number; end: number };

/** The script laid out on one timeline, in frames from the start. */
function layout(script: AdScript) {
  const shots: Placed[] = [];
  const taps: PlacedTap[] = [];
  const captions: PlacedCaption[] = [];
  const callouts: PlacedCallout[] = [];
  const sounds: PlacedSfx[] = [];
  const glows: Span[] = [];
  const sceneStarts: number[] = [];
  let start = 0;
  script.scenes.forEach((scene, index) => {
    const end = start + scene.frames;
    sceneStarts.push(start);
    captions.push({ lines: scene.caption, style: scene.style ?? 'caption', start, end, index });
    for (const shot of scene.shots) {
      const previous = shots[shots.length - 1];
      shots.push({ src: shot.src, start: start + shot.at, cam: shot.cam ?? previous?.cam ?? { s: 1 }, scene: index });
    }
    for (const tap of scene.taps ?? []) taps.push({ x: tap.x, y: tap.y, at: start + tap.at });
    if (scene.callout) callouts.push({ ...scene.callout, start: start + scene.callout.at, end, index });
    for (const sound of scene.sfx ?? []) sounds.push({ ...sound, start: start + sound.at });
    if (scene.glow) glows.push({ start, end });
    start = end;
  });
  return { shots, taps, captions, callouts, sounds, glows, sceneStarts };
}

/**
 * Where the phone sits for a framing. It grows from its top edge (every line
 * of the app stays whole, edge to edge), and rises only as far as it must to
 * bring the focus point to the middle of the canvas, never so far that its
 * foot shows.
 */
function framing(cam: Cam) {
  const s = cam.s;
  let top = phone.top;
  if (cam.focus !== undefined) top = Math.min(top, FOCUS_Y - s * (phone.bezel + cam.focus * POINT));
  top = Math.max(top, HEIGHT - s * phoneHeight);
  return { s, top };
}

export const Ad: React.FC<AdScript> = (script) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { shots, taps, captions, callouts, sounds, glows, sceneStarts } = layout(script);
  const scenesEnd = sceneTotal(script);
  const drop = dropAt(script);
  const ending = frame >= scenesEnd;

  // The shot showing now, and the one before it (still showing while this one fades in).
  let index = 0;
  for (let i = 0; i < shots.length; i++) if (shots[i]!.start <= frame) index = i;
  const current = shots[index]!;
  const previous = shots[index - 1];
  const since = frame - current.start;
  const fadeIn = previous && previous.src !== current.src && previous.scene === current.scene ? interpolate(since, [0, FADE], [0, 1], clamp) : 1;

  // The camera eases from the last framing to this one, with a punch on every cut between scenes.
  const from = framing(previous ? previous.cam : current.cam);
  const to = framing(current.cam);
  const t = previous ? interpolate(since, [0, MOVE], [0, 1], { ...clamp, easing: ease }) : 1;
  const sceneStart = [...sceneStarts].reverse().find((s) => s <= frame) ?? 0;
  const punch = frame >= drop && frame < scenesEnd ? 0.045 * Math.exp(-(frame - sceneStart) / 4) : 0;
  const cam = { s: mix(from.s, to.s, t) * (1 + punch), top: mix(from.top, to.top, t) };
  const lift = Math.max(0, phone.top - cam.top);

  // The phone comes up from below at the start, and drops away for the end card.
  const enter = spring({ frame: frame + 5, fps, config: { damping: 18, mass: 0.8 } });
  const out = interpolate(frame, [scenesEnd - 2, scenesEnd + 12], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });

  // A callout (a detail of the screen, enlarged), and how far in it is.
  const callout = callouts.find((item) => frame >= item.start && frame < item.end);
  const calloutIn = callout ? spring({ frame: frame - callout.start, fps, config: { damping: 14, mass: 0.7 } }) : 0;
  const calloutOut = callout ? interpolate(frame, [callout.end - 3, callout.end], [1, 0], clamp) : 0;

  const caption = captions.find((item) => frame >= item.start && frame < item.end);
  const glow = glows.find((span) => frame >= span.start - 4 && frame < span.end + 4);
  const glowAmount = glow ? interpolate(frame, [glow.start - 4, glow.start + 8, glow.end - 4, glow.end + 4], [0, 1, 1, 0], clamp) : 0;
  // The beat, felt: a soft pulse in the background on every kick once the music has dropped.
  const pulse = frame >= drop && frame < scenesEnd ? Math.exp(-((frame - drop) % BEAT) / 5) : 0;

  return (
    <AbsoluteFill style={{ fontFamily: font.family, color: color.ink, overflow: 'hidden' }}>
      <Background frame={frame} pulse={pulse} />
      {glowAmount > 0 && <Glow frame={frame} amount={glowAmount * (1 - out)} />}

      {/* The phone. */}
      <div
        style={{
          position: 'absolute',
          left: (WIDTH - phone.screenWidth) / 2 - phone.bezel,
          top: cam.top,
          width: phone.screenWidth + phone.bezel * 2,
          height: phoneHeight,
          borderRadius: phone.radius,
          background: color.bezel,
          padding: phone.bezel,
          boxShadow: '0 40px 90px rgba(12, 6, 60, 0.45), 0 0 0 3px rgba(255,255,255,0.08) inset',
          transformOrigin: '50% 0',
          transform: `perspective(2400px) translateY(${(1 - enter) * 520 + out * 1700}px) rotateX(${(1 - enter) * 16}deg) scale(${cam.s})`,
        }}
      >
        <div style={{ width: phone.screenWidth, height: screenHeight, borderRadius: phone.radius - phone.bezel, overflow: 'hidden', position: 'relative', background: '#F2F2F7' }}>
          {previous && fadeIn < 1 && <Screen src={previous.src} />}
          <Screen src={current.src} opacity={fadeIn} />
          {taps.map((tap) => (
            <TapRing key={`${tap.at}-${tap.x}-${tap.y}`} tap={tap} frame={frame} />
          ))}
          {/* While a callout shows, the rest of the screen steps back. */}
          <div style={{ position: 'absolute', inset: 0, background: color.bezel, opacity: 0.45 * calloutIn * calloutOut }} />
        </div>
      </div>

      {/* Keeps the caption readable where the phone has risen under it. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: 720,
          background: `linear-gradient(180deg, ${color.deep} 0%, ${color.deep} 56%, rgba(42, 26, 176, 0) 100%)`,
          opacity: interpolate(lift, [0, 140], [0, 1], clamp) * (1 - out),
        }}
      />

      {callout && calloutIn > 0 && <CalloutCard callout={callout} shown={calloutIn * calloutOut} />}

      <LivePill frame={frame} hidden={out} />
      {caption && !ending && <Caption caption={caption} frame={frame} />}

      {/* A flash where the beat drops, and where the end card lands. */}
      <Flash frame={frame} at={drop} strength={0.5} />
      <Flash frame={frame} at={scenesEnd} strength={0.7} />

      {frame >= scenesEnd - 2 && <EndCard frame={frame - scenesEnd} />}

      <Soundtrack script={script} drop={drop} scenesEnd={scenesEnd} sceneStarts={sceneStarts} taps={taps} sounds={sounds} />
    </AbsoluteFill>
  );
};

/** GymGO's indigo, the app icon's own gradient, with two slow lights that brighten on the beat. */
const Background: React.FC<{ frame: number; pulse: number }> = ({ frame, pulse }) => {
  const a = frame / 90;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${color.top} 0%, ${color.mid} 48%, ${color.deep} 100%)` }}>
      <div
        style={{
          position: 'absolute',
          width: 1100,
          height: 1100,
          left: -380 + Math.sin(a) * 90,
          top: -260 + Math.cos(a * 0.8) * 70,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(170, 180, 255, 0.55) 0%, rgba(170, 180, 255, 0) 65%)',
          opacity: 0.7 + 0.3 * pulse,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 1300,
          height: 1300,
          right: -520 + Math.cos(a * 0.7) * 110,
          bottom: -380 + Math.sin(a * 0.9) * 90,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(120, 90, 255, 0.6) 0%, rgba(120, 90, 255, 0) 62%)',
          opacity: 0.6 + 0.4 * pulse,
        }}
      />
    </AbsoluteFill>
  );
};

/** A gold glow and twinkles behind the phone, for the Legendary card. Around the app, never on it. */
const Glow: React.FC<{ frame: number; amount: number }> = ({ frame, amount }) => {
  const sparks = Array.from({ length: 16 }, (_, i) => {
    const angle = (i / 16) * Math.PI * 2 + 0.4;
    const radius = 470 + (i % 3) * 70;
    const twinkle = 0.5 + 0.5 * Math.sin(frame / 4 + i * 1.7);
    return { x: 540 + Math.cos(angle) * radius, y: 1060 + Math.sin(angle) * radius * 1.25, size: 22 + (i % 4) * 10, twinkle };
  });
  return (
    <AbsoluteFill style={{ opacity: amount }}>
      <div
        style={{
          position: 'absolute',
          left: 540 - 800,
          top: 1000 - 800,
          width: 1600,
          height: 1600,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(255, 210, 90, ${0.75 + 0.15 * Math.sin(frame / 6)}) 0%, rgba(255, 170, 60, 0.25) 35%, rgba(255, 170, 60, 0) 62%)`,
        }}
      />
      {sparks.map((spark, i) => (
        <svg key={i} width={spark.size} height={spark.size} viewBox="0 0 20 20" style={{ position: 'absolute', left: spark.x - spark.size / 2, top: spark.y - spark.size / 2, opacity: spark.twinkle, transform: `rotate(${frame * 2 + i * 20}deg)` }}>
          <path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" fill="#FFF3C4" />
        </svg>
      ))}
    </AbsoluteFill>
  );
};

/** "Live now", in the corner of the eye for the whole ad: what's new, and where. */
const LivePill: React.FC<{ frame: number; hidden: number }> = ({ frame, hidden }) => {
  // On from the first frame: that frame is the video's cover on TikTok.
  const shown = 1 - hidden;
  const blink = 0.55 + 0.45 * Math.cos((frame / BEAT) * Math.PI);
  return (
    <div style={{ position: 'absolute', top: safe.top + 6, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: shown }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '12px 26px 12px 22px',
          borderRadius: 999,
          background: 'rgba(16, 10, 60, 0.42)',
          border: '2px solid rgba(255, 255, 255, 0.18)',
          fontSize: 32,
          fontWeight: 800,
          letterSpacing: 0.4,
        }}
      >
        <div style={{ width: 18, height: 18, borderRadius: 9, background: color.live, opacity: blink, boxShadow: `0 0 16px ${color.live}` }} />
        <span>LIVE NOW</span>
        <span style={{ opacity: 0.6 }}>·</span>
        <span style={{ fontWeight: 700 }}>app.gymgo.site</span>
      </div>
    </div>
  );
};

type Word = { text: string; lime: boolean };
/**
 * "Real prices, *with the source*" -> the units that pop in: each plain word on
 * its own, and each starred phrase as one, so its highlight is one box.
 * Punctuation right after a word ("*time*.") stays with it.
 */
function words(line: string): Word[] {
  const out: Word[] = [];
  line.split('*').forEach((segment, i) => {
    const lime = i % 2 === 1;
    if (!segment.trim()) return;
    if (lime) {
      out.push({ text: segment.trim(), lime });
      return;
    }
    segment.split(' ').forEach((piece, j) => {
      if (!piece) return;
      const last = out[out.length - 1];
      if (j === 0 && last && !segment.startsWith(' ')) last.text += piece;
      else out.push({ text: piece, lime });
    });
  });
  return out;
}

/** About how wide a line sets, in ems of Inter Black (an emoji counts wider). */
const ems = (line: string) => [...line.replace(/\*/g, '')].reduce((sum, ch) => sum + (/\p{Extended_Pictographic}/u.test(ch) ? 1.15 : /[A-Z]/.test(ch) ? 0.68 : ch === ' ' ? 0.26 : 0.58), 0);
/** The caption's size: as given, or smaller until its longest line fits inside the safe width. */
const fit = (lines: string[], size: number, padding = 0) => Math.min(size, Math.floor((safe.right - safe.left - padding) / Math.max(...lines.map(ems))));

const Caption: React.FC<{ caption: PlacedCaption; frame: number }> = ({ caption, frame }) => {
  const { fps } = useVideoConfig();
  const age = frame - caption.start;
  const leave = interpolate(frame, [caption.end - 3, caption.end], [1, 0], clamp);

  if (caption.style === 'hook') {
    // A sticker, the way creators put the hook on screen: white, black type, a little tilted.
    const size = fit(caption.lines, type.hook.size, 80);
    const pop = spring({ frame: age + 4, fps, config: { damping: 11, mass: 0.6 } });
    return (
      <div style={{ position: 'absolute', top: safe.top + 110, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: leave }}>
        <div
          style={{
            padding: '26px 40px 30px',
            borderRadius: 34,
            background: '#FFFFFF',
            color: '#111018',
            fontSize: size,
            fontWeight: type.hook.weight,
            lineHeight: type.hook.line,
            letterSpacing: -1.5,
            textAlign: 'center',
            boxShadow: '0 22px 50px rgba(10, 4, 50, 0.45)',
            transform: `rotate(${-2.5 + Math.sin(frame / 9) * 0.6}deg) scale(${0.4 + 0.6 * pop})`,
            opacity: Math.min(1, pop * 2),
          }}
        >
          {caption.lines.map((line) => (
            <div key={line} style={{ whiteSpace: 'nowrap' }}>
              {words(line).map((word, i) => (
                <span key={i} style={{ color: word.lime ? color.mid : undefined }}>
                  {i > 0 ? ' ' : ''}
                  {word.text}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const slam = caption.style === 'slam';
  const size = fit(caption.lines, slam ? type.slam.size : type.caption.size, 20);
  let n = 0;
  return (
    <div
      style={{
        position: 'absolute',
        top: safe.top + (slam ? 150 : 104),
        left: safe.left - 30,
        right: WIDTH - safe.right - 30,
        textAlign: 'center',
        fontSize: size,
        fontWeight: type.caption.weight,
        lineHeight: type.caption.line,
        letterSpacing: -0.6,
        opacity: leave,
      }}
    >
      {caption.lines.map((line) => (
        <div key={line} style={{ whiteSpace: 'nowrap', marginBottom: 6 }}>
          {words(line).map((word, i) => {
            // Word by word, two frames apart (all at once for a slam), each popping in big and settling.
            const at = slam ? 0 : 1 + n++ * 2;
            const p = spring({ frame: age - at, fps, config: { damping: 12, mass: 0.5 } });
            const shown = interpolate(age - at, [0, 2], [0, 1], clamp);
            const grow = slam ? 1.7 - 0.7 * p : 1.35 - 0.35 * p;
            return (
              <span key={i} style={{ display: 'inline-block', opacity: shown, transform: `scale(${grow}) translateY(${(1 - p) * 18}px)`, margin: `0 ${size * 0.12}px` }}>
                {word.lime ? (
                  <span
                    style={{
                      display: 'inline-block',
                      padding: `0 ${size * 0.16}px 4px`,
                      borderRadius: size * 0.18,
                      background: color.lime,
                      color: color.limeInk,
                      transform: 'rotate(-2deg)',
                      boxShadow: '0 10px 26px rgba(10, 4, 50, 0.35)',
                    }}
                  >
                    {word.text}
                  </span>
                ) : (
                  <span style={{ WebkitTextStroke: `${size * 0.14}px #160F3C`, paintOrder: 'stroke fill', textShadow: '0 8px 24px rgba(10, 4, 50, 0.5)' }}>{word.text}</span>
                )}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/** A screen of the app exactly as shot. */
const Screen: React.FC<{ src: string; opacity?: number }> = ({ src, opacity = 1 }) => (
  <Img src={staticFile(`shots/${src}.png`)} style={{ position: 'absolute', left: 0, top: 0, width: phone.screenWidth, height: screenHeight, opacity }} />
);

/**
 * A detail of the screen, enlarged: a crop of the same real screenshot (its
 * own pixels, nothing redrawn), so a line too small to read on a phone in a
 * phone can be read.
 */
const CalloutCard: React.FC<{ callout: PlacedCallout; shown: number }> = ({ callout, shown }) => {
  const k = CALLOUT_WIDTH / callout.box.w;
  const height = callout.box.h * k;
  const tilt = callout.index % 2 ? 1.4 : -1.4;
  const rim = 7;
  return (
    <div
      style={{
        position: 'absolute',
        left: (WIDTH - CALLOUT_WIDTH) / 2 - rim,
        top: CALLOUT_MIDDLE - height / 2 - rim,
        width: CALLOUT_WIDTH + rim * 2,
        height: height + rim * 2,
        borderRadius: (callout.radius ?? 16) * k + rim,
        background: color.lime,
        padding: rim,
        boxShadow: '0 36px 80px rgba(10, 4, 50, 0.5)',
        opacity: Math.min(1, shown * 1.5),
        transform: `translateY(${(1 - shown) * 60}px) rotate(${tilt * shown}deg) scale(${0.8 + 0.2 * shown})`,
      }}
    >
      <div style={{ position: 'relative', width: CALLOUT_WIDTH, height, borderRadius: (callout.radius ?? 16) * k, overflow: 'hidden', background: '#FFFFFF' }}>
        <Img
          src={staticFile(`shots/${callout.src}.png`)}
          style={{ position: 'absolute', left: -callout.box.x * k, top: -callout.box.y * k, width: 390 * k, height: 844 * k, maxWidth: 'none' }}
        />
      </div>
    </div>
  );
};

/** Where a finger tapped: a dot that presses, and a ring that spreads and fades. */
const TapRing: React.FC<{ tap: PlacedTap; frame: number }> = ({ tap, frame }) => {
  const age = frame - tap.at;
  if (age < -2 || age > 18) return null;
  const press = interpolate(age, [-2, 2, 8], [0.5, 1, 1], { ...clamp, easing: ease });
  const dot = interpolate(age, [-2, 1, 10, 16], [0, 0.85, 0.85, 0], clamp);
  const spread = interpolate(age, [0, 16], [0.5, 1.8], { ...clamp, easing: ease });
  const ring = interpolate(age, [0, 4, 16], [0, 1, 0], clamp);
  const x = tap.x * POINT;
  const y = tap.y * POINT;
  return (
    <>
      <div style={{ position: 'absolute', left: x - 36, top: y - 36, width: 72, height: 72, borderRadius: 36, background: 'rgba(255, 255, 255, 0.55)', border: `5px solid ${color.limeInk}`, opacity: dot, transform: `scale(${press})` }} />
      <div style={{ position: 'absolute', left: x - 64, top: y - 64, width: 128, height: 128, borderRadius: 64, border: `6px solid ${color.lime}`, opacity: ring, transform: `scale(${spread})`, boxShadow: '0 0 0 3px rgba(22, 17, 46, 0.6)' }} />
    </>
  );
};

const Flash: React.FC<{ frame: number; at: number; strength: number }> = ({ frame, at, strength }) => {
  const o = interpolate(frame, [at, at + 1, at + 7], [0, strength, 0], clamp);
  return o > 0 ? <AbsoluteFill style={{ background: '#FFFFFF', opacity: o }} /> : null;
};

/**
 * The sound: GymGO's original track (music.py), a whoosh into every scene, a
 * pop as each caption lands, a tap where a finger taps, the app's own sounds
 * where the app plays them, and the end card's hit.
 */
const Soundtrack: React.FC<{ script: AdScript; drop: number; scenesEnd: number; sceneStarts: number[]; taps: PlacedTap[]; sounds: PlacedSfx[] }> = ({ drop, scenesEnd, sceneStarts, taps, sounds }) => {
  const groove = scenesEnd - drop - 3;
  const audio = (src: string) => staticFile(`audio/${src}`);
  return (
    <>
      {/* The intro's riser ends exactly where the beat drops. */}
      <Sequence from={0} durationInFrames={drop} layout="none">
        <Audio src={audio('intro.wav')} trimBefore={Math.max(0, beats(8) - drop)} volume={0.75} />
      </Sequence>
      <Sequence from={drop} durationInFrames={groove} layout="none">
        <Audio src={audio('groove.wav')} volume={(f) => interpolate(f, [0, groove - 6, groove], [0.8, 0.8, 0], clamp)} />
      </Sequence>
      <Sequence from={drop} durationInFrames={48} layout="none">
        <Audio src={audio('hit.wav')} volume={0.45} />
      </Sequence>
      {sceneStarts.slice(1).map((start) => (
        <Sequence key={`w${start}`} from={start - 5} durationInFrames={14} layout="none">
          <Audio src={audio('whoosh.wav')} volume={0.3} />
        </Sequence>
      ))}
      <Sequence from={scenesEnd - 6} durationInFrames={14} layout="none">
        <Audio src={audio('whoosh.wav')} volume={0.4} />
      </Sequence>
      {sceneStarts.map((start) => (
        <Sequence key={`p${start}`} from={start + 1} durationInFrames={6} layout="none">
          <Audio src={audio('pop.wav')} volume={0.22} />
        </Sequence>
      ))}
      {taps.map((tap) => (
        <Sequence key={`t${tap.at}`} from={tap.at} durationInFrames={4} layout="none">
          <Audio src={audio('tap.wav')} volume={0.5} />
        </Sequence>
      ))}
      {sounds.map((sound) => (
        <Sequence key={`s${sound.start}${sound.src}`} from={sound.start} layout="none">
          <Audio src={audio(sound.src)} volume={sound.volume ?? 0.8} />
        </Sequence>
      ))}
      <Sequence from={scenesEnd} layout="none">
        <Audio src={audio('end.wav')} volume={0.85} />
      </Sequence>
    </>
  );
};
