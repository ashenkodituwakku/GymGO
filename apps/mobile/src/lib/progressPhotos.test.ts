import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-image-picker', () => ({}));
vi.mock('expo-image-manipulator', () => ({ ImageManipulator: {}, SaveFormat: {} }));
vi.mock('./photoVault', () => ({ keepPhoto: async () => true, forgetPhoto: async () => undefined }));

describe('progress photos', () => {
  it('reads back only well-formed entries', async () => {
    const { readPhotos } = await import('./progressPhotos');
    expect(
      readPhotos([
        { id: 'abc123def', addedOn: '2026-11-02', note: 'Start' },
        { id: '../evil', addedOn: '2026-11-02', note: '' },
        { id: 'abc123xyz', addedOn: 'yesterday' },
        { id: 'abc123qqq', addedOn: '2026-11-01', note: 5 },
        null,
      ]),
    ).toEqual([
      { id: 'abc123def', addedOn: '2026-11-02', note: 'Start' },
      { id: 'abc123qqq', addedOn: '2026-11-01', note: '' },
    ]);
    expect(readPhotos('nope')).toEqual([]);
  });

  it('puts the first and the latest side by side', async () => {
    const { thenAndNow, newestFirst } = await import('./progressPhotos');
    const photos = [
      { id: 'aaaaaa1', addedOn: '2026-09-01', note: '' },
      { id: 'aaaaaa3', addedOn: '2026-11-01', note: '' },
      { id: 'aaaaaa2', addedOn: '2026-10-01', note: '' },
    ];
    expect(newestFirst(photos).map((photo) => photo.id)).toEqual(['aaaaaa3', 'aaaaaa2', 'aaaaaa1']);
    expect(thenAndNow(photos)).toEqual({ then: photos[0], now: photos[1] });
    expect(thenAndNow(photos.slice(0, 1))).toBeNull();
  });
});
