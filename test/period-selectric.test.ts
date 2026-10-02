// Tier 1 — THE PHASE-4 ORACLE (plan §6.1, §12.1 T1, §12.3, §13 criterion 7).
//
// WHICH MACHINE: the IBM 1415 Console's modified Selectric I/O printer — the 1410's only stop,
// display, alter and inquiry output (A22-0526-3 p.45, Fig.42 p.46; S223-2648 Fig.5 p.9). Not
// the 1403 chain printer, and not a 1401 console.
//
// THERE IS NO GOLDEN FILE FOR THIS TEST. The expectation is a SLICE of
// docs/research/console-and-physical.md taken at test time: the fenced block under the heading
// "### Real console log sample (1410 OS job, Appendix C Exhibit II)" — the fence markers at
// research lines 59 and 79 — NINETEEN content lines, transcribed verbatim from C28-0326-2
// Appendix C Exhibit II p.55 [verified]. The block is located by its heading and its fences rather
// than by those line numbers, so an edit above §2 moves the slice instead of breaking it.
// Slicing beats copying because a copy is a second transcription of a primary source, free to
// drift from the research file that justifies it while both stay internally consistent; a slice
// cannot drift (§12.3). The mechanism ships already in test/rpg-columns-vs-research.test.ts.
//
// ONE ROW IS EXCLUDED, BY NAME: `D bbbb...`, the fourth content line. It is a literal ELISION —
// the three dots stand for storage contents the manual's page never printed — so it is not a
// renderable `ConsoleLine` and no `formatPrintout` call produces it. EIGHTEEN lines remain, and a
// later reader who restores it is contradicting this sentence rather than filling a silence
// (§14 R4, §16 item 6).
//
// `PRINTED_BLANK` (src/core/printout.ts:40) is the one INHERITED constant this oracle keys on:
// every `b` in `S 149ØØ 1bbbb 11622 bb bbb bbbb` comes from it. It is `[unverified]`, it is core's,
// and Phase 4 cannot flip it — §2 states the small `b` only of LOAD-MODE console printing
// (A22-0526-3 p.49) and the same Exhibit II block shows real spaces in `R SØ1 JOB  SAMPLE`. It is
// CITED here and never redeclared. If a primary re-read moves it, the fix is a src/core
// escalation with a price: ONE constant at printout.ts:40, and the cc01 transcript moves with
// it. This expectation then moves WITH the research file it slices, not against it (§15).
//
// The byte comparison runs at { matrix: 'flush', marks: 'strip', spacing: 'ignore' } on purpose:
// the block carries no combining mark anywhere in U+0300-U+036F, it has no blank line before its
// `S` row although §2's layout table says "double", and the matrix indent's ORIGIN is `[likely]`
// (MATRIX_POSITION_IS_A_FIVE_COLUMN_INDENT). Each of the three switches is then asserted as its
// own named case, together with the fold-equivalence internals/panel.ts depends on.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { formatPrintout } from '../src/core/printout.js';
import { BLANK_WITH_C } from '../src/core/registers.js';
import type { ConsoleLine } from '../src/core/types.js';
import {
  MATRIX_POSITION_IS_A_FIVE_COLUMN_INDENT,
  renderSelectric,
  toSelectric,
} from '../src/ui/period/console/selectric.js';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const RESEARCH = join(REPO_ROOT, 'docs/research/console-and-physical.md');

/** The elided row, named once so the exclusion is greppable from either direction. */
const ELIDED_ROW = 'D bbbb...';

/** The fenced block under §2's Exhibit II heading, content lines only. */
function exhibitTwo(): readonly string[] {
  const lines = readFileSync(RESEARCH, 'utf8').split('\n');
  const heading = lines.findIndex((l) => l.startsWith('### Real console log sample'));
  if (heading < 0) throw new Error('console-and-physical.md §2: Exhibit II heading not found');
  const open = lines.indexOf('```', heading);
  const close = lines.indexOf('```', open + 1);
  if (open < 0 || close < 0) throw new Error('console-and-physical.md §2: Exhibit II fence not found');
  return lines.slice(open + 1, close);
}

