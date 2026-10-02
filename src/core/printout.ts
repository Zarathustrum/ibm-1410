// src/core/printout.ts — the 1415 console typewriter print-out lines.
// Source: research/console-and-physical.md §2 (A22-0526-3 Fig.42 p.46, p.49; S223-2648 Fig.5
// p.9, p.6; C28-0326-2 Appendix C Exhibit II p.55); docs/plans/architecture.md §4.11, §8.
//
// The 1410 shows NO register contents in lights — every stop, display, alter and inquiry goes
// out on the Selectric as one of these fixed-format lines. Pure text plus per-character flags;
// the terminal harness and the browser both render the same `ConsoleLine`.
//
// **The `ConsoleLine` convention, one for every producer of one** (this file and
// devices/console1415.ts): `text` is the BARE content — the fields, or the message. The ID
// character lives in `id` and is never inside `text`, so `wordMarks[i]` and `underline[i]` index
// `text` from 0. A renderer prints `id === null ? text : id + ' ' + text` (tools/run-cor.ts, and
// the browser console later). §2's print-out table is written the same way: an "ID char" column
// and a separate "Fields printed" column.
//
// Two blank renderings, and the difference is real (§2 and the Exhibit II log):
//   - fixed-format print-out fields (S C E B #) print a blank as a small `b` — see
//     `PRINTED_BLANK`, which is a FALLBACK, not a verified fact.
//   - free text (D data, A, I, R) prints a blank as a blank — the log has `R SØ1 JOB  SAMPLE`
//     and `R DATE 64Ø15` with real spaces.
// The graphic zero is slashed (Ø) in both; the letter O is not (C28-0351-5 p.2).

import { glyphOf, parity } from './bcd.js';
import { BCD6, C, WM, type Cell, type ConsoleLine } from './types.js';

export type PrintoutId = 'S' | 'C' | 'E' | 'B' | '#' | 'D' | 'A' | 'I' | 'R';

/** Slashed graphic zero; the letter O is left unslashed (C28-0351-5 p.2). */
export const SLASHED_ZERO = 'Ø';
/**
 * How a blank prints inside a fixed-format field.
 *
 * OPEN: open-questions.md console row. §2 states the `b` only of LOAD-MODE console printing ("In
 * load-mode console printing, blanks print as a small `b`", A22-0526-3 p.49) and nowhere says the
 * S/C/E/B/# stop print-out is one. The Exhibit II log is evidence in the other direction as much
 * as for it: it is introduced with "blanks as `b`" as a TRANSCRIPTION convention, and the
 * `R SØ1 JOB  SAMPLE` line in the same block shows spaces, not `b`s. So `b` here is the chosen
 * fallback, display-only — nothing downstream may key on it.
 */
export const PRINTED_BLANK = 'b';

/**
 * One fixed-format field.
 *   number     — a magnitude, zero-filled to the field width (our address registers).
 *   string     — literal register contents, left-aligned and blank-filled to the width. The
 *                escape hatch for what a magnitude cannot say: the Exhibit II log's AAR prints
 *                `1bbbb`, i.e. a 1 in the high-order position and blanks below it, which no
 *                number models.
 *   null       — contents with bad or absent parity: blanks, UNDERLINED (§2: "In the real log
 *                the empty group prints as underlined `bbbb` — i.e. underline any register
 *                field whose contents have bad or absent parity").
 *   omitted    — blanks with valid parity: printed, not underlined (the log's `bbb` A/B/
 *                assembly-channel group).
 */
export type RegisterField = number | string | null;

export interface PrintoutFields {
  iar?: RegisterField;
  aar?: RegisterField;
  bar?: RegisterField;
  /** Op and Op-modifier registers as cell bytes; they print as ONE 2-character group. */
  op?: Cell | null;
  opMod?: Cell | null;
  /** A-channel / B-channel / assembly channel — one 3-character group. */
  aChannel?: Cell | null;
  bChannel?: Cell | null;
  assemblyChannel?: Cell | null;
  /** CH1 and CH2 unit-select + unit-number, 2 characters each, ONE 4-character group. */
  ch1Unit?: RegisterField;
  ch2Unit?: RegisterField;
  /** The 5-digit address for `B` (address set), `#` (storage scan set) and the `D` address line. */
  address?: RegisterField;
  /** Free text for the `D` data line and for `A` / `I` / `R`. */
  text?: string;
  wordMarks?: readonly boolean[];
  underline?: readonly boolean[];
}

interface Piece { text: string; underline: boolean[] }

