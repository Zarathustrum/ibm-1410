// oracle/note1410/move.ts — Jaeger's Move/Scan annotations for `insttest.cor` 02800-02979,
// transcribed as DATA. The oracle text is `oracles/note1410.txt`, fetched by `npm run oracles`
// and checksum-gated (plan §6.1). Consumed by `test/tier3-move.test.ts`.
//
// `note1410.txt` is a BEHAVIOURAL ORACLE, never a specification: it records what Jaeger's own
// simulator did, annotated from the CE materials. Where it disagrees with A22-0526-3 the manual
// wins and the disagreement is recorded — see `CORRECTIONS` below and `UNMAPPED.md` beside this
// file. The note's own words are never copied here: each case cites its lines by number
// (`lines`, resolved by `noteText` in `ref.ts`), so the text a test reports is the note's,
// whitespace and shorthand included, because a paraphrased oracle is not an oracle.
//
// ─── WHAT THIS BLOCK IS ────────────────────────────────────────────────────────────────────
// `emulators.md` §5.3 calls 02800-02968 "the single most valuable block": the d-character
// control matrix, one instruction per interesting combination of the two bit fields, each with
// its expected result written out. It is the ONLY published expected-value data for op `D`
// anywhere, and it is what `plan §10` names as the verification for the eight-row Figure 20
// fallback (`src/core/move.ts` MOVE_REGISTERS_FROM_FIGURE_20).
//
// ─── COUNT: FIFTEEN `D` INSTRUCTIONS, NOT SIXTEEN ──────────────────────────────────────────
// The plan and `emulators.md` §5.3 both say "16". The image holds **fifteen** 12-character `D`
// instructions at 02800, 02812 … 02968, then a 1-character `.` Halt at 02979+1 = 02980 and the
// word mark that ends its read-out at 02981. §5.3's own code block prints sixteen entries —
// fifteen `D` lines and a trailing `.` — so the count includes the halt. Recorded rather than
// silently reconciled; see `CORRECTIONS`.
//
// ─── HOW A CASE WAS BUILT ──────────────────────────────────────────────────────────────────
//   1. `chars`, `d`, `before.aField` and `before.bField` are read from the IMAGE, and every one
//      of them agrees with the note's own `A (nnnnn): …  B (nnnnn): …` line.
//   2. `expectedAfter.bField` is the note's `Result:` line, in our A2 glyphs.
//   3. `expectedAfter.aar` / `.bar` are **not in the note** — it prints no registers for this
//      block. They are DERIVED from the eight-row Figure 20 table (`opcodes.md` §3.3) with
//      LA = LB = LW = `positions`, which is the very reading `plan §10` asks this block to
//      confirm. `positions` itself is derived from the note's `Result:` line: it is how many
//      B positions the note shows changed (or, for the scan at 02848 and the one-position move
//      at 02860, how many the terminator admits).
//   4. `mnemonic` is `opcodes.md` §3.2's, keyed on the d-character's own BCD code.
//
// `(v)` in the note is the word-mark overbar, `(rm)` the record mark and `(gm)` the group mark.
// Ours are `^` in the `marks` string, `‡` and `⧧` (research/charset.md §2 ranks 45 and 05).

import type { NoteRef } from './ref.js';

/**
 * One field as the note names it, plus the word marks the note draws as `(v)`.
 * `text` reads high-order (leftmost) first; `marks` is one character per position of `text`,
 * `^` for a word mark and `.` for none.
 */
export interface MoveField {
  /** The address the INSTRUCTION carries: the rightmost position for a right-to-left move
   *  (bit 8 clear), the leftmost for a left-to-right one (bit 8 set) — opcodes.md §3.1. */
  addr: number;
  /** Leftmost position of `text`, so a reader never has to infer direction to place it. */
  from: number;
  text: string;
  marks: string;
}

