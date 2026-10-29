import { describe, expect, it } from 'vitest';
import { busyNow, isBusyLevel } from './busy';

const NOW = new Date('2026-10-01T18:00:00Z');
const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000).toISOString();

describe('is it busy?', () => {
  it('says nothing until three members have said so in the last hour', () => {
    expect(busyNow([], NOW)).toEqual({ level: null, count: 0, latestAt: null });
    const two = busyNow([{ level: 'packed', reportedAt: ago(5) }, { level: 'busy', reportedAt: ago(10) }], NOW);
    expect(two).toEqual({ level: null, count: 2, latestAt: ago(5) });
    // An old report says nothing about now.
    expect(busyNow([{ level: 'busy', reportedAt: ago(5) }, { level: 'busy', reportedAt: ago(10) }, { level: 'busy', reportedAt: ago(90) }], NOW).level).toBeNull();
  });

  it('shows the middle of what they said, never busier than they said', () => {
    expect(busyNow([{ level: 'quiet', reportedAt: ago(5) }, { level: 'packed', reportedAt: ago(10) }, { level: 'steady', reportedAt: ago(20) }], NOW).level).toBe('steady');
    expect(
      busyNow([{ level: 'quiet', reportedAt: ago(5) }, { level: 'busy', reportedAt: ago(10) }, { level: 'steady', reportedAt: ago(20) }, { level: 'packed', reportedAt: ago(30) }], NOW).level,
    ).toBe('steady');
  });

  it('knows its levels', () => {
    expect(isBusyLevel('busy')).toBe(true);
    expect(isBusyLevel('heaving')).toBe(false);
  });
});
