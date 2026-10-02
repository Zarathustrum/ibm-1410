// oracle/note1410/arith.ts — Jaeger's arithmetic annotations for `insttest.cor` 02300-02799,
// transcribed as DATA. The oracle text is `oracles/note1410.txt`, fetched by `npm run oracles`
// and checksum-gated (plan §6.1). Consumed by `test/tier3-arith.test.ts`.
//
// `note1410.txt` is a BEHAVIOURAL ORACLE, never a specification: it records what Jaeger's own
// simulator did, annotated from the CE materials. Where it disagrees with A22-0526-3 the manual
// wins and the disagreement is recorded — see `CORRECTIONS` below and `UNMAPPED.md` beside this
// file. The note's own words are never copied here: each case and each cycle cites its lines by
// number (`lines`, resolved by `noteText` in `ref.ts`), so the text a test reports is the note's,
// whitespace and typos included ("restult", "BOdy", "instrudtion", "Zer Balance"), because a
// paraphrased oracle is not an oracle.
//
// The block runs 02300-02799: add 02300-02391, subtract 02400-02496, zero-and-add /
// zero-and-subtract 02500-02596, multiply 02600-02644, divide 02700-02766. The 16-case Move
// matrix at 02800-02968 is Wave 5's and is not here (plan §5 Waves 3 and 5; emulators.md §5.1,
// §5.3).
//
// ─── HOW A `B:` LINE BECOMES A `LatchTraceRecord` (src/core/trace.ts) ──────────────────────
// The note prints, per instruction, an alternating `A:` / `B:` sequence — one pair per position
// of the B field, right to left from the units position, then extension-only `B:` lines once
// the A field is exhausted, then `B:` store lines for a recomplement pass. Our L3 record is one
// per B-field position (plan §6.2), so each `B:` line is one record.
//
// The transcription rules, applied mechanically and stated here so a reader can re-derive every
// field below from the text:
//   1. `a`  — the glyph on this position's `A:` line ("Fetch X" / "Fetch WM/X" -> X). Omitted
//             where there is no `A:` line (extension and recomplement cycles).
//   2. `b`  — the glyph on this position's `B:` line "Fetch". Omitted for recomplement lines,
//             which print only a store.
//   3. `r`  — the glyph after "result" / "sum" / "Store".
//   4. `phase` — the Units / Body / Extension latch AT THE START of this position, which is the
//             A-CYCLE value: the word on this position's `A:` line, or failing that the word on
//             the PREVIOUS position's `B:` line. The two halves of one position can DISAGREE —
//             02311 c1 prints `A: … Body` against `B: … Extension`, and 02380 c4 prints
//             `B: … Extension` on a position whose A cycle still read an A character — so this
//             is a deliberate choice of the A-cycle reading, not a case where either would do.
//             It is the one latch `src/core/alu.ts` samples at position entry rather than at the
//             end of the storage cycle (`L3_LATCHES_SAMPLED_AFTER_CYCLE` there says so).
//             Omitted where neither line names one.
//   5. `scan` — 1 through the first pass, 3 from the line that declares the recomplement cycle
//             ("Begin recomplement cycle", "Start of recomplement cycle", "S3, Units") onward.
//   6. latches — `Ac Bc cin cout zb ovf` are set ONLY from words on this position's own two
//             lines. "NOT x" -> 0, "x" -> 1; "Carry Out" sets `cout`, "Carry In" sets `cin`,
//             "No Carry" is read as `cout: 0`. The COMBINED phrase "Carry In/Out" — and its
//             negation "NOT Carry In/Out" — sets `cout` ONLY. It is ONE light in Jaeger's notes,
//             not two: on a true add (02344, 02350, 02356, 02362) he prints it at the units
//             position, where no carry can have come IN, and prints "NOT Carry In/Out" on the
//             next position, which in the same arithmetic certainly DID take a carry in. See
//             UNMAPPED.md.
//             Where the `A:` and `B:` lines of one position disagree, the `B:` line wins: it is
//             the later state within that position.
//   7. NOTHING IS CARRIED FORWARD. Jaeger's own preamble says "you should assume a light stays
//             on unless NOT shows up later or unless a complementary light (Unit/Body/
//             Extension) comes on" — but the same paragraph says "I might have missed some
//             lights in some instances", and carrying lights forward would turn his admitted
//             omissions into assertions the machine must satisfy. So an absent latch is an
//             absent expectation, and the test asserts only what is written down.
//
// A field the fixture does not carry is a field the test does not assert.

import type { NoteRef } from './ref.js';

/** One latch as `note1410.txt` prints it: a light on or off. */
export type Latch = 0 | 1;

/** The scan-control and unit/body/extension latches of emulators.md §5.3. */
export type Scan = 1 | 3;
export type Phase = 'units' | 'body' | 'extension';

/** One `B:` line — one B-field position — as an expectation over `LatchTraceRecord`. */
export interface LatchExpectation {
  /** 0-based position of the B field, units first. Matches the record order. */
  cycle: number;
  /** The note's own `A:` and `B:` lines for this position. */
  lines: NoteRef;
  a?: string;
  b?: string;
  r?: string;
  scan?: Scan;
  phase?: Phase;
  Ac?: Latch;
  Bc?: Latch;
  cin?: Latch;
  cout?: Latch;
  zb?: Latch;
  ovf?: Latch;
}

/**
 * A field as the note names it. `addr` is the address the INSTRUCTION carries, which for `A` `S`
 * `?` `!` is the field's units (rightmost) position; `text` reads high-order first, in OUR A2
 * glyphs (see `GLYPH_SUBSTITUTIONS`). Divide is the documented exception — its B-address is the
 * leftmost position of the DIVIDEND, `len(divisor)+1` positions in from the left end of the
 * field (opcodes.md §2 p.20, §4.6) — so for `%` `addr` points INSIDE `text`.
 */
export interface Field {
  addr: number;
  text: string;
  /**
   * Leftmost position of `text`. Defaults to `addr - text.length + 1`, which is right for every
   * field addressed at its units position. Divide is the exception — its B-address sits
   * `len(divisor)+1` in from the left end (opcodes.md §4.6) — so those cases set it.
   */
  from?: number;
}

export interface ArithCase {
  /** Op-code address in `insttest.cor`. */
  addr: number;
  /** The MACHINE op character, not the Autocoder mnemonic (emulators.md §5.2). */
  op: string;
  /** The instruction as glyphs read from the image at `addr`. */
  chars: string;
  length: number;
  /** The whole annotation, heading line first — which always starts with `addr`. */
  lines: NoteRef;
  aField?: Field;
  bField?: Field;
  /**
   * What the B field must read after the instruction, high-order first. Present where the note
   * states it unambiguously — either as a "Result is …" line or as a complete run of store
   * lines — and, for the multiply and divide cases only, where it is `[derived]`: hand-derived
   * from `opcodes.md` §4.5 / §4.6 because the note prints operands and nothing else. Every such
   * entry carries its arithmetic, its citation and the `[derived]` sentence in a comment; the
   * label itself is defined in `docs/research/open-questions.md`, `## Phase 1b — 2026-08-30`.
   * Where the note's stated result cannot be reconciled with the field in the image, the line
   * goes to UNMAPPED.md instead and this is absent.
   */
  resultField?: Field;
  /**
   * Indicator latches immediately after the instruction. Carried only where the manual's rules
   * determine one — the divide block, where `opcodes.md` §4.6 / §8 fix divide overflow both ways.
   * A latch not named here is not asserted, like every other field in this file.
   */
  indicatorsAfter?: { divideOverflow?: boolean; zeroBalance?: boolean };
  /** AAR / BAR the note states for a chained instruction, before it runs. */
  chainedRegisters?: { aar: number; bar: number };
  /** Per-B-position expectations, units first. Empty for the cases the note leaves unannotated. */
  expected: readonly LatchExpectation[];
  /**
   * Which wave OWED the executor for this op — provenance, not control flow. Wave 6 shipped
   * `?`/`!` and Phase 1b Wave B shipped `@`/`%`, so no case is skipped for it any more and
   * `'phase1b'` is gone from the union with the last case that carried it.
   */
  pending?: 'wave6';
  /** Anything a reader needs that is not an expectation. */
  notes?: readonly string[];
}