const glyphMap = (g: string, blank: string): string =>
  g === ' ' ? blank : g === '0' ? SLASHED_ZERO : g;

/** A cell as it prints, with its parity verdict. Odd parity over BA8421 + WM + C (charset.md §1). */
function cellPiece(cell: Cell | null | undefined, blank: string): Piece {
  if (cell === null) return { text: blank, underline: [true] };
  if (cell === undefined) return { text: blank, underline: [false] };
  const bad = (cell & C) !== parity(cell & BCD6, (cell & WM) !== 0);
  return { text: glyphMap(glyphOf(cell & BCD6), blank), underline: [bad] };
}

function fieldPiece(value: RegisterField | undefined, width: number): Piece {
  const flag = value === null;
  const raw = value === null || value === undefined
    ? ' '.repeat(width)
    : typeof value === 'number'
      ? String(value).padStart(width, '0').slice(-width)
      : value.padEnd(width, ' ').slice(0, width);
  return {
    text: [...raw].map((ch) => glyphMap(ch, PRINTED_BLANK)).join(''),
    underline: Array.from({ length: width }, () => flag),
  };
}

function join(pieces: readonly Piece[], sep: string): Piece {
  const gap: boolean[] = Array.from({ length: sep.length }, () => false);
  let text = '';
  const underline: boolean[] = [];
  pieces.forEach((p, i) => {
    if (i > 0) { text += sep; underline.push(...gap); }
    text += p.text;
    underline.push(...p.underline);
  });
  return { text, underline };
}

/** `text` is the body alone; `id` carries the ID character, and the flags index `text` from 0. */
function line(
  id: PrintoutId,
  body: Piece,
  spacingBefore: 'single' | 'double',
  matrixPos: 30 | 35,
  wordMarks?: readonly boolean[],
): ConsoleLine {
  return {
    id,
    text: body.text,
    wordMarks: Array.from({ length: body.text.length }, (_, i) => wordMarks?.[i] ?? false),
    underline: body.underline,
    spacingBefore,
    matrixPos,
  };
}

/**
 * One console print-out line. §2's layout table drives every branch:
 *   S (normal stop) / C (half cycle, MODE = I/E CYCLE) / E (error stop) — double spacing,
 *     matrix 35, the full field line: IAR(5) AAR(5) BAR(5), Op+OpMod as ONE 2-character group,
 *     A/B/assembly channel (3), CH1+CH2 unit select/number as ONE 4-character group with NO
 *     inner space (Fig.42 prints it `XXXX`).
 *   B (address set; `#` if the CE address-entry switch is not NORMAL) and # (storage scan set)
 *     — single spacing, matrix 35, the 5-digit address the operator typed.
 *   D — the address line (matrix 35) when `address` is given, the storage-contents line
 *     (matrix 30) when `text` is.
 *   A / I / R — single spacing, matrix 30, free text; `R` underlines invalid characters, which
 *     the caller supplies as `underline`.
 */
export function formatPrintout(id: PrintoutId, f: PrintoutFields = {}): ConsoleLine {
  switch (id) {
    case 'S':
    case 'C':
    case 'E': {
      const body = join([
        fieldPiece(f.iar, 5),
        fieldPiece(f.aar, 5),
        fieldPiece(f.bar, 5),
        join([cellPiece(f.op, PRINTED_BLANK), cellPiece(f.opMod, PRINTED_BLANK)], ''),
        join([
          cellPiece(f.aChannel, PRINTED_BLANK),
          cellPiece(f.bChannel, PRINTED_BLANK),
          cellPiece(f.assemblyChannel, PRINTED_BLANK),
        ], ''),
        join([fieldPiece(f.ch1Unit, 2), fieldPiece(f.ch2Unit, 2)], ''),
      ], ' ');
      return line(id, body, 'double', 35);
    }
    case 'B':
    case '#':
      return line(id, fieldPiece(f.address, 5), 'single', 35);
    case 'D':
      return f.text === undefined
        ? line(id, fieldPiece(f.address, 5), 'single', 35)
        : line(id, textPiece(f), 'single', 30, f.wordMarks);
    default:
      return line(id, textPiece(f), 'single', 30, f.wordMarks);
  }
}

/** Free text: blanks stay blanks, zeros are still slashed, caller-supplied underlines survive. */
function textPiece(f: PrintoutFields): Piece {
  const raw = f.text ?? '';
  return {
    text: [...raw].map((ch) => glyphMap(ch, ' ')).join(''),
    underline: [...raw].map((_, i) => f.underline?.[i] ?? false),
  };
}