export interface MoveCase {
  /** Op-code address in `insttest.cor`. */
  addr: number;
  /** The instruction as glyphs read from the image at `addr` — all fifteen are 12 characters. */
  chars: string;
  /** The d-character as a glyph, and as the BCD code the two bit fields are taken from. */
  d: string;
  dBcd: number;
  /** opcodes.md §3.2's mnemonic for that code. */
  mnemonic: string;
  /** The whole annotation, heading line first — which always starts with `addr`. */
  lines: NoteRef;
  before: { aField: MoveField; bField: MoveField };
  /**
   * `bField` is the note's `Result:` line. `aar` / `bar` are DERIVED — see the header, rule 3.
   * The A field is never written by `D`, so there is no `aField` here.
   */
  expectedAfter: { bField: MoveField; aar: number; bar: number };
  /** Storage positions the operation steps through before its terminator stops it. */
  positions: number;
  notes?: readonly string[];
}

// ─── Corrections carried against the oracle, with citations ────────────────────────────────
export const CORRECTIONS: readonly { where: string; note: string; cite: string }[] = [
  {
    where: 'note1410.txt line 519, the 02848 heading that labels the d-character `T`',
    note: 'The d-character label is WRONG. The image at 02848 holds `D 10517 10519 -`, d = '
      + 'hyphen (BCD 32, the B bit alone, no 8/4/2/1) — which Figure 19 reads as "no 1, 2 or 4 '
      + 'bit = scan" plus "no 8 bit (right to left), B bit only = stop at the B-field word '
      + 'mark". That is exactly Jaeger\'s own parenthetical "(RL, SCAN, Stop on BWM)", so his '
      + 'PROSE is right and only his label is wrong. `T` is BCD 19 — a right-to-left CHARACTER '
      + 'move stopping at the A-field word mark — and it is the separate test at 02884.',
    cite: 'emulators.md §5.3; opcodes.md §3.1-3.2 (A22-0526-3 Figure 19 p.25)',
  },
  {
    where: 'plan §5 / §7 and emulators.md §5.3, "the 16-case Move matrix"',
    note: 'The image holds FIFTEEN `D` instructions (02800 … 02968, 12 characters each), then '
      + 'a `.` Halt at 02980 with its terminating word mark at 02981. §5.3\'s printed code '
      + 'block has sixteen entries because the trailing `.` is one of them. The range is '
      + 'therefore 02800-02979 for the moves, 02800-02981 including the halt; "02968" in the '
      + 'plan is the address of the LAST instruction, not the end of the block.',
    cite: 'decode of insttest.cor 02800-02981; emulators.md §5.3',
  },
  {
    where: 'note1410.txt lines 549 and 553, "Move D=="',
    note: 'The image holds `#` (BCD 11, the 8, 2 and 1 bits) at both 02967 and 02979. `=` is '
      + 'the alternate-type-head rendering of the 8-3 code that this project prints as `#` — '
      + 'the same substitution `oracle/note1410/arith.ts` GLYPH_SUBSTITUTIONS already records '
      + 'for the arithmetic block. Not a correction to the test, only to the glyph.',
    cite: 'decode of insttest.cor at 02967, 02979; charset.md §2 rank 20; io.md §2 '
      + '("Code Alternate" column)',
  },
];

/**
 * How the block is run. Every one of the fifteen is a 12-character two-address instruction with
 * its own d-character — NONE is chained — and the fifteen A/B field pairs occupy disjoint
 * storage (10500-10589, four to six positions per case, never overlapping). So unlike the
 * arithmetic block at 02300-02799, where earlier instructions mutate later operands, this block
 * gives the SAME result run sequentially or one instruction at a time. It is run sequentially
 * from 02800 to the halt at 02980 because that is what the image is: contiguous, word-marked on
 * every op code, halt-terminated exactly like the arithmetic sub-blocks
 * (`test/tier3-arith.test.ts` header).
 */
export const MOVE_BLOCK = { from: 2800, halt: 2980 } as const;

