// ═══ src/ui/period/console/selectric.ts · WAVE 1 ═══ imports ConsoleLine as a TYPE, nothing else.
// Plan: docs/plans/phase-4-period-ui.md §4.5 (the four types and the two functions) and §6.1 (the
// three option switches, and the oracle that pins them).
//
// WHICH MACHINE: the IBM 1415 Console's modified Selectric I/O printer — the 1410's ONLY output
// for a stop, a display, an alter or an inquiry, because the 1410 shows no register contents in
// lights (research/console-and-physical.md §2; A22-0526-3 p.45, Fig.42 p.46; S223-2648 Fig.5 p.9).
// Not the 1403 chain printer, and not a 1401 console: the 1401's operator dials have no equivalent
// here (console-and-physical.md §1, A22-0526-3 pp.50-51).
//
// Consumed by BOTH surfaces — the period console's logView.ts (wave 4) and internals/panel.ts —
// and it is one of the phase's exactly two cross-surface imports, the other being `keyed` going the
// other way (§3.8). That is the whole reason it is a pure function over `ConsoleLine` and imports
// nothing but a type.
//
// The two combining-mark constants below arrive from panel.ts:65-66 together with the four-line
// comment at panel.ts:61-64 that was their ONLY in-code citation. Wave 1's fold moves that
// citation here rather than deleting it with the block (§3.2, §6.1, §16 item 1) — verbatim:
//
//   The Selectric overstrikes, as combining marks — the same pair `tools/run-cor.ts` prints, so the
//   terminal transcript and the browser log render one `ConsoleLine` identically: an inverted
//   circumflex over a word-marked character, an underscore under one with invalid parity
//   (research/console-and-physical.md §2, A22-0526-3 p.49; S223-2648 p.6).
//
// What this file deliberately does NOT do:
//   - no DOM of any kind — it is on test/period-is-dom-free.test.ts's required-path list, and the
//     views that consume it compute nothing;
//   - no reveal and NEVER a clock — the Selectric's [verified] 932 cpm (A22-0526-3 p.45) is a
//     display rate over an already-final log and belongs to logView.ts (§6.1, architecture.md §12);
//   - no field formatting. `src/core/printout.ts` owns the fixed-format layout and the slashed
//     zero; this file only puts a finished `ConsoleLine` onto paper.

import type { ConsoleLine } from '../../../core/types.js';

export interface SelectricCell {
  readonly glyph: string; readonly wordMark: boolean; readonly underline: boolean;
}

export interface SelectricLine {
  readonly id: ConsoleLine['id'];        // 'S'|'C'|'E'|'B'|'#'|'D'|'A'|'I'|'R'|null
  readonly blankBefore: boolean;         // from spacingBefore === 'double'
  readonly column: 30 | 35;              // from matrixPos
  readonly cells: readonly SelectricCell[];
}

/** The phase's whole oracle discipline in one signature — plan §6.1 argues each switch. */
export interface SelectricOpts {
  readonly matrix: 'indent' | 'flush';   // 'indent' = matrixPos − 30 leading spaces
  readonly marks: 'render' | 'strip';    // U+030C over a word mark, U+0332 under bad parity
  readonly spacing: 'render' | 'ignore'; // a blank line before a double-spaced line
}

/** Combining caron U+030C: the inverted circumflex a word mark overstrikes onto its character. */
const WORD_MARK_OVER = '̌';
/** Combining low line U+0332: the underscore the error feature prints under bad parity. */
const UNDERLINE_UNDER = '̲';

