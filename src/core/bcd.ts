// src/core/bcd.ts — the 64-character Standard BCD Interchange Code, in collating order.
// Transcribed from research/charset.md §2, whose source of record is IBM 1410 Principles of
// Operation A22-0526-3, Figure 2 "Standard BCD Interchange Code", p.6. The order of the rows
// below IS the 1410 collating sequence (research/charset.md §4, A22-0526-3 pp.5-6): blank
// lowest at rank 00, `9` highest at rank 63. It is not the numeric order of the 6-bit code.
//
// Octal notation throughout is the manual's: B=40, A=20, 8=10, 4=4, 2=2, 1=1
// (research/charset.md §1).
//
// The arithmetic digit-coding table (blank -> 0, `&`/`-`/substitute blank -> 0, group mark -> 7,
// `#` -> 3 — research/charset.md §6.2) is deliberately NOT here; it belongs to the ALU wave.

import { BCD6 } from './types.js';

export interface BcdEntry {
  readonly rank: number;        // collating rank 00..63 — research/charset.md §4
  readonly bcd: number;         // 6-bit BA8421 value, 0..63
  readonly octal: string;       // the manual's own two-digit octal, e.g. '77' for the group mark
  readonly c: number;           // C bit AS STORED with NO word mark: 0x40 or 0 — invert if WM
  readonly hollerith: string;   // card punches, '12-7-8'; 'none' for blank
  readonly glyph: string;       // the 1410 A2 print glyph (see the glyph note below)
  readonly name: string;        // the manual's name, for the 16 codes with no ordinary glyph
}

// The 1403 print chain this file's glyph column is written for. Display only: the chain changes
// which glyph a code PRINTS, never its bits, punches or collating rank.
export const PRINT_CHAIN = 'A2' as const;   // OPEN: plan §10 / charset.md §5 — display only