// ─── Corrections carried against the oracle, with citations ───────────────────────────────
export const CORRECTIONS: readonly { where: string; note: string; cite: string }[] = [
  {
    where: 'note1410.txt line 21, the instruction-decode list',
    note: 'The 00500 entry names multiply `M` — WRONG. `M` is the Autocoder mnemonic; the op '
      + 'character in the image is `@` (BCD 14, the 8 and 4 bits). The block is outside '
      + '02300-02799, but the notes mention it, so the correction is recorded here.',
    cite: 'emulators.md §5.2; opcodes.md §1.6 (the Autocoder-vs-machine mnemonic collision)',
  },
  {
    where: 'note1410.txt line 519, the 02848 heading that labels the d-character `T`',
    note: 'The image holds `D 10517 10519 -`, d = hyphen (B bit only). Jaeger\'s prose is right, '
      + 'his d-character label is wrong. WAVE 5\'s block (02800-02968) — mentioned only.',
    cite: 'emulators.md §5.3',
  },
  {
    where: '02485, "B field, 10147 is 00|!?1"',
    note: 'The image\'s instruction at 02485 is `S 10144 10150`: the B field\'s units position is '
      + '10150, and the six characters run 10145-10150. 10147 is inside the field, not its '
      + 'address. The corresponding Add at 02380 (`A 10041 10047`) names its B field correctly, '
      + 'so this is a transcription slip in the note, not a second field.',
    cite: 'decode of insttest.cor at 02485; opcodes.md §2 p.17 (B field addressed at its units)',
  },
  {
    where: 'note1410.txt line 95, 02311 cycle 1, the `B:` line that fetches `1`',
    note: 'The FETCH is `0`, not `1`. Three things say so, and none of them is our arithmetic. '
      + '(a) The note\'s own line 89 gives the B field at 10011 as 900 and the image agrees — '
      + 'the tens position of that field is `0`; the fixture-matches-the-image test asserts it. '
      + '(b) The '
      + 'same line\'s "result 8" is unreachable from a B digit of 1: the A digit is 1, complement '
      + 'add, 9-1 = 8, +0 = 8; +1 would be 9, and the heading\'s "Result is 883" would be 893. '
      + '(c) The mirror case at 02411 (`S 10108 10111`, which the note itself says gives "the '
      + 'same as the add located at 2311") fetches `0` for the same position at line 228. The '
      + '`1` is the preceding "A: Fetch WM/1" bleeding into the B line. The cited `lines` are '
      + 'the note as written; only the `b` expectation is corrected.',
    cite: 'oracles/note1410.txt lines 89, 95, 228; opcodes.md §4.3 (complement add)',
  },
];

/**
 * Jaeger's simulator prints two characters differently from the 1410 A2 chain this project
 * renders (research/charset.md §2, §5.1). His own bit annotations disambiguate both, so the
 * substitution is mechanical and the `expected` glyphs below are OURS.
 */
export const GLYPH_SUBSTITUTIONS: readonly { note: string; ours: string; bcdOctal: string }[] = [
  { note: '|', ours: '‡', bcdOctal: '32' },   // record mark — his own "(RM=A0)"
  { note: '=', ours: '#', bcdOctal: '13' },   // his own "(821)" — 02533's 8-bit test
];

// ═══ Add — 02300-02391 (opcodes.md §2 p.17, A22-0526-3) ═══════════════════════════════════

