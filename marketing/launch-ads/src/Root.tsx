/**
 * The four launch ads, registered as compositions (1080 x 1920, 30 fps), each
 * with its script as props. Every script is held to the caption rules before
 * anything renders: one idea a scene, at most two lines, a scene at least a
 * beat, a hook before the drop.
 */

import { Composition } from 'remotion';
import './fonts';
import { Ad } from './Ad';
import { ADS, totalFrames, type AdScript } from './ads';
import { BEAT, FPS, HEIGHT, WIDTH } from './theme';

function check(script: AdScript) {
  const problem = (text: string) => {
    throw new Error(`${script.id}: ${text}`);
  };
  if (script.scenes[0]?.style !== 'hook') problem('the first scene is the hook');
  if (script.endFrames < FPS * 3) problem('the end card holds at least three seconds');
  for (const [i, scene] of script.scenes.entries()) {
    if (scene.caption.length < 1 || scene.caption.length > 2) problem(`scene ${i + 1} has ${scene.caption.length} lines (one or two)`);
    for (const line of scene.caption) if (line.replace(/\*/g, '').length > 26) problem(`scene ${i + 1}: "${line}" is too long for one line`);
    if (scene.frames < BEAT * 2) problem(`scene ${i + 1} is shorter than two beats`);
    if (scene.shots.length < 1 || scene.shots[0]!.at !== 0) problem(`scene ${i + 1} needs a shot from its first frame`);
    if ((scene.caption.join(' ').match(/\*/g) ?? []).length % 2) problem(`scene ${i + 1} has an unclosed *highlight*`);
  }
}

export const Root: React.FC = () => (
  <>
    {ADS.map((script) => {
      check(script);
      return (
        <Composition
          key={script.id}
          id={script.id}
          component={Ad as React.FC<AdScript>}
          defaultProps={script}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
          durationInFrames={totalFrames(script)}
          calculateMetadata={({ props }) => ({ durationInFrames: totalFrames(props) })}
        />
      );
    })}
  </>
);
