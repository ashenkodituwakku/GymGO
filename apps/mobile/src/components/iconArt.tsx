/**
 * The tab bar's and the sidebar's outline icons, drawn in parts so each can
 * play its own little scene when the mouse is on it, in a browser
 * (lib/iconHover.ts has the scenes): Progress's graph draws itself and its
 * arrow shoots out, Workout's barbell is loaded plate by plate, Home's roof
 * hops and its door swings open, and so on.
 *
 * Phosphor's own outlines (MIT, © Phosphor Icons), redrawn as the strokes
 * they're designed from: on its 256 grid, a 16-unit round stroke (24 in its
 * bold cut). At rest each looks as PIcon draws it from phosphor.ts; only the
 * parts are separate. A part is named by `data-part`, which react-native-svg
 * passes on to the page.
 */

import type { ReactElement } from 'react';
import { Circle, G, Path, Rect } from 'react-native-svg';
import type { ArtName } from '@/lib/iconHover';

/** A part's name, for the scene's CSS. */
const part = (name: string) => ({ 'data-part': name }) as object;
/** A path measured as 100 long, so a scene can draw it from 0 to 100. */
const measured = { pathLength: 100 } as object;

function stroke(color: string, width: number) {
  return { stroke: color, strokeWidth: width, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;
}

type Drawing = (color: string, width: number) => ReactElement;

export const ART: Record<ArtName, Drawing> = {
  // Progress: the axes, the rising line, its arrowhead.
  'chart-line-up': (color, width) => (
    <G>
      <Path d="M224,208H32V48" {...stroke(color, width)} {...part('axes')} />
      <Path d="M32,176L96,112L128,144L200,72" {...stroke(color, width)} {...part('line')} {...measured} />
      <Path d="M160,72H200V112" {...stroke(color, width)} {...part('arrow')} />
    </G>
  ),
  // Workout: the bar, its two inner plates and two outer plates.
  barbell: (color, width) => (
    <G {...part('all')}>
      <Path d="M96,128H160M8,128H24M232,128H248" {...stroke(color, width)} {...part('bar')} />
      <Rect x={56} y={56} width={40} height={144} rx={8} {...stroke(color, width)} {...part('inner-left')} />
      <Rect x={160} y={56} width={40} height={144} rx={8} {...stroke(color, width)} {...part('inner-right')} />
      <Path d="M56,176H32a8,8,0,0,1-8-8V88a8,8,0,0,1,8-8H56" {...stroke(color, width)} {...part('outer-left')} />
      <Path d="M200,80h24a8,8,0,0,1,8,8v80a8,8,0,0,1-8,8H200" {...stroke(color, width)} {...part('outer-right')} />
    </G>
  ),
  // Home: the walls with the doorway, the roof, and a door that's only there while it swings open.
  house: (color, width) => (
    <G>
      <Rect x={112} y={160} width={32} height={48} fill={color} opacity={0} {...part('door')} />
      <Path d="M40,120V216H104V152H152V216H216V120" {...stroke(color, width)} {...part('walls')} />
      <Path d="M40,120L128,32L216,120" {...stroke(color, width)} {...part('roof')} />
    </G>
  ),
  // Explore: a map in three panels, folded at the middle one.
  'map-trifold': (color, width) => (
    <G>
      <Path d="M96,40L160,72V216L96,184Z" {...stroke(color, width)} {...part('middle')} />
      <Path d="M96,184L32,200V56L96,40" {...stroke(color, width)} {...part('left')} />
      <Path d="M160,72L224,56V200L160,216" {...stroke(color, width)} {...part('right')} />
    </G>
  ),
  // Saved: the bookmark, and a fill that runs down it as it's saved.
  'bookmark-simple': (color, width) => (
    <G {...part('all')}>
      <Path d="M192,224L128,184L64,224V48a8,8,0,0,1,8-8H184a8,8,0,0,1,8,8Z" fill={color} opacity={0} {...part('fill')} />
      <Path d="M192,224L128,184L64,224V48a8,8,0,0,1,8-8H184a8,8,0,0,1,8,8Z" {...stroke(color, width)} />
    </G>
  ),
  // Profile: the ring, the head, the shoulders.
  'user-circle': (color, width) => (
    <G>
      <Path d="M128,224A96,96,0,1,1,128,32A96,96,0,1,1,128,224" {...stroke(color, width)} {...part('ring')} {...measured} />
      <Circle cx={128} cy={120} r={40} {...stroke(color, width)} {...part('head')} />
      <Path d="M63.8,199.37a72,72,0,0,1,128.4,0" {...stroke(color, width)} {...part('shoulders')} />
    </G>
  ),
  // My workouts: the board, its clip, two lines of writing.
  'clipboard-text': (color, width) => (
    <G>
      <Path d="M160,40H200a8,8,0,0,1,8,8V216a8,8,0,0,1-8,8H56a8,8,0,0,1-8-8V48a8,8,0,0,1,8-8H96" {...stroke(color, width)} {...part('board')} />
      <Path d="M88,72V64a40,40,0,0,1,80,0v8Z" {...stroke(color, width)} {...part('clip')} />
      <Path d="M96,120H160" {...stroke(color, width)} {...part('line-1')} {...measured} />
      <Path d="M96,152H160" {...stroke(color, width)} {...part('line-2')} {...measured} />
    </G>
  ),
  // Programme: the page, its rings, its header, five days.
  'calendar-dots': (color, width) => (
    <G>
      <Rect x={40} y={40} width={176} height={176} rx={8} {...stroke(color, width)} {...part('page')} />
      <Path d="M80,24V56M176,24V56" {...stroke(color, width)} {...part('rings')} />
      <Path d="M40,88H216" {...stroke(color, width)} {...part('header')} />
      <Circle cx={128} cy={132} r={12} fill={color} {...part('day-1')} />
      <Circle cx={172} cy={132} r={12} fill={color} {...part('day-2')} />
      <Circle cx={84} cy={172} r={12} fill={color} {...part('day-3')} />
      <Circle cx={128} cy={172} r={12} fill={color} {...part('day-4')} />
      <Circle cx={172} cy={172} r={12} fill={color} {...part('day-5')} />
    </G>
  ),
  // Collection: the card in front and the one behind.
  cards: (color, width) => (
    <G>
      <Path d="M64,48H216a8,8,0,0,1,8,8V176" {...stroke(color, width)} {...part('back')} />
      <Rect x={32} y={80} width={160} height={128} rx={8} {...stroke(color, width)} {...part('front')} />
    </G>
  ),
  // Friends: one in the middle, one each side.
  'users-three': (color, width) => (
    <G>
      <G {...part('left')}>
        <Path d="M64,120A32,32,0,1,1,95,80" {...stroke(color, width)} />
        <Path d="M64,120A60,60,0,0,0,16,144" {...stroke(color, width)} />
      </G>
      <G {...part('right')}>
        <Path d="M161,80A32,32,0,1,1,192,120" {...stroke(color, width)} />
        <Path d="M192,120A60,60,0,0,1,240,144" {...stroke(color, width)} />
      </G>
      <G {...part('middle')}>
        <Circle cx={128} cy={144} r={40} {...stroke(color, width)} />
        <Path d="M72,216A64,64,0,0,1,184,216" {...stroke(color, width)} />
      </G>
    </G>
  ),
  // Appearance: the palette and its four paints.
  palette: (color, width) => (
    <G {...part('all')}>
      <Path
        d="M128,32A96,96,0,0,1,224,128A96,96,0,0,1,221.8,148.6A24,24,0,0,1,198.2,168H152A24,24,0,0,0,128,192A24,24,0,0,1,96,214.6C55,200,32,166,32,128A96,96,0,0,1,128,32Z"
        {...stroke(color, width)}
      />
      <Circle cx={128} cy={76} r={12} fill={color} {...part('paint-1')} />
      <Circle cx={172} cy={100} r={12} fill={color} {...part('paint-2')} />
      <Circle cx={84} cy={100} r={12} fill={color} {...part('paint-3')} />
      <Circle cx={84} cy={156} r={12} fill={color} {...part('paint-4')} />
    </G>
  ),
  // Feed: one beat of a pulse.
  pulse: (color, width) => (
    <G>
      <Path d="M24,128H56L96,40L160,208L200,128H232" {...stroke(color, width)} {...part('beat')} {...measured} />
    </G>
  ),
};