/**
 * OPEN: `MATRIX_POSITION_IS_A_FIVE_COLUMN_INDENT` — `[likely]`. §2 records the positions
 * themselves as [verified]: "S / C / E / B / `#` / D (address line) print-outs occupy matrix
 * position 35; the Display data line, Alter, Console Inquiry and Console Reply occupy matrix
 * position 30" (S223-2648 Fig.5 p.9; A22-0526-3 Fig.42 p.46). Neither figure gives a unit, an
 * origin or a left margin — Fig.5's column widths are schematic glyph runs, not a ruler.
 * Wave 0's bounded read (open-questions.md, Phase 4 / Wave 0, target (a)) NARROWED the question
 * without closing it: S223-2648 p.6 says Fig.5 "shows the printing layout and the special
 * character that prints in position 1 to identify each type of operation", so the number is
 * attached to the line's FIRST PRINTED CHARACTER — the ID character — and cannot be a print-line
 * column counted from the paper's left edge. It stays `[likely]`.
 * THE SPLIT, because the name reads like a claim about the number and is not one: 30 and 35
 * are the `[verified]` matrix positions §2 publishes, so the VALUE below is not the open part.
 * What is `[likely]` is the RULING that takes 30 as the ORIGIN — render the 30-group flush and
 * the 35-group five columns right of it — which no page states, because no page says what the
 * positions are counted from. The open question is the origin, not the number.
 * FALLBACK: render the DIFFERENCE and never an absolute column. This constant is the origin the
 * indent subtracts, so a 35-line sits five columns right of a 30-line and no claim is made about
 * where either sits on the form; and because the ID prints in position 1, the indent precedes the
 * ID rather than sitting between it and the body.
 * The primary-source byte comparison in test/period-selectric.test.ts runs at `matrix: 'flush'`
 * PRECISELY so it does not depend on this ruling (§12.1 T1); only the browser passes `'indent'`.
 * WHAT WOULD SETTLE IT: a definition of "matrix position" elsewhere in S223-2648's 97 pages, or a
 * Fig.42 render carrying a margin. If the origin is ever settled, this one number changes and no
 * golden moves. Plan §4.5, §6.1, §15; `open-questions.md`, Phase 4.
 */
export const MATRIX_POSITION_IS_A_FIVE_COLUMN_INDENT = 30;

/**
 * A `ConsoleLine` as the Selectric holds it: the ID and the two carriage decisions kept apart from
 * the body, and one cell per character of `text` zipped with its two per-character flags.
 * `printout.ts:9-14`'s convention is that `text` is the BARE content and the flags index it from 0.
 */
export function toSelectric(lines: readonly ConsoleLine[]): readonly SelectricLine[] {
  return lines.map((l) => ({
    id: l.id,
    blankBefore: l.spacingBefore === 'double',
    column: l.matrixPos,
    cells: [...l.text].map((glyph, i) => ({
      glyph,
      wordMark: l.wordMarks[i] === true,
      underline: l.underline[i] === true,
    })),
  }));
}

/**
 * The log as it reads on the paper, lines joined with '\n'.
 *
 * The ID goes back on as `id === null ? body : id + ' ' + body` — printout.ts:8-14's convention for
 * every producer of a `ConsoleLine`, which `tools/run-cor.ts` implements the same way.
 *
 * At `{ matrix: 'flush', marks: 'render', spacing: 'render' }` this reproduces byte for byte what
 * `internals/panel.ts`'s deleted private `renderConsoleLine` produced (§6.1's fold), which is what
 * lets one renderer serve both surfaces.
 */
export function renderSelectric(lines: readonly ConsoleLine[], opts: SelectricOpts): string {
  return toSelectric(lines).map((l) => renderLine(l, opts)).join('\n');
}

function renderLine(l: SelectricLine, opts: SelectricOpts): string {
  const body = l.cells.map((c) => renderCell(c, opts)).join('');
  const printed = l.id === null ? body : `${l.id} ${body}`;
  // The blank line comes before the indent: it is a carriage space, not part of this line's text.
  const blank = opts.spacing === 'render' && l.blankBefore ? '\n' : '';
  const indent = opts.matrix === 'indent'
    ? ' '.repeat(l.column - MATRIX_POSITION_IS_A_FIVE_COLUMN_INDENT)
    : '';
  return blank + indent + printed;
}

/** Caron THEN underscore, the order panel.ts printed them in and the order the transcript holds. */
function renderCell(c: SelectricCell, opts: SelectricOpts): string {
  if (opts.marks === 'strip') return c.glyph;
  return c.glyph + (c.wordMark ? WORD_MARK_OVER : '') + (c.underline ? UNDERLINE_UNDER : '');
}
