/**
 * One view of the body, in the browser: plain SVG, so each muscle can be
 * clicked, hovered, reached with Tab and pressed with Enter or Space.
 */

import { useState, type KeyboardEvent } from 'react';
import { VIEWBOX, outlineFor, shapesFor, type FigureProps } from './shapes';
import { color } from '@/lib/theme';


export function BodyFigure({ gender, side, width, height, fillFor, pickable, selected, labelFor, onPress }: FigureProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const key = (slug: string) => (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onPress(slug);
    }
  };

  return (
    <svg viewBox={VIEWBOX[gender][side]} width={width} height={height} role="group" aria-label={`Body, ${side}`}>
      <path d={outlineFor(gender, side)} stroke={color.bodyBorder} strokeWidth={2} fill="none" vectorEffect="non-scaling-stroke" />
      {shapesFor(gender, side).map((shape) => {
        if (!pickable(shape.slug)) return <path key={shape.key} d={shape.d} fill={fillFor(shape.slug)} />;
        const on = selected(shape.slug);
        return (
          <path
            key={shape.key}
            d={shape.d}
            fill={!on && hovered === shape.slug ? color.bodyHover : fillFor(shape.slug)}
            role="button"
            tabIndex={0}
            aria-label={labelFor(shape.slug)}
            aria-pressed={on}
            style={{ cursor: 'pointer', transition: 'fill 120ms ease' }}
            onClick={() => onPress(shape.slug)}
            onKeyDown={key(shape.slug)}
            onMouseEnter={() => setHovered(shape.slug)}
            onMouseLeave={() => setHovered((current) => (current === shape.slug ? null : current))}
          />
        );
      })}
    </svg>
  );
}
