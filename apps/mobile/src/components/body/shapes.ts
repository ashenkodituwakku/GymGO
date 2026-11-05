/**
 * The muscle shapes for each figure, flattened into one list of paths.
 *
 * The drawings are react-native-body-highlighter's (MIT, (c) ELABBASSI
 * Hicham; see CREDITS.md). GymGO draws them itself so it can colour and label
 * each muscle, and so the browser gets plain, keyboard-reachable SVG.
 */

import { bodyBack } from 'react-native-body-highlighter/dist/assets/bodyBack';
import { bodyFemaleBack } from 'react-native-body-highlighter/dist/assets/bodyFemaleBack';
import { bodyFemaleFront } from 'react-native-body-highlighter/dist/assets/bodyFemaleFront';
import { bodyFront } from 'react-native-body-highlighter/dist/assets/bodyFront';
import { OUTLINE } from './outline';
import { mix } from '@/lib/looks';

export type Gender = 'male' | 'female';
export type Side = 'front' | 'back';

export interface Shape {
  key: string;
  slug: string;
  d: string;
}

export interface FigureProps {
  gender: Gender;
  side: Side;
  width: number;
  height: number;
  /** Fill for each muscle; a muscle without one is drawn but can't be tapped. */
  fillFor: (slug: string) => string;
  pickable: (slug: string) => boolean;
  selected: (slug: string) => boolean;
  labelFor: (slug: string) => string;
  onPress: (slug: string) => void;
  /** Under the mouse, in a browser: by default the muscle's colour tinted towards the accent, as picking it would. */
  hoverFor?: (slug: string) => string;
}

export const VIEWBOX: Record<Gender, Record<Side, string>> = {
  male: { front: '0 0 724 1448', back: '724 0 724 1448' },
  female: { front: '-50 -40 734 1538', back: '756 0 774 1448' },
};


const SOURCES = {
  male: { front: bodyFront, back: bodyBack },
  female: { front: bodyFemaleFront, back: bodyFemaleBack },
};

const cache = new Map<string, Shape[]>();

export function shapesFor(gender: Gender, side: Side): Shape[] {
  const id = `${gender}-${side}`;
  const hit = cache.get(id);
  if (hit) return hit;
  const shapes: Shape[] = [];
  for (const part of SOURCES[gender][side]) {
    if (!part.slug || !part.path) continue;
    const paths = [...(part.path.common ?? []), ...(part.path.left ?? []), ...(part.path.right ?? [])];
    paths.forEach((d, index) => shapes.push({ key: `${part.slug}-${index}`, slug: part.slug!, d }));
  }
  cache.set(id, shapes);
  return shapes;
}

export const outlineFor = (gender: Gender, side: Side) => OUTLINE[gender][side];

/**
 * A muscle's colour as three stops, lit from the top: a little lighter at
 * its top, the colour itself through the middle, a little deeper at its
 * foot. Each muscle gets its own (the gradient is in the muscle's own box),
 * so the figure looks rounded rather than flat. A colour that isn't #RRGGBB
 * is used as it is.
 */
export function shadeStops(fill: string): [string, string, string] {
  if (!/^#[0-9a-f]{6}$/i.test(fill)) return [fill, fill, fill];
  return [mix(fill, '#FFFFFF', 0.22), fill, mix(fill, '#000000', 0.16)];
}

/** An id for a colour's gradient in one figure: safe inside url(#…). */
export const shadeId = (figure: string, fill: string) => `${figure}${fill.replace(/[^a-z0-9]/gi, '')}`;

/** Where the figure stands, in its view box: the middle and the foot of the drawing, for its shadow. */
export function footing(gender: Gender, side: Side): { cx: number; cy: number; rx: number } {
  const [x, y, w, h] = VIEWBOX[gender][side].split(' ').map(Number) as [number, number, number, number];
  return { cx: x + w / 2, cy: y + h - h * 0.045, rx: w * 0.24 };
}
