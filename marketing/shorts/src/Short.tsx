/**
 * One short: GymGO's indigo, a small "GymGO app · coming soon" tag, the
 * scene's caption, and a phone showing the real app (public/shots), then the
 * end card. Every move is driven by the frame number alone (no timers, no
 * randomness), so any frame renders the same every time.
 */

import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { EndCard } from './EndCard';
import type { Callout, ShortScript, Zoom } from './script';
import { sceneTotal } from './script';
import { CUT, LEAVE, POINT, color, ease, phone, safe, screenHeight, type } from './theme';

/** The phone's own top edge (its bezel), before any camera move. */
const PHONE_TOP = phone.top - phone.bezel;
/**
 * The camera never brings the focus point lower than this on the canvas: below
 * it is where each platform lays its own caption and buttons over the video.
 */
const FOCUS_LINE = 1300;
/** The most the phone rises: any more and its top would meet the caption. */
const MOST_LIFT = 96;
/** Frames the camera takes to move to a new shot's framing. */
const MOVE = 16;
/** How wide a callout is drawn on the canvas. */
const CALLOUT_WIDTH = 936;
/** Where a callout's middle sits on the canvas: over the phone, clear of the platforms' overlays. */
const CALLOUT_MIDDLE = 1120;

type Placed = { src: string; start: number; zoom: Zoom; lift: number };
type PlacedTap = { x: number; y: number; at: number };
type PlacedCaption = { lines: string[]; start: number; end: number };
type PlacedCallout = Callout & { start: number; end: number };

/** The script laid out on one timeline, in frames from the start. */
function layout(script: ShortScript) {
  const shots: Placed[] = [];
  const taps: PlacedTap[] = [];
  const captions: PlacedCaption[] = [];
  const callouts: PlacedCallout[] = [];
  let start = 0;
  for (const scene of script.scenes) {
    const end = start + scene.frames;
    captions.push({ lines: scene.caption, start, end });
    for (const shot of scene.shots) {
      const previous = shots[shots.length - 1];
      shots.push({ src: shot.src, start: start + shot.from, zoom: shot.zoom ?? previous?.zoom ?? { scale: 1, y: 0 }, lift: shot.lift ?? 0 });
    }
    for (const tap of scene.taps ?? []) taps.push({ x: tap.x, y: tap.y, at: start + tap.at });
    if (scene.callout) callouts.push({ ...scene.callout, start: start + scene.callout.at, end });
    start += scene.frames;
  }
  return { shots, taps, captions, callouts };
}

/**
 * The camera for a framing. It moves the whole phone, never the picture inside
 * it: the phone grows from its top edge (every line of the app stays whole,
 * edge to edge) and rises just enough to keep the focus point above the
 * platforms' overlays, or by the shot's own lift, whichever is more.
 */
