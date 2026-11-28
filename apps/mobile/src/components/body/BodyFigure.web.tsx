/**
 * One view of the body, in the browser: plain SVG, so each muscle can be
 * clicked, hovered, reached with Tab and pressed with Enter or Space.
 *
 * Drawn with some depth, as on a phone (BodyFigure.tsx): the silhouette is
 * filled, so the gaps between muscles read as creases; each muscle is shaded
 * from its top; a soft shadow sits under the feet; and a picked muscle glows.
 */

import { useId, useState, type KeyboardEvent } from 'react';
import { VIEWBOX, footing, outlineFor, shadeId, shadeStops, shapesFor, type FigureProps } from './shapes';
import { alpha, mix } from '@/lib/looks';
import { color } from '@/lib/theme';

export function BodyFigure({ gender, side, width, height, fillFor, pickable, selected, labelFor, onPress, hoverFor }: FigureProps) {
  const figure = `b${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const key = (slug: string) => (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onPress(slug);
    }
  };

  // A muscle is drawn in several pieces (left and right, upper and lower);
  // together they make one button, so Tab stops once per muscle, not per piece.
  const parts: Array<{ slug: string; pieces: Array<{ key: string; d: string }> } | { key: string; d: string; slug: string }> = [];
  const groups = new Map<string, Array<{ key: string; d: string }>>();
  const shapes = shapesFor(gender, side);
  for (const shape of shapes) {
    if (!pickable(shape.slug)) {
      parts.push({ key: shape.key, d: shape.d, slug: shape.slug });
      continue;
    }
    const pieces = groups.get(shape.slug);
    if (pieces) pieces.push({ key: shape.key, d: shape.d });
    else {
      const first = [{ key: shape.key, d: shape.d }];
      groups.set(shape.slug, first);
      parts.push({ slug: shape.slug, pieces: first });
    }
  }
  // Under the mouse: the muscle's colour tinted towards the accent, unless the page says otherwise.
  const hoverOf = (slug: string) => (hoverFor ? hoverFor(slug) : mix(fillFor(slug), color.brand, 0.35));
  // A gradient for every colour in use, the hover colours among them.
  const fills = [...new Set([...shapes.map((shape) => fillFor(shape.slug)), ...[...groups.keys()].map(hoverOf)])];
  const fillOf = (value: string) => `url(#${shadeId(figure, value)})`;
  const foot = footing(gender, side);
  const [bodyTop, , bodyFoot] = shadeStops(color.bodyBase);

  return (
    <svg viewBox={VIEWBOX[gender][side]} width={width} height={height} role="group" aria-label={`Body, ${side}`} style={{ overflow: 'visible' }}>
      <defs>
        {fills.map((fill) => {
          const [light, base, deep] = shadeStops(fill);
          return (
            <linearGradient key={fill} id={shadeId(figure, fill)} x1="0" y1="0" x2="0.25" y2="1">
              <stop offset="0" stopColor={light} />
              <stop offset="0.55" stopColor={base} />
              <stop offset="1" stopColor={deep} />
            </linearGradient>
          );
        })}
        <linearGradient id={`${figure}body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={bodyTop} />
          <stop offset="1" stopColor={bodyFoot} />
        </linearGradient>
        <radialGradient id={`${figure}floor`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000000" stopOpacity={0.22} />
          <stop offset="1" stopColor="#000000" stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse cx={foot.cx} cy={foot.cy} rx={foot.rx} ry={foot.rx * 0.16} fill={`url(#${figure}floor)`} />
      <path d={outlineFor(gender, side)} stroke={color.bodyBorder} strokeWidth={2} fill={`url(#${figure}body)`} vectorEffect="non-scaling-stroke" />
      {parts.map((part) => {
        if (!('pieces' in part)) return <path key={part.key} d={part.d} fill={fillOf(fillFor(part.slug))} />;
        const { slug } = part;
        const on = selected(slug);
        const fill = fillFor(slug);
        return (
          <g
            key={`${side}-${slug}`}
            role="button"
            tabIndex={0}
            aria-label={labelFor(slug)}
            aria-pressed={on}
            // A picked muscle glows in its own colour; one under the mouse lifts a little.
            style={{
              cursor: 'pointer',
              outline: 'none',
              filter: on ? `drop-shadow(0 0 5px ${alpha(fill, 0.65)})` : undefined,
              transition: 'filter 160ms ease',
            }}
            onClick={() => onPress(slug)}
            onKeyDown={key(slug)}
            onFocus={() => setFocused(slug)}
            onBlur={() => setFocused((current) => (current === slug ? null : current))}
            onMouseEnter={() => setHovered(slug)}
            onMouseLeave={() => setHovered((current) => (current === slug ? null : current))}
          >
            {part.pieces.map((piece) => (
              <path
                key={piece.key}
                d={piece.d}
                fill={!on && hovered === slug ? fillOf(hoverOf(slug)) : fillOf(fill)}
                // Keyboard focus: the muscle's outline in the accent colour. A picked muscle: a fine light edge.
                stroke={focused === slug ? (on ? color.label : color.brand) : on ? 'rgba(255, 255, 255, 0.55)' : 'none'}
                strokeWidth={focused === slug ? 2.5 : on ? 1.5 : 0}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}
