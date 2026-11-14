/**
 * The Windows launcher, scripts/gymgo.ps1.
 *
 * Windows PowerShell 5.1 — still what opens by default on most Windows PCs —
 * reads a script with no byte-order mark as Windows-1252. The UTF-8 bytes of a
 * decorative tick mark (E2 9C 93) decode there to "âœ“", and that final
 * character is a curly quote PowerShell treats as a string delimiter: one
 * character made the whole script fail to parse. It passed every test run in
 * PowerShell 7, which reads UTF-8, so this guards the case those runs miss.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const LAUNCHER = fileURLToPath(new URL('../../../scripts/gymgo.ps1', import.meta.url));

describe('scripts/gymgo.ps1', () => {
  it('is plain ASCII, so Windows PowerShell 5.1 reads it the same as PowerShell 7', () => {
    const bytes = readFileSync(LAUNCHER);
    const offending: string[] = [];
    let line = 1;
    for (const byte of bytes) {
      if (byte === 0x0a) line += 1;
      if (byte > 0x7f) offending.push(`line ${line}: byte 0x${byte.toString(16)}`);
    }
    expect(offending, 'non-ASCII bytes in the launcher').toEqual([]);
  });

  it('uses Windows-compatible line endings or plain LF, never a lone CR', () => {
    const text = readFileSync(LAUNCHER, 'latin1');
    expect(/\r(?!\n)/.test(text)).toBe(false);
  });
});
