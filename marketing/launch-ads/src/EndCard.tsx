/**
 * The end of every launch ad, and its one call to action: GymGO is live, free
 * to join, at app.gymgo.site. "Find a gym that fits your workout, budget and
 * visit time" is the app's own line for itself (its page description), and
 * "free account" is what its sign-up screen says. It holds still for the last
 * seconds, so a pause or a screenshot lands on it whole.
 */

import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useVideoConfig } from 'remotion';
import { BEAT, color, font } from './theme';

const ease = Easing.bezier(0.22, 1, 0.36, 1);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const EndCard: React.FC<{ frame: number }> = ({ frame }) => {
  const { fps } = useVideoConfig();
  const rise = (delay: number) => {
    const p = interpolate(frame - delay, [0, 12], [0, 1], { ...clamp, easing: ease });
    return { opacity: p, transform: `translateY(${(1 - p) * 50}px)` };
  };
  const icon = spring({ frame, fps, config: { damping: 10, mass: 0.7 } });
  const sticker = spring({ frame: frame - 9, fps, config: { damping: 9, mass: 0.5 } });
  const url = spring({ frame: frame - 16, fps, config: { damping: 12, mass: 0.6 } });
  // Once settled, the address nudges on each beat: the one thing to remember.
  const nudge = frame > 36 ? 1 + 0.025 * Math.exp(-(frame % BEAT) / 4) : 1;
  const rings = [0, 6].map((delay) => {
    const p = interpolate(frame - delay, [0, 26], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
    return { scale: 0.3 + 2.2 * p, opacity: (1 - p) * 0.7 };
  });

  return (
    <AbsoluteFill style={{ alignItems: 'center', fontFamily: font.family, color: color.ink, textAlign: 'center' }}>
      {rings.map((ring, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: 540 - 260,
            top: 560 - 260,
            width: 520,
            height: 520,
            borderRadius: '50%',
            border: `${i ? 6 : 10}px solid ${i ? '#FFFFFF' : color.lime}`,
            opacity: ring.opacity,
            transform: `scale(${ring.scale})`,
          }}
        />
      ))}
      <div style={{ position: 'absolute', top: 400, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Img
          src={staticFile('icon.png')}
          style={{
            width: 300,
            height: 300,
            borderRadius: 68,
            transform: `scale(${icon}) rotate(${(1 - icon) * -14}deg)`,
            boxShadow: '0 30px 70px rgba(12, 6, 60, 0.5), 0 0 120px rgba(170, 180, 255, 0.45)',
          }}
        />
        <div style={{ ...rise(4), marginTop: 46, fontSize: 168, fontWeight: 900, letterSpacing: -6, lineHeight: 1 }}>GymGO</div>
        <div
          style={{
            marginTop: 22,
            padding: '8px 34px 14px',
            borderRadius: 26,
            background: color.lime,
            color: color.limeInk,
            fontSize: 82,
            fontWeight: 900,
            letterSpacing: -2,
            transform: `rotate(-3deg) scale(${sticker})`,
            boxShadow: '0 18px 40px rgba(10, 4, 50, 0.4)',
          }}
        >
          is live now ⚡
        </div>
        <div style={{ ...rise(13), marginTop: 46, fontSize: 40, fontWeight: 700, color: color.soft, lineHeight: 1.3, maxWidth: 820 }}>
          Find a gym that fits your workout,
          <br />
          budget and visit time.
        </div>
        <div
          style={{
            marginTop: 44,
            padding: '22px 48px 26px',
            borderRadius: 999,
            background: '#FFFFFF',
            color: color.mid,
            fontSize: 76,
            fontWeight: 900,
            letterSpacing: -2.5,
            transform: `scale(${url * nudge})`,
            opacity: Math.min(1, url * 2),
            boxShadow: '0 22px 50px rgba(10, 4, 50, 0.45)',
          }}
        >
          app.gymgo.site
        </div>
        <div style={{ ...rise(22), marginTop: 28, fontSize: 36, fontWeight: 700, color: color.soft }}>Free account · works in any browser</div>
      </div>
    </AbsoluteFill>
  );
};
