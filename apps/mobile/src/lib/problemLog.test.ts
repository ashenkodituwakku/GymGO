import { describe, expect, it } from 'vitest';
import { KEPT, MESSAGE_CHARS, ProblemLog, formatArgs, scrubProblem } from './problemLog';

describe('what a bug report may say went wrong', () => {
  it('takes out email addresses, sign-in tokens and link queries', () => {
    expect(scrubProblem('Sign-in failed for someone@example.com')).toBe('Sign-in failed for [email]');
    expect(scrubProblem('Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc rejected')).toBe('Bearer […] rejected');
    expect(scrubProblem('GET https://tiles.example.org/styles/dark?key=secret123 failed')).toBe('GET https://tiles.example.org/styles/dark?… failed');
  });

  it('keeps the words that say what broke', () => {
    expect(scrubProblem('Text strings must be rendered within a <Text> component.')).toBe('Text strings must be rendered within a <Text> component.');
  });

  it('is one line, and short', () => {
    expect(scrubProblem('one\n  two\tthree')).toBe('one two three');
    const long = scrubProblem('word '.repeat(100));
    expect(long.length).toBeLessThanOrEqual(MESSAGE_CHARS);
    expect(long.endsWith('…')).toBe(true);
  });

  it("fills in React's %s warnings and reads errors by their message", () => {
    expect(formatArgs(['Warning: Each child in a list should have a unique %s prop.', '"key"'])).toBe('Warning: Each child in a list should have a unique "key" prop.');
    expect(formatArgs([new Error('Network request failed')])).toBe('Network request failed');
    expect(formatArgs(['[map]', 'AJAXError'])).toBe('[map] AJAXError');
  });
});

describe('the problems kept', () => {
  it('lists the newest first, counts repeats, and keeps the last few', () => {
    const log = new ProblemLog();
    const start = 1_000_000;
    log.note('warning', 'first', start);
    log.note('error', 'second', start + 1000);
    log.note('warning', 'first', start + 2000);
    const lines = log.lines(start + 3 * 60_000);
    expect(lines.map((line) => line.value)).toEqual(['Warning (2 times), 2 min ago: first', 'Error, 2 min ago: second']);
    expect(lines[0]!.label).toBe('Recent problem 1');
    for (let i = 0; i < KEPT + 3; i++) log.note('error', `problem ${i}`, start + 10_000 + i);
    expect(log.lines(start + 20_000)).toHaveLength(KEPT);
    expect(log.lines(start + 20_000)[0]!.value).toContain(`problem ${KEPT + 2}`);
  });

  it('fits what the server keeps (sixteen lines of 200 characters)', () => {
    const log = new ProblemLog();
    log.note('error', 'x'.repeat(5000).replace(/x/g, 'ab '), 0);
    expect(log.lines(0)[0]!.value.length).toBeLessThanOrEqual(200);
  });
});