const ADD: readonly ArithCase[] = [
  {
    addr: 2300, op: 'A', chars: 'A1000310006', length: 11,
    lines: [73, 85],
    aField: { addr: 10_003, text: '099' },
    bField: { addr: 10_006, text: '100' },
    resultField: { addr: 10_006, text: '199' },
    notes: [
      'The A field carries NO word mark: its length is governed by the B field word mark, and '
      + 'the `1` of `1099` at 10000 is never processed (opcodes.md §2 p.17, "Short A zero-fills '
      + 'high-order B up to and including the B word mark").',
    ],
    expected: [
      {
        cycle: 0,
        lines: [80, 81],
        a: '9', b: '0', r: '9', scan: 1, phase: 'units', zb: 0,
      },
      { cycle: 1, lines: [82, 83], a: '9', b: '0', r: '9' },
      { cycle: 2, lines: [84, 85], a: '0', b: '1', r: '1' },
    ],
  },
  {
    addr: 2311, op: 'A', chars: 'A1000810011', length: 11,
    lines: [87, 96],
    aField: { addr: 10_008, text: '1P' },
    bField: { addr: 10_011, text: '900' },
    resultField: { addr: 10_011, text: '883' },
    notes: [
      'CORRECTED: cycle 1\'s "B: Fetch 1" is a transcription slip for "B: Fetch 0" — see '
      + 'CORRECTIONS. The cited `lines` are the note as written; only the `b` expectation is corrected.',
    ],
    expected: [
      {
        cycle: 0,
        lines: [92, 93],
        a: 'P', b: '0', r: '3', scan: 1, phase: 'units', Ac: 1, zb: 0,
      },
      {
        cycle: 1,
        lines: [94, 95],
        // CORRECTED: `b` is `0`, not the note's `1` — see CORRECTIONS.
        a: '1', b: '0', r: '8', phase: 'body', Ac: 1,
      },
      {
        cycle: 2,
        lines: [96, 96],
        b: '9', r: '8', phase: 'extension', cout: 1, ovf: 0,
      },
    ],
  },
  {
    addr: 2322, op: 'A', chars: 'A1001310015', length: 11,
    lines: [98, 110],
    aField: { addr: 10_013, text: '99' },
    bField: { addr: 10_015, text: '90' },
    resultField: { addr: 10_015, text: '89' },
    notes: [
      'The standing NOTE about Overflow is an INDICATOR fact, not a latch-record field: '
      + 'arithmetic overflow is reset by the `J (I) Z` test that reads it or by computer reset '
      + '(opcodes.md §6.1, §8). Asserted in test/indicators.test.ts, not here.',
    ],
    expected: [
      {
        cycle: 0,
        lines: [103, 104],
        a: '9', b: '0', r: '9', scan: 1, phase: 'units', zb: 0,
      },
      {
        cycle: 1,
        lines: [105, 106],
        a: '9', b: '9', r: '8', phase: 'body', cout: 1, ovf: 1,
      },
    ],
  },
  {
    addr: 2333, op: 'A', chars: 'A1001710020', length: 11,
    lines: [112, 126],
    aField: { addr: 10_017, text: '1Q' },
    bField: { addr: 10_020, text: '012' },
    // Derived from the three store lines, units first: O, 0, WM/0. The heading's "Result is 1O"
    // cannot be reconciled with a 3-character B field — see UNMAPPED.md.
    resultField: { addr: 10_020, text: '00O' },
    notes: [
      '"No Carry" on the second B line is read as `cout: 0`. See UNMAPPED.md — the note does not '
      + 'say which carry latch it means.',
    ],
    expected: [
      {
        cycle: 0,
        lines: [117, 118],
        a: 'Q', b: '2', r: '4', scan: 1, phase: 'units', Ac: 1, zb: 0,
      },
      {
        cycle: 1,
        lines: [119, 120],
        a: '1', b: '1', r: '9', scan: 1, phase: 'body', cout: 0,
      },
      {
        cycle: 2,
        lines: [121, 122],
        b: '0', r: '9', scan: 1, phase: 'extension', Ac: 1, Bc: 1, cin: 1,
      },
      {
        cycle: 3,
        lines: [123, 124],
        r: 'O', scan: 3, phase: 'units', Ac: 0, Bc: 1,
      },
      { cycle: 4, lines: [125, 125], r: '0', scan: 3, phase: 'extension', Bc: 1 },
      { cycle: 5, lines: [126, 126], r: '0', scan: 3 },
    ],
  },
  {
    addr: 2344, op: 'A', chars: 'A10023', length: 6,
    lines: [128, 136],
    aField: { addr: 10_023, text: '015' },
    bField: { addr: 10_023, text: '015' },
    resultField: { addr: 10_023, text: '030' },
    notes: [
      'The address-double one-field form: "the A field is image-added to itself (doubled) in '
      + 'place" (opcodes.md §2 pp.17-18). 015 + 015 = 030.',
    ],
    expected: [
      {
        cycle: 0,
        lines: [131, 132],
        a: '5', b: '5', r: '0', scan: 1, phase: 'units', zb: 1, cout: 1,
      },
      {
        cycle: 1,
        lines: [133, 134],
        a: '1', b: '1', r: '3', phase: 'body', zb: 0, cout: 0,
      },
      { cycle: 2, lines: [135, 136], a: '0', b: '0', r: '0' },
    ],
  },
  {
    addr: 2350, op: 'A', chars: 'A10026', length: 6,
    lines: [138, 146],
    aField: { addr: 10_026, text: '03R' },
    bField: { addr: 10_026, text: '03R' },
    resultField: { addr: 10_026, text: '07Q' },
    expected: [
      {
        cycle: 0,
        lines: [141, 142],
        a: 'R', b: 'R', r: 'Q', scan: 1, phase: 'units', zb: 0, cout: 1,
      },
      {
        cycle: 1,
        lines: [143, 144],
        a: '3', b: '3', r: '7', phase: 'body', cout: 0,
      },
      { cycle: 2, lines: [145, 146], a: '0', b: '0', r: '0' },
    ],
  },
  {
    addr: 2356, op: 'A', chars: 'A10028', length: 6,
    lines: [148, 156],
    aField: { addr: 10_028, text: '55' },
    bField: { addr: 10_028, text: '55' },
    resultField: { addr: 10_028, text: '10' },
    expected: [
      {
        cycle: 0,
        lines: [151, 152],
        a: '5', b: '5', r: '0', scan: 1, phase: 'units', zb: 1, cout: 1,
      },
      {
        cycle: 1,
        lines: [153, 154],
        a: '5', b: '5', r: '1', phase: 'body', zb: 0, ovf: 1, cout: 1,
      },
    ],
  },
  {
    addr: 2362, op: 'A', chars: 'A10030', length: 6,
    lines: [158, 169],
    aField: { addr: 10_030, text: '5R' },
    bField: { addr: 10_030, text: '5R' },
    resultField: { addr: 10_030, text: '1Q' },
    expected: [
      {
        cycle: 0,
        lines: [161, 162],
        a: 'R', b: 'R', r: 'Q', scan: 1, phase: 'units', zb: 0, cout: 1,
      },
      {
        cycle: 1,
        lines: [163, 164],
        a: '5', b: '5', r: '1', phase: 'body', cout: 1, ovf: 1,
      },
    ],
  },
  {
    addr: 2368, op: 'A', chars: 'A1003210036', length: 11,
    lines: [171, 177],
    aField: { addr: 10_032, text: '1' },
    bField: { addr: 10_036, text: '05' },
    resultField: { addr: 10_036, text: '06' },
    notes: [
      'Half of the chained pair 02368/02379 (plan §5 Wave 3). Registers after, per the §2 row '
      + '`NSI / A-LW / B-LB` with LA=1, LB=2, LW=1: AAR = 10031, BAR = 10034 — which is exactly '
      + 'what 02379\'s own annotation names as its chained fields.',
    ],
    expected: [
      {
        cycle: 0,
        lines: [175, 176],
        a: '1', b: '5', r: '6', scan: 1, phase: 'units', zb: 0,
      },
      { cycle: 1, lines: [177, 177], b: '0', r: '0', phase: 'extension' },
    ],
  },
  {
    addr: 2379, op: 'A', chars: 'A', length: 1,
    lines: [179, 186],
    aField: { addr: 10_031, text: '2' },
    bField: { addr: 10_034, text: '04' },
    resultField: { addr: 10_034, text: '06' },
    chainedRegisters: { aar: 10_031, bar: 10_034 },
    notes: [
      'The `D:` line is not a B-field position and produces no latch record — see UNMAPPED.md. '
      + 'The chained 1-character `A` is the TWO-FIELD form (opcodes.md §2 p.17, lengths 1 and 11).',
    ],
    expected: [
      {
        cycle: 0,
        lines: [184, 185],
        a: '2', b: '4', r: '6', scan: 1, phase: 'units', zb: 0,
      },
      { cycle: 1, lines: [186, 186], b: '0', r: '0', phase: 'extension' },
    ],
  },
  {
    addr: 2380, op: 'A', chars: 'A1004110047', length: 11,
    lines: [188, 203],
    aField: { addr: 10_041, text: '1BLU5' },
    bField: { addr: 10_047, text: '00‡!?1' },
    resultField: { addr: 10_047, text: '01SLD6' },
    notes: [
      'Jaeger\'s `|` is the RECORD MARK — his own "(RM=A0)". Our A2 glyph is `‡` '
      + '(research/charset.md §2). One of the two zones-in-A-and-B cases plan §5 Wave 3 names; '
      + 'the other is 02485.',
      'The rule under test is opcodes.md §2 p.17: "B zone bits unchanged except the sign; A zone '
      + 'bits ignored except the sign" — every B zone survives the add, digit by digit.',
    ],
    expected: [
      {
        cycle: 0,
        lines: [193, 194],
        a: '5', b: '1', r: '6', scan: 1, phase: 'units', zb: 0,
      },
      {
        cycle: 1,
        lines: [195, 196],
        a: 'U', b: '?', r: 'D', phase: 'body',
      },
      {
        cycle: 2,
        lines: [197, 198],
        a: 'L', b: '!', r: 'L',
      },
      {
        cycle: 3,
        lines: [199, 200],
        a: 'B', b: '‡', r: 'S',
      },
      {
        cycle: 4,
        lines: [201, 202],
        a: '1', b: '0', r: '1',
      },
      { cycle: 5, lines: [203, 203], b: '0', r: '0', phase: 'extension' },
    ],
  },
];

