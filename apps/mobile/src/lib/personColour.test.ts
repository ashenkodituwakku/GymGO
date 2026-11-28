import { describe, expect, it } from 'vitest';
import { contrast } from './looks';
import { PERSON_COLOURS, personColour } from './personColour';

describe('people’s colours', () => {
  it('keeps a white initial readable on every one', () => {
    for (const colour of PERSON_COLOURS) expect(contrast('#FFFFFF', colour), colour).toBeGreaterThanOrEqual(4.5);
  });

  it('gives a person the same colour every time, and spreads people across them', () => {
    expect(personColour('user-123')).toBe(personColour('user-123'));
    const used = new Set(['Alex Rivera', 'Sam Okafor', 'Jo Lee', 'Prem Test', 'Mia Chen', 'Tom Hart', 'Ana Silva', 'Lee Park'].map(personColour));
    expect(used.size).toBeGreaterThanOrEqual(4);
    expect(PERSON_COLOURS).toContain(personColour(''));
  });
});
