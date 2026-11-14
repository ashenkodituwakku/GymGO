import { describe, expect, it } from 'vitest';
import { cancelRestAlert, restAlertText, scheduleRestAlert, secondsUntil } from './restAlert';

describe('the rest alert', () => {
  it('is set for whole seconds ahead, and not for a rest about to end', () => {
    expect(secondsUntil(90_000, 0)).toBe(90);
    expect(secondsUntil(90_400, 0)).toBe(90);
    expect(secondsUntil(2_000, 0)).toBeNull();
    expect(secondsUntil(0, 5_000)).toBeNull();
  });

  it('says what’s next', () => {
    expect(restAlertText('Barbell bench press')).toEqual({ title: 'Rest’s up', body: 'Next: Barbell bench press' });
    expect(restAlertText(null).body).toBe('Time for your next set.');
  });

  it('does nothing in a browser', async () => {
    await expect(scheduleRestAlert(Date.now() + 60_000, null)).resolves.toBeUndefined();
    await expect(cancelRestAlert()).resolves.toBeUndefined();
  });
});