// ═══ Subtract — 02400-02496 (opcodes.md §2 p.17-18) ═══════════════════════════════════════

const SUBTRACT: readonly ArithCase[] = [
  {
    addr: 2400, op: 'S', chars: 'S1010310106', length: 11,
    lines: [207, 219],
    aField: { addr: 10_103, text: '109R' },
    bField: { addr: 10_106, text: '100' },
    resultField: { addr: 10_106, text: '199' },
    expected: [
      {
        cycle: 0,
        lines: [211, 212],
        a: 'R', b: '0', r: '9', scan: 1, phase: 'units', zb: 0,
      },
      { cycle: 1, lines: [213, 214], a: '9', b: '0', r: '9', phase: 'body' },
      { cycle: 2, lines: [215, 216], a: '0', b: '1', r: '1' },
    ],
  },
  {
    addr: 2411, op: 'S', chars: 'S1010810111', length: 11,
    lines: [221, 232],
    aField: { addr: 10_108, text: '17' },
    bField: { addr: 10_111, text: '900' },
    resultField: { addr: 10_111, text: '883' },
    expected: [
      {
        cycle: 0,
        lines: [225, 226],
        a: '7', b: '0', r: '3', scan: 1, phase: 'units', Ac: 1, zb: 0,
      },
      {
        cycle: 1,
        lines: [227, 228],
        a: '1', b: '0', r: '8', phase: 'body',
      },
      {
        cycle: 2,
        lines: [229, 229],
        b: '9', r: '8', phase: 'extension', cout: 1,
      },
    ],
  },
  {
    addr: 2422, op: 'S', chars: 'S1011310115', length: 11,
    lines: [234, 251],
    aField: { addr: 10_113, text: '9R' },
    bField: { addr: 10_115, text: '90' },
    resultField: { addr: 10_115, text: '89' },
    notes: [
      'The "A complement was left on from the previous subtract" paragraph describes a bug '
      + 'Jaeger then FIXED ("I later modified the code so it would clear A Complement and B '
      + 'Complement before the first A cycle"). It is not an expectation — see UNMAPPED.md.',
    ],
    expected: [
      {
        cycle: 0,
        lines: [238, 239],
        a: 'R', b: '0', r: '9', scan: 1, phase: 'units', zb: 0,
      },
      {
        cycle: 1,
        lines: [240, 241],
        a: '9', b: '9', r: '8', phase: 'body', cout: 1, ovf: 1,
      },
    ],
  },
  {
    addr: 2433, op: 'S', chars: 'S1011710120', length: 11,
    lines: [253, 265],
    aField: { addr: 10_117, text: '18' },
    bField: { addr: 10_120, text: '012' },
    resultField: { addr: 10_120, text: '00O' },
    expected: [
      {
        cycle: 0,
        lines: [257, 258],
        a: '8', b: '2', r: '4', scan: 1, phase: 'units', Ac: 1, zb: 0,
      },
      {
        cycle: 1,
        lines: [259, 260],
        a: '1', b: '1', r: '9', scan: 1, phase: 'body',
      },
      {
        cycle: 2,
        lines: [261, 262],
        b: '0', r: '9', scan: 1, phase: 'extension', Ac: 1, Bc: 1, cin: 1,
      },
      {
        cycle: 3,
        lines: [263, 263],
        r: 'O', scan: 3, phase: 'units', Bc: 1, Ac: 0,
      },
      { cycle: 4, lines: [264, 264], r: '0', scan: 3, phase: 'extension' },
      { cycle: 5, lines: [265, 265], r: '0', scan: 3 },
    ],
  },
  {
    addr: 2444, op: 'S', chars: 'S1012210125', length: 11,
    lines: [267, 277],
    aField: { addr: 10_122, text: '0K' },
    bField: { addr: 10_125, text: '020' },
    resultField: { addr: 10_125, text: '022' },
    notes: [
      'The "B Complement was a leftover" paragraph is the same fixed bug as at 02422 — see '
      + 'UNMAPPED.md, not an expectation.',
    ],
    expected: [
      {
        cycle: 0,
        lines: [271, 272],
        a: 'K', b: '0', r: '2', scan: 1, phase: 'units', zb: 0,
      },
      {
        cycle: 1,
        lines: [273, 274],
        a: '0', b: '2', r: '2', phase: 'body',
      },
      { cycle: 2, lines: [275, 275], b: '0', r: '0', phase: 'extension' },
    ],
  },
  {
    addr: 2455, op: 'S', chars: 'S10128', length: 6,
    lines: [279, 287],
    aField: { addr: 10_128, text: '054' },
    bField: { addr: 10_128, text: '054' },
    resultField: { addr: 10_128, text: '000' },
    notes: [
      'The address-double one-field `S`: "A field subtracted from itself, leaving a zeroed result '
      + 'in A. Zone bits and sign configuration unchanged" (opcodes.md §2 p.18).',
    ],
    expected: [
      {
        cycle: 0,
        lines: [282, 283],
        a: '4', b: '4', r: '0', scan: 1, phase: 'units', Ac: 1, cout: 1, zb: 1,
      },
      {
        cycle: 1,
        lines: [284, 285],
        a: '5', b: '5', r: '0', phase: 'body', Ac: 1, cout: 1, zb: 1,
      },
      {
        cycle: 2,
        lines: [286, 287],
        a: '0', b: '0', r: '0', phase: 'body', zb: 1, cout: 1,
      },
    ],
  },
  {
    addr: 2461, op: 'S', chars: 'S10131', length: 6,
    lines: [289, 297],
    aField: { addr: 10_131, text: '02R' },
    bField: { addr: 10_131, text: '02R' },
    resultField: { addr: 10_131, text: '00!' },
    notes: [
      'The sign survives as MINUS ZERO — `!`, octal 52 (B-8-2). "Zone bits and sign configuration '
      + 'unchanged (example: A-field `ABQ` becomes `??!`)" (opcodes.md §2 p.18).',
    ],
    expected: [
      {
        cycle: 0,
        lines: [292, 293],
        a: 'R', b: 'R', r: '!', scan: 1, phase: 'units', Ac: 1, zb: 1,
      },
      {
        cycle: 1,
        lines: [294, 295],
        a: '2', b: '2', r: '0', phase: 'body', zb: 1,
      },
      {
        cycle: 2,
        lines: [296, 297],
        a: '0', b: '0', r: '0', zb: 1, cout: 1,
      },
    ],
  },
  {
    addr: 2467, op: 'S', chars: 'S10133', length: 6,
    lines: [299, 305],
    aField: { addr: 10_133, text: '5R' },
    bField: { addr: 10_133, text: '5R' },
    resultField: { addr: 10_133, text: '0!' },
    expected: [
      {
        cycle: 0,
        lines: [302, 303],
        a: 'R', b: 'R', r: '!', scan: 1, phase: 'units', Ac: 1,
      },
      {
        cycle: 1,
        lines: [304, 305],
        a: '5', b: '5', r: '0', phase: 'body', zb: 1, cout: 1,
      },
    ],
  },
  {
    addr: 2473, op: 'S', chars: 'S1013510139', length: 11,
    lines: [307, 313],
    aField: { addr: 10_135, text: '1' },
    bField: { addr: 10_139, text: '53' },
    resultField: { addr: 10_139, text: '52' },
    notes: [
      'Half of the chained pair 02473/02484 (plan §5 Wave 3). Registers after, per `NSI / A-LW / '
      + 'B-LB` with LA=1, LB=2, LW=1: AAR = 10134, BAR = 10137 — 02484\'s own chained fields.',
    ],
    expected: [
      {
        cycle: 0,
        lines: [311, 312],
        a: '1', b: '3', r: '2', scan: 1, phase: 'units', cout: 1, Ac: 1, zb: 0,
      },
      { cycle: 1, lines: [313, 313], b: '5', r: '5', phase: 'extension' },
    ],
  },
  {
    addr: 2484, op: 'S', chars: 'S', length: 1,
    lines: [315, 322],
    aField: { addr: 10_134, text: '2' },
    bField: { addr: 10_137, text: '54' },
    resultField: { addr: 10_137, text: '52' },
    chainedRegisters: { aar: 10_134, bar: 10_137 },
    notes: ['The bracketed `D:` line is not a B-field position — see UNMAPPED.md.'],
    expected: [
      {
        cycle: 0,
        lines: [320, 321],
        a: '2', b: '4', r: '2', scan: 1, phase: 'units', Ac: 1, cout: 1,
      },
      { cycle: 1, lines: [322, 322], b: '5', r: '5', phase: 'extension' },
    ],
  },
  {
    addr: 2485, op: 'S', chars: 'S1014410150', length: 11,
    lines: [324, 346],
    aField: { addr: 10_144, text: '1BLU5' },
    // CORRECTED: the note says 10147; the image's instruction is `S 10144 10150`.
    bField: { addr: 10_150, text: '00‡!?1' },
    resultField: { addr: 10_150, text: '01SLDM' },
    notes: [
      'The B-field address is CORRECTED to 10150 — see CORRECTIONS and UNMAPPED.md.',
      'The intermediate "98XOE6" going into the recomplement is prose about a state between '
      + 'records, not a record field — UNMAPPED.md.',
    ],
    expected: [
      {
        cycle: 0,
        lines: [329, 330],
        a: '5', b: '1', r: '6', scan: 1, phase: 'units', Ac: 1, zb: 0,
      },
      {
        cycle: 1,
        lines: [331, 332],
        a: 'U', b: '?', r: 'E', scan: 1,
      },
      {
        cycle: 2,
        lines: [333, 334],
        a: 'L', b: '!', r: 'O', scan: 1,
      },
      {
        cycle: 3,
        lines: [335, 336],
        a: 'B', b: '‡', r: 'X', scan: 1,
      },
      {
        cycle: 4,
        lines: [337, 338],
        a: '1', b: '0', r: '8', scan: 1,
      },
      {
        cycle: 5,
        lines: [339, 340],
        b: '0', r: '9', scan: 1, phase: 'extension', cin: 1, Ac: 1, Bc: 1,
      },
      { cycle: 6, lines: [341, 341], r: 'M', scan: 3, phase: 'units' },
      { cycle: 7, lines: [342, 342], r: 'D', scan: 3 },
      { cycle: 8, lines: [343, 343], r: 'L', scan: 3 },
      { cycle: 9, lines: [344, 344], r: 'S', scan: 3 },
      { cycle: 10, lines: [345, 345], r: '1', scan: 3 },
      { cycle: 11, lines: [346, 346], r: '0', scan: 3 },
    ],
  },
];

