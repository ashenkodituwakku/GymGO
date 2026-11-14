import { afterEach, describe, expect, it } from 'vitest';
import { dateLabel } from './copy';

const was = process.env.TZ;
afterEach(() => {
  process.env.TZ = was;
});

describe('dateLabel', () => {
  it('shows a calendar date as written, even west of London, where midnight UTC is still the day before', () => {
    process.env.TZ = 'America/Los_Angeles';
    expect(dateLabel('2026-10-15', { day: 'numeric', month: 'numeric', year: 'numeric' })).toBe(new Date(2026, 9, 15).toLocaleDateString(undefined, { day: 'numeric', month: 'numeric', year: 'numeric' }));
    process.env.TZ = 'Pacific/Kiritimati';
    expect(dateLabel('2026-10-15', { day: 'numeric' })).toBe('15');
  });

  it('shows a moment on the phone’s own clock', () => {
    process.env.TZ = 'America/Los_Angeles';
    // 3 am in London on the 15th is still the evening of the 14th in Los Angeles.
    expect(dateLabel('2026-10-15T03:00:00Z', { day: 'numeric' })).toBe('14');
    process.env.TZ = 'Australia/Melbourne';
    expect(dateLabel('2026-10-15T20:00:00Z', { day: 'numeric' })).toBe('16');
  });
});
