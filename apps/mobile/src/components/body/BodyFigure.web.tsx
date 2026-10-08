/**
 * One view of the body, in the browser: plain SVG, so each muscle can be
 * clicked, hovered, reached with Tab and pressed with Enter or Space.
 */

import { useState, type KeyboardEvent } from 'react';
import { VIEWBOX, outlineFor, shapesFor, type FigureProps } from './shapes';
import { color } from '@/lib/theme';

export function BodyFigure({ gender, side, width, height, fillFor, pickable, selected, labelFor, onPress }: FigureProps) {
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
  for (const shape of shapesFor(gender, side)) {
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

  return (
    <svg viewBox={VIEWBOX[gender][side]} width={width} height={height} role="group" aria-label={`Body, ${side}`}>
      <path d={outlineFor(gender, side)} stroke={color.bodyBorder} strokeWidth={2} fill="none" vectorEffect="non-scaling-stroke" />
      {parts.map((part) => {
        if (!('pieces' in part)) return <path key={part.key} d={part.d} fill={fillFor(part.slug)} />;
        const { slug } = part;
        const on = selected(slug);
        return (
          <g
            key={`${side}-${slug}`}
            role="button"
            tabIndex={0}
            aria-label={labelFor(slug)}
            aria-pressed={on}
            style={{ cursor: 'pointer', outline: 'none' }}
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
                fill={!on && hovered === slug ? color.bodyHover : fillFor(slug)}
                // Keyboard focus: the muscle's outline in the accent colour.
                stroke={focused === slug ? (on ? color.label : color.brand) : 'none'}
                strokeWidth={focused === slug ? 2.5 : 0}
                vectorEffect="non-scaling-stroke"
                style={{ transition: 'fill 120ms ease' }}
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}