// ═══ Zero and Add / Zero and Subtract — 02500-02596. WAVE 6. ══════════════════════════════
// Transcribed now because the text is here now; the executors (`?` and `!`) are Wave 6's, so
// every case carries `pending: 'wave6'` and the tier-3 test raises them as `test.todo`.
// Their `B:` lines print "Store X" rather than "add, result X": Zero-and-Add stores the A digit
// into B rather than summing, so no carry latch is ever named (opcodes.md §2 p.18).

const ZERO_ADD_SUBTRACT: readonly ArithCase[] = [
  {
    addr: 2500, op: '?', chars: '?1020110204', length: 11, pending: 'wave6',
    lines: [349, 357],
    aField: { addr: 10_201, text: '01' },
    bField: { addr: 10_204, text: '123' },
    resultField: { addr: 10_204, text: '00A' },
    notes: ['"a plus sign not already B+A is rewritten as B+A" — `1` becomes `A` (opcodes.md §2 p.18).'],
    expected: [
      {
        cycle: 0,
        lines: [353, 354],
        a: '1', b: '3', r: 'A', scan: 1, phase: 'units', zb: 0,
      },
      {
        cycle: 1,
        lines: [355, 356],
        a: '0', b: '2', r: '0', phase: 'body',
      },
      { cycle: 2, lines: [357, 357], b: '1', r: '0', phase: 'extension' },
    ],
  },
  {
    addr: 2511, op: '?', chars: '?1020610209', length: 11, pending: 'wave6',
    lines: [359, 367],
    aField: { addr: 10_206, text: '0J' },
    bField: { addr: 10_209, text: '123' },
    resultField: { addr: 10_209, text: '00J' },
    expected: [
      {
        cycle: 0,
        lines: [363, 364],
        a: 'J', b: '3', r: 'J', scan: 1, phase: 'units', zb: 0,
      },
      {
        cycle: 1,
        lines: [365, 366],
        a: '0', b: '2', r: '0', phase: 'body',
      },
      { cycle: 2, lines: [367, 367], b: '1', r: '0', phase: 'extension' },
    ],
  },
  {
    addr: 2522, op: '?', chars: '?1021310217', length: 11, pending: 'wave6',
    lines: [369, 381],
    aField: { addr: 10_213, text: 'AKT4' },
    bField: { addr: 10_217, text: 'JSLX' },
    resultField: { addr: 10_217, text: '123D' },
    expected: [
      {
        cycle: 0,
        lines: [374, 375],
        a: '4', b: 'X', r: 'D', scan: 1, phase: 'units', zb: 0,
      },
      { cycle: 1, lines: [376, 377], a: 'T', b: 'L', r: '3', phase: 'body' },
      { cycle: 2, lines: [378, 379], a: 'K', b: 'S', r: '2' },
      { cycle: 3, lines: [380, 381], a: 'A', b: 'J', r: '1' },
    ],
  },
  {
    addr: 2533, op: '?', chars: '?1022310229', length: 11, pending: 'wave6',
    lines: [383, 399],
    // Jaeger's `=` is octal 13, our `#`; his `b` is the blank. See GLYPH_SUBSTITUTIONS.
    aField: { addr: 10_223, text: ' #\\:>√' },
    bField: { addr: 10_229, text: '000000' },
    resultField: { addr: 10_229, text: '03656G' },
    notes: [
      'This is the "digit coding in arithmetic" table under test (opcodes.md §4.2, '
      + 'research/charset.md §6.2): the 8 bit carries into the digit value, so the radical '
      + '(8-4-2-1) is 7 and `#` (8-2-1) is 3.',
    ],
    expected: [
      {
        cycle: 0,
        lines: [388, 389],
        a: '√', b: '0', r: 'G', scan: 1, phase: 'units',
      },
      { cycle: 1, lines: [390, 391], a: '>', b: '0', r: '6' },
      { cycle: 2, lines: [392, 393], a: ':', b: '0', r: '5' },
      { cycle: 3, lines: [394, 395], a: '\\', b: '0', r: '6' },
      { cycle: 4, lines: [396, 397], a: '#', b: '0', r: '3' },
      { cycle: 5, lines: [398, 399], a: ' ', b: '0', r: '0' },
    ],
  },
  {
    addr: 2544, op: '?', chars: '?10223', length: 6, pending: 'wave6',
    lines: [401, 405],
    aField: { addr: 10_223, text: ' #\\:>√' },
    bField: { addr: 10_223, text: ' #\\:>√' },
    resultField: { addr: 10_223, text: '03656G' },
    notes: [
      '"still has … at this point" is direct evidence that the block is meant to run '
      + 'SEQUENTIALLY: 02533 stored its result into 10229-10234, so 10223 is untouched when '
      + '02544 reaches it.',
      'The per-cycle expectations are 02533\'s by reference ("Sequence is same as above"), not '
      + 'restated here — see UNMAPPED.md.',
    ],
    expected: [],
  },
  {
    addr: 2550, op: '?', chars: '?1023310239', length: 11, pending: 'wave6',
    lines: [407, 415],
    aField: { addr: 10_233, text: '02' },
    bField: { addr: 10_239, text: '456' },
    resultField: { addr: 10_239, text: '00B' },
    notes: ['Half of the chained pair 02550/02561 (plan §5 Wave 3, architecture.md §8 tier 3).'],
    expected: [
      {
        cycle: 0,
        lines: [411, 412],
        a: '2', b: '6', r: 'B', scan: 1, phase: 'units', zb: 0,
      },
      {
        cycle: 1,
        lines: [413, 414],
        a: '0', b: '5', r: '0', phase: 'body',
      },
      { cycle: 2, lines: [415, 415], b: '4', r: '0', phase: 'extension' },
    ],
  },
  {
    addr: 2561, op: '?', chars: '?', length: 1, pending: 'wave6',
    lines: [417, 426],
    aField: { addr: 10_231, text: '01' },
    bField: { addr: 10_236, text: '123' },
    resultField: { addr: 10_236, text: '00A' },
    chainedRegisters: { aar: 10_231, bar: 10_236 },
    notes: [
      'The `D:` line is the only place in the whole file where the note states the chained '
      + 'AAR/BAR outright — carried as `chainedRegisters`. Its "Scan N" half is UNMAPPED.',
    ],
    expected: [
      {
        cycle: 0,
        lines: [422, 423],
        a: '1', b: '3', r: 'A', scan: 1, phase: 'units', zb: 0,
      },
      {
        cycle: 1,
        lines: [424, 425],
        a: '0', b: '2', r: '0', phase: 'body',
      },
      { cycle: 2, lines: [426, 426], b: '1', r: '0', phase: 'extension' },
    ],
  },
  {
    addr: 2562, op: '!', chars: '!1024110244', length: 11, pending: 'wave6',
    lines: [431, 439],
    aField: { addr: 10_241, text: '01' },
    bField: { addr: 10_244, text: '123' },
    resultField: { addr: 10_244, text: '00J' },
    expected: [
      {
        cycle: 0,
        lines: [435, 436],
        a: '1', b: '3', r: 'J', scan: 1, phase: 'units', zb: 0,
      },
      {
        cycle: 1,
        lines: [437, 438],
        a: '0', b: '2', r: '0', phase: 'body',
      },
      { cycle: 2, lines: [439, 439], b: '1', r: '0', phase: 'extension' },
    ],
  },
  {
    addr: 2573, op: '!', chars: '!1024610249', length: 11, pending: 'wave6',
    lines: [441, 449],
    aField: { addr: 10_246, text: '0J' },
    bField: { addr: 10_249, text: '123' },
    resultField: { addr: 10_249, text: '00A' },
    expected: [
      {
        cycle: 0,
        lines: [445, 446],
        a: 'J', b: '3', r: 'A', scan: 1, phase: 'units', zb: 0,
      },
      {
        cycle: 1,
        lines: [447, 448],
        a: '0', b: '2', r: '0', phase: 'body',
      },
      { cycle: 2, lines: [449, 449], b: '1', r: '0', phase: 'extension' },
    ],
  },
  {
    addr: 2584, op: '!', chars: '!10253', length: 6, pending: 'wave6',
    lines: [451, 461],
    aField: { addr: 10_253, text: '1224' },
    bField: { addr: 10_253, text: '1224' },
    resultField: { addr: 10_253, text: '122M' },
    expected: [
      {
        cycle: 0,
        lines: [454, 455],
        a: '4', b: '4', r: 'M', scan: 1, phase: 'units', zb: 0,
      },
      { cycle: 1, lines: [456, 457], a: '2', b: '2', r: '2', phase: 'body' },
      { cycle: 2, lines: [458, 459], a: '2', b: '2', r: '2' },
      { cycle: 3, lines: [460, 461], a: '1', b: '1', r: '1' },
    ],
  },
  {
    addr: 2590, op: '!', chars: '!10257', length: 6, pending: 'wave6',
    lines: [463, 473],
    aField: { addr: 10_257, text: '123M' },
    bField: { addr: 10_257, text: '123M' },
    resultField: { addr: 10_257, text: '123D' },
    expected: [
      {
        cycle: 0,
        lines: [466, 467],
        a: 'M', b: 'M', r: 'D', scan: 1, phase: 'units', zb: 0,
      },
      { cycle: 1, lines: [468, 469], a: '3', r: '3', phase: 'body' },
      { cycle: 2, lines: [470, 471], a: '2', r: '2' },
      { cycle: 3, lines: [472, 473], a: '1', b: '1', r: '1' },
    ],
  },
];

