import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-image-picker', () => ({}));
vi.mock('expo-image-manipulator', () => ({ ImageManipulator: {}, SaveFormat: { JPEG: 'jpeg' } }));

const { PHOTO_LONG_SIDE, fitWithin } = await import('./gymPhoto');

describe('a gym photo, sized to send', () => {
  it("brings a phone camera's 12 megapixels down to the long side", () => {
    expect(fitWithin(4032, 3024, PHOTO_LONG_SIDE)).toEqual({ width: 2048, height: 1536 });
    expect(fitWithin(3024, 4032, PHOTO_LONG_SIDE)).toEqual({ width: 1536, height: 2048 });
  });

  it('leaves one that already fits, and never enlarges', () => {
    expect(fitWithin(1600, 1200, PHOTO_LONG_SIDE)).toBeNull();
    expect(fitWithin(2048, 1536, PHOTO_LONG_SIDE)).toBeNull();
  });

  it("leaves one whose size the picker didn't say", () => {
    expect(fitWithin(0, 0, PHOTO_LONG_SIDE)).toBeNull();
  });
});