// GLYPH CHOICES where research/charset.md prints two candidates:
//  - The `1410 A2 glyph` column is used throughout, not the H2 column, because PRINT_CHAIN above
//    is A2 (docs/plans/phase-1-cpu-core.md §10 `[unverified]` fallback, research/charset.md §5.1).
//    So rank 06 is `&` not `+`, rank 15 is `%` not `(`, rank 21 is `@` not `'`, rank 02 is the
//    lozenge.
//  - GROUP MARK, rank 05, is `⧧` and RECORD MARK, rank 45, is `‡` — research/charset.md §2 (as
//    corrected 2026-08-29, commit 68ba52e, which gave the group mark its own glyph) and
//    research/architecture.md §2 now agree on that pair, and it is what keeps the glyph mapping a
//    bijection. Same bits, same punches, either way.
//  - WORD SEPARATOR, rank 16, is `⌒` and SEGMENT MARK, rank 18, is `⧻`, both per
//    research/charset.md §2. SUBSTITUTE BLANK, rank 19, is `ƀ`; TAPE MARK (radical), rank 24, is
//    `√`; MODE CHANGE, rank 11, is `Δ`.
//  - BLANK, rank 00, is a real space ' ' — distinct from the substitute blank, see BLANK_TRAP.
export const BCD_TABLE: readonly BcdEntry[] = [
  { rank:  0, bcd: 0o00, octal: '00', c: 0x40, hollerith: 'none',   glyph: ' ', name: 'blank' },
  { rank:  1, bcd: 0o73, octal: '73', c: 0x00, hollerith: '12-3-8', glyph: '.', name: 'period' },
  { rank:  2, bcd: 0o74, octal: '74', c: 0x40, hollerith: '12-4-8', glyph: '⌑', name: 'lozenge' },
  { rank:  3, bcd: 0o75, octal: '75', c: 0x00, hollerith: '12-5-8', glyph: '[', name: 'left bracket' },
  { rank:  4, bcd: 0o76, octal: '76', c: 0x00, hollerith: '12-6-8', glyph: '<', name: 'less than' },
  { rank:  5, bcd: 0o77, octal: '77', c: 0x40, hollerith: '12-7-8', glyph: '⧧', name: 'group mark' },
  { rank:  6, bcd: 0o60, octal: '60', c: 0x40, hollerith: '12',     glyph: '&', name: 'ampersand' },
  { rank:  7, bcd: 0o53, octal: '53', c: 0x40, hollerith: '11-3-8', glyph: '$', name: 'dollar' },
  { rank:  8, bcd: 0o54, octal: '54', c: 0x00, hollerith: '11-4-8', glyph: '*', name: 'asterisk' },
  { rank:  9, bcd: 0o55, octal: '55', c: 0x40, hollerith: '11-5-8', glyph: ']', name: 'right bracket' },
  { rank: 10, bcd: 0o56, octal: '56', c: 0x40, hollerith: '11-6-8', glyph: ';', name: 'semicolon' },
  { rank: 11, bcd: 0o57, octal: '57', c: 0x00, hollerith: '11-7-8', glyph: 'Δ', name: 'delta (mode change)' },
  { rank: 12, bcd: 0o40, octal: '40', c: 0x00, hollerith: '11',     glyph: '-', name: 'minus' },
  { rank: 13, bcd: 0o21, octal: '21', c: 0x40, hollerith: '0-1',    glyph: '/', name: 'slash' },
  { rank: 14, bcd: 0o33, octal: '33', c: 0x40, hollerith: '0-3-8',  glyph: ',', name: 'comma' },
  { rank: 15, bcd: 0o34, octal: '34', c: 0x00, hollerith: '0-4-8',  glyph: '%', name: 'percent' },
  { rank: 16, bcd: 0o35, octal: '35', c: 0x40, hollerith: '0-5-8',  glyph: '⌒', name: 'word separator' },
  { rank: 17, bcd: 0o36, octal: '36', c: 0x40, hollerith: '0-6-8',  glyph: '\\', name: 'backslash' },
  { rank: 18, bcd: 0o37, octal: '37', c: 0x00, hollerith: '0-7-8',  glyph: '⧻', name: 'segment mark' },
  { rank: 19, bcd: 0o20, octal: '20', c: 0x00, hollerith: '2-8',    glyph: 'ƀ', name: 'substitute blank' },
  { rank: 20, bcd: 0o13, octal: '13', c: 0x00, hollerith: '3-8',    glyph: '#', name: 'number sign' },
  { rank: 21, bcd: 0o14, octal: '14', c: 0x40, hollerith: '4-8',    glyph: '@', name: 'at sign' },
  { rank: 22, bcd: 0o15, octal: '15', c: 0x00, hollerith: '5-8',    glyph: ':', name: 'colon' },
  { rank: 23, bcd: 0o16, octal: '16', c: 0x00, hollerith: '6-8',    glyph: '>', name: 'greater than' },
  { rank: 24, bcd: 0o17, octal: '17', c: 0x40, hollerith: '7-8',    glyph: '√', name: 'tape mark (radical)' },
  { rank: 25, bcd: 0o72, octal: '72', c: 0x40, hollerith: '12-0',   glyph: '?', name: 'plus zero' },
  { rank: 26, bcd: 0o61, octal: '61', c: 0x00, hollerith: '12-1',   glyph: 'A', name: 'A' },
  { rank: 27, bcd: 0o62, octal: '62', c: 0x00, hollerith: '12-2',   glyph: 'B', name: 'B' },
  { rank: 28, bcd: 0o63, octal: '63', c: 0x40, hollerith: '12-3',   glyph: 'C', name: 'C' },
  { rank: 29, bcd: 0o64, octal: '64', c: 0x00, hollerith: '12-4',   glyph: 'D', name: 'D' },
  { rank: 30, bcd: 0o65, octal: '65', c: 0x40, hollerith: '12-5',   glyph: 'E', name: 'E' },
  { rank: 31, bcd: 0o66, octal: '66', c: 0x40, hollerith: '12-6',   glyph: 'F', name: 'F' },
  { rank: 32, bcd: 0o67, octal: '67', c: 0x00, hollerith: '12-7',   glyph: 'G', name: 'G' },
  { rank: 33, bcd: 0o70, octal: '70', c: 0x00, hollerith: '12-8',   glyph: 'H', name: 'H' },
  { rank: 34, bcd: 0o71, octal: '71', c: 0x40, hollerith: '12-9',   glyph: 'I', name: 'I' },
  // Rank 35, `!` minus zero: C = 0. B-8-2 is three bits, already odd, so the odd-parity rule of
  // research/charset.md §1 (A22-0526-3 p.5) gives 0 — exactly as it does for the record mark at
  // rank 45, which is A-8-2, the same bit count. research/charset.md §2 (as corrected 2026-08-29,
  // commit 68ba52e) prints 0 here too, so table and research now agree on all 64 rows. Recorded in
  // oracle/collate.json's `note` field.
  { rank: 35, bcd: 0o52, octal: '52', c: 0x00, hollerith: '11-0',   glyph: '!', name: 'minus zero' },
  { rank: 36, bcd: 0o41, octal: '41', c: 0x40, hollerith: '11-1',   glyph: 'J', name: 'J' },
  { rank: 37, bcd: 0o42, octal: '42', c: 0x40, hollerith: '11-2',   glyph: 'K', name: 'K' },
  { rank: 38, bcd: 0o43, octal: '43', c: 0x00, hollerith: '11-3',   glyph: 'L', name: 'L' },
  { rank: 39, bcd: 0o44, octal: '44', c: 0x40, hollerith: '11-4',   glyph: 'M', name: 'M' },
  { rank: 40, bcd: 0o45, octal: '45', c: 0x00, hollerith: '11-5',   glyph: 'N', name: 'N' },
  { rank: 41, bcd: 0o46, octal: '46', c: 0x00, hollerith: '11-6',   glyph: 'O', name: 'O' },
  { rank: 42, bcd: 0o47, octal: '47', c: 0x40, hollerith: '11-7',   glyph: 'P', name: 'P' },
  { rank: 43, bcd: 0o50, octal: '50', c: 0x40, hollerith: '11-8',   glyph: 'Q', name: 'Q' },
  { rank: 44, bcd: 0o51, octal: '51', c: 0x00, hollerith: '11-9',   glyph: 'R', name: 'R' },
  { rank: 45, bcd: 0o32, octal: '32', c: 0x00, hollerith: '0-2-8',  glyph: '‡', name: 'record mark' },
  { rank: 46, bcd: 0o22, octal: '22', c: 0x40, hollerith: '0-2',    glyph: 'S', name: 'S' },
  { rank: 47, bcd: 0o23, octal: '23', c: 0x00, hollerith: '0-3',    glyph: 'T', name: 'T' },
  { rank: 48, bcd: 0o24, octal: '24', c: 0x40, hollerith: '0-4',    glyph: 'U', name: 'U' },
  { rank: 49, bcd: 0o25, octal: '25', c: 0x00, hollerith: '0-5',    glyph: 'V', name: 'V' },
  { rank: 50, bcd: 0o26, octal: '26', c: 0x00, hollerith: '0-6',    glyph: 'W', name: 'W' },
  { rank: 51, bcd: 0o27, octal: '27', c: 0x40, hollerith: '0-7',    glyph: 'X', name: 'X' },
  { rank: 52, bcd: 0o30, octal: '30', c: 0x40, hollerith: '0-8',    glyph: 'Y', name: 'Y' },
  { rank: 53, bcd: 0o31, octal: '31', c: 0x00, hollerith: '0-9',    glyph: 'Z', name: 'Z' },
  { rank: 54, bcd: 0o12, octal: '12', c: 0x40, hollerith: '0',      glyph: '0', name: 'zero' },
  { rank: 55, bcd: 0o01, octal: '01', c: 0x00, hollerith: '1',      glyph: '1', name: 'one' },
  { rank: 56, bcd: 0o02, octal: '02', c: 0x00, hollerith: '2',      glyph: '2', name: 'two' },
  { rank: 57, bcd: 0o03, octal: '03', c: 0x40, hollerith: '3',      glyph: '3', name: 'three' },
  { rank: 58, bcd: 0o04, octal: '04', c: 0x00, hollerith: '4',      glyph: '4', name: 'four' },
  { rank: 59, bcd: 0o05, octal: '05', c: 0x40, hollerith: '5',      glyph: '5', name: 'five' },
  { rank: 60, bcd: 0o06, octal: '06', c: 0x40, hollerith: '6',      glyph: '6', name: 'six' },
  { rank: 61, bcd: 0o07, octal: '07', c: 0x00, hollerith: '7',      glyph: '7', name: 'seven' },
  { rank: 62, bcd: 0o10, octal: '10', c: 0x00, hollerith: '8',      glyph: '8', name: 'eight' },
  { rank: 63, bcd: 0o11, octal: '11', c: 0x40, hollerith: '9',      glyph: '9', name: 'nine' },
];