function camera(zoom: Zoom, lift: number) {
  const s = zoom.scale;
  const focus = PHONE_TOP + s * (phone.bezel + zoom.y * POINT);
  return { s, rise: Math.min(MOST_LIFT, Math.max(lift, focus - FOCUS_LINE, 0)) };
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export const Short: React.FC<ShortScript> = (script) => {
  const frame = useCurrentFrame();
  const { shots, taps, captions, callouts } = layout(script);
  const scenesEnd = sceneTotal(script);

  // The shot showing now, and the one before it (still showing while this one fades in).
  let index = 0;
  for (let i = 0; i < shots.length; i++) if (shots[i]!.start <= frame) index = i;
  const current = shots[index]!;
  const previous = shots[index - 1];
  const since = frame - current.start;
  const fadeIn = previous && previous.src !== current.src ? interpolate(since, [0, CUT], [0, 1], { extrapolateRight: 'clamp', easing: ease }) : 1;

  // The camera eases from the last framing to this one.
  const from = previous ? camera(previous.zoom, previous.lift) : camera(current.zoom, current.lift);
  const to = camera(current.zoom, current.lift);
  const t = previous ? interpolate(since, [0, MOVE], [0, 1], { extrapolateRight: 'clamp', easing: ease }) : 1;
  const cam = { s: mix(from.s, to.s, t), rise: mix(from.rise, to.rise, t) };

  // A callout (a detail of the screen, enlarged), and how far in it is.
  const callout = callouts.find((item) => frame >= item.start && frame < item.end);
  const calloutIn = callout
    ? interpolate(frame - callout.start, [0, 12], [0, 1], { extrapolateRight: 'clamp', easing: ease }) *
      interpolate(frame, [callout.end - LEAVE, callout.end], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0;

  // At the end card the phone goes down and away, and the tag with it.
  const out = interpolate(frame, [scenesEnd - 2, scenesEnd + 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
  const enter = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp', easing: ease });

  const caption = captions.find((item) => frame >= item.start && frame < item.end);

  return (
    <AbsoluteFill style={{ background: color.ground, fontFamily: type.family, color: color.ink }}>
      {/* The tag: what the footage is, so nobody looks for it on the website yet. */}
      <div
        style={{
          position: 'absolute',
          top: safe.top,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          opacity: enter * (1 - out),
        }}
      >
        <div
          style={{
            padding: '12px 28px',
            borderRadius: 999,
            background: color.chip,
            fontSize: type.chip.size,
            fontWeight: type.chip.weight,
            letterSpacing: 0.2,
          }}
        >
          GymGO app · coming soon
        </div>
      </div>

      {caption && frame < scenesEnd && <Caption lines={caption.lines} start={caption.start} end={caption.end} frame={frame} />}

      {/* The phone. */}
      <div
        style={{
          position: 'absolute',
          left: (1080 - phone.screenWidth) / 2 - phone.bezel,
          top: PHONE_TOP,
          width: phone.screenWidth + phone.bezel * 2,
          height: screenHeight + phone.bezel * 2,
          borderRadius: phone.radius,
          background: color.bezel,
          padding: phone.bezel,
          boxShadow: '0 28px 60px rgba(20, 16, 80, 0.28)',
          transformOrigin: '50% 0',
          transform: `translateY(${(1 - enter) * 120 - cam.rise + out * 1500}px) scale(${cam.s})`,
        }}
      >
        <div
          style={{
            width: phone.screenWidth,
            height: screenHeight,
            borderRadius: phone.radius - phone.bezel,
            overflow: 'hidden',
            position: 'relative',
            background: '#F2F2F7',
          }}
        >
          {previous && fadeIn < 1 && <Screen src={previous.src} />}
          <Screen src={current.src} opacity={fadeIn} />
          {taps.map((tap) => (
            <TapRing key={`${tap.at}-${tap.x}-${tap.y}`} tap={tap} frame={frame} />
          ))}
          {/* While a callout shows, the rest of the screen steps back a little. */}
          <div style={{ position: 'absolute', inset: 0, background: color.bezel, opacity: 0.32 * calloutIn }} />
        </div>
      </div>

      {callout && calloutIn > 0 && <CalloutCard callout={callout} shown={calloutIn} />}

      {frame >= scenesEnd - 2 && <EndCard frame={frame - scenesEnd} />}
    </AbsoluteFill>
  );
};

/** A screen of the app exactly as shot. */
const Screen: React.FC<{ src: string; opacity?: number }> = ({ src, opacity = 1 }) => (
  <Img
    src={staticFile(`shots/${src}.png`)}
    style={{ position: 'absolute', left: 0, top: 0, width: phone.screenWidth, height: screenHeight, opacity }}
  />
);

/**
 * A detail of the screen, enlarged: a crop of the same real screenshot (its
 * own pixels, nothing redrawn), so a line too small to read on a phone in a
 * phone can be read.
 */
const CalloutCard: React.FC<{ callout: Callout; shown: number }> = ({ callout, shown }) => {
  const k = CALLOUT_WIDTH / callout.w;
  const height = callout.h * k;
  return (
    <div
      style={{
        position: 'absolute',
        left: (1080 - CALLOUT_WIDTH) / 2,
        top: CALLOUT_MIDDLE - height / 2,
        width: CALLOUT_WIDTH,
        height,
        borderRadius: (callout.radius ?? 16) * k,
        overflow: 'hidden',
        background: '#FFFFFF',
        boxShadow: '0 30px 70px rgba(20, 16, 80, 0.38)',
        opacity: shown,
        transform: `translateY(${(1 - shown) * 40}px) scale(${0.94 + 0.06 * shown})`,
      }}
    >
      <Img
        src={staticFile(`shots/${callout.src}.png`)}
        style={{ position: 'absolute', left: -callout.x * k, top: -callout.y * k, width: 390 * k, height: 844 * k, maxWidth: 'none' }}
      />
    </div>
  );
};

/** Where a finger tapped: a dot that presses, and a ring that spreads and fades. */
const TapRing: React.FC<{ tap: PlacedTap; frame: number }> = ({ tap, frame }) => {
  const age = frame - tap.at;
  if (age < 0 || age > 18) return null;
  const press = interpolate(age, [0, 4, 10], [0.6, 1, 1], { extrapolateRight: 'clamp', easing: ease });
  const dot = interpolate(age, [0, 3, 12, 18], [0, 0.55, 0.55, 0], { extrapolateRight: 'clamp' });
  const spread = interpolate(age, [2, 18], [0.5, 1.6], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
  const ring = interpolate(age, [2, 6, 18], [0, 0.9, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const x = tap.x * POINT;
  const y = tap.y * POINT;
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: x - 34,
          top: y - 34,
          width: 68,
          height: 68,
          borderRadius: 34,
          background: 'rgba(20, 20, 30, 0.9)',
          opacity: dot,
          transform: `scale(${press})`,
          border: `4px solid ${color.tap}`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: x - 60,
          top: y - 60,
          width: 120,
          height: 120,
          borderRadius: 60,
          border: `5px solid rgba(20, 20, 30, 0.75)`,
          opacity: ring,
          transform: `scale(${spread})`,
        }}
      />
    </>
  );
};

/** The scene's line, a line at a time: up into place, then gone just before the next. */
const Caption: React.FC<{ lines: string[]; start: number; end: number; frame: number }> = ({ lines, start, end, frame }) => {
  const leave = interpolate(frame, [end - LEAVE, end], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div
      style={{
        position: 'absolute',
        top: safe.top + 84,
        left: safe.side,
        right: safe.side,
        textAlign: 'center',
        fontSize: type.caption.size,
        fontWeight: type.caption.weight,
        lineHeight: type.caption.line,
        letterSpacing: -1.2,
        opacity: leave,
      }}
    >
      {lines.map((line, i) => {
        const p = interpolate(frame - start - i * 4, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
        return (
          <div key={line} style={{ opacity: p, transform: `translateY(${(1 - p) * 36}px)`, whiteSpace: 'nowrap' }}>
            {line}
          </div>
        );
      })}
    </div>
  );
};
