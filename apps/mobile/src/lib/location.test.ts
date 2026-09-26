import { describe, expect, it, vi } from 'vitest';

const location = vi.hoisted(() => ({
  requestForegroundPermissionsAsync: vi.fn(),
  getForegroundPermissionsAsync: vi.fn(),
  getCurrentPositionAsync: vi.fn(),
  getLastKnownPositionAsync: vi.fn(),
  Accuracy: { Highest: 6 },
}));
vi.mock('expo-location', () => location);

import { FIX_TIMEOUT_MS, currentFix, withTimeout } from './location';

describe('finding you', () => {
  it('gives up on a promise that never settles', async () => {
    vi.useFakeTimers();
    const never = withTimeout(new Promise<number>(() => undefined), 1000);
    const caught = never.catch((error: Error) => error.message);
    await vi.advanceTimersByTimeAsync(1000);
    await expect(caught).resolves.toBe('timed out');
    vi.useRealTimers();
  });

  it('passes a value through untouched', async () => {
    await expect(withTimeout(Promise.resolve(7), 1000)).resolves.toBe(7);
  });

  it('falls back to the last known position when a precise fix never comes', async () => {
    vi.useFakeTimers();
    location.requestForegroundPermissionsAsync.mockResolvedValue({ granted: true });
    location.getCurrentPositionAsync.mockReturnValue(new Promise(() => undefined));
    location.getLastKnownPositionAsync.mockResolvedValue({ coords: { latitude: 41.88, longitude: -87.63, accuracy: 30 } });
    const fix = currentFix(true);
    await vi.advanceTimersByTimeAsync(FIX_TIMEOUT_MS);
    await expect(fix).resolves.toEqual({ position: { lat: 41.88, lng: -87.63 }, accuracyM: 30, approximate: false });
    vi.useRealTimers();
  });

  it('says unavailable when there is no fix and no recent position', async () => {
    vi.useFakeTimers();
    location.requestForegroundPermissionsAsync.mockResolvedValue({ granted: true });
    location.getCurrentPositionAsync.mockReturnValue(new Promise(() => undefined));
    location.getLastKnownPositionAsync.mockResolvedValue(null);
    const fix = currentFix(true);
    await vi.advanceTimersByTimeAsync(FIX_TIMEOUT_MS);
    await expect(fix).resolves.toBe('unavailable');
    vi.useRealTimers();
  });

  it('says denied without waiting when location is refused', async () => {
    location.requestForegroundPermissionsAsync.mockResolvedValue({ granted: false });
    await expect(currentFix(true)).resolves.toBe('denied');
  });
});