const SAMPLE = exhibitTwo();
const EXPECTED = SAMPLE.filter((l) => l !== ELIDED_ROW);

// The state behind the `S` row, exactly as test/printout.test.ts builds it: IAR 14900, BAR 11622,
// an AAR holding a 1 in its high-order position and blanks below, blank Op / Op-modifier and
// channel registers, and NO channel unit-select/unit-number registers at all — which is why that
// 4-character group prints underlined (§2: "underline any register field whose contents have bad
// or absent parity"; A22-0526-3 Fig.42 p.46; S223-2648 p.6).
const STOP_LINE = formatPrintout('S', {
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

/** The program's replies, authored with PLAIN zeros: the slashing is the formatter's job. */
const REPLIES: readonly string[] = [
  'DATE 64015',
  'S01 JOB  SAMPLE',
  'ASGN MJB,A1',
  'MODE GO',
  'ASGN MGO,A6',
  'EXEQ AUTOCODER',
  '10101 NR1 M@4014400W',
  'EXEQ LINKLOAD',
  'EXEQ SAMPLE,MJB',
  '  EOJ',
  'END',
  'END SIU',
  'ENTER B MESSAGES',
];

// Every remaining row through `formatPrintout` with the fields §2's layout table gives: the two
// `#` storage-scan-set lines (5-digit address, matrix 35), the `S` normal stop, the `D` address
// line, the `A` alter line, and the thirteen `R` console replies (free text, matrix 30).
const LOG: readonly ConsoleLine[] = [
  formatPrintout('#', { address: 0 }),
  STOP_LINE,
  formatPrintout('D', { address: 0 }),
  formatPrintout('A', { text: 'AC%B000012$N' }),
  ...REPLIES.map((text) => formatPrintout('R', { text })),
  formatPrintout('#', { address: 0 }),
];

const FLUSH = { matrix: 'flush', marks: 'strip', spacing: 'ignore' } as const;

describe('the 1415 Selectric renderer against Exhibit II (console-and-physical.md §2)', () => {
  it('slices nineteen content lines and finds the elided `D bbbb...` row among them', () => {
    expect(SAMPLE).toHaveLength(19);
    expect(SAMPLE).toContain(ELIDED_ROW);
    expect(EXPECTED).toHaveLength(18);
    expect(LOG).toHaveLength(18);
  });

  it('THE ORACLE: renders the eighteen lines BYTE FOR BYTE at {flush, strip, ignore}', () => {
    expect(renderSelectric(LOG, FLUSH)).toBe(EXPECTED.join('\n'));
  });

  it("spacing:'render' puts a blank line before every S/C/E line and before nothing else", () => {
    const half = formatPrintout('C', { iar: 1, aar: 2, bar: 3 });
    const error = formatPrintout('E', { iar: 1, aar: 2, bar: 3 });
    const reply = formatPrintout('R', { text: 'END' });
    const opts = { ...FLUSH, spacing: 'render' } as const;
    for (const stop of [STOP_LINE, half, error]) {
      expect(renderSelectric([reply, stop], opts).split('\n')).toHaveLength(3);
      expect(renderSelectric([reply, stop], opts).split('\n')[1]).toBe('');
      expect(toSelectric([stop])[0]?.blankBefore).toBe(true);
    }
    expect(renderSelectric([reply, reply], opts).split('\n')).toHaveLength(2);
    expect(toSelectric([reply])[0]?.blankBefore).toBe(false);
  });

  it("marks:'render' underlines all four characters of the absent CH1+CH2 group", () => {
    const rendered = renderSelectric([STOP_LINE], { ...FLUSH, marks: 'render' });
    // U+0332 combining low line, one per character, and only on the trailing 4-character group.
    expect(rendered.endsWith(' b̲b̲b̲b̲')).toBe(true);
    expect([...rendered].filter((ch) => ch === '̲')).toHaveLength(4);
    expect(renderSelectric([STOP_LINE], FLUSH)).not.toContain('̲');
  });

  it("marks:'render' puts the combining caron U+030C over a word-marked character", () => {
    const alter = formatPrintout('A', { text: 'AC', wordMarks: [true, false] });
    expect(renderSelectric([alter], { ...FLUSH, marks: 'render' })).toBe('A ǍC');
    expect(renderSelectric([alter], FLUSH)).toBe('A AC');
    expect(toSelectric([alter])[0]?.cells[0]).toEqual({ glyph: 'A', wordMark: true, underline: false });
  });

  it("matrix:'indent' renders a 35-line five columns right of a 30-line", () => {
    // MATRIX_POSITION_IS_A_FIVE_COLUMN_INDENT, `[likely]`: the DIFFERENCE, never an absolute
    // column (S223-2648 Fig.5 p.9; A22-0526-3 Fig.42 p.46 — positions, no unit, no origin). The
    // ID prints in position 1 (S223-2648 p.6), so the indent precedes the ID character.
    const address = formatPrintout('D', { address: 0 });   // matrix 35
    const data = formatPrintout('D', { text: 'ABC' });     // matrix 30
    expect(address.matrixPos - data.matrixPos).toBe(5);
    expect(MATRIX_POSITION_IS_A_FIVE_COLUMN_INDENT).toBe(30);
    const lines = renderSelectric([address, data], { ...FLUSH, matrix: 'indent' }).split('\n');
    expect(lines[0]).toBe('     D ØØØØØ');
    expect(lines[1]).toBe('D ABC');
    expect(renderSelectric([address], FLUSH)).toBe('D ØØØØØ');
  });

  it('slashes the graphic zero and leaves the letter O unslashed (C28-0351-5 p.2)', () => {
    const rendered = renderSelectric(LOG, FLUSH);
    expect(rendered).toContain('R EXEQ AUTOCODER');    // the O of AUTOCODER, unslashed
    expect(rendered).toContain('R MODE GO');           // and of MODE GO
    expect(rendered).toContain('# ØØØØØ');             // five slashed zeros
    expect(rendered).not.toContain('0');
  });

  it('keeps load-mode `b` and a real space two distinct things', () => {
    // PRINTED_BLANK (printout.ts:40) is where the S line's `b`s come from; the R line in the same
    // Exhibit II block carries real spaces, which is why that constant stays `[unverified]`.
    expect(STOP_LINE.text).toBe('149ØØ 1bbbb 11622 bb bbb bbbb');
    const job = formatPrintout('R', { text: 'S01 JOB  SAMPLE' });
    expect(renderSelectric([job], FLUSH)).toBe('R SØ1 JOB  SAMPLE');
    expect(job.text).not.toContain('b');
    expect(EXPECTED).toContain('R SØ1 JOB  SAMPLE');
  });

  it("reproduces panel.ts's deleted renderConsoleLine byte for byte (the wave-1 fold)", () => {
    const corpus: readonly ConsoleLine[] = [
      ...LOG,
      formatPrintout('A', { text: 'AC%B000012$N', wordMarks: [true, false, false, true] }),
      formatPrintout('R', { text: 'AB', underline: [false, true] }),
      { id: null, text: 'A0', wordMarks: [true, false], underline: [false, true],
        spacingBefore: 'double', matrixPos: 30 },
    ];
    const opts = { matrix: 'flush', marks: 'render', spacing: 'render' } as const;
    expect(renderSelectric(corpus, opts)).toBe(corpus.map(oldRenderConsoleLine).join('\n'));
  });
});

// panel.ts:65-74 as it stood before the fold, inlined here as the reference implementation so the
// equivalence is checked against the old BYTES and not against a description of them.
const WORD_MARK_OVER = '̌';
const UNDERLINE_UNDER = '̲';
function oldRenderConsoleLine(l: ConsoleLine): string {
  const body = [...l.text]
    .map((ch, i) => ch + (l.wordMarks[i] ? WORD_MARK_OVER : '') + (l.underline[i] ? UNDERLINE_UNDER : ''))
    .join('');
  return (l.spacingBefore === 'double' ? '\n' : '') + (l.id === null ? body : `${l.id} ${body}`);
}
