/**
 * The three shorts, registered as compositions (1080 x 1920, 30 fps), each with
 * its script as props and a schema that holds every script to the skill's
 * caption rules: one idea a scene, at most two short lines.
 */

import { Composition } from 'remotion';
import { z } from 'zod';
import './fonts';
import { Short } from './Short';
import { SHORTS, totalFrames, type ShortScript } from './script';
import { FPS, HEIGHT, WIDTH } from './theme';

// The phone at most 1.45 times its size, where it still fits the canvas's width.
const zoom = z.object({ scale: z.number().min(1).max(1.45), y: z.number().min(0).max(844) });
const callout = z.object({
  src: z.string(),
  x: z.number().min(0),
  y: z.number().min(0),
  w: z.number().positive(),
  h: z.number().positive(),
  at: z.number().int().min(0),
  radius: z.number().min(0).optional(),
});

export const shortSchema = z.object({
  id: z.string(),
  title: z.string(),
  endFrames: z.number().int().min(FPS * 3),
  scenes: z
    .array(
      z.object({
        // At this size a line holds about 22 characters; two lines at most.
        caption: z.array(z.string().min(1).max(22)).min(1).max(2),
        // Held at least a second.
        frames: z.number().int().min(FPS),
        shots: z
          .array(z.object({ src: z.string(), from: z.number().int().min(0), zoom: zoom.optional(), lift: z.number().min(0).max(96).optional() }))
          .min(1),
        taps: z.array(z.object({ x: z.number().min(0).max(390), y: z.number().min(0).max(844), at: z.number().int().min(0) })).optional(),
        callout: callout.optional(),
      }),
    )
    .min(1),
});

export const Root: React.FC = () => (
  <>
    {SHORTS.map((script) => (
      <Composition
        key={script.id}
        id={script.id}
        component={Short as React.FC<ShortScript>}
        schema={shortSchema}
        defaultProps={script}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        durationInFrames={totalFrames(script)}
        calculateMetadata={({ props }) => ({ durationInFrames: totalFrames(props) })}
      />
    ))}
  </>
);
