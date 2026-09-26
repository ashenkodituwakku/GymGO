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