// ═══ Multiply and Divide — 02600-02766. ═══════════════════════════════════════════════════
// The note gives field addresses and contents and NOTHING ELSE — no latch lines at all, and no
// `Result:` line either (the Move block at 02800 prints one; these ten do not). So `expected`
// stays empty for every case here, and every `resultField` below is HAND-DERIVED rather than
// transcribed. Each entry says so in the words the plan fixes:
//
//   `[derived]` — hand-derived from `opcodes.md` §4.x; no published trace exists for this case.
//
// `[derived]` is a FIXTURE-PROVENANCE label, defined once in `docs/research/open-questions.md`
// under `## Phase 1b — 2026-08-30`: a value computed from `[verified]` rules. It is not a fifth
// research tag (METHOD.md's four are unchanged) and it is not `[observed]` — nothing here was
// established by running this emulator.
//
// `xxxx` in a B field is Jaeger's own placeholder for the product / quotient positions, and its
// PLACEMENT is load-bearing: `8Bxxxx` splits the field into the multiplier image `8B` and four
// product positions, which is how each multiplier's length below is read off the note itself.
// The multiply images hold `7`s where he writes `x`; the divide fields hold real zeros.
//
// ─── The two layouts every derivation below applies, both `[verified]` ────────────────────
// MULTIPLY (opcodes.md §4.5, A22-0526-3 pp.19-20, Figure 14). A is the multiplicand at its units
//   position; the MULTIPLIER IMAGE is pre-placed in the high-order positions of B, and
//   `len(B) = digits(multiplicand) + digits(multiplier) + 1`. The product develops into the
//   WHOLE field, right-justified, high-order zeros written over the image as it is consumed;
//   zones in the product area are eliminated before development and the multiplier's during it,
//   so the finished field carries exactly one zone — the sign in its units position. Units signs
//   are sampled first: like signs → plus, unlike → minus.
// DIVIDE (opcodes.md §4.6, A22-0526-3 pp.20-21, Figures 15-17). A is the divisor at its units
//   position; B addresses the LEFTMOST POSITION OF THE DIVIDEND, `len(divisor)+1` in from the
//   left end of a field of `digits(divisor) + digits(dividend) + 1`. Units of quotient =
//   (units of dividend) − len(divisor) − 1, which leaves the quotient in the leftmost
//   `digits(dividend)` positions and the remainder in the rightmost `len(divisor)+1`, both
//   right-justified with high-order zeros. Quotient sign is algebraic; the REMAINDER TAKES THE
//   ORIGINAL DIVIDEND'S SIGN.
// SIGNS (opcodes.md §4.1; charset.md §2 for the glyphs). Plus is written B+A — digits 1-9 →
//   `A`-`I`, zero → `?`. Minus is written B alone — digits 1-9 → `J`-`R`, zero → `!`.
//
// ─── What `indicatorsAfter` claims, and why only here ─────────────────────────────────────
// `divideOverflow: false` on the five properly-addressed divides is derivable, not decorative:
// §8 enumerates the three conditions that set the latch — a quotient field two or more positions
// too small, an improperly addressed dividend, division by zero — and none of them holds in
// those five, while §4.6 Note 1 warns that an emulator which starts at the left end of the whole
// B field produces "wrong quotients AND spurious divide overflows". The off-assertion is what
// catches that. 02755 is the one case the note itself makes a behavioural claim about
// ("puposely mis addressing, causing an overflow"), so it asserts the latch ON — and asserts
// `zeroBalance: false`, which is the "untouched" half: §8's p.53 console-light text leaves
// Divide out of both the setting and the resetting lists, so the power-on-reset OFF must survive
// the whole sub-block. Everything else is left unasserted, per this file's rule that an absent
// field is an absent expectation.

