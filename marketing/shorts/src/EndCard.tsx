/**
 * The end of every short, and its one call to action: the app is coming
 * soon; the limited version is out now at gymgo.site. "Free in your browser"
 * and "no account needed" are the limited version's own words for itself.
 */

import { AbsoluteFill, Img, interpolate, staticFile } from 'remotion';
import { color, ease, type } from './theme';

export const EndCard: React.FC<{ frame: number }> = ({ frame }) => {
  const rise = (delay: number) => {
    const p = interpolate(frame - delay, [0, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
    return { opacity: p, transform: `translateY(${(1 - p) * 40}px)` };
  };
  const icon = interpolate(frame, [0, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
  return (
    <AbsoluteFill style={{ alignItems: 'center', fontFamily: type.family, color: color.ink, textAlign: 'center' }}>
      <div style={{ position: 'absolute', top: 360, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Img
          src={staticFile('icon.png')}
          style={{
            width: 248,
            height: 248,
            borderRadius: 56,
            opacity: icon,
            transform: `scale(${0.86 + 0.14 * icon})`,
            boxShadow: '0 22px 48px rgba(20, 16, 80, 0.3)',
          }}
        />
        <div style={{ ...rise(4), marginTop: 56, fontSize: type.end.mid, fontWeight: 800, letterSpacing: -0.8, lineHeight: 1.15 }}>
          The GymGO app
          <br />
          is coming soon.
        </div>
        <div style={{ ...rise(12), marginTop: 120, fontSize: 44, fontWeight: 600, color: color.soft }}>Try the limited version now</div>
        <div style={{ ...rise(16), marginTop: 6, fontSize: type.end.big, fontWeight: 800, letterSpacing: -3 }}>gymgo.site</div>
        <div style={{ ...rise(22), marginTop: 14, fontSize: type.end.small, fontWeight: 600, color: color.soft }}>
          Free in your browser · no account needed
        </div>
      </div>
    </AbsoluteFill>
  );
};