export const NOTE1410_MOVE: readonly MoveCase[] = [
  {
    addr: 2800, chars: 'D1050110503J', d: 'J', dBcd: 0o41, mnemonic: 'MLNB',
    lines: [507, 508],
    before: {
      aField: { addr: 10_501, from: 10_500, text: 'AB', marks: '^.' },
      bField: { addr: 10_503, from: 10_502, text: '01', marks: '^.' },
    },
    expectedAfter: {
      bField: { addr: 10_503, from: 10_502, text: '12', marks: '^.' },
      aar: 10_499, bar: 10_501,
    },
    positions: 2,
    notes: [
      'The NUMERIC portion alone: `A` (BCD 61) contributes its 8421 bits `1` to `0` (BCD 12, '
      + 'numeric 8-2) giving `1`, and `B` contributes `2` to `1` giving `2`. The B zone bits '
      + 'and the B word mark are untouched, which is why 10502 is still `(v)`.',
    ],
  },
  {
    addr: 2812, chars: 'D1050510507K', d: 'K', dBcd: 0o42, mnemonic: 'MLZB',
    lines: [510, 511],
    before: {
      aField: { addr: 10_505, from: 10_504, text: 'AJ', marks: '^.' },
      bField: { addr: 10_507, from: 10_506, text: '01', marks: '^.' },
    },
    expectedAfter: {
      bField: { addr: 10_507, from: 10_506, text: '?J', marks: '^.' },
      aar: 10_503, bar: 10_505,
    },
    positions: 2,
    notes: [
      'The ZONE portion alone, and the clearest single demonstration that the two halves of a '
      + 'character move independently: `J` (B zone) over `1` (no zone) gives BCD 41 = `J`, and '
      + '`A` (BA zone) over `0` (BCD 12) gives BA + 8-2 = BCD 72 = `?`, the plus-zero graphic. '
      + 'Every stored character stays parity-valid because setChar recomputes C.',
    ],
  },
  {
    addr: 2824, chars: 'D1050910511L', d: 'L', dBcd: 0o43, mnemonic: 'MLCB',
    lines: [513, 514],
    before: {
      aField: { addr: 10_509, from: 10_508, text: 'AB', marks: '^.' },
      bField: { addr: 10_511, from: 10_510, text: '01', marks: '^.' },
    },
    expectedAfter: {
      bField: { addr: 10_511, from: 10_510, text: 'AB', marks: '^.' },
      aar: 10_507, bar: 10_509,
    },
    positions: 2,
    notes: [
      'Zone AND numeric — the whole character — but NOT the word mark: the A field\'s word '
      + 'mark at 10508 does not travel, and the B field\'s at 10510 survives being written over.',
    ],
  },
  {
    addr: 2836, chars: 'D1051310515P', d: 'P', dBcd: 0o47, mnemonic: 'MLCWB',
    lines: [516, 517],
    before: {
      aField: { addr: 10_513, from: 10_512, text: 'AB', marks: '^^' },
      bField: { addr: 10_515, from: 10_514, text: '01', marks: '^.' },
    },
    expectedAfter: {
      bField: { addr: 10_515, from: 10_514, text: 'AB', marks: '^^' },
      aar: 10_511, bar: 10_513,
    },
    positions: 2,
    notes: [
      'The WORD-MARK portion, and the case that fixes when the terminator is sensed: this move '
      + 'WRITES a word mark into 10515, where the B field had none, and it must still stop on '
      + 'the B word mark it finds at 10514. Sensing after the store would have stopped it one '
      + 'position early, at 10515. Both A positions carry word marks, so both B positions end '
      + 'up marked — the word-mark portion is a copy.',
    ],
  },
  {
    addr: 2848, chars: 'D1051710519-', d: '-', dBcd: 0o40, mnemonic: 'SCNLB',
    lines: [519, 520],
    before: {
      aField: { addr: 10_517, from: 10_516, text: 'AB', marks: '^.' },
      bField: { addr: 10_519, from: 10_518, text: '01', marks: '^.' },
    },
    expectedAfter: {
      bField: { addr: 10_519, from: 10_518, text: '01', marks: '^.' },
      aar: 10_515, bar: 10_517,
    },
    positions: 2,
    notes: [
      'THE LABEL IS WRONG — see CORRECTIONS. d is the hyphen, BCD 32, so no 4/2/1 bit is set '
      + 'and this is a SCAN: the address registers step, nothing is transferred, and the B '
      + 'field reads exactly as it did before. The registers are the whole observable.',
    ],
  },
  {
    addr: 2860, chars: 'D10521105233', d: '3', dBcd: 0o03, mnemonic: 'MLCS',
    lines: [522, 523],
    before: {
      aField: { addr: 10_521, from: 10_520, text: 'AB', marks: '^.' },
      bField: { addr: 10_523, from: 10_522, text: '01', marks: '^.' },
    },
    expectedAfter: {
      bField: { addr: 10_523, from: 10_522, text: '0B', marks: '^.' },
      aar: 10_520, bar: 10_522,
    },
    positions: 1,
    notes: [
      'MLCS — the one-position form, the only terminator that consults no character at all. '
      + 'Exactly one B position changes and the registers step by one, which is the Figure 20 '
      + 'row `A-1 / B-1` and nothing else. The trailing `3` of `chars` is the d-character, not '
      + 'part of the B address: BCD 03, bits 2 and 1, no B/A/8.',
    ],
  },
  {
    addr: 2872, chars: 'D1052610528L', d: 'L', dBcd: 0o43, mnemonic: 'MLCB',
    lines: [525, 526],
    before: {
      aField: { addr: 10_526, from: 10_524, text: 'ABC', marks: '^..' },
      bField: { addr: 10_528, from: 10_527, text: '01', marks: '^.' },
    },
    expectedAfter: {
      bField: { addr: 10_528, from: 10_527, text: 'BC', marks: '^.' },
      aar: 10_524, bar: 10_526,
    },
    positions: 2,
    notes: [
      'A SHORT B FIELD stops a long A field: three A characters, two B positions, and the '
      + 'B-field word mark ends it after two. `A` at 10524 is never read, and AAR lands at '
      + '10524 = A - LB, not at A - LA.',
    ],
  },
  {
    addr: 2884, chars: 'D1053010533T', d: 'T', dBcd: 0o23, mnemonic: 'MLCA',
    lines: [528, 529],
    before: {
      aField: { addr: 10_530, from: 10_529, text: 'AB', marks: '^.' },
      bField: { addr: 10_533, from: 10_531, text: '012', marks: '^..' },
    },
    expectedAfter: {
      bField: { addr: 10_533, from: 10_531, text: '0AB', marks: '^..' },
      aar: 10_528, bar: 10_531,
    },
    positions: 2,
    notes: [
      'The mirror of 02872: a SHORT A field inside a longer B field, stopping on the A word '
      + 'mark after two positions. The B word mark at 10531 is never reached and the `0` under '
      + 'it is left alone. This is the d-character the 02848 label wrongly claims.',
    ],
  },
  {
    addr: 2896, chars: 'D1053510538C', d: 'C', dBcd: 0o63, mnemonic: 'MLC',
    lines: [531, 532],
    before: {
      aField: { addr: 10_535, from: 10_534, text: 'AB', marks: '^.' },
      bField: { addr: 10_538, from: 10_536, text: '012', marks: '^..' },
    },
    expectedAfter: {
      bField: { addr: 10_538, from: 10_536, text: '0AB', marks: '^..' },
      aar: 10_533, bar: 10_536,
    },
    positions: 2,
    notes: [
      '"First word mark in either field", with A the shorter — same data as 02884, different '
      + 'terminator, and the Figure 20 row is `A-LW / B-LW` rather than `A-LA / B-LA`. The two '
      + 'agree here because LW = LA = 2; 02908 is the pair that separates them.',
    ],
  },
  {
    addr: 2908, chars: 'D1054110543C', d: 'C', dBcd: 0o63, mnemonic: 'MLC',
    lines: [534, 535],
    before: {
      aField: { addr: 10_541, from: 10_539, text: 'ABC', marks: '^..' },
      bField: { addr: 10_543, from: 10_542, text: '01', marks: '^.' },
    },
    expectedAfter: {
      bField: { addr: 10_543, from: 10_542, text: 'BC', marks: '^.' },
      aar: 10_539, bar: 10_541,
    },
    positions: 2,
    notes: [
      'The same d as 02896 with B now the shorter field: the B word mark stops it, LW = LB = 2, '
      + 'and `A-LW` lands AAR at 10539. Together the pair shows LW really is "whichever field '
      + 'is shorter" and not a disguised LA.',
    ],
  },
  {
    addr: 2920, chars: 'D1054410548,', d: ',', dBcd: 0o33, mnemonic: 'MRCR',
    lines: [537, 539],
    before: {
      aField: { addr: 10_544, from: 10_544, text: 'ABC‡', marks: '^.^.' },
      bField: { addr: 10_548, from: 10_548, text: '012345', marks: '......' },
    },
    expectedAfter: {
      bField: { addr: 10_548, from: 10_548, text: 'ABC‡45', marks: '......' },
      aar: 10_548, bar: 10_552,
    },
    positions: 4,
    notes: [
      'THE FIRST LEFT-TO-RIGHT CASE, and the one that proves the addresses flip meaning: 10544 '
      + 'and 10548 are the LEFTMOST positions now. The record mark at 10547 carries NO word '
      + 'mark and still terminates — the A-field-record-mark terminator tests the character, '
      + 'not the mark — and the terminating position is itself moved, which is why the record '
      + 'mark appears in B at 10551. The two A word marks are ignored entirely: with bit 8 set '
      + 'no word mark terminates this d.',
    ],
  },
  {
    addr: 2932, chars: 'D1055410558$', d: '$', dBcd: 0o53, mnemonic: 'MRCG',
    lines: [541, 543],
    before: {
      aField: { addr: 10_554, from: 10_554, text: 'ABC⧧', marks: '^.^^' },
      bField: { addr: 10_558, from: 10_558, text: '012345', marks: '......' },
    },
    expectedAfter: {
      bField: { addr: 10_558, from: 10_558, text: 'ABC⧧45', marks: '......' },
      aar: 10_558, bar: 10_562,
    },
    positions: 4,
    notes: [
      'GROUP-MARK-WITH-WORD-MARK: the group mark at 10557 carries a word mark, and that is the '
      + 'whole terminator — a group mark WITHOUT one does not stop an `MRCG`. The word mark '
      + 'does not travel (the portion is zone+numeric), so B\'s group mark at 10561 is bare.',
    ],
  },
  {
    addr: 2944, chars: 'D1056410568.', d: '.', dBcd: 0o73, mnemonic: 'MRCM',
    lines: [545, 547],
    before: {
      aField: { addr: 10_564, from: 10_564, text: 'ABC⧧', marks: '^.^^' },
      bField: { addr: 10_568, from: 10_568, text: '012345', marks: '......' },
    },
    expectedAfter: {
      bField: { addr: 10_568, from: 10_568, text: 'ABC⧧45', marks: '......' },
      aar: 10_568, bar: 10_572,
    },
    positions: 4,
    notes: [
      'The both-bits form, on the same data as 02932 — the GM-WM arm of "record mark OR GM-WM". '
      + 'Figure 20 gives all three left-to-right non-word-mark terminators the same `A+LA / '
      + 'B+LA`, so 02920, 02932 and 02944 also check that those three rows really are one rule.',
    ],
  },
  {
    addr: 2956, chars: 'D1057410577#', d: '#', dBcd: 0o13, mnemonic: 'MRC',
    lines: [549, 551],
    before: {
      aField: { addr: 10_574, from: 10_574, text: 'ABC', marks: '..^' },
      bField: { addr: 10_577, from: 10_577, text: '01234', marks: '....^' },
    },
    expectedAfter: {
      bField: { addr: 10_577, from: 10_577, text: 'ABC34', marks: '....^' },
      aar: 10_577, bar: 10_580,
    },
    positions: 3,
    notes: [
      'Left to right with the WORD-MARK terminator, and the word marks are now at the RIGHT end '
      + 'of each field because that is where a left-to-right field ends. A stops it after three '
      + 'positions (its mark is at 10576, B\'s is two further on at 10581), the marked position '
      + 'is itself moved, and B\'s own word mark at 10581 is never reached.',
    ],
  },
  {
    addr: 2968, chars: 'D1058210586#', d: '#', dBcd: 0o13, mnemonic: 'MRC',
    lines: [553, 555],
    before: {
      aField: { addr: 10_582, from: 10_582, text: 'ABCD', marks: '....' },
      bField: { addr: 10_586, from: 10_586, text: '012', marks: '..^' },
    },
    expectedAfter: {
      bField: { addr: 10_586, from: 10_586, text: 'ABC', marks: '..^' },
      aar: 10_585, bar: 10_589,
    },
    positions: 3,
    notes: [
      'The other half of the pair: the same d, but now the B field is the shorter and ITS word '
      + 'mark stops the move. The A field has no word mark at all, so without the "either '
      + 'field" arm this would run to an address check. B keeps its word mark — the portion is '
      + 'zone+numeric — and `C` lands under it.',
    ],
  },
];
