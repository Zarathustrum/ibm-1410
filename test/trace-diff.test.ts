// The pure half of `tools/trace-diff.ts`. Importing the module must NOT run the CLI — the
// entry guard compares `import.meta.url` against `process.argv[1]`, which under vitest is the
// runner, not this file.

import { describe, it, expect } from 'vitest';

import { DEFAULT_LIMIT, diffTraces, formatDiff } from '../tools/trace-diff.js';

const L1 = 'I 02194  A 01250  B 00000  OP M  D W  LEN 10  CY 49.5   # M %T0 01250 W';

describe('diffTraces', () => {
  it('reports no difference for identical text, trailing newline or not', () => {
    expect(diffTraces(`${L1}\n`, L1)).toEqual({ total: 1, differing: 0, lines: [] });
  });

  it('numbers differing lines from 1 and keeps both sides', () => {
    const r = diffTraces('a\nX\nc\n', 'a\nb\nc\n');
    expect(r).toEqual({ total: 3, differing: 1, lines: [{ line: 2, expected: 'b', produced: 'X' }] });
  });

  it('treats a missing line as a difference with a null side', () => {
    expect(diffTraces('a\n', 'a\nb\n')).toEqual({
      total: 2, differing: 1, lines: [{ line: 2, expected: 'b', produced: null }],
    });
    expect(diffTraces('a\nb\n', 'a\n')).toEqual({
      total: 2, differing: 1, lines: [{ line: 2, expected: null, produced: 'b' }],
    });
  });

  it('counts every difference but only carries the first `limit`', () => {
    const produced = Array.from({ length: 30 }, (_, i) => `p${i}`).join('\n');
    const expected = Array.from({ length: 30 }, (_, i) => `e${i}`).join('\n');
    const capped = diffTraces(produced, expected);
    expect(capped.total).toBe(30);
    expect(capped.differing).toBe(30);
    expect(capped.lines).toHaveLength(DEFAULT_LIMIT);
    expect(diffTraces(produced, expected, 3).lines.map((d) => d.line)).toEqual([1, 2, 3]);
  });

  it('is positional, not resynchronising: one inserted line diverges the rest', () => {
    expect(diffTraces('x\na\nb\n', 'a\nb\n').differing).toBe(3);
  });
});

describe('formatDiff', () => {
  it('prints `- expected` then `+ produced` with line numbers, and the summary', () => {
    expect(formatDiff(diffTraces('a\nX\nc\n', 'a\nb\nc\n'))).toBe(
      ['     2 - b', '     2 + X', '3 lines, 1 differ'].join('\n'),
    );
  });

  it('summarises an identical pair with nothing above the count', () => {
    expect(formatDiff(diffTraces('a\n', 'a\n'))).toBe('1 lines, 0 differ');
  });

  it('says how many differing lines it did not print', () => {
    const produced = Array.from({ length: 5 }, (_, i) => `p${i}`).join('\n');
    const expected = Array.from({ length: 5 }, (_, i) => `e${i}`).join('\n');
    expect(formatDiff(diffTraces(produced, expected, 2))).toContain('… 3 more differing lines');
  });
});
