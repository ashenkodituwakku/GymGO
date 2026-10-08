import { describe, expect, it, vi } from 'vitest';

const location = vi.hoisted(() => ({
  requestForegroundPermissionsAsync: vi.fn(),
  getForegroundPermissionsAsync: vi.fn(),
  getCurrentPositionAsync: vi.fn(),
  getLastKnownPositionAsync: vi.fn(),
  Accuracy: { Highest: 6, Balanced: 3 },
}));
vi.mock('expo-location', () => location);

import { FIX_TIMEOUT_MS, PRECISE_ALONE_MS, currentFix, firstOf, withTimeout } from './location';

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

  it('takes the first to succeed, and fails only when all fail', async () => {
    await expect(firstOf([new Promise<number>(() => undefined), Promise.resolve(2)])).resolves.toBe(2);
    await expect(firstOf([Promise.reject(new Error('a')), Promise.resolve(3)])).resolves.toBe(3);
    await expect(firstOf([Promise.reject(new Error('a')), Promise.reject(new Error('b'))])).rejects.toThrow('b');
  });

  it('uses a recent good position the phone already has, without asking again', async () => {
    location.requestForegroundPermissionsAsync.mockResolvedValue({ granted: true });
    location.getCurrentPositionAsync.mockClear();
    location.getLastKnownPositionAsync.mockResolvedValueOnce({ coords: { latitude: -37.81, longitude: 144.96, accuracy: 20 } });
    await expect(currentFix(true)).resolves.toMatchObject({ position: { lat: -37.81, lng: 144.96 } });
    expect(location.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('asked for a fresh fix, never answers with a position the phone already had', async () => {
    location.requestForegroundPermissionsAsync.mockResolvedValue({ granted: true });
    location.getLastKnownPositionAsync.mockReset().mockResolvedValue({ coords: { latitude: -37.79, longitude: 144.95, accuracy: 20 } });
    location.getCurrentPositionAsync.mockReset().mockResolvedValue({ coords: { latitude: -37.8191, longitude: 144.9626, accuracy: 12 } });
    await expect(currentFix(true, true)).resolves.toMatchObject({ position: { lat: -37.8191, lng: 144.9626 } });
    expect(location.getLastKnownPositionAsync).not.toHaveBeenCalled();
    // Nor one a browser kept from before.
    expect(location.getCurrentPositionAsync).toHaveBeenCalledWith(expect.objectContaining({ maximumAge: 0 }));
    // And with no fix at all, it says so rather than falling back to the old one.
    vi.useFakeTimers();
    location.getCurrentPositionAsync.mockReset().mockReturnValue(new Promise(() => undefined));
    const fix = currentFix(true, true);
    await vi.advanceTimersByTimeAsync(FIX_TIMEOUT_MS);
    await expect(fix).resolves.toBe('unavailable');
    expect(location.getLastKnownPositionAsync).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('indoors, asks Wi-Fi and cell towers when precise GPS is slow, and uses whichever answers', async () => {
    vi.useFakeTimers();
    location.requestForegroundPermissionsAsync.mockResolvedValue({ granted: true });
    location.getLastKnownPositionAsync.mockResolvedValue(null);
    location.getCurrentPositionAsync.mockImplementation(({ accuracy }: { accuracy: number }) =>
      accuracy === 6 ? new Promise(() => undefined) : Promise.resolve({ coords: { latitude: -37.8, longitude: 145.1, accuracy: 65 } }),
    );
    const fix = currentFix(true);
    await vi.advanceTimersByTimeAsync(PRECISE_ALONE_MS);
    await expect(fix).resolves.toEqual({ position: { lat: -37.8, lng: 145.1 }, accuracyM: 65, approximate: false });
    vi.useRealTimers();
  });

  it('falls back to the last known position when no fix comes', async () => {
    vi.useFakeTimers();
    location.requestForegroundPermissionsAsync.mockResolvedValue({ granted: true });
    location.getCurrentPositionAsync.mockReturnValue(new Promise(() => undefined));
    location.getLastKnownPositionAsync.mockResolvedValueOnce(null).mockResolvedValue({ coords: { latitude: 41.88, longitude: -87.63, accuracy: 30 } });
    const fix = currentFix(true);
    await vi.advanceTimersByTimeAsync(FIX_TIMEOUT_MS);
    await expect(fix).resolves.toEqual({ position: { lat: 41.88, lng: -87.63 }, accuracyM: 30, approximate: false });
    vi.useRealTimers();
  });

  it('says unavailable when there is no fix and no recent position', async () => {
    vi.useFakeTimers();
    location.requestForegroundPermissionsAsync.mockResolvedValue({ granted: true });
    location.getCurrentPositionAsync.mockReset().mockReturnValue(new Promise(() => undefined));
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