// THE BLANK TRAP. Octal 00 (no bits at all) is the blank; octal 20 (the A bit alone) is the
// SUBSTITUTE BLANK, which the 1410 punches to and reads back from a card as 8-2 and which the
// 1415 prints as a record-mark slug, not as white space (research/charset.md §2, §2.1). They are
// two different characters with two different collating ranks (00 and 19) and two different card
// codes. Code that "clears storage to blanks" means octal 00; code that reads an 8-2 punch means
// octal 20. Confusing them silently corrupts both card I/O and every comparison.
export const BLANK = 0o00;
export const SUBSTITUTE_BLANK = 0o20;

// Indexed by 6-bit BCD, built once from the table above so the table stays the single source.
const BY_BCD: BcdEntry[] = new Array<BcdEntry>(64);
const BY_GLYPH = new Map<string, number>();
for (const e of BCD_TABLE) {
  BY_BCD[e.bcd] = e;
  BY_GLYPH.set(e.glyph, e.bcd);
}

// research/charset.md §1 (A22-0526-3 p.5 "Character Coding"): every storage position carries an
// ODD total bit count over BA8421 + WM + C. The word mark is counted BEFORE C is determined, so
// setting or clearing a word mark inverts C. Returns the C bit in place: 0x40 or 0.
export function parity(bcd6: number, wm: boolean): number {
  let bits = wm ? 1 : 0;
  for (let b = bcd6 & BCD6; b !== 0; b >>= 1) bits += b & 1;
  return (bits & 1) === 0 ? 0x40 : 0x00;
}

// The 1410 A2 print glyph for a 6-bit code (research/charset.md §2).
export function glyphOf(bcd6: number): string {
  const e = BY_BCD[bcd6 & BCD6];
  if (e === undefined) throw new RangeError(`no BCD entry for ${bcd6}`);
  return e.glyph;
}

// Inverse of `glyphOf`. `undefined` for anything not in the 64-character set.
export function bcdOfGlyph(glyph: string): number | undefined {
  return BY_GLYPH.get(glyph);
}

// Collating rank 00..63 — what Compare and Branch-if-Character-Equal order by, over BA8421 only
// (research/charset.md §4, §4.1; A22-0526-3 p.28: "All BA8421 bits are compared, but not C bits
// or word marks").
export function collateRank(bcd6: number): number {
  const e = BY_BCD[bcd6 & BCD6];
  if (e === undefined) throw new RangeError(`no BCD entry for ${bcd6}`);
  return e.rank;
}