const MULTIPLY_DIVIDE: readonly ArithCase[] = [
  {
    addr: 2600, op: '@', chars: '@1030810305', length: 11,
    lines: [476, 477],
    aField: { addr: 10_308, text: '18J' },
    // `xxxx` is Jaeger's placeholder for the product positions; the image holds `7`s.
    bField: { addr: 10_305, text: '8B7777' },
    // A `18J` = 181 minus (`J` = 1 with the B zone). The field is 10300-10305, six positions
    // = 3 + 2 + 1, so the image is the two high-order positions `8B` = 82 plus (`B` = 2 with the
    // BA zone) and `xxxx` the four product positions. 181 × 82 = 14842. Unlike signs → minus.
    // Right-justified in all six positions, the consumed image overwritten with zeros: 014842,
    // the units 2 carrying the B zone alone → `K`.
    // [derived] — hand-derived from opcodes.md §4.5; no published trace exists for this case.
    resultField: { addr: 10_305, text: '01484K' },
    expected: [],
  },
  {
    addr: 2611, op: '@', chars: '@1032010316', length: 11,
    lines: [479, 480],
    aField: { addr: 10_320, text: '1625' },
    bField: { addr: 10_316, text: '20377777' },
    // A `1625` = 1625 plus (no zone on the units `5`). The field is 10309-10316, eight positions
    // = 4 + 3 + 1, so the image is `203` = 203 plus — exactly the split Jaeger's `203xxxxx`
    // prints. 1625 × 203 = 329 875. Like signs → plus. `00329875`, the units 5 with the BA
    // zone → `E`.
    // [derived] — hand-derived from opcodes.md §4.5; no published trace exists for this case.
    resultField: { addr: 10_316, text: '0032987E' },
    expected: [],
  },
  {
    addr: 2622, op: '@', chars: '@1033010328', length: 11,
    lines: [482, 483],
    aField: { addr: 10_330, text: '22' },
    bField: { addr: 10_328, text: '19910777' },
    // A `22` = 22 plus. The field is 10321-10328, eight positions = 2 + 5 + 1, so the image is
    // the five high-order positions `19910` = 19910 plus, matching `19910xxx`.
    // 22 × 19910 = 438 020. Like signs → plus. `00438020`, the units 0 with the BA zone → `?`
    // (plus zero).
    // [derived] — hand-derived from opcodes.md §4.5; no published trace exists for this case.
    resultField: { addr: 10_328, text: '0043802?' },
    expected: [],
  },
  {
    addr: 2633, op: '@', chars: '@1034010336', length: 11,
    lines: [485, 486],
    aField: { addr: 10_340, text: '1625' },
    // CORRECTED: the note says 10337, which is the word mark of the NEXT field (`1625`); the
    // image's instruction is `@ 10340 10336` and the field is 10331-10336. See UNMAPPED.md.
    bField: { addr: 10_336, text: '777777' },
    notes: ['Jaeger writes the product positions as `xxxxx`; the image holds `7`s.'],
    // A `1625` = 1625 plus. The field is 10331-10336, six positions = 4 + 1 + 1, so the image is
    // ONE position — the `7` Jaeger prints ahead of his `xxxxx`, and the shortest multiplier in
    // the block. 1625 × 7 = 11 375. Like signs → plus. `011375`, the units 5 with BA → `E`.
    // [derived] — hand-derived from opcodes.md §4.5; no published trace exists for this case.
    resultField: { addr: 10_336, text: '01137E' },
    expected: [],
  },
  {
    addr: 2700, op: '%', chars: '%1040110405', length: 11,
    lines: [488, 489],
    aField: { addr: 10_401, text: '8N' },
    bField: { addr: 10_405, text: '000720I', from: 10_402 },
    notes: [
      'The lone `B` on the heading line is a COLUMN MARKER: it sits over the character of the '
      + 'printed field that the B-address points at. Here it is above the fourth character of '
      + '`000720I`, and the field runs 10402-10408, so the B-address is 10405 — exactly what the '
      + 'line says, and exactly `len(divisor)+1 = 3` positions in from the left end of the field '
      + '(opcodes.md §4.6, A22-0526-3 Figure 17). The marker checks out on all six divide cases, '
      + 'including 02755, where it sits one position too far right — which is the '
      + '"puposely mis addressing" the note announces.',
    ],
    // Divisor `8N` = 85 minus (`N` = 5 with the B zone). Field 10402-10408, seven positions
    // = 2 + 4 + 1; the dividend is 10405-10408 = `720I` = 7209 plus (`I` = 9 with BA) and
    // 10402-10404 the pre-zeroed quotient area. 7209 ÷ 85 = 84 remainder 69 (85 × 84 = 7140).
    // Units of quotient = 10408 − 2 − 1 = 10405, so the quotient fills 10402-10405 as `0084` and
    // the remainder 10406-10408 as `069`. Quotient sign plus ÷ minus → minus: units 4 with the B
    // zone → `M`. The remainder keeps the DIVIDEND's plus: units 9 with BA → `I`.
    // [derived] — hand-derived from opcodes.md §4.6; no published trace exists for this case.
    resultField: { addr: 10_405, text: '008M06I', from: 10_402 },
    indicatorsAfter: { divideOverflow: false },
    expected: [],
  },
  {
    addr: 2711, op: '%', chars: '%1041010414', length: 11,
    lines: [491, 492],
    aField: { addr: 10_410, text: '1B' },
    bField: { addr: 10_414, text: '00014G', from: 10_411 },
    // Divisor `1B` = 12 plus (`B` = 2 with BA). Field 10411-10416, six positions = 2 + 3 + 1;
    // dividend 10414-10416 = `14G` = 147 plus (`G` = 7 with BA). 147 ÷ 12 = 12 remainder 3
    // (12 × 12 = 144). Units of quotient = 10416 − 2 − 1 = 10413: quotient `012` in 10411-10413,
    // remainder `003` in 10414-10416. Quotient sign plus ÷ plus → plus: units 2 with BA → `B`.
    // Remainder keeps the dividend's plus: units 3 with BA → `C`.
    // [derived] — hand-derived from opcodes.md §4.6; no published trace exists for this case.
    resultField: { addr: 10_414, text: '01B00C', from: 10_411 },
    indicatorsAfter: { divideOverflow: false },
    expected: [],
  },
  {
    addr: 2722, op: '%', chars: '%1041810422', length: 11,
    lines: [494, 495],
    aField: { addr: 10_418, text: '6N' },
    bField: { addr: 10_422, text: '0001498?', from: 10_419 },
    // Divisor `6N` = 65 minus. Field 10419-10426, eight positions = 2 + 5 + 1; dividend
    // 10422-10426 = `1498?` = 14980 plus (`?` = plus zero). 14980 ÷ 65 = 230 remainder 30
    // (65 × 230 = 14 950). Units of quotient = 10426 − 2 − 1 = 10423: quotient `00230` in
    // 10419-10423, remainder `030` in 10424-10426. Quotient sign plus ÷ minus → minus: units 0
    // with the B zone alone → `!` (minus zero). Remainder keeps the dividend's plus: units 0
    // with BA → `?`.
    // [derived] — hand-derived from opcodes.md §4.6; no published trace exists for this case.
    resultField: { addr: 10_422, text: '0023!03?', from: 10_419 },
    indicatorsAfter: { divideOverflow: false },
    expected: [],
  },
  {
    addr: 2733, op: '%', chars: '%1043010436', length: 11,
    lines: [497, 498],
    aField: { addr: 10_430, text: '100!' },
    bField: { addr: 10_436, text: '00000150!', from: 10_431 },
    // Divisor `100!` = 1000 minus (`!` = minus zero). Field 10431-10439, nine positions
    // = 4 + 4 + 1; dividend 10436-10439 = `150!` = 1500 minus. 1500 ÷ 1000 = 1 remainder 500.
    // Units of quotient = 10439 − 4 − 1 = 10434: quotient `0001` in 10431-10434, remainder
    // `00500` in 10435-10439. Quotient sign minus ÷ minus → plus: units 1 with BA → `A`. The
    // remainder keeps the DIVIDEND's minus — the case in the block that separates the two sign
    // rules: units 0 with the B zone alone → `!`.
    // [derived] — hand-derived from opcodes.md §4.6; no published trace exists for this case.
    resultField: { addr: 10_436, text: '000A0050!', from: 10_431 },
    indicatorsAfter: { divideOverflow: false },
    expected: [],
  },
  {
    addr: 2744, op: '%', chars: '%1044010443', length: 11,
    lines: [500, 501],
    aField: { addr: 10_440, text: '9' },
    bField: { addr: 10_443, text: '009?', from: 10_441 },
    // Divisor `9` — UNSIGNED, and §4.6 says "if no bits are in the units position of the divisor,
    // the system assumes that the divisor is positive". Field 10441-10444, four positions
    // = 1 + 2 + 1; dividend 10443-10444 = `9?` = 90 plus. 90 ÷ 9 = 10 remainder 0. Units of
    // quotient = 10444 − 1 − 1 = 10442: quotient `10` fills 10441-10442 exactly — no leading
    // zero, and no overflow, because the area is not short — remainder `00` in 10443-10444.
    // Quotient sign plus ÷ plus → plus: units 0 with BA → `?`. Remainder keeps plus: `?`.
    // [derived] — hand-derived from opcodes.md §4.6; no published trace exists for this case.
    resultField: { addr: 10_443, text: '1?0?', from: 10_441 },
    indicatorsAfter: { divideOverflow: false },
    expected: [],
  },
  {
    addr: 2755, op: '%', chars: '%1044510449', length: 11,
    lines: [503, 505],
    aField: { addr: 10_445, text: '9' },
    bField: { addr: 10_449, text: '009?', from: 10_446 },
    notes: [
      'The field is 10446-10449; the B-address 10449 is its UNITS position, one further right '
      + 'than the `len(divisor)+1 = 2` the layout wants — the deliberate mis-addressing.',
      'Divide overflow — "divide never sets arithmetic overflow or zero balance" (opcodes.md §2 p.20-21, §8).',
    ],
    // NO `resultField`, and the absence is the point. With B at 10449 the first divide step works
    // the two-position window 10448-10449 = `9?` = 90, and 90 ÷ 9 = 10 — a first quotient digit
    // GREATER THAN 9, which is exactly the condition of §4.6 Note 1 (A22-0526-3 p.21): "An
    // improperly addressed dividend can cause a divide overflow condition if the result of the
    // first divide operation is greater than 9." What the machine leaves in the corrupted field
    // afterwards is stated in no source, so nothing is asserted about it; the assertion is the
    // indicator, which is the claim the note itself makes. `zeroBalance: false` is the
    // "untouched" half — Divide is in neither the setting nor the resetting list of §8's p.53
    // console-light text, so the reset-state OFF must still be OFF here.
    // [derived] — hand-derived from opcodes.md §4.6; no published trace exists for this case.
    indicatorsAfter: { divideOverflow: true, zeroBalance: false },
    expected: [],
  },
];

