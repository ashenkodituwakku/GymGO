/**
 * One view of the body, on iPhone and Android (react-native-svg).
 *
 * Drawn with some depth, rather than as a flat chart: the body itself
 * (its silhouette) is filled, so the gaps between muscles read as the
 * creases between them; each muscle is shaded from its top (shadeStops);
 * and a soft shadow sits under the feet.
 */

import { useId } from 'react';
import Svg, { Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import { VIEWBOX, footing, outlineFor, shadeId, shadeStops, shapesFor, type FigureProps } from './shapes';
import { color } from '@/lib/theme';

export function BodyFigure({ gender, side, width, height, fillFor, pickable, selected, onPress }: FigureProps) {
  const figure = `b${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const shapes = shapesFor(gender, side);
  const fills = [...new Set(shapes.map((shape) => fillFor(shape.slug)))];
  const foot = footing(gender, side);
  return (
    <Svg viewBox={VIEWBOX[gender][side]} width={width} height={height}>
      <Defs>
        {fills.map((fill) => {
          const [light, base, deep] = shadeStops(fill);
          return (
            <LinearGradient key={fill} id={shadeId(figure, fill)} x1="0" y1="0" x2="0.25" y2="1">
              <Stop offset="0" stopColor={light} />
              <Stop offset="0.55" stopColor={base} />
              <Stop offset="1" stopColor={deep} />
            </LinearGradient>
          );
        })}
        <LinearGradient id={`${figure}body`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={shadeStops(color.bodyBase)[0]} />
          <Stop offset="1" stopColor={shadeStops(color.bodyBase)[2]} />
        </LinearGradient>
        <RadialGradient id={`${figure}floor`} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#000000" stopOpacity={0.22} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={foot.cx} cy={foot.cy} rx={foot.rx} ry={foot.rx * 0.16} fill={`url(#${figure}floor)`} />
      <Path d={outlineFor(gender, side)} fill={`url(#${figure}body)`} stroke={color.bodyBorder} strokeWidth={2} vectorEffect="non-scaling-stroke" />
      <G>
        {shapes.map((shape) => (
          <Path
            key={shape.key}
            d={shape.d}
            fill={`url(#${shadeId(figure, fillFor(shape.slug))})`}
            // A picked muscle has a fine light edge, so it stands out from its neighbours.
            stroke={selected(shape.slug) ? '#FFFFFF' : 'none'}
            strokeOpacity={0.55}
            strokeWidth={selected(shape.slug) ? 1.5 : 0}
            vectorEffect="non-scaling-stroke"
            onPress={pickable(shape.slug) ? () => onPress(shape.slug) : undefined}
          />
        ))}
      </G>
    </Svg>
  );
}
