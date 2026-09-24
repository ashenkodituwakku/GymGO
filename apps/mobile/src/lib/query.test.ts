import { describe, expect, it } from 'vitest';
import { nextVisitAt, nowInPilot } from './query';

describe('nextVisitAt', () => {
  // 9:30 am in Melbourne on 24 September 2026 (AEST, UTC+10).
  const morning = new Date('2026-09-23T23:30:00Z');

  it('picks today when the time is still ahead', () => {
    expect(nowInPilot(morning)).toEqual({ date: '2026-09-24', minute: 9 * 60 + 30 });
    expect(nextVisitAt(18 * 60, morning)).toEqual({ date: '2026-09-24', minute: 18 * 60 });
  });

  it('rolls to tomorrow when the time has passed, never to the past', () => {
    expect(nextVisitAt(6 * 60, morning)).toEqual({ date: '2026-09-25', minute: 6 * 60 });
    expect(nextVisitAt(9 * 60 + 30, morning)).toEqual({ date: '2026-09-25', minute: 9 * 60 + 30 });
  });
});
