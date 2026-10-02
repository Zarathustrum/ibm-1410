// Tier 1 — the console print-out formatter against the REAL log, not a fabricated one.
// The gating case is the Exhibit II stop line `S 149ØØ 1bbbb 11622 bb bbb bbbb`
// (research/console-and-physical.md §2, C28-0326-2 Appendix C Exhibit II p.55) and the `#`
// storage-scan line `# ØØØØØ` from the same log. Layout, spacing and matrix positions come
// from §2's print-out table (A22-0526-3 Fig.42 p.46; S223-2648 Fig.5 p.9).
//
// The log lines above are what the PAPER shows. A `ConsoleLine` splits them the way §2's table
// does: `id` is the ID character, `text` is the bare fields, and `wordMarks`/`underline` index
// `text` from 0 (printout.ts). `id + ' ' + text` is the renderer's job, not the formatter's.

import { describe, it, expect } from 'vitest';

import { formatPrintout } from '../src/core/printout.js';
import { BLANK_WITH_C } from '../src/core/registers.js';
import { C } from '../src/core/types.js';

/** The indices of every underlined character, which is how §2's rule is actually checkable. */
const underlinedAt = (flags: readonly boolean[]): number[] =>
  flags.flatMap((on, i) => (on ? [i] : []));

describe('the real 1410 OS console log (console-and-physical.md §2)', () => {
  // The state behind the sample: IAR 14900, BAR 11622, an AAR holding a 1 in its high-order
  // position and blanks below it, a blank Op and Op-modifier register, blank channel registers
  // — and NO channel unit-select/unit-number registers at all, which is why the 4-character
  // group prints underlined.
  const sample = formatPrintout('S', {
    iar: 14900,
    aar: '1',
    bar: 11622,
    op: BLANK_WITH_C,
    opMod: BLANK_WITH_C,
    aChannel: BLANK_WITH_C,
    bChannel: BLANK_WITH_C,
    assemblyChannel: BLANK_WITH_C,
    ch1Unit: null,
    ch2Unit: null,
  });

  // The `b`s are the CHOSEN FALLBACK, not a verified fact: §2 states the small `b` only of
  // load-mode console printing and never says the stop print-out is one, and the Exhibit II log
  // is transcribed "blanks as `b`" (printout.ts `PRINTED_BLANK`; open-questions.md console row).
  // This test pins the fallback so a later ruling has to come here to change it.
  it('reproduces `S 149ØØ 1bbbb 11622 bb bbb bbbb` exactly', () => {
    expect(sample.id).toBe('S');
    expect(sample.text).toBe('149ØØ 1bbbb 11622 bb bbb bbbb');
  });

  it('underlines the absent-parity CH1+CH2 group and nothing else', () => {
    // §2: "In the real log the empty group prints as underlined `bbbb` — i.e. underline any
    // register field whose contents have bad or absent parity." The four characters are the
    // last four of the line; every valid blank elsewhere prints plain.
    expect(underlinedAt(sample.underline)).toEqual([25, 26, 27, 28]);
    expect(sample.underline).toHaveLength(sample.text.length);
    expect(sample.text.slice(25)).toBe('bbbb');
  });

  it('groups Op+OpMod as one 2-character group and CH1+CH2 as one 4-character group', () => {
    // Fig.42 prints the unit-select/unit-number group as `XXXX`, no space between channels.
    const groups = sample.text.split(' ');
    expect(groups).toEqual(['149ØØ', '1bbbb', '11622', 'bb', 'bbb', 'bbbb']);
  });

  it('carries no word marks and prints at matrix position 35, double-spaced', () => {
    expect(sample.wordMarks.some(Boolean)).toBe(false);
    expect(sample.matrixPos).toBe(35);
    expect(sample.spacingBefore).toBe('double');
    expect(sample.id).toBe('S');
  });

  it('reproduces the same log\'s storage-scan line `# ØØØØØ`', () => {
    const scan = formatPrintout('#', { address: 0 });
    expect(scan.id).toBe('#');
    expect(scan.text).toBe('ØØØØØ');
    expect(scan.underline.some(Boolean)).toBe(false);
    expect(scan.spacingBefore).toBe('single');
    expect(scan.matrixPos).toBe(35);
  });
});

