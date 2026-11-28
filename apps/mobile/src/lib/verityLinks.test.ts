import { describe, expect, it } from 'vitest';
import { screenLinks } from './verityLinks';

describe('screens an answer names', () => {
  it('turns the last step of each bold way there into a button, each once, in order', () => {
    expect(screenLinks('Your records are in **Profile → Progress**, and every day you trained is in **Calendar**. **Progress** again.')).toEqual([
      { label: 'Progress', href: '/progress' },
      { label: 'Calendar', href: '/calendar' },
    ]);
  });

  it('leaves out bold words that aren’t screens, and never makes more than three', () => {
    expect(screenLinks('Tap **Start workout**, then **Finish**.')).toEqual([]);
    expect(screenLinks('**Templates**, **Exercises**, **Trips**, **Machines**')).toHaveLength(3);
  });

  it('ignores links the model wrote itself', () => {
    expect(screenLinks('See [here](https://evil.example) or **https://evil.example**')).toEqual([]);
  });
});