/** Every annotated instruction in 02300-02799, in address order. */
export const NOTE1410_ARITH: readonly ArithCase[] = [
  ...ADD, ...SUBTRACT, ...ZERO_ADD_SUBTRACT, ...MULTIPLY_DIVIDE,
];

/**
 * The sub-blocks the note groups its cases into, each ending in a `.` Halt. Running the block is
 * SEQUENTIAL, one sub-block per START: the operands live in 10001-10600 and earlier instructions
 * mutate them (02344 doubles 10023 in place; 02533 stores into 10229-10234 and 02544's "still
 * has … at this point" depends on that), and the chained forms at 02379 / 02484 / 02561 have no
 * meaning except as the successor of the instruction before them. Each `halt` below is where the
 * machine stops; the `.` immediately after it is NOT an instruction — it is the word mark that
 * ends the halt's read-out, exactly as opcodes.md §2 p.23 requires of a last instruction, and
 * reading it out would be an invalid length.
 */
export const NOTE1410_ARITH_BLOCKS: readonly { op: string; from: number; halt: number }[] = [
  { op: 'A', from: 2300, halt: 2391 },
  { op: 'S', from: 2400, halt: 2496 },
  { op: '?/!', from: 2500, halt: 2596 },
  { op: '@', from: 2600, halt: 2644 },
  { op: '%', from: 2700, halt: 2766 },
];