describe('the other print-out IDs (§2 print-out table, §3 MODE rotary)', () => {
  it('B is MODE = ADDRESS SET: the 5-digit address the operator typed, single-spaced', () => {
    const b = formatPrintout('B', { address: 2000 });
    expect(b.id).toBe('B');
    expect(b.text).toBe('Ø2ØØØ');
    expect(b.spacingBefore).toBe('single');
    expect(b.matrixPos).toBe(35);
  });

  it('C is MODE = I/E CYCLE: same layout as S, double-spaced', () => {
    const c = formatPrintout('C', {
      iar: 2194, aar: 1250, bar: 0,
      op: BLANK_WITH_C, opMod: BLANK_WITH_C,
      ch1Unit: null, ch2Unit: null,
    });
    expect(c.id).toBe('C');
    expect(c.text).toBe('Ø2194 Ø125Ø ØØØØØ bb bbb bbbb');
    expect(c.spacingBefore).toBe('double');
    expect(c.matrixPos).toBe(35);
  });

  it('E is the error stop, same fields as S', () => {
    const e = formatPrintout('E', { iar: 1, aar: 2, bar: 3 });
    expect(e.text).toBe('ØØØØ1 ØØØØ2 ØØØØ3 bb bbb bbbb');
    expect(e.underline.some(Boolean)).toBe(false);   // omitted ≠ absent parity
  });

  it('R prints program text at matrix 30 with real blanks and slashed zeros', () => {
    // From the same log: `R DATE 64Ø15` and `R SØ1 JOB  SAMPLE` — real spaces on the paper,
    // which is the evidence that the log's other `b`s are a rendering and not the ID's doing.
    expect(formatPrintout('R', { text: 'DATE 64015' }).text).toBe('DATE 64Ø15');
    const job = formatPrintout('R', { text: 'S01 JOB  SAMPLE' });
    expect(job.id).toBe('R');
    expect(job.text).toBe('SØ1 JOB  SAMPLE');
    expect(job.matrixPos).toBe(30);
    expect(job.spacingBefore).toBe('single');
  });

  it('the letter O is not slashed, only the digit zero (C28-0351-5 p.2)', () => {
    expect(formatPrintout('I', { text: 'LOOP 100' }).text).toBe('LOOP 1ØØ');
  });

  it('R underlines the invalid characters the caller marks', () => {
    const r = formatPrintout('R', { text: 'AB', underline: [false, true] });
    expect(underlinedAt(r.underline)).toEqual([1]);   // the flags index `text`, not `id + text`
  });

  it('A carries operator-typed data at matrix 30, word marks included', () => {
    const a = formatPrintout('A', { text: 'AC', wordMarks: [true, false] });
    expect(a.id).toBe('A');
    expect(a.text).toBe('AC');
    expect(a.wordMarks).toEqual([true, false]);
    expect(a.matrixPos).toBe(30);
  });

  it('D is the typed address at 35, then the storage line at 30', () => {
    expect(formatPrintout('D', { address: 0 })).toMatchObject({ id: 'D', text: 'ØØØØØ', matrixPos: 35 });
    expect(formatPrintout('D', { text: 'ABC' })).toMatchObject({ id: 'D', text: 'ABC', matrixPos: 30 });
  });
});

describe('parity underlining (§2: underscore for invalid parity)', () => {
  it('underlines an Op register whose check bit is wrong', () => {
    // Blank is octal 00; odd parity puts the C bit on by itself (registers.ts BLANK_WITH_C).
    // A blank WITHOUT its C bit is even parity — the machine prints it underscored.
    const bad = formatPrintout('S', { iar: 0, aar: 0, bar: 0, op: BLANK_WITH_C & ~C, opMod: BLANK_WITH_C });
    expect(bad.text).toBe('ØØØØØ ØØØØØ ØØØØØ bb bbb bbbb');
    expect(underlinedAt(bad.underline)).toEqual([18]);   // the Op character alone
  });

  it('a null field is blanks-and-underlined; an omitted field is blanks and plain', () => {
    const nulled = formatPrintout('S', { iar: null });
    expect(nulled.text.slice(0, 5)).toBe('bbbbb');
    expect(underlinedAt(nulled.underline)).toEqual([0, 1, 2, 3, 4]);
  });
});
