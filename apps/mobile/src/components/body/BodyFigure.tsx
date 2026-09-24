/** One view of the body, on iPhone and Android (react-native-svg). */

import Svg, { G, Path } from 'react-native-svg';
import { BORDER, VIEWBOX, outlineFor, shapesFor, type FigureProps } from './shapes';

export function BodyFigure({ gender, side, width, height, fillFor, pickable, onPress }: FigureProps) {
  return (
    <Svg viewBox={VIEWBOX[gender][side]} width={width} height={height}>
      <G fill="none" strokeWidth={2}>
        <Path d={outlineFor(gender, side)} stroke={BORDER} vectorEffect="non-scaling-stroke" />
      </G>
      {shapesFor(gender, side).map((shape) => (
        <Path
          key={shape.key}
          d={shape.d}
          fill={fillFor(shape.slug)}
          onPress={pickable(shape.slug) ? () => onPress(shape.slug) : undefined}
        />
      ))}
    </Svg>
  );
}
