import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-image-picker', () => ({}));
vi.mock('expo-image-manipulator', () => ({ ImageManipulator: {}, SaveFormat: { JPEG: 'jpeg' } }));

const { centreSquare } = await import('./avatar');

describe('profile pictures', () => {
  it('cut the centre square out of a wide or tall picture', () => {
    expect(centreSquare(1254, 600)).toEqual({ originX: 327, originY: 0, width: 600, height: 600 });
    expect(centreSquare(3000, 4000)).toEqual({ originX: 0, originY: 500, width: 3000, height: 3000 });
    expect(centreSquare(400, 400)).toEqual({ originX: 0, originY: 0, width: 400, height: 400 });
  });
});
