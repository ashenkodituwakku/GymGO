import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-router', () => ({ useFocusEffect: () => undefined }));

import { pageTitle } from './pageTitle';

describe('page titles', () => {
  it('names the page, then GymGO', () => {
    expect(pageTitle('Equinox')).toBe('Equinox · GymGO');
    expect(pageTitle(null)).toBe('GymGO');
    expect(pageTitle('')).toBe('GymGO');
  });

  it("doesn't say GymGO twice", () => {
    expect(pageTitle('GymGO Pro')).toBe('GymGO Pro');
  });
});
